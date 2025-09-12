import React from "react";

import Background from "../components/Background";
import LanguageSwitcher from "../components/LanguageSwitcher";

interface PreLoginLayoutProps {
  children: React.ReactNode;
}

const PreLoginLayout: React.FC<PreLoginLayoutProps> = ({ children }) => {
  return (
    <Background>
      {children}
      <footer className="fixed bottom-0 w-full bg-grass-green flex justify-center z-50">
        <LanguageSwitcher />
      </footer>
    </Background>
  );
};

export default PreLoginLayout;
