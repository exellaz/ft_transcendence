import React from "react";

import Avatar from "./Avatar";
import Button from "./Button";

interface FriendRequestTileProps {
  username: string;
  avatarUrl: string;
  onClick?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  active?: boolean;
}

const FriendRequestTile: React.FC<FriendRequestTileProps> = ({
  username,
  avatarUrl,
  onClick,
  onAccept,
  onReject,
  active,
}) => (
  <div
    className={`w-full h-[80px] bg-input-gray rounded-xl flex-row-center gap-4 p-4 cursor-pointer
      ${
        active ? "ring-2 ring-yellow-400" : "hover:ring-2 hover:ring-yellow-400"
      }`}
    onClick={onClick}
  >
    <Avatar src={avatarUrl} size={48} />
    <span className="text-white font-bold flex-1" title={username}>
      {username.length > 10 ? username.slice(0, 10) + "…" : username}
    </span>
    <Button
      variant="smallGreen"
      onClick={(e) => {
        e.stopPropagation();
        onAccept?.();
      }}
    >
      ✓
    </Button>
    <Button
      variant="smallRed"
      onClick={(e) => {
        e.stopPropagation();
        onReject?.();
      }}
    >
      ✗
    </Button>
  </div>
);

export default FriendRequestTile;
