import React from "react";
import pongLogo from "../assets/pong-logo.png";

interface PongLogoProps {
  className?: string;
}

const PongLogo: React.FC<PongLogoProps> = ({ className = "" }) => (
  <div className={`${className}`}>
    <img src={pongLogo} alt="Pong Logo" />
  </div>
);

export default PongLogo;
