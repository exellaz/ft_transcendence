import { useEffect, useRef, useState } from "react";
import type { playerInfo } from "../../../backend/src/modules/room/room";
import { data } from "react-router-dom";

// game structure
interface UseGameWebSocketParams {
  roomId: number;
  roomName: string;
  clientId: number;
  initialRole: string;
  playerName: string;
  playerSprite: string;
  callback: (socket: WebSocket) => void;
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
    playerSprite,
	callback
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
	// const socketRef = useRef<WebSocket | null>(null);
	const [socket, setSocket] = useState<WebSocket | null>(null);
    const [setting, setSetting] = useState<any>({
        ballSize: 0,
    });

	useEffect(() => {
		// create websocket connection with player id, room id, and side
		//const chooseSide = role?.startsWith("left_player") ? "left" : role?.startsWith("right_player") ? "right" : "spectator";
		const ws = new WebSocket(import.meta.env.VITE_WS_URL + `/ws-game?id=${clientId}&room=${roomId}&side=${initialRole}&name=${encodeURIComponent(playerName)}&sprite=${encodeURIComponent(playerSprite)}`);
		// socketRef.current = ws;

		// open connection
		ws.addEventListener("open", () => {
			console.log("Game ws connected");
			setSocket(ws);
			console.log("!created socket: ", socket);
		});

		ws.onerror = (e) => {
		  console.error("WebSocket error", e);
		}

		// close connection
		ws.addEventListener("close", () => { console.log("Game ws disconnected"); });

		// close socket when component unmount
		return () => ws.close();
	}, [roomId, clientId, initialRole, roomName]); //re-run effect if any of these change

	return {
		socket,
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

export function useGameRoomWebSocket({
    roomId,
    roomName,
    clientId,
    initialRole,
    playerName,
    playerSprite,
}: UseGameWebSocketParams) {
	const [gameOver, setGameOver] = useState(false);


	useEffect(() => {
		const ws = new WebSocket(import.meta.env.VITE_WS_URL + `/ws-room?id=${clientId}&room=${roomId}&side=${initialRole}&name=${encodeURIComponent(playerName)}&sprite=${encodeURIComponent(playerSprite)}`);

		ws.onmessage = (event) => {
			const msg = JSON.parse(event.data);
			console.log("Game WebSocket message received:", msg); //// debug
			if (msg.type === "game_over") {
				setGameOver(msg.canLeave);
			}
		};

		// close socket when component unmount
		return () => ws.close();
	}, [roomId, clientId, initialRole, roomName]); //re-run effect if any of these change

	return {
		gameOver,
	};
}
