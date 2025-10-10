import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useUser } from "../context/UserProvider";
import type { FriendBasic, FriendMessaging } from "../types/apiInterfaces";
// TODO: Remove mock data import when integrating real API
import { mockMessages } from "../data/mockUsers";

import Avatar from "./Avatar";
import Button from "./Button";

interface MessagingProps {
  friendBasic: FriendBasic;
  friendId: number;
  onProfileClick?: () => void;
}

const Messaging: React.FC<MessagingProps> = ({
  friendBasic,
  friendId,
  onProfileClick,
}) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`Messaging.${key}`);
  const [friend, setFriend] = useState<FriendMessaging | null>(null);
  const [input, setInput] = useState("");

  // TODO: Fetch real data based on userId
  // useEffect(() => {
  //   // Fetch messages between user and friend
  //   fetch(`/api/messages?userId=${userId}&friendId=${friendId}`)
  //     .then((res) => res.json())
  //     .then(setFriend);
  // }, [friendId, userId]);

  // const userId = useUser().user?.id;

  // TODO: Delete when API is integrated
  const userId = 0;
  function getFriendMessagingById(
    friendId: number,
    data: FriendMessaging[],
  ): FriendMessaging | undefined {
    return data.find((friend) => friend.id === friendId);
  }
  useEffect(() => {
    setFriend(getFriendMessagingById(friendId, mockMessages) || null);
  }, [friendId]);

  if (!friend) return <div>{translate("loading")}</div>;

  return (
    <div className="w-full h-full rounded-3xl flex flex-col">
      {/* Header */}
      <div
        className="flex items-center gap-4 border-b border-gray-300 px-4 py-3 cursor-pointer"
        onClick={onProfileClick}
      >
        <Avatar src={friendBasic.avatarUrl} size={40} />
        <span className="text-white text-xl font-bold">
          {friendBasic.username}
        </span>
        {/* Status */}
        <span
          className={`rounded-full text-white text-sm font-semibold ml-auto px-4 py-2 ${
            friendBasic.online ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {friendBasic.online ? translate("online") : translate("offline")}
        </span>
      </div>
      {/* Messages */}
      <div className="h-full overflow-y-auto scrollbar-hide p-4">
        <div className="flex flex-col gap-4">
          {(friend.messages ?? []).map((msg, idx) => (
            <div
              key={idx}
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
