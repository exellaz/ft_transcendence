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
      <div className="fixed bottom-0 flex-row-center z-50">
        <LanguageSwitcher />
      </div>
    </Background>
  );
};

export default PreLoginLayout;
