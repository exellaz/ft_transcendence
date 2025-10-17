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
}: UseGameWebSocketParams) {
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    // create websocket connection with player id, room id, and side
    //const chooseSide = role?.startsWith("left_player") ? "left" : role?.startsWith("right_player") ? "right" : "spectator";
    const ws = new WebSocket(
      import.meta.env.VITE_WS_URL +
        `/ws-game?id=${clientId}&room=${roomId}&side=${initialRole}&name=${encodeURIComponent(playerName)}&sprite=${encodeURIComponent(playerSprite)}`,
    );
    // socketRef.current = ws;

    // open connection
    ws.addEventListener("open", () => {
      console.log("Game ws connected");
      setSocket(ws);
      console.log("!created socket: ", socket);
    });

    ws.onerror = (e) => {
      console.error("WebSocket error", e);
    };

    // close connection
    ws.addEventListener("close", () => {
      console.log("Game ws disconnected");
    });

    // close socket when component unmount
    return () => ws.close();
  }, [roomId, clientId, initialRole, roomName]); //re-run effect if any of these change

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

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
    //  console.log("Game WebSocket message received:", msg); //// debug

	  if (msg && msg.type === "handshakePing") {
		ws.send(JSON.stringify({ type: "handshakePong", clientId: clientId }));
		return;
	  }

	  if (msg && msg.type === "heartbeat") {
		ws.send(JSON.stringify({ type: "heartbeatAck", clientId: clientId }));
		return;
	  }

	  if (msg.type === "game_over") {
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

    // close socket when component unmount
    return () => ws.close();
  }, [roomId, clientId, initialRole, roomName]); //re-run effect if any of these change

  return {
    gameOver,
  };
}
