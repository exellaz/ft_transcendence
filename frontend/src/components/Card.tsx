import React from "react";

interface CardProps {
  children: React.ReactNode;
  size?: "default" | "wide";
  className?: string;
}

const Card: React.FC<CardProps> = ({
  children,
  size = "default",
  className = "",
}) => {
  const sizeClasses =
    size === "wide"
      ? "w-[550px] h-[450px] min-w-[550px] min-h-[450px]"
      : "w-[450px] h-[600px] min-w-[450px] min-h-[600px]";
  return (
    <div
      className={`bg-card-blue p-10 rounded-3xl flex flex-col items-center justify-between ${sizeClasses} ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
