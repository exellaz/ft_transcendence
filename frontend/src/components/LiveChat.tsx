import React from "react";
import Button from "../components/Button";

const usernameColors = [
  "text-red-400", "text-blue-400", "text-green-400", "text-yellow-400",
  "text-purple-400", "text-pink-400", "text-orange-400", "text-teal-400"
];

const LiveChat: React.FC<{
  players: any[];
  chatMessages: { userId: number; text: string }[];
  message: string;
  setMessage: (msg: string) => void;
  onSendMessage: () => void;
}> = ({ players, chatMessages, message, setMessage, onSendMessage }) => (
  <div className="flex flex-col w-1/2 h-full bg-card-blue border-gray-300 border-3 rounded-3xl p-6">
    <h2 className="text-white text-xl font-bold mb-2">Live Chat</h2>
    <div className="flex-1 overflow-y-auto mb-4">
      {chatMessages.map((msg, idx) => {
        const player = players.find(p => p.id === msg.userId);
        return (
          <div key={idx} className="mb-2">
            <span className={`font-bold ${usernameColors[(player ? players.indexOf(player) : 0) % usernameColors.length]}`}>
              {player ? player.username : "Unknown"}:
            </span>{" "}
            <span className="text-white">{msg.text}</span>
          </div>
        );
      })}
    </div>
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Type a message..."
        className="flex-1 px-3 py-2 rounded-lg bg-input-gray text-white"
      />
      <Button variant="yellow" onClick={onSendMessage}>Send</Button>
    </div>
  </div>
);

export default LiveChat;
