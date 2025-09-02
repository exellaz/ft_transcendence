// server.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import websocketPlugin from "@fastify/websocket";
import { URL } from "url";
import crypto from "crypto";
import * as Game from "./game.ts";
import { rooms, createRoom } from "./room.ts";
import { createChatMessage } from "./chat.ts";

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
    if (!rooms.has(roomId)) {
      rooms.set(roomId, createRoom(roomId, 1)); // default 1v1
    }

    //initialize the room
    const room = rooms.get(roomId)!;

	const role = assignRole(room, clientId, socket, roomId);

    // Send initial role and roomId to client
    socket.send(JSON.stringify({ type: "role", role, roomId }));

    // ----- INCOMING MESSAGES/EVENT -----
    socket.on("message", (raw) => {
		handleMsgOrEvent(socket, room, role, raw.toString());
    });

    // ----- CLIENT DISCONNECT -----
    socket.on("close", () => {
		handleDisconnect(socket, room, clientId, role, roomId);
    });
  });
});

function assignRole(room: any, clientId: string, socket: WebSocket, roomId: string) {
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
		//player join the game (chat)
		broadcast(room, createChatMessage("system", `${role} joined the game.`));
	} else {
		//if is exist mean is reconnect
		// Ensure the role is back in the teams
		if (role.startsWith("left_") && !room.gameState.teams.left.includes(role))
			room.gameState.teams.left.push(role);
		if (role.startsWith("right_") && !room.gameState.teams.right.includes(role))
			room.gameState.teams.right.push(role);

		console.log(`Client (${role}) [ ${clientId} ] reconnected as ${role} in room ${roomId}`);
		//player reconnect the game (chat)
		broadcast(room, createChatMessage("system", `${role} reconnect the game.`));
	}
	return role;
}

function handleMsgOrEvent(socket: WebSocket, room: any, role:string, raw:string) {
	const msg = JSON.parse(raw);
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
	else if (msg.type === "chat") {
		broadcast(room, createChatMessage(role ?? "spectator", String(msg.text)));
	}
}


function handleDisconnect(socket: WebSocket, room: any, clientId: string, role:string, roomId: string) {
	// Remove socket and client from room
	room.sockets.delete(socket);
	room.clients.delete(socket);

	console.log(`Client (${role}) [ ${clientId} ] left room=${roomId}`);
	//player quit the game (chat)
	broadcast(room, createChatMessage("system", `${role} quit the game.`))

	// Remove role from teams and paddles
	if (role && role !== "spectator") {
	  room.gameState.teams.left = room.gameState.teams.left.filter((r: string) => r !== role);
	  room.gameState.teams.right = room.gameState.teams.right.filter((r: string) => r !== role);
	  delete room.gameState.paddles[role];
	}

	// If no clients left, delete the room
	if (room.clients.size === 0) {
	  rooms.delete(roomId);
	  console.log(`Room ${roomId} deleted due to no players.`);
	}
}


function broadcast(room: any, msg: any) {
	room.chatHistory.push(msg);
	for(const client of room.clients) {
		if (client.readyState === 1) {
			client.send(JSON.stringify(msg));
		}
	}
}

// ---- CORS ----
await fastify.register(cors, {
  origin: "*", // Allow all origins (for development)
});

//get a list of all active rooms
fastify.get("/rooms", async (req, reply) => {
    const list = [];
    for (const [id, room] of rooms.entries()) {
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

  if (!rooms.has(roomId)) {
    rooms.set(roomId, createRoom(roomId, teamSize));
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