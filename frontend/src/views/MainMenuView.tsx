import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import Background from "../components/Background";
import Button from "../components/Button";
import Card from "../components/Card";
import Logo from "../components/Logo";

import SettingsPopup from "../popups/SettingsPopup";

const MainMenuView: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const navigate = useNavigate();

  return (
    <Background>
      <Card>
        <Logo />
        <Button variant="big">
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
    </Background>
  );
};

export default MainMenuView;
