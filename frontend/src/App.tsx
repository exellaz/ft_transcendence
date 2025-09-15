import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import LoginView from "./views/LoginView";
import MainMenuView from "./views/MainMenuView";
import MatchView from "./views/MatchView";
import NormalModeView from "./views/NormalModeView";
import SignUpView from "./views/SignUpView";
import SignUpSuccessView from "./views/SignUpSuccessView";
import ChooseSpriteView from "./views/ChooseSpriteView";
import TournamentLobbyView from "./views/tournament/TournamentLobbyView";

import Popup from "./popups/SettingsPopup";

const App: React.FC = () => {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginView />} />
          <Route path="/login" element={<LoginView />} />
          <Route path="/signup" element={<SignUpView />} />
          <Route path="/signup-success" element={<SignUpSuccessView />} />
          <Route path="/main-menu" element={<MainMenuView />} />
          <Route path="/normal" element={<NormalModeView />} />
          <Route path="/choose-sprite" element={<ChooseSpriteView />} />
          <Route path="/tournament" element={<TournamentLobbyView />} />
          <Route path="/match" element={<MatchView />} />
        </Routes>
      </BrowserRouter>
      <Popup open={showPopup} onClose={() => setShowPopup(false)} />
    </>
  );
};

export default App;
