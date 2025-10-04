import { useEffect, useRef, useState } from "react";
import { determineSide } from "./requestBackend.api";
import type { playerInfo } from "../../../backend/src/modules/room/room"

// room structure
export interface UseRoomWebSocketParams {
	roomId: number;
	roomName: string;
	leaderId: number;
    player: {
        id: number;
        name: string;
        avatar: string;
    }
}

/**
 * @brief Custom hook to manage WebSocket connection and room state.
 * @param roomId The ID of the room to connect to.
 * @param roomName The name of the room.
 * @param leaderId The client ID of the room leader.
*/
export function useRoomWebSocket({ roomId, roomName, leaderId, player }: UseRoomWebSocketParams) {
	const [statusText, setStatusText] = useState("Connecting to room..."); // e.g., "Room MyRoom [id: 1234]"
	const [playerText, setPlayerText] = useState("Waiting for players..."); // e.g., "You are: Player1 [id: abc123] (left_player1)"
	const [leftTeamHtml, setLeftTeamHtml] = useState("waiting left team..."); // HTML content for left team
	const [rightTeamHtml, setRightTeamHtml] = useState("waiting right team..."); // HTML content for right team
	const [isLeader, setIsLeader] = useState(false); // Whether the current client is the leader
	const [role, setRole] = useState<string>("spectator"); // e.g., "left_player1", "right_player2", "spectator"
	const [ready, setReady] = useState(false); // Whether the player is ready
	const [gameStarted, setGameStarted] = useState(false); // Whether the game has started
	const [canStart, setCanStart] = useState(false); // Whether the game can be started (all players ready)
	const [countdown, setCountdown] = useState<number | null>(null);
	const [roomInfo, setRoomInfo] = useState<{ type: string } | null>(null);
	const socketRef = useRef<WebSocket | null>(null);

	useEffect(() => {
        //TODO replace with JWT

		async function connect() {
			// set room settings
			//await roomSetting(roomId, BALLSPEED, PADDLEHEIGHT, PADDLEWIDTH, BALLSIZE);

			// pick role (leader gets left_player1)
			let roleLocal = player.id === leaderId ? "left_player1" : "spectator";
			setRole(roleLocal);
			setIsLeader(player.id === leaderId);

			// create websocket connection with player id, room id, side and player name
			const chooseSide = await determineSide(roomId);
			console.log("ws side:", chooseSide);
			console.log("ws player name:", player.name);
			console.log("ws player sprite:", player.avatar);
			const ws = new WebSocket(import.meta.env.VITE_WS_URL + `/ws-room?id=${player.id}&room=${roomId}&side=${chooseSide}&name=${encodeURIComponent(player.name)}&sprite=${encodeURIComponent(player.avatar)}`);
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
					const allowedTypes = ["roleUpdate", "state", "countdown", "countdownCancel", "roomPrivacyUpdate"];
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
                        //console.log("Left Team info:", data.gameState.teams.left);
                        //console.log("Right Team info:", data.gameState.teams.right);
						const leftPlayer = data.gameState.teams.left.find((p: playerInfo)=> {
                            console.log("Left Player info:", p.clientId, typeof p.clientId, player.id, typeof player.id);
                            return p.clientId === player.id;
                        });
                        console.log("Left Player found:", leftPlayer);
						const rightPlayer = data.gameState.teams.right.find((p: playerInfo)=> {
                            console.log("Right Player info:", p.clientId, typeof p.clientId, player.id, typeof player.id);
                            return p.clientId === player.id;
                        });
                        const newRole = leftPlayer?.role || rightPlayer?.role || "spectator";
						setRole(newRole);
						setPlayerText(`You are: ${player.name} [${player.id}] (${newRole})`);
						// update team lists on left
						setLeftTeamHtml(
							data.gameState.teams.left.map((p: playerInfo)=> ({
								id: p.clientId,
								username: p.playerName,
								role: p.role,
								team: p.role.startsWith("left") ? "left" : "right",
								leader: p.clientId === data.leaderId,
								spriteUrl: p.spriteUrl,
								ready: p.ready,
							}))
						);
						// update team lists on right
						setRightTeamHtml(
							data.gameState.teams.right.map((p: playerInfo)=> ({
								id: p.clientId,
								username: p.playerName,
								role: p.role,
								team: p.role.startsWith("left") ? "left" : "right",
								leader: p.clientId === data.leaderId,
								spriteUrl: p.spriteUrl,
								ready: p.ready,
							}))
						);
						// update player leader
						if (data.leaderId) {
                            console.log("Updating leader status:", typeof player.id, typeof data.leaderId);
							setIsLeader(player.id === data.leaderId);
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
						if (!gameStarted && ( data.gameState.gameStarted)) {
							setGameStarted(true);
						}
					}
					if (data.type === "countdown") {
						if (typeof data.remaining === "number") {
							//get the remaining time from server and set to countdown state
							setCountdown(data.remaining);
						}
					}
					if (data.type === "countdownCancel") {
						//cancel the countdown
						setCountdown(null);
					}
					if (data.type === "roomPrivacyUpdate") {
						setRoomInfo(prev => prev ? { ...prev, ...data.data } : data.data);
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
                if (ws) ws.close();
			};
		}
        connect();
	}, [roomId, roomName, leaderId, player.id, player.name, player.avatar]);

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
	  sessionStorage.removeItem("RoomName");
	  sessionStorage.removeItem("RoomId");
	  sessionStorage.removeItem("RoomLeaderId");
      sessionStorage.removeItem("RoomType");
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
		canStart,
		countdown,
		onSwitch,
		onReady,
		onStartBtn,
		onLeave,
	};
}
