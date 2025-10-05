
import { BlendMode } from '../objects/Blendmodes.ts';
import { Camera } from '../objects/Camera.ts';
import { interpolate, Point2D, Vector2D } from '../objects/Coordinates.ts';
import { exportCleanup, GameObject } from '../objects/GameObject.ts';
import { Glow } from '../objects/Glow.ts';
import { ImageObject } from '../objects/ImageObject.ts';
import { Label, OnScreenLabel } from '../objects/Label.ts';
import { Outline } from '../objects/Outline.ts';
import { Sprite } from '../objects/Sprite.ts';
import { lastElem } from '../utils/indexing.ts';
import { Ball } from './ball.ts';
import { GameWorld } from './GameWorld.ts';
import { Padel } from './Padel.ts';
import { Player } from './Player.ts';
import { Skin } from './Skins.ts';

export enum Team {
	TEAM_LEFT = 0,
	TEAM_RIGHT = 1
}
const paddleOffset = 250;
const paddleDistance = 400;
const goalMargin = 200;
const paddleDistanceFromCenter = 400;

export const ASSETS_PATH = "assets"
export const MAPS_PATH = `${ASSETS_PATH}/maps`


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
		for (var i = 0; i < game.gameSettings!.playerCount; i++) {
			this.playerPositions.push(new Point2D(
				team === Team.TEAM_LEFT
					? (i * paddleDistanceFromCenter* -1) - paddleOffset
					: (i * paddleDistanceFromCenter) + paddleOffset,
				0
			));
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
		return (this.team === Team.TEAM_LEFT) ? "Left" : "Right";
	}
}


class GameTitle extends OnScreenLabel {
	constructor(params: Partial<GameTitle>) {
		super({});
		Object.assign(this, params);

		this.interpolateScale = this.scale;

		this.onUpdate = () => {
			this.scale = interpolate(this.scale.toPoint(), this.interpolateScale.toPoint(), 5).toVector2D();
		}
	}

	interpolateScale: Vector2D;

	export(exportStatic: boolean = false): any {
		return exportCleanup({
			STATIC_name: this.name,
			className: this.className,
			id: this.id,
			position: this.position.export(),
			scale: this.scale,
			// STATIC_rotation: this.rotation,
			STATIC_components: this.componentToJSON(exportStatic),
			STATIC_children: this.children?.map(child => child.id),
			text: this.text,
			STATIC_font: this.font,
			STATIC_color: this.color,
			STATIC_zIndex: this.zIndex,
			STATIC_outline: this.outline,
			STATIC_glow: this.glow ? { ...this.glow } : undefined,
		}, exportStatic);
	}

	private alternate(arr: string[]) {
		if (!arr.includes(this.text))
			this.text = arr[arr.length - 1];
		const current = this.text;
		const index = arr.indexOf(current);
		const nextIndex = (index + 1) % arr.length;
		this.text = arr[nextIndex];
		this.scale = new Vector2D(1, 1);
	}

	updateLoad() {
		this.alternate(["LOADING.", "LOADING..", "LOADING..."]);
	}

	updateCountdown() {
		this.alternate(["3", "2", "1", "-"]);
	}
}

export class GameSettings {
	playerAcceleration: number = 4300;
	playerCount: number = 4;
	ballSpeed: number = 500;

	arrowDownKey: string = "ArrowDown";
	arrowUpKey: string = "ArrowUp";
	winningScore: number = 3;
}


const leftBoardControls = [["s", "w"], ["r", "f"], ["t", "g"]];
const rightBoardControls = [["ArrowUp", "ArrowDown"], ["o", "l"], ["y", "h"]];


enum Maps {
	Stadium = 0,
	Arcade = 1,
	Mansion = 2
}

enum GameState {
	LOADING = 0,
	STARTING = 1,
	STARTED = 2,
	GAMEOVER = 3,
}

export class PongGame {

	clients!: any[];

	public world: GameWorld = new GameWorld();
	public gameSettings: GameSettings | null = null;
	public teamLeft!: GameTeam;
	public teamRight!: GameTeam;
	public fps: number = 0;
	public delta: number = 0;
	public onScreenTitle!: GameTitle;
	public ball!: Ball;

	static globalId: number = 0; 
	public id: number = -1; 

	private lastFrameTime: number = performance.now();
	private ballSpawnCooldown = 0.5;

	public is2v2: boolean = false;

	state: GameState = GameState.LOADING;
	winningTeam!: GameTeam;

	// -- client-side only --
	public isClient: boolean = false;



	resetBall() {
		console.log(">>> RESET BALL");
		this.ball.position = new Point2D(0, 0);
	}


