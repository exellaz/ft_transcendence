import type { Room } from "../room/room";
import { rooms, roomEndGame } from "../room/room";
import type { playerInfo } from "../room/room";

/**
 * @brief Interface for Game class method
*/
interface IGame {
	resetBall(room: Room, scoredSide: "left" | "right"): void;
	setPaddlePositionWithTeam(room: Room): void;
	updatePaddlePosition(current: number, dy: number, gameHeight: number, paddleHeight: number, paddleSpeed: number): number;
	updateBall(room: Room): void;
	gameLoop(room: Room): void;
}

export class Game implements IGame {

	/**
	 * @brief reset ball to center and give it a random direction to move
	 * @param room The game room
	 * @param scoredSide The side that just scored ("left" or "right")
	*/
	resetBall(room: Room, scoredSide: "left" | "right") {
		const ball = room.gameState.ball;

		ball.x = room.width / 2;
		ball.y = room.height / 2;

		// Pick random direction
		ball.dx = scoredSide === "left" ? -room.setting.ballSpeed : room.setting.ballSpeed;
		ball.dy = room.setting.ballSpeed;

		// Normalize to constant speed
		const sign = Math.random() < 0.5 ? 1 : -1;
		ball.dx = (scoredSide === "left" ? -1 : 1) * room.setting.ballSpeed;
		ball.dy = sign * room.setting.ballSpeed;
	}

	/**
	 * @brief set paddle position based on team size
	 * @param room The game room
	*/
	setPaddlePositionWithTeam(room: Room) {
		const paddleHeight = room.setting.paddleHeight; //paddle size
		const h = room.height; //room height
		const gap = 20; //gap from wall

		//space paddles within each side
		function distributePaddle(team: playerInfo[]) {
			const positions: number[] = [];
			const availableHeight = h - paddleHeight - gap * 2;

			if (team.length === 1) {
				positions.push((h - paddleHeight) / 2); //center
			}
			else {
				const spacing = availableHeight / (team.length - 1);
				for (let i = 0; i < team.length; i++) {
					positions.push(gap + i * spacing);
				}
			}
			return positions;
		}

		//left team
		const leftRole = room.gameState.teams.left;
		const leftPositions = distributePaddle(leftRole);
		for (let i = 0; i < leftRole.length; i++) {
			const clientId = leftRole[i]?.clientId;
			const position = leftPositions[i];
			if (clientId !== undefined && position !== undefined) {
				room.gameState.paddles[clientId] = position;
			}
		}

		//right team
		const rightRole = room.gameState.teams.right;
		const rightPositions = distributePaddle(rightRole);
		for (let i = 0; i < rightRole.length; i++) {
			const client = rightRole[i];
			const position = rightPositions[i];
			if (client !== undefined && position !== undefined) {
				room.gameState.paddles[client.clientId] = position;
			}
		}
	}

	/**
	 * @brief Update paddle position ensuring it stays within game bounds
	 * @param current Current y position of the paddle
	 * @param dy Change in y position
	 * @param gameHeight Height of the game area
	 * @param paddleHeight Height of the paddle
	 * @returns New y position of the paddle
	*/
	updatePaddlePosition(
		current: number,
		dy: number,
		gameHeight: number,
		paddleHeight: number,
		paddleSpeed: number
	): number {
		return Math.max(0, Math.min(gameHeight - paddleHeight, current + dy * paddleSpeed));
	}

