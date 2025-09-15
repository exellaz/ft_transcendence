import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import Button from "../components/Button";
import Card from "../components/Card";
import Logo from "../components/Logo";
import MainLayout from "../layout/MainLayout";

import CreateGamePopup from "../popups/CreateGamePopup";

const MainMenuView: React.FC = () => {
  const { t } = useTranslation();
  const translate = (key: string) => t(`NormalModeView.${key}`);
  const navigate = useNavigate();
  const [showCreateSinglesGame, setShowCreateSinglesGame] = useState(false);
  const [showCreateDoublesGame, setShowCreateDoublesGame] = useState(false);

  return (
    <MainLayout>
      <Card>
        <Logo />
        <Button variant="big" onClick={() => setShowCreateSinglesGame(true)}>
          {translate("singles")}
        </Button>
        <Button variant="big" onClick={() => setShowCreateDoublesGame(true)}>
          {translate("doubles")}
        </Button>
        <Button variant="big" onClick={() => navigate("/main-menu")}>
          {translate("back")}
        </Button>
      </Card>
      <CreateGamePopup
        gameType="singles"
        open={showCreateSinglesGame}
        onClose={() => setShowCreateSinglesGame(false)}
      />
      <CreateGamePopup
        gameType="doubles"
        open={showCreateDoublesGame}
        onClose={() => setShowCreateDoublesGame(false)}
      />
    </MainLayout>
  );
};

export default MainMenuView;
