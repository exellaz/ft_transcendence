import { useEffect, useRef, useState } from "react";

// game structure
interface UseGameWebSocketParams {
  roomId: string;
  roomName: string;
  clientId: string;
  initialRole: string;
  playerName: string;
  playerSprite: string;
}

/**
 * @brief Custom hook to manage game WebSocket connection and state
 * @param roomId ID of the game room
 * @param roomName Name of the game room
 * @param clientId Unique client identifier
 * @param initialRole Initial role of the player (left_player1, right_player1, spectator, etc.)
 * @param playerName Name of the player
 * @returns Object containing WebSocket, role, scoreText, statusText, gameOver, winner, playerResult, isSpectator, and gameState
 */
export function useGameWebSocket({
    roomId,
    roomName,
    clientId,
    initialRole,
    playerName,
    playerSprite
}: UseGameWebSocketParams) {
	const [role, setRole] = useState(initialRole);
	const [scoreText, setScoreText] = useState("Score: 0 - 0");
	const [statusText, setStatusText] = useState(`Room: ${roomName}`);
    const [settingView, setSettingView] = useState("");
	const [gameOver, setGameOver] = useState(false);
	const [winner, setWinner] = useState<string | null>(null);
	const [playerResult, setPlayerResult] = useState<"win" | "lose" | null>(null);
	const [isSpectator, setIsSpectator] = useState(false);
	const [gameState, setGameState] = useState<any>(null);
	const socketRef = useRef<WebSocket | null>(null);
    const [setting, setSetting] = useState<any>({
        ballSize: 0,
        PaddleHeight: 0,
        PaddleWidth: 0,
    });

	useEffect(() => {
		// create websocket connection with player id, room id, and side
		//const chooseSide = role?.startsWith("left_player") ? "left" : role?.startsWith("right_player") ? "right" : "spectator";
		const ws = new WebSocket(import.meta.env.VITE_WS_URL + `/ws-game?id=${clientId}&room=${roomId}&side=${initialRole}&name=${encodeURIComponent(playerName)}&sprite=${encodeURIComponent(playerSprite)}`);
		socketRef.current = ws;

		// open connection
		ws.addEventListener("open", () => {
			console.log("Game ws connected");
		});

		// handle incoming message / event from server
		ws.addEventListener("message", (event) => {
			try {
				// validate JSON
				let data;
				try {
					data = JSON.parse(event.data);
				} catch {
					console.error("Invalid JSON");
					return;
				}

				// validate message structure
				if (typeof data !== "object" || data === null) {
					console.error("Invalid message format");
					return;
				}
				if (typeof data.type !== "string") {
					console.error("Invalid message: missing type: ", data);
					return;
				}
				const allowedTypes = ["roleUpdate", "state"];
				if (!allowedTypes.includes(data.type)) {
					console.error(`unsupported message type ${data.type}`);
					return;
				}

				// handle different message types
				if (data.type === "roleUpdate") {
					//validata the game state
					if (typeof data.gameState !== "object" || data.gameState === null) {
						console.error("Invalid game state");
						return;
					}
					//update role based on clientId
					const leftPlayer = data.gameState.teams.left.find((p:any)=>p.clientId === clientId);
					const rightPlayer = data.gameState.teams.right.find((p:any)=>p.clientId === clientId);
					const newRole = leftPlayer?.role || rightPlayer?.role || "spectator";
					setRole(newRole);
					setIsSpectator(newRole === "spectator");
				}
				if (data.type === "state") {
					//validate the game state
					if (typeof data.gameState !== "object" || data.gameState === null) {
						console.error("Invalid game state");
						return;
					}
					//update game state
					setGameState(data.gameState);
                    if (data.gameState.setting) {
                        setSetting(data.gameState.setting);
                    }
					setScoreText(`Score: ${data.gameState.score.left} - ${data.gameState.score.right}`);
					setStatusText(`Room: ${roomName} | Role: ${role}`);
                    setSettingView(`
						Ball Speed: ${data.gameState.setting?.ballSpeed || 0},
						Ball Size: ${data.gameState.setting?.ballSize || 0},
						Paddle Height: ${data.gameState.setting?.paddleHeight || 0},
						Paddle Width: ${data.gameState.setting?.paddleWidth || 0},
						Paddle Speed: ${data.gameState.setting?.paddleSpeed || 0},
						Winning Score: ${data.gameState.setting?.scorePoint || 0},
						map: ${data.gameState.setting?.map}
					`);
					setIsSpectator(role === "spectator");
					//check for game over
					const gameWinner = data.result?.winner || null;
					if (gameWinner && !gameOver) {
						setGameOver(true);
						setWinner(gameWinner);
						// Determine if this client won or lost
						if (role !== "spectator") {
							const inLeftTeam = data.gameState.teams.left.some((p:any)=>p.clientId === clientId);
							const inRightTeam = data.gameState.teams.right.some((p:any)=>p.clientId === clientId);
							if ((inLeftTeam && gameWinner === "left") || (inRightTeam && gameWinner === "right"))
								setPlayerResult("win");
							else
								setPlayerResult("lose");
						}
					}
				}
			} catch (err) {
				console.error("unexpected error in game ws message handling:", err);
				ws.close(1011, "server error");
			}
		});

		// close connection
		ws.addEventListener("close", () => { console.log("Game ws disconnected"); });

		// close socket when component unmount
		return () => ws.close();
	}, [roomId, clientId, initialRole, role, roomName, gameOver]); //re-run effect if any of these change

	return {
		socket: socketRef.current,
		role,
		scoreText,
		statusText,
		gameOver,
		winner,
		playerResult,
		isSpectator,
		gameState,
        setting,
		settingView,
	};
}

