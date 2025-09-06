import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginView from "./views/LoginView";
import MainMenuView from "./views/MainMenuView";
import NormalModeView from "./views/NormalModeView";
import SignUpView from "./views/SignUpView";
import SignUpSuccessView from "./views/SignUpSuccessView";
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
        </Routes>
      </BrowserRouter>
      <Popup open={showPopup} onClose={() => setShowPopup(false)} />
    </>
  );
};

export default App;
