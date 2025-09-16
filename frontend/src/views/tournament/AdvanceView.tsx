import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import Background from "../../components/Background";
import Button from "../../components/Button";
import Card from "../../components/Card";
import TournamentHeader from "../../components/TournamentHeader";

const AdvanceView: React.FC = () => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`AdvanceView.${key}`);
  const navigate = useNavigate();

  return (
    <Background>
      <Card size="result">
        <div className="w-full h-full flex-col-between">
          <TournamentHeader>Advancement</TournamentHeader>
          <p className="text-center text-yellow-400 text-2xl">
            Congratulations! <br /> You have advanced to the next round!
          </p>
          <div className="w-40 h-40">
            <img
              src="/assets/yellow-ghost.png"
              alt="yellow-ghost.png"
              className="w-full h-full scale-150"
            />
          </div>
          <Button variant="green" onClick={() => navigate("/tournament")}>
            Continue
          </Button>
        </div>
      </Card>
    </Background>
  );
};

export default AdvanceView;
