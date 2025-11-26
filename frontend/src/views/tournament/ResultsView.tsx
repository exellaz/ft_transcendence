import React from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import Background from "../../components/Background";
import Button from "../../components/Button";
import Card from "../../components/Card";
import TournamentHeader from "../../components/TournamentHeader";
import { closeMatchWebsocket } from "@/lib/match-websocket";
import { closeTournamentWebsocket } from "@/lib/tournament-websocket";

const ResultsView: React.FC = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const translate = (key: string) => t(`ResultsView.${key}`);
  const navigate = useNavigate();
  //  console.log("ResultsView location.state:", location.state); ////debug

  const rankingData: Record<
    number,
    { imageUrl: string; message1: string; message2: string }
  > = {
    1: {
      imageUrl: "/assets/gold.png",
      message1: translate("medal_message1"),
      message2: translate("medal_message2_gold"),
    },
    2: {
      imageUrl: "/assets/silver.png",
      message1: translate("medal_message1"),
      message2: translate("medal_message2_silver"),
    },
    3: {
      imageUrl: "/assets/bronze.png",
      message1: translate("medal_message1"),
      message2: translate("medal_message2_bronze"),
    },
  };

  const participationImage = "/assets/participation.png";
  const getParticipationMessage = (position: number) =>
    t("ResultsView.participation_message2", {
      position,
    });

  const ranking = location.state.winnerRank || location.state.loserRank;

  // Usage:
  const data = rankingData[ranking] || {
    imageUrl: participationImage,
    message1: translate("participation_message1"),
    message2: getParticipationMessage(ranking),
  };

  return (
    <Background>
      <Card size="result">
        <div className="w-full h-full flex-col-between">
          <TournamentHeader>{translate("results")}</TournamentHeader>
          <p
            className={`text-center text-yellow-400 ${
              ranking <= 3 ? "text-3xl" : "text-2xl"
            }`}
          >
            {data.message1} <br /> {data.message2}
          </p>
          <div className={ranking <= 3 ? "w-36 h-48" : "w-30 h-40"}>
            <img src={data.imageUrl} alt="result" className="w-full h-full" />
          </div>
          <Button
            variant="green"
            onClick={() => {
              const roomId = Number(location.state?.roomId ?? -1);
              const clientId = Number(location.state?.clientId ?? -1);
              const lastTournamentId = Number(
                location.state?.lastTournamentId ?? 0,
              );
              // close match socket (room) and tournament lobby socket (if present)
              closeMatchWebsocket(roomId, clientId);

              //close tournament socket
              const tId = Number(
                sessionStorage.getItem("tournamentId") ??
                  lastTournamentId ??
                  -1,
              );
              if (tId > 0) {
                try {
                  closeTournamentWebsocket(tId, clientId);
                } catch (e) {
                  console.warn("failed to close tournament ws", e);
                }
              }

              // Clear tournament ID from session
              try {
                sessionStorage.removeItem("tournamentId");
              } catch {}

              // navigate to main menu
              navigate("/main-menu");
            }}
          >
            {translate("leave")}
          </Button>
        </div>
      </Card>
    </Background>
  );
};

export default ResultsView;
