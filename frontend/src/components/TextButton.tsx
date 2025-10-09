import React from "react";

interface TextButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const TextButton: React.FC<TextButtonProps> = ({
  children,
  onClick,
  className = "",
}) => (
  <button
    onClick={onClick}
    className={`text-yellow-300 text-sm hover:text-yellow-400 hover:underline transition-colors ${className}`}
  >
    {children}
  </button>
);

export default TextButton;
