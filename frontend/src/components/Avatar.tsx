import React from "react";

interface AvatarProps {
  src: string;
  alt?: string;
  size?: number;
}

// rounded-full makes the media fill its container completely while preserving the aspect ratio
const Avatar: React.FC<AvatarProps> = ({ src, alt = "Avatar", size = 80 }) => (
  <div
    className="rounded-full bg-white border-4 border-card-blue overflow-hidden"
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
