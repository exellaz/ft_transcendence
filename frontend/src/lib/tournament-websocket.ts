// lib/tournament-websocket.ts
import { useEffect, useRef, useState } from "react";
import type { WaitingTournamentPlayer } from "../types/apiInterfaces";
import { useNavigate } from "react-router-dom";

// new: shared cache so sockets can be closed from other modules
const tournamentWebsocket = new Map<string, WebSocket>();

export function closeTournamentWebsocket(
  tournamentId: number,
  playerId: number,
) {
  const key = `${tournamentId}-${playerId}`;
  let ws = tournamentWebsocket.get(key);

  // debug: list stored keys
  console.debug(
    "[tournament-websocket] stored keys:",
    Array.from(tournamentWebsocket.keys()),
  );

  // fallback: scan entries to find matching playerId (handles key mismatches)
  if (!ws) {
    for (const [k, socket] of tournamentWebsocket.entries()) {
      const parts = k.split("-");
      const tId = Number(parts[0]);
      const pId = Number(parts.slice(1).join("-"));
      if (
        !Number.isNaN(tId) &&
        !Number.isNaN(pId) &&
        tId === tournamentId &&
        pId === playerId
      ) {
        ws = socket;
        break;
      }
      if (!ws && pId === playerId) {
        ws = socket;
        break;
      }
    }
  }

  //  console.log(
  //    "[tournament-websocket] close called for",
  //    tournamentId,
  //    playerId,
  //    "found ws:",
  //    !!ws,
  //  );
  if (ws) {
    try {
      ws.close(1000, "Tournament closed");
    } catch (e) {
      console.error(
        "[tournament-websocket] error closing websocket for",
        key,
        e,
      );
    }
    for (const [k, socket] of tournamentWebsocket.entries()) {
      if (socket === ws) tournamentWebsocket.delete(k);
    }
    //console.log("[tournament-websocket] explicitly closed websocket for", key);
  } else {
    console.warn("[tournament-websocket] no websocket found to close for", key);
  }
}

export interface useTournamentWebSocketParams {
  tournamentId: number;
  player: {
    id: number;
    username: string;
    avatarUrl: string;
  };
}

