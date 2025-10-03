import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import Avatar from "../../components/Avatar";
import Background from "../../components/Background";
import Button from "../../components/Button";
import Card from "../../components/Card";
import TournamentHeader from "../../components/TournamentHeader";

import ChooseSpritePopup from "../../popups/ChooseSpritePopup";

interface Player {
  name: string;
  spriteUrl: string;
}

interface GameSettings {
  map: string;
  ballSpeed: number;
  ballSize: number;
  paddleSpeed: number;
}

interface GameDetails {
  player1: Player;
  player2: Player;
  gameSettings: GameSettings;
}

const LocalGameView: React.FC = () => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`LocalGameView.${key}`);

  const [player1, setPlayer1] = useState<Player>({
    name: "Player 1",
    spriteUrl: "/assets/red-ghost.png",
  });

  const [player2, setPlayer2] = useState<Player>({
    name: "Player 2",
    spriteUrl: "/assets/blue-ghost.png",
  });

  const [gameSettings, setGameSettings] = useState<GameSettings>({
    map: "stadium",
    ballSpeed: 2,
    ballSize: 2,
    paddleSpeed: 2,
  });
  const [choosingPlayer, setChoosingPlayer] = useState<1 | 2 | null>(null);

  const SpriteCard: React.FC<{
    player: Player;
    onClick: () => void;
  }> = ({ player, onClick }) => (
    <div
      className="flex-col-center gap-2 cursor-pointer"
      onClick={onClick}
      title="Change Sprite"
    >
      <Avatar src={player.spriteUrl} size={120} />
      <p>{player.name}</p>
    </div>
  );

  return (
    <Background>
      <Card size="wide">
        <TournamentHeader>{translate("local_game")}</TournamentHeader>

        <div className="w-full flex-row-between px-2 font-bold text-white text-2xl text-center">
          <SpriteCard player={player1} onClick={() => setChoosingPlayer(1)} />
          {/* VS */}
          <span className="text-yellow-400 text-8xl font-extrabold">VS</span>
          <SpriteCard player={player2} onClick={() => setChoosingPlayer(2)} />
        </div>

        <Button variant="green">{translate("ready")}</Button>
      </Card>
      <ChooseSpritePopup
        open={choosingPlayer !== null}
        onClose={() => setChoosingPlayer(null)}
        selected={choosingPlayer === 1 ? player1.spriteUrl : player2.spriteUrl}
        onSelectSprite={(sprite) => {
          if (choosingPlayer === 1) {
            setPlayer1((prev) => ({ ...prev, spriteUrl: sprite }));
          } else if (choosingPlayer === 2) {
            setPlayer2((prev) => ({ ...prev, spriteUrl: sprite }));
          }
        }}
      />
    </Background>
  );
};

export default LocalGameView;
