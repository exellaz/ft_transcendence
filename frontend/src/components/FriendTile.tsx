import React from "react";
import Avatar from "./Avatar";

interface FriendTileProps {
  username: string;
  avatarUrl: string;
  lastMessage?: string;
  timestamp?: string;
  online?: boolean;
  onClick?: () => void;
}

const FriendTile: React.FC<FriendTileProps> = ({
  username,
  avatarUrl,
  lastMessage,
  timestamp,
  online,
  onClick,
}) => (
  <div
    className="bg-input-gray rounded-xl p-4 flex items-center cursor-pointer hover:ring-2 hover:ring-yellow-400 transition-all gap-4 min-h-[80px]"
    onClick={onClick}
  >
    <Avatar
      src={avatarUrl}
      size={50}
      className={
        online
          ? "ring-4 ring-green-500 rounded-full"
          : "ring-2 ring-red-500 rounded-full"
      }
    />
    <div className="flex flex-col flex-1">
      <div className="flex flex-row justify-between items-center mb-1">
        <span
          className={`font-bold ${online ? "text-green-400" : "text-red-400"}`}
        >
          {username.length > 10 ? username.slice(0,10) + "…" : username}
        </span>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {timestamp ?? "N/A"}
        </span>
      </div>
      <span className="text-xs text-gray-400 w-full block">
        {lastMessage ?? "No messages"}
      </span>
    </div>
  </div>
);

export default FriendTile;
