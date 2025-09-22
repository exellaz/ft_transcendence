import Fastify from "fastify";
import cors from "@fastify/cors";
import websocketPlugin from "@fastify/websocket";
import { rooms, createRoom, generateRoomId} from "./modules/room/room.ts";
import { getAllMatches } from "./plugins/database.ts";
import roomWsRoutes from "./modules/room/room.ws.ts";
import { DEFAULT_SETTING } from "./modules/room/room.ts";
import gameWsRoute from "./modules/game/game.ws.ts";
import liveChatRoutes from "./modules/chat/liveChat.ws.ts";

export const fastify = Fastify(); //craete HTTP server

//----------------------- SERVER SETUP -----------------------
await fastify.register(websocketPlugin); // Register WebSocket plugin
await fastify.register(cors, { // Enable CORS (for interact with frontend and backend on different domains)
  origin: "*", // Allow all domains (for development)
});

// ----------------------- WEBSOCKET -----------------------
await fastify.register(roomWsRoutes);
await fastify.register(gameWsRoute);
await fastify.register(liveChatRoutes);

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
	// console.log("responding /rooms: ", response); ////debug
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
	// console.log("request /Create-room:", req.body); ////debug
	const body: any = req.body;

	//assign body parameters to variables
	const {
		name,
		teamSize,
		leaderId,
		width,
		height,
		isPrivate,
		ballSpeed,
		paddleHeight,
		paddleWidth,
		ballSize,
		paddleSpeed,
		scorePoint
	} = body;

	// Validate required fields
	if (typeof teamSize !== "number" || typeof name !== "string" || name.trim() === "") {
		return reply.code(400).send({ error: "Team size and name are required" });
	}
	if (typeof width !== "number" || typeof height !== "number") {
		return reply.code(400).send({ error: "Width and height are required" });
	}
	if (isPrivate && (!leaderId || typeof leaderId !== "string")) {
	  return reply.code(400).send({ error: "Leader ID required for private rooms" });
	}

	// Generate a unique room ID
	const roomId = generateRoomId();

	//initialize game setting
	const initialSetting: Partial<typeof DEFAULT_SETTING> = {}; // set default value to initial setting
	if (typeof ballSpeed === "number") initialSetting.ballSpeed = ballSpeed; // if client provided a valid setting, use it to override the default
	if (typeof paddleHeight === "number") initialSetting.paddleHeight = paddleHeight;
	if (typeof paddleWidth === "number") initialSetting.paddleWidth = paddleWidth;
	if (typeof ballSize === "number") initialSetting.ballSize = ballSize;
	if (typeof paddleSpeed === "number") initialSetting.paddleSpeed = paddleSpeed;
	if (typeof scorePoint === "number") initialSetting.scorePoint = scorePoint;

	// Create and store the new room
	const room = createRoom(
		roomId,
		name,
		teamSize,
		isPrivate ? leaderId : "",
		width,
		height,
		!!isPrivate,
		initialSetting // 👈 important for frontend
	);

	rooms.set(roomId, room);

	console.log(
	  `${isPrivate ? "Private" : "Public"} room ${name} (${roomId}) created with team size ${teamSize}`
	);

	// Respond with room details to client
	const response = {
		roomId,
		name,
		teamSize,
		gameStarted: room.gameState.gameStarted,
		...(isPrivate ? { leaderId } : {}), // only include leaderId if private
		private: room.private,
		setting: room.setting // 👈 important for frontend
	};
	// console.log("responding /create-room:", response); ////debug
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
	// console.log("request /room/setting:", req.body); ////debug
    const { roomId } = req.params as { roomId: string };
    const room = rooms.get(roomId);
    if (!room) {
        return reply.code(404).send({ error: "Room not found" });
    }

	// update only provided settings from client
    const {
		ballSpeed,
		paddleHeight,
		paddleWidth,
		ballSize,
		paddleSpeed,
		scorePoint
	} = req.body as {
		ballSpeed?: number;
		paddleHeight?: number;
		paddleWidth?: number;
		ballSize?: number;
		paddleSpeed?: number;
		scorePoint?: number;
	};

	// change setting if valid
    room.setting.ballSpeed = ballSpeed ?? room.setting.ballSpeed;
    room.setting.paddleHeight = paddleHeight ?? room.setting.paddleHeight;
    room.setting.paddleWidth = paddleWidth ?? room.setting.paddleWidth;
    room.setting.ballSize = ballSize ?? room.setting.ballSize;
	room.setting.paddleSpeed = paddleSpeed ?? room.setting.paddleSpeed;
	room.setting.scorePoint = scorePoint ?? room.setting.scorePoint;

	// console.log("updated room setting:", room.setting); ////debug

	// Notify all connected clients in the room about the setting change
    return { success: true, setting: room.setting };
});

/**
 * @brief HTTP endpoint to get a specific room by id (with settings).
 * @param roomId Room ID from client
 * @return Room object (id, name, settings, etc.)
 */
fastify.get("/room/:roomId", async (req, reply) => {
	const { roomId } = req.params as { roomId: string };
	const room = rooms.get(roomId);
	if (!room) {
		return reply.code(404).send({ error: "Room not found" });
	}

	//notify room details to client
	return {
		id: room.id,
		name: room.name,
		teamSize: room.teamSize,
		width: room.width,
		height: room.height,
		setting: room.setting, // 👈 important for frontend
		gameStarted: room.gameState.gameStarted,
		gameEnded: !!room.gameState.gameEnded,
		private: room.private,
		leaderId: room.leaderId,
	};
});

/**
 * @brief HTTP endpoint to get recent match records.
 * @param limit Optional query parameter to limit number of records (default 10)
 * @return Array of match records to client
 * @note reply with 500 error if database retrieval fails.
*/
fastify.get("/matches", async (req, reply) => {
	// console.log("request /matches:", req.body); ////debug
    try {
        const { limit } = req.query as { limit?: string };
        const matches = getAllMatches(Number(limit) || 10);
		// console.log("responding /matches:", matches); ////debug
        reply.send(matches);
    } catch (error) {
        reply.code(500).send({ error: "Failed to get matches: " + error });
    }
});

