import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useUser } from "../../context/UserProvider";
import { mockMatchPlayers } from "../../data/mockUsers";
import type { MatchPlayer } from "../../types/apiInterfaces";

import Avatar from "../../components/Avatar";
import Background from "../../components/Background";
import Button from "../../components/Button";
import Card from "../../components/Card";
import TournamentHeader from "../../components/TournamentHeader";

import ProfilePopup from "../../popups/ProfilePopup";

const MatchView: React.FC = () => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`MatchView.${key}`);
  const { user } = useUser();
  const userUid = user?.id ?? "";
  const [players, setPlayers] = useState<MatchPlayer[]>([]);
  const [stage, setStage] = useState("quarterfinals");
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  // TODO: Fetch real data based on tournamentId
  // React.useEffect(() => {
  //   // Replace with real API calls
  // fetch(`/api/tournament/${tournamentId}/match/${stage}/player/${uid}`)
  //   .then((res) => res.json())
  //   .then(setPlayers);
  // }, [tournamentId, stage, uid]);

  // TODO: Remove mock data when integrating real API
  React.useEffect(() => {
    setPlayers(mockMatchPlayers["t1"]);
  }, []);

  if (players.length < 2) {
    return <div>Loading...</div>;
  }

  const userDetails = players[0];
  const opponentDetails = players[1];

  const MatchPlayerCard: React.FC<{
    player: MatchPlayer;
    onClick: (uid: string) => void;
  }> = ({ player, onClick }) => (
    <div key={player.uid} className="flex-col-center gap-4">
      {/* player status */}
      <span
        className={`rounded-full px-3 py-2 ${
          player.ready ? "bg-green-400" : "bg-red-400"
        }`}
      >
        {player.ready ? "Ready" : "Pending"}
      </span>
      {/* player avatar and username */}
      <div
        className="flex-col-center gap-2 cursor-pointer"
        onClick={() => onClick(player.uid)}
      >
        <Avatar src={player.spriteUrl} size={120} />
        <span>{player.username}</span>
      </div>
    </div>
  );

  return (
    <Background>
      <Card size="wide">
        <TournamentHeader>
          {stage.charAt(0).toUpperCase() + stage.slice(1)} Match
        </TournamentHeader>

        <div className="w-full flex-row-between px-2 font-bold text-white text-2xl text-center">
          <MatchPlayerCard player={userDetails} onClick={setSelectedUid} />
          {/* VS */}
          <span className="text-yellow-400 text-8xl font-extrabold">VS</span>
          <MatchPlayerCard player={opponentDetails} onClick={setSelectedUid} />
        </div>

        <Button variant="green">Ready</Button>
      </Card>
      {selectedUid && (
        <ProfilePopup
          open={true}
          onClose={() => setSelectedUid(null)}
          userUid={selectedUid}
          variant="other"
        />
      )}
    </Background>
  );
};
export default MatchView;
