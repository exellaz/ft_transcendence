import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { playerInfo } from "../../../backend/src/types/interface";
import { GameClient } from "../views/Gameclient";

// game structure
interface UseGameWebSocketParams {
  roomId: number;
  roomName: string;
  clientId: number;
  initialRole: string;
  playerSprite?: string;
  callback: (socket: WebSocket) => void;
  isOffline?: boolean;
  onError?: (msg: string) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>; //add canvas ref
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
  initialRole,
  clientId,
  playerSprite,
  isOffline = false,
  onError,
  callback,
  canvasRef,
}: UseGameWebSocketParams) {
  const [gameOver, setGameOver] = useState(false);
  const [isWinner, setIsWinner] = useState(false);
  const [loserRank, setLoserRank] = useState<number | null>(null);
  const [winnerRank, setWinnerRank] = useState<number | null>(null);
  const [lastTournamentId, setLastTournamentId] = useState<number | null>(null);
  const [tournamentDb, setTournamentDb] = useState<{
    id: number;
    status: string;
    createdAt: Date;
  } | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const navigate = useNavigate();
  const socketRef = useRef(false); // to avoid multiple callbacks
  const gameClientRef = useRef<GameClient | null>(null);
  //  console.log("[game]allinfo:"); ////debug
  //  console.log("[game]roomId:", roomId); ////debug
  //  console.log("[game]initialRole:", initialRole); ////debug

  useEffect(() => {
    if (!roomId || roomId <= 0 || !clientId || clientId <= 0) {
      console.warn("[useGameWebSocket] skipping websocket: invalid params", {
        roomId,
      });
      return;
    }

    if (!navigator.onLine && !isOffline) {
      onError?.("offline_error");
      return;
    }

    //get JWT
    const userJWT = localStorage.getItem("authToken");
    if (!userJWT) {
      console.warn("No JWT found, cannot connect to game WebSocket");
      return;
    }
    //console.log("Game ws connecting with JWT:", userJWT); ////debug

    const ws = new WebSocket(
      `/ws-game?room=${roomId}&side=${initialRole}&sprite=${encodeURIComponent(playerSprite ?? "")}`,
      [userJWT],
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

    if (!isOffline) window.addEventListener("offline", handleOffline);

    ws.addEventListener("open", () => {
      //  console.log("Game ws connected");
      setSocket(ws);

      //initialize GameClient
      if (canvasRef.current) {
        //console.log("[game-websocket] Creating GameClient");
        try {
          gameClientRef.current = new GameClient(canvasRef.current, ws);
          //  console.log("[game-websocket] GameClient created successfully");
        } catch (err) {
          console.error("Error creating GameClient:", err);
        }
      } else {
        console.error("Canvas ref is not available, cannot create GameClient");
      }
      try {
        callback?.(ws);
      } catch (err) {
        console.error("Error in callback after ws open:", err);
      }
    });

    ws.addEventListener("error", (e) => {
      console.error("Game ws error", e);
      if (!navigator.onLine) handleOffline();
    });

    ws.addEventListener("close", (ev) => {
      //  console.log(`Game ws disconnected: code=${ev.code}, reason=${ev.reason}`);

      // destroy GameClient when socket closes
      if (gameClientRef.current) {
        //console.log("[game-websocket] Destroying GameClient");
        gameClientRef.current.destroy();
        gameClientRef.current = null;
      }

      setSocket(null);
    });

    ws.addEventListener("message", (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (!msg) return;

        if (msg.type === "getPlayerTeam") {
          try {
            callback?.(ws);
          } catch (err) {
            console.error("Error in callback for getPlayerTeam:", err);
          }
        }

        if (msg.type === "ready_ack") {
          //  console.log(
          //    "ready acknowledged by server for clientId=",
          //    msg.payload.clientId,
          //  ); ////debug
          return;
        }

        //if (msg && msg.type === "handshakePing") {
        //    console.log("[game ws] handshakePing received");
        //    ws.send(JSON.stringify({ type: "handshakePong" }));
        //    return;
        //}

        if (msg.type === "tournamentNextRound") {
          const players = msg.players as { id: number }[] | undefined;
          if (
            Array.isArray(players) &&
            players.some((p) => p.id === clientId)
          ) {
            navigate(`/tournament/${msg.tournamentId}`);
          }
          return;
        }

        if (msg.type === "game_over") {
          //  console.log(
          //    "==================================================== Game over message received:",
          //    msg,
          //  ); //// debug

          // console.log("=================================================== roomid: ", roomId.toString().startsWith("1111")); ////debug
          const isTournamentRoom = roomId.toString().startsWith("1111");
          setGameOver(!!msg.canLeave);
          if (isTournamentRoom) {
            try {
              const leftId: number[] = Array.isArray(msg.playerLeft)
                ? msg.playerLeft.map((p: playerInfo) => p.clientId)
                : [];
              const rightId: number[] = Array.isArray(msg.playerRight)
                ? msg.playerRight.map((p: playerInfo) => p.clientId)
                : [];
              const winnerSide = msg.result?.winner;
              const tournamentIdFromMsg = msg.tournamentId ?? null;
              setTournamentDb(msg.tournamentDb || null);
              setLastTournamentId(tournamentIdFromMsg);
              let winnerClientIds: number | null = null;
              if (winnerSide === "left") winnerClientIds = leftId[0] || null;
              else if (winnerSide === "right")
                winnerClientIds = rightId[0] || null;
              // if this client is the winner
              if (winnerClientIds === clientId) {
                //console.log(
                //  "you are the winner - waiting for tournament next-round",
                //);
                setIsWinner(true);
                const placement = msg.placements.find(
                  (p: { clientId: number }) => p.clientId === clientId,
                );
                if (placement) {
                  //  console.log(
                  //    `winner [${clientId}] placement: ${placement.rank}`,
                  //  ); ////debug
                  setWinnerRank(placement.rank);
                }
                ws.close(1000, "game over - winner");
                return;
              }
              // loser: setGameOver and navigate to tournament page
              setIsWinner(false);
              const placement = msg.placements.find(
                (p: { clientId: number }) => p.clientId === clientId,
              );
              if (placement) {
                //console.log(`loser [${clientId}] placement: ${placement.rank}`); ////debug
                setLoserRank(placement.rank);
              }
              try {
                ws.close(1000, "game over - loser");
              } catch (err) {
                console.error("Error closing ws for loser:", err);
              }
              return;
            } catch (err) {
              console.error("Error handling tournament game over:", err);
            }
          }
          try {
            ws.close(1000, "game over");
          } catch {}
          setIsWinner(false);
        }
      } catch (err) {
        console.error("Error handling WebSocket message:", err);
      }
    });

    // close socket when component unmount
    return () => {
      if (!isOffline) window.removeEventListener("offline", handleOffline);
      if (socketRef.current) {
        try {
          ws.close(1000, "game component unmount");
        } catch (err) {
          console.error("Error closing WebSocket on cleanup:", err);
        }
        ws.removeEventListener("open", () => {});
        ws.removeEventListener("message", () => {});
        ws.removeEventListener("close", () => {});
        ws.removeEventListener("error", () => {});
      }
    };
  }, [roomId, clientId, initialRole, navigate, isOffline, canvasRef]); //re-run effect if any of these change

  return {
    socket,
    gameOver,
    isWinner,
    lastTournamentId,
    tournamentDb,
    winnerRank,
    loserRank,
  };
}
