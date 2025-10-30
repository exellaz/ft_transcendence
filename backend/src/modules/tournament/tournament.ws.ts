import { FastifyInstance, FastifyRequest } from "fastify";
import WebSocket from "ws";
import { tournaments } from "./tournament.routes";
import { startTournamentCountdown, cancelTournamentCountdown } from "./tournament";
import { createTournament } from "./tournament.service";
import { TournamentPlayerWs } from "../../types/interface";
import jwt, { JwtPayload } from "jsonwebtoken";

//! temporary helper function to get user info by id
//import { GetUserRequest, GetUserResponse } from "../../../../frontend/src/types/usersApi";
//export async function getUserInfoById({
//  id,
//}: GetUserRequest): Promise<GetUserResponse> {
//  const res = await fetch(`http://localhost:3000/users/${id}`, {
//    method: "GET",
//    headers: { "Content-Type": "application/json" },
//  });

//  return res.json();
//}

const client = new Map<WebSocket, { tournamentId: number; playerId: number }>();

export default async function tournamentWsRoute(fastify: FastifyInstance) {
    fastify.get("/ws-tournament", { websocket: true }, async (socket: WebSocket, req: FastifyRequest) => {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const tournamentId = parseInt(url.searchParams.get("id") || "");

        const token = req.headers["sec-websocket-protocol"];
        if (!token) {
          socket.close(1008, "Authentication token is required");
          return null;
        }
        const secret = process.env.JWT_SECRET as string;
        const decode = jwt.verify(token, secret) as JwtPayload;
        if (decode === null || !decode.userId) {
          socket.close(1008, "Invalid authentication token");
          return null;
        }

        const playerId = decode.userId as number;
        const user = await fastify.db.user.findUnique({
          where: { id: playerId },
        });
        if (!user) {
          socket.close(1008, "User not found");
          return null;
        }

        const playerName = user.username;
        if (!playerName) {
            socket.close(1008, "Invalid user name");
            return null;
        }
        const playerSprite = user.avatarUrl;
        if (!playerSprite) {
            socket.close(1008, "Invalid user sprite");
            return null;
        }

        //validate parameters
        if (!tournamentId || !playerId || !playerName || !playerSprite) {
            socket.close(1008, "Missing parameters");
            return;
        }

        //register client to the tournament
        client.set(socket, { tournamentId, playerId });

        //find the tournament
        const tournament = tournaments.get(tournamentId);
        if (!tournament) {
            socket.send(JSON.stringify({ type: "error", message: "tournament_not_found" }));
            console.log(`[tournament] closing socket: tournament ${tournamentId} not found for player ${playerId}`);
            socket.close(1000, "Tournament not found");
            return;
        }

        const tournamentBroadcast = (msg: string) => {
          const recipients: number[] = [];
          for (const [ws, info] of client.entries()) {
            if (info.tournamentId === tournamentId) {
              try {
                if ((ws as any).readyState === WebSocket.OPEN) {
                  ws.send(msg);
                  recipients.push(info.playerId);
                }
              } catch (err) {
                console.warn("[tournament] failed to send to socket", info.playerId, err);
              }
            }
          }
          return recipients;
        };

        // expose stable helpers for other modules
        tournament.broadcast = tournamentBroadcast;
        tournament.clientMap = client;

        //reject player not in that set (the loser eliminated from tournament)
        const allowed = tournament.allowedPlayers;
        if (allowed && !allowed.has(playerId)) {
            try {
                socket.send(JSON.stringify({ type: "eliminated", tournamentId }));
            } catch {}
            console.log(`[tournament] closing socket: player ${playerId} eliminated from ${tournamentId}`);
            socket.close(1000, "Player eliminated");
            return;
        }


        //add player to the tournament if not already present
        const exists = tournament.players.find((p: TournamentPlayerWs) => p.id === playerId);
        if (!exists) {
            tournament.players.push({ id: playerId, username: playerName, spriteUrl: playerSprite, ready: false });

            const broadcast = (msg: string) => {
                const recipients = [];
                for (const [ws, info] of client.entries()) {
                    if (info.tournamentId === tournamentId) {
                        try { ws.send(msg); recipients.push(info.playerId); } catch {}
                    }
                }
            }

            //notify all clients in the same tournament about the new player
            broadcast(JSON.stringify({ type: "playerJoined", players: tournament.players }));
            console.log (`Player ${playerName} joined tournament ${tournamentId}`); //// debug

            if (tournament.players.length === tournament.maxPlayer && !tournament.lock) {
               // only start countdown automatically if all players are marked ready.
               const allReady = tournament.players.length > 0 && tournament.players.every(p => p.ready === true);
               if (allReady) {
                   console.log("[ player join ] All players are ready, starting tournament immediately"); //// debug
                   startTournamentCountdown(tournamentId, broadcast, 0, client); // immediate start when everyone is ready
               } else {
                   console.log("[ player join ] Not all players are ready, starting tournament with delay"); //// debug
                   // start a longer countdown (give clients time to mount), or do nothing and wait for ready toggles
                   startTournamentCountdown(tournamentId, broadcast, 10, client);
               }
            }
        }


        socket.on("message", (raw: WebSocket.Data) => {
            try {
                let msg;
                try {
                    msg = JSON.parse(raw.toString());
                } catch {
                    socket.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
                    return;
                }

                // --- validation ---
                if (typeof msg !== "object" || msg === null) {
                    socket.close(1003, "Invalid message format");
                    return;
                }
                if (typeof msg.type !== "string") {
                    socket.close(1003, "Invalid message: missing type");
                    return;
                }

                const info = client.get(socket);
                if (!info) {
                    socket.send(JSON.stringify({ type: "error", message: "not_registered" }));
                    return;
                }

                if (msg.type === "ready") {
                    const player = tournament.players.find(p => p.id === info.playerId);
                    if (player) player.ready = msg.ready;

                    const broadcast = (msg: string) => {
                        for (const [ws, info] of client.entries()) {
                            if (info.tournamentId === tournamentId) {
                                ws.send(msg);
                            }
                        }
                    };

                    //notify all clients in the same tournament about the player ready status
                    broadcast(JSON.stringify({ type: "updatePlayer", players: tournament.players }));
                    console.log (`Player ${player?.username} is ${player?.ready ? "ready" : "not ready"} in tournament ${tournamentId}`); //// debug

                    if (tournament.players.filter(p => p.ready === true).length === tournament.maxPlayer && !tournament.lock) {
                        //reset the countdown
                        if (tournament.countdownTimer) {
                            clearInterval(tournament.countdownTimer);
                            tournament.countdownTimer = undefined;
                            tournament.countdownRemaining = undefined;
                        }

                        // All players are ready, start the tournament
                        console.log(`All players are ready in tournament ${tournamentId}, starting tournament immediately`); //// debug
                        startTournamentCountdown(tournamentId, broadcast, 0, client);
                    }
                }

				//update player in lobby
                if (msg.type === "requestLobby") {
                    const broadcast = (msg: string) => {
                        for (const [ws, info] of client.entries()) {
                            if (info.tournamentId === tournamentId) {
                                try { ws.send(msg); } catch {}
                            }
                        }
                    }

                    if (tournament.players.length === tournament.maxPlayer && !tournament.lock) {
                        // only start countdown automatically if all players are marked ready.
                        const allReady = tournament.players.length > 0 && tournament.players.every(p => p.ready === true);
                        if (allReady) {
                            console.log("[ request data ] All players are ready, starting tournament immediately"); //// debug
                            startTournamentCountdown(tournamentId, broadcast, 0, client); // immediate start when everyone is ready
                        } else {
                            console.log("[ request data ] Not all players are ready, starting tournament with delay"); //// debug
                            startTournamentCountdown(tournamentId, broadcast, 10, client); // set 10 seconds countdown for auto-start
                        }
                    }
                }
            } catch (err) {
                console.error("Error handling message:", err);
                socket.close(1011, "Internal server error");
            }
        });

        socket.on("close", (code, reason) => {
            console.log(`[tournament websocket] code=${code} reason=${reason} player=${playerId} tournament=${tournamentId}`);
			//if (tournament.lock) return;
            tournament.players = tournament.players.filter(p => p.id !== playerId);
            client.delete(socket);

            const broadcast = (msg: string) => {
                for (const [ws, info] of client.entries()) {
                    if (info.tournamentId === tournamentId) {
                        ws.send(msg);
                    }
                }
            };

            //notify all clients in the same tournament about the player leaving
            broadcast(JSON.stringify({ type: "playerLeft", players: tournament.players }));
            console.log (`Player ${playerId} left tournament ${tournamentId}: lock=${tournament.lock} : player size=${tournament.players.length}`); //// debug

            //cancel countdown if player less
            if (tournament.players.length < tournament.maxPlayer) {
                cancelTournamentCountdown(tournamentId, broadcast);
            }

            if (tournament.players.length === 0)
                tournament.lock = false;

            if (!tournament.lock && tournament.players.length === 0) {
                    tournaments.delete(tournamentId);
                    console.log(`Tournament ${tournamentId} deleted due to no players`);
            }
        });
    });
};
