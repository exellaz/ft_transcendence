// game.ts
import { WebSocket } from "@fastify/websocket";

// ---- GAME CONFIGURATION ----
export let gameWidth = 0;
export let gameHeight = 0;
export let TEAM_SIZE = 1; //1 => 1vs1, 2 => 2vs2 and so on
let gameStarted = false;

export const gameState: {
  ball: { x: number; y: number; dx: number; dy: number };
  paddles: { [key: string]: number };
  teams: { left: string[]; right: string[] };
  score: { left: number; right: number };
  countdown: number;
} = {
  ball: { x: 300, y: 200, dx: 2, dy: 2 },
  paddles: {},
  teams: { left: [], right: [] },
  score: { left: 0, right: 0 },
  countdown: 0,
};

// ---- CLIENT STATE ----
export const clients = new Set<WebSocket>();
export const clientRoles: Map<string, string> = new Map();
export const sockets: Map<WebSocket, string> = new Map();

////////////////////////////////////////////////// GAME LOGIC //////////////////////////////////////////////////

// get game dimensions size
export function setGameDimensions(width: number, height: number) {
  gameWidth = width;
  gameHeight = height;
}

// reset ball position
export function resetBall(scoredSide: "left" | "right") {
  gameState.ball.x = gameWidth / 2;
  gameState.ball.y = gameHeight / 2;
  gameState.ball.dx = scoredSide === "left" ? -2 : 2;
  gameState.ball.dy =
    (Math.random() < 0.5 ? -1 : 1) * (2 + Math.floor(Math.random() * 2));
}

// initialize paddle positions based on team size
export function set_paddle_position_with_team() {
  const paddleHeight = 80;
  if (TEAM_SIZE === 1) {
    gameState.paddles["left_player1"] = gameHeight / 2;
    gameState.paddles["right_player1"] = gameHeight / 2;
  } else if (TEAM_SIZE === 2) {
    gameState.paddles["left_player1"] = gameHeight / 4;
    gameState.paddles["left_player2"] = (gameHeight * 3) / 4 - paddleHeight;
    gameState.paddles["right_player1"] = gameHeight / 4;
    gameState.paddles["right_player2"] = (gameHeight * 3) / 4 - paddleHeight;
  } else if (TEAM_SIZE === 3) {
    const gap = (gameHeight - 3 * paddleHeight) / 4;
    gameState.paddles["left_player1"] = gap;
    gameState.paddles["left_player2"] = gap * 2 + paddleHeight;
    gameState.paddles["left_player3"] = gap * 3 + paddleHeight * 2;
    gameState.paddles["right_player1"] = gap;
    gameState.paddles["right_player2"] = gap * 2 + paddleHeight;
    gameState.paddles["right_player3"] = gap * 3 + paddleHeight * 2;
  } else if (TEAM_SIZE === 4) {
    const gap = (gameHeight - 4 * paddleHeight) / 5;
    gameState.paddles["left_player1"] = gap;
    gameState.paddles["left_player2"] = gap * 2 + paddleHeight;
    gameState.paddles["left_player3"] = gap * 3 + paddleHeight * 2;
    gameState.paddles["left_player4"] = gap * 4 + paddleHeight * 3;
    gameState.paddles["right_player1"] = gap;
    gameState.paddles["right_player2"] = gap * 2 + paddleHeight;
    gameState.paddles["right_player3"] = gap * 3 + paddleHeight * 2;
    gameState.paddles["right_player4"] = gap * 4 + paddleHeight * 3;
  }
}

// update paddle position with boundary checks
export function updatePaddlePosition(
  current: number,
  dy: number,
  gameHeight: number,
  paddleHeight: number
): number {
  return Math.max(0, Math.min(gameHeight - paddleHeight, current + dy));
}

// update ball position and handle collisions
export function updateBall() {
  if (!gameStarted) return;
  const ball = gameState.ball;
  ball.x += ball.dx;
  ball.y += ball.dy;

  const paddleHeight = 80;
  const paddleWidth = 20;
  const ballRadius = 10;

  if (ball.y <= 0) {
    ball.y = 0;
    ball.dy *= -1;
  } else if (ball.y >= gameHeight) {
    ball.y = gameHeight;
    ball.dy *= -1;
  }

  for (const key in gameState.paddles) {
    const paddleY = gameState.paddles[key];
    if (key.startsWith("left_player") && ball.x <= paddleWidth) {
      if (ball.y >= paddleY && ball.y <= paddleY + paddleHeight) {
        ball.dx *= -1;
        ball.x = paddleWidth;
      }
    }
    if (key.startsWith("right_player") && ball.x + ballRadius >= gameWidth - paddleWidth) {
      if (ball.y >= paddleY && ball.y <= paddleY + paddleHeight) {
        ball.dx *= -1;
        ball.x = gameWidth - paddleWidth - ballRadius;
      }
    }
  }

  if (ball.x + ballRadius < 0) {
    gameState.score.right++;
    resetBall("right");
  } else if (ball.x - ballRadius > gameWidth) {
    gameState.score.left++;
    resetBall("left");
  }
}

// main game loop
export function gameLoop() {
  if (gameState.teams.left.length === TEAM_SIZE && gameState.teams.right.length === TEAM_SIZE) {
    if (!gameStarted) {
      if (!gameState.countdown || gameState.countdown <= 0) {
        gameState.countdown = 5 * 60;
      } else {
        gameState.countdown--;
        if (gameState.countdown <= 0) {
          gameStarted = true;
        }
      }
    } else {
      updateBall();
    }
  } else {
    gameStarted = false;
    gameState.countdown = 0;
  }

  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type: "state", gameState }));
    }
  }
}
