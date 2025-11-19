import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useClearGameMode } from "../hooks/useClearGameMode";

import Button from "../components/Button";
import Card from "../components/Card";
import Logo from "../components/Logo";
import MainLayout from "../layout/MainLayout";

import SettingsPopup from "../popups/SettingsPopup";
import ConfirmationPopup from "../popups/ConfirmationPopup";

const MainMenuView: React.FC = () => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`MainMenuView.${key}`);
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [showJoinTournament, setShowJoinTournament] = useState(false);

  useClearGameMode();

  return (
    <MainLayout>
      <Card className="gap-6">
        <Logo />
        <Button
          variant="bigYellow"
          onClick={() => navigate("/local-tournament")}
        >
          {translate("local_tournament")}
        </Button>
        <Button variant="bigYellow" onClick={() => setShowJoinTournament(true)}>
          {translate("tournament_mode")}
        </Button>
        <Button variant="bigYellow" onClick={() => navigate("/custom")}>
          {translate("custom_mode")}
        </Button>
        <Button variant="bigYellow" onClick={() => setShowSettings(true)}>
          {translate("settings")}
        </Button>
      </Card>
      <SettingsPopup
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />
      <ConfirmationPopup
        text={translate("join_tournament")}
        open={showJoinTournament}
        onClose={() => setShowJoinTournament(false)}
        onConfirm={() => {
          sessionStorage.setItem("gameMode", "tournament");
          navigate("/choose-sprite");
        }}
      />
    </MainLayout>
  );
};

export default MainMenuView;
