import { useEffect, useRef, useState } from "react";

export default function Chat({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<{ time:string; from:string; text:string }[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (socketRef.current) return; // already connected
    const s = new WebSocket(import.meta.env.VITE_WS_URL + `/ws-chat?room=${roomId}`);
    socketRef.current = s;

    s.onopen = () => console.log("Chat connected");
    s.onclose = () => console.log("Chat disconnected");
    s.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      const time = new Date(data.time).toLocaleTimeString();
      if (data.type === "chat") {
        if (data.from === "system") {
          setMessages((m) => [...m, { time, from: "System", text: data.text }]);
        } else {
          setMessages((m) => [...m, { time, from: data.from, text: data.text }]);
        }
      }
    };

    return () => {
      try { s.close(); } catch {};
      socketRef.current = null;
    };
  }, [roomId]);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [messages]);

  function send(text:string) {
    const s = socketRef.current;
    if (!s || s.readyState !== WebSocket.OPEN) return;
    s.send(JSON.stringify({
        type: "chat",
        room: roomId,
        from: sessionStorage.getItem("pongClientId") || "Guest",
        text
    }));
  }

  return (
    <div className="fixed right-5 bottom-5 w-96 h-48 border bg-white flex flex-col">
      <div className="flex-1 overflow-auto p-2" ref={boxRef}>
        {messages.map((m, i) => (
          <div key={i} className={m.from === "System" ? "text-gray-600 font-bold" : ""}>
            {m.from}: {m.text}
          </div>
        ))}
      </div>
      <ChatInput onSend={send} />
    </div>
  );
}

function ChatInput({ onSend }: { onSend: (t:string)=>void }) {
  const [v, setV] = useState("");
  return (
    <div className="p-2 flex">
      <input className="flex-1 border p-1" value={v} onChange={(e)=>setV(e.target.value)} onKeyDown={(e)=>{ if(e.key==="Enter" && v.trim()){ onSend(v.trim()); setV(""); }}} />
      <button className="ml-2 px-2 border p-1" onClick={()=>{ if(v.trim()){ onSend(v.trim()); setV(""); }}}>Send</button>
    </div>
  );
}
