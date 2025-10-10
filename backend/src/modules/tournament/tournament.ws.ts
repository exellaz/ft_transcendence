import { FastifyInstance, FastifyRequest } from "fastify";
import WebSocket, { WebSocketServer } from "ws";
import { tournaments, tournament } from "./tournament.routes";

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

            //notify all clients in the same tournament about the new player
            const message = JSON.stringify({ type: "playerJoined", players: tournament.players });
            for (const [ws, info] of client.entries()) {
                if (info.tournamentId === tournamentId) {
                    ws.send(message);
                }
            }
            console.log (`Player ${playerName} joined tournament ${tournamentId}`); //// debug
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
                    //notify all clients in the same tournament about the player ready status
                    const message = JSON.stringify({ type: "updatePlayer", players: tournament.players });
                    for (const [ws, info] of client.entries()) {
                        if (info.tournamentId === tournamentId) {
                            ws.send(message);
                        }
                    }
                    console.log (`Player ${player?.username} is ${player?.ready ? "ready" : "not ready"} in tournament ${tournamentId}`); //// debug
                }

                if (msg.type === "start") {
                    const allReady = tournament.players.length > 0 && tournament.players.every(p => p.ready);
                    tournament.started = true;

                    const message = JSON.stringify({ type: "tournamentStarted", players: tournament.players });
                    for (const [ws, info] of client.entries()) {
                        if (info.tournamentId === tournamentId) {
                            ws.send(message);
                        }
                    }
                    console.log (`Tournament ${tournamentId} started with ${tournament.players.length} players`); //// debug
                }
            } catch (err) {
                console.error("Error handling message:", err);
                socket.close(1011, "Internal server error");
            }
        });

        socket.on("close", () => {
            tournament.players = tournament.players.filter(p => p.id !== playerId);
            client.delete(socket);

            //notify all clients in the same tournament about the player leaving
            const message = JSON.stringify({ type: "playerLeft", players: tournament.players });
            for (const [ws, info] of client.entries()) {
                if (info.tournamentId === tournamentId) {
                    ws.send(message);
                }
            }
            console.log (`Player ${playerId} left tournament ${tournamentId}`); //// debug

            if (tournament.players.length === 0) {
                tournaments.delete(tournamentId);
                console.log(`Tournament ${tournamentId} deleted due to no players`);
            }
        });
    });
};