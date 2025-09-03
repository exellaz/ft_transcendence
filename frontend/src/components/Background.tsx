import React from "react";
import grass from "../assets/grass.png";

interface BackgroundProps {
  children: React.ReactNode;
}

const Background: React.FC<BackgroundProps> = ({ children }) => (
  <div
    className="w-screen h-screen flex items-center justify-center"
    style={{
      backgroundImage: `url(${grass})`,
      backgroundRepeat: "repeat",
    }}
  >
    {children}
  </div>
);

export default Background;
