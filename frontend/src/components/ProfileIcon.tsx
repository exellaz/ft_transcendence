import React from "react";

interface ProfileIconProps {
  src: string;
  alt?: string;
  size?: number;
}

// rounded-full makes the media fill its container completely while preserving the aspect ratio
const ProfileIcon: React.FC<ProfileIconProps> = ({ src, alt = "Profile", size = 80 }) => (
  <div
    className="rounded-full bg-white border-4 border-card-blue"
    style={{ width: size, height: size, overflow: "hidden" }}
  >
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover rounded-full"
    />
  </div>
);

export default ProfileIcon;
