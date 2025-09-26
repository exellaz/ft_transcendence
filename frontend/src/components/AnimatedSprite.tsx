import React, { useEffect, useState } from "react";

interface AnimatedSpriteProps {
  src: string;
  size?: number;
  speed?: number;
  delay?: number;
  horizontalPosition: number; // 0-100 (percentage from left)
  mirrorSprite?: boolean
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
  size = 80,
  speed = 5,
  delay = 0,
  horizontalPosition,
  mirrorSprite = false
}) => {
  // Randomize starting position (0 to window height)
  const [position, setPosition] = useState(() => {
    return Math.random() * (window.innerHeight - size);
  });
  // Randomize starting direction
  const [direction, setDirection] = useState(() => {
    return Math.random() > 0.5 ? 1 : -1; // Randomly up or down
  }); // 1 = down, -1 = up

  useEffect(() => {
    const startTime = Date.now() + delay;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < 0) {
        requestAnimationFrame(animate);
        return;
      }

      setPosition((prevPos) => {
        const windowHeight = window.innerHeight;
        const spriteHeight = size;
        const maxPosition = windowHeight - spriteHeight;

        let newPos = prevPos + direction * speed;
        let newDirection = direction;

        // Bounce off edges
        if (newPos >= maxPosition) {
          newPos = maxPosition;
          newDirection = -1;
        } else if (newPos <= 0) {
          newPos = 0;
          newDirection = 1;
        }

        setDirection(newDirection);
        return newPos;
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
        top: `${position}px`,
        transform: `translateX(-50%) ${mirrorSprite ? 'scaleX(-1)' : ''}` // Center horizontally
      }}
    />
  );
};

export default AnimatedSprite;
