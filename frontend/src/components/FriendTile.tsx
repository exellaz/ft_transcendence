import React from "react";
import Avatar from "./Avatar";

interface FriendTileProps {
  username: string;
  avatarUrl: string;
  lastMessage?: string;
  timestamp?: string;
  online: boolean;
  onClick?: () => void;
  active?: boolean;
}

const FriendTile: React.FC<FriendTileProps> = ({
  username,
  avatarUrl,
  lastMessage,
  timestamp,
  online,
  onClick,
  active,
}) => (
  <div
    className={`w-full h-[80px] bg-input-gray rounded-xl flex-row-center gap-4 p-4 cursor-pointer
      ${
        active ? "ring-2 ring-yellow-400" : "hover:ring-2 hover:ring-yellow-400"
      }`}
    onClick={onClick}
  >
    <Avatar
      src={avatarUrl}
      size={50}
      className={
        online
          ? "ring-4 ring-green-500"
          : "ring-4 ring-red-500"
      }
    />
    <div className="flex flex-col flex-1 gap-1">
      <div className="flex-row-between">
        <span
          className={`font-bold ${online ? "text-green-400" : "text-red-400"}`}
          title={username}
        >
          {username.length > 10 ? username.slice(0, 10) + "…" : username}
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
