import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import Avatar from "../components/Avatar";
import Background from "../components/Background";
import Button from "../components/Button";
import Card from "../components/Card";
import TournamentHeader from "../components/TournamentHeader";

const player1 = {
  username: "Player1",
  spriteUrl: "/assets/yellow-ghost.png",
  color: "text-red-400",
};

const player2 = {
  username: "Player2",
  spriteUrl: "/assets/green-ghost.png",
  color: "text-blue-400",
};

const MatchView: React.FC = () => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`MatchView.${key}`);

  return (
    <Background>
      <Card size="wide">
        <TournamentHeader>Match</TournamentHeader>
        <div className="flex items-center justify-center gap-16 py-12">
          {/* Player 1 */}
          <div className="flex flex-col items-center">
            <Avatar src={player1.spriteUrl} size={120} />
            <span className={`mt-4 text-2xl font-bold ${player1.color}`}>
              {player1.username}
            </span>
          </div>
          {/* VS */}
          <span className="text-yellow-400 text-5xl font-extrabold px-8">
            VS
          </span>
          {/* Player 2 */}
          <div className="flex flex-col items-center">
            <Avatar src={player2.spriteUrl} size={120} />
            <span className={`mt-4 text-2xl font-bold ${player2.color}`}>
              {player2.username}
            </span>
          </div>
        </div>
        <Button variant="green">Ready</Button>
      </Card>
    </Background>
  );
};
export default MatchView;
