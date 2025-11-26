import { FastifyInstance, FastifyRequest } from "fastify";
import WebSocket from "ws";
import { tournaments } from "./tournament.routes";
import {
  startTournamentCountdown,
  cancelTournamentCountdown,
  cancelLobbyTimeout,
} from "./tournament";
import { TournamentPlayerWs } from "../../types/interface";
import jwt, { JwtPayload } from "jsonwebtoken";

const client = new Map<WebSocket, { tournamentId: number; playerId: number }>();

export default async function tournamentWsRoute(fastify: FastifyInstance) {
  fastify.get(
    "/ws-tournament",
    { websocket: true },
    async (socket: WebSocket, req: FastifyRequest) => {
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const tournamentId = parseInt(url.searchParams.get("id") || "");
      const customSprite = url.searchParams.get("sprite") || "";

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

      //get player id and get the player info
      const playerId = decode.userId as number;
      const user = await fastify.db.user.findUnique({
        where: { id: playerId },
      });

      // ----- validation -----
      if (!user) {
        socket.close(1008, "User not found");
        return null;
      }

      const playerName = user.username;
      if (!playerName) {
        socket.close(1008, "Invalid user name");
        return null;
      }
      const playerSprite = customSprite;
      if (!playerSprite) {
        socket.close(1008, "Invalid user sprite");
        return null;
      }

      if (!tournamentId || !playerId || !playerName || !playerSprite) {
        socket.close(1008, "Missing parameters");
        return;
      }

      //register player with the socket to the tournament
      client.set(socket, { tournamentId, playerId });

      //get the tournament
      const tournament = tournaments.get(tournamentId);
      if (!tournament) {
        socket.send(
          JSON.stringify({ type: "error", message: "tournament_not_found" }),
        );
        console.log(
          `[tournament] closing socket: tournament ${tournamentId} not found for player ${playerId}`,
        );
        socket.close(1000, "Tournament not found");
        return;
      }

      //a broadcast function for the tournament
      const tournamentBroadcast = (msg: string) => {
        for (const [ws, info] of client.entries()) {
          if (info.tournamentId === tournamentId) {
            try {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(msg);
              }
            } catch (err) {
              console.warn(
                "[tournament] failed to send to socket",
                info.playerId,
                err,
              );
            }
          }
        }
      };

      tournament.broadcast = tournamentBroadcast; // assign broadcast function
      tournament.clientMap = client; // assign client map

      //reject player not in that set (the loser eliminated from tournament)
      const allowed = tournament.allowedPlayers;
      if (allowed && !allowed.has(playerId)) {
        try {
          socket.send(JSON.stringify({ type: "eliminated", tournamentId }));
        } catch {}
        console.log(
          `[tournament] closing socket: player ${playerId} eliminated from ${tournamentId}`,
        );
        socket.close(1000, "Player eliminated");
        return;
      }

      //add player to the tournament if not exists
      const exists = tournament.players.find(
        (p: TournamentPlayerWs) => p.id === playerId,
      );
      if (!exists) {
        // ✅ NEW: Check if this player was marked as dummy
        const wasDummy = tournament.dummyPlayers?.has(playerId);

        if (wasDummy) {
          // Remove dummy placeholder
          tournament.players = tournament.players.filter(
            (p) => !(p.id === playerId && tournament.dummyPlayers?.has(p.id)),
          );
          tournament.dummyPlayers?.delete(playerId);
          console.log(
            `[Tournament ${tournamentId}] Player ${playerId} joined after dummy creation. Replacing dummy.`,
          );
        }

        tournament.players.push({
          id: playerId,
          username: playerName,
          spriteUrl: playerSprite,
          ready: false,
        });

        // tell all player the current player list
        const broadcast = (msg: string) => {
          const recipients = [];
          for (const [ws, info] of client.entries()) {
            if (info.tournamentId === tournamentId) {
              try {
                ws.send(msg);
                recipients.push(info.playerId);
              } catch {}
            }
          }
        };

        //notify all clients in the same tournament about the new player
        broadcast(
          JSON.stringify({ type: "playerJoined", players: tournament.players }),
        );
        console.log(`Player ${playerName} joined tournament ${tournamentId}`); //// debug

        // ✅ NEW: Cancel timeout if lobby is full with real players
        if (
          tournament.players.length === tournament.maxPlayer &&
          tournament.dummyPlayers?.size === 0
        ) {
          cancelLobbyTimeout(tournamentId);
        }

        if (
          tournament.players.length === tournament.maxPlayer &&
          !tournament.lock
        ) {
          // only start countdown automatically if the lobby are full.
          console.log(
            "[ player join ] start tournament countdown as lobby is full",
          ); //// debug
          // start a longer countdown (give clients time to mount), or do nothing and wait for ready toggles
          startTournamentCountdown(tournamentId, broadcast, 10, client);
        }
      }

      socket.on("message", (raw: WebSocket.Data) => {
        try {
          let msg;
          try {
            msg = JSON.parse(raw.toString());
          } catch {
            socket.send(
              JSON.stringify({ type: "error", message: "Invalid JSON" }),
            );
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

          // --- allow type ---
          const allowedTypes = ["ready"];
          if (!allowedTypes.includes(msg.type)) {
            socket.close(1003, `unsupported message type: (${msg.type})`);
            return;
          }

          const info = client.get(socket);
          if (!info) {
            socket.send(
              JSON.stringify({ type: "error", message: "not_registered" }),
            );
            return;
          }

          if (msg.type === "ready") {
            const player = tournament.players.find(
              (p) => p.id === info.playerId,
            );
            if (player) player.ready = msg.ready;

            const broadcast = (msg: string) => {
              for (const [ws, info] of client.entries()) {
                if (info.tournamentId === tournamentId) {
                  ws.send(msg);
                }
              }
            };

            //notify all clients in the same tournament about the player ready status
            broadcast(
              JSON.stringify({
                type: "updatePlayer",
                players: tournament.players,
              }),
            );
            console.log(
              `Player ${player?.username} is ${player?.ready ? "ready" : "not ready"} in tournament ${tournamentId}`,
            ); //// debug

            if (
              tournament.players.filter((p) => p.ready === true).length ===
                tournament.maxPlayer &&
              !tournament.lock
            ) {
              //reset the countdown
              if (tournament.countdownTimer) {
                clearInterval(tournament.countdownTimer);
                tournament.countdownTimer = undefined;
                tournament.countdownRemaining = undefined;
              }

              // All players are ready, start the tournament immediately
              console.log(
                `All players are ready in tournament ${tournamentId}, starting tournament immediately`,
              ); //// debug
              startTournamentCountdown(tournamentId, broadcast, 0, client);
            }
          }
        } catch (err) {
          console.error("Error handling message:", err);
          socket.close(1011, "Internal server error");
        }
      });

      socket.on("close", (code, reason) => {
        console.log(
          `[tournament websocket] code=${code} reason=${reason} player=${playerId} tournament=${tournamentId}`,
        );

        //a broadcast function for the tournament
        const tournamentBroadcast = (msg: string) => {
          for (const [ws, info] of client.entries()) {
            if (info.tournamentId === tournamentId) {
              try {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(msg);
                }
              } catch (err) {
                console.warn(
                  "[tournament] failed to send to socket",
                  info.playerId,
                  err,
                );
              }
            }
          }
        };

        const isAdvancing =
          reason && reason.toString().includes("Advancing to finals");
        if (isAdvancing) {
          console.log(
            `[Tournament ${tournamentId}] Player ${playerId} advancing to finals, skipping dummy creation`,
          );

          //remove player from tournament
          tournament.players = tournament.players.filter(
            (p) => p.id !== playerId,
          );
          client.delete(socket);

          // Don't broadcast or create dummy - player is moving to next stage
          return;
        }

        //remove player from tournament
        tournament.players = tournament.players.filter(
          (p) => p.id !== playerId,
        );
        client.delete(socket);

        //console.log("stage: ", tournament.stage); //// debug
        // ✅ NEW: Handle dummy creation for SF and F stages
        if (tournament.stage === "SF" || tournament.stage === "F") {
          if (tournament.players.length < tournament.maxPlayer) {
            // Get player info from expectedPlayerInfo or parent tournament
            let playerInfo = tournament.expectedPlayerInfo?.get(playerId);

            if (!playerInfo && tournament.parentTournamentId) {
              const parentTournament = tournaments.get(
                tournament.parentTournamentId,
              );
              if (parentTournament) {
                const parentPlayer = parentTournament.players.find(
                  (p) => p.id === playerId,
                );
                if (parentPlayer) {
                  playerInfo = {
                    id: parentPlayer.id,
                    username: parentPlayer.username,
                    spriteUrl: parentPlayer.spriteUrl,
                  };
                }
              }
            }

            const dummyPlayer = {
              id: playerId,
              username: playerInfo
                ? `[Forfeited] ${playerInfo.username}`
                : `[Forfeited] Player ${playerId}`,
              spriteUrl:
                playerInfo?.spriteUrl || "/assets/skins/slime/red/idle.png",
              ready: true,
            };

            tournament.players.push(dummyPlayer);

            if (!tournament.dummyPlayers) {
              tournament.dummyPlayers = new Set();
            }
            tournament.dummyPlayers.add(playerId);

            console.log(
              `[Tournament ${tournamentId}] Player ${playerId} disconnected. Created dummy replacement: ${dummyPlayer.username}`,
            );

            // Notify all clients about the dummy replacement
            tournamentBroadcast(
              JSON.stringify({
                type: "playerJoined",
                players: tournament.players,
              }),
            );

            // ✅ If lobby is now full with dummies, start countdown
            if (
              tournament.players.length === tournament.maxPlayer &&
              !tournament.lock &&
              tournament.clientMap
            ) {
              console.log(
                `[Tournament ${tournamentId}] Lobby full after dummy creation, starting countdown`,
              );
              startTournamentCountdown(
                tournamentId,
                tournamentBroadcast,
                10,
                tournament.clientMap,
              );
            }
          }
        } else {
          // Normal case for other stages: notify all clients about player leaving
          tournamentBroadcast(
            JSON.stringify({ type: "playerLeft", players: tournament.players }),
          );
          console.log(
            `Player ${playerId} left tournament ${tournamentId}: lock=${tournament.lock} : player size=${tournament.players.length}`,
          ); //// debug
        }

        //cancel countdown if player count drops below max (only for non-SF/F stages)
        if (
          tournament.stage !== "SF" &&
          tournament.stage !== "F" &&
          tournament.players.length < tournament.maxPlayer
        ) {
          cancelTournamentCountdown(tournamentId, tournamentBroadcast);
        }

        //unlock the lock if no players left
        if (tournament.players.length === 0) tournament.lock = false;

        //if the tournament unlock mean no players left, delete the tournament
        if (!tournament.lock && tournament.players.length === 0) {
          tournaments.delete(tournamentId);
          console.log(`Tournament ${tournamentId} deleted due to no players`);
        }
      });
    },
  );
}
