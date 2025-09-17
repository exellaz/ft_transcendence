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

const ReadyPlayers: React.FC<{ players: any[] }> = ({ players }) => {
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  return (
    <>
      <div className="flex-col-center gap-4">
        <h2 className="text-white text-xl font-bold">Players in Lobby</h2>
        <div
          className={`w-full bg-input-gray rounded-3xl grid ${
            players.length > 4 ? "grid-cols-4" : "grid-cols-2"
          } p-4 gap-4`}
        >
          {players.map((player, idx) => (
            <div
              key={player.uid}
              className="flex flex-col items-center gap-4 font-bold"
            >
              <span
                className={`rounded-full text-white text-center px-2 ${
                  player.ready ? "bg-green-400" : "bg-red-400"
                }`}
              >
                {player.ready ? "Ready" : "Pending"}
              </span>
              <div
                className="cursor-pointer"
                onClick={() => setSelectedUid(player.uid)}
              >
                <Avatar src={player.spriteUrl} size={60} />
                <span
                  className={`${usernameColors[idx % usernameColors.length]}`}
                >
                  {player.username}
                </span>
              </div>
            </div>
          ))}
        </div>
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
