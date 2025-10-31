import React from "react";

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: number;
  className?: string;
}

// rounded-full makes the media fill its container completely while preserving the aspect ratio
const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = "Avatar",
  size = 80,
  className,
}) => {
  const baseUrl = import.meta.env.VITE_API_URL;
  // resolve the src to the backend URL if present, else use default avatar from frontend assets folder
  const resolvedSrc = src ? `${baseUrl}${src}` : "/assets/yellow-ghost.png";

  return (
    <div
      className={`rounded-full bg-white overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={resolvedSrc}
        alt={alt}
        className="w-full h-full object-cover rounded-full"
      />
    </div>
  );
};

export default Avatar;
