import { useEffect, useRef, useState } from "react";
import { ensureClientId, roomSetting, determineSide } from "./utils";
import { BALLSPEED, PADDLEHEIGHT, PADDLEWIDTH, BALLSIZE } from "./constants";
import Game from "./game";
import Chat from "./chat";
import { useBlockLeave } from "./useBlockLeave.tsx";

// room structure
export interface UseRoomWebSocketParams {
	roomId: string;
	roomName: string;
	leaderId: string;
}

/**
 * @brief Custom hook to manage WebSocket connection and room state.
 * @param roomId The ID of the room to connect to.
 * @param roomName The name of the room.
 * @param leaderId The client ID of the room leader.
*/
export function useRoomWebSocket({ roomId, roomName, leaderId }: UseRoomWebSocketParams) {
	const [statusText, setStatusText] = useState("Connecting to room..."); // e.g., "Room MyRoom [id: 1234]"
	const [playerText, setPlayerText] = useState("Waiting for players..."); // e.g., "You are: Player1 [id: abc123] (left_player1)"
	const [leftTeamHtml, setLeftTeamHtml] = useState("waiting left team..."); // HTML content for left team
	const [rightTeamHtml, setRightTeamHtml] = useState("waiting right team..."); // HTML content for right team
	const [isLeader, setIsLeader] = useState(false); // Whether the current client is the leader
	const [role, setRole] = useState<string>("spectator"); // e.g., "left_player1", "right_player2", "spectator"
	const [ready, setReady] = useState(false); // Whether the player is ready
	const [gameStarted, setGameStarted] = useState(false); // Whether the game has started
	const [canStart, setCanStart] = useState(false); // Whether the game can be started (all players ready)
	const socketRef = useRef<WebSocket | null>(null);

	// Ensure client ID is set
	useEffect(() => { ensureClientId(); }, []);

	useEffect(() => {
		// get clientId and playerName from sessionStorage
		const clientId = sessionStorage.getItem("pongClientId") || ensureClientId();
		const playerName = sessionStorage.getItem("pongPlayerName") || "Guest";

		async function connect() {
			// set room settings
			await roomSetting(roomId, BALLSPEED, PADDLEHEIGHT, PADDLEWIDTH, BALLSIZE);

			// pick role (leader gets left_player1)
			let roleLocal = clientId === leaderId ? "left_player1" : "spectator";
			setRole(roleLocal);
			setIsLeader(clientId === leaderId);

			// create websocket connection with player id, room id, side and player name
			const chooseSide = await determineSide(roomId);
			const ws = new WebSocket(import.meta.env.VITE_WS_URL + `/ws-room?id=${clientId}&room=${roomId}&side=${chooseSide}&name=${encodeURIComponent(playerName)}`);
			socketRef.current = ws;

			// open connection
			ws.onopen = () => {
				console.log("Room ws connected");
				setStatusText(`Room ${roomName} [id: ${roomId}]`);
			};

			// handle incoming message / event from server
			ws.onmessage = (ev) => {
				try {
					// validate JSON
					let data;
					try {
						data = JSON.parse(ev.data);
					} catch {
						ws.close(1003, "Invalid JSON");
						return;
					}

					// validate message structure
					if (typeof data !== "object" || data === null) {
						ws.close(1003, "Invalid message format");
						return;
					}
					if (typeof data.type !== "string") {
						ws.close(1003, "Invalid message: missing type");
						return;
					}
					const allowedTypes = ["roleUpdate", "state"];
					if (!allowedTypes.includes(data.type)) {
						ws.close(1003, `unsupported message type ${data.type}`);
						return;
					}

					// handle different message types
					if (data.type === "roleUpdate") {
						// validate the game state
						if (typeof data.gameState !== "object" || data.gameState === null) {
							ws.close(1003, "Invalid roleUpdate: missing gameState");
							return;
						}
						// update role base in clientId
						const leftPlayer = data.gameState.teams.left.find((p:any)=>p.clientId === clientId);
						const rightPlayer = data.gameState.teams.right.find((p:any)=>p.clientId === clientId);
						const newRole = leftPlayer?.role || rightPlayer?.role || "spectator";
						setRole(newRole);
						setPlayerText(`You are: ${playerName} [${clientId}] (${newRole})`);
						// update team lists on left
						setLeftTeamHtml(
							data.gameState.teams.left.map((p:any)=> {
								const mark = p.clientId === data.leaderId ? "✦" : "";
								return `${mark}${p.playerName} [${p.clientId}] (${p.role})`;
							}).join("\n")
						);
						// update team lists on right
						setRightTeamHtml(
							data.gameState.teams.right.map((p:any)=> {
								const mark = p.clientId === data.leaderId ? "✦" : "";
								return `${mark}${p.playerName} [${p.clientId}] (${p.role})`;
							}).join("\n")
						);
						// update player leader
						if (data.leaderId) {
							setIsLeader(clientId === data.leaderId);
						}
						// update can start status
						setCanStart(data.canStart ?? false);
					}
					if (data.type === "state") {
						// validate the game state
						if (typeof data.gameState !== "object" || data.gameState === null) {
							ws.close(1003, "Invalid state: missing gameState");
							return;
						}
						// update can start status
						setCanStart(data.canStart ?? false);
						//if game able to start then set game started to true
						if (!gameStarted && (data.gameState.countdown > 0 || data.gameState.gameStarted)) {
							setGameStarted(true);
						}
					}
				} catch (err) {
					console.error("Invalid room message:", err);
					ws.close(1011, "server error");
				}
			};

			// close connection
			ws.onclose = () => { console.log("Room ws disconnected"); };

			ws.onerror = (e) => {
				console.error("Room ws error", e);
				ws.close();
			};

			// clean up on unmount
			return () => {
				try { ws.close(); } catch {}
			};
		}

		connect();
	}, [roomId, roomName, leaderId]);

	return {
		socket: socketRef.current,
		statusText,
		playerText,
		leftTeamHtml,
		rightTeamHtml,
		isLeader,
		role,
		ready,
		setReady,
		gameStarted,
		canStart,
	};
}