	/**
	 * @brief Update ball position and handle collisions with walls and paddles
	 * @param room The game room
	*/
	updateBall(room: Room) {
		if (!room.gameState.gameStarted) return;
		const ball = room.gameState.ball;
		// console.log("before ball: ", ball); ////debug
		ball.x += ball.dx;
		ball.y += ball.dy;

		const paddleHeight = room.setting.paddleHeight;
		const paddleWidth = room.setting.paddleWidth;
		const ballSize = room.setting.ballSize;
		// console.log("ball size:", ballSize); ////debug
		// console.log("paddle height:", paddleHeight); ////debug
		// console.log("paddle width:", paddleWidth); ////debug

		// Bounce off top and bottom walls
		if (ball.y - ballSize <= 0) {
			ball.y = ballSize;
			ball.dy *= -1;
		}
		else if (ball.y + ballSize >= room.height) {
			ball.y = room.height - ballSize;
			ball.dy *= -1;
		}

		// Bounce off paddles
		for (const clientId in room.gameState.paddles) { //look for player id in paddles
			const paddleY = room.gameState.paddles[clientId];
            if (!paddleY) continue;
            //check left is belong this player or not
			if (room.gameState.teams.left.some((p: playerInfo) => p.clientId === clientId) && ball.x - ballSize <= paddleWidth) {
				if (ball.y + ballSize >= paddleY && ball.y - ballSize <= paddleY + paddleHeight) {
					ball.dx *= -1;
					ball.x = paddleWidth + ballSize;
				}
			}
			if (room.gameState.teams.right.some((p: playerInfo) => p.clientId === clientId) &&
			    ball.x + ballSize >= room.width - paddleWidth) {
			    if (ball.y + ballSize >= paddleY && ball.y - ballSize <= paddleY + paddleHeight) {
			        ball.dx *= -1;
			        ball.x = room.width - paddleWidth - ballSize;
			    }
			}
		}

		//if out of bound in left or right score and rest the ball
		if (ball.x + ballSize < 0) {
			room.gameState.score.right++;
			console.log(`Score: Left ${room.gameState.score.left} - Right ${room.gameState.score.right}`); //// debug
			this.resetBall(room, "left");
		}
		else if (ball.x - ballSize > room.width) {
			room.gameState.score.left++;
			console.log(`Score: Left ${room.gameState.score.left} - Right ${room.gameState.score.right}`); ////debug
			this.resetBall(room, "right");
		}
	}

	/**
	 * @brief Main game loop to update game state and send updates to clients
	 * @param room The game room
	*/
	gameLoop(room: Room) {

		// if no player in room
		if (room.clients.size === 0) {
			rooms.delete(room.id);
			return;
		}

		room.gameState.gameStarted = true; // ensure game has started

		// step 2: update ball position if game has started
		if (room.gameState.gameStarted) {
			this.updateBall(room);
		}

		// step 3: broadcast the game state to all clients when game start
		if (room.gameState.gameStarted) {
			for (const client of room.clients) {
				if (client.readyState === WebSocket.OPEN) { //if the connection is open
					const playerId = room.sockets.get(client); //get player id from socket
					const player = playerId ? room.clientRoles.get(playerId!) : null; //get player role from player id
        	        const role = player?.role; //get player role from player id
					const isSpectator = role === "spectator"; //check if the player is a spectator
					const msg = {
						type: "state",
						gameState: {
                            ...room.gameState,
                            setting: room.setting
                        },
						isSpectator
					};
					// console.log("game state Sending to client:", playerId, "\n", JSON.stringify(msg)); //// debug
					client.send(JSON.stringify(msg));
				}
			}
		}

		// step 4: check for game end condition (first to 1 point)
		if (room.gameState.score.left >= room.setting.scorePoint || room.gameState.score.right >= room.setting.scorePoint) {
			roomEndGame(room, false);

            //broadcast game ended with the result
            for (const client of room.clients) {
				if (client.readyState === WebSocket.OPEN) { //if the connection is open
					const playerId = room.sockets.get(client); //get player id from socket
					const player = playerId ? room.clientRoles.get(playerId!) : null; //get player role from player id
        	        const role = player?.role; //get player role from player id
					const isSpectator = role === "spectator"; //check if the player is a spectator
					const msg = {
						type: "state",
						gameState: room.gameState,
						result: room.result || null,
						isSpectator
					};
					// console.log("game end Sending to client:", playerId, "\n", JSON.stringify(msg)); //// debug
					client.send(JSON.stringify(msg));
				}
			}
            return;
		}
	}
}
