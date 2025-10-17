import { clampPosition } from "../utils/calculations.ts";
import type { Component } from "./Component.ts";
import { interpolate, Point2D, Vector2D } from "./Coordinates.ts";
import { exportCleanup, GameObject } from "./GameObject.ts";
import { Sprite } from "./Sprite.ts";
import type { Viewport } from "./Viewport.ts";

export class Interpolate {
  public target!: GameObject;
  public targetOffset: Vector2D = new Vector2D(0, 0);
  public clamp: Vector2D = new Vector2D(7, 7);
  public slowness: number = 2;

  constructor(params: Partial<Interpolate>) {
    Object.assign(this, params);
  }

  export() {
    return {
      targetOffset: this.targetOffset,
      clamp: this.clamp,
      slowness: this.slowness,
    };
  }
}

export class ImageObject extends GameObject {
  sprite: Sprite | null = null;
  scaleFactor: Vector2D = new Vector2D(1, 1);
  params;

  interpolate: Interpolate = new Interpolate({});
  private truePos: Point2D;
  loaded: boolean = false;
  className: string = "imageObject";

  clientUpdate(): void {
    if (this.sprite !== undefined && this.sprite !== null && !this.loaded) {
      this.sprite.init();
      return;
    }

    this.scale = new Vector2D(this.sprite!.width, this.sprite!.height).multiply(
      this.scaleFactor,
    );

    this.interpolate.target = this.parent!;

    if (this.interpolate.target !== null) {
      const endPosition = this.interpolate.target.position.add(
        this.interpolate.targetOffset,
      );
      this.truePos = interpolate(
        this.truePos,
        endPosition,
        this.interpolate.slowness,
      );
      this.position = this.truePos;
      this.truePos = clampPosition(
        this.truePos,
        endPosition,
        this.interpolate.clamp,
      );
    }
  }

  constructor(params: Partial<ImageObject>) {
    super({});
    Object.assign(this, params);

    this.truePos = this.position;
    this.params = params;

    this.onUpdate = () => {};
    this.components = new Map<number, Component>();
    this.sprite = new Sprite({
      ...params.sprite,
      onLoad: () => {
        this.loaded = true;
        this.scale = new Vector2D(
          this.sprite!.width,
          this.sprite!.height,
        ).multiply(this.scaleFactor);
      },
    });

    this.sprite.host = this;
    this.getWorldPosition = (added: Vector2D) => {
      return this.position.add(this.interpolate.targetOffset);
    };
  }

  override draw(viewport: Viewport) {
    this.sprite!.draw(viewport);
  }

  init() {}

  export(exportStatic: boolean = false) {
    // console.log(Object.entries(this.sprite));
    return exportCleanup(
      {
        id: this.id,
        className: this.className,
        STATIC_sprite: this.sprite!.toJSON(exportStatic),
        STATIC_zIndex: this.zIndex,
        STATIC_position: this.position.export(),
        STATIC_scaleFactor: this.scaleFactor,
        STATIC_interpolate: this.interpolate.export(),
      },
      exportStatic,
    );
  }
}

//todo fix the revive and update methods using seperate tester file
// todo outptu from client shows that the width and height are undefined, which is why the image is so small
