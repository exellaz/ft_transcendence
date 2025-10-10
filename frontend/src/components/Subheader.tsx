import React from "react";

const Subheader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <p
    className={`text-yellow-400 text-3xl font-semibold text-center ${className}`}
  >
    {children}
  </p>
);

export default Subheader;
