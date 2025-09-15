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
    className={`bg-input-gray cursor-pointer transition-all rounded-xl p-4 flex items-center gap-4 w-full min-h-[80px] 
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
      variant="greenSmall"
      onClick={onAccept}
    >
      ✓
    </Button>
    <Button
      variant="redSmall"
      onClick={onReject}
    >
      ✗
    </Button>
  </div>
);

export default FriendRequestTile;
