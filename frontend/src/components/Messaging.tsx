import React, { useState } from "react";
import Avatar from "./Avatar";
import ProfileContents from "./ProfileContents";

interface Message {
  id: string;
  sender: "me" | "recipient";
  text: string;
  timestamp: string;
}

interface MessagingProps {
  recipient: {
    username: string;
    avatarUrl: string;
    profile: any; // Use your ProfileUser type here
  };
  messages: Message[];
}

const Messaging: React.FC<MessagingProps> = ({ recipient, messages }) => {
  const [showProfile, setShowProfile] = useState(false);

  if (showProfile) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <ProfileContents user={recipient.profile} />
        <button
          className="mt-4 px-4 py-2 bg-yellow-400 text-black rounded font-bold"
          onClick={() => setShowProfile(false)}
        >
          Back to Chat
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div
        className="flex items-center gap-4 px-4 py-3 border-b border-gray-300 cursor-pointer"
        onClick={() => setShowProfile(true)}
      >
        <Avatar src={recipient.avatarUrl} size={40} />
        <span className="font-bold text-xl text-white">{recipient.username}</span>
      </div>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="flex flex-col gap-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] px-4 py-2 rounded-2xl shadow
                  ${msg.sender === "me"
                    ? "bg-yellow-400 text-black"
                    : "bg-white text-gray-900"
                  }`}
              >
                <span>{msg.text}</span>
                <div className="text-xs text-gray-500 mt-1 text-right">{msg.timestamp}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Input Bar */}
      <div className="flex items-center px-4 py-3 border-t border-gray-300 bg-white">
        <input
          type="text"
          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none"
          placeholder="Type a message"
        />
        <button className="ml-2 px-4 py-2 bg-yellow-400 text-black rounded font-bold">
          Send
        </button>
      </div>
    </div>
  );
};

export default Messaging;
