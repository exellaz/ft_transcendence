import React, { useState } from "react";

import Avatar from "./Avatar";
import Button from "./Button";
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
    online: boolean;
    profile: any; // Use your ProfileUser type here
  };
  messages: Message[];
}

const Messaging: React.FC<MessagingProps> = ({ recipient, messages }) => {
  const [showProfile, setShowProfile] = useState(false);

  if (showProfile) {
    return (
      <div className="flex flex-col items-center">
        <ProfileContents user={recipient.profile} />
        <div className="flex gap-6 mt-6">
          <Button
            variant="yellow"
            className="flex-1"
            onClick={() => setShowProfile(false)}
          >
            Back to Chat
          </Button>
          <Button variant="red" className="flex-1">
            Block
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl flex flex-col h-full w-full">
      {/* Header */}
      <div
        className="flex items-center gap-4 px-4 py-3 border-b border-gray-300 cursor-pointer"
        onClick={() => setShowProfile(true)}
      >
        <Avatar src={recipient.avatarUrl} size={40} />
        <span className="font-bold text-xl text-white">
          {recipient.username}
        </span>
        {/* Status */}
        <span
          className={`ml-auto text-sm font-semibold px-3 py-1 rounded-full ${
            recipient.online
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {recipient.online ? "Online" : "Offline"}
        </span>
      </div>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
        <div className="flex flex-col gap-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.sender === "me" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] px-4 py-2 rounded-2xl shadow
                  ${
                    msg.sender === "me"
                      ? "bg-yellow-400 text-black"
                      : "bg-white text-gray-900"
                  }`}
              >
                <span>{msg.text}</span>
                <div className="text-xs text-gray-500 mt-1 text-right">
                  {msg.timestamp}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Input Bar */}
      <div className="flex items-center px-4 py-3 border-t border-gray-300 gap-2">
        <input
          type="text"
          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none"
          placeholder="Type a message"
        />
        <button className="px-4 py-2 bg-yellow-400 text-black hover:bg-yellow-500 hover:text-white rounded font-bold">
          Send
        </button>
      </div>
    </div>
  );
};

export default Messaging;
