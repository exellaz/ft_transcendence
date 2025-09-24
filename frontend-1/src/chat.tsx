import { useEffect, useRef, useState } from "react";

// chat message structure
export interface ChatMessage {
  time: string;
  from: string;
  text: string;
}

/**
 * @brief Custom hook to manage live chat via WebSocket
 * @param roomId The chat room ID
 * @returns An object containing the list of messages and a send function
 */
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
                    console.error("Invalid JSON");
                    return;
                }

                if (typeof data !== "object" || data === null) {
                    console.error("Invalid message format");
                    return;
                }
                if (typeof data.type !== "string") {
                    console.error("Invalid message: missing type: ", data);
                    return;
                }
                const allowedTypes = ["chat"];
                if (!allowedTypes.includes(data.type)) {
                    console.error(`unsupported message type ${data.type}`);
                    return;
                }
                if (data.type === "chat") {
                    const time = new Date(data.time).toLocaleTimeString();
                    const from = data.from === "system" ? "System" : data.from;
                    setMessages((prev) => [...prev, { time, from, text: data.text }]);
                }
            } catch (err) {
                console.error("Invalid chat message:", err);
				ws.close(1000, "server error");
            }
        });

        // close connection
        ws.addEventListener("close", () => console.log("Chat ws disconnected"));

        return () => {
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)
				ws.close(1000, "Chat closed");
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
                from: sessionStorage.getItem("pongPlayerName") || "Guest",
                text,
            })
        );
    }

    return { messages, send };
}

/************************************** Chat Input Box *************************************/
/**
 * @brief Chat input box component
 * @param onSend Callback function to send a message
 */
function ChatInput({ onSend }: { onSend: (t: string) => void }) {
    const [msg, setMsg] = useState(""); // current input message
    return (
      <div className="p-2 flex">
		{/* send with enter */}
        <input
          className="flex-1 border p-1"
          value={msg}
          onChange={(e) => setMsg(e.target.value)} // update input box
          onKeyDown={(e) => {
            if (e.key === "Enter" && msg.trim()) { // send the msg on Enter key
              onSend(msg.trim()); // trim whitespace
              setMsg(""); // clear input box
            }
          }}
        />
		{/* send with button */}
        <button
          className="ml-2 px-2 border p-1"
          onClick={() => {
            if (msg.trim()) { // send the msg on button click
              onSend(msg.trim()); // trim whitespace
              setMsg(""); // clear input box
            }
          }}
        >
          Send
        </button>
      </div>
    );
}

/************************************** Chat Box Container *************************************/
/**
 * @brief Chat box component
 * @param roomId room for the chat
 * @returns Chat box UI
*/
export default function Chat({ roomId }: { roomId: string }) {
    const { messages, send } = useLiveChatWebSocket(roomId); // use the custom hook
    const boxRef = useRef<HTMLDivElement | null>(null);

    // auto-scroll
    useEffect(() => {
      if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }, [messages]);

    return (
      <div className="fixed right-5 bottom-5 w-96 h-48 border bg-white flex flex-col">
        {/* chat box */}
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
		{/* input box */}
        <ChatInput onSend={send} />
      </div>
    );
}
