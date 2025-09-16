import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import Background from "../../components/Background";
import Button from "../../components/Button";
import Card from "../../components/Card";
import TournamentHeader from "../../components/TournamentHeader";

const ResultsView: React.FC = () => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`ResultsView.${key}`);
  const navigate = useNavigate();

  const rankingData: Record<number, { imageUrl: string; message1: string, message2: string }> = {
    1: {
      imageUrl: "/assets/gold.png",
      message1: "Congratulations!",
      message2: "You won gold!"
    },
    2: {
      imageUrl: "/assets/silver.png",
      message1: "Congratulations!",
      message2: "You won silver!"
    },
    3: {
      imageUrl: "/assets/bronze.png",
      message1: "Congratulations!",
      message2: "You won bronze!",
    },
  };

  const participationImage = "/assets/participation.png";
  const getParticipationMessage = (position: number) =>
    `You placed ${position}th overall.`;

  // TODO: Replace with actual ranking from props, state, or API
  const ranking = 4; 

  // Usage:
  const data = rankingData[ranking] || {
    imageUrl: participationImage,
    message1: "Thank you for participating!",
    message2: getParticipationMessage(ranking),
  };

  return (
    <Background>
      <Card size="result">
        <div className="w-full h-full flex-col-between">
          <TournamentHeader>Results</TournamentHeader>
          <p className={`text-center text-yellow-400 ${ranking <= 3 ? "text-3xl" : "text-2xl"}`}>
            {data.message1} <br /> {data.message2}
          </p>
          <div className={ranking <= 3 ? "w-36 h-48" : "w-30 h-40"}>
            <img
              src={data.imageUrl}
              alt="result"
              className="w-full h-full"
            />
          </div>
          <Button variant="green" onClick={() => navigate("/main-menu")}>
            Leave
          </Button>
        </div>
      </Card>
    </Background>
  );
};

export default ResultsView;
