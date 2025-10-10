import React, { useEffect, useState } from "react";

export interface AnimatedSpriteProps {
  src: string;
  size?: number;
  speed?: number;
  delay?: number;
  horizontalPosition: number; // 0-100 (percentage from left)
  mirrorSprite?: boolean;
}

// Animation loop using requestAnimationFrame
// (a browser API that will schedule a function to run before next browser repaint)
// 1. animate() called
// 2. setPosition() updates state
// 3. React re-renders component
// 4. Browser applies new CSS top value
// 5. requestAnimationFrame() schedules next frame
// 6. Browser repaints screen (sprite appears moved)
// 7. repeat...
const AnimatedSprite: React.FC<AnimatedSpriteProps> = ({
  src,
  size = 100,
  speed = 5,
  delay = 0,
  horizontalPosition,
  mirrorSprite = false,
}) => {
  // 1 = down, -1 = up
  // Randomize starting direction and starting position (0 to window height)
  const [sprite, setSprite] = useState(() => ({
    pos: Math.random() * (window.innerHeight - size),
    dir: Math.random() > 0.5 ? 1 : -1,
  }));

  useEffect(() => {
    const startTime = Date.now() + delay;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < 0) {
        requestAnimationFrame(animate);
        return;
      }

      setSprite((prev) => {
        const windowHeight = window.innerHeight;
        const spriteHeight = size;
        const maxPosition = windowHeight - spriteHeight;

        let newPos = prev.pos + prev.dir * speed;
        let newDir = prev.dir;

        // Bounce off edges
        if (newPos >= maxPosition) {
          newPos = maxPosition;
          newDir = -1;
        } else if (newPos <= 0) {
          newPos = 0;
          newDir = 1;
        }

        return { pos: newPos, dir: newDir };
      });

      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <img
      src={src}
      alt="Animated sprite"
      className="fixed pointer-events-none z-10"
      style={{
        width: size,
        height: size,
        left: `${horizontalPosition}%`,
        top: `${sprite.pos}px`,
        transform: `translateX(-50%) ${mirrorSprite ? "scaleX(-1)" : ""}`, // Center horizontally
      }}
    />
  );
};

export default AnimatedSprite;
