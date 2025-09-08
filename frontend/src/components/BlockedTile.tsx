import React from "react";
import Avatar from "./Avatar";

interface BlockedTileProps {
  username: string;
  avatarUrl: string;
  onClick?: () => void;
}

const BlockedTile: React.FC<BlockedTileProps> = ({
  username,
  avatarUrl,
  onClick,
}) => (
  <div
    className="bg-input-gray rounded-xl p-3 flex flex-col items-center cursor-pointer hover:ring-2 hover:ring-yellow-400 transition-all "
    onClick={onClick}
  >
    <Avatar src={avatarUrl} size={50} />
    <span className="text-white font-bold mt-2">{username}</span>
  </div>
);

export default BlockedTile;
