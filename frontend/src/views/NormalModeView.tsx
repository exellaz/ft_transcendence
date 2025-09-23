import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import Button from "../components/Button";
import Card from "../components/Card";
import Logo from "../components/Logo";
import MainLayout from "../layout/MainLayout";

import ConfirmationPopup from "../popups/ConfirmationPopup";

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
        <Button variant="bigYellow" onClick={() => setShowCreateSinglesGame(true)}>
          {translate("singles")}
        </Button>
        <Button variant="bigYellow" onClick={() => setShowCreateDoublesGame(true)}>
          {translate("doubles")}
        </Button>
        <Button variant="bigYellow" onClick={() => navigate("/main-menu")}>
          {translate("back")}
        </Button>
      </Card>
      <ConfirmationPopup
        text={translate("create_singles_game")}
        open={showCreateSinglesGame}
        onClose={() => setShowCreateSinglesGame(false)}
        redirectPath="/normal"
      />
      <ConfirmationPopup
        text={translate("create_doubles_game")}
        open={showCreateDoublesGame}
        onClose={() => setShowCreateDoublesGame(false)}
        redirectPath="/normal"
      />
    </MainLayout>
  );
};

export default MainMenuView;
