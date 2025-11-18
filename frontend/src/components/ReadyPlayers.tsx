import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useUser } from "../context/UserProvider";
import { getUserColor } from "../utils/color";

import Avatar from "../components/Avatar";
import ProfilePopup from "../popups/ProfilePopup";
import type { WaitingTournamentPlayer } from "@/types/apiInterfaces";

interface ReadyPlayersProps {
  players: WaitingTournamentPlayer[];
}

const ReadyPlayers: React.FC<ReadyPlayersProps> = ({ players }) => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`ReadyPlayers.${key}`);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const userId = useUser().user?.id;
  //  console.log("Players in ReadyPlayers component:", players); ////debug

  return (
    <>
      <div
        className={`w-full h-2/3 bg-input-gray rounded-3xl p-4 gap-4 grid ${
          players.length > 4 ? "grid-cols-4" : "grid-cols-2"
        } `}
      >
        {players.map((player) => (
          <div
            key={player.id}
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
              {player.ready ? translate("ready") : translate("pending")}
            </span>
            {/* Avatar & Username */}
            <div
              className="flex-col-center gap-2 cursor-pointer"
              onClick={() => setSelectedId(player.id)}
            >
              <Avatar
                src={player.spriteUrl}
                size={players.length > 2 ? 60 : 120}
              />
              <span
                className={`${getUserColor(player.id)}`}
                title={player.username}
              >
                {player.username.length > 7
                  ? player.username.slice(0, 7) + "…"
                  : player.username}
              </span>
            </div>
          </div>
        ))}
      </div>
      {selectedId && (
        <ProfilePopup
          open={true}
          onClose={() => setSelectedId(null)}
          selectedId={selectedId}
          variant={selectedId === userId ? "self" : "other"}
        />
      )}
    </>
  );
};

export default ReadyPlayers;
