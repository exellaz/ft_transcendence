import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import Background from "../components/Background";
import Button from "../components/Button";
import Card from "../components/Card";
import Logo from "../components/Logo";
import ProfileDropdown from "../components/ProfileDropdown";

import CreateGamePopup from "../popups/CreateGamePopup";

const MainMenuView: React.FC = () => {
  const [showCreateSinglesGame, setShowCreateSinglesGame] = useState(false);
  const [showCreateDoublesGame, setShowCreateDoublesGame] = useState(false);
  const navigate = useNavigate();

  return (
    <Background>
      <ProfileDropdown />
      <Card>
        <Logo />
        <Button variant="big" onClick={() => setShowCreateSinglesGame(true)}>
          SINGLES
        </Button>
        <Button variant="big" onClick={() => setShowCreateDoublesGame(true)}>
          DOUBLES
        </Button>
        <Button variant="big" onClick={() => navigate("/main-menu")}>
          BACK
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
    </Background>
  );
};

export default MainMenuView;
