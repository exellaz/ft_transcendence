import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { playerInfo } from "../../../backend/src/types/interface";


// game structure
interface UseGameWebSocketParams {
  roomId: number;
  roomName: string;
  clientId: number;
  initialRole: string;
  playerName: string;
  playerSprite: string;
  callback: (socket: WebSocket) => void;
  isOffline?: boolean;
  onError?: (msg: string) => void;
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
  isOffline = false,
  onError,
  callback,
}: UseGameWebSocketParams) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const navigate = useNavigate();
  const socketRef = useRef(false); // to avoid multiple callbacks
  console.log("[game]allinfo:");
  console.log("[game]roomId:", roomId);
  console.log("[game]clientId:", clientId);
  console.log("[game]initialRole:", initialRole);
  console.log("[game]playerName:", playerName);
  console.log("[game]playerSprite:", playerSprite);

  useEffect(() => {
    if (!roomId || roomId <= 0 || !clientId || clientId <= 0 || !playerName) {
      console.warn("[useGameWebSocket] skipping websocket: invalid params", { roomId, clientId, playerName });
      return;
    }
    if (!navigator.onLine && !isOffline) {
        onError?.("offline_error");
        return;
    }

    const ws = new WebSocket(
      import.meta.env.VITE_WS_URL +
        `/ws-game?id=${clientId}&room=${roomId}&side=${initialRole}&name=${encodeURIComponent(playerName)}&sprite=${encodeURIComponent(playerSprite)}`,
    );
    socketRef.current = true;

    function handleOffline() {
        if (!isOffline) {
            try {
                ws.close(1000, "offline");
            } catch (err) {
                console.error("Error closing websocket: ", err);
            }
            onError?.("offline_error");
        }
    }

    if (!isOffline)
        window.addEventListener("offline", handleOffline);

    // open connection
    ws.addEventListener("open", () => {
      console.log("Game ws connected");
      setSocket(ws);
      console.log("!created socket: ", socket);
      try { callback?.(ws); } catch (err) {};
    });

    ws.addEventListener("message", (event) => {
        try {
            const msg = JSON.parse(event.data);
            if (!msg) return;

            if (msg.type === "getPlayerTeam") {
                try { callback?.(ws); } catch (err) {};
            }

            if (msg.type === "tournamentNextRound") {
                const players = msg.players as { id: number }[] | undefined;
                if (Array.isArray(players) && players.some(p => p.id === clientId)) {
                    navigate(`/tournament/${msg.tournamentId}`);
                }
                return;
            }
        } catch (err) {
            console.error("Error handling WebSocket message:", err);
        }
    });

    ws.onerror = (e) => {
      console.error("WebSocket error", e);
      if (!navigator.onLine)
        handleOffline();
    };

    // close connection
    ws.addEventListener("close", () => {
      console.log("Game ws disconnected");
      setSocket(null);
    });

    // close socket when component unmount
    return () => {
        if (!isOffline)
            window.removeEventListener("offline", handleOffline);
        if (socketRef.current) {

            try {
                ws.close();
            } catch (err) {
               console.error("Error closing WebSocket on cleanup:", err);
            }
        }
    };
  }, [roomId, clientId, initialRole, roomName, navigate, isOffline]); //re-run effect if any of these change

  return {
    socket,
  };
}

