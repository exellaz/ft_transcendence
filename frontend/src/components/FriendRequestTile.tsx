import React from "react";
import Avatar from "./Avatar";

interface FriendRequestTileProps {
  username: string;
  avatarUrl: string;
  onClick?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
}

const FriendRequestTile: React.FC<FriendRequestTileProps> = ({
  username,
  avatarUrl,
  onClick,
  onAccept,
  onReject,
}) => (
  <div
    className="bg-input-gray cursor-pointer hover:ring-2 hover:ring-yellow-400 transition-all rounded-xl p-4 flex items-center gap-4 w-full min-h-[80px]"
    onClick={onClick}
  >
    <Avatar src={avatarUrl} size={48} />
    <span className="text-white font-bold flex-1">
      {username.length > 10 ? username.slice(0, 10) + "…" : username}
    </span>
    <button
      className="bg-green-500 text-white font-bold rounded-full px-4 py-1 mr-2 cursor-pointer"
      onClick={onAccept}
    >
      ✓
    </button>
    <button
      className="bg-red-500 text-white font-bold rounded-full px-4 py-1 cursor-pointer"
      onClick={onReject}
    >
      ✗
    </button>
  </div>
);

export default FriendRequestTile;
