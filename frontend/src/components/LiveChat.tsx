import React, { useEffect, useRef } from "react";
import type { WaitingPlayer, LiveChatMessage } from "../types/apiInterfaces";

import Button from "../components/Button";

const usernameColors = [
  "text-red-400",
  "text-blue-400",
  "text-green-400",
  "text-yellow-400",
  "text-purple-400",
  "text-pink-400",
  "text-orange-400",
  "text-teal-400",
];

const LiveChat: React.FC<{
  players: WaitingPlayer[];
  chatMessages: LiveChatMessage[];
  message: string;
  setMessage: (msg: string) => void;
  onSendMessage: () => void;
}> = ({ players, chatMessages, message, setMessage, onSendMessage }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      // scrollTop is the number of pixels the content is scrolled vertically.
      // scrollHeight is the total height of the content inside the container.
      // Setting scrollTop = scrollHeight means the scroll bar moves to the very bottom, showing the latest message.
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [chatMessages]); // Runs every time messages change

  return (
    <div className="w-[50%] h-full border-gray-300 border-3 rounded-3xl flex flex-col gap-2 p-6">
      <p className="text-white text-xl font-bold">Live Chat</p>
      <div
        ref={messagesEndRef}
        className="h-[400px] overflow-y-auto scrollbar-hide"
      >
        {chatMessages.map((msg, idx) => {
          const player = players.find((p) => p.uid === msg.uid);
          return (
            <div key={idx} className="mb-2">
              <div className="flex items-baseline justify-between flex-wrap">
                <span
                  className={`font-bold ${
                    usernameColors[
                      (player ? players.indexOf(player) : 0) %
                        usernameColors.length
                    ]
                  }`}
                >
                  {player ? player.username : "Unknown"}:
                </span>{" "}
                <span className="text-gray-400 text-xs">{msg.timestamp}</span>
              </div>
              <div className="text-white break-words">{msg.text}</div>
            </div>
          );
        })}
      </div>
      <div className="flex-row-center gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSendMessage();
            }
          }}
          placeholder="Type a message..."
          className="flex-1 bg-input-gray rounded-lg text-white px-3 py-2 outline-none"
        />
        <Button variant="send" onClick={onSendMessage}>
          Send
        </Button>
      </div>
    </div>
  );
};

export default LiveChat;
