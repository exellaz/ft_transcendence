import type { Camera } from "./Camera.ts";
import { Vector2D, Point2D } from "./Coordinates.ts";

export class Viewport {
  ctx!: CanvasRenderingContext2D;
  width!: number;
  height!: number;
  camera: Camera | null = null;
  constructor(params: Partial<Viewport>) {
    Object.assign(this, params);
  }

  toScreenCoords(position: Point2D): Point2D {
    const canvasCenter = new Vector2D(this.width / 2, this.height / 2);
    if (this.camera !== null) {
      return position
        .add(canvasCenter)
        .subtract(this.camera.position.toVector2D());
    }
    return position.add(canvasCenter);
  }
}
