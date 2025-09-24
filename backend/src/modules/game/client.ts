// client.ts (compile to client.js with `tsc client.ts`)
import { Point2D, Vector2D, interpolate } from './objects/Coordinates.js'
import { GameObject } from './objects/GameObject.js';
import { Glow } from './objects/Glow.js';
import { drawImg, Sprite, Tags, type Renderable } from './objects/Sprite.js'
import { HitBox } from './objects/Hitbox.js'
import { Viewport } from './objects/Viewport.js'
import { PongGame } from './game/pong.js';
import { Arrow } from './game/Padel.js';
import { Camera } from './objects/Camera.js';
import { Label, OnScreenLabel } from './objects/Label.js';
import { Component } from './objects/Component.js';
import { ImageObject } from './objects/ImageObject.js';
import { Ball } from './game/ball.js';
import { Player } from './game/Player.js';


const ws = new WebSocket("ws://localhost:3000/ws");

function isArrowKey(e: KeyboardEvent): boolean {
	return e.key === "ArrowUp" || e.key === "ArrowDown";
}

ws.onopen = () => {
	console.log("CLIENT Connected to server");
	ws.send(JSON.stringify({ type: "ready" }));

	// Listen for keyboard events
	window.addEventListener("keydown", (keyEvent) => {
		if (
			(isArrowKey(keyEvent)) &&
			ws.readyState === WebSocket.OPEN
		) {
			ws.send(JSON.stringify({
				type: "input",
				payload: {
					key: keyEvent.key,
					action: "keydown"
				}
			}));
		}
	});

	window.addEventListener("keyup", (e) => {
		if (
			(isArrowKey(e)) &&
			ws.readyState === WebSocket.OPEN
		) {
			ws.send(JSON.stringify({
				type: "input",
				payload: {
					key: e.key,
					action: "keyup"
				}
			}));
		}
	});
};

let data = {}

ws.onmessage = (event) => {
	data = JSON.parse(event.data);

	if (data["type"] === "ready") {
		console.log("ready");
		ws.send(JSON.stringify({
			type: "fetch_world",
			payload: {}
		}));
	}

	if (!data["state"])
		return;
	if (data["state"]["type"] === "full") {
		console.log(data);
		ws.send(JSON.stringify({
			type: "received_full_state",
			payload: {}
		}))
	}
};

ws.onclose = () => {
	console.log("❌ Disconnected");
};

const gameObjectRegistry = new Map<number, GameObject>();
const componentRegistry = new Map<number, Component>();

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


window.addEventListener("DOMContentLoaded", () => {
	const game: PongGame = new PongGame(null, true, []);

	function loop() {

		if (data["state"] === undefined) {
			requestAnimationFrame(loop);
			return;
		}
		
		if (data["bgColor"]) 
			game.world.bgColor = data["bgColor"];
		
		// -- sync server components with current components
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
				const compObj = componentRegistry.get(id);
				if (!compObj) continue;
				
				compObj.host = object;
				object.addComponent(compObj);
			}
		}
		draw();
		requestAnimationFrame(loop);
	}

	function createNewInstance(object) {
		let objectInstance;

		const params = { ...object, components: [], isClient: true };
		if (gameObjectMap[object.className]) 
			objectInstance = new gameObjectMap[object.className](params);
		else 
			objectInstance = new GameObject(params);

		setObject(object["id"], objectInstance);
		// console.log(`vowow ${objectInstance.constructor.name} created ${objectInstance.id} | ${object["id"]} | children : ${objectInstance.children}`);

		objectInstance.component_list = object.components;
		
		return objectInstance;
	}


	const canvas = document.getElementById("pong-canvas") as HTMLCanvasElement;
	const ctx = canvas.getContext("2d");

	const viewport = new Viewport({
		ctx: ctx,
		width: canvas.width,
		height: canvas.height
	});

	function draw() {
		const renderList = Array.from(gameObjectRegistry.values())
			.sort((a, b) => a.zIndex - b.zIndex);

		// -- CLEAR CANVAS --
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = game.world.bgColor;
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// -- RENDER OBJECTS --
		for (const clientObj of renderList) 
			clientObj.draw(viewport);
	}

	function getObject(id) {
		return gameObjectRegistry.get(id);
	}

	function setObject(id, object) {
		gameObjectRegistry.set(id, object);
	}

	loop();
});


		// - DEBUG VALUES --
		// if (data["metadata"]) {
		// 	const delta = data["metadata"]["delta"] ?? 0;
		// 	const fps = data["metadata"]["fps"] ?? 0;
		// 	ctx.save();
		// 	ctx.font = "16px monospace";
		// 	ctx.fillStyle = "#fff";
		// 	ctx.fillText(`Δ: ${delta.toFixed(2)} ms`, 10, 20);
		// 	ctx.fillText(`FPS: ${fps.toFixed(2)}`, 10, 40);
		// 	ctx.fillText(`CAMERA: ${JSON.stringify(data["state"]["camera"]["position"])}`, 10, 60);
		// 	ctx.restore();
		// }