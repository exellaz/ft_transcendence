import React, { useState } from "react";
import type { WaitingRoomPlayer } from "../types/apiInterfaces";
import { getUserColor } from "../utils/colorUtils";

import Avatar from "./Avatar";
import ProfilePopup from "../popups/ProfilePopup";

interface ReadyRoomPlayersProps {
  players: WaitingRoomPlayer[];
  variant: "singles" | "doubles";
  onSwitchTeam?: () => void;
}

const ReadyRoomPlayers: React.FC<ReadyRoomPlayersProps> = ({
  players,
  variant,
  onSwitchTeam,
}) => {
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  const leftTeamPlayers = players.filter((player) => player.team === "left");
  const rightTeamPlayers = players.filter((player) => player.team === "right");
  const maxPlayersPerTeam = variant === "singles" ? 1 : 2;

  const basicCellStyling = `w-full bg-input-gray rounded-xl ${
    variant === "doubles"
      ? "h-[70px] flex-row-center"
      : "h-[140px] flex-col-center"
  }`;

  // Individual player component
  const PlayerCell: React.FC<{
    player: WaitingRoomPlayer;
  }> = ({ player }) => (
    <div
      className={`${basicCellStyling} gap-4 cursor-pointer`}
      onClick={() => setSelectedUid(player.uid)}
    >
      <div className="relative">
        <img
          src="/assets/crown.png"
          alt="Leader"
          title="Leader"
          className={
            player.leader
              ? `absolute -top-3 -right-2 rotate-33 ${
                  variant === "doubles" ? "w-5 h-3" : "w-6 h-4"
                }`
              : "hidden"
          }
        />
        <Avatar
          src={player.spriteUrl}
          size={variant === "doubles" ? 30 : 50}
          className={
            player.ready ? "ring-4 ring-green-500" : "ring-4 ring-red-500"
          }
        />
      </div>
      <p className={`text-lg font-bold ${getUserColor(player.uid)}`}>
        {player.username}
      </p>
    </div>
  );

  // Empty slot component
  const EmptySlot: React.FC = () => (
    <div
      className={`${basicCellStyling} border-2 border-dashed border-gray-600 opacity-50`}
    >
      <p className="text-gray-500 text-sm">Waiting For Player</p>
    </div>
  );

  // Team column component
  const TeamColumn: React.FC<{
    title: string;
    teamPlayers: WaitingRoomPlayer[];
  }> = ({ title, teamPlayers }) => (
    <div className="flex-1 flex-col-center gap-3">
      <p className="text-yellow-400 text-xl font-bold">{title}</p>
      <div className="w-full flex-col-center gap-2">
        {teamPlayers.map((player) => (
          <PlayerCell key={player.uid} player={player} />
        ))}
        {/* Fill empty slots */}
        {Array.from(
          { length: maxPlayersPerTeam - teamPlayers.length },
          (_, index) => (
            <EmptySlot key={`empty-${index}`} />
          )
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Two-column team layout */}
      <div className="relative w-full h-full flex-row-start gap-6">
        <TeamColumn title="Left Team" teamPlayers={leftTeamPlayers} />
        {/* Switch Team Button */}
        <div
          className="absolute top-0 left-1/2 transform -translate-x-1/2 cursor-pointer"
          onClick={onSwitchTeam}
        >
          <img
            className="h-8"
            src="/assets/switch.png"
            alt="Switch Teams"
            title="Switch Teams"
          />
        </div>
        <TeamColumn title="Right Team" teamPlayers={rightTeamPlayers} />
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

export default ReadyRoomPlayers;
