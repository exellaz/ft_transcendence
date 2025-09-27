import { useEffect, useRef, useState } from "react";
import { ensureClientId, determineSide } from "./requestBackend.api";

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
		const playerInfo = JSON.parse(sessionStorage.getItem("playerInfo") || "{}");

		async function connect() {
			// set room settings
			//await roomSetting(roomId, BALLSPEED, PADDLEHEIGHT, PADDLEWIDTH, BALLSIZE);

			// pick role (leader gets left_player1)
			let roleLocal = clientId === leaderId ? "left_player1" : "spectator";
			setRole(roleLocal);
			setIsLeader(clientId === leaderId);

			// create websocket connection with player id, room id, side and player name
			const chooseSide = await determineSide(roomId);
			console.log("ws side:", chooseSide);
			console.log("ws player name:", playerInfo.name);
			console.log("ws player sprite:", playerInfo.sprite);
			const ws = new WebSocket(import.meta.env.VITE_WS_URL + `/ws-room?id=${clientId}&room=${roomId}&side=${chooseSide}&name=${encodeURIComponent(playerInfo.name)}&sprite=${encodeURIComponent(playerInfo.sprite)}`);
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
						console.error("Invalid JSON:", ev.data);
						return;
					}

					// validate message structure
					if (typeof data !== "object" || data === null) {
						console.error("Invalid message format");
						return;
					}
					if (typeof data.type !== "string") {
						console.error("Invalid message: missing type:", data);
						return;
					}
					const allowedTypes = ["roleUpdate", "state"];
					if (!allowedTypes.includes(data.type)) {
						if (data.type === "chat") return;
						console.error(`unsupported message type ${data.type}`);
						return;
					}

					// handle different message types
					if (data.type === "roleUpdate") {
						// validate the game state
						if (typeof data.gameState !== "object" || data.gameState === null) {
							console.error("Invalid roleUpdate: missing gameState");
							return;
						}
						// update role base in clientId
						const leftPlayer = data.gameState.teams.left.find((p:any)=>p.clientId === clientId);
						const rightPlayer = data.gameState.teams.right.find((p:any)=>p.clientId === clientId);
						const newRole = leftPlayer?.role || rightPlayer?.role || "spectator";
						setRole(newRole);
						setPlayerText(`You are: ${playerInfo.name} [${clientId}] (${newRole})`);
						// update team lists on left
						setLeftTeamHtml(
							data.gameState.teams.left.map((p:any)=> ({
								leader: p.clientId === data.leaderId,
								username: p.playerName,
								uid: p.clientId,
								role: p.role,
								spriteUrl: p.spriteUrl,
								ready: p.ready,
								team: p.role.startsWith("left") ? "left" : "right"
							}))
						);
						// update team lists on right
						setRightTeamHtml(
							data.gameState.teams.right.map((p:any)=> ({
								leader: p.clientId === data.leaderId,
								username: p.playerName,
								uid: p.clientId,
								role: p.role,
								spriteUrl: p.spriteUrl,
								ready: p.ready,
								team: p.role.startsWith("left") ? "left" : "right"
							}))
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
							console.error("Invalid state: missing gameState");
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
					ws.close(1000, "server error");
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

	function onSwitch() {
		if (!socketRef.current) return;
        if (ready && !isLeader) return;
		const newSide = role.startsWith("left") ? "right" : "left";
		socketRef.current.send(JSON.stringify({ type: "switchSide", side: newSide }));
	}

	function onReady() {
	  if (!socketRef.current || isLeader) return;
	  const newReady = !ready;
	  setReady(newReady);
	  socketRef.current.send(JSON.stringify({ type: "ready", ready: newReady }));
	}
	function onStartBtn() {
	  if (!isLeader || !socketRef.current) return;
	  socketRef.current.send(JSON.stringify({ type: "start", start: true }));
	}
	function onLeave() {
	  try { socketRef.current?.close(); } catch {}
	  sessionStorage.removeItem("pongRoomName");
	  sessionStorage.removeItem("pongRoomId");
	  sessionStorage.removeItem("pongRoomLeaderId");
	}

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
		onSwitch,
		onReady,
		onStartBtn,
		onLeave,
	};
}
