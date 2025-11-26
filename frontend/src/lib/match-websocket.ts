import type { MatchPlayer } from "@/types/apiInterfaces";
import { useState, useEffect, useRef } from "react";

const matchWebsocket = new Map<string, WebSocket>();

// Call this when you want to explicitly close the socket (e.g. leaving a room permanently)
export function closeMatchWebsocket(roomId: number, playerId: number) {
  const key = `${roomId}-${playerId}`;
  const ws = matchWebsocket.get(key);
  if (ws) {
    try {
      ws.close(1000, "match room disconnected");
    } catch (e) {
      console.error("[match-websocket] error closing websocket for", key, e);
    }
    matchWebsocket.delete(key);
    //console.log("[match-websocket] explicitly closed websocket for", key);
  }
}

export function useMatchWebsocket(
  roomId: number,
  player: { id: number; name: string; spriteUrl: string },
) {
  const [roomReady, setRoomReady] = useState<boolean>(false);
  const [players, setPlayers] = useState<MatchPlayer[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  //console.log ("[match-websocket] initializing websocket for roomId:", roomId, " playerId:", player.id); ////debug

  // helper: normalize unknown/websocket player object -> MatchPlayer
  // this is needed because the websocket data may have different field names
  const normalizeToMatchPlayer = (raw: unknown): MatchPlayer => {
    const obj = (raw as Record<string, unknown>) || {}; //get the current object info
    const clientId = Number(obj.clientId ?? obj.id ?? -1);
    const id = Number(obj.id ?? obj.clientId ?? clientId); //get clientId with id or clientId
    const username =
      typeof obj.playerName === "string"
        ? obj.playerName
        : typeof obj.username === "string"
          ? obj.username
          : ""; //get username with playerName or username
    const spriteUrl =
      typeof obj.spriteUrl === "string"
        ? obj.spriteUrl
        : typeof obj.sprite === "string"
          ? obj.sprite
          : ""; //get spriteUrl with spriteUrl or sprite
    const ready = Boolean(obj.ready ?? false);
    const team = typeof obj.team === "string" ? obj.team : "unknown";
    // build MatchPlayer — include any extra fields your MatchPlayer expects
    return {
      id,
      username,
      spriteUrl,
      ready,
      team,
    } as MatchPlayer;
  };

  useEffect(() => {
    if (!roomId || roomId <= 0 || !player.id || player.id <= 0) {
      console.error(
        "[match-websocket] invalid roomId or playerId, cannot establish websocket connection: ",
        roomId,
        player.id,
      ); ////debug
      return;
    }

    //get JWT
    const userJWT = localStorage.getItem("authToken");
    if (!userJWT) return;
    //console.log("Room ws connecting with JWT:", userJWT); ////debug

    const key = `${roomId}-${player.id}`;
    let ws = matchWebsocket.get(key);
    if (!ws || ws.readyState === WebSocket.CLOSED) {
      ws = new WebSocket(`/ws-room?&room=${roomId}&side=unknown`, [userJWT]);
      matchWebsocket.set(key, ws);
    }
    socketRef.current = ws;

    ws.addEventListener("open", () => {
      //console.log("[match-websocket] WebSocket connection opened")
    });

    ws.addEventListener("error", (err) =>
      console.error("[match-websocket] WebSocket error:", err),
    );

    ws.addEventListener("message", (event) => {
      try {
        // validate JSON
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          //  console.error("Invalid JSON:", event.data);
          return;
        }
        //console.log("[match-websocket] received data:", data); ////debug

        // recieve handshake ping from server and send pong back (this is to stimulate the heartbeat show that player is online)
        if (data && data.type === "handshakePing") {
          //console.log("[room-websocket] received handshakePing"); ////debug
          ws.send(
            JSON.stringify({ type: "handshakePong", clientId: player.id }),
          );

          const leftPlayer = Array.isArray(data.PlayerInfo.teams.left)
            ? data.PlayerInfo.teams.left
            : [];
          const rightPlayer = Array.isArray(data.PlayerInfo.teams.right)
            ? data.PlayerInfo.teams.right
            : [];
          const left = leftPlayer.map((p: unknown) =>
            normalizeToMatchPlayer(p),
          );
          const right = rightPlayer.map((p: unknown) =>
            normalizeToMatchPlayer(p),
          );

          const merged = [...left, ...right];
          setPlayers(merged);
          return;
        }

        // recieve heartbeat from server and send ack back
        if (data && data.type === "heartbeat") {
          //console.log(`[room.ws] received heartbeat, sending returnHeartbeat client=${player.id}`); ////debug
          ws.send(
            JSON.stringify({ type: "returnHeartbeat", clientId: player.id }),
          );
          return;
        }

        // validate message structure
        if (typeof data !== "object" || data === null) {
          //  console.error("Invalid message format");
          return;
        }
        if (typeof data.type !== "string") {
          //  console.error("Invalid message: missing type:", data);
          return;
        }
        const allowedTypes = [
          "roleUpdate",
          "gameStart",
          "matchCountdown",
          "matchCountdownCancel",
          "state",
        ];
        if (!allowedTypes.includes(data.type)) {
          if (data.type === "chat") return;
          //  console.error(`unsupported message type ${data.type}`);
          return;
        }

        if (data.type === "roleUpdate") {
          const leftPlayer = Array.isArray(data.gameState.teams.left)
            ? data.gameState.teams.left
            : [];
          const rightPlayer = Array.isArray(data.gameState.teams.right)
            ? data.gameState.teams.right
            : [];
          const left = leftPlayer.map((p: unknown) =>
            normalizeToMatchPlayer(p),
          );
          const right = rightPlayer.map((p: unknown) =>
            normalizeToMatchPlayer(p),
          );

          const merged = [...left, ...right];
          //  console.log("[match-websocket] normalized merged players:", merged); ////debug
          setPlayers(merged);
        }

        if (data.type === "gameStart") {
          //  console.log("[match-websocket] all players ready, game starting!"); ////debug
          setRoomReady(true);
        }

        if (data.type === "matchCountdown") {
          //  console.log("[match-websocket] matchCountdown:", data.remaining); ////debug
          setCountdown(data.remaining);
          if (data.remaining === 0) {
            setRoomReady(true);
          }
        }

        if (data.type === "matchCountdownCancel") {
          //  console.log("[match-websocket] matchCountdownCancel"); ////debug
          setCountdown(null);
        }
      } catch (err) {
        console.error("[match-websocket] WebSocket error:", err);
        ws.close(1000, "[[match-websocket]] server error");
        return;
      }
    });

    ws.addEventListener("close", () => {
      //  console.log(
      //    "[match-websocket] WebSocket connection closed for room",
      //    roomId,
      //    {
      //      code: (ev as CloseEvent).code,
      //      reason: (ev as CloseEvent).reason,
      //      wasClean: (ev as CloseEvent).wasClean,
      //    },
      //  );
      // remove closed socket from cache so next hook call will create a fresh socket
      if (matchWebsocket.get(key) === ws) matchWebsocket.delete(key);
    });

    return () => {
      //  if (matchWebsocket.get(key) === ws) {
      //console.log("Cleaning up websocket for room", roomId);
      //  }
      socketRef.current = null;
    };
  }, [roomId, player.id, player.name, player.spriteUrl]);

  function handleRoomReady(ready: boolean) {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({
        type: "ready",
        ready,
        matchGameStart: true,
      });
      socketRef.current.send(message);
    }
  }

  return {
    countdown,
    roomReady,
    handleRoomReady,
    players,
  };
}
