import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ensureClientId } from "../utils/utils.ts";

import Button from "../components/Button";
import Card from "../components/Card";
import Logo from "../components/Logo";
import MainLayout from "../layout/MainLayout";

import SettingsPopup from "../popups/SettingsPopup";
import ConfirmationPopup from "../popups/ConfirmationPopup";

const MainMenuView: React.FC = () => {

  //? For testing purpose, assign a test user name and sprite based on client ID
  const clientId = ensureClientId(); //? make a test user id
  const clientIdLastDigit = parseInt(clientId.slice(-1));
  if (clientIdLastDigit % 2 === 0) {
	  sessionStorage.setItem("pongUserName", "player 1"); //? make a test user name
	  sessionStorage.setItem("pongUserSprite", "../../../public/assets/green-ghost.png"); //? make a test user sprite
  } else {
	  sessionStorage.setItem("pongUserName", "player 2"); //? make a test user name
	  sessionStorage.setItem("pongUserSprite", "../../../public/assets/yellow-ghost.png"); //? make a test user sprite
  }

  const { t } = useTranslation();
  const translate = (key: string) => t(`MainMenuView.${key}`);
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [showJoinTournament, setShowJoinTournament] = useState(false);

  return (
    <MainLayout>
      <Card>
        <Logo />
        <Button variant="bigYellow" onClick={() => setShowJoinTournament(true)}>
          {translate("tournament_mode")}
        </Button>
        <Button variant="bigYellow" onClick={() => navigate("/normal")}>
          {translate("normal_mode")}
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
        redirectPath="/choose-sprite"
      />
    </MainLayout>
  );
};

export default MainMenuView;
