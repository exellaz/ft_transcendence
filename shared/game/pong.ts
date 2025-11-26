import type { GameSettings } from "../../backend/src/modules/room/room.ts";
import { BlendMode } from "../objects/Blendmodes.ts";
import { Camera } from "../objects/Camera.ts";
import { interpolate, Point2D, Vector2D } from "../objects/Coordinates.ts";
import { exportCleanup, GameObject } from "../objects/GameObject.ts";
import { Glow } from "../objects/Glow.ts";
import { ImageObject } from "../objects/ImageObject.ts";
import { Label, OnScreenLabel } from "../objects/Label.ts";
import { Outline } from "../objects/Outline.ts";
import { Sprite } from "../objects/Sprite.ts";
import { lastElem } from "../utils/indexing.ts";
import { Ball } from "./ball.ts";
import { GameWorld } from "./GameWorld.ts";
import { Padel } from "./Padel.ts";
import { Player } from "./Player.ts";

export type MapType = "stadium" | "mansion" | "arcade";

export enum Team {
  TEAM_LEFT = 0,
  TEAM_RIGHT = 1,
}
const paddleOffset = 250;
const goalMargin = 200;
const paddleDistanceFromCenter = 400;

export const ASSETS_PATH = "assets";
export const MAPS_PATH = `${ASSETS_PATH}/maps`;

export class GameTeam {
  score: number = 0;
  padels: Padel[] = [];
  goalPostEnd: number = 0;
  label: Label | null = null;
  playerPositions: Point2D[] = [];

  constructor(
    public game: PongGame,
    public team: number,
  ) {
    // precompute player positions
    for (let i = 0; i < game.gameSettings!.playerCount; i++) {
      this.playerPositions.push(
        new Point2D(
          team === Team.TEAM_LEFT
            ? i * paddleDistanceFromCenter * -1 - paddleOffset
            : i * paddleDistanceFromCenter + paddleOffset,
          0,
        ),
      );
    }

    if (this.game.teamSize === 1) {
      const paddleDistanceFromCenter = 400;
      this.playerPositions[0]!.x =
        paddleDistanceFromCenter * (this.team === Team.TEAM_LEFT ? -1 : 1);
    }
  }

  getPaddles(): Padel[] {
    return this.padels;
  }

  win() {
    this.score++;
    if (this.label) this.label.text = String(this.score);
    if (this.score >= this.game.gameSettings!.winningScore) {
      this.game.teamWins(this);
    }
  }

  toString() {
    return this.team === Team.TEAM_LEFT ? "Left" : "Right";
  }
}

class GameTitle extends OnScreenLabel {
  constructor(params: Partial<GameTitle>) {
    super({});
    Object.assign(this, params);

    this.interpolateScale = this.scale;

    this.onUpdate = () => {
      this.scale = interpolate(
        this.scale.toPoint(),
        this.interpolateScale.toPoint(),
        5,
      ).toVector2D();
    };
  }

  interpolateScale: Vector2D;

