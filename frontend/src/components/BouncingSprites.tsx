import React from 'react';
import AnimatedSprite from './AnimatedSprite';

const BouncingSprites: React.FC = () => {
  const sprites = [
    {
      src: '/assets/yellow-ghost.png',
      horizontalPosition: 10,
      mirrorSprite: true
    },
    {
      src: '/assets/red-ghost.png', // If you have different colored ghosts
      horizontalPosition: 25,
      mirrorSprite: true
    },
    {
      src: '/assets/green-ghost.png',
      horizontalPosition: 75,
    },
    {
      src: '/assets/blue-ghost.png', // Reuse but different position
      horizontalPosition: 90,
    }
  ];

  return (
    <>
      {sprites.map((sprite, index) => (
        <AnimatedSprite
          key={index}
          src={sprite.src}
          horizontalPosition={sprite.horizontalPosition}
          speed={sprite.speed}
          delay={sprite.delay}
          size={sprite.size}
          mirrorSprite={sprite.mirrorSprite}
        />
      ))}
    </>
  );
};

export default BouncingSprites;
