import React, { useState } from "react";
import Background from "../components/Background";
import Button from "../components/Button";
import Card from "../components/Card";
import Logo from "../components/Logo";
import SettingsPopup from "../popups/SettingsPopup";

const MainMenuView: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  return (
    <Background>
      <Card>
        <Logo />
        <Button variant="big">TOURNAMENT MODE</Button>
        <Button variant="big">NORMAL MODE</Button>
        <Button variant="big" onClick={() => setShowSettings(true)}>
          SETTINGS
        </Button>
      </Card>
      <SettingsPopup open={showSettings} onClose={() => setShowSettings(false)} />
    </Background>
  );
};

export default MainMenuView;
