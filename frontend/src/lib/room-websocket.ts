import { useEffect, useRef, useState } from "react";
import { determineSide } from "./requestBackend.api";
import type { playerInfo } from "../../../backend/src/types/interface";

// room structure
export interface UseRoomWebSocketParams {
  roomId: number;
  roomName: string;
  leaderId: number;
  player: {
    id: number;
    name: string;
    sprite: string;
  };
  setRoomInfo: React.Dispatch<
    React.SetStateAction<{
      name: string;
      leaderId: number;
      type: string;
      id: number;
    } | null>
  >;
}

/**
 * @brief Custom hook to manage WebSocket connection and room state.
 * @param roomId The ID of the room to connect to.
 * @param roomName The name of the room.
 * @param leaderId The client ID of the room leader.
 */
export function useRoomWebSocket(
  { roomId, roomName, leaderId, player, setRoomInfo }: UseRoomWebSocketParams,
  options?: { autoConnect?: boolean },
) {
  const [leftTeamHtml, setLeftTeamHtml] = useState<string | playerInfo[]>(
    "waiting left team...",
  ); // HTML content for left team
  const [rightTeamHtml, setRightTeamHtml] = useState<string | playerInfo[]>(
    "waiting right team...",
  ); // HTML content for right team
  const [isLeader, setIsLeader] = useState(false); // Whether the current client is the leader
  const [role, setRole] = useState<string>("spectator"); // e.g., "left_player1", "right_player2", "spectator"
  const [ready, setReady] = useState(false); // Whether the player is ready
  const [gameStarted, setGameStarted] = useState(false); // Whether the game has started
  const [canStart, setCanStart] = useState(false); // Whether the game can be started (all players ready)
  const [countdown, setCountdown] = useState<number | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null); // Error message if room cannot be joined
  const socketRef = useRef<WebSocket | null>(null);
  const autoConnect = options?.autoConnect ?? true;

  useEffect(() => {
    function handleOnline() {
      console.warn("[room-websocket] navigator online");
    }
    function handleOffline() {
      console.warn("[room-websocket] navigator offline, closing ws");
      setRoomError("offline_error");
      try {
        socketRef.current?.close(1000, "offline");
      } catch {}
    }
    if (typeof window !== "undefined" && window.addEventListener) {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }
    return () => {
      if (typeof window !== "undefined" && window.removeEventListener) {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, []);

  useEffect(() => {
    if (!autoConnect) return;
    if (!roomId || roomId < 0 || !player.id || player.id < 0) return;
    //TODO replace with JWT

    async function connect() {
      //get JWT
      const userJWT = localStorage.getItem("authToken");
      if (!userJWT) return;
      //  console.log("Room ws connecting with JWT:", userJWT); ////debug

      // pick role (leader gets left_player1)
      const roleLocal = player.id === leaderId ? "left_player1" : "spectator";
      //  console.log("Assigned role:", roleLocal); ////debug
      setRole(roleLocal);
      setIsLeader(player.id === leaderId);

      // create websocket connection with player id, room id, side and player name
      const chooseSide = await determineSide(roomId);
      //  console.log("ws side:", chooseSide); ////debug
      const ws = new WebSocket(`/ws-room?room=${roomId}&side=${chooseSide}`, [
        userJWT,
      ]);
      socketRef.current = ws;

      ws.addEventListener("open", () => {
        //console.log("Room ws connected"); ////debug
      });

      ws.addEventListener("error", (e) => {
        console.error("Room ws error", e);
        ws.close(1000, "websocket error");
      });

      ws.addEventListener("close", () => {
        //console.log(
        //  `Room ws disconnected: code=${ev.code}, reason=${ev.reason}`,
        //);
        setRoomError("offline_error");
        setCanStart(false);
        setReady(false);
      });

      // handle incoming message / event from server
      ws.addEventListener("message", (ev) => {
        try {
          // validate JSON
          let data;
          try {
            data = JSON.parse(ev.data);
          } catch {
            //console.error("Invalid JSON:", ev.data);
            return;
          }

          // receive handshake ping from server and send pong back (this is to stimulate the heartbeat show that player is online)
          if (data && data.type === "handshakePing") {
            //console.log("[room-websocket] received handshakePing"); ////debug
            ws.send(
              JSON.stringify({ type: "handshakePong", clientId: player.id }),
            );
            return;
          }
          // recieve heartbeat from server and send ack back
          if (data && data.type === "heartbeat") {
            //console.log(
            //  `[room.ws] received heartbeat, sending returnHeartbeat client=${player.id}`,
            //); ////debug
            ws.send(
              JSON.stringify({ type: "returnHeartbeat", clientId: player.id }),
            );
            return;
          }

          // handle error message from server
          if (data.type === "error") {
            console.warn("Cannot join room:", data.message);
            setRoomError(data.message);
            ws.close(1000, "error received");
            return;
          }

          // validate message structure
          if (typeof data !== "object" || data === null) {
            //console.error("Invalid message format");
            return;
          }
          if (typeof data.type !== "string") {
            //console.error("Invalid message: missing type:", data);
            return;
          }
          const allowedTypes = [
            "roleUpdate",
            "state",
            "countdown",
            "countdownCancel",
            "roomPrivacyUpdate",
            "playerOffline",
          ];
          if (!allowedTypes.includes(data.type)) {
            if (data.type === "chat") return;
            //console.error(`unsupported message type ${data.type}`);
            return;
          }

          // handle different message types
          if (data.type === "roleUpdate") {
            // validate the game state
            if (typeof data.gameState !== "object" || data.gameState === null) {
              console.error("Invalid roleUpdate: missing gameState");
              return;
            }
            // update role base in clientId
            //console.log("Left Team info:", data.gameState.teams.left);
            //console.log("Right Team info:", data.gameState.teams.right);
            const leftPlayer = data.gameState.teams.left.find(
              (p: playerInfo) => {
                //console.log(
                //  "Left Player info:",
                //  p.clientId,
                //  typeof p.clientId,
                //  player.id,
                //  typeof player.id,
                //);
                return p.clientId === player.id;
              },
            );
            //console.log("Left Player found:", leftPlayer);
            const rightPlayer = data.gameState.teams.right.find(
              (p: playerInfo) => {
                //console.log(
                //  "Right Player info:",
                //  p.clientId,
                //  typeof p.clientId,
                //  player.id,
                //  typeof player.id,
                //);
                return p.clientId === player.id;
              },
            );
            const newRole =
              leftPlayer?.role || rightPlayer?.role || "spectator";
            setRole(newRole);
            // update team lists on left
            setLeftTeamHtml(
              data.gameState.teams.left.map((p: playerInfo) => ({
                id: p.clientId,
                username: p.playerName,
                role: p.role,
                team: p.role.startsWith("left") ? "left" : "right",
                leader: p.clientId === data.leaderId,
                spriteUrl: p.spriteUrl,
                ready: p.ready,
              })),
            );
            // update team lists on right
            setRightTeamHtml(
              data.gameState.teams.right.map((p: playerInfo) => ({
                id: p.clientId,
                username: p.playerName,
                role: p.role,
                team: p.role.startsWith("left") ? "left" : "right",
                leader: p.clientId === data.leaderId,
                spriteUrl: p.spriteUrl,
                ready: p.ready,
              })),
            );
            // update player leader
            if (data.leaderId) {
              //  console.log(
              //    "Updating leader status:",
              //    typeof player.id,
              //    typeof data.leaderId,
              //  );
              setIsLeader(player.id === data.leaderId);
            }
            // update can start status
            setCanStart(data.canStart ?? false);
          }
          if (data.type === "state") {
            // validate the game state
            if (typeof data.gameState !== "object" || data.gameState === null) {
              console.error("Invalid state: missing gameState");
              return;
            }
            // update can start status
            setCanStart(data.canStart ?? false);
            //if game able to start then set game started to true
            if (!gameStarted && data.gameState.gameStarted) {
              setGameStarted(true);
            }
          }
          if (data.type === "countdown") {
            if (typeof data.remaining === "number") {
              //get the remaining time from server and set to countdown state
              setCountdown(data.remaining);
            }
          }
          if (data.type === "countdownCancel") {
            //cancel the countdown
            setCountdown(null);
          }
          if (data.type === "roomPrivacyUpdate") {
            // update room info
            setRoomInfo((prev) =>
              prev ? { ...prev, ...data.data } : data.data,
            );
            //console.log("Room privacy updated:", data.data); ////debug
          }
          if (data.type === "playerOffline") {
            const goneId = data.clientId;
            setLeftTeamHtml((prev) =>
              Array.isArray(prev)
                ? prev.map((p) =>
                    p.clientId === goneId ? { ...p, online: false } : p,
                  )
                : prev,
            );
            setRightTeamHtml((prev) =>
              Array.isArray(prev)
                ? prev.map((p) =>
                    p.clientId === goneId ? { ...p, online: false } : p,
                  )
                : prev,
            );
          }
        } catch (err) {
          console.error("Invalid room message:", err);
          ws.close(1000, "server error");
        }
      });

      // clean up on unmount
      return () => {
        //try { if (ws) ws.close(1000, "room websocket unmounted"); } catch {}
        ws.removeEventListener("open", () => {});
        ws.removeEventListener("error", () => {});
        ws.removeEventListener("close", () => {});
      };
    }
    connect();
  }, [roomId, roomName, leaderId, player.id]);

  function onSwitch() {
    if (!socketRef.current) return;
    if (socketRef.current.readyState !== WebSocket.OPEN) {
      setRoomError("offline_error");
      return;
    }
    if (countdown !== null) return;
    if (ready && !isLeader) return;
    const newSide = role.startsWith("left") ? "right" : "left";
    socketRef.current.send(
      JSON.stringify({ type: "switchSide", side: newSide }),
    );
  }

  function onReady() {
    if (!socketRef.current || isLeader) return;
    if (socketRef.current.readyState !== WebSocket.OPEN) {
      setRoomError("offline_error");
      return;
    }

    const newReady = !ready;
    setReady(newReady);
    socketRef.current.send(JSON.stringify({ type: "ready", ready: newReady }));
  }

  function onStartBtn() {
    if (!isLeader || !socketRef.current) return;
    if (socketRef.current.readyState !== WebSocket.OPEN) {
      setRoomError("offline_error");
      return;
    }
    socketRef.current.send(JSON.stringify({ type: "start", start: true }));
  }

  function onLeave() {
    try {
      socketRef.current?.close(1000, "player left room");
    } catch {}
    sessionStorage.removeItem("RoomName");
    sessionStorage.removeItem("RoomId");
    sessionStorage.removeItem("RoomLeaderId");
    sessionStorage.removeItem("RoomType");
  }

  // notify server that this client's sprite changed
  function onChangeSprite(spriteUrl: string) {
    if (!socketRef.current) return;
    socketRef.current.send(
      JSON.stringify({ type: "setSprite", sprite: spriteUrl }),
    );
  }

  return {
    socket: socketRef.current,
    leftTeamHtml,
    rightTeamHtml,
    isLeader,
    role,
    ready,
    setReady,
    canStart,
    countdown,
    roomError,
    onSwitch,
    onReady,
    onStartBtn,
    onLeave,
    onChangeSprite,
  };
}
