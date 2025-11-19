import { interpolate, Point2D, Vector2D } from "../objects/Coordinates.ts";
import { exportCleanup, GameObject } from "../objects/GameObject.ts";
import { Sprite } from "../objects/Sprite.ts";
import { HitBox } from "../objects/HitBox.ts";
import { Glow } from "../objects/Glow.ts";
import { BlendMode } from "../objects/Blendmodes.ts";
import { Padel } from "./Padel.ts";
import { Team } from "./pong.ts";

export class Ball extends GameObject {
  lastPadelHit: Padel | null = null;
  collided: boolean = false;
  static MAX_BOUNCE_ANGLE = Math.PI / 3;
  increasingVelocity: number = 1;
  targetScale: Vector2D;
  hitbox: HitBox;
  sprite: Sprite;

  init() {}

  calculateAngle(collidingPadel: Padel) {
    // get center of padel
    const paddleCenterY =
      collidingPadel.position.y + collidingPadel.scale.y / 2;

    // get center of ball
    const ballCenterY = this.position.y + this.scale.y / 2;

    // Calculate intersection
    const relativeIntersectY = ballCenterY - paddleCenterY;
    const normalizedIntersectY =
      relativeIntersectY / (collidingPadel.scale.y / 2);
    const clampedIntersectY = Math.max(-1, Math.min(normalizedIntersectY, 1));

    // Set fixed X velocity, direction based on team
    const direction = collidingPadel.team === Team.TEAM_RIGHT ? -1 : 1;
    this.velocity.x = this.game!.gameSettings.ballSpeed * direction;

    // Set Y velocity based on intersection
    const randomJitter = (Math.random() - 0.5) * 80 * this.increasingVelocity;
    this.velocity.y = clampedIntersectY * 200 + randomJitter;
  }

  export(exportStatic: boolean = false) {
    return exportCleanup({
      className: "ball",
      id: this.id,
      position: this.position.export(),
      STATIC_scale: this.scale,
      STATIC_components: this.componentToJSON(exportStatic),
      STATIC_zIndex: this.zIndex,
    });
  }

  constructor(params: { position: Point2D; game: any }) {
    super({
      position: params.position,
      game: params.game,
      scale: new Vector2D(1, 1),
      name: "ball",
      maximumVelocity: new Vector2D(1300, 1300),
    });

    this.targetScale = this.scale;
    this.scale = new Vector2D(
      this.game?.gameSettings.ballSize!,
      this.game?.gameSettings.ballSize!,
    );

    this.onClientUpdate = () => {
      this.rotation += 0.3;
      this.scale = interpolate(
        this.scale.toPoint(),
        this.targetScale.toPoint(),
        5,
      ).toVector2D();

      // console.log("ball size: ", this.game?.gameSettings.ballSize!);

      if (this.position.x === 0) {
        this.scale = new Vector2D(1, 1);
        this.targetScale = new Vector2D(
          this.game?.gameSettings.ballSize!,
          this.game?.gameSettings.ballSize!,
        );
      }
    };

    this.sprite = new Sprite({
      imagePath: "assets/ball.png",
      glow: new Glow({
        Color: "#3C2000",
        Blur: 10,
        OffsetX: 0,
        OffsetY: 0,
        blendMode: BlendMode.Multiply,
      }),
    });

    this.hitbox = new HitBox({
      host: this,
      onCollide: (otherHitBox) => {
        //console.log("colliding"); ////debug
        const other = otherHitBox.host;

        if (!(other instanceof Padel)) {
          return;
        }

        // ignores getting hit by the same padel twice
        if (this.lastPadelHit === other) {
          return;
        }

        // // swap velocity when hitting teammate of the same team
        // const randomJitter = (Math.random() - 0.5) * 80;
        // this.velocity.y += randomJitter;
        // if (
        // 	this.lastPadelHit !== null &&
        // 	this.lastPadelHit.team === other.team
        // ) {
        // 	this.velocity.x = (-this.velocity.x) * this.increasingVelocity;
        // 	this.increasingVelocity +=0.05;
        // }

        // inverse velocity when hit
        else {
          this.calculateAngle(other);
          this.velocity.x *= this.increasingVelocity;
          this.increasingVelocity += 0.05;
        }
        this.lastPadelHit = other;
        this.collided = true;
      },
    });
    this.addComponent(this.hitbox);
    this.addComponent(this.sprite);

    this.onUpdate = () => {
      if (this.position.y < -this.game!.world.viewport.height / 2) {
        this.position.y = -this.game!.world.viewport.height / 2;
        this.velocity.y *= -1;
      } else if (this.position.y > this.game!.world.viewport.height / 2) {
        this.position.y = this.game!.world.viewport.height / 2;
        this.velocity.y *= -1;
      }

      // -- CHECK IF HITTING GOAL --
      if (this.position.x < this.game!.teamLeft.goalPostEnd) {
        this.position.x = this.game!.teamLeft.goalPostEnd;
        this.onHitGoal(Team.TEAM_LEFT);
      } else if (this.position.x > this.game!.teamRight.goalPostEnd) {
        this.position.x = this.game!.teamRight.goalPostEnd;
        this.onHitGoal(Team.TEAM_RIGHT);
      }

      return true;
    };
  }

  start(team: Team = Team.TEAM_LEFT) {
    this.game!.ball.velocity.x =
      this.game!.gameSettings.ballSpeed * (team === Team.TEAM_LEFT ? 1 : -1);
  }

  onHitGoal(team: Team) {
    this.increasingVelocity = 1;
    this.lastPadelHit = null;
    this.velocity.x = 0;

    this.game!.world.addTimer("Ball Timer", 0.3, () => {
      this.position.x = 0;
      this.velocity.x = 0;

      this.game!.onHitGoal(team);
    });
  }
}
