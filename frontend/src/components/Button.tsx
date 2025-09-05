import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  variant?: "default" | "defaultRed" | "big" | "green" | "red";
  onClick?: () => void;
  className?: string;
  icon?: React.ReactNode;
}

const variantClasses: Record<string, string> = {
  default: "w-full rounded-full py-2 bg-yellow-400",
  defaultRed: "w-full rounded-full py-2 bg-red-500 text-white",
  big: "w-full rounded-3xl h-20 text-2xl my-3 bg-yellow-400",
  green: "w-32 rounded bg-green-500 hover:bg-green-600 text-black py-2",
  red: "w-32 rounded bg-red-500 hover:bg-red-600 text-white py-2",
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
      className={`font-bold text-center ${baseClasses} ${className}`}
    >
      {icon && <span className="inline-block mr-2 align-middle">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
