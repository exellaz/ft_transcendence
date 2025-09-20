import { useEffect, useRef, useState } from "react";

export interface ChatMessage {
  time: string;
  from: string;
  text: string;
}

export function useLiveChatWebSocket(roomId: string) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (socketRef.current) return; // already connected
        // create websocket connection with room id
        const ws = new WebSocket(import.meta.env.VITE_WS_URL + `/ws-chat?room=${roomId}`);
        socketRef.current = ws;

        // open connection
        ws.addEventListener("open", () => console.log("Chat ws connected"));

        // handle incoming message / event from server
        ws.addEventListener("message", (ev) => {
            try {
                let data;
                try {
                    data = JSON.parse(ev.data);
                } catch {
                    ws.close(1003, "Invalid JSON");
                    return;
                }

                if (typeof data !== "object" || data === null) {
                    ws.close(1003, "Invalid message format");
                    return;
                }
                if (typeof data.type !== "string") {
                    ws.close(1003, "Invalid message: missing type");
                    return;
                }
                const allowedTypes = ["chat"];
                if (!allowedTypes.includes(data.type)) {
                    ws.close(1003, `unsupported message type ${data.type}`);
                    return;
                }
                if (data.type === "chat") {
                    const time = new Date(data.time).toLocaleTimeString();
                    const from = data.from === "system" ? "System" : data.from;
                    setMessages((prev) => [...prev, { time, from, text: data.text }]);
                }
            } catch (err) {
                console.error("Invalid chat message:", err);
            }
        });

        // close connection
        ws.addEventListener("close", () => console.log("Chat ws disconnected"));

        return () => {
            try { ws.close(); } catch {}
            socketRef.current = null;
        };
    }, [roomId]);

    function send(text: string) {
        const ws = socketRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        ws.send(
            JSON.stringify({
                type: "chat",
                room: roomId,
                from: sessionStorage.getItem("pongClientId") || "Guest",
                text,
            })
        );
    }

    return { messages, send };
}

/************************************** Chat Input Box *************************************/
function ChatInput({ onSend }: { onSend: (t: string) => void }) {
    const [v, setV] = useState("");
    return (
      <div className="p-2 flex">
        <input
          className="flex-1 border p-1"
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && v.trim()) {
              onSend(v.trim());
              setV("");
            }
          }}
        />
        <button
          className="ml-2 px-2 border p-1"
          onClick={() => {
            if (v.trim()) {
              onSend(v.trim());
              setV("");
            }
          }}
        >
          Send
        </button>
      </div>
    );
}

/************************************** Chat Box Container *************************************/
export default function Chat({ roomId }: { roomId: string }) {
    const { messages, send } = useLiveChatWebSocket(roomId);
    const boxRef = useRef<HTMLDivElement | null>(null);

    // auto-scroll
    useEffect(() => {
      if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }, [messages]);

    return (
      <div className="fixed right-5 bottom-5 w-96 h-48 border bg-white flex flex-col">
        <div className="flex-1 overflow-auto p-2" ref={boxRef}>
          {messages.map((m, i) => (
            <div
              key={i}
              className={m.from === "System" ? "text-gray-600 font-bold" : ""}
            >
              {m.from}: {m.text}
            </div>
          ))}
        </div>
        <ChatInput onSend={send} />
      </div>
    );
}