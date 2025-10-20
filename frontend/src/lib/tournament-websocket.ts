// lib/tournament-websocket.ts
import { useEffect, useRef, useState } from "react";
import type { WaitingTournamentPlayer } from "../types/apiInterfaces";

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
  const [countdown, setCountdown] = useState<number | null>(null);
  const [stage, setStage] = useState<"QF" | "SF" | "F" | null>(null);
  const [maxPlayer, setMaxPlayer] = useState<number | null>(null);
  const [eliminated, setEliminated] = useState(false);
  const [lastLobbyData, setLastLobbyData] = useState<any | null>(null);
//  console.log("Tournament ID in useTournamentWebSocket:", tournamentId);
//  console.log("Player info in useTournamentWebSocket:", player);

  useEffect(() => {
    if (!tournamentId || tournamentId <= 0 || !player || player.id <= 0) return;

    // hydrate from cached lobby snapshot if present (quick UI render for winners)
    try {
      const raw = sessionStorage.getItem("lastTournamentLobby");
      if (raw) {
        const snap = JSON.parse(raw);
        if (snap?.id === tournamentId) {
          setLastLobbyData(snap);
          if (Array.isArray(snap.players)) setPlayers(snap.players);
          if (snap.stage) setStage(snap.stage);
          if (typeof snap.maxPlayer === "number") setMaxPlayer(snap.maxPlayer);
          if (typeof snap.countdown === "number") setCountdown(snap.countdown);
        }
      }
    } catch (err) { /* ignore parse errors */ }

    const ws = new WebSocket(
      `${import.meta.env.VITE_WS_URL}/ws-tournament?id=${tournamentId}&playerId=${player.id}&name=${player.username}&avatar=${player.avatarUrl || ""}`,
    );
    wsRef.current = ws;

    ws.onopen = () => {
        console.log("Tournament WS connected", tournamentId, player.id);
        try { ws.send(JSON.stringify({ type: "requestLobby" })); } catch {}
    };

    ws.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        console.warn("invalid tournament ws msg:", event.data);
        return;
      }

      // server sends new tournament lobby info
      if (data.type === "tournamentNewLobby") {
        setPlayers(Array.isArray(data.players) ? data.players : []);
        setStage(data.nextStage ?? data.stage ?? null);
        setMaxPlayer(typeof data.maxPlayer === "number" ? data.maxPlayer : null);
        setStarted(false);
        setCountdown(typeof data.countdown === "number" ? data.countdown : null);
        setLastLobbyData(data);
        // persist snapshot for quick render if navigation happens
        try { sessionStorage.setItem("lastTournamentLobby", JSON.stringify({ id: tournamentId, stage: data.nextStage ?? data.stage, players: data.players, maxPlayer: data.maxPlayer ?? null, countdown: data.countdown ?? null })); } catch {}
        return;
      }

      // eliminated: server tells this client it's no longer allowed in lobby
      if (data.type === "eliminated") {
        setEliminated(true);
        // optionally update players list if server provided one
        if (Array.isArray(data.players)) setPlayers(data.players);
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

      if (data.type === "countdown") {
        if (typeof data.remaining === "number") {
            setCountdown(data.remaining);
        }
      }

      if (data.type === "countdownCancel") {
        setCountdown(null);
      }

	  if (data.type === "getPlayerTeam") {
		//console.log("Received getPlayerTeam message:", data.roomId); ////debug
		sessionStorage.setItem("playerSide", data.team === "left" ? "left" : "right");
		sessionStorage.setItem("RoomId", data.roomId);
		sessionStorage.setItem("RoomName", data.roomName);
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

  function refreshLobby() {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "requestLobby" }));
    }
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
    countdown,
    toggleReady,
    onleave,
    stage,
    maxPlayer,
    eliminated,
    lastLobbyData,
    refreshLobby,
  };
}