	movePaddle(direction: string) {
		console.log("players left", this.teamLeft.padels.length);
		console.log("players right", this.teamRight.padels.length);

		if (direction === "ArrowUp") this.teamLeft.padels[0].moveUp();
		if (direction === "ArrowDown") this.teamLeft.padels[0].moveDown();
	}

	startGame() {
		this.state = GameState.STARTING;
	}

	teamWins(team: GameTeam) {
		this.state = GameState.GAMEOVER;
		this.winningTeam = team;
	}

	update(room: any) {
		this.clients = room.clients;

		const now = performance.now();
		this.delta = (now - this.lastFrameTime) / 1000; // delta in seconds
		this.lastFrameTime = now;
		this.world.update();


		const output = this.exportState(false);
		
		for (const paddle of this.teamLeft.getPaddles()) {
			// paddle.player.socket.send(JSON.stringify(output));

			// // console.log("socket state:", client._socket.readyState);
			// if (client && client._readyState === 1) {


			// 	try {
			// 		if (client.handshakeComplete && client.receivedFullState) {
			// 			console.log("successfully sent");
			// 			client.send(output);
			// 		}
			// 	} catch (e) {
			// 		console.error("Error sending to client:", e);
			// 	}
			// }
		}
	}

	exportState(includeStaticObjects: boolean = false) {
		let state = this.world.exportState(includeStaticObjects);
		state["type"] = includeStaticObjects ? "full" : "partial";
		if (!includeStaticObjects)
			delete state["components"];

		return state;
	}

	onHitGoal(team: Team) {
		(team === Team.TEAM_LEFT) ? this.teamRight.win() : this.teamLeft.win();


		if (this.state == GameState.GAMEOVER) 
			return;

		this.world.addTimer(this.ballSpawnCooldown, () => {
			this.ball.start(team);
		});
	}


	addPlayer(player: Player) {
		const team = (!player.team ? this.teamLeft : this.teamRight);
		const padel = new Padel({
			zIndex: 10,
			team: player.team,
			position: team.playerPositions[team.padels.length],
			player: player
		});

		team.padels.push(padel);

		this.world.addObject(padel);
	}

	initPongGame(scoreUI: Record<string, any>, goalImgPath) {

		// -- add ball --

		this.ball = this.world.addObject(new Ball({
			game: this,
			position: new Point2D(0, 0)
		})) as Ball;
		this.ball.zIndex = 10;

		// -- add camera  --
		this.world.camera = this.world.addObject(new Camera({
			position: new Point2D(0, -100),
			target: this.ball,
		})) as Camera;

		this.world.viewport.camera = this.world.camera;
		

		this.teamLeft = new GameTeam(this, Team.TEAM_LEFT);
		this.teamRight = new GameTeam(this, Team.TEAM_RIGHT);

		// this.players.forEach(player => {
		// 	this.addPlayer(player);
		// });
		
		

		// // 1v1
		// if (this.players.length === 2) {
		// 	const paddleDistanceFromCenter = 400;
		// 	this.team1.padels[0].position.x = -paddleDistanceFromCenter;
		// 	this.team2.padels[0].position.x = paddleDistanceFromCenter;
		// 	this.world.viewport.camera.isFixed = true;
		// }

		// // 2v2
		// else {
		// 	this.is2v2 = true;
		// }


		this.ballSpawnCooldown = (this.players.length === 2) ? 0.5 : 2;
		// -- calculate goalpost positions --

		this.teamLeft.goalPostEnd = lastElem(this.teamLeft.playerPositions).x - goalMargin;
		this.teamRight.goalPostEnd = lastElem(this.teamRight.playerPositions).x + goalMargin;


		this.onScreenTitle = this.world.addObject(new GameTitle({
			text: "Loading...",
			font: "75px Impact",
			color: "#ffffff",
			zIndex: 100,
			outline: new Outline({
				strokeStyle: "black"
			})
		})) as GameTitle;

		this.world.addPeriodicTimer(1, () => {

			if (this.state === GameState.LOADING) {
				
				this.onScreenTitle.updateLoad();
			}
			else if (this.state === GameState.STARTING) {
				this.onScreenTitle.updateCountdown();
				if (this.onScreenTitle.text === "-") {
					this.onScreenTitle.text = "";
					this.state = GameState.STARTED;
					this.ball.start();
				}
			}

			else if (this.state === GameState.GAMEOVER) {
				this.onScreenTitle.scale = new Vector2D(1, 1);
				if (this.is2v2) {
					this.onScreenTitle.text = `${this.winningTeam.toString()} Wins!`;
				}
				else {
					this.onScreenTitle.text = `${this.winningTeam.padels[0].player.name} Wins!`;
				}
			}
		});


		const scaleFactor = new Vector2D(0.55, 0.55);
		const goalDistanceFromCenter = 50;

		this.teamLeft.label = this.world.addObject(new Label({
			...scoreUI, position: new Point2D(-goalDistanceFromCenter, scoreUI.y ?? 0)
		})) as Label;

		this.teamRight.label = this.world.addObject(new Label({
			...scoreUI, position: new Point2D(goalDistanceFromCenter, scoreUI.y ?? 0)
		})) as Label;

		for (const team of [this.teamLeft, this.teamRight]) {
			this.world.addObject(new ImageObject({
				isStatic: true,
				scaleFactor: scaleFactor,
				position: new Point2D(team.goalPostEnd, 0),
				name: "goalpost",
				sprite:
					new Sprite({
						imagePath: goalImgPath,
						flippedHorizontal: (team === this.teamLeft)
					}),
			}))
		}
	}

