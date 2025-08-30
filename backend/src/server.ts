// server.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import websocketPlugin, { WebSocket } from "@fastify/websocket";
import { URL } from "url";
import crypto from "crypto";
import * as Game from "./game.ts";

// ---- SETUP SERVER ----
const fastify = Fastify();
await fastify.register(websocketPlugin);

// ---- WEBSOCKET ROUTE ----
await fastify.register(async function (fastify) {
    fastify.get("/ws", { websocket: true }, (socket, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const clientId = url.searchParams.get("id") || crypto.randomUUID(); //check the client any id created if not create one
    const roomId = url.searchParams.get("room") || "default"; //get the room name from client if not create a default one

    // Create room if not exist
    if (!Game.rooms.has(roomId)) {
      Game.rooms.set(roomId, Game.createRoom(roomId, 1)); // default 1v1
    }

    //initialize the room
    const room = Game.rooms.get(roomId)!;
    // Add socket to room
    room.sockets.set(socket, clientId);
    room.clients.add(socket);

    //initialize the role
    let role = room.clientRoles.get(clientId);
    //assign the role if not exist
    if (!role) {
        //get how many players in each team
        const leftCount = room.gameState.teams.left.length;
        const rightCount = room.gameState.teams.right.length;

        //check which team for the player
        if (leftCount < room.teamSize) {
            role = `left_player${leftCount + 1}`;
            room.gameState.teams.left.push(role);
        } else if (rightCount < room.teamSize) {
            role = `right_player${rightCount + 1}`;
            room.gameState.teams.right.push(role);
        } else
            role = "spectator";

        // assign the role to the client
        room.clientRoles.set(clientId, role);

        //initialize thier position and score (prevent garbage value)
        if (role !== "spectator") {
            Game.setPaddlePositionWithTeam(room);
            room.gameState.score.left = 0;
            room.gameState.score.right = 0;
        }

        console.log(`Client (${role}) [ ${clientId} ] joined room=${roomId}`);
    } else {
        //if is exist mean is reconnect
        console.log(`Client (${role}) [ ${clientId} ] reconnected as ${role} in room ${roomId}`);

        // Ensure the role is back in the teams
        if (role.startsWith("left_") && !room.gameState.teams.left.includes(role))
            room.gameState.teams.left.push(role);
        if (role.startsWith("right_") && !room.gameState.teams.right.includes(role))
            room.gameState.teams.right.push(role);
    }

    // Send initial role and roomId to client
    socket.send(JSON.stringify({ type: "role", role, roomId }));

    // ----- INCOMING MESSAGES -----
    socket.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        //update the paddle position from client
        if (msg.type === "move") {
          const dy = msg.dy;
          const paddleHeight = 80;
          if (role!.startsWith("left_player") || role!.startsWith("right_player")) {
            room.gameState.paddles[role!] = Game.updatePaddlePosition(
                room.gameState.paddles[role!] ?? 0,
                dy,
                room.height,
                paddleHeight
            );
          }
        }
        //update the size from client (game)
        else if (msg.type === "setWidth") {
            room.width = msg.width;
        }
        else if (msg.type === "setHeight") {
            room.height = msg.height;
        }
    });

    // ----- CLIENT DISCONNECT -----
    socket.on("close", () => {

        // Remove socket and client from room
        room.sockets.delete(socket);
        room.clients.delete(socket);
        console.log(`Client (${role}) [ ${clientId} ] left room=${roomId}`);

        // Remove role from teams and paddles
        if (role && role !== "spectator") {
          room.gameState.teams.left = room.gameState.teams.left.filter(r => r !== role);
          room.gameState.teams.right = room.gameState.teams.right.filter(r => r !== role);
          delete room.gameState.paddles[role];
        }

        // If no clients left, delete the room
        if (room.clients.size === 0) {
          Game.rooms.delete(roomId);
          console.log(`Room ${roomId} deleted due to no players.`);
        }
    });
  });
});


// ---- CORS ----
await fastify.register(cors, {
  origin: "*", // Allow all origins (for development)
});

//get a list of all active rooms
fastify.get("/rooms", async (req, reply) => {
    const list = [];
    for (const [id, room] of Game.rooms.entries()) {
        list.push({
            id,
            leftPlayers: room.gameState.teams.left.length,
            rightPlayers: room.gameState.teams.right.length,
            teamSize: room.teamSize,
            gameStarted: room.gameStarted
        });
    }
    return list;
});

//make a new room
fastify.post("/create-room", async (req, reply) => {
  const body: any = req.body;
  const roomId = body.id || "default";
  const teamSize = body.teamSize || 1;

  if (!Game.rooms.has(roomId)) {
    Game.rooms.set(roomId, Game.createRoom(roomId, teamSize));
  }

  return { roomId, teamSize };
});

// ---- START SERVER ----
try {
    const addr = await fastify.listen({ port: 4242, host: "0.0.0.0" });
    console.log(`Server running at ${addr}`);
} catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
}