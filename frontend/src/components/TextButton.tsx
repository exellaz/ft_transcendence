import React from "react";

interface TextButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const TextButton: React.FC<TextButtonProps> = ({ children, onClick, className = "" }) => (
  <button
    onClick={onClick}
    className={`text-yellow-300 text-sm p-6 ${className}`}
  >
    {children}
  </button>
);

export default TextButton;
