import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import AdvanceView from "./views/tournament/AdvanceView";
import ChooseSpriteView from "./views/ChooseSpriteView";
import DoublesRoomView from "./views/normal/DoublesRoomView";
import GameView from "./views/GameView";
import LoginView from "./views/LoginView";
import MainMenuView from "./views/MainMenuView";
import MatchView from "./views/tournament/MatchView";
import NormalModeView from "./views/NormalModeView";
import ResultsView from "./views/tournament/ResultsView";
import SinglesRoomView from "./views/normal/SinglesRoomView";
import SignUpSuccessView from "./views/SignUpSuccessView";
import SignUpView from "./views/SignUpView";
import TournamentLobbyView from "./views/tournament/TournamentLobbyView";

import TestView from "./views/TestView"
import Popup from "./popups/SettingsPopup";
import ChoosePlayer from "./views/mockUser";

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
          <Route path="/singles-room/:roomId" element={<SinglesRoomView />} />
          <Route path="/doubles-room/:roomId" element={<DoublesRoomView />} />
          <Route path="/test" element={<TestView />} />
		  <Route path="/mock" element={<ChoosePlayer />} /> { /* backdoor for testing player selection */ }
        </Routes>
      </BrowserRouter>
      <Popup open={showPopup} onClose={() => setShowPopup(false)} />
    </>
  );
};

export default App;
