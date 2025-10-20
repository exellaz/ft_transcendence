import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import RequireAuth from "./components/RequireAuth";
import RedirectIfAuth from "./components/RedirectIfAuth";

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

import BouncingSprites from "./components/BouncingSprites";

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
            {/* Pre-login routes - redirect away if already authenticated */}
            <Route
              path="/"
              element={
                <RedirectIfAuth>
                  <LoginView />
                </RedirectIfAuth>
              }
            />
            <Route
              path="/login"
              element={
                <RedirectIfAuth>
                  <LoginView />
                </RedirectIfAuth>
              }
            />
            <Route
              path="/signup"
              element={
                <RedirectIfAuth>
                  <SignUpView />
                </RedirectIfAuth>
              }
            />
            <Route
              path="/signup-success"
              element={
                <RedirectIfAuth>
                  <SignUpSuccessView />
                </RedirectIfAuth>
              }
            />
            {/* Protected routes - require a valid JWT */}
            <Route
              path="/main-menu"
              element={
                <RequireAuth>
                  <MainMenuView />
                </RequireAuth>
              }
            />
            <Route
              path="/custom"
              element={
                <RequireAuth>
                  <CustomModeView />
                </RequireAuth>
              }
            />
            <Route
              path="/local-game-setup"
              element={
                <RequireAuth>
                  <LocalGameView />
                </RequireAuth>
              }
            />
            <Route
              path="/local-game"
              element={
                <RequireAuth>
                  <GameView />
                </RequireAuth>
              }
            />
            <Route
              path="/choose-sprite"
              element={
                <RequireAuth>
                  <ChooseSpriteView />
                </RequireAuth>
              }
            />
            <Route
              path="/tournament"
              element={
                <RequireAuth>
                  <TournamentLobbyView />
                </RequireAuth>
              }
            />
            <Route
              path="/match"
              element={
                <RequireAuth>
                  <MatchView />
                </RequireAuth>
              }
            />
            <Route
              path="/game"
              element={
                <RequireAuth>
                  <GameView />
                </RequireAuth>
              }
            />
            <Route
              path="/advance"
              element={
                <RequireAuth>
                  <AdvanceView />
                </RequireAuth>
              }
            />
            <Route
              path="/results"
              element={
                <RequireAuth>
                  <ResultsView />
                </RequireAuth>
              }
            />
            <Route
              path="/singles-room/:roomId"
              element={
                <RequireAuth>
                  <SinglesRoomView />
                </RequireAuth>
              }
            />
            <Route
              path="/doubles-room/:roomId"
              element={
                <RequireAuth>
                  <DoublesRoomView />
                </RequireAuth>
              }
            />
            {/* Miscellaneous routes */}
            <Route path="/test" element={<TestView />} />
          </Routes>
        </PreLoginWrapper>
      </BrowserRouter>
    </>
  );
};

export default App;
