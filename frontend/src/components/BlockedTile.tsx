import React from "react";
import Avatar from "./Avatar";

interface BlockedTileProps {
  username: string;
  avatarUrl: string;
  onClick?: () => void;
  active?: boolean;
}

const BlockedTile: React.FC<BlockedTileProps> = ({
  username,
  avatarUrl,
  onClick,
  active,
}) => (
  <div
    className={`bg-input-gray rounded-xl flex-col-center gap-2 p-4 cursor-pointer
      ${
        active ? "ring-2 ring-yellow-400" : "hover:ring-2 hover:ring-yellow-400"
      }`}
    onClick={onClick}
  >
    <Avatar src={avatarUrl} size={50} />
    <span className="text-white font-bold" title={username}>
      {username.length > 10 ? username.slice(0, 10) + "…" : username}
    </span>
  </div>
);

export default BlockedTile;
