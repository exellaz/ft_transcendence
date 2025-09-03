import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  color?: string; // e.g. "bg-yellow-400", "bg-red-500"
  onClick?: () => void;
  className?: string;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children,
  color = "bg-yellow-400",
  onClick,
  className = "",
  icon,
}) => (
  <button
    onClick={onClick}
    className={`w-full rounded-full py-2 font-bold text-center ${color} ${className}`}
  >
    {icon && <span className="inline-block mr-2 align-middle">{icon}</span>}
    {children}
  </button>
);

export default Button;
