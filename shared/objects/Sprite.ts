import { Vector2D } from "./Coordinates.ts";
import { Glow } from "./Glow.ts";
import { Component } from "./Component.ts";
import { Viewport } from "./Viewport.ts";
import type { Camera } from "./Camera.ts";
import { exportCleanup } from "./GameObject.ts";

export interface Renderable {
  draw(ctx: CanvasRenderingContext2D): void;
}

export class Outline {
  static CIRCLE = 0;
  static RECTANGLE = 1;

  thickness: number = 0;
  type: number = Outline.RECTANGLE;

  constructor(params: Partial<Outline>) {
    Object.assign(this, params);
  }
}

export class Sprite extends Component {
  // className: string = "sprite";

  image: HTMLImageElement | null = null;
  imagePath: string | HTMLImageElement | null = null;
  flippedHorizontal: boolean = false;
  outline: Outline | null = null;
  opacity: number = 1.0;
  blendMode: GlobalCompositeOperation = "source-over";
  glow: Glow | null = null;
  imageLoaded: boolean = false;

  width: number = -1;
  height: number = -1;

  onLoad: () => void = () => {};

  config(params: Partial<Sprite>): Sprite {
    Object.assign(this, params);
    return this;
  }

  toJSON(exportStatic: boolean = false) {
    const output = exportCleanup(
      {
        id: this.id,
        name: this.name, // Add this line
        imagePath: this.imagePath,
        STATIC_flippedHorizontal: this.flippedHorizontal,
        STATIC_outline: this.outline,
        STATIC_opacity: this.opacity,
        STATIC_blendMode: this.blendMode,
        STATIC_glow: this.glow,
      },
      exportStatic,
    );

    return output;
  }

  constructor(params: Partial<Sprite> = {}) {
    super({
      name: "sprite",
      renderable: true,
    });
    Object.assign(this, params);
  }

  init(): Component {
    if (this.image) return this;
    const diameter = Math.max(this.host!.scale.x, this.host!.scale.y);

    if (typeof document === "undefined") return this;

    const canvas = document.createElement("canvas");
    canvas.width = diameter;
    canvas.height = diameter;
    const ctx = canvas.getContext("2d");
    this.image = new Image();

    if (this.imagePath instanceof HTMLImageElement) this.image = this.imagePath;
    else if (ctx) {
      ctx.save();
      const img = new Image();
      if (this.imagePath) img.src = this.imagePath;
      else img.src = "#ffffff";
      this.image.src = img.src;
    }

    this.opacity = this.opacity;
    if (this.host!.scale.x === 0 && this.host!.scale.y === 0) {
      this.host!.scale = new Vector2D(this.image.width, this.image.height);
    }

    // this.width = this.image.width;
    // this.height = this.image.height;
    this.image.onload = () => {
      this.width = this.image!.width;
      this.height = this.image!.height;
      this.imageLoaded = true;
      if (this.onLoad) this.onLoad();
      console.log(`successfully loaded ${this.image!.src}`);
    };

    this.image.onerror = (e) => {
      console.error(`❌ Failed to load image: ${this.image?.src}`, e);
    };

    return this;
  }

  draw(viewport: Viewport, camera: Camera | null = null): void {
    if (this.imagePath !== null) drawImg(viewport, this);
  }
}

// clone(): Sprite {
//     const clonedImage = new Image();
//     clonedImage.src = this.image.src;
//     return new Sprite({
//         imagePath: clonedImage,
//         size: new Vector2D(this.size.x, this.size.y),
//         rotation: this.rotation,
//         flippedHorizontal: this.flippedHorizontal,
//         crop: this.crop,
//         outline: this.outline,
//         opacity: this.opacity,
//         blendMode: this.blendMode,
//         glow: this.glow ? new Glow(
//             this.glow.Color,
//             this.glow.Blur,
//             this.glow.OffsetX,
//             this.glow.OffsetY,
//             this.glow.blendMode
//         ) : null,
//         pos: this.pos
//     });
// }

export function drawImg(
  viewport: Viewport,
  sprite: Sprite,
  params: Partial<Sprite> = {},
) {
  const merged = Object.assign({}, sprite, params);
  const { opacity, blendMode, glow, flippedHorizontal, outline, image } =
    merged;

  if (!image) {
    return;
  }

  // World position of host
  // const worldPos = sprite.host!.getWorldPosition();
  const rotation = sprite.host!.rotation || 0;
  const scale = sprite.host!.scale || { x: 1, y: 1 };
  const position = sprite.host!.toScreenPosition(viewport);

  viewport.ctx.save();
  viewport.ctx.globalAlpha = opacity;
  viewport.ctx.globalCompositeOperation = blendMode;

  viewport.ctx.translate(position.x, position.y);
  viewport.ctx.rotate(rotation);
  if (flippedHorizontal) viewport.ctx.scale(-1, 1);

  // --- Glow ---
  if (glow) {
    viewport.ctx.save();
    viewport.ctx.globalCompositeOperation = glow.blendMode;
    viewport.ctx.shadowColor = glow.Color;
    viewport.ctx.shadowBlur = glow.Blur;
    viewport.ctx.shadowOffsetX = glow.OffsetX;
    viewport.ctx.shadowOffsetY = glow.OffsetY;

    viewport.ctx.drawImage(image, -scale.x / 2, -scale.y / 2, scale.x, scale.y);
    viewport.ctx.restore();
  }

  // --- Outline ---
  if (outline instanceof Outline) {
    viewport.ctx.beginPath();
    viewport.ctx.strokeStyle = "black";
    viewport.ctx.lineWidth = outline.thickness || 2;
    if (outline.type === Outline.CIRCLE) {
      const diameter = Math.max(scale.x, scale.y);
      viewport.ctx.arc(0, 0, diameter / 2, 0, Math.PI * 2);
    } else if (outline.type === Outline.RECTANGLE) {
      viewport.ctx.rect(-scale.x / 2, -scale.y / 2, scale.x, scale.y);
    }
    viewport.ctx.stroke();
  }

  // --- Main Image ---
  viewport.ctx.drawImage(image, -scale.x / 2, -scale.y / 2, scale.x, scale.y);
  viewport.ctx.restore();
}
