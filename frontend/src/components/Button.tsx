import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  variant?:
    | "default"
    | "defaultWhite"
    | "big"
    | "green"
    | "red"
    | "greenSmall"
    | "redSmall"
    | "yellow"
    | "brown"
    | "profile"
    | "dropdown"
    | "send";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

const yellow = "bg-yellow-400 hover:bg-yellow-500 text-black hover:text-white";
const green = "bg-green-500 hover:bg-green-600 text-black hover:text-white";
const red = "bg-red-500 hover:bg-red-600 text-black hover:text-white";

const variantClasses: Record<string, string> = {
  default: `w-full rounded-full py-2 ${yellow}`,
  defaultWhite:
    "w-full rounded-full py-2 bg-white text-black hover:bg-gray-300",
  big: `w-full h-30 rounded-3xl text-2xl my-3 ${yellow}`,
  green: `w-32 rounded-full py-2 ${green}`,
  red: `w-32 rounded-full py-2 ${red}`,
  greenSmall: `rounded-full px-4 py-1 ${green}`,
  redSmall: `rounded-full px-4 py-1 ${red}`,
  yellow: `w-32 rounded-full ${yellow} py-2`,
  brown:
    "w-32 rounded-full bg-brown hover:bg-yellow-500 text-white hover:text-black py-2",
  profile:
    "w-60 rounded-full bg-yellow-400 text-black hover:bg-yellow-500 hover:text-white text-xl py-2",
  dropdown:
    "bg-white border border-gray-400 text-card-blue py-2 rounded shadow font-bold w-48 hover:bg-gray-100 hover:border-card-blue hover:text-black",
  send: `px-4 py-2 ${yellow} rounded`,
};

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "default",
  onClick,
  disabled = false,
  className = "",
  icon,
}) => {
  const baseClasses = variantClasses[variant] || variantClasses.default;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`font-bold text-center transition-colors ${baseClasses} ${className} ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      {icon && <span className="inline-block mr-2 align-middle">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
