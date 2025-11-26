import { degToRadians } from "../utils/calculations.ts";
import { Point2D } from "./Coordinates.ts";
import { GameObject, exportCleanup } from "./GameObject.ts";
import { Glow } from "./Glow.ts";
import type { Outline } from "./Outline.ts";
import { Viewport } from "./Viewport.ts";

export enum HorizontalAlign {
  Left = "left",
  Middle = "middle",
  Right = "right",
}

export class Label extends GameObject {
  className: string = "label";

  public text: string = "default";
  public font: string = "20px Avant ";
  public color: string = "black";

  public glow?: Glow;
  public outline?: Outline;

  public fontSize?: number;

  public hAlign: HorizontalAlign = HorizontalAlign.Middle;

  constructor(params: Partial<Label>) {
    super({
      game: params.game!,
      name: "label",
    });
    Object.assign(this, params);
  }

  draw(viewport: Viewport) {
    const ctx = viewport.ctx;
    ctx.save();

    if (this.glow) {
      ctx.shadowColor = this.glow.Color;
      ctx.shadowBlur = this.glow.Blur;
      ctx.shadowOffsetX = this.glow.OffsetX;
      ctx.shadowOffsetY = this.glow.OffsetY;
      ctx.globalCompositeOperation = this.glow.blendMode;
    }

    ctx.font = this.font;
    // ctx.font = `${this.scale.x} ${this.font}`;
    ctx.fillStyle = this.color;

    if (this.outline) ctx.strokeStyle = this.outline.strokeStyle;

    const fontSize = parseInt(this.font, 10) || 20;

    ctx.lineWidth = fontSize * 0.15;

    ctx.textAlign =
      this.hAlign === HorizontalAlign.Left
        ? "left"
        : this.hAlign === HorizontalAlign.Right
          ? "right"
          : "center";
    ctx.textBaseline = "middle";

    const screenPos = this.toScreenPosition(viewport);

    ctx.translate(screenPos.x, screenPos.y);

    const parentRotation = degToRadians(this.rotation);
    ctx.rotate(parentRotation);

    if (this.outline) ctx.strokeText(this.text, 0, 0);

    ctx.fillText(this.text, 0, 0);

    ctx.restore();
  }
  export(exportStatic: boolean = false): any {
    return exportCleanup(
      {
        STATIC_name: this.name,
        className: this.className,
        id: this.id,
        position: this.position.export(),
        STATIC_scale: this.scale,
        // STATIC_rotation: this.rotation,
        STATIC_components: this.componentToJSON(exportStatic),
        STATIC_children: this.children?.map((child) => child.id),
        text: this.text,
        STATIC_font: this.font,
        STATIC_color: this.color,
        STATIC_zIndex: this.zIndex,
        STATIC_outline: this.outline,
        STATIC_glow: this.glow ? { ...this.glow } : undefined,
      },
      exportStatic,
    );
  }
}

export class OnScreenLabel extends Label {
  constructor(params: Partial<OnScreenLabel>) {
    super({ className: "OnScreenLabel" });
    Object.assign(this, params);

    this.toScreenPosition = (viewport: Viewport) => {
      return new Point2D(viewport.width / 2, viewport.height / 2);
    };
  }
}
