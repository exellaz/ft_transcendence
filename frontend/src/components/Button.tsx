import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  variant?: "default" | "defaultWhite" | "big" | "green" | "red" | "yellow" | "brown" | "profile" | "dropdown";
  onClick?: () => void;
  className?: string;
  icon?: React.ReactNode;
}

const variantClasses: Record<string, string> = {
  default:
    "w-full rounded-full py-2 bg-yellow-400 hover:bg-yellow-500 text-black hover:text-white",
  defaultWhite:
    "w-full rounded-full py-2 bg-white text-black hover:bg-gray-300",
  big: "w-full rounded-3xl h-20 text-2xl my-3 bg-yellow-400 hover:bg-yellow-500 text-black hover:text-white",
  green:
    "w-32 rounded-full bg-green-500 hover:bg-green-600 text-black hover:text-white py-2",
  red: "w-32 rounded-full bg-red-500 hover:bg-red-600 text-black hover:text-white py-2",
  yellow:
    "w-32 rounded-full bg-yellow-400 hover:bg-yellow-500 text-black hover:text-white py-2",
  brown:
    "w-32 rounded-full bg-brown hover:bg-yellow-500 text-white hover:text-black py-2",
  profile:
    "w-60 rounded-full bg-yellow-400 text-black hover:bg-yellow-500 hover:text-white text-xl py-2",
  dropdown:
    "bg-white border border-gray-400 text-card-blue py-2 rounded shadow font-bold w-48 hover:bg-gray-100 hover:border-card-blue hover:text-black",
};

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "default",
  onClick,
  className = "",
  icon,
}) => {
  const baseClasses = variantClasses[variant] || variantClasses.default;

  return (
    <button
      onClick={onClick}
      className={`font-bold text-center cursor-pointer transition-colors ${baseClasses} ${className}`}
    >
      {icon && <span className="inline-block mr-2 align-middle">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
