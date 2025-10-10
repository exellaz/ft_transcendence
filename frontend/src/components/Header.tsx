import React from "react";

const Header: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <p className={`text-white text-5xl font-bold text-center ${className}`}>
    {children}
  </p>
);

export default Header;
