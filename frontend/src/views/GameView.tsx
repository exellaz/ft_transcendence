import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import Background from "../components/Background";
import TournamentHeader from "../components/TournamentHeader";

const GameView: React.FC = () => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`GameView.${key}`);
  const [stage, setStage] = useState<"quarterfinals" | "semifinals" | "finals">("quarterfinals");

  return (
    <Background variant="plain">
      <div className="w-full h-full flex-col-center gap-10 px-25">
        <TournamentHeader>
          {stage.charAt(0).toUpperCase() + stage.slice(1)} Match
        </TournamentHeader>
        <div className="w-full h-[500px] flex-col-center border-4 border-yellow-400 text-white text-9xl text-center">
          Game Canvas
        </div>
      </div>
    </Background>
  );
};
export default GameView;
