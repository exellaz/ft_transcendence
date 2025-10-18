import { useEffect, useState } from "react";
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
}: UseGameWebSocketParams) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
        if (!navigator.onLine && !isOffline) {
            navigate("/main-menu");
        return;
    }

    const ws = new WebSocket(
      import.meta.env.VITE_WS_URL +
        `/ws-game?id=${clientId}&room=${roomId}&side=${initialRole}&name=${encodeURIComponent(playerName)}&sprite=${encodeURIComponent(playerSprite)}`,
    );

    function handleOffline() {
        if (!isOffline) {
            try {
                ws.close(1000, "offline");
            } catch (err) {
                console.error("Error closing websocket: ", err);
            }
            navigate("/main-menu");
        }
    }

    if (!isOffline)
        window.addEventListener("offline", handleOffline);

    // open connection
    ws.addEventListener("open", () => {
      console.log("Game ws connected");
      setSocket(ws);
      console.log("!created socket: ", socket);
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
        try {
            ws.close();
        } catch (err) {
            console.error("Error closing WebSocket on cleanup:", err);
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
  const navigate = useNavigate();
  console.log("allinfo:");
  console.log("roomId:", roomId);
  console.log("clientId:", clientId);
  console.log("initialRole:", initialRole);
  console.log("playerName:", playerName);
  console.log("playerSprite:", playerSprite);

  useEffect(() => {
    const ws = new WebSocket(
      import.meta.env.VITE_WS_URL +
        `/ws-room?id=${clientId}&room=${roomId}&side=${initialRole}&name=${encodeURIComponent(playerName)}&sprite=${encodeURIComponent(playerSprite)}`,
    );

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
        isCleanUp = true;
		//close the websocket after game over
		try { ws.close(1000, "game over"); } catch {}
        //console.log("=================================================== roomid: ", roomId.toString().startsWith("1111")); ////debug
        if (roomId.toString().startsWith("1111") === true)
        {
            const leftPlayerId = msg.playerLeft.map((p: playerInfo) => p.clientId);
            const rightPlayerId = msg.playerRight.map((p: playerInfo) => p.clientId);
            const winner = msg.result.winner;

            //console.log("Tournament game over"); ////debug
            //console.log("Winner is: ", winner); ////debug
            if (winner === "left")
            {
                //console.log("game_over => msg.playerLeft.clientId: ", leftPlayerId); ////debug
                //console.log("game_over => clientId: ", clientId); ////debug
                if (leftPlayerId[0] === clientId)
                {
                    setGameOver(msg.canLeave);
                    navigate("/roomList");
                }
            }
            else if (winner === "right")
            {
                //console.log("game_over => msg.playerRight.clientId: ", rightPlayerId); ////debug
                //console.log("game_over => clientId: ", clientId); ////debug
                if (rightPlayerId[0] === clientId)
                {
                    setGameOver(msg.canLeave);
                    navigate("/roomList");
                }
            }
        }
        setGameOver(msg.canLeave);
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
		try { ws.close(); } catch {}
	}
  }, [roomId, clientId, initialRole, roomName, isOffline, navigate]); //re-run effect if any of these change

  return {
    gameOver,
  };
}
