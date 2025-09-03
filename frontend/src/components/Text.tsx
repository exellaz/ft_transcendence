import React from "react";

interface TextProps {
  children: React.ReactNode;
  className?: string;
}

const Text: React.FC<TextProps> = ({ children, className = "" }) => (
  <p className={`text-center text-white text-2xl my-10 ${className}`}>
    {children}
  </p>
);

export default Text;
