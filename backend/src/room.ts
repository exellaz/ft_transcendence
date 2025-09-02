import { WebSocket } from "@fastify/websocket";
import { gameLoop } from "./game.ts"; // import game loop
import { ChatMessage } from "./chat.ts"; // import chat message type

const ballSpeed = 2;

// ---- ROOM TYPE ----
export interface Room {
  id: string;
  teamSize: number;
  gameStarted: boolean;
  gameState: {
    ball: { x: number; y: number; dx: number; dy: number };
    paddles: { [key: string]: number };
    teams: { left: string[]; right: string[] };
    score: { left: number; right: number };
    countdown: number;
  };
  clients: Set<WebSocket>;
  clientRoles: Map<string, string>;
  sockets: Map<WebSocket, string>;
  width: number;
  height: number;
  chatHistory: ChatMessage[];
}


// ---- INITIALIZE ROOMS ----
export const rooms: Map<string, Room> = new Map();

// ---- CREATE A NEW ROOM ----
export function createRoom(id: string, teamSize = 1, width = 800, height = 400): Room {
  const room: Room = {
    id,
    teamSize,
    gameStarted: false,
    gameState: {
      ball: { x: width / 2, y: height / 2, dx: ballSpeed, dy: ballSpeed },
      paddles: {},
      teams: { left: [], right: [] },
      score: { left: 0, right: 0 },
      countdown: 0,
    },
    clients: new Set(),
    clientRoles: new Map(),
    sockets: new Map(),
    width,
    height,
	chatHistory: [] as any [],
  };

  startRoomLoop(room);
  return room;
}

// ---- START GAME LOOP PER ROOM ----
function startRoomLoop(room: Room) {
  let interval: NodeJS.Timeout | null = null;

  const runLoop = () => {
    // Only start loop if not running
    if (!interval) {
        interval = setInterval(() => {
            // If room has no players, stop loop
            if (room.clients.size === 0) {
                clearInterval(interval!);
                interval = null;
                return;
            }
            gameLoop(room);
        }, 1000 / 60);
    }
  };

  runLoop(); // start immediately
}