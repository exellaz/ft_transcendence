import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { User } from "../types/usersApi";
import { useMessages } from "../hooks/useMessages";
import { useOnlineStatus } from "../context/OnlineStatusProvider";
import { formatTimestamp } from "../utils/date";

import {
  LoadingState,
  ErrorState,
  NotFoundState,
} from "../components/ApiState";
import Avatar from "./Avatar";
import Button from "./Button";

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
  const { isFriendOnline, wsSendMessage } = useOnlineStatus();
  const {
    data: messages,
    isLoading,
    isError,
    refetch,
    optimisticSendMessage,
  } = useMessages(friendshipId, true);

  // message in input bar
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isInitialRender = useRef(true);
  // limit user's message length
  const MESSAGE_LIMIT = 200;

  // Auto-scroll to the bottom when messages change
  useEffect(() => {
    const container = messagesEndRef.current;
    if (!container) return;

    if (isInitialRender.current) {
      // Initial render - jump straight to the bottom
      container.scrollTop = container.scrollHeight;
      isInitialRender.current = false;
    } else {
      // Later updates - smooth scroll
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // Handler to send message
  const handleSendMessage = async () => {
    if (message.trim() === "" || message.length > MESSAGE_LIMIT) return;

    // negative tempId to differentiate optimistic ids from real ids
    // these will be reconciled when the server sends back an acknowledgement
    // with the real message id
    const tempId = Date.now() * -1;
    // optimistic UI update via React Query
    // await waits for the optimistic update to complete
    // await only applicable for functions that actually return a promise
    await optimisticSendMessage(message, tempId);
    // sends the message through the websocket
    wsSendMessage(tempId, friendshipId, message);
    setMessage("");
  };

  let messagesContent: React.ReactNode;
  if (isLoading) {
    messagesContent = <LoadingState />;
  } else if (isError) {
    messagesContent = <ErrorState onRetry={refetch} />;
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
        {messages?.map((msg) => (
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
