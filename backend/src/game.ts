// game.ts
import { WebSocket } from "@fastify/websocket";

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
      ball: { x: width / 2, y: height / 2, dx: 2, dy: 2 },
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

// ---- RESET BALL ----
function resetBall(room: Room, scoredSide: "left" | "right") {
  room.gameState.ball.x = room.width / 2;
  room.gameState.ball.y = room.height / 2;
  room.gameState.ball.dx = scoredSide === "left" ? -2 : 2;
  room.gameState.ball.dy =
    (Math.random() < 0.5 ? -1 : 1) * (2 + Math.floor(Math.random() * 2));
}

// ---- SET INITIAL PADDLES ----
export function setPaddlePositionWithTeam(room: Room) {
  const paddleHeight = 80;
  const h = room.height;

    if (room.teamSize === 1) {
        room.gameState.paddles["left_player1"] = h / 2;
        room.gameState.paddles["right_player1"] = h / 2;
    }
    else if (room.teamSize === 2) {
        room.gameState.paddles["left_player1"] = h / 4;
        room.gameState.paddles["left_player2"] = (h * 3) / 4 - paddleHeight;
        room.gameState.paddles["right_player1"] = h / 4;
        room.gameState.paddles["right_player2"] = (h * 3) / 4 - paddleHeight;
    }
    else if (room.teamSize === 3) {
        room.gameState.paddles["left_player1"] = h / 6;
        room.gameState.paddles["left_player2"] = h / 2 - paddleHeight / 2;
        room.gameState.paddles["left_player3"] = (h * 5) / 6 - paddleHeight;
        room.gameState.paddles["right_player1"] = h / 6;
        room.gameState.paddles["right_player2"] = h / 2 - paddleHeight / 2;
        room.gameState.paddles["right_player3"] = (h * 5) / 6 - paddleHeight;
    }
    else if (room.teamSize === 4) {
        room.gameState.paddles["left_player1"] = h / 8;
        room.gameState.paddles["left_player2"] = (h * 3) / 8 - paddleHeight / 2;
        room.gameState.paddles["left_player3"] = (h * 5) / 8 - paddleHeight / 2;
        room.gameState.paddles["left_player4"] = (h * 7) / 8 - paddleHeight;
        room.gameState.paddles["right_player1"] = h / 8;
        room.gameState.paddles["right_player2"] = (h * 3) / 8 - paddleHeight / 2;
        room.gameState.paddles["right_player3"] = (h * 5) / 8 - paddleHeight / 2;
        room.gameState.paddles["right_player4"] = (h * 7) / 8 - paddleHeight;
    }

}

// ---- UPDATE PADDLE ----
export function updatePaddlePosition(
  current: number,
  dy: number,
  gameHeight: number,
  paddleHeight: number
): number {
  return Math.max(0, Math.min(gameHeight - paddleHeight, current + dy));
}

// ---- UPDATE BALL position----
function updateBall(room: Room) {
  if (!room.gameStarted) return;
  const ball = room.gameState.ball;
  ball.x += ball.dx;
  ball.y += ball.dy;

  const paddleHeight = 80;
  const paddleWidth = 20;
  const ballRadius = 10;

  // Bounce off top and bottom walls
  if (ball.y <= 0) {
    ball.y = 0;
    ball.dy *= -1;
  } else if (ball.y >= room.height) {
    ball.y = room.height;
    ball.dy *= -1;
  }

    // Bounce off paddles
  for (const key in room.gameState.paddles) {
    const paddleY = room.gameState.paddles[key];
    if (key.startsWith("left_player") && ball.x <= paddleWidth) {
      if (ball.y >= paddleY && ball.y <= paddleY + paddleHeight) {
        ball.dx *= -1;
        ball.x = paddleWidth;
      }
    }
    if (key.startsWith("right_player") && ball.x + ballRadius >= room.width - paddleWidth) {
      if (ball.y >= paddleY && ball.y <= paddleY + paddleHeight) {
        ball.dx *= -1;
        ball.x = room.width - paddleWidth - ballRadius;
      }
    }
  }

  //if out of bound in left or right score and rest the ball
  if (ball.x + ballRadius < 0) {
    room.gameState.score.right++;
    resetBall(room, "right");
  } else if (ball.x - ballRadius > room.width) {
    room.gameState.score.left++;
    resetBall(room, "left");
  }
}

// ---- GAME LOOP ----
function gameLoop(room: Room) {

    // if no player in room
    if (room.clients.size === 0) {
        rooms.delete(room.id);
        return;
    }

    // get players
    const leftReady = room.gameState.teams.left.length === room.teamSize;
    const rightReady = room.gameState.teams.right.length === room.teamSize;

    //check if both team is available
    if (leftReady && rightReady) {
        //if the game not starting
        if (!room.gameStarted) {
            // Start countdown to start
            if (!room.gameState.countdown || room.gameState.countdown <= 0) {
                room.gameState.countdown = 5 * 60;
            }
            // start the game
            else {
                room.gameState.countdown--;
                if (room.gameState.countdown <= 0) {
                    room.gameStarted = true;
                }
            }
        }
        // If the game is already started keep updating the ball
        else {
            updateBall(room);
        }
    }
    else {
        // Not enough players, pause game
        room.gameStarted = false;
        room.gameState.countdown = 0;
    }

    // All clients (including spectators) always receive the current game state
    for (const client of room.clients) {
        //check if the connection is still open then send these info to the client
        if (client.readyState === 1) {
            const playerId = room.sockets.get(client);
            const role = room.clientRoles.get(playerId!);
            const isSpectator = role === "spectator";
            client.send(JSON.stringify({ type: "state", gameState: room.gameState, isSpectator }));
        }
    }
}
