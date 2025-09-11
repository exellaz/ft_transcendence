import React from "react";

import Avatar from "../components/Avatar";
import Button from "../components/Button";

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

const ReadyPlayers: React.FC<{ players: any[] }> = ({ players }) => (
  <div className="flex flex-col items-center justify-center w-1/2">
    <h2 className="text-white text-xl font-bold mb-2">Players in Lobby</h2>
    <div className="bg-input-gray grid grid-cols-4 w-full">
      {players.map((player, idx) => (
        <div key={player.id} className="w-full flex flex-col items-center m-4 gap-2 justify-end">
          {player.ready && (
            <span className="bg-green-400 text-white rounded-full px-3 py-1 mt-1 text-sm font-bold">
              Ready
            </span>
          )}
          <Avatar src={player.skinUrl} size={60} />
          <span
            className={`font-bold ${
              usernameColors[idx % usernameColors.length]
            }`}
          >
            {player.username}
          </span>
        </div>
      ))}
    </div>
    <Button variant="green" className="mt-4 w-32">
      Ready
    </Button>
  </div>
);

export default ReadyPlayers;
