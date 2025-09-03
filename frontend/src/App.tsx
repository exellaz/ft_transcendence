import React from "react";
// react-router-dom is a library that lets you do client-side routing
// (switching pages without a full reload).
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginView from "./views/LoginView";
import SignUpView from "./views/SignUpView";
// import SignupView from "./views/SignupView"; // when you create it

const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<LoginView />} />
      <Route path="/signup" element={<SignUpView />} />
    </Routes>
  </BrowserRouter>
);

export default App;
