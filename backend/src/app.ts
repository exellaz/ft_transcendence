import Fastify from "fastify";
import cors from "@fastify/cors";
import websocketPlugin from "@fastify/websocket";
import { URL } from "url";
import { WebSocketHandler } from "./modules/game/webSocketHandler.ts";
import { rooms, createRoom, generateRoomId} from "./modules/room/room.ts";
import { getAllMatches } from "./plugins/database.ts";
import { Game } from "./modules/game/game.ts";

export const fastify = Fastify(); //craete HTTP server

//----------------------- SERVER SETUP -----------------------
await fastify.register(websocketPlugin); // Register WebSocket plugin
await fastify.register(cors, { // Enable CORS (for interact with frontend and backend on different domains)
  origin: "*", // Allow all domains (for development)
});

//enable JSON parsing
fastify.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
    try {
        const json = JSON.parse(body as string);
        done(null, json);
    } catch (err) {
        done(err as Error, undefined);
    }
});

// ----------------------- WEBSOCKET -----------------------
const wsHandler = new WebSocketHandler();
export const chatRooms = new Map(); // Store all connected chat clients

/**
 * @brief WebSocket endpoint for real-time communication.
 *
 * Clients connect to this endpoint with query parameters:
 * - id: Unique client identifier (optional, generated if not provided)
 * - room: Room ID to join
 * The server assigns roles, handles messages/events, and manages disconnections.
*/
await fastify.register(async function (fastify) {
	fastify.get("/ws", { websocket: true }, (socket, req) => {
	const url = new URL(req.url!, `http://${req.headers.host}`); // Parse URL from client request
	const clientId = url.searchParams.get("id");
	if (!clientId) {
		socket.close(1008, "Client id is required");
		return;
	}
	const roomId = url.searchParams.get("room");
	if (!roomId) {
		socket.close(1008, "Room id is required");
		return;
	}
	const side = url.searchParams.get("side");
	if (side && side !== "left" && side !== "right") {
		socket.close(1008, "Side is required");
		return;
	}
    const room = rooms.get(roomId!);
    if (!room) {
        socket.close(1008, "Room not found");
        return;
    }

    // step 1: Assign role to client (player, spectator, etc.)
    const player = wsHandler.assignRole(room, clientId, socket, room.id, side as string);
	console.log("Websocket assign role response: ", player); //// debug

    // step 2: handle incoming messages from clients
    socket.on("message", (raw) => {
		console.log("WebSocket msg received:", raw.toString()); //// debug
        wsHandler.handleMsgOrEvent(socket, room, player, raw.toString());
		console.log("WebSocket msg sent:", raw.toString()); //// debug
    });

    // Step 3: handle client disconnect
    socket.on("close", () => {
        wsHandler.handleDisconnect(socket, room, clientId, room.id);
    });

  });
});

fastify.get("/ws-game", { websocket: true }, (socket, req) => {
	const url = new URL(req.url!, `http://${req.headers.host}`);
	const clientId = url.searchParams.get("id");
	if (!clientId) {
		socket.close(1008, "Client id is required");
		return;
	}
	const roomId = url.searchParams.get("room");
	if (!roomId) {
		socket.close(1008, "Room id is required");
		return;
	}
	const side = url.searchParams.get("side");
	if (side && side !== "left" && side !== "right") {
		socket.close(1008, "Side is required");
		return;
	}
	const room = rooms.get(roomId!);
	if (!room) {
		socket.close(1008, "Room not found");
		return;
	}

	// Step 1: Assign role to client (player, spectator, etc.)
	const player = wsHandler.assignRole(room, clientId, socket, room.id, side as string);
	const game = new Game();

	// Step 2: handle incoming messages from clients
	socket.on("message", (raw) => {
		console.log("Game WebSocket received:", raw.toString()); //// debug
		const msg = JSON.parse(raw.toString());
		if (msg.type === "move") {
			if (player.role !== "spectator") {
				room.gameState.paddles[player.id!] = game.updatePaddlePosition(
					room.gameState.paddles[player.id!] ?? 0,
					msg.dy,
					room.height,
					room.setting.paddleHeight
				);
			}
		}
		if (msg.type === "setWidth") {
			room.width = msg.width;
		}
		if (msg.type === "setHeight") {
			room.height = msg.height;
		}
		console.log("Game WebSocket sent:", raw.toString()); //// debug
	});

	// Step 3: handle client disconnect
	socket.on("close", () => {
		wsHandler.handleDisconnect(socket, room, clientId, room.id);
	});
});



