import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ensurePlayerId } from "../lib/requestBackend.api.ts";

import Button from "../components/Button";
import Card from "../components/Card";
import Logo from "../components/Logo";
import MainLayout from "../layout/MainLayout";

import SettingsPopup from "../popups/SettingsPopup";
import ConfirmationPopup from "../popups/ConfirmationPopup";

/**
 * @brief is just a test user generator
*/
function mockUser() {
  const clientId = ensurePlayerId();

  const existing = sessionStorage.getItem("playerInfo");
  if (existing) return JSON.parse(existing);

  function generateName() {
    const names = ["alice", "bob", "charlie", "dave", "eve"];
    return names[Math.floor(Math.random() * names.length)];
  }

  function generateSprite() {
    const sprites = [
      "../../../assets/green-ghost.png",
      "../../../assets/white-ghost.png",
      "../../../assets/blue-ghost.png",
      "../../../assets/purple-ghost.png",
      "../../../assets/yellow-ghost.png",
    ];
    return sprites[Math.floor(Math.random() * sprites.length)];
  }

  const playerInfo = {
    id: clientId,
    name: generateName(),
    sprite: generateSprite(),
  };

  sessionStorage.setItem("playerInfo", JSON.stringify(playerInfo));
  return playerInfo;
}

mockUser(); //? For testing purpose, create a mock user if not already present

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
