// lib/tournament-websocket.ts
import { useEffect, useRef, useState } from "react";
import type { WaitingTournamentPlayer } from "../types/apiInterfaces";
import type { User } from "../types/usersApi";

export interface useTournamentWebSocketParams {
    tournamentId: number;
    player: {
        id: number;
        username: string;
        avatarUrl: string;
    };
}

export function useTournamentWebSocket({ tournamentId, player }: useTournamentWebSocketParams) {
  const [players, setPlayers] = useState<WaitingTournamentPlayer[]>([]);
  const [ready, setReady] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const [started, setStarted] = useState(false);
  console.log("Tournament ID in useTournamentWebSocket:", tournamentId);
  console.log("Player info in useTournamentWebSocket:", player);

  useEffect(() => {
    if (!tournamentId || player.id <= 0 || !player.username || !player.avatarUrl) return;

    const ws = new WebSocket(
      `${import.meta.env.VITE_WS_URL}/ws-tournament?id=${tournamentId}&playerId=${player.id}&name=${player.username}&avatar=${player.avatarUrl || ""}`,
    );
    wsRef.current = ws;

    ws.onopen = () => {
        console.log("Tournament WS connected");
    };

    ws.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        console.warn("invalid tournament ws msg:", event.data);
        return;
      }

      if (data.type === "playerJoined") {
        setPlayers(data.players);
      }

      if (data.type === "updatePlayer") {
        setPlayers(data.players);
      }

      if (data.type === "playerLeft") {
        setPlayers(data.players);
      }

      if (data.type === "tournamentStarted") {
        setStarted(true);
      }
    };

    ws.onclose = () => {
        console.log("Tournament WS disconnected");
        wsRef.current = null;
    };

    ws.onerror = (e) => {
      console.error("Tournament WS error", e);
      try { ws.close(); } catch {}
    };

    return () => {
      try { ws.close(); } catch {}
      wsRef.current = null;
    };
  }, [tournamentId, player.id, player.username, player.avatarUrl]);

  function toggleReady() {
    setReady((prev) => {
        const newReady = !prev;
        wsRef.current?.send(JSON.stringify({ type: "ready", ready: newReady }));
        return newReady;
    });
  }

  function startTournament() {
    wsRef.current?.send(JSON.stringify({ type: "start" }));
  }

  function onleave() {
    try {
        wsRef.current?.close();
    }
    catch {}
    sessionStorage.removeItem("tournamentId");
  }

  return {
    players,
    ready,
    started,
    startTournament,
    toggleReady,
    onleave,
  };
}
