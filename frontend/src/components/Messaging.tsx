import React, { useEffect, useState } from "react";
import { useUser } from "../context/UserContext";
import type { FriendMessaging } from "../types/socialTypes";
// TODO: Remove mock data import when integrating real API
import { mockMessages } from "../data/mockUsers";

import Avatar from "./Avatar";

interface MessagingProps {
  friendUid: string;
  onProfileClick?: () => void;
}

const Messaging: React.FC<MessagingProps> = ({ friendUid, onProfileClick }) => {
  const [friend, setFriend] = useState<FriendMessaging | null>(null);
  const [input, setInput] = useState("");

  // TODO: Fetch real data based on userUid
  const userUid = useUser().user?.id;
  // useEffect(() => {
  //   // Fetch friend info and messages between user and friend
  //   fetch(`/api/messages?userUid=${userUid}&friendUid=${friendUid}`)
  //     .then((res) => res.json())
  //     .then(setFriend);
  // }, [friendUid, userUid]);

  // TODO: Delete when API is integrated
  function getFriendMessagingByUid(
    friendUid: string,
    data: FriendMessaging[]
  ): FriendMessaging | undefined {
    return data.find((friend) => friend.uid === friendUid);
  }
  useEffect(() => {
    setFriend(getFriendMessagingByUid(friendUid, mockMessages) || null);
  }, [friendUid]);

  if (!friend) return <div>Loading...</div>;

  return (
    <div className="rounded-3xl flex flex-col h-full w-full">
      {/* Header */}
      <div
        className="flex items-center gap-4 px-4 py-3 border-b border-gray-300 cursor-pointer"
        onClick={onProfileClick}
      >
        <Avatar src={friend.avatarUrl} size={40} />
        <span className="font-bold text-xl text-white">{friend.username}</span>
        {/* Status */}
        <span
          className={`ml-auto text-sm font-semibold px-3 py-1 rounded-full ${
            friend.online ? "bg-green-500 text-white" : "bg-red-500 text-white"
          }`}
        >
          {friend.online ? "Online" : "Offline"}
        </span>
      </div>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
        <div className="flex flex-col gap-3">
          {(friend.messages ?? []).map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${
                msg.senderUid === userUid ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] px-4 py-2 rounded-2xl shadow
                  ${
                    msg.senderUid === userUid
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
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="px-4 py-2 bg-yellow-400 text-black hover:bg-yellow-500 hover:text-white rounded font-bold">
          Send
        </button>
      </div>
    </div>
  );
};

export default Messaging;
