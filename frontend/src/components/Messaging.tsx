import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { User } from "../types/usersApi";
import { useApiQuery } from "../hooks/useApi";
import { getAllFriendChatMessages } from "../lib/friendsApiClient";
import type { FriendChatMessage } from "../types/friendsApi";
import { formatTimestamp } from "../utils/date";

import {
  LoadingState,
  ErrorState,
  NotFoundState,
} from "../components/ApiState";
import Avatar from "./Avatar";
import Button from "./Button";
import { useOnlineStatus } from "@/context/OnlineStatusProvider";

interface MessagingProps {
  userId: number;
  selectedUser: User;
  friendshipId: number;
  onProfileClick?: () => void;
}

const Messaging: React.FC<MessagingProps> = ({
  userId,
  selectedUser,
  friendshipId,
  onProfileClick,
}) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`Messaging.${key}`);
  const [localMessages, setLocalMessages] = useState<FriendChatMessage[]>([]);
  // message in input bar
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // limit user's message length
  const MESSAGE_LIMIT = 200;

  // Auto-scroll to the bottom when chatMessages change
  useEffect(() => {
    if (messagesEndRef.current) {
      // scrollTop is the number of pixels the content is scrolled vertically.
      // scrollHeight is the total height of the content inside the container.
      // Setting scrollTop = scrollHeight means the scroll bar moves to the very bottom, showing the latest message.
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [localMessages]); // Runs every time messages change

  // API query for message list
  const {
    data: messages,
    loading,
    error,
    refetch,
  } = useApiQuery<FriendChatMessage[]>(
    () => getAllFriendChatMessages({ friendshipId: friendshipId }),
    [open, selectedUser],
    true,
  );

  useEffect(() => {
    if (messages) setLocalMessages(messages);
  }, [messages]);

  // Handler to send message
  const handleSendMessage = () => {
    if (message.trim() === "" || message.length > MESSAGE_LIMIT) return;
    const newMsg: FriendChatMessage = {
      id: Date.now(), // TODO: replace with real ID from backend
      friendshipId: friendshipId,
      senderId: userId,
      message: message,
      timestamp: new Date(),
    };
    setLocalMessages([...localMessages, newMsg]);
    setMessage("");
  };

  let messagesContent: React.ReactNode;
  if (loading) {
    messagesContent = <LoadingState />;
  } else if (error) {
    messagesContent = <ErrorState error={error} onRetry={refetch} />;
  } else if (!messages) {
    messagesContent = <NotFoundState />;
  } else if (messages.length === 0) {
    messagesContent = (
      <div className="h-full flex-col-center">
        <p className="text-gray-400 text-lg font-semibold">
          {translate("no_messages_yet")}
        </p>
      </div>
    );
  } else {
    messagesContent = (
      <div className="flex flex-col gap-4">
        {localMessages?.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.senderId === userId ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2 break-words
                  ${
                    msg.senderId === userId
                      ? "bg-yellow-400 text-black"
                      : "bg-white text-gray-900"
                  }`}
            >
              <span>{msg.message}</span>
              <div className="text-xs text-gray-500 mt-1 text-right">
                {formatTimestamp(msg.timestamp)}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const { isFriendOnline } = useOnlineStatus();

  return (
    <div className="w-full h-full rounded-3xl flex flex-col">
      {/* Header */}
      <div
        className="flex items-center gap-4 border-b border-gray-300 px-4 py-3 cursor-pointer"
        onClick={onProfileClick}
      >
        <Avatar src={selectedUser.avatarUrl} size={40} />
        <span className="text-white text-xl font-bold">
          {selectedUser.username}
        </span>
        {/* Status */}
        <span
          className={`rounded-full text-white text-sm font-semibold ml-auto px-4 py-2 ${
            isFriendOnline(selectedUser.id) ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {isFriendOnline(selectedUser.id)
            ? translate("online")
            : translate("offline")}
        </span>
      </div>
      {/* Messages */}
      <div
        className="h-full overflow-y-auto scrollbar-hide p-4"
        ref={messagesEndRef}
      >
        {messagesContent}
      </div>
      {/* Input Bar */}
      <div className="flex-row-center gap-4 border-t border-gray-300 px-4 py-3">
        <input
          type="text"
          className="flex-1 rounded-lg bg-input-gray text-white px-3 py-2 outline-none"
          placeholder={translate("type_message")}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSendMessage();
            }
          }}
          maxLength={MESSAGE_LIMIT + 50}
        />
        {message.length <= MESSAGE_LIMIT ? (
          <Button variant="send" onClick={handleSendMessage}>
            {translate("send")}
          </Button>
        ) : (
          <span className="text-red-500 font-bold">
            {message.length}/{MESSAGE_LIMIT}
          </span>
        )}
      </div>
    </div>
  );
};

export default Messaging;
