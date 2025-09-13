import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = "" }) => (
  <div className={`bg-card-blue w-[450px] h-[600px] min-w-[450px] min-h-[600px] p-10 rounded-3xl flex flex-col items-center justify-between ${className}`}>
    {children}
  </div>
);

export default Card;
