import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LanguageProvider } from "./context/LanguageProvider";
import { UserProvider } from "./context/UserProvider.tsx";
import App from "./App.tsx";
import "./style.css";
import { OnlineStatusProvider } from "./context/OnlineStatusProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LanguageProvider>
      <UserProvider>
        <OnlineStatusProvider>
          <App />
        </OnlineStatusProvider>
      </UserProvider>
    </LanguageProvider>
  </StrictMode>,
);
