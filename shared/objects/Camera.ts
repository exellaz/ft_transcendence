import { lastElem } from "@shared/utils/indexing.ts";
import {
  Point2D,
  Vector2D,
  interpolate,
  randomBetween,
} from "./Coordinates.ts";
import { GameObject } from "./GameObject.ts";

export class Camera extends GameObject {
  public shakeValue: Vector2D = new Vector2D(0, 0);
  public target: GameObject | null = null;
  public rawPosition: Point2D;
  public className: string = "camera";
  public isFixed: boolean = false;

  constructor(params: Partial<Camera>) {
    const startingPos = new Point2D(0, 0);
    super({
      position: startingPos,
    });
    Object.assign(this, params);
    this.name = "camera";
    this.rawPosition = startingPos;
    this.position = startingPos;

    this.onUpdate = () => {
      if (this.isFixed) return;
      this.position.x += 0.01;

      if (this.target) {
        this.rawPosition = interpolate(
          this.rawPosition,
          new Point2D(this.target.position.x, 0),
          60,
        );
      }

      this.position = this.rawPosition.add(
        new Vector2D(
          randomBetween(-this.shakeValue.x, this.shakeValue.x),
          randomBetween(-this.shakeValue.y, this.shakeValue.y),
        ),
      );
      this.shakeValue = this.shakeValue.subtract(
        new Vector2D(170, 170).multiply(this.game?.delta ?? 1),
      );

      if (this.shakeValue.x < 0) this.shakeValue = new Vector2D(0, 0);

      const rightX =
        lastElem(this.game!.teamRight.playerPositions).x -
        this.game!.world.viewport.width / 2 +
        200;
      const leftX =
        lastElem(this.game!.teamLeft.playerPositions).x +
        this.game!.world.viewport.width / 2 -
        200;
      if (this.position.x > rightX) {
        this.position.x = rightX;
      }

      if (this.position.x < leftX) {
        this.position.x = leftX;
      }

      return true;
    };
  }

  export() {
    return {
      id: this.id,
      position: this.position.export(),
      className: this.className,
    };
  }
}
