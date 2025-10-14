import React, { useState } from "react";
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
  const [input, setInput] = useState("");

  // API query for message list
  const {
    data: messages,
    loading,
    error,
    refetch,
  } = useApiQuery<FriendChatMessage[]>(
    () => getAllFriendChatMessages({ friendshipId: friendshipId }),
    [open, selectedUser],
    true
  );

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
        {messages?.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.senderId === userId ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2 
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
            selectedUser.status === "online" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {selectedUser.status === "online" ? translate("online") : translate("offline")}
        </span>
      </div>
      {/* Messages */}
      <div className="h-full overflow-y-auto scrollbar-hide p-4">
        {messagesContent}
      </div>
      {/* Input Bar */}
      <div className="flex-row-center gap-4 border-t border-gray-300 px-4 py-3">
        <input
          type="text"
          className="flex-1 rounded-lg bg-input-gray text-white px-3 py-2 outline-none"
          placeholder={translate("type_message")}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button variant="send" onClick={() => {}}>
          {translate("send")}
        </Button>
      </div>
    </div>
  );
};

export default Messaging;
