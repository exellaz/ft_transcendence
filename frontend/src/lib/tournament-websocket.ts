// lib/tournament-websocket.ts
import { useEffect, useRef, useState } from "react";
import type { WaitingTournamentPlayer } from "../types/apiInterfaces";

// new: shared cache so sockets can be closed from other modules
const tournamentWebsocket = new Map<string, WebSocket>();

// ...existing code...
export function closeTournamentWebsocket(tournamentId: number, playerId: number) {
  const key = `${tournamentId}-${playerId}`;
  let ws = tournamentWebsocket.get(key);

  // debug: list stored keys
  console.debug("[tournament-websocket] stored keys:", Array.from(tournamentWebsocket.keys()));

  // fallback: scan entries to find matching playerId (handles key mismatches)
  if (!ws) {
    for (const [k, socket] of tournamentWebsocket.entries()) {
      const parts = k.split("-");
      const tId = Number(parts[0]);
      const pId = Number(parts.slice(1).join("-"));
      if (!Number.isNaN(tId) && !Number.isNaN(pId) && tId === tournamentId && pId === playerId) {
        ws = socket;
        break;
      }
      if (!ws && pId === playerId) {
        ws = socket;
        break;
      }
    }
  }

  console.log("[tournament-websocket] close called for", tournamentId, playerId, "found ws:", !!ws);
  if (ws) {
    try { ws.close(1000, "Tournament closed"); } catch (e) { console.error("[tournament-websocket] error closing websocket for", key, e); }
    for (const [k, socket] of tournamentWebsocket.entries()) {
      if (socket === ws) tournamentWebsocket.delete(k);
    }
    console.log("[tournament-websocket] explicitly closed websocket for", key);
  } else {
    console.warn("[tournament-websocket] no websocket found to close for", key);
  }
}
// ...existing code...

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
  const [matchAssigned, setMatchAssigned] = useState<{
    roomId: number,
    players: [],
    stage: string,
  } | null>(null);
//  console.log("Tournament ID in useTournamentWebSocket:", tournamentId);
  console.log("Player info in useTournamentWebSocket:", player);

  useEffect(() => {
    if (!tournamentId || tournamentId <= 0 || !player || player.id <= 0) return;

    // hydrate from cached lobby snapshot if present (quick UI render for winners)
    try {
      const raw = sessionStorage.getItem("lastTournamentLobby");
      console.log("[tournament websocket] hydrating from snapshot:", raw);
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

    const key = `${tournamentId}-${player.id}`;
    let ws = tournamentWebsocket.get(key);
    if (!ws || ws.readyState === WebSocket.CLOSED) {
        ws = new WebSocket(
            `${import.meta.env.VITE_WS_URL}/ws-tournament?id=${tournamentId}&playerId=${player.id}&name=${player.username}&avatar=${player.avatarUrl || ""}`,
        );
        tournamentWebsocket.set(key, ws);
    }
    wsRef.current = ws;

    ws.onopen = () => {
        console.log("Tournament WS connected", tournamentId, player.id);
        try {
            ws.send(JSON.stringify({ type: "requestLobby" }));
            //persist current tournament id so UI page can close ;ater
            try { sessionStorage.setItem("tournamentId", String(tournamentId));} catch {}
        } catch {}
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
        console.log("[tournamnent websocket] new lobby: ", data); ////debug
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

      if (data.type === "matchAssigned") {
        console.log("======================== Match assigned data:", data); ////debug
        setMatchAssigned({
            roomId: data.roomId,
            players: data.players,
            stage: data.stage,
        });
      }
    };

    ws.onclose = (ev) => {
        console.log("Tournament WS disconnected", { code: (ev as CloseEvent).code, reason: (ev as CloseEvent).reason });
        if (tournamentWebsocket.get(key) === ws) tournamentWebsocket.delete(key);
        wsRef.current = null;
        // remove persisted id only if this is the same ws we created
        try {
            const persisted = Number(sessionStorage.getItem("tournamentId") ?? -1);
            if (persisted === tournamentId) sessionStorage.removeItem("tournamentId");
        } catch {}
    };

    ws.onerror = (e) => {
      console.error("Tournament WS error", e);
      try { ws.close(1000, "Tournament error"); } catch {}
    };

    return () => {
      console.log("Cleaning up tournament websocket");
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
        closeTournamentWebsocket(tournamentId, player.id);
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
    matchAssigned,
  };
}
