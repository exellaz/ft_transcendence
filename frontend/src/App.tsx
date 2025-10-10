import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import BouncingSprites from "./components/BouncingSprites";

import AdvanceView from "./views/tournament/AdvanceView";
import ChooseSpriteView from "./views/ChooseSpriteView";
import CustomModeView from "./views/CustomModeView";
import DoublesRoomView from "./views/custom/DoublesRoomView";
import GameView from "./views/GameView";
import LocalGameView from "./views/custom/LocalGameView";
import LoginView from "./views/LoginView";
import MainMenuView from "./views/MainMenuView";
import MatchView from "./views/tournament/MatchView";
import ResultsView from "./views/tournament/ResultsView";
import SinglesRoomView from "./views/custom/SinglesRoomView";
import SignUpSuccessView from "./views/SignUpSuccessView";
import SignUpView from "./views/SignUpView";
import TestView from "./views/TestView";
import TournamentLobbyView from "./views/tournament/TournamentLobbyView";

// wrapper to conditionally render BouncingSprites for pre-login views.
// including BouncingSprites at the App level ensures animation consistency
// across all pre-login views.
const PreLoginWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // useLocation lets you read the current URL info inside your components.
  const location = useLocation();
  const preLoginPaths = ["/", "/login", "/signup", "/signup-success"];
  const isPreLogin = preLoginPaths.includes(location.pathname);

  return (
    <>
      {isPreLogin && <BouncingSprites />}
      {children}
    </>
  );
};

const App: React.FC = () => {
  return (
    <>
      <BrowserRouter>
        <PreLoginWrapper>
          <Routes>
            <Route path="/" element={<LoginView />} />
            <Route path="/login" element={<LoginView />} />
            <Route path="/signup" element={<SignUpView />} />
            <Route path="/signup-success" element={<SignUpSuccessView />} />
            <Route path="/main-menu" element={<MainMenuView />} />
            <Route path="/custom" element={<CustomModeView />} />
            <Route path="/local-game" element={<LocalGameView />} />
            <Route path="/choose-sprite" element={<ChooseSpriteView />} />
            <Route path="/tournament" element={<TournamentLobbyView />} />
            <Route path="/match" element={<MatchView />} />
            <Route path="/game" element={<GameView />} />
            <Route path="/advance" element={<AdvanceView />} />
            <Route path="/results" element={<ResultsView />} />
            <Route path="/singles-room/:roomId" element={<SinglesRoomView />} />
            <Route path="/doubles-room/:roomId" element={<DoublesRoomView />} />
            <Route path="/test" element={<TestView />} />
          </Routes>
        </PreLoginWrapper>
      </BrowserRouter>
    </>
  );
};

export default App;
