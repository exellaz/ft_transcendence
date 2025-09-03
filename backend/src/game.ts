// game.ts
import { Room, rooms } from "./room.ts"

const ballSpeed = 2;

// ---- RESET BALL ----
function resetBall(room: Room, scoredSide: "left" | "right") {
	const ball = room.gameState.ball;

	ball.x = room.width / 2;
	ball.y = room.height / 2;

	// Pick random direction
	let dx = scoredSide === "left" ? -1 : 1;
	let dy = (Math.random() < 0.5 ? -1 : 1) * (Math.random() * 0.5 + 0.5); // random vertical

	// Normalize to constant speed
	const length = Math.sqrt(dx * dx + dy * dy);
	ball.dx = (dx / length) * ballSpeed;
	ball.dy = (dy / length) * ballSpeed;
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
export function gameLoop(room: Room) {

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
