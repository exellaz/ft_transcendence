import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import Button from "../components/Button";
import Card from "../components/Card";
import Logo from "../components/Logo";
import MainLayout from "../layout/MainLayout";

import SettingsPopup from "../popups/SettingsPopup";
import JoinTournamentPopup from "../popups/JoinTournamentPopup";

const MainMenuView: React.FC = () => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`MainMenuView.${key}`);
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [showJoinTournament, setShowJoinTournament] = useState(false);

  return (
    <MainLayout>
      <Card>
        <Logo />
        <Button variant="big" onClick={() => setShowJoinTournament(true)}>
          {translate("tournament_mode")}
        </Button>
        <Button variant="big" onClick={() => navigate("/normal")}>
          {translate("normal_mode")}
        </Button>
        <Button variant="big" onClick={() => setShowSettings(true)}>
          {translate("settings")}
        </Button>
      </Card>
      <SettingsPopup
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />
      <JoinTournamentPopup
        open={showJoinTournament}
        onClose={() => setShowJoinTournament(false)}
      />
    </MainLayout>
  );
};

export default MainMenuView;
