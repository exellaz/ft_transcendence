import React from "react";

interface BackgroundProps {
  children: React.ReactNode;
  variant?: "grass" | "plain";
}

const Background: React.FC<BackgroundProps> = ({
  children,
  variant = "grass",
}) => (
  <div
    className="relative min-h-screen w-full flex-row-center"
    style={
      variant === "plain"
        ? { backgroundColor: "var(--color-card-blue)" } // or use the hex code directly
        : {
            backgroundImage: "url(/assets/grass.png)",
            backgroundRepeat: "repeat",
          }
    }
  >
    {children}
  </div>
);

export default Background;
