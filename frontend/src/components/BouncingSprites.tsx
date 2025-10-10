import React from "react";
import AnimatedSprite from "./AnimatedSprite";
import type { AnimatedSpriteProps } from "./AnimatedSprite";

const BouncingSprites: React.FC = () => {
  const sprites: AnimatedSpriteProps[] = [
    {
      src: "/assets/yellow-ghost.png",
      horizontalPosition: 10,
      mirrorSprite: true,
    },
    {
      src: "/assets/red-ghost.png",
      horizontalPosition: 25,
      mirrorSprite: true,
    },
    {
      src: "/assets/green-ghost.png",
      horizontalPosition: 75,
    },
    {
      src: "/assets/blue-ghost.png",
      horizontalPosition: 90,
    },
  ];

  return (
    <>
      {sprites.map((sprite, index) => (
        <AnimatedSprite
          key={index}
          src={sprite.src}
          size={sprite.size}
          speed={sprite.speed}
          delay={sprite.delay}
          horizontalPosition={sprite.horizontalPosition}
          mirrorSprite={sprite.mirrorSprite}
        />
      ))}
    </>
  );
};

export default BouncingSprites;