/************************************** Room Component **************************************/
/**
 * @brief Main Room component
 * @param roomId ID of the room
 * @param roomName Name of the room
 * @param leaderId ID of the room leader
 * @param onBack Callback function to handle back to lobby
*/
export default function Room({
		roomId,
		roomName,
		leaderId,
		onBack
}: {
		roomId: string;
		roomName: string;
		leaderId: string;
		onBack: () => void;
}) {
		//prevent accidental refresh or leave
		useBlockLeave();
		// use custom hook to manage room websocket and state
		const {
				socket,
				statusText,
				playerText,
				leftTeamHtml,
				rightTeamHtml,
				isLeader,
				role,
				ready,
				setReady,
				gameStarted,
				canStart,
		} = useRoomWebSocket({ roomId, roomName, leaderId });

	// Buttons
	function onSwitch() {
		//if already ready or no socket, do nothing
		if (ready || !socket) return;
		//switch side
		const newSide = role.startsWith("left") ? "right" : "left";
		//send switch side command to server
		socket.send(JSON.stringify({ type: "switchSide", side: newSide }));
	}

	function onReady() {
		//if is leader or no socket, do nothing
		if (isLeader || !socket) return;
		//toggle ready status
		const newReady = !ready;
		setReady(newReady);
		//send ready command to server
		socket.send(JSON.stringify({ type: "ready", ready: newReady }));
	}

	function onStartBtn() {
		//if not leader or no socket, do nothing
		if (!isLeader || !socket) { alert("Only the leader can start the game!"); return; }
		//send start command
		socket.send(JSON.stringify({ type: "start", start: true }));
	}

	function onLeave() {
		//close socket and go back to lobby
		try { socket?.close(); } catch {}
		sessionStorage.removeItem("pongRoomName");
		sessionStorage.removeItem("pongRoomId");
		onBack();
	}

	// if game started, render Game component
	if (gameStarted) {
		return <Game
			roomId={roomId}
			roomName={roomName}
			clientId={sessionStorage.getItem("pongClientId")||ensureClientId()}
			initialRole={role}
			playerName={sessionStorage.getItem("pongPlayerName") || "Guest"}
			onBack={onBack}
		/>;
	}

	return (
		<div className="p-6">
			<h2 id="lobbyStatus" className="text-2xl">{statusText}</h2>
			<h3 id="playerStatus">{playerText}</h3>

			<div id="teamsContainer" className="flex justify-between my-4">
				<div id="leftTeam" className="w-1/2 p-2 border rounded"><strong>Left Team</strong><pre>{leftTeamHtml}</pre></div>
				<div id="rightTeam" className="w-1/2 p-2 border rounded ml-4"><strong>Right Team</strong><pre>{rightTeamHtml}</pre></div>
			</div>

			<div className="space-x-2">
				{/* if is player */}
				{role !== "spectator" && (
					<>
						{/* Switch Side Button */}
						<button
							onClick={onSwitch}
							className={`px-2 py-1 border rounded ${ready ? "text-gray-400 border-gray-300 cursor-not-allowed" : "text-black border-black"}`}
							disabled={ready}
						>
							Switch Side
						</button>

						{/* Ready/Unready Button */}
						{!isLeader && (
							<button
								onClick={onReady}
								className="px-2 py-1 border"
							>
								{ready ? "Unready" : "Ready"}
							</button>
						)}
					</>
				)}

				{/* Start Game Button only for leader*/}
				{isLeader && (
					<button
						onClick={onStartBtn}
						className={`px-2 py-1 border rounded ${!canStart ? "text-gray-400 border-gray-300 cursor-not-allowed" : "text-black border-black"}`}
						disabled={!canStart}
					>
						Start Game
					</button>
				)}

				{/* Leave Room Button */}
				<button
					onClick={onLeave}
					className="px-2 py-1 border"
				>
					Leave Room
				</button>
			</div>

			{/* Chat Component */}
			<Chat roomId={roomId} />
		</div>
	);
}
