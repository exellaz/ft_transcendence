import React, { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { toast, ToastContainer, Slide } from "react-toastify";
import type { FriendMessageMsg } from "./context/OnlineStatusProvider";
import { useTabLock } from "./hooks/tabLock";

// components
import BouncingSprites from "./components/BouncingSprites";
import CatchAllRedirect from "./components/CatchAllRedirect";
import CustomToast from "./components/CustomToast";
import RedirectIfAuth from "./components/RedirectIfAuth";
import RequireAuth from "./components/RequireAuth";
import RequireGameMode from "./components/RequireGameMode";
import BlockedMultipleTabs from "./components/BlockedPage";

// views
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
import TournamentLobbyView from "./views/tournament/TournamentLobbyView";
import LocalTournamentSetup from "./views/LocalTournamentSetup"; // Adjust path if needed

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
  const location = useLocation();
  const hideToastPaths = [
    "/",
    "/login",
    "/signup",
    "/signup-success",
    "/game",
    "/local-game",
  ];
  const hideToast = hideToastPaths.includes(location.pathname);

  useTabLock();

  useEffect(() => {
    const handler = (event: CustomEvent<FriendMessageMsg>) => {
      // toast calls the individual notifications
      // you can either pass plain text or a React element to it
      const { username, message } = event.detail;
      // immediately close any existing toast
      toast.dismiss();
      toast(<CustomToast username={username} message={message.message} />);
    };

    window.addEventListener("newMessage", handler as EventListener);

    return () => {
      window.removeEventListener("newMessage", handler as EventListener);
    };
  }, []);

  return (
    <>
      {/* ToastContainer is like a global manager that controls where, how, and how many toasts appear.*/}
      {!hideToast && (
        <ToastContainer
          position="top-center"
          hideProgressBar
          autoClose={5000}
          limit={1}
          pauseOnHover
          closeOnClick
          closeButton={false}
          // otherwise default toast will have a white background
          toastClassName={() => "bg-transparent"}
          transition={Slide}
        />
      )}
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
            path="/local-tournament"
            element={
              <RequireAuth>
                <LocalTournamentSetup />
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
                <RequireGameMode allowed={["local", "local-tournament"]}>
                  <GameView />
                </RequireGameMode>
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
          <Route
            path="/choose-sprite"
            element={
              <RequireAuth>
                <RequireGameMode allowed={["tournament"]}>
                  <ChooseSpriteView />
                </RequireGameMode>
              </RequireAuth>
            }
          />
          <Route
            path="/tournament/:tournamentId"
            element={
              <RequireAuth>
                <RequireGameMode allowed={["tournament"]}>
                  <TournamentLobbyView />
                </RequireGameMode>
              </RequireAuth>
            }
          />
          <Route
            path="/match/:matchId"
            element={
              <RequireAuth>
                <RequireGameMode allowed={["tournament"]}>
                  <MatchView />
                </RequireGameMode>
              </RequireAuth>
            }
          />
          <Route
            path="/game"
            element={
              <RequireAuth>
                <RequireGameMode allowed={["custom", "remote", "tournament"]}>
                  <GameView />
                </RequireGameMode>
              </RequireAuth>
            }
          />
          <Route
            path="/advance"
            element={
              <RequireAuth>
                <RequireGameMode allowed={["tournament"]}>
                  <AdvanceView />
                </RequireGameMode>
              </RequireAuth>
            }
          />
          <Route
            path="/results"
            element={
              <RequireAuth>
                <RequireGameMode allowed={["tournament"]}>
                  <ResultsView />
                </RequireGameMode>
              </RequireAuth>
            }
          />
          <Route
            path="/blocked-multiple-tabs"
            element={<BlockedMultipleTabs />}
          />
          {/* Miscellaneous routes */}
          {/*<Route path="/test" element={<TestView />} />*/}
          {/* Handles all other routes */}
          {/* - redirects to /login or /main-menu depending on auth status */}
          <Route path="*" element={<CatchAllRedirect />} />
        </Routes>
      </PreLoginWrapper>
    </>
  );
};

export default App;