/************************************** Draw the game container *************************************/
/**
 * @brief Draw the game state on the canvas
 * @param canvas HTMLCanvasElement to draw on
 * @param state Current game state
 * @param isSpectator Whether the viewer is a spectator
 * @param playerResult Result for the player ("win", "lose", or null)
 */
export function draw_container(
    canvas: HTMLCanvasElement | null,
    state: any,
    isSpectator?: boolean,
    playerResult: "win" | "lose" | null = null
) {
	if (!canvas) return;
	const ctx = canvas.getContext("2d");
	if (!ctx) return;

	const paddleWidth = state.setting?.paddleWidth;
	const paddleHeight = state.setting?.paddleHeight;
	const ballSize = state.setting?.ballSize;

	ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset any existing transforms
	ctx.clearRect(0,0,canvas.width, canvas.height); // Clear the canvas

    // Apply scaling transform
    const scaleX = canvas.width/ 800;
    const scaleY = canvas.height / 400;
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

	//if game over, show winner
	if (playerResult) {
		ctx.font = "48px Arial";
		ctx.fillStyle = "green";
		ctx.textAlign = "center";
		ctx.fillText(playerResult === "win" ? "You Win!" : "You Lose!", 800/2, 400/2);
		return;
	}

	const leftPlayers = state.teams.left.length;
	const rightPlayers = state.teams.right.length;
	const allPlayersConnected = (leftPlayers === 2 && rightPlayers === 2) || (leftPlayers ===1 && rightPlayers ===1 && leftPlayers + rightPlayers === 2);

	// countdown before game starts
	if (!state.gameStarted && state.countdown > 0) {
		const remaining = Math.ceil(state.countdown/60);
		ctx.font = "48px Arial";
		ctx.fillStyle = "gray";
		ctx.textAlign = "center";
		ctx.fillText(`Game starts in ${remaining}...`, 800/2, 400/2);
		return;
	}

	// if not all players entered, show waiting message
	if (!allPlayersConnected && !state.gameStarted) {
		ctx.font = "32px Arial";
		ctx.fillStyle = "gray";
		ctx.textAlign = "center";
		ctx.fillText("Waiting for all players to connect...", 800/2, 400/2);
		return;
	}

	//spectator view
	if (isSpectator) {
		ctx.beginPath();
		ctx.arc(state.ball.x, state.ball.y, ballSize, 0, Math.PI * 2);
		ctx.fillStyle = "black";
		ctx.fill();

		for (const clientId in state.paddles) {
			const y = state.paddles[clientId];
			let x: number;
			if (state.teams.left.some((p:any)=>p.clientId === clientId)) {
				x = 1;
			} else if (state.teams.right.some((p:any)=>p.clientId === clientId)) {
				x = 800 - paddleWidth - 1;
			} else continue;
			ctx.fillStyle = "black";
			ctx.fillRect(x, y, paddleWidth, paddleHeight);
		}
		return;
	}

	// Draw ball
	ctx.beginPath();
	ctx.arc(state.ball.x, state.ball.y, ballSize, 0, Math.PI * 2);
	ctx.fillStyle = "black";
	ctx.fill();

	// Draw paddles
	for (const clientId in state.paddles) {
		const y = state.paddles[clientId];
		let x: number;
		if (state.teams.left.some((p:any)=>p.clientId === clientId)) {
			x = 1;
		} else if (state.teams.right.some((p:any)=>p.clientId === clientId)) {
			x = 800 - paddleWidth - 1;
		} else continue;
		ctx.fillStyle = "black";
		ctx.fillRect(x, y, paddleWidth, paddleHeight);
	}
	return;
}
