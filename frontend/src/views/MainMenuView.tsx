import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../components/Button";
import Card from "../components/Card";
import Logo from "../components/Logo";
import MainLayout from "../layout/MainLayout";

import SettingsPopup from "../popups/SettingsPopup";
import JoinTournamentPopup from "../popups/JoinTournamentPopup";

const MainMenuView: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [showJoinTournament, setShowJoinTournament] = useState(false);
  const navigate = useNavigate();

  return (
    <MainLayout>
      <Card>
        <Logo />
        <Button variant="big" onClick={() => setShowJoinTournament(true)}>
          TOURNAMENT MODE
        </Button>
        <Button variant="big" onClick={() => navigate("/normal")}>
          NORMAL MODE
        </Button>
        <Button variant="big" onClick={() => setShowSettings(true)}>
          SETTINGS
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
