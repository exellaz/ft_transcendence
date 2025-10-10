import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type {
  WaitingTournamentPlayer,
  LiveChatMessage,
} from "../types/apiInterfaces";
import { getUserColor } from "../utils/colorUtils";

import Button from "../components/Button";

/**
 * @brief LiveChat component to display chat messages and input box
 * @param players List of players in the room
 * @param chatMessages List of chat messages
 * @param message Current input message
 * @param setMessage Function to update input message
 * @param onSendMessage Function to send the current message
 */
const LiveChat: React.FC<{
  players: WaitingTournamentPlayer[];
  chatMessages: LiveChatMessage[];
  message: string;
  setMessage: (msg: string) => void;
  onSendMessage: () => void;
}> = ({ players, chatMessages, message, setMessage, onSendMessage }) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`LiveChat.${key}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when chatMessages change
  useEffect(() => {
    if (messagesEndRef.current) {
      // scrollTop is the number of pixels the content is scrolled vertically.
      // scrollHeight is the total height of the content inside the container.
      // Setting scrollTop = scrollHeight means the scroll bar moves to the very bottom, showing the latest message.
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [chatMessages]); // Runs every time messages change

  // Helper function to get display name for a message
  const getDisplayName = (msg: LiveChatMessage) => {
    if (msg.id === -1) return "System"; // System messages
    const player = players.find(
      (p: WaitingTournamentPlayer) => p.id === msg.id,
    ); // Find player by uid
    return player ? player.username : "Unknown"; // Fallback to "Unknown" if not found
  };

  return (
    <div className="w-[50%] h-full border-gray-300 border-3 rounded-3xl flex flex-col gap-2 p-6">
      <p className="text-white text-xl font-bold">{translate("live_chat")}</p>
      {/* Chat messages container */}
      <div
        ref={messagesEndRef}
        className="h-[400px] overflow-y-auto scrollbar-hide"
      >
        {/* Chat messages */}
        {chatMessages.map((msg, idx) => (
          <div key={idx} className="mb-2">
            <div className="flex items-baseline justify-between flex-wrap">
              <span className={`font-bold ${getUserColor(msg.id)}`}>
                {getDisplayName(msg)}:
              </span>{" "}
              <span className="text-gray-400 text-xs">{msg.timestamp}</span>
            </div>
            <div className="text-white break-words">{msg.text}</div>
          </div>
        ))}
      </div>

      {/* Input box and send button */}
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
          {translate("send")}
        </Button>
      </div>
    </div>
  );
};

export default LiveChat;
