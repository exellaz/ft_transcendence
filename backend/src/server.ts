// server.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import websocketPlugin from "@fastify/websocket";
import { URL } from "url";
import { WebSocketHandler } from "./webSocketHandler.ts";
import { rooms, createRoom, generateRoomId} from "./room.ts";
import { getAllMatches } from "./database.ts";

// ---- SETUP SERVER ----
const fastify = Fastify(); // Create a high-performance HTTP server
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

// WebSocket handler instance
const wsHandler = new WebSocketHandler();

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
	const url = new URL(req.url!, `http://${req.headers.host}`); // Parse the request URL
	const clientId = url.searchParams.get("id") || Math.floor(Math.random() * Math.pow(10, 6)).toString().padStart(6, "0"); //check the client any id created if not create one
	const roomId = url.searchParams.get("room");
    const side = url.searchParams.get("side") as "left" | "right" | null;

	//fetch the room by id
	const room = rooms.get(roomId!);
	if (!room) {
		socket.close(1008, "Room not found");
		return;
	}

    // Assign role to client (player, spectator, etc.)
	const role = wsHandler.assignRole(room, clientId, socket, room.id, side || undefined);

	// Send role and roomId to client
	socket.send(JSON.stringify({ type: "role", role, roomId: room.name }));

	// ----- INCOMING MESSAGES/EVENT -----
	socket.on("message", (raw) => {
		wsHandler.handleMsgOrEvent(socket, room, role, raw.toString());
	});

	// ----- CLIENT DISCONNECT -----
	socket.on("close", () => {
		wsHandler.handleDisconnect(socket, room, clientId, role, room.id);
	});
  });
});

/**
 * @brief HTTP endpoint to list all available rooms.
 * @return Array of room objects with id, name, team size, player counts, and game status.
*/
fastify.get("/rooms", async (req, reply) => {
	return Array.from(rooms.values()).map(room => ({
		id: room.id,
		name: room.name,
		teamSize: room.teamSize,
		leftPlayers: room.gameState.teams.left.length,
		rightPlayers: room.gameState.teams.right.length,
		gameStarted: room.gameState.gameStarted,
	}));
});

/**
 * @brief HTTP endpoint to create a new game room.
 * @param teamSize Number of players per team (from request body)
 * @param name Name of the room (from request body)
 * @return Object with roomId, name, teamSize, and gameStarted status.
 * @note req body should be JSON with "teamSize" and "name" fields.
 * @note reply with 400 error if parameters are missing.
*/
fastify.post("/create-room", async (req, reply) => {
    console.log("Create room request body:", req.body);
	const body: any = req.body;
	const teamSize = body.teamSize;
	const name = body.name;
	const leaderId = body.leaderId;

	if (typeof teamSize !== "number" || typeof name !== "string" || name.trim() === "") {
	  return reply.code(400).send({ error: "team size and name are required" });
	}

	const roomId = generateRoomId();
	const room = createRoom(roomId, name, teamSize, leaderId);
	rooms.set(roomId, room);

	console.log(`Room ${name} (${roomId}) created with team size ${teamSize} and name ${name} by leader ${leaderId}`);

	return {
		roomId,
		name,
		teamSize,
		gameStarted: room.gameState.gameStarted,
		leaderId
	};
});

fastify.get("/matches", async (req, reply) => {
	try {
		const { limit } = req.query as { limit?: string };
		const matches = getAllMatches(Number(limit) || 10);
		reply.send(matches);
	} catch (e) {
		reply.code(500).send({ error: "Failed to get matches" });
	}
});

/**
 * @brief Start the Fastify server on port 4242.
 * @note Listens on all network interfaces
 * @note Logs server address on successful start
 * @note Exits process on failure
*/
try {
	const addr = await fastify.listen({ port: 4242, host: "0.0.0.0" });
	console.log(`Server running at ${addr}`);
} catch (err) {
	console.error("Failed to start server:", err);
	process.exit(1);
}