//socket for game over from room
export function useGameRoomWebSocket({
  roomId,
  roomName,
  clientId,
  initialRole,
  playerName,
  playerSprite,
  isOffline = false,
}: UseGameWebSocketParams) {
  const [gameOver, setGameOver] = useState(false);
  const [isWinner, setIsWinner] = useState(false);
  const [lastTournamentId, setLastTournamentId] = useState<number | null>(null);
  const [tournamentDb, setTournamentDb] = useState<{ id: number; status: string; createdAt: Date } | null>(null);
  const navigate = useNavigate();
  const socketRoomRef = useRef(false); // to avoid multiple callbacks
  console.log("[gameRoom]allinfo:");
  console.log("[gameRoom]roomId:", roomId);
  console.log("[gameRoom]clientId:", clientId);
  console.log("[gameRoom]initialRole:", initialRole);
  console.log("[gameRoom]playerName:", playerName);
  console.log("[gameRoom]playerSprite:", playerSprite);

  useEffect(() => {
    if (!roomId || roomId <= 0 || !clientId || clientId <= 0 || !playerName) {
      console.warn("[useGameRoomWebSocket] skipping websocket: invalid params", { roomId, clientId, playerName });
      return;
    }

    const ws = new WebSocket(
      import.meta.env.VITE_WS_URL +
        `/ws-room?id=${clientId}&room=${roomId}&side=${initialRole}&name=${encodeURIComponent(playerName)}&sprite=${encodeURIComponent(playerSprite)}`,
    );
    socketRoomRef.current = true;

    let isCleanUp = false;

	ws.onopen = () => {
	  console.log("Game Room ws connected");
	};
	ws.onclose = () => {
	  console.log("Game Room ws disconnected");
      isCleanUp = true;
	}

    ws.onmessage = (event) => {
      if (isCleanUp) return;
      const msg = JSON.parse(event.data);
    //  console.log("Game WebSocket message received:", msg); //// debug

	  if (msg && msg.type === "handshakePing") {
        if (ws.readyState === WebSocket.OPEN && (!isOffline || navigator.onLine))
		    ws.send(JSON.stringify({ type: "handshakePong", clientId: clientId }));
		return;
	  }

	  if (msg && msg.type === "heartbeat") {
        if (ws.readyState === WebSocket.OPEN && (!isOffline || navigator.onLine))
		    ws.send(JSON.stringify({ type: "returnHeartbeat", clientId: clientId }));
		return;
	  }

	  if (msg.type === "game_over") {
		console.log("==================================================== Game over message received:", msg); //// debug
        //isCleanUp = true;

        // console.log("=================================================== roomid: ", roomId.toString().startsWith("1111")); ////debug
        const isTournamentRoom = roomId.toString().startsWith("1111");
        setGameOver(!!msg.canLeave);
        if (isTournamentRoom) {
            try {
                const leftId: number[] = Array.isArray(msg.playerLeft) ? msg.playerLeft.map((p: playerInfo) => p.clientId) : [];
                const rightId: number[] = Array.isArray(msg.playerRight) ? msg.playerRight.map((p: playerInfo) => p.clientId) : [];
                const winnerSide = msg.result?.winner;
                const tournamentIdFromMsg = msg.tournamentId ?? null;
				setTournamentDb(msg.tournamentDb || null);
                setLastTournamentId(tournamentIdFromMsg);

                let winnerClientIds: number | null = null;
                if (winnerSide === "left") winnerClientIds = leftId[0] || null;
                else if (winnerSide === "right") winnerClientIds = rightId[0] || null;

                // if this client is the winner
                if (winnerClientIds === clientId) {
                    console.log("you are the winner - waiting for tournament next-round");
                    setIsWinner(true);
                    ws.close(1000, "game over - winner");
                    return;
                }

                // loser: setGameOver and navigate to tournament page
                setIsWinner(false);
                try {
                    ws.close(1000, "game over - loser");
                } catch (err) {}
                isCleanUp = true;
                return;
            } catch (err) {
                console.error("Error handling tournament game over:", err);
            }
        }
        try { ws.close(1000, "game over"); } catch {}
        isCleanUp = true;
        setIsWinner(false);
      }
    };

    // Handle offline detection for this WebSocket
    function handleOffline() {
      if (!isOffline) {
        console.log("Room WebSocket: Player went offline");
      }
    }

    function handleOnline() {
      console.log("Room WebSocket: Player back online");
    }

    if (!isOffline) {
      window.addEventListener("offline", handleOffline);
      window.addEventListener("online", handleOnline);
    }
    // close socket when component unmount
    return () => {
        isCleanUp = true;
        if (!isOffline) {
            window.removeEventListener("offline", handleOffline);
            window.removeEventListener("online", handleOnline);
        }
		if (socketRoomRef.current) {
            try {
                ws.close();
            } catch (err) {
               console.error("Error closing WebSocket on cleanup:", err);
            }
        }
	}
  }, [roomId, clientId, initialRole, roomName, isOffline, navigate]); //re-run effect if any of these change

  return {
    gameOver,
    isWinner,
    lastTournamentId,
	tournamentDb,
  };
}