  export(exportStatic: boolean = false): any {
    return exportCleanup(
      {
        STATIC_name: this.name,
        className: this.className,
        id: this.id,
        position: this.position.export(),
        scale: this.scale,
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

  private alternate(arr: string[]) {
    if (!arr.includes(this.text)) this.text = arr[arr.length - 1]!;
    const current = this.text;
    const index = arr.indexOf(current);
    const nextIndex = (index + 1) % arr.length;
    this.text = arr[nextIndex]!;
    this.scale = new Vector2D(1, 1);
  }

  updateLoad() {
    this.alternate(["LOADING.", "LOADING..", "LOADING..."]);
  }

  updateCountdown() {
    this.alternate(["3", "2", "1", "-"]);
  }
}

export class EngineSettings {
  playerAcceleration: number = 4300;
  playerCount: number = 2;
  ballSpeed: number = 500;
  ballSize: number = 40;

  arrowDownKey: string = "ArrowDown";
  arrowUpKey: string = "ArrowUp";
  winningScore: number = 3;
  map: MapType = "stadium";
}

const leftBoardControls = [
  ["s", "w"],
  ["r", "f"],
  ["t", "g"],
];
const rightBoardControls = [
  ["ArrowUp", "ArrowDown"],
  ["o", "l"],
  ["y", "h"],
];

enum Maps {
  Stadium = 0,
  Arcade = 1,
  Mansion = 2,
}

enum GameState {
  LOADING = 0,
  STARTING = 1,
  STARTED = 2,
  GAMEOVER = 3,
  ENDED = 4,
}

export class PongGame {
  clients!: any[];

  static globalId: number = 0;
  public id: number = -1;

  private onGameEnd?: (winner: "left" | "right" | "draw") => void;
  public onUserGameEnd?: (
    winningPlayer: Player | null,
    winnerSide: "left" | "right" | "draw",
  ) => void;

  public world: GameWorld = new GameWorld();
  public gameSettings: EngineSettings = new EngineSettings();
  public teamLeft!: GameTeam;
  public teamRight!: GameTeam;
  public fps: number = 0;
  public delta: number = 0;
  public onScreenTitle!: GameTitle;
  public ball!: Ball;

  private lastFrameTime: number = performance.now();
  private ballSpawnCooldown = 0.5;
  public teamSize!: number;

  public is2v2: boolean = false;

  state: GameState = GameState.LOADING;
  winningTeam!: GameTeam | null;

  players: Map<number, Player> = new Map<number, Player>();

  // -- client-side only --
  public isClient: boolean = false;

  // --- getters for score ---
  public get scoreLeft(): number {
    return this.teamLeft.score;
  }
  public get scoreRight(): number {
    return this.teamRight.score;
  }

  // --- force end the game with specified winner ---
  forceEnd(winner: "left" | "right" | "draw") {
    //set game to gameover state
    this.state = GameState.GAMEOVER;

    console.log("game ending abruptly due to player disconnection");

    //check who to win
    if (winner === "left") {
      this.winningTeam = this.teamLeft;
    } else if (winner === "right") {
      this.winningTeam = this.teamRight;
    } else {
      this.winningTeam = null;
    }

    // Update title text (for label display)
    if (this.onScreenTitle) {
      if (winner === "draw") {
        this.onScreenTitle.text = "Draw!";
      } else {
        const winnerPlayer = this.winningTeam!.padels[0]!.player;
        this.onScreenTitle.text = `${winnerPlayer?.name ?? winner.toUpperCase()} Wins!`;
      }
    }

    this.state = GameState.ENDED;

    // Trigger the standard onGameEnd after short delay
    setTimeout(() => {
      if (this.onGameEnd) {
        console.log("onGameEnd called after forceEnd");
        this.onGameEnd(winner);
      }
      let winningPlayer = null;
      if (winner === "left") {
        winningPlayer = this.teamLeft.padels[0]?.player;
      } else if (winner === "right") {
        winningPlayer = this.teamRight.padels[0]?.player;
      }
    }, 1000);
  }

  resetBall() {
    this.ball.position = new Point2D(0, 0);
  }

  addPlayer(player: Player) {
    const team = !player.team ? this.teamLeft : this.teamRight;
    const padel = new Padel({
      zIndex: 10,
      team: player.team,
      position: team.playerPositions[team.padels.length]!,
      player: player,
    });

    this.players.set(player["id"], player);
    team.padels.push(padel);
    player.padel = padel;
    this.world.addObject(padel);
  }

  movePaddle(direction: string, clientId: number) {
    const player = this.players.get(clientId);
    //console.log("moving", clientId); ////debug
    if (direction === "ArrowUp") player?.padel.moveUp();
    if (direction === "ArrowDown") player?.padel.moveDown();
  }

  startGame() {
    this.state = GameState.STARTING;
  }

  teamWins(team: GameTeam) {
    console.log("team wins!");
    this.state = GameState.GAMEOVER;
    this.winningTeam = team;

    setTimeout(() => {
      if (this.onGameEnd) {
        const winner = team.team === Team.TEAM_LEFT ? "left" : "right";
        this.onGameEnd(winner);
      }

      if (this.onUserGameEnd) {
        const winnerSide =
          this.winningTeam!.team === Team.TEAM_LEFT ? "left" : "right";
        const winningPlayer = this.winningTeam!.padels[0]?.player;
        this.onUserGameEnd(winningPlayer, winnerSide);
      }
    }, 2000);
  }

  update(room: any) {
    this.clients = room.clients;

    const now = performance.now();
    this.delta = (now - this.lastFrameTime) / 1000; // delta in seconds
    this.lastFrameTime = now;
    this.world.update();

    if (
      this.state === GameState.LOADING &&
      this.players.size === this.teamSize * 2
    ) {
      console.log("starting game");
      this.startGame();
    }
  }

  exportState(includeStaticObjects: boolean = false) {
    const state = this.world.exportState(includeStaticObjects);
    state["type"] = includeStaticObjects ? "full" : "partial";
    if (!includeStaticObjects) delete state["components"];

    return state;
  }

  onHitGoal(team: Team) {
    team === Team.TEAM_LEFT ? this.teamRight.win() : this.teamLeft.win();

    if (this.state == GameState.GAMEOVER) return;

    this.world.addTimer("Ball Cooldown", this.ballSpawnCooldown, () => {
      this.ball.start(team);
    });
  }

  initPongGame(scoreUI: Record<string, any>, goalImgPath: string) {
    // -- add ball --

    this.ball = this.world.addObject(
      new Ball({
        game: this,
        position: new Point2D(0, 0),
      }),
    ) as Ball;
    this.ball.zIndex = 10;

    // -- add camera  --
    this.world.camera = this.world.addObject(
      new Camera({
        position: new Point2D(0, -100),
        target: this.ball,
      }),
    ) as Camera;

    this.world.viewport.camera = this.world.camera;

    if (this.teamSize === 1) {
      this.world.camera.isFixed = true;
    }

    this.teamLeft = new GameTeam(this, Team.TEAM_LEFT);
    this.teamRight = new GameTeam(this, Team.TEAM_RIGHT);

    // -- add players --
    this.players.forEach((player) => {
      this.addPlayer(player);
    });

    this.ballSpawnCooldown = this.players.size === 2 ? 0.5 : 2;
    // -- calculate goalpost positions --

    this.teamLeft.goalPostEnd =
      lastElem(this.teamLeft.playerPositions).x - goalMargin;
    this.teamRight.goalPostEnd =
      lastElem(this.teamRight.playerPositions).x + goalMargin;

    this.onScreenTitle = this.world.addObject(
      new GameTitle({
        text: "Loading...",
        font: "75px Impact",
        color: "#ffffff",
        zIndex: 100,
        outline: new Outline({
          strokeStyle: "black",
        }),
      }),
    ) as GameTitle;

    this.world.addPeriodicTimer("title", 1, () => {
      if (this.state === GameState.LOADING) {
        this.onScreenTitle.updateLoad();
      } else if (this.state === GameState.STARTING) {
        this.onScreenTitle.updateCountdown();
        if (this.onScreenTitle.text === "-") {
          this.onScreenTitle.text = "";
          this.state = GameState.STARTED;
          //   console.log("started game"); ////debug
          this.ball.start();
        }
      } else if (this.state === GameState.GAMEOVER) {
        this.onScreenTitle.scale = new Vector2D(1, 1);
        if (!this.is2v2) {
          this.onScreenTitle.text = `${this.winningTeam!.toString()} Wins!`;
        } else {
          const winnerPlayer = this.winningTeam!.padels[0]?.player;
          this.onScreenTitle.text = `${winnerPlayer?.name ?? this.winningTeam!.toString()} Wins!`;
        }
      }
    });

    const scaleFactor = new Vector2D(0.55, 0.55);
    const goalDistanceFromCenter = 50;

    this.teamLeft.label = this.world.addObject(
      new Label({
        ...scoreUI,
        position: new Point2D(-goalDistanceFromCenter, scoreUI.y ?? 0),
      }),
    ) as Label;

    this.teamRight.label = this.world.addObject(
      new Label({
        ...scoreUI,
        position: new Point2D(goalDistanceFromCenter, scoreUI.y ?? 0),
      }),
    ) as Label;

    for (const team of [this.teamLeft, this.teamRight]) {
      this.world.addObject(
        new ImageObject({
          isStatic: true,
          scaleFactor: scaleFactor,
          position: new Point2D(team.goalPostEnd, 0),
          name: "goalpost",
          sprite: new Sprite({
            imagePath: goalImgPath,
            flippedHorizontal: team === this.teamLeft,
          }),
        }),
      );
    }
  }

  private mapStadium() {
    this.initPongGame(
      {
        text: "0",
        font: "67px Impact",
        zIndex: -10,
        color: "#ffffff",
      },
      `${MAPS_PATH}/map1/goalpost.png`,
    );
    this.world.bgColor = "#6D1A1A";
    const scaleFactor = new Vector2D(0.55, 0.55);

    // -- floor --
    this.world.addObject(
      new ImageObject({
        name: "floor",
        isStatic: true,
        zIndex: -15,
        sprite: new Sprite({
          imagePath: `${MAPS_PATH}/map1/floor3.png`,
        }),
        scaleFactor: scaleFactor,
      }),
    );

    // -- shadow --
    this.world.addObject(
      new ImageObject({
        name: "shadow",
        position: new Point2D(0, -180),
        isStatic: true,
        zIndex: 20,
        sprite: new Sprite({
          imagePath: `${MAPS_PATH}/map1/shadow.png`,
          blendMode: BlendMode.Multiply,
        }),
        scaleFactor: scaleFactor,
      }),
    );

    // -- crowd --
    for (let i = 0; i < 2; i++) {
      const object = new GameObject({
        position: new Point2D(0, -230),
        zIndex: -20,
        scale: new Vector2D(4200, 118).multiply(0.5),
      });

      object.addComponent(
        new Sprite({
          imagePath: [
            `${MAPS_PATH}/map1/crowd.png`,
            `${MAPS_PATH}/map1/crowd2.png`,
          ][i % 2]!,
        }),
      );

      object.setOnClientUpdate("moveCrowd");

      this.world.addObject(object);
    }
  }

  private mapMansion() {
    this.initPongGame(
      {
        glow: new Glow({ Color: "#47fabf" }),
        color: "#47fabf",
        text: "0",
        font: "75px Georgia",
        zIndex: -10,
        y: 20,
      },
      `${MAPS_PATH}/map2/goal.png`,
    );
    this.world.bgColor = "#000000";
    const scaleFactor = new Vector2D(0.55, 0.55);

    this.world.addObject(
      new ImageObject({
        name: "floor",
        isStatic: true,
        zIndex: -15,
        sprite: new Sprite({ imagePath: `${MAPS_PATH}/map2/background.png` }),
        scaleFactor: scaleFactor,
      }),
    );

    this.world.addObject(
      new ImageObject({
        name: "floor",
        isStatic: true,
        zIndex: 50,
        sprite: new Sprite({
          imagePath: `${MAPS_PATH}/map2/foreground.png`,
          flippedHorizontal: false,
        }),
        scaleFactor: scaleFactor,
        position: new Point2D(0, 180),
      }),
    );
  }

  private mapArcade() {
    this.initPongGame(
      {
        glow: new Glow({ Color: "#ffc02c" }),
        color: "#ffc02c",
        text: "0",
        font: "75px Impact",
        zIndex: -10,
      },
      `${MAPS_PATH}/map3/goal.png`,
    );

    this.world.bgColor = "#000000";
    const scaleFactor = new Vector2D(0.53, 0.53);

    this.world.addObject(
      new ImageObject({
        name: "floor",
        isStatic: true,
        zIndex: -15,
        sprite: new Sprite({
          imagePath: `${MAPS_PATH}/map3/background.png`,
        }),
        scaleFactor: scaleFactor,
      }),
    );
  }

  loadMap(map: MapType) {
    if (map === "stadium") this.mapStadium();
    else if (map === "mansion") this.mapMansion();
    else if (map === "arcade") this.mapArcade();
  }

  initSettings(settings: GameSettings) {
    this.gameSettings.ballSpeed = [300, 500, 800][settings.ballSpeed ?? 1]!;

    this.gameSettings.ballSize = [30, 40, 70][settings.ballSize ?? 1]!;

    this.gameSettings.winningScore = settings.scorePoint ?? 3;
    const allowedMaps: MapType[] = ["stadium", "mansion", "arcade"];
    this.gameSettings.map = allowedMaps.includes(settings.map as MapType)
      ? (settings.map as MapType)
      : "stadium";
    this.gameSettings.playerAcceleration = [3000, 4300, 6500][
      settings.paddleSpeed ?? 1
    ]!;

    // console.log("incoming settings", settings); ////debug
    // console.log("final settings", this.gameSettings); ////debug
  }

  //update setting from api setting change
  updateSettings(newSettings: Partial<GameSettings>) {
    // Merge new settings into current game settings
    this.initSettings({ ...this.gameSettings, ...newSettings });

    // If map changed, reload it
    if (newSettings.map) {
      this.world.clear();
      this.loadMap(this.gameSettings.map);
    }
  }

  initGame(
    isClient: boolean,
    incomingSettings: GameSettings,
    onGameEnd?: (winner: "left" | "right" | "draw") => void,
    teamSize: number = 1,
    onUserGameEnd?: (
      winningPlayer: Player | null,
      winnerSide: "left" | "right" | "draw",
    ) => void,
  ) {
    PongGame.globalId++;
    this.teamSize = teamSize;
    this.initSettings(incomingSettings);
    this.onGameEnd = onGameEnd ?? (() => {});
    this.onUserGameEnd = onUserGameEnd;

    if (isClient) return;

    this.is2v2 = teamSize === 1;
    this.world.game = this;
    this.id = PongGame.globalId;
    this.isClient = isClient;

    // console.log("INITIALIZED"); ////debug

    this.loadMap(this.gameSettings.map);
  }

  constructor(
    isClient: boolean,
    incomingSettings: GameSettings,
    onGameEnd?: (winner: "left" | "right" | "draw") => void,
    teamSize: number = 1,
    onUserGameEnd?: (
      winningPlayer: Player | null,
      winnerSide: "left" | "right" | "draw",
    ) => void,
  ) {
    this.initGame(
      isClient,
      incomingSettings,
      onGameEnd,
      teamSize,
      onUserGameEnd,
    );
  }

  destroy() {
    // Clear game world objects and timers
    if (this.world) {
      this.world.clear?.();
    }
    // Remove references to teams, ball, players, etc.
    this.teamLeft = undefined as any;
    this.teamRight = undefined as any;
    this.ball = undefined as any;
    this.onScreenTitle = undefined as any;
    this.winningTeam = undefined as any;
    this.players.clear();
    this.state = GameState.ENDED;
  }
}
