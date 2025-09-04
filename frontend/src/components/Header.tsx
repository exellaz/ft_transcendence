import React from "react";

const Header: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <h2 className={`text-white text-5xl font-bold text-center mb-6 ${className}`}>
    {children}
  </h2>
);

export default Header;
