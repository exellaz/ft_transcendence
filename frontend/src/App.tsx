import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import AdvanceView from "./views/tournament/AdvanceView";
import ChooseSpriteView from "./views/ChooseSpriteView";
import GameView from "./views/GameView";
import LoginView from "./views/LoginView";
import MainMenuView from "./views/MainMenuView";
import MatchView from "./views/MatchView";
import NormalModeView from "./views/NormalModeView";
import ResultsView from "./views/tournament/ResultsView";
import SignUpSuccessView from "./views/SignUpSuccessView";
import SignUpView from "./views/SignUpView";
import TournamentLobbyView from "./views/tournament/TournamentLobbyView";

import TestView from "./views/TestView"
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
          <Route path="/game" element={<GameView />} />
          <Route path="/advance" element={<AdvanceView />} />
          <Route path="/results" element={<ResultsView />} />
          <Route path="/test" element={<TestView />} />
        </Routes>
      </BrowserRouter>
      <Popup open={showPopup} onClose={() => setShowPopup(false)} />
    </>
  );
};

export default App;
