import React from "react";

const Subheader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <h3 className={`text-yellow-400 text-3xl font-semibold text-center ${className}`}>
    {children}
  </h3>
);

export default Subheader;
