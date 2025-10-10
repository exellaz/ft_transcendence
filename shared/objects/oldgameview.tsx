// import React, { useEffect, useState, useRef } from "react";
// import { useTranslation } from "react-i18next";
// import { useNavigate } from "react-router-dom";
// import { useUser } from "../context/UserProvider";

// import Background from "../components/Background";
// import TournamentHeader from "../components/TournamentHeader";
// import { Sprite } from "@shared/objects/Sprite"
// import { HitBox } from "@shared/objects/HitBox";
// import { Glow } from "@shared/objects/Glow";
// import { Label } from "@shared/objects/Label";
// import { ImageObject } from "@shared/objects/ImageObject";
// import { Ball } from "@shared/game/ball";
// import { OnScreenLabel } from "@shared/objects/Label";
// import { GameObject } from "@shared/objects/GameObject";
// import { Arrow } from "@shared/game/Padel";
// import { Player } from "@shared/game/Player";
// import { Point2D, Vector2D } from "@shared/objects/Coordinates";
// import { GameSettings, PongGame, Team } from "@shared/game/pong";
// import type { Component } from "@shared/objects/Component";
// import { Viewport } from "@shared/objects/Viewport";
// import type { Camera } from "@shared/objects/Camera";

// function isArrowKey(e: KeyboardEvent): boolean {
// 	return e.key === "ArrowUp" || e.key === "ArrowDown";
// }

// // TODO not populating data beyond the initial handshake

// const componentMap: Record<string, new (params: any) => any> = {
// 	"Point2D": function (params: any) { return new Point2D(params.x, params.y); } as any,
// 	"Vector2D": function (params: any) { return new Vector2D(params.x, params.y); } as any,
// 	"sprite": Sprite,
// 	"glow": Glow,
// 	"hitbox": HitBox,
// };

// const gameObjectMap: Record<string, new (params: any) => any> = {
// 	"imageObject": ImageObject,
// 	"label": Label,
// 	"ball": Ball,
// 	"OnScreenLabel": OnScreenLabel,
// 	"gameObject": GameObject,
// 	"arrow": Arrow,
// 	"player": Player
// }

// function revive(obj: any): any {
// 	// -- handle arrays --
// 	if (Array.isArray(obj))
// 		return obj.map(revive);

// 	// -- handle object (nested) --
// 	if (obj && typeof obj === "object") {
// 		const { className } = obj;

// 		// If the object matches a known component, rebuild as an instance
// 		// -end of recursion
// 		if (className && componentMap[className]) {
// 			const revivedParams: Record<string, any> = {};
// 			for (const key in obj)
// 				revivedParams[key] = revive(obj[key]);

// 			return new componentMap[className](revivedParams);
// 		}

// 		// Otherwise, recurse further
// 		for (const key in obj) {
// 			if (key === "position")
// 				obj.position = new Point2D(obj.position.x, obj.position.y);
// 			else if (key === "scaleFactor")
// 				obj.scaleFactor = new Vector2D(obj.scaleFactor.x, obj.scaleFactor.y);
// 			else
// 				obj[key] = revive(obj[key]);
// 		}
// 	}

// 	return obj;
// }

// function genericUpdate(
// 	obj: Record<string, any>,
// 	params: Record<string, any>
// ) {
// 	for (const key in params) {
// 		if (key === "parent" || key === "children") continue;

// 		const value = params[key];

// 		// -- update array types --
// 		if (Array.isArray(value)) {
// 			obj[key] = obj[key] || [];
// 			value.forEach((item, index) => {
// 				obj[key][index] = obj[key][index] || {};
// 				genericUpdate(obj[key][index], item);
// 			});
// 		}

// 		else if (key === "cUpdate" && obj.onClientUpdateId !== value) {
// 			obj.setOnClientUpdate(value);
// 			continue;
// 		}

// 		// -- update nested object types --
// 		else if (typeof value === "object" && value !== null) {
// 			obj[key] = obj[key] || {};
// 			genericUpdate(obj[key], value);
// 		}

// 		// -- assign primitive or different value --
// 		else {
// 			if (key === "id"){
// 				continue;
// 			}
// 			obj[key] = value;
// 		}
// 	}
// }

// class GameClient {