	mapStadium() {
		this.initPongGame({
			text: "0",
			font: "67px Impact",
			zIndex: -10,
			color: "#ffffff"
		}, `${MAPS_PATH}/map1/goalpost.png`);
		this.world.bgColor = "#6D1A1A";
		const scaleFactor = new Vector2D(0.55, 0.55);

		// -- floor --
		this.world.addObject(new ImageObject({
			name: "floor",
			isStatic: true,
			zIndex: -15,
			sprite: new Sprite({
				imagePath: `${MAPS_PATH}/map1/floor3.png`,
			}),
			scaleFactor: scaleFactor,
		}));

		// -- shadow --
		this.world.addObject(new ImageObject({
			name: "shadow",
			position: new Point2D(0, -180),
			isStatic: true,
			zIndex: 20,
			sprite: new Sprite({
				imagePath: `${MAPS_PATH}/map1/shadow.png`,
				blendMode: BlendMode.Multiply
			}),
			scaleFactor: scaleFactor
		}));


		// -- crowd --
		for (let i = 0; i < 2; i++) {

			const object = new GameObject({
				position: new Point2D(0, -230),
				zIndex: -20,
				scale: new Vector2D(4200, 118).multiply(0.5),
			})

			object.addComponent(new Sprite({
				imagePath: [
					`${MAPS_PATH}/map1/crowd.png`,
					`${MAPS_PATH}/map1/crowd2.png`
				][i % 2],
			}))

			object.setOnClientUpdate("moveCrowd");

			this.world.addObject(object);
		}
	}


	mapMansion() {
		this.initPongGame({
			glow: new Glow({ Color: "#47fabf" }),
			color: "#47fabf",
			text: "0",
			font: "75px Georgia",
			zIndex: -10,
			y: 20,
		}, `${MAPS_PATH}/map2/goal.png`);
		this.world.bgColor = "#000000";
		const scaleFactor = new Vector2D(0.55, 0.55);

		this.world.addObject(new ImageObject({
			name: "floor",
			isStatic: true,
			zIndex: -15,
			sprite: new Sprite({ imagePath: `${MAPS_PATH}/map2/background.png` }),
			scaleFactor: scaleFactor,
		}));

		this.world.addObject(new ImageObject({
			name: "floor",
			isStatic: true,
			zIndex: 50,
			sprite: new Sprite({
				imagePath: `${MAPS_PATH}/map2/foreground.png`,
				flippedHorizontal: false,
			}),
			scaleFactor: scaleFactor,
			position: new Point2D(0, 180)
		}));
	}

	mapArcade() {
		this.initPongGame({
			glow: new Glow({ Color: "#ffc02c" }),
			color: "#ffc02c",
			text: "0",
			font: "75px Impact",
			zIndex: -10,
		}, `${MAPS_PATH}/map3/goal.png`);

		this.world.bgColor = "#000000";
		const scaleFactor = new Vector2D(0.53, 0.53);

		this.world.addObject(new ImageObject({
			name: "floor",
			isStatic: true,
			zIndex: -15,
			sprite: new Sprite({
				imagePath: `${MAPS_PATH}/map3/background.png`,
			}),
			scaleFactor: scaleFactor,
		}));

	}



	loadMap(map: Maps) {
		if (map === Maps.Stadium) this.mapStadium();
		else if (map === Maps.Mansion) this.mapMansion();
		else if (map === Maps.Arcade) this.mapArcade();
	}

	players: Player[];

	constructor(
		clientData: any,
		isClient: boolean,
		players: any[],
		settings: GameSettings,
	) {

		this.id = PongGame.globalId;

		PongGame.globalId ++;
		
		console.log("INITIALIZED");

		this.gameSettings = settings;

		this.players = [];

		for (const player of players) {
			this.players.push(new Player({
				name: player.name,
				skin: player.skin,
				team: player.team
			}))
		}

		this.isClient = isClient

		if (isClient)
			return;
		this.clients = clientData;
		this.world.game = this;


		this.loadMap(Maps.Stadium);
	}
}

