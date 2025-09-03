import React from "react";
import pongLogo from "../assets/pong-logo.png";

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "" }) => (
  <div className={`mb-3 ${className}`}>
    <img src={pongLogo} alt="Pong Logo" />
  </div>
);

export default Logo;