// 	private websocketRef: WebSocket | null = null;
// 	private data: Record<string, any> = {};
// 	private gameObjectRegistry = (new Map<number, GameObject>());
// 	private componentRegistry = (new Map<number, Component>());
// 	private game: PongGame = new PongGame(true, new GameSettings);
// 	private viewport: Viewport | null = null;
// 	private canvas: HTMLCanvasElement | null = null;
// 	private ctx: CanvasRenderingContext2D | null = null;

// 	private needToProcessFullState:boolean = false;

// 	handleKey(e: KeyboardEvent) {
// 		if (isArrowKey(e) && this.websocketRef?.readyState === WebSocket.OPEN) {
// 			this.sendData("input", { key: e.key, action: e.type });
// 			console.log("sent input");
// 		}
// 	}

// 	sendData(type: string, payload: Record<string, any> = {}) {
// 		if (this.websocketRef?.readyState === WebSocket.OPEN) {
// 			this.websocketRef.send(JSON.stringify({ type, payload }));
// 		}
// 	};

// 	public destroy() {
// 		this.websocketRef?.close();
// 		window.removeEventListener("keydown", this.handleKey);
// 		window.removeEventListener("keyup", this.handleKey);
// 	}

// 	constructor(
// 		canvasRef: HTMLCanvasElement | null,
// 		socketUrl: string,
// 		player: any = {
// 			clientId: 1,
// 			name: "test",
// 			sprite: 1,
// 			team: 0
// 		}
// 	) {

// 		this.websocketRef = new WebSocket(socketUrl);

// 		// -- WEBSOCKET --

// 		// send initial handshake
// 		this.websocketRef.onopen = () => {
// 			this.sendData("ready", {
// 				clientId: player.clientId,
// 				playerName: player.name,
// 				playerSprite: player.sprite,
// 				Team: player.team
// 			});
// 		}

// 		this.websocketRef.onmessage = (event) => {

// 			this.data = JSON.parse(event.data);

// 			// if (!this.needToProcessFullState)
// 			// 	this.data = data;

// 			if (this.data["type"] === "ready") {
// 				this.sendData("fetch_world");
// 				console.log("requested for full world");
// 			}

// 			if (!this.data["state"])
// 				return;
// 			if (this.data["state"]["type"] === "full") {
// 				console.log("---- received full state ---- ");
// 				let incomingData = (this.data["state"]["gameObjects"].map( (elem) => {
// 					return elem.id;
// 				}));
// 				let currentData = Array.from(this.gameObjectRegistry.keys());
// 				let incomingLen = incomingData.length;

// 				// console.log(`incoming objects length :${incomingLen} / current objects length ${this.gameObjectRegistry.size}`);
// 				// console.log(`incoming ids :${incomingData}`);
// 				// console.log(`current ids :${currentData}`);
// 				// console.log("object ids", this.gameObjectRegistry.keys());

// 				// for (const id of incomingData) {
// 					// console.log(this.getObject(id) === undefined);
// 				// }

// 				// this.needToProcessFullState = true;
// 				this.sendData("received_full_state");
// 			}
// 		};

// 		this.websocketRef.onclose = () => console.log("❌ Disconnected");

// 		this.handleKey = this.handleKey.bind(this);
// 		// -- KEYBOARD --

// 		window.addEventListener("keydown", this.handleKey);
// 		window.addEventListener("keyup", this.handleKey);

// 		this.canvas = canvasRef;
// 		if (!this.canvas) return;

// 		this.ctx = this.canvas.getContext("2d");
// 		if (!this.ctx) return;

// 		this.viewport = new Viewport({
// 			ctx: this.ctx,
// 			width: this.canvas.width,
// 			height: this.canvas.height
// 		});

// 		this.loop = this.loop.bind(this);
// 	}

// 	start() {
// 		this.loop();
// 	}

// 	loop() {

// 		if (this.data === undefined || this.data["state"] === undefined) {
// 			requestAnimationFrame(this.loop);
// 			return;
// 		}

// 		if (this.data["bgColor"])
// 			this.game.world.bgColor = this.data["bgColor"];

// 		// -- sync server components with components
// 		for (const stateComponent of this.data["state"]["components"] ?? []) {
// 			const component = this.componentRegistry.get(stateComponent.id);

// 			if (component !== undefined)
// 				Object.assign(component, revive(stateComponent));
// 			else if (componentMap[stateComponent.name])
// 				this.componentRegistry.set(stateComponent.id, new componentMap[stateComponent.name](stateComponent));
// 		}

