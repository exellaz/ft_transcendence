import { FastifyInstance, FastifyRequest } from "fastify";
import WebSocket from "ws";
import { tournaments } from "./tournament.routes";
import { startTournamentCountdown, cancelTournamentCountdown } from "src/utils/utils";
import { start } from "repl";

export interface TournamentPlayerWs {
    id: number;
    username: string;
    spriteUrl: string;
    ready: boolean;
}

export interface TournamentLobby {
    tournamentId: number;
    players: TournamentPlayerWs[];
}

const client = new Map<WebSocket, { tournamentId: number; playerId: number }>();

export default async function tournamentWsRoute(fastify: FastifyInstance) {
    fastify.get("/ws-tournament", { websocket: true }, (socket: WebSocket, req: FastifyRequest) => {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const tournamentId = parseInt(url.searchParams.get("id") || "");
        const playerId = parseInt(url.searchParams.get("playerId") || "");
        const playerName = url.searchParams.get("name");
        const playerSprite = url.searchParams.get("avatar");

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
            socket.close();
            return;
        }

        //add player to the tournament if not already present
        const exists = tournament.players.find((p: TournamentPlayerWs) => p.id === playerId);
        if (!exists) {
            tournament.players.push({ id: playerId, username: playerName, spriteUrl: playerSprite, ready: false });

            const broadcast = (msg: string) => {
                for (const [ws, info] of client.entries()) {
                    if (info.tournamentId === tournamentId) {
                        ws.send(msg);
                    }
                }
            }

            //notify all clients in the same tournament about the new player
            broadcast(JSON.stringify({ type: "playerJoined", players: tournament.players }));
            console.log (`Player ${playerName} joined tournament ${tournamentId}`); //// debug

            if (tournament.players.length === tournament.maxPlayer && !tournament.started) {
                startTournamentCountdown(tournamentId, broadcast, 10); //start 10 seconds countdown
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
                }
            } catch (err) {
                console.error("Error handling message:", err);
                socket.close(1011, "Internal server error");
            }
        });

        socket.on("close", () => {
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
            console.log (`Player ${playerId} left tournament ${tournamentId}`); //// debug

            //cancel countdown if player less
            if (tournament.players.length < tournament.maxPlayer) {
                cancelTournamentCountdown(tournamentId, broadcast);
            }

            if (tournament.players.length === 0) {
                tournaments.delete(tournamentId);
                console.log(`Tournament ${tournamentId} deleted due to no players`);
            }
        });
    });
};