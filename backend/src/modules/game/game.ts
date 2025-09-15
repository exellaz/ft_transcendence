import type { Room } from "../room/room.ts";
import { rooms, roomEndGame } from "../room/room.ts";
import type { playerInfo } from "../room/room.ts";

/**
 * @brief Interface for Game class method
*/
interface IGame {
	resetBall(room: Room, scoredSide: "left" | "right"): void;
	setPaddlePositionWithTeam(room: Room): void;
	updatePaddlePosition(current: number, dy: number, gameHeight: number, paddleHeight: number): number;
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
		let dx = scoredSide === "left" ? -1 : 1; // towards the side that conceded the point
		let dy = (Math.random() < 0.5 ? -1 : 1) * (Math.random() * 0.5 + 0.5); // random vertical

		// Normalize to constant speed
		const length = Math.sqrt(dx * dx + dy * dy);
		ball.dx = (dx / length) * room.setting.ballSpeed;
		ball.dy = (dy / length) * room.setting.ballSpeed;
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
			room.gameState.paddles[leftRole[i].clientId] = leftPositions[i];
		}

		//right team
		const rightRole = room.gameState.teams.right;
		const rightPositions = distributePaddle(rightRole);
		for (let i = 0; i < rightRole.length; i++) {
			room.gameState.paddles[rightRole[i].clientId] = rightPositions[i];
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
		paddleHeight: number
	): number {
		return Math.max(0, Math.min(gameHeight - paddleHeight, current + dy));
	}

	/**
	 * @brief Update ball position and handle collisions with walls and paddles
	 * @param room The game room
	*/
	updateBall(room: Room) {
		if (!room.gameState.gameStarted) return;
		const ball = room.gameState.ball;
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
			console.log(`Score: Left ${room.gameState.score.left} - Right ${room.gameState.score.right}`);
			this.resetBall(room, "right");
		}
		else if (ball.x - ballSize > room.width) {
			room.gameState.score.left++;
			console.log(`Score: Left ${room.gameState.score.left} - Right ${room.gameState.score.right}`);
			this.resetBall(room, "left");
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

        // helper: check if all roles in a team are connected

		const teamConnected = (team: playerInfo[]): boolean => {
			return team.every(player => {
				const entry = [...room.clientRoles.entries()].find(([_, p]) => p.role === player.role);
				const playerId = entry?.[0];
				return playerId && !room.disconnectPlayers.has(playerId);
			});
		};


        //if the game not started yet
		if (room.gameState.countdown > 0) {
			room.gameState.countdown--;
			const secondsLeft = Math.ceil(room.gameState.countdown / 60);
			 console.log(`Game countdown: ${secondsLeft}`); ////debug
            //broadcast countdown to all clients
            for (const client of room.clients) {
                if (client.readyState === 1) {
                    client.send(JSON.stringify({
                        type: "state",
                        gameState: {
                            ...room.gameState,
                            countdown: room.gameState.countdown,
                        },
                        leaderId: room.leaderId,
                        canStart: room.canStart
                    }));
                }
            }
            // Start game when countdown reaches 0
			if (room.gameState.countdown === 0) {
				room.gameState.gameStarted = true;
				room.startTime = new Date();
				console.log(`Game started in room ${room.id}`);
			}
			return; // Skip updating ball until game starts
		}

        // If the game is already started keep updating the ball
		if (room.gameState.gameStarted) {
			this.updateBall(room);
		}

		// Check for game end condition (first to 5 points)
		if (room.gameState.score.left >= 5 || room.gameState.score.right >= 5) {
			roomEndGame(room, false);

            //broadcast game ended with the result
            for (const client of room.clients) {
				if (client.readyState === 1) { //if the connection is open
					const playerId = room.sockets.get(client); //get player id from socket
					const player = playerId ? room.clientRoles.get(playerId!) : null; //get player role from player id
        	        const role = player?.role; //get player role from player id
					const isSpectator = role === "spectator"; //check if the player is a spectator
					const gameStateWithResult = {
        	            ...room.gameState,
        	            //paused: room.gamePaused,
        	            result: room.result || null
        	        }; //include result if game ended (winner and scores)
					client.send(JSON.stringify({
						type: "state",
						gameState: gameStateWithResult,
						isSpectator
					}));
				}
			}
            return;
		}

		//broadcast the game state to all clients when game start
		if (room.gameState.gameStarted) {
			for (const client of room.clients) {
				if (client.readyState === 1) { //if the connection is open
					const playerId = room.sockets.get(client); //get player id from socket
					const player = playerId ? room.clientRoles.get(playerId!) : null; //get player role from player id
        	        const role = player?.role; //get player role from player id
					const isSpectator = role === "spectator"; //check if the player is a spectator
					const gameStateWithResult = {
        	            ...room.gameState,
        	            result: room.result || null
        	        }; //include result if game ended (winner and scores)
					client.send(JSON.stringify({
						type: "state",
						gameState: gameStateWithResult,
						isSpectator
					}));
				}
			}
		}
	}
}
