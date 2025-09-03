import React from "react";

interface IconProps {
  src: string;
  alt?: string;
  className?: string;
}

const Icon: React.FC<IconProps> = ({ src, alt = "", className = "" }) => (
  <img src={src} alt={alt} className={className} />
);

export default Icon;
