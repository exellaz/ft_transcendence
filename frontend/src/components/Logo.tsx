import React from "react";

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "" }) => (
  <div className={`${className}`}>
    <img src="/assets/pong-logo.png" alt="Pong Logo" />
  </div>
);

export default Logo;
