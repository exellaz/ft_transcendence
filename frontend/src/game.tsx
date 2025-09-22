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
			const scale = Math.min(window.innerWidth / 800, window.innerHeight / 400, 1);
			const scaledWidth = 800 * scale;
			const scaledHeight = 400 * scale;
			ws.send(JSON.stringify({ type: "setWidth", width: scaledWidth }));
			ws.send(JSON.stringify({ type: "setHeight", height: scaledHeight }));
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

	ctx.clearRect(0,0,canvas.width, canvas.height);

	//if game over, show winner
	if (playerResult) {
		ctx.font = "48px Arial";
		ctx.fillStyle = "green";
		ctx.textAlign = "center";
		ctx.fillText(playerResult === "win" ? "You Win!" : "You Lose!", canvas.width/2, canvas.height/2);
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
		ctx.fillText(`Game starts in ${remaining}...`, canvas.width/2, canvas.height/2);
		return;
	}

	// if not all players entered, show waiting message
	if (!allPlayersConnected && !state.gameStarted) {
		ctx.font = "32px Arial";
		ctx.fillStyle = "gray";
		ctx.textAlign = "center";
		ctx.fillText("Waiting for all players to connect...", canvas.width/2, canvas.height/2);
		return;
	}

	const scaleX = canvas.width / 800;
	const scaleY = canvas.height / 400;

	//spectator view
	if (isSpectator) {
		ctx.beginPath();
		ctx.arc(state.ball.x * scaleX, state.ball.y * scaleY, ballSize * scaleX, 0, Math.PI * 2);
		ctx.fillStyle = "black";
		ctx.fill();

		for (const clientId in state.paddles) {
			const y = state.paddles[clientId];
			let x: number;
			if (state.teams.left.some((p:any)=>p.clientId === clientId)) {
				x = 1 * scaleX;
			} else if (state.teams.right.some((p:any)=>p.clientId === clientId)) {
				x = canvas.width - paddleWidth * scaleX - 1;
			} else continue;
			ctx.fillStyle = "black";
			ctx.fillRect(x, y*scaleY, paddleWidth * scaleX, paddleHeight * scaleY);
		}
		return;
	}

	// Draw ball
	ctx.beginPath();
	ctx.arc(state.ball.x * scaleX, state.ball.y * scaleY, ballSize * scaleX, 0, Math.PI * 2);
	ctx.fillStyle = "black";
	ctx.fill();

	// Draw paddles
	for (const clientId in state.paddles) {
		const y = state.paddles[clientId];
		let x: number;
		if (state.teams.left.some((p:any)=>p.clientId === clientId)) {
			x = 1 * scaleX;
		} else if (state.teams.right.some((p:any)=>p.clientId === clientId)) {
			x = canvas.width - paddleWidth * scaleX - 1;
		} else continue;
		ctx.fillStyle = "black";
		ctx.fillRect(x, y*scaleY, paddleWidth * scaleX, paddleHeight * scaleY);
	}
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

	//--- create game board ---
	useEffect(()=>{
		const canvas = canvasRef.current!;
		function createUI() {
			canvas.width = Math.min(window.innerWidth / (BASE_WIDTH/BASE_WIDTH), 1) * BASE_WIDTH;
			canvas.height = Math.min(window.innerHeight / (BASE_HEIGHT/BASE_HEIGHT), 1) * BASE_HEIGHT;
			canvas.style.border = "5px solid black";
		}
		createUI();
	}, []);

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
	  <canvas id="game" ref={canvasRef} className="mx-auto block" width={BASE_WIDTH} height={BASE_HEIGHT} />
	  {/* if game is over the have the leave button */}
	  <div className="mt-4">
		{(isSpectator || gameOver) && (
			<button id="backLobbyBtn" onClick={handleBack} className="px-3 py-1 border">Back to Lobby</button>
		)}
	  </div>
	</div>
  );
}
