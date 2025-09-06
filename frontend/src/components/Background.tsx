import React from "react";

interface BackgroundProps {
  children: React.ReactNode;
}

const Background: React.FC<BackgroundProps> = ({ children }) => (
  <div
    className="min-h-screen w-full flex items-center justify-center"
    style={{
      backgroundImage: `url(/assets/grass.png)`,
      backgroundRepeat: "repeat",
    }}
  >
    {children}
  </div>
);

export default Background;
