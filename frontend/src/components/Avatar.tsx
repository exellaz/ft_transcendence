import React from "react";

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: number;
  className?: string;
}

// rounded-full makes the media fill its container completely while preserving the aspect ratio
const Avatar: React.FC<AvatarProps> = ({
  src = "/assets/yellow-ghost.png",
  alt = "Avatar",
  size = 80,
  className
}) => (
  <div
    className={`rounded-full bg-white overflow-hidden ${className}`}
    style={{ width: size, height: size }}
  >
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover rounded-full"
    />
  </div>
);

export default Avatar;
