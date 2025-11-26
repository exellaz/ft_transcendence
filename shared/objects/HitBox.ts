import { Component } from "./Component.ts";
import type { Viewport } from "./Viewport.ts";
import { exportCleanup } from "./GameObject.ts";

export class HitBox extends Component {
  isColliding: boolean = false;
  public onCollide?: (other: HitBox) => void;

  constructor(params: Partial<HitBox> = {}) {
    super(params);
    this.name = "hitbox";
    Object.assign(this, params);
  }

  init(): HitBox {
    this.onUpdate = () => {
      // for (this.host.game.gameObjects)
    };
    return this;
  }

  draw(viewport: Viewport) {
    if (!this.host) return;

    viewport.ctx.save();
    viewport.ctx.strokeStyle = this.isColliding ? "green" : "red";
    viewport.ctx.lineWidth = 2;

    const center = viewport.toScreenCoords(this.host.getWorldPosition());
    const scale = this.host.scale;
    const halfScaleX = scale.x / 2;
    const halfScaleY = scale.y / 2;

    viewport.ctx.strokeRect(
      center.x - halfScaleX,
      center.y - halfScaleY,
      scale.x,
      scale.y,
    );
    viewport.ctx.restore();
  }

  isCollidingWith(other: HitBox): boolean {
    if (!this.host || !other.host) return false;

    const aPos = this.host.getWorldPosition();
    const aScale = this.host.scale;
    const bPos = other.host.getWorldPosition();
    const bScale = other.host.scale;

    const aLeft = aPos.x - aScale.x / 2;
    const aRight = aPos.x + aScale.x / 2;
    const aTop = aPos.y - aScale.y / 2;
    const aBottom = aPos.y + aScale.y / 2;

    const bLeft = bPos.x - bScale.x / 2;
    const bRight = bPos.x + bScale.x / 2;
    const bTop = bPos.y - bScale.y / 2;
    const bBottom = bPos.y + bScale.y / 2;

    return aLeft < bRight && aRight > bLeft && aTop < bBottom && aBottom > bTop;
  }

  toJSON(exportStatic: boolean = false) {
    return exportCleanup(
      {
        id: this.id,
        name: this.name,
      },
      exportStatic,
    );
  }
}
