import React from "react";
import Avatar from "./Avatar";

interface FriendTileProps {
  username: string;
  avatarUrl: string;
  lastMessage?: string;
  timestamp?: string;
  onClick?: () => void;
}

const FriendTile: React.FC<FriendTileProps> = ({
  username,
  avatarUrl,
  lastMessage,
  timestamp,
  onClick,
}) => (
  <div
    className="bg-blue-900 rounded-xl p-4 flex items-center cursor-pointer hover:ring-2 hover:ring-yellow-400 transition-all gap-4 w-full min-h-[80px]"
    onClick={onClick}
  >
    <Avatar src={avatarUrl} size={48} />
    <div className="flex flex-col flex-1">
      <span className="text-white font-bold mb-1">{username}</span>
      <span className="text-xs text-gray-400">
        {lastMessage ?? "No messages"}
      </span>
    </div>
    <span className="text-xs text-gray-400 whitespace-nowrap">
      {timestamp ?? "N/A"}
    </span>
  </div>
);

export default FriendTile;
