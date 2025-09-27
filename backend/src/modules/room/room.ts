import { WebSocket } from "@fastify/websocket";
import { Game } from "../game/game"; // import game loop
import { liveChatMessage } from "../chat/liveChat"; // import chat message type
//import { saveMatchResult } from "../../plugins/database";
import { broadcast } from "../../utils/utils";

export interface playerInfo {
    clientId: string; // client id
    playerName: string; // player username
    role: string; // "left" or "right"
	team: "left" | "right"; // team side
	leader: boolean; // whether the player is the leader
	spriteUrl: string; // URL of the player's sprite
	ready: boolean; // whether the player is ready
}

/**
 * @brief Room interface ( is like a room information structure)
*/
export interface Room {
	id: string; // room id
	name: string; // room name
	teamSize: number; // team size (1vs1 or 2vs2)
	width: number; // game width
	height: number; // game height
	setting: {
		ballSpeed: number; // ball speed
		paddleHeight: number; // paddle height
		paddleWidth: number; // paddle width
		ballSize: number; // ball size
		paddleSpeed: number; // paddle speed
		scorePoint: number; // points to win the game
		map: string; // game map
	};
	gameState: {
        ball: { x: number; y: number; dx: number; dy: number }; //x & y => position, dx & dy => direction/speed
		paddles: { [key: string]: number }; //[key] => client id, [value] => paddle position
		teams: { left: playerInfo[]; right: playerInfo[] }; //[key] => team side, [value] => playerInfo array
		score: { left: number; right: number }; //[key] => team side, [value] => score
		countdown: number; // countdown number
        gameStarted: boolean; // flag for start game
        gameEnded?: boolean; // flag for end game
	};
	clients: Set<WebSocket>; // Set of WebSocket connections
	clientRoles: Map<string, playerInfo>; //[key] => client id, [value] => playerInfo
	sockets: Map<WebSocket, string>; //[key] => socket, [value] => client id
	chatHistory: liveChatMessage[]; // Array to store chat messages
	startTime?: Date; //start game time
	endTime?: Date; //end game time
	result?: { // game result
		winner: "left" | "right" | "draw";
		scoreLeft: number;
		scoreRight: number;
	};
    disconnectPlayers: Set<string>; // client id who disconnected during the game
	game: Game; // Game instance for game logic
	loopHandle?: NodeJS.Timeout | null; // Interval handle for the game loop
	duration?: number; // game duration
    // readyStatus: Map<string, boolean>; // [key] => client id, [value] => ready status
    canStart: boolean; // Flag to indicate if player all ready
    //startRequestedBy?: string; // clientId of who requested to start game
	leaderId: string; // clientId of the room leader
    private: boolean; // Flag to indicate if the room is private
}

//default value for setting
export const DEFAULT_SETTING = {
	ballSpeed: 5,
	paddleHeight: 80,
	paddleWidth: 10,
	ballSize: 10,
	paddleSpeed: 2,
	scorePoint: 5,
	map: "stadium",
};

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
 * @param leaderId client id of the room leader (default: "")
 * @param isPrivate whether the room is private (default: false)
 * @param initialSetting initial game setting (default: empty object)
 * @returns Room object
*/
export function createRoom(id: string, name: string, teamSize = 1, leaderId: string = "", width: number = 800, height: number = 400, isPrivate: boolean = false, initialSetting: Partial<typeof DEFAULT_SETTING> = {}): Room {
	const room: Room = {
		id,
		name,
		teamSize,
		width,
		height,
		setting: {
			...DEFAULT_SETTING, // start with default setting
			...initialSetting, // override with any valid client-provided settings
		},
		gameState: {
			ball: { x: width / 2, y: height / 2, dx: 1, dy: 1 },
			paddles: {},
			teams: { left: [], right: [] },
			score: { left: 0, right: 0 },
			countdown: 0,
			gameStarted: false,
			gameEnded: false,
		},
		clients: new Set(),
		clientRoles: new Map(),
		sockets: new Map(),
		chatHistory: [] as any [],
		disconnectPlayers: new Set(),
		game: new Game(),
		// readyStatus: new Map(),
		canStart: false,
		leaderId: leaderId,
		private: isPrivate,
	};
	console.log(`width: ${width}, height: ${height}`);
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

	}, 1000 / 60);
}

/**
 * @brief start the game time use date for later calculate duration
 * @param room Room object
*/
export function roomStartGame(room: Room) {
	if (!room.gameState.gameStarted && !room.gameState.countdown) {
		room.startTime = new Date();
		console.log(`room setting: ${JSON.stringify(room.setting)}`);
		room.game.resetBall(room, "left");
	}
}

/**
 * @brief end the game time and calculate duration
 * @param room Room object
 * @param forced Whether to force end the game
*/
export function roomEndGame(room: Room, forced = false) {
	// If game already ended, do nothing
	if (room.result)
		return;

	// close the game when is end
	room.gameState.gameStarted = false;
    room.gameState.gameEnded = true;
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

    //braodcast everyone the game is ended
    broadcast(room, JSON.stringify({
        type: "state",
        gameState: {
            ...room.gameState,
            setting: room.setting
        },
        isSpectator: false, //everyone get the result
    }));
    console.log(`Game ended in room ${room.id}. Winner: ${winner}, Score: ${room.gameState.score.left}-${room.gameState.score.right}`);

	// Save match result to database
	//saveMatchResult(room, room.duration);
}


