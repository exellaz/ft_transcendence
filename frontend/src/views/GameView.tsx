import React, { useState, useRef, useEffect } from "react";
import { useTranslation, withSSR } from "react-i18next";
import Background from "../components/Background";
import TournamentHeader from "../components/TournamentHeader";
import { Sprite } from "@shared/objects/Sprite"
import { HitBox } from "@shared/objects/HitBox";
import { Glow } from "@shared/objects/Glow";
import { Label } from "@shared/objects/Label";
import { ImageObject } from "@shared/objects/ImageObject";
import { Ball } from "@shared/game/ball";
import { OnScreenLabel } from "@shared/objects/Label";
import { GameObject } from "@shared/objects/GameObject";
import { Arrow } from "@shared/game/Padel";
import { Player } from "@shared/game/Player";
import { Point2D, Vector2D } from "@shared/objects/Coordinates";
import { PongGame } from "@shared/game/pong";
import type { Component } from "@shared/objects/Component";
import { Viewport } from "@shared/objects/Viewport";
import type { Camera } from "@shared/objects/Camera";


function isArrowKey(e: KeyboardEvent): boolean {
	return e.key === "ArrowUp" || e.key === "ArrowDown";
}






const componentMap: Record<string, new (params: any) => any> = {
	"Point2D": function (params: any) { return new Point2D(params.x, params.y); } as any,
	"Vector2D": function (params: any) { return new Vector2D(params.x, params.y); } as any,
	"sprite": Sprite,
	"glow": Glow,
	"hitbox": HitBox,
};

const gameObjectMap: Record<string, new (params: any) => any> = {
	"imageObject": ImageObject,
	"label": Label,
	"ball": Ball,
	"OnScreenLabel": OnScreenLabel,
	"gameObject": GameObject,
	"arrow": Arrow,
	"player": Player
}




function revive(obj: any): any {
	// -- handle arrays --
	if (Array.isArray(obj))
		return obj.map(revive);

	// -- handle object (nested) --
	if (obj && typeof obj === "object") {
		const { className } = obj;

		// If the object matches a known component, rebuild as an instance
		// -end of recursion
		if (className && componentMap[className]) {
			const revivedParams: Record<string, any> = {};
			for (const key in obj)
				revivedParams[key] = revive(obj[key]);

			return new componentMap[className](revivedParams);
		}

		// Otherwise, recurse further
		for (const key in obj) {
			if (key === "position")
				obj.position = new Point2D(obj.position.x, obj.position.y);
			else if (key === "scaleFactor")
				obj.scaleFactor = new Vector2D(obj.scaleFactor.x, obj.scaleFactor.y);
			else
				obj[key] = revive(obj[key]);
		}
	}

	return obj;
}

function genericUpdate(
	obj: Record<string, any>,
	params: Record<string, any>
) {
	for (const key in params) {
		if (key === "parent" || key === "children") continue;

		const value = params[key];

		// -- update array types --
		if (Array.isArray(value)) {
			obj[key] = obj[key] || [];
			value.forEach((item, index) => {
				obj[key][index] = obj[key][index] || {};
				genericUpdate(obj[key][index], item);
			});
		}

		else if (key === "cUpdate" && obj.onClientUpdateId !== value) {
			obj.setOnClientUpdate(value);
			continue;
		}

		// -- update nested object types --
		else if (typeof value === "object" && value !== null) {
			obj[key] = obj[key] || {};
			genericUpdate(obj[key], value);
		}

		// -- assign primitive or different value --
		else {
			obj[key] = value;
		}
	}
}


class GameClient {
	
	private websocketRef: WebSocket | null = null;

	handleKey(e: KeyboardEvent) {
		console.log("test");
		if (isArrowKey(e) && this.websocketRef?.readyState === WebSocket.OPEN)
			this.sendData("input", { key: e.key, action: e.type });
	}

	sendData (type: string, payload: Record<string, any> = {}) {
		if (this.websocketRef?.readyState === WebSocket.OPEN) {
			this.websocketRef.send(JSON.stringify({ type, payload }));
		}
	};

	public destroy() {
		this.websocketRef?.close();
		window.removeEventListener("keydown", this.handleKey);
		window.removeEventListener("keyup", this.handleKey);
	}

