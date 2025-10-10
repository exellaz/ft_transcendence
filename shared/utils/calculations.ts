import { Point2D, Vector2D } from "../objects/Coordinates.ts";

export function oscillateValue(
  baseValue: number,
  amplitude: number,
  frequency: number,
  offset: number = 0,
): number {
  const t = performance.now() / 1000 + offset; // seconds
  return baseValue + amplitude * Math.sin(2 * Math.PI * frequency * t);
}

export function clampPosition(
  pos: Point2D | Vector2D,
  target: Point2D | Vector2D,
  clamp: Vector2D,
): Point2D {
  return new Point2D(
    clamp.x === -1
      ? pos.x
      : Math.max(target.x - clamp.x, Math.min(target.x + clamp.x, pos.x)),
    clamp.y === -1
      ? pos.y
      : Math.max(target.y - clamp.y, Math.min(target.y + clamp.y, pos.y)),
  );
}

export function degToRadians(deg: number) {
  return (deg * Math.PI) / 180;
}
