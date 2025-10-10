import React from "react";

interface StatusProps {
  text: string;
  color?: "green" | "red";
  className?: string;
}

const Status: React.FC<StatusProps> = ({
  text,
  color = "green",
  className = "",
}) => (
  <div className={`flex-row-center ${className}`}>
    <span
      className={`w-2 h-2 rounded-full mr-2 ${
        color === "green" ? "bg-green-400" : "bg-red-500"
      }`}
    ></span>
    <span className={color === "green" ? "text-green-400" : "text-red-500"}>
      {text}
    </span>
  </div>
);

export default Status;
