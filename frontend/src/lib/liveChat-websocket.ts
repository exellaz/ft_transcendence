import { useEffect, useRef, useState } from "react";
import type { LiveChatMessage } from "../types/apiInterfaces";
import { formatTimestamp } from "../utils/date";

/**
 * @brief Custom hook to manage live chat via WebSocket
 * @param roomId The chat room ID
 * @returns An object containing the list of messages and a send function
 */
export function useLiveChatWebSocket(
  roomId: number,
  user: { id: number; name: string },
) {
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const socketRef = useRef<WebSocket | null>(null);

  //! need to fix later
  // Get current user info from sessionStorage
  //TODO replace with JWT
  const uid = user.id;
  const username = user.name;

  useEffect(() => {
    if (!roomId || roomId <= 0 || !user?.id || user.id <= 0) return;
    if (socketRef.current) return; // already connected

    // create websocket connection with room id
    const ws = new WebSocket(`/ws-chat?room=${roomId}`);
    socketRef.current = ws;

    ws.addEventListener("open", () => {
      //console.log("Chat ws connected")
    });

    ws.addEventListener("error", (e) =>
      console.error("Live chat WebSocket error", e),
    );

    ws.addEventListener("close", () => {
      //console.log(
      //  `live chat ws disconnected: code=${ev.code}, reason=${ev.reason}`,
      //);
    });

    // handle incoming message / event from server
    ws.addEventListener("message", (ev) => {
      try {
        let data;
        try {
          data = JSON.parse(ev.data);
        } catch {
          //  console.error("Invalid JSON");
          return;
        }

        if (typeof data !== "object" || data === null) {
          //  console.error("Invalid message format");
          return;
        }
        if (typeof data.type !== "string") {
          //  console.error("Invalid message: missing type: ", data);
          return;
        }
        const allowedTypes = ["chat"];
        if (!allowedTypes.includes(data.type)) {
          //  console.error(`unsupported message type ${data.type}`);
          return;
        }
        if (data.type === "chat") {
          setMessages((prev) => [
            ...prev,
            {
              id: data.id || -1,
              from: data.from || "unknown",
              text: data.text,
              timestamp: formatTimestamp(new Date(data.time || Date.now())),
            },
          ]);
        }
      } catch (err) {
        console.error("Invalid chat message:", err);
        ws.close(1000, "server error");
      }
    });

    return () => {
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      )
        ws.close(1000, "Chat closed");
      ws.removeEventListener("open", () => {});
      ws.removeEventListener("message", () => {});
      ws.removeEventListener("close", () => {});
      socketRef.current = null;
    };
  }, [roomId, user.id, user.name]);

  function handleSendMsg() {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (!message.trim()) return; // ignore empty messages
    ws.send(
      JSON.stringify({
        type: "chat",
        room: roomId,
        uid,
        from: username,
        text: message.trim(),
        timestamp: formatTimestamp(new Date()),
      }),
    );
    setMessage("");
  }

  return { chatMessages: messages, message, setMessage, handleSendMsg };
}