export function useTournamentWebSocket({
  tournamentId,
  player,
}: useTournamentWebSocketParams) {
  const [players, setPlayers] = useState<WaitingTournamentPlayer[]>([]);
  const [ready, setReady] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const [lock, setLock] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [eliminated, setEliminated] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [matchAssigned, setMatchAssigned] = useState<{
    roomId: number;
    players: WaitingTournamentPlayer[];
    stage: string;
  } | null>(null);
  const navigate = useNavigate();
  //  console.log("Tournament ID in useTournamentWebSocket:", tournamentId); ////debug
  //  console.log("Player info in useTournamentWebSocket:", player); ////debug

  useEffect(() => {
    // Listen for online/offline events
    function handleOnline() {
      console.warn("[room-websocket] navigator online");
    }
    function handleOffline() {
      console.warn("[room-websocket] navigator offline, closing ws");
      setRoomError("offline_error");
      try {
        wsRef.current?.close(1000, "offline");
      } catch {}
    }

    // Add event listeners
    if (typeof window !== "undefined" && window.addEventListener) {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    // Cleanup event listeners on unmount
    return () => {
      if (typeof window !== "undefined" && window.removeEventListener) {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, []);

  useEffect(() => {
    if (!tournamentId || tournamentId <= 0 || !player || player.id <= 0) return;

    //get JWT
    const userJWT = localStorage.getItem("authToken");
    if (!userJWT) {
      console.warn("No JWT found, cannot connect to tournament WebSocket");
      return;
    }
    //console.log("Tournament ws connecting with JWT:", userJWT); ////debug

    const key = `${tournamentId}-${player.id}`;
    let ws = tournamentWebsocket.get(key);
    if (!ws || ws.readyState === WebSocket.CLOSED) {
      ws = new WebSocket(
        `/ws-tournament?id=${tournamentId}&sprite=${encodeURIComponent(player.avatarUrl)}`,
        [userJWT],
      );
      tournamentWebsocket.set(key, ws);
    }
    wsRef.current = ws;

    ws.addEventListener("open", () => {
      try {
        sessionStorage.setItem("tournamentId", String(tournamentId));
      } catch {}
    });

    ws.addEventListener("message", (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        //console.warn("invalid tournament ws msg:", event.data);
        return;
      }

      // eliminated: server tells this client it's no longer allowed in lobby
      if (data.type === "eliminated") {
        setEliminated(true);
        // optionally update players list if server provided one
        if (Array.isArray(data.players)) setPlayers(data.players);
        return;
      }

      // player join tournament
      if (data.type === "playerJoined") {
        setPlayers(data.players);
      }

      // player ready status update
      if (data.type === "updatePlayer") {
        setPlayers(data.players);
      }

      // player left
      if (data.type === "playerLeft") {
        setPlayers(data.players);
      }

      // start tournament
      if (data.type === "tournamentStarted") {
        setLock(true);
      }

      //countdown timer
      if (data.type === "countdown") {
        if (typeof data.remaining === "number") {
          setCountdown(data.remaining);
        }
      }

      //cancel dountdown
      if (data.type === "countdownCancel") {
        setCountdown(null);
      }

      //get player team info
      if (data.type === "getPlayerTeam") {
        //console.log("Received getPlayerTeam message:", data.roomId); ////debug
        sessionStorage.setItem(
          "playerSide",
          data.team === "left" ? "left" : "right",
        );
        sessionStorage.setItem("RoomId", data.roomId);
        sessionStorage.setItem("RoomName", data.roomName);
      }

      //get player pair in match
      if (data.type === "matchAssigned") {
        //console.log("======================== Match assigned data:", data); ////debug
        setMatchAssigned({
          roomId: data.roomId,
          players: data.players,
          stage: data.stage,
        });
      }

      if (data.type === "semiFinalEnd") {
        //console.log(
        //  "[tournament-websocket] Semi-final tournament ended:",
        //  data,
        //);

        // Close WebSocket
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1000, "Semi-final tournament ended");
        }

        // Navigate to results page with the winner rank
        navigate("/results", {
          state: {
            winnerRank: data.winnerRank || null,
            loserRank: null,
            clientId: data.clientId || player.id,
            lastTournamentId: data.lastTournamentId || tournamentId,
            roomId: -1, // No room for tournament end
          },
        });
      }

      if (data.type === "FinalEnded") {
        //console.log("[tournament-websocket] Final tournament ended:", data);

        // Close WebSocket
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1000, "Final tournament ended");
        }

        // Navigate to results page with the winner rank
        navigate("/results", {
          state: {
            winnerRank: data.winnerRank || null,
            loserRank: null,
            clientId: data.clientId || player.id,
            lastTournamentId: data.lastTournamentId || tournamentId,
            roomId: -1, // No room for tournament end
          },
        });
      }

      if (data.type === "redirectToFinals") {
        //console.log("[tournament-websocket] Advance to finals:", data); ////debug

        if (data.nextTournamentId) {
          // ✅ Store the finals tournament ID
          try {
            sessionStorage.setItem(
              "tournamentId",
              String(data.nextTournamentId),
            );
          } catch {}

          // ✅ Close semi-finals connection IMMEDIATELY before navigation
          const key = `${tournamentId}-${player.id}`;
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            //console.log(
            //  `[tournament-websocket] Closing semi-finals connection for player ${player.id}`,
            //);
            wsRef.current.close(1000, "Advancing to finals");
            tournamentWebsocket.delete(key);
          }

          // ✅ Navigate to finals
          navigate(`/tournament/${data.nextTournamentId}`, {
            state: {
              tournament: {
                id: data.nextTournamentId,
                maxPlayer: data.maxPlayer,
                stage: data.stage,
              },
              selectedSprite: data.player.spriteUrl,
            },
          });
        }
      }
    });

    ws.addEventListener("close", (ev) => {
      //  console.log("Tournament WS disconnected", {
      //    code: (ev as CloseEvent).code,
      //    reason: (ev as CloseEvent).reason,
      //  });

      // ✅ Only show offline error if NOT transitioning
      const reason = (ev as CloseEvent).reason;
      if (reason !== "Advancing to finals") {
        setRoomError("offline_error");
      }

      if (tournamentWebsocket.get(key) === ws) tournamentWebsocket.delete(key);
      wsRef.current = null;
      // remove persisted id only if this is the same ws we created
      try {
        const persisted = Number(sessionStorage.getItem("tournamentId") ?? -1);
        if (persisted === tournamentId)
          sessionStorage.removeItem("tournamentId");
      } catch {}
    });

    ws.addEventListener("error", (e) => {
      console.error("Tournament WS error", e);
      try {
        ws.close(1000, "Tournament error");
      } catch {}
    });

    return () => {
      //  console.log("Cleaning up tournament websocket");
      wsRef.current = null;
    };
  }, [tournamentId, player.id, player.username, player.avatarUrl]);

  function toggleReady() {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      setRoomError("offline_error");
      return;
    }
    setReady((prev) => {
      const newReady = !prev;
      wsRef.current?.send(JSON.stringify({ type: "ready", ready: newReady }));
      return newReady;
    });
  }

  function onleave() {
    try {
      closeTournamentWebsocket(tournamentId, player.id);
    } catch {}
    sessionStorage.removeItem("tournamentId");
  }

  return {
    players,
    ready,
    lock,
    countdown,
    toggleReady,
    onleave,
    eliminated,
    matchAssigned,
    roomError,
  };
}
