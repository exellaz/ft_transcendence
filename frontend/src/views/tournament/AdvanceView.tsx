import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { goToNextRoundExternal } from "../../views/GameView";

import Background from "../../components/Background";
import Button from "../../components/Button";
import Card from "../../components/Card";
import TournamentHeader from "../../components/TournamentHeader";

const AdvanceView: React.FC = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const translate = (key: string) => t(`AdvanceView.${key}`);
  const navigate = useNavigate();
  const [isAdvancing, setIsAdvancing] = React.useState(false);
  const [countdown, setCountDown] = React.useState(10); // 10s timer
  //  console.log("AdvanceView location.state:", location.state); ////debug

  // Countdown Timer force to join the next game
  React.useEffect(() => {
    if (countdown <= 0) {
      // Optional: Auto-click continue OR let backend handle the forfeiture
      handleContinueClick();
      return;
    }
    const timer = setInterval(() => setCountDown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  async function handleContinueClick() {
    const lastTournamentId = Number(location.state?.lastTournamentId ?? 0);
    const clientId = Number(location.state?.clientId ?? -1);
    const roomId = Number(location.state?.roomId ?? -1);
    const tournamentDb = location.state?.tournamentDb ?? null;
    const playerSprite = location.state?.playerSprite ?? "";

    // move to next round if winner
    setIsAdvancing(true);
    try {
      if (lastTournamentId) {
        await goToNextRoundExternal({
          lastTournamentId,
          tournamentDb,
          clientId,
          roomId,
          playerSprite,
          navigate,
        });
        return; // goToNextRoundExternal will navigate
      }
      navigate("/tournament");
    } finally {
      setIsAdvancing(false);
    }
  }

  // helper to get basename from path ( for png name )
  function basename(path?: string): string {
    if (!path) return "";
    // normalize backslashes and split by slash, return last segment
    return path.replace(/\\/g, "/").split("/").pop() || "";
  }

  return (
    <Background>
      <Card size="result">
        <div className="w-full h-full flex-col-between">
          <TournamentHeader>{translate("advancement")}</TournamentHeader>
          <p className="text-center text-yellow-400 text-2xl">
            {translate("congratulations")} <br /> {translate("next_round")}
          </p>

          <div className="w-40 h-40">
            <img
              src={location.state?.playerSprite}
              alt={basename(location.state?.playerSprite)}
              className="w-full h-full scale-150"
            />
          </div>
          <Button
            variant="green"
            onClick={handleContinueClick}
            disabled={isAdvancing}
          >
            {translate("continue")} {`(${countdown} sec)`}
          </Button>
        </div>
      </Card>
    </Background>
  );
};

export default AdvanceView;
