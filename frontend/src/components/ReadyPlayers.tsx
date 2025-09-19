import React, { useState } from "react";

import Avatar from "../components/Avatar";
import ProfilePopup from "../popups/ProfilePopup";

const usernameColors = [
  "text-red-400",
  "text-blue-400",
  "text-green-400",
  "text-yellow-400",
  "text-purple-400",
  "text-pink-400",
  "text-orange-400",
  "text-teal-400",
];

interface ReadyPlayersProps {
  players: any[];
}

const ReadyPlayers: React.FC<ReadyPlayersProps> = ({ players }) => {
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  return (
    <>
        <div
          className={`w-full h-2/3 bg-input-gray rounded-3xl p-4 gap-4 grid ${
            players.length > 4 ? "grid-cols-4" : "grid-cols-2"
          } `}
        >
          {players.map((player, idx) => (
            <div
              key={player.uid}
              className={`flex-col-center gap-4 font-bold ${
                players.length > 2 ? "text-lg" : "text-3xl"
              }`}
            >
              {/* Status */}
              <span
                className={`rounded-full text-white text-center ${
                  player.ready ? "bg-green-400" : "bg-red-400"
                } ${players.length > 2 ? "px-2 py-1" : "px-4 py-2"}`}
              >
                {player.ready ? "Ready" : "Pending"}
              </span>
              {/* Avatar & Username */}
              <div
                className="flex-col-center gap-2 cursor-pointer"
                onClick={() => setSelectedUid(player.uid)}
              >
                <Avatar
                  src={player.spriteUrl}
                  size={players.length > 2 ? 60 : 120}
                />
                <span
                  className={`${usernameColors[idx % usernameColors.length]}`}
                >
                  {player.username}
                </span>
              </div>
            </div>
          ))}
        </div>
      {selectedUid && (
        <ProfilePopup
          open={true}
          onClose={() => setSelectedUid(null)}
          userUid={selectedUid}
          variant="other"
        />
      )}
    </>
  );
};

export default ReadyPlayers;
