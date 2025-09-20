import { useEffect, useRef, useState } from "react";
import { ensureClientId, roomSetting, determineSide } from "./utils";
import { BALLSPEED, PADDLEHEIGHT, PADDLEWIDTH, BALLSIZE } from "./constants";
import Game from "./game";
import Chat from "./chat";
import { useBlockLeave } from "./useBlockLeave.tsx";

export interface UseRoomWebSocketParams {
  roomId: string;
  roomName: string;
  leaderId: string;
}

export function useRoomWebSocket({ roomId, roomName, leaderId }: UseRoomWebSocketParams) {
  const [statusText, setStatusText] = useState("Connecting to room...");
  const [playerText, setPlayerText] = useState("Waiting for players...");
  const [leftTeamHtml, setLeftTeamHtml] = useState("waiting left team...");
  const [rightTeamHtml, setRightTeamHtml] = useState("waiting right team...");
  const [isLeader, setIsLeader] = useState(false);
  const [role, setRole] = useState<string>("spectator");
  const [ready, setReady] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [canStart, setCanStart] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { ensureClientId(); }, []);

  useEffect(() => {
    let active = true;
    const clientId = sessionStorage.getItem("pongClientId") || ensureClientId();

    async function connect() {
      await roomSetting(roomId, BALLSPEED, PADDLEHEIGHT, PADDLEWIDTH, BALLSIZE);

      // pick role (leader gets left_player1)
      let roleLocal = clientId === leaderId ? "left_player1" : "spectator";
      setRole(roleLocal);
      setIsLeader(clientId === leaderId);

      const chooseSide = await determineSide(roomId);
      const ws = new WebSocket(import.meta.env.VITE_WS_URL + `/ws-room?id=${clientId}&room=${roomId}&side=${chooseSide}`);
      setSocket(ws);

      ws.onopen = () => {
        console.log("Connected to room lobby");
        setStatusText(`Room ${roomName} [id: ${roomId}]`);
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current);
          reconnectTimer.current = null;
        }
      };

      ws.onmessage = (ev) => {
        const data = JSON.parse(ev.data);

        if (data.type === "roleUpdate") {
          const leftPlayer = data.gameState.teams.left.find((p:any)=>p.clientId === clientId);
          const rightPlayer = data.gameState.teams.right.find((p:any)=>p.clientId === clientId);
          const newRole = leftPlayer?.role || rightPlayer?.role || "spectator";
          setRole(newRole);
          setPlayerText(`You are: [${clientId}] (${newRole})`);

          setLeftTeamHtml(
            data.gameState.teams.left.map((p:any)=> {
              const mark = p.clientId === data.leaderId ? "✦" : "";
              return `${mark}${p.clientId} (${p.role})`;
            }).join("\n")
          );
          setRightTeamHtml(
            data.gameState.teams.right.map((p:any)=> {
              const mark = p.clientId === data.leaderId ? "✦" : "";
              return `${mark}${p.clientId} (${p.role})`;
            }).join("\n")
          );

          if (data.leaderId) {
            setIsLeader(clientId === data.leaderId);
          }
          setCanStart(data.canStart ?? false);
        }

        if (data.type === "state") {
          setCanStart(data.canStart ?? false);
          if (!gameStarted && (data.gameState.countdown > 0 || data.gameState.gameStarted)) {
            setGameStarted(true);
          }
        }
      };

      ws.onclose = () => {
        console.log("Lobby socket closed. Reconnecting...");
        if (active && !reconnectTimer.current) {
          reconnectTimer.current = setTimeout(() => {
            connect();
          }, 10000);
        }
      };

      ws.onerror = (e) => {
        console.error("Lobby socket error", e);
        ws.close();
      };

      return () => {
        try { ws.close(); } catch {}
      };
    }

    connect();

    return () => {
      active = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [roomId, roomName, leaderId]);

  return {
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
  };
}

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
    useBlockLeave();
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
		if (ready || !socket) return;
		const newSide = role.startsWith("left") ? "right" : "left";
		socket.send(JSON.stringify({ type: "switchSide", side: newSide }));
	}

	function onReady() {
		if (isLeader || !socket) return;
		const newReady = !ready;
		setReady(newReady);
		socket.send(JSON.stringify({ type: "ready", ready: newReady }));
	}

	function onStartBtn() {
		if (!isLeader || !socket) { alert("Only the leader can start the game!"); return; }
		socket.send(JSON.stringify({ type: "start", start: true }));
	}

	function onLeave() {
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
				{role !== "spectator" && (
					<>
						<button
							onClick={onSwitch}
							className={`px-2 py-1 border rounded ${ready ? "text-gray-400 border-gray-300 cursor-not-allowed" : "text-black border-black"}`}
							disabled={ready}
						>
							Switch Side
						</button>

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

				{isLeader && (
					<button
						onClick={onStartBtn}
						className={`px-2 py-1 border rounded ${!canStart ? "text-gray-400 border-gray-300 cursor-not-allowed" : "text-black border-black"}`}
						disabled={!canStart}
					>
						Start Game
					</button>
				)}

				<button
					onClick={onLeave}
					className="px-2 py-1 border"
				>
					Leave Room
				</button>
			</div>

			<Chat roomId={roomId} />
		</div>
	);
}
