import { BlendMode } from "../objects/Blendmodes.ts";
import { Vector2D, Point2D } from "../objects/Coordinates.ts";
import { GameObject, exportCleanup } from "../objects/GameObject.ts";
import { Glow } from "../objects/Glow.ts";
import { HitBox } from "../objects/HitBox.ts";
import { ImageObject, Interpolate } from "../objects/ImageObject.ts";
import { HorizontalAlign, Label } from "../objects/Label.ts";
import { Outline } from "../objects/Outline.ts";
import { Sprite } from "../objects/Sprite.ts";
import { Viewport } from "../objects/Viewport.ts";
import { clampPosition } from "../utils/calculations.ts";
import type { Player } from "./Player.ts";
import { Team } from "./pong.ts";
import { SKIN_PATHS, Skin } from "./Skins.ts";

export class Padel extends GameObject {
  public team!: Team;
  public player!: Player;
  public moveDownKey: string = "ArrowDown";
  public moveUpKey: string = "ArrowUp";

  isMoving: boolean = false;

  sprite!: Sprite;
  teamWins(team: Team) {}

  skinPath: string;

  export(exportStatic: boolean = false): Record<string, any> {
    const json: any = {
      STATIC_name: this.name,
      id: this.id,
      position: this.position.export(),
      STATIC_scale: this.scale,
      STATIC_rotation: this.rotation,
      STATIC_zIndex: this.zIndex,
      STATIC_children: this.children.map((child) => child.id),
      STATIC_components: this.componentToJSON(),
      STATIC_player: this.player.export(),
    };

    return exportCleanup(json, exportStatic);
  }

  constructor(params: Partial<Padel>) {
    super({
      scale: new Vector2D(60, 60),
    });

    this.addComponent(new HitBox({}));
    Object.assign(this, params);

    this.skinPath = this.skinPath =
      SKIN_PATHS[(params.player?.skin ?? Skin.ghost_dark) as Skin].base;
  }

  moveUp() {
    this.acceleration.y = -this.game!.gameSettings!.playerAcceleration;
  }

  moveDown() {
    this.acceleration.y = this.game!.gameSettings!.playerAcceleration;
  }

  init() {
    this.sprite = this.addComponent(
      new Sprite({
        imagePath: this.skinPath,
        host: this,
      }),
    ) as Sprite;

    this.addChild(
      new PadelLabel({
        text: this.player.name,
        position: new Point2D(0, -40),
        font: "bold 15px Century Gothic",
        outline: new Outline({ strokeStyle: "black" }),
        color: "#ffffff",
      }),
    );

    this.maximumVelocity = new Vector2D(
      this.game!.gameSettings!.playerAcceleration,
    ).multiply(10);

    // add shadow
    this.sprite.glow = new Glow({
      Color: "#6881a8",
      Blur: 10,
      OffsetX: 0,
      OffsetY: 5,
      blendMode: BlendMode.Multiply,
    });

    if (this.team === Team.TEAM_LEFT) this.sprite.flippedHorizontal = true;

    this.maximumVelocity = new Vector2D(
      this.game!.gameSettings!.playerAcceleration * 10,
    );

    this.onUpdate = () => {
      this.velocity.y *= 0.9;
      if (Math.abs(this.velocity.y) < 0.1) this.velocity.y = 0;

      this.position = clampPosition(
        this.position,
        new Vector2D(0, 0),
        new Vector2D(-1, this.game!.world.viewport.height / 2),
      );

      this.acceleration.y = 0;
    };

    this.addChild(
      new Arrow({
        team: this.team,
        text: this.player.name,
        game: this.game,
        parent: this,
      }),
    );

    const scaleFactor = new Vector2D(0.48, 0.48);

    const iris: string = SKIN_PATHS[this.player.skin as Skin].iris;
    const eyes: string = SKIN_PATHS[this.player.skin as Skin].eyes;

    this.addChild(
      new ImageObject({
        scaleFactor: scaleFactor,
        sprite: new Sprite({
          imagePath: eyes,
        }),
        isStatic: true,
        interpolate: new Interpolate({
          targetOffset: new Vector2D(
            this.team === Team.TEAM_RIGHT ? -3 : 3,
            -3,
          ),
          target: this,
          slowness: 1.7,
        }),
      }),
    );

    this.addChild(
      new ImageObject({
        scaleFactor: scaleFactor,
        isStatic: true,
        sprite: new Sprite({
          imagePath: iris,
        }),
        interpolate: new Interpolate({
          targetOffset: new Vector2D(
            this.team === Team.TEAM_RIGHT ? -6 : 6,
            -3,
          ),
          target: this,
          slowness: 2.5,
        }),
      }),
    );
  }
}
export class PadelLabel extends Label {
  isClient = false;

  className: string = "label";

  export(exportStatic: boolean = false): any {
    return exportCleanup(
      {
        id: this.id,
        STATIC_name: this.name,
        className: this.className,
        STATIC_position: this.position.export(),
        STATIC_scale: this.scale,
        STATIC_rotation: this.rotation,
        STATIC_components: this.componentToJSON(exportStatic),
        STATIC_children: this.children?.map((child) => child.id),
        STATIC_text: this.text,
        STATIC_font: this.font,
        STATIC_color: this.color,
        STATIC_outline: this.outline,
      },
      exportStatic,
    );
  }
}

export class Arrow extends GameObject {
  team!: Team;
  text!: string;
  declare parent: Padel;
  public skin: number = 0;

  constructor(params: Partial<Arrow>) {
    super({
      zIndex: 100,
      scale: new Vector2D(27, 32),
    });
    Object.assign(this, params);

    this.addChild(
      new Label({
        text: this.text,
        game: this.game,
        hAlign:
          this.team === Team.TEAM_LEFT
            ? HorizontalAlign.Left
            : HorizontalAlign.Right,
        font: "bold 15px Century Gothic",
        color: "#ffffff",
        outline: new Outline({}),
        // rotation: 90,
        toScreenPosition: (viewport) => {
          const x = this.team === Team.TEAM_LEFT ? 40 : viewport.width - 40;

          return new Point2D(x, this.parent.position.y + viewport.height / 2);
        },
      }),
      true,
    );

    if (!this.isClient) {
      this.skin = this.parent.player.skin;
    }

    this.addComponent(
      new Sprite({
        imagePath: SKIN_PATHS[this.skin as Skin].arrow,
        flippedHorizontal: this.team === Team.TEAM_LEFT,
      }),
    );

    this.toScreenPosition = (viewport) => {
      const x = this.team === Team.TEAM_LEFT ? 20 : viewport.width - 20;
      return new Point2D(x, this.parent.position.y + viewport.height / 2);
    };
  }

  init() {}

  draw(viewport: Viewport) {
    const screenPosition = this.parent.toScreenPosition(viewport);

    if (this.team === Team.TEAM_LEFT && screenPosition.x < 0) {
      super.draw(viewport);
    } else if (
      this.team === Team.TEAM_RIGHT &&
      screenPosition.x > viewport.width
    ) {
      super.draw(viewport);
    }
  }

  export(exportStatic?: boolean): Record<string, any> {
    return exportCleanup(
      {
        className: "arrow",
        team: this.team,
        id: this.id,
        // position: this.position,
        STATIC_scale: this.scale,
        STATIC_components: this.componentToJSON(),
        text: this.text,
        STATIC_skin: this.skin,
        // STATIC_children: this.children.map(child=>child.id),
        STATIC_zIndex: this.zIndex,
      },
      exportStatic,
    );
  }
}

// arrow is being created without the right skin, despite receiving right skin
// clientside issue
