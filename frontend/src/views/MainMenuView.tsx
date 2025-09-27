import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ensureClientId } from "../lib/requestBackend.api.ts";

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
    const clientId = ensureClientId();

    let prevId: string | null = null;
    let playerInfo: { id: string; name: string; sprite: string } | null = null;
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
    function getPlayerInfo(newId: string) {
      if (newId !== prevId) {
        playerInfo = {
          id: newId,
          name: generateName(),
          sprite: generateSprite(),
        };
        prevId = newId;
      }
      return playerInfo;
    }
    sessionStorage.setItem("playerInfo", JSON.stringify(getPlayerInfo(clientId)));
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
