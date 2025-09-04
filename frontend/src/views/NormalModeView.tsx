import React, { useState } from "react";
import Background from "../components/Background";
import Button from "../components/Button";
import Card from "../components/Card";
import Logo from "../components/Logo";
import CreateGamePopup from "../popups/CreateGamePopup";

const MainMenuView: React.FC = () => {
  const [showCreateGame, setShowCreateGame] = useState(false);
  return (
    <Background>
      <Card>
        <Logo />
        <Button variant="big" onClick={() => setShowCreateGame(true)}>
          SINGLES
        </Button>
        <Button variant="big" onClick={() => setShowCreateGame(true)}>
          DOUBLES
        </Button>
        <Button variant="big">
          BACK
        </Button>
      </Card>
      <CreateGamePopup
        open={showCreateGame}
        onClose={() => setShowCreateGame(false)}
      />
    </Background>
  );
};

export default MainMenuView;
