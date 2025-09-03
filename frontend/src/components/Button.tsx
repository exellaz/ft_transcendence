import React from "react";

interface ButtonProps {
  children: React.ReactNode;
  variant?: "default" | "slim" | "big" | "small-rectangle-brown" | "small-rectangle-yellow";
  color?: string; // Optional override
  onClick?: () => void;
  className?: string;
  icon?: React.ReactNode;
}

const variantClasses: Record<string, string> = {
  default: "w-full rounded-full py-2",
  slim: "w-full rounded-full py-1",
  big: "w-full rounded-3xl h-1/5 text-2xl my-3",
  "small-rectangle-brown": "px-4 py-2 rounded-lg bg-brown-700 text-white",
  "small-rectangle-yellow": "px-4 py-2 rounded-lg text-black",
};

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "default",
  color = "bg-yellow-400",
  onClick,
  className = "",
  icon,
}) => {
  // Allow color override, otherwise use variant's color
  const baseClasses = variantClasses[variant] || variantClasses.default;
  const colorClass = color ? color : "";

  return (
    <button
      onClick={onClick}
      className={`font-bold text-center ${baseClasses} ${colorClass} ${className}`}
    >
      {icon && <span className="inline-block mr-2 align-middle">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
