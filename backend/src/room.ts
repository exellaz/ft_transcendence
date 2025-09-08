import { WebSocket } from "@fastify/websocket";
import { Game, ballSpeed } from "./game.ts"; // import game loop
import { ChatMessage } from "./chat.ts"; // import chat message type
import { saveMatchResult } from "./database.ts";

/**
 * @brief Room interface ( is like a room information structure)
*/
export interface Room {
	id: string;
	name: string;
	teamSize: number;
	width: number;
	height: number;
	gameState: {
        ball: { x: number; y: number; dx: number; dy: number };
		paddles: { [key: string]: number }; //key: client id, value: paddle y position
		teams: { left: string[]; right: string[] }; //key: team side, value: array of client ids
		score: { left: number; right: number }; //key: team side, value: score
		countdown: number;
        gameStarted: boolean;
	};
	clients: Set<WebSocket>;
	clientRoles: Map<string, string>; //key: client id, value: role ("left" or "right")
	sockets: Map<WebSocket, string>; //key: socket, value: client id
	chatHistory: ChatMessage[]; // Array to store chat messages
	startTime?: Date; //start game time
	endTime?: Date; //end game time
	result?: {
		winner: "left" | "right" | "draw";
		scoreLeft: number;
		scoreRight: number;
	};
    disconnectPlayers: Set<string>; // Set of client ids who disconnected
	pendingDisconnects: Map<string, NodeJS.Timeout>; // key: client id, value: timeout handle
	game: Game; // Game instance for the room
	loopHandle?: NodeJS.Timeout | null; // Interval handle for the game loop
	gamePaused?: boolean; // Flag to indicate if the game is paused
	duration?: number; // Game duration in seconds
    readyStatus: Map<string, boolean>; // key: client id, value: ready status
    canStart: boolean; // Flag to indicate if the game can start
    startRequestedBy?: string; // clientId of who requested the game start
	leaderId: string; // clientId of the room leader
}

/**
 * @brief initialize all rooms as a map
 * @key room id
 * @value Room object (info about the room)
*/
export const rooms: Map<string, Room> = new Map();

/**
 * @brief generate random 6 digit room id
 * @param length length of the room id (default: 6)
 * @returns room id as string
 */
export function generateRoomId(length = 6): string {
	return Math.floor(Math.random() * Math.pow(10, length))
		.toString()
		.padStart(length, "0");
}

/**
 * @brief create a room from client input parameters
 * @param id room id
 * @param name room name
 * @param teamSize team size (default: 1)
 * @param width room width (default: 800)
 * @param height room height (default: 400)
 * @returns Room object
*/
export function createRoom(id: string, name: string, teamSize = 1, leaderId: string, width: number, height: number): Room {
	const room: Room = {
		id,
		name,
		teamSize,
		width,
		height,
		gameState: {
            ball: { x: width / 2, y: height / 2, dx: ballSpeed, dy: ballSpeed },
			paddles: {},
			teams: { left: [], right: [] },
			score: { left: 0, right: 0 },
			countdown: 0,
            gameStarted: false,
		},
		clients: new Set(),
		clientRoles: new Map(),
		sockets: new Map(),
		chatHistory: [] as any [],
        disconnectPlayers: new Set(),
        gamePaused: false,
		pendingDisconnects: new Map(),
		game: new Game(),
        readyStatus: new Map(),
        canStart: false,
		leaderId: leaderId,
	};
	console.log(`widht: ${width}, height: ${height}`);
	return room;
}

/**
 * @brief start the game loop for a room
 * @param room Room object
 */
export function startRoomLoop(room: Room) {
	// if loop already running, do nothing
	if (room.loopHandle)
		return;

	// Start the game loop at 60 FPS
	room.loopHandle = setInterval(() => {
		// If room has no players, stop loop
		if (room.clients.size === 0) {
			clearInterval(room.loopHandle!);
			room.loopHandle = null;
			rooms.delete(room.id);
			console.log(`Room ${room.id} deleted due to no players.`); //? is it from DC ?
			return;
		}
		room.game.gameLoop(room);

        //if game is paused, skip sending state update
        if (room.gamePaused)
            return;
	}, 1000 / 60);
}

/**
 * @brief start the game time use date for later calculate duration
 * @param room Room object
*/
export function roomStartGame(room: Room) {
	if (!room.gameState.gameStarted && !room.gameState.countdown) {
		room.startTime = new Date();
	}
}

/**
 * @brief end the game time and calculate duration
 * @param room Room object
 * @param forced Whether to force end the game
*/
export function roomEndGame(room: any, forced = false) {
	// If game already ended, do nothing
	if (room.result)
		return;

	// close the game when is end
	room.gameState.gameStarted = false;
	room.endTime = new Date();

	//stop loop
	if (room.loopHandle) {
		clearInterval(room.loopHandle);
		room.loopHandle = null;
	}

	//if not force to end then determine winner by score
	let winner: "left" | "right" | "draw";
	if (!forced) {
		if (room.gameState.score.left > room.gameState.score.right)
			winner = "left";
		else if (room.gameState.score.left < room.gameState.score.right)
			winner = "right";
		else
			winner = "draw";
	}
	else {
		// if forced, determine winner by current score
		const left = room.gameState.score.left;
		const right = room.gameState.score.right;
		if (left > right)
			winner = "left";
		else if (left < right)
			winner = "right";
		else
			winner = "draw";
	}

	// set the result
	room.result = {
		winner,
		scoreLeft: room.gameState.score.left,
		scoreRight: room.gameState.score.right,
	};

	// Calculate duration for a game
	const start = room.startTime ?? new Date(); //if the start time is undefined, use current time
	const end = room.endTime ?? new Date(); //if the end time is undefined, use current time
	const ms = end.getTime() - start.getTime(); // milliseconds
	room.duration = ms;                    // store raw ms (number)

	// Save match result to database
	saveMatchResult(room, room.duration);
}
