import React, { useState } from "react";
import type { WaitingRoomPlayer } from "../types/apiInterfaces";

import Avatar from "./Avatar";
import Button from "./Button";
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

  // Individual player component
  const PlayerCell: React.FC<{
    player: WaitingRoomPlayer;
    colorIndex: number;
  }> = ({ player, colorIndex }) => (
    <div className="w-full bg-input-gray rounded-xl p-3 flex-row-center gap-3">
      <div
        className="cursor-pointer"
        onClick={() => setSelectedUid(player.uid)}
      >
        <Avatar src={player.spriteUrl} size={50} />
      </div>
      <div className="flex-1 flex-col-start gap-1">
        <span
          onClick={() => setSelectedUid(player.uid)}
          className={`${
            usernameColors[colorIndex % usernameColors.length]
          } text-lg font-bold cursor-pointer`}
        >
          {player.username}
          {player.leader && <span className="text-yellow-400 ml-1">👑</span>}
        </span>
        <span
          className={`text-xs px-2 py-1 rounded-full text-white font-medium ${
            player.ready ? "bg-green-400" : "bg-red-400"
          }`}
        >
          {player.ready ? "Ready" : "Pending"}
        </span>
      </div>
    </div>
  );

  // Empty slot component
  const EmptySlot: React.FC = () => (
    <div className="w-full bg-input-gray rounded-xl p-3 flex-row-center gap-3 border-2 border-dashed border-gray-600 opacity-50">
      <div className="w-12 h-12 bg-gray-600 rounded-full flex-row-center">
        <span className="text-gray-400">+</span>
      </div>
      <div className="flex-1">
        <span className="text-gray-500 text-sm">Waiting...</span>
      </div>
    </div>
  );

  // Team column component
  const TeamColumn: React.FC<{
    title: string;
    teamPlayers: WaitingRoomPlayer[];
    startColorIndex: number;
  }> = ({ title, teamPlayers, startColorIndex }) => (
    <div className="flex-1 flex-col-center gap-3">
      <h3 className="text-yellow-400 text-xl font-bold">{title}</h3>
      <div className="w-full flex-col-center gap-2">
        {teamPlayers.map((player, index) => (
          <PlayerCell
            key={player.uid}
            player={player}
            colorIndex={startColorIndex + index}
          />
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
      <div className="w-full h-[300px] flex-col-between gap-6 bg-black">
        {/* Two-column team layout */}
        <div className="w-full flex-row-start gap-6">
          <TeamColumn
            title="Left Team"
            teamPlayers={leftTeamPlayers}
            startColorIndex={0}
          />
          <TeamColumn
            title="Right Team"
            teamPlayers={rightTeamPlayers}
            startColorIndex={4}
          />
        </div>

        {/* Switch Team Button */}
        <Button onClick={onSwitchTeam}>Switch Team</Button>
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