/**
 * @brief WebSocket endpoint for global chat.
 * Clients connect to this endpoint to send/receive chat messages.
 * The server broadcasts messages format to all connected clients.
 * Message format:
 * {
 *   type: "chat",
 *   from: "client_id",
 *   text: "message_text",
 *   time: timestamp
 * }
*/
fastify.get("/chat", { websocket: true }, (connection, req) => {
    // Step 1: get client query param
    const { room } = req.query as { room?: string };

    //if no room then close connection
    if (!room) {
        connection.close();
        return;
    }

    // Step 1: asign key (room id) and value (set of clients) to map if not room exist yet
    if (!chatRooms.has(room)) {
        chatRooms.set(room, new Set());
    }
    const clients = chatRooms.get(room);
    clients.add(connection);

    // Step 2: handle incoming messages from clients
    connection.on("message", (raw) => {
		console.log("Chat WebSocket received:", raw.toString()); //// debug
        const msg = JSON.parse(raw.toString());

        if (msg.type === "chat") {
            const chatMsg = {
                type: "chat",
                from: msg.from, //client id from client
                text: msg.text, //text from client
                time: Date.now(),
            };
            //broadcast to all clients in the room
            for (const client of clients) {
                if (client.readyState === WebSocket.OPEN)
                    client.send(JSON.stringify(chatMsg));
            }
        }

        if (msg.type === "system") {
            const systemMsg = {
                type: "chat",
                from: "system",
                text: msg.text, //text from client
                time: Date.now(),
            };
            for (const client of clients) {
                if (client.readyState === WebSocket.OPEN)
                    client.send(JSON.stringify(systemMsg));
            }
        }
		console.log("Chat WebSocket sent:", raw.toString()); //// debug
    });

    // Step 3: handle client disconnect
    connection.on("close", () => {
        clients.delete(connection);
        if (clients.size === 0) {
            chatRooms.delete(room); //delete the room chat
        }
    })
});

// ----------------------- HTTP ENDPOINTS -----------------------

/**
 * @brief HTTP endpoint to list all available rooms.
 * @return all rooms with id, name, teamSize, leftPlayers, rightPlayers, and gameStarted status to client
*/
fastify.get("/rooms", async () => {
	const response = Array.from(rooms.values()).map(room => ({
		id: room.id,
        name: room.name,
        teamSize: room.teamSize,
        leftPlayers: room.gameState.teams.left.length,
        rightPlayers: room.gameState.teams.right.length,
        gameStarted: room.gameState.gameStarted,
        gameEnded: !!room.gameState.gameEnded,
        private: room.private
    }));
	console.log("responding /rooms: ", response); ////debug
	return response;
});

/**
 * @brief HTTP endpoint to create a new game room.
 * @param teamSize Number of players per team (from client)
 * @param name Name of the room (from client)
 * @param leaderId Client ID of the room creator (from client)
 * @param width Width of the game area (from client)
 * @param height Height of the game area (from client)
 * @return Object with roomId, name, teamSize, and gameStarted status to client
*/
fastify.post("/create-room", async (req, reply) => {
	console.log("request /Create-room:", req.body); ////debug
	const body: any = req.body;
	const { name, teamSize, leaderId, width, height, isPrivate } = body;

	if (typeof teamSize !== "number" || typeof name !== "string" || name.trim() === "") {
		return reply.code(400).send({ error: "Team size and name are required" });
	}
	if (typeof width !== "number" || typeof height !== "number") {
		return reply.code(400).send({ error: "Width and height are required" });
	}

	// private rooms require a leaderId
	if (isPrivate && (!leaderId || typeof leaderId !== "string")) {
	  return reply.code(400).send({ error: "Leader ID required for private rooms" });
	}

	const roomId = generateRoomId();
	const room = createRoom(
		roomId,
		name,
		teamSize,
		isPrivate ? leaderId : "",
		width,
		height,
		!!isPrivate
	);

	rooms.set(roomId, room);

	console.log(
	  `${isPrivate ? "Private" : "Public"} room ${name} (${roomId}) created with team size ${teamSize}`
	);

	const response = {
		roomId,
		name,
		teamSize,
		gameStarted: room.gameState.gameStarted,
		...(isPrivate ? { leaderId } : {}), // only include leaderId if private
		private: room.private,
	};
	console.log("responding /create-room:", response); ////debug
	return response;
});


/**
 * @brief HTTP endpoint to update game settings for a specific room.
 * @param roomId Room ID to update (from client)
 * @param ballSpeed New ball speed (from client, optional)
 * @param paddleHeight New paddle height (from client, optional)
 * @param paddleWidth New paddle width (from client, optional)
 * @param ballSize New ball size (from client, optional)
 * @return Success status to client
*/
fastify.post("/room/:roomId/setting", async (req, reply) => {
	console.log("request /room/setting:", req.body); ////debug
    const { roomId } = req.params as { roomId: string };
    const room = rooms.get(roomId);
    if (!room) {
        return reply.code(404).send({ error: "Room not found" });
    }

    const { ballSpeed, paddleHeight, paddleWidth, ballSize } = req.body as { ballSpeed?: number; paddleHeight?: number ; paddleWidth?: number; ballSize?: number };
    room.setting.ballSpeed = ballSpeed ?? room.setting.ballSpeed;
    room.setting.paddleHeight = paddleHeight ?? room.setting.paddleHeight;
    room.setting.paddleWidth = paddleWidth ?? room.setting.paddleWidth;
    room.setting.ballSize = ballSize ?? room.setting.ballSize;
	console.log("updated room setting:", room.setting); ////debug
    return { success: true };
});

/**
 * @brief HTTP endpoint to get recent match records.
 * @param limit Optional query parameter to limit number of records (default 10)
 * @return Array of match records to client
 * @note reply with 500 error if database retrieval fails.
*/
fastify.get("/matches", async (req, reply) => {
	console.log("request /matches:", req.body); ////debug
    try {
        const { limit } = req.query as { limit?: string };
        const matches = getAllMatches(Number(limit) || 10);
		console.log("responding /matches:", matches); ////debug
        reply.send(matches);
    } catch (error) {
        reply.code(500).send({ error: "Failed to get matches: " + error });
    }
});

