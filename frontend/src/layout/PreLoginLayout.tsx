import React, { useState } from "react";

import Background from "../components/Background";
import LanguageSwitcher from "../components/LanguageSwitcher";

interface PreLoginLayoutProps {
  children: React.ReactNode;
}

const PreLoginLayout: React.FC<PreLoginLayoutProps> = ({ children }) => {

  return (
    <Background>
      <LanguageSwitcher className="absolute bottom-5"/>
      {children}
    </Background>
  );
};

export default PreLoginLayout;