	constructor(canvasRef) {
		let game = (new PongGame(null, true, []));
		let data: Record<string, any> = {};
		let gameObjectRegistry = (new Map<number, GameObject>());
		let componentRegistry = (new Map<number, Component>());

		this.websocketRef = new WebSocket("ws://localhost:3000/ws");


		// -- WEBSOCKET --

		this.websocketRef.onopen = () => {
			console.log("initiating handshake");
			this.websocketRef?.send(JSON.stringify({ type: "ready" }));
		} 

		this.websocketRef.onmessage = (event) => {
			data = JSON.parse(event.data);
			console.log(data);

			if (data["type"] === "ready") {
				console.log("fetching world...");
				this.sendData("fetch_world");
			} 

			if (!data["state"]) return;
			if (data["state"]["type"] === "full") this.sendData("received_full_state");
		};

		this.websocketRef.onclose = () => console.log("❌ Disconnected");


  this.handleKey = this.handleKey.bind(this);
		// -- KEYBOARD --


		window.addEventListener("keydown", this.handleKey);
		window.addEventListener("keyup", this.handleKey);



		// -- WORLD UPDATE --

		function loop() {

			if (data["state"] === undefined) {
				requestAnimationFrame(loop);
				return;
			}

			if (data["bgColor"])
				game.world.bgColor = data["bgColor"];

			// -- sync server components with components
			for (const stateComponent of data["state"]["components"] ?? []) {
				const component = componentRegistry.get(stateComponent.id);

				if (component !== undefined)
					Object.assign(component, revive(stateComponent));
				else if (componentMap[stateComponent.name])
					componentRegistry.set(stateComponent.id, new componentMap[stateComponent.name](stateComponent));
			}


			// -- instantiate objects --
			for (const stateObject of data["state"]["gameObjects"] ?? []) {
				const id = stateObject["id"];
				let obj = getObject(id);

				if (!obj) {
					// hydrate only once
					const revivedObject = revive(stateObject);
					obj = createNewInstance(revivedObject);
				}

				else {
					// update from raw JSON
					genericUpdate(obj, stateObject);
					if (stateObject.className === "camera") {
						viewport.camera = (obj as Camera);
					}
				}
			}


			// Replace any numeric IDs with object references
			for (const [id, object] of gameObjectRegistry) {

				object.children = object.children.map((child: any) => {
					if (typeof child !== "number")
						return child;

					const childObj = gameObjectRegistry.get(child);

					if (childObj) {
						childObj.parent = object;
						return childObj; // replace number with actual object
					}
					else
						return child; // cannot link yet
				});
				object.clientUpdate();
			}


			// link components
			for (const [id, object] of gameObjectRegistry) {
				if (object.component_list === undefined)
					continue;

				for (const id of object.component_list) {
					if (typeof id !== "number") 
						continue;
					const compObj = componentRegistry.get(id);
					if (!compObj) continue;

					compObj.host = object;
					object.addComponent(compObj);
				}
			}
			draw();
			requestAnimationFrame(loop);
		}

		function createNewInstance(object: any) {
			const params = { ...object, components: [], isClient: true };
			const objectInstance = gameObjectMap[object.className] ? 
				new gameObjectMap[object.className](params) : 
				new GameObject(params);
				
			setObject(object["id"], objectInstance);
			// console.log(`${objectInstance.constructor.name} created ${objectInstance.id} | ${object["id"]} | children : ${objectInstance.children}`);

			objectInstance.component_list = object.components;

			return objectInstance;
		}


		const canvas = canvasRef;
		if (!canvas) return; // exit effect if canvas not ready
		
		const ctx = canvas.getContext("2d");
		if (!ctx) return ;

		const viewport = new Viewport({
			ctx: ctx,
			width: canvas.width,
			height: canvas.height
		});

		function draw() {
			const renderList = Array.from(gameObjectRegistry.values())
				.sort((a, b) => a.zIndex - b.zIndex);

			// -- CLEAR CANVAS --
			ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
			ctx!.fillStyle = game.world.bgColor;
			ctx!.fillRect(0, 0, canvas!.width, canvas!.height);

			// -- RENDER OBJECTS --
			for (const clientObj of renderList)
				clientObj.draw(viewport);
		}

		function getObject(id: number) { return gameObjectRegistry.get(id); }
		function setObject(id: number, object: any) { gameObjectRegistry.set(id, object); }

		loop();
	}
}

const GameView: React.FC = () => {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	const { t } = useTranslation();
	const translate = (key: string) => t(`GameView.${key}`);
	const [stage, setStage] = useState<"quarterfinals" | "semifinals" | "finals">("quarterfinals");





	useEffect(() => {
		let gameClient = new GameClient(canvasRef.current);

		return () => {
			gameClient.destroy(); // ✅ cleanup
		};

	}, []);

	return (
		<Background variant="plain">
			<div className="w-full h-full flex-col-center gap-10 px-25">
				<TournamentHeader>
					{stage.charAt(0).toUpperCase() + stage.slice(1)} Match
				</TournamentHeader>
				<div className="w-full h-[500px] flex-col-center border-4 border-yellow-400 text-white text-9xl text-center">
					<canvas
						ref={canvasRef}   // ✅ fixed
						width={880}
						height={500}
						className="rounded-lg shadow-lg border-4 border-cyan-400 bg-gray-800"
					/>
				</div>
			</div>
		</Background>
	);
};

export default GameView;
