import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = "" }) => (
  <div className={`bg-card-blue w-1/4 h-3/4 min-w-[380px] min-h-[520px] p-10 rounded-3xl flex flex-col items-center ${className}`}>
    {children}
  </div>
);

export default Card;