// 		// -- instantiate objects --
// 		for (const stateObject of this.data["state"]["gameObjects"] ?? []) {
// 			const id = stateObject["id"];
// 			let obj = this.getObject(id);

// 			if (obj === undefined) {
// 				// hydrate only once
// 				console.log("creating new instance");
// 				const revivedObject = revive(stateObject);
// 				this.setObject(stateObject["id"], this.createNewInstance(revivedObject));
// 			}

// 			else {
// 				// update from raw JSON
// 				genericUpdate(obj, stateObject);
// 				if (stateObject.className === "camera")
// 					this.viewport!.camera = (obj as Camera);
// 			}
// 		}

// 		this.needToProcessFullState = false;

// 		// Replace any numeric IDs with object references
// 		for (const [id, object] of this.gameObjectRegistry) {

// 			object.children = object.children.map((child: any) => {
// 				if (typeof child !== "number")
// 					return child;

// 				const childObj = this.gameObjectRegistry.get(child);

// 				if (childObj) {
// 					childObj.parent = object;
// 					return childObj; // replace number with actual object
// 				}
// 				else
// 					return child; // cannot link yet
// 			});
// 			object.clientUpdate();
// 		}

// 		// link components
// 		for (const [id, object] of this.gameObjectRegistry) {
// 			for (const id of object.component_list) {
// 				if (typeof id !== "number")
// 					continue;
// 				const compObj = this.componentRegistry.get(id);
// 				if (!compObj) continue;

// 				compObj.host = object;
// 				object.addComponent(compObj);
// 			}
// 		}
// 		this.draw();
// 		requestAnimationFrame(this.loop);
// 	}

// 	createNewInstance(object: any) {
// 		const params = {
// 			...object,
// 			components: [],
// 			isClient: true,
// 			component_list: object.components ?? []
// 		};
// 		const objectInstance = gameObjectMap[object.className] ?
// 			new gameObjectMap[object.className](params) :
// 			new GameObject(params);
// 		return objectInstance;
// 	}

// 	draw() {
// 		const renderList = Array.from(this.gameObjectRegistry.values())
// 			.sort((a, b) => a.zIndex - b.zIndex);

// 		// -- CLEAR CANVAS --
// 		this.ctx!.clearRect(0, 0, this.canvas!.width, this.canvas!.height);
// 		this.ctx!.fillStyle = this.game.world.bgColor;
// 		this.ctx!.fillRect(0, 0, this.canvas!.width, this.canvas!.height);

// 		// -- RENDER OBJECTS --
// 		for (const clientObj of renderList)
// 			clientObj.draw(this.viewport!);
// 	}

// getObject(id: number) {
// 	return this.gameObjectRegistry.get(id);
// }
// setObject(id: number, object: any) {
// 	this.gameObjectRegistry.set(id, object);
// }
// }

// import { useGameWebSocket, draw_container } from "../lib/game-websocket";
// import { useBlockLeave } from "../utils/blockRefresh";

// const GameView: React.FC = () => {
// 	const canvasRef = useRef<HTMLCanvasElement>(null);

// 	const { t } = useTranslation();
// 	const translate = (key: string) => t(`GameView.${key}`);
// 	const [stage, setStage] = useState<"quarterfinals" | "semifinals" | "finals">("quarterfinals");

// 	useEffect(() => {
// 		let gameClient = new GameClient(canvasRef.current, "ws://localhost:3000/ws");

// 		gameClient.start();
// 		return () => {
// 			gameClient.destroy(); // ✅ cleanup
// 		};

// 	}, []);

// 	return (
// 		<Background variant="plain">
// 			<div className="w-full h-full flex-col-center gap-10 px-25">
// 				<TournamentHeader>
// 					{stage.charAt(0).toUpperCase() + stage.slice(1)} Match
// 				</TournamentHeader>
// 				<div className="w-full h-[500px] flex-col-center border-4 border-yellow-400 text-white text-9xl text-center">
// 					<canvas
// 						ref={canvasRef}   // ✅ fixed
// 						width={880}
// 						height={500}
// 						className="rounded-lg shadow-lg border-4 border-cyan-400 bg-gray-800"
// 					/>
// 				</div>
// 			</div>
// 		</Background>
// 	);
// };

// export default GameView;
