import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  variant?:
    | "yellow"
    | "green"
    | "red"
    | "brown"
    | "smallGreen"
    | "smallRed"
    | "longYellow"
    | "longWhite"
    | "bigYellow"
    | "profile"
    | "dropdown"
    | "send"
    | "mapSelector";
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

const padding = "py-3";
const longRound = `w-full rounded-full ${padding}`;
const shortRound = `w-36 rounded-full ${padding}`;
const smallRound = "rounded-full px-4 py-1";
const yellow = "bg-yellow-400 hover:bg-yellow-500 text-black hover:text-white";
const green = "bg-green-500 hover:bg-green-600 text-black hover:text-white";
const red = "bg-red-500 hover:bg-red-600 text-black hover:text-white";
const brown = "bg-brown hover:bg-yellow-500 text-white hover:text-black";
const white = "bg-white text-black hover:bg-gray-300";

const variantClasses: Record<string, string> = {
  yellow: `${shortRound} ${yellow}`,
  green: `${shortRound} ${green}`,
  red: `${shortRound} ${red}`,
  brown: `${shortRound} ${brown}`,
  smallGreen: `${smallRound} ${green}`,
  smallRed: `${smallRound} ${red}`,
  longYellow: `${longRound} ${yellow}`,
  longWhite: `${longRound} ${white}`,
  bigYellow: `w-full h-full rounded-3xl text-2xl ${yellow}`,
  profile: `w-60 rounded-full text-xl ${padding} ${yellow}`,
  dropdown: `w-48 border border-gray-400 rounded ${padding} ${white}`,
  send: `rounded px-4 py-2 ${yellow}`,
  mapSelector: `w-12 h-12 rounded-full text-6xl pb-4 flex-row-center ${brown}`,
};

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "yellow",
  onClick,
  disabled = false,
  className = "",
  icon,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`font-bold text-center transition-colors ${
        variantClasses[variant]
      } ${className} ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      {icon && <span className="inline-block mr-2 align-middle">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
