import React from "react";

interface CardProps {
  children: React.ReactNode;
  size?: "default" | "large" | "wide" | "result";
  className?: string;
}

const Card: React.FC<CardProps> = ({
  children,
  size = "default",
  className = "",
}) => {
  const sizeClasses: Record<string, string> = {
    default: "w-[450px] h-[600px] min-w-[450px] min-h-[600px]",
    large: "w-[900px] h-[600px] min-w-[900px] min-h-[600px]",
    wide: "w-[550px] h-[450px] min-w-[550px] min-h-[450px]",
    result: "w-[400px] h-[500px] min-w-[400px] min-h-[500px]",
  };

  return (
    <div
      className={`bg-card-blue p-10 rounded-3xl flex-col-between z-10 ${sizeClasses[size]} ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
