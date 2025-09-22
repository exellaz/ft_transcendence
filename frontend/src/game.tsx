import { useEffect, useRef, useState } from "react";
import { BASE_WIDTH, BASE_HEIGHT } from "./constants";
import { useBlockLeave } from "./useBlockLeave";

// game structure
interface UseGameWebSocketParams {
  roomId: string;
  roomName: string;
  clientId: string;
  initialRole: string;
  playerName: string;
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
export function useGameWebSocket({ roomId, roomName, clientId, initialRole, playerName }: UseGameWebSocketParams) {
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
		const chooseSide = role?.startsWith("left_player") ? "left" : role?.startsWith("right_player") ? "right" : "spectator";
		const ws = new WebSocket(import.meta.env.VITE_WS_URL + `/ws-game?id=${clientId}&room=${roomId}&side=${chooseSide}&name=${encodeURIComponent(playerName)}`);
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
						Ball Speed: ${data.gameState.setting?.ballSpeed},
						Ball Size: ${data.gameState.setting?.ballSize},
						Paddle Height: ${data.gameState.setting?.paddleHeight},
						Paddle Width: ${data.gameState.setting?.paddleWidth},
						Paddle Speed: ${data.gameState.setting?.paddleSpeed}
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
function draw_container(
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
    const scaleX = canvas.width/ BASE_WIDTH;
    const scaleY = canvas.height / BASE_HEIGHT;
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

	//if game over, show winner
	if (playerResult) {
		ctx.font = "48px Arial";
		ctx.fillStyle = "green";
		ctx.textAlign = "center";
		ctx.fillText(playerResult === "win" ? "You Win!" : "You Lose!", BASE_WIDTH/2, BASE_HEIGHT/2);
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
		ctx.fillText(`Game starts in ${remaining}...`, BASE_WIDTH/2, BASE_HEIGHT/2);
		return;
	}

	// if not all players entered, show waiting message
	if (!allPlayersConnected && !state.gameStarted) {
		ctx.font = "32px Arial";
		ctx.fillStyle = "gray";
		ctx.textAlign = "center";
		ctx.fillText("Waiting for all players to connect...", BASE_WIDTH/2, BASE_HEIGHT/2);
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
				x = BASE_WIDTH - paddleWidth - 1;
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
			x = BASE_WIDTH - paddleWidth - 1;
		} else continue;
		ctx.fillStyle = "black";
		ctx.fillRect(x, y, paddleWidth, paddleHeight);
	}
	return;
}

/************************************** Game Component **************************************/
/**
 * @brief Main Game component
 * @param roomId ID of the game room
 * @param roomName Name of the game room
 * @param clientId Unique client identifier
 * @param initialRole Initial role of the player (left_player1, right_player1, spectator, etc.)
 * @param playerName Name of the player
 * @param onBack Callback function to handle back to lobby
*/
export default function Game({
	roomId,
	roomName,
	clientId,
	initialRole,
	playerName,
	onBack
} : {
	roomId:string;
	roomName:string;
	clientId:string;
	initialRole:string;
	playerName:string;
	onBack:()=>void
}) {
	//prevent accidental refresh or leave
	useBlockLeave();
	//ref to the canvas
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	//keep track of which keys are pressed
	const keysRef = useRef({ up:false, down:false });
	//use custom hook to manage websocket and game state
	const {
		socket,
		role,
		scoreText,
		statusText,
		gameOver,
		playerResult,
		isSpectator,
		gameState,
        setting,
		settingView,
	} = useGameWebSocket({ roomId, roomName, clientId, initialRole, playerName });

	//--- redraw the game when game state changes ---
	useEffect(() => {
		if (gameState) {
			draw_container(canvasRef.current!, { ...gameState, setting}, isSpectator, playerResult);
		}
	}, [gameState, isSpectator, playerResult, setting]);

	//--- handle keypresses, beforeunload ---
	useEffect(()=>{
		const keyhandler = (e: KeyboardEvent) => {
			if (!gameOver) {
				if (role !== "spectator") {
					if (e.type === "keydown") {
						if (e.key === "ArrowUp") keysRef.current.up = true;
						if (e.key === "ArrowDown") keysRef.current.down = true;
					}
					if (e.type === "keyup") {
						if (e.key === "ArrowUp") keysRef.current.up = false;
						if (e.key === "ArrowDown") keysRef.current.down = false;
					}
				}
			}
		};
		window.addEventListener("keydown", keyhandler);
		window.addEventListener("keyup", keyhandler);

		return () => {
			window.removeEventListener("keydown", keyhandler);
			window.removeEventListener("keyup", keyhandler);
		};
	}, [gameOver, role, isSpectator]);

	//--- send keypress updates to server ---
	useEffect(()=>{
		const updateKeyPress = window.setInterval(()=>{
			if (role !== "spectator" && !gameOver && socket && socket.readyState === WebSocket.OPEN) {
				const speed = setting?.paddleSpeed;
				if (keysRef.current.up) socket.send(JSON.stringify({ type: "move", role, dy: -speed }));
				if (keysRef.current.down) socket.send(JSON.stringify({ type: "move", role, dy: speed }));
			}
		}, 1000/60); //make 60 frames per second
		return () => clearInterval(updateKeyPress); // cleanup when finished
	}, [role, gameOver, socket, setting?.paddleSpeed]);

	//--- handle back to lobby ---
	function handleBack() {
		if (role !== "spectator" && !gameOver) {
			const confirmLeave = window.confirm(
				"The game is still in progress. Are you sure you want to leave?"
			);
			if (!confirmLeave) return;
		}
		//close socket and remove all info in session storage
		try { socket?.close(); } catch {}
		sessionStorage.removeItem("pongRoomName");
		sessionStorage.removeItem("pongRoomId");
		//back to lobby
		onBack();
	}

  return (
	<div className="p-4 text-center">
	  <h1 id="roleText">{statusText}</h1>
	  <h2 id="scoreText">{scoreText}</h2>
	  <h2 id="settingText">{settingView}</h2>
	  <canvas id="game" ref={canvasRef} className="mx-auto block w-full h-auto max-w-[800px] max-h-[400px] border-4 border-black aspect-[2/1] box-border" width={BASE_WIDTH} height={BASE_HEIGHT} />
	  {/* if game is over the have the leave button */}
	  <div className="mt-4">
		{(isSpectator || gameOver) && (
			<button id="backLobbyBtn" onClick={handleBack} className="px-3 py-1 border">Back to Lobby</button>
		)}
	  </div>
	</div>
  );
}
