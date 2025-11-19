import { StrictMode } from "react";
import { BrowserRouter } from "react-router-dom";
import { createRoot } from "react-dom/client";
import { LanguageProvider } from "./context/LanguageProvider";
import { UserProvider } from "./context/UserProvider.tsx";
import App from "./App.tsx";
import "./style.css";
import { OnlineStatusProvider } from "./context/OnlineStatusProvider.tsx";
import { QueryClientProvider } from "@tanstack/react-query";
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./lib/queryClient";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <UserProvider>
          <BrowserRouter>
            <OnlineStatusProvider>
              <App />
            </OnlineStatusProvider>
          </BrowserRouter>
        </UserProvider>
      </LanguageProvider>
      {/* DevTools will provide a floating panel to see the state of the cache, 
      queries and mutations - useful for debugging */}
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
  </StrictMode>,
);
