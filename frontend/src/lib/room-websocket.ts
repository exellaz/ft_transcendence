import { useEffect, useRef, useState } from "react";
import { ensurePlayerId, determineSide } from "./requestBackend.api";
import type { playerInfo } from "../../../backend/src/modules/room/room"

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
import { GameSettings, PongGame, Team } from "@shared/game/pong";
import type { Component } from "@shared/objects/Component";
import { Viewport } from "@shared/objects/Viewport";
import type { Camera } from "@shared/objects/Camera";



function isArrowKey(e: KeyboardEvent): boolean {
	return e.key === "ArrowUp" || e.key === "ArrowDown";
}



// TODO not populating data beyond the initial handshake


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
			if (key === "id"){
				continue;
			}
			obj[key] = value;
		}
	}
}


class GameClient {

	private websocketRef: WebSocket | null = null;
	private data: Record<string, any> = {};
	private gameObjectRegistry = (new Map<number, GameObject>());
	private componentRegistry = (new Map<number, Component>());
	private game: PongGame = new PongGame(null, true, [], new GameSettings);
	private viewport: Viewport | null = null;
	private canvas: HTMLCanvasElement | null = null;
	private ctx: CanvasRenderingContext2D | null = null;

	private needToProcessFullState:boolean = false;

	handleKey(e: KeyboardEvent) {
		if (isArrowKey(e) && this.websocketRef?.readyState === WebSocket.OPEN) {
			this.sendData("input", { key: e.key, action: e.type });
			console.log("sent input");
		}
	}

	sendData(type: string, payload: Record<string, any> = {}) {
		if (this.websocketRef?.readyState === WebSocket.OPEN) {
			this.websocketRef.send(JSON.stringify({ type, payload }));
		}
	};

	public destroy() {
		this.websocketRef?.close();
		window.removeEventListener("keydown", this.handleKey);
		window.removeEventListener("keyup", this.handleKey);
	}

	constructor(
		canvasRef: HTMLCanvasElement | null, 
		socketUrl: string,
		player: any = {
			clientId: 1,
			name: "test",
			sprite: 1,
			team: 0
		}
	) {

		this.websocketRef = new WebSocket(socketUrl);

		// -- WEBSOCKET --

		// send initial handshake
		this.websocketRef.onopen = () => {
			this.sendData("ready", {
				clientId: player.clientId,
				playerName: player.name,
				playerSprite: player.sprite,
				Team: player.team
			});
		}

		this.websocketRef.onmessage = (event) => {

			let data = JSON.parse(event.data);

			if (!this.needToProcessFullState)
				this.data = data;



			if (this.data["type"] === "ready") {
				this.sendData("fetch_world");
			}

			if (!this.data["state"]) 
				return;
			if (this.data["state"]["type"] === "full") {
				console.log("---- received full state ---- ");
				let incomingData = (this.data["state"]["gameObjects"].map( (elem) => {
					return elem.id;
				}));
				let currentData = Array.from(this.gameObjectRegistry.keys());
				let incomingLen = incomingData.length;

				console.log(`incoming objects length :${incomingLen} / current objects length ${this.gameObjectRegistry.size}`);
				console.log(`incoming ids :${incomingData}`);
				console.log(`current ids :${currentData}`);
				console.log("object ids", this.gameObjectRegistry.keys());

				for (const id of incomingData) {
					console.log(this.getObject(id) === undefined);
				}

				this.needToProcessFullState = true;
				this.sendData("received_full_state");
			}
		};

		this.websocketRef.onclose = () => console.log("❌ Disconnected");


		this.handleKey = this.handleKey.bind(this);
		// -- KEYBOARD --

		window.addEventListener("keydown", this.handleKey);
		window.addEventListener("keyup", this.handleKey);

		this.canvas = canvasRef;
		if (!this.canvas) return; 
		
		this.ctx = this.canvas.getContext("2d");
		if (!this.ctx) return;

		this.viewport = new Viewport({
			ctx: this.ctx,
			width: this.canvas.width,
			height: this.canvas.height
		});

		this.loop = this.loop.bind(this);
	}

	start() {
		this.loop();
	}

	loop() {

		if (this.data === undefined || this.data["state"] === undefined) {
			requestAnimationFrame(this.loop);
			return;
		}

		if (this.data["bgColor"])
			this.game.world.bgColor = this.data["bgColor"];

		// -- sync server components with components
		for (const stateComponent of this.data["state"]["components"] ?? []) {
			const component = this.componentRegistry.get(stateComponent.id);

			if (component !== undefined)
				Object.assign(component, revive(stateComponent));
			else if (componentMap[stateComponent.name])
				this.componentRegistry.set(stateComponent.id, new componentMap[stateComponent.name](stateComponent));
		}


		// -- instantiate objects --
		for (const stateObject of this.data["state"]["gameObjects"] ?? []) {
			const id = stateObject["id"];
			let obj = this.getObject(id);

			if (obj === undefined) {
				// hydrate only once
				console.log("creating new instance");
				const revivedObject = revive(stateObject);
				this.setObject(stateObject["id"], this.createNewInstance(revivedObject));
			}

			else {
				// update from raw JSON
				genericUpdate(obj, stateObject);
				if (stateObject.className === "camera")
					this.viewport!.camera = (obj as Camera);
			}
		}

		this.needToProcessFullState = false;

		// Replace any numeric IDs with object references
		for (const [id, object] of this.gameObjectRegistry) {

			object.children = object.children.map((child: any) => {
				if (typeof child !== "number")
					return child;

				const childObj = this.gameObjectRegistry.get(child);

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
		for (const [id, object] of this.gameObjectRegistry) {
			for (const id of object.component_list) {
				if (typeof id !== "number")
					continue;
				const compObj = this.componentRegistry.get(id);
				if (!compObj) continue;

				compObj.host = object;
				object.addComponent(compObj);
			}
		}
		this.draw();
		requestAnimationFrame(this.loop);
	}

	createNewInstance(object: any) {
		const params = { 
			...object, 
			components: [], 
			isClient: true,
			component_list: object.components ?? []
		};
		const objectInstance = gameObjectMap[object.className] ?
			new gameObjectMap[object.className](params) :
			new GameObject(params);
		return objectInstance;
	}

	draw() {
		const renderList = Array.from(this.gameObjectRegistry.values())
			.sort((a, b) => a.zIndex - b.zIndex);

		// -- CLEAR CANVAS --
		this.ctx!.clearRect(0, 0, this.canvas!.width, this.canvas!.height);
		this.ctx!.fillStyle = this.game.world.bgColor;
		this.ctx!.fillRect(0, 0, this.canvas!.width, this.canvas!.height);

		// -- RENDER OBJECTS --
		for (const clientObj of renderList)
			clientObj.draw(this.viewport!);
	}

getObject(id: number) { 
	return this.gameObjectRegistry.get(id); 
}
setObject(id: number, object: any) { 
	this.gameObjectRegistry.set(id, object); 
}
}






















// room structure
export interface UseRoomWebSocketParams {
	roomId: number;
	roomName: string;
	leaderId: number;
    player: {
        id: number;
        name: string;
        avatar: string;
    }
}

/**
 * @brief Custom hook to manage WebSocket connection and room state.
 * @param roomId The ID of the room to connect to.
 * @param roomName The name of the room.
 * @param leaderId The client ID of the room leader.
*/
export function useRoomWebSocket({ roomId, roomName, leaderId, player }: UseRoomWebSocketParams) {
	const [statusText, setStatusText] = useState("Connecting to room..."); // e.g., "Room MyRoom [id: 1234]"
	const [playerText, setPlayerText] = useState("Waiting for players..."); // e.g., "You are: Player1 [id: abc123] (left_player1)"
	const [leftTeamHtml, setLeftTeamHtml] = useState("waiting left team..."); // HTML content for left team
	const [rightTeamHtml, setRightTeamHtml] = useState("waiting right team..."); // HTML content for right team
	const [isLeader, setIsLeader] = useState(false); // Whether the current client is the leader
	const [role, setRole] = useState<string>("spectator"); // e.g., "left_player1", "right_player2", "spectator"
	const [ready, setReady] = useState(false); // Whether the player is ready
	const [gameStarted, setGameStarted] = useState(false); // Whether the game has started
	const [canStart, setCanStart] = useState(false); // Whether the game can be started (all players ready)
	const [countdown, setCountdown] = useState<number | null>(null);
	const socketRef = useRef<WebSocket | null>(null);

	useEffect(() => {
        //TODO replace with JWT

		async function connect() {
			// set room settings
			//await roomSetting(roomId, BALLSPEED, PADDLEHEIGHT, PADDLEWIDTH, BALLSIZE);

			// pick role (leader gets left_player1)
			let roleLocal = player.id === leaderId ? "left_player1" : "spectator";
			setRole(roleLocal);
			setIsLeader(player.id === leaderId);

			// create websocket connection with player id, room id, side and player name
			const chooseSide = await determineSide(roomId);
			console.log("ws side:", chooseSide);
			console.log("ws player name:", player.name);
			console.log("ws player sprite:", player.avatar);
			const ws = new WebSocket(import.meta.env.VITE_WS_URL + `/ws-room?id=${player.id}&room=${roomId}&side=${chooseSide}&name=${encodeURIComponent(player.name)}&sprite=${encodeURIComponent(player.avatar)}`);
			socketRef.current = ws;

			// open connection
			ws.onopen = () => {
				console.log("Room ws connected");
				setStatusText(`Room ${roomName} [id: ${roomId}]`);
			};

			// handle incoming message / event from server
			ws.onmessage = (ev) => {
				try {
					// validate JSON
					let data;
					try {
						data = JSON.parse(ev.data);
					} catch {
						console.error("Invalid JSON:", ev.data);
						return;
					}

					// validate message structure
					if (typeof data !== "object" || data === null) {
						console.error("Invalid message format");
						return;
					}
					if (typeof data.type !== "string") {
						console.error("Invalid message: missing type:", data);
						return;
					}
					const allowedTypes = ["roleUpdate", "state", "countdown", "countdownCancel"];
					if (!allowedTypes.includes(data.type)) {
						if (data.type === "chat") return;
						console.error(`unsupported message type ${data.type}`);
						return;
					}

					// handle different message types
					if (data.type === "roleUpdate") {
						// validate the game state
						if (typeof data.gameState !== "object" || data.gameState === null) {
							console.error("Invalid roleUpdate: missing gameState");
							return;
						}
						// update role base in clientId
                        //console.log("Left Team info:", data.gameState.teams.left);
                        //console.log("Right Team info:", data.gameState.teams.right);
						const leftPlayer = data.gameState.teams.left.find((p: playerInfo)=> {
                            console.log("Left Player info:", p.clientId, typeof p.clientId, player.id, typeof player.id);
                            return p.clientId === player.id;
                        });
                        console.log("Left Player found:", leftPlayer);
						const rightPlayer = data.gameState.teams.right.find((p: playerInfo)=> {
                            console.log("Right Player info:", p.clientId, typeof p.clientId, player.id, typeof player.id);
                            return p.clientId === player.id;
                        });
                        const newRole = leftPlayer?.role || rightPlayer?.role || "spectator";
						setRole(newRole);
						setPlayerText(`You are: ${player.name} [${player.id}] (${newRole})`);
						// update team lists on left
						setLeftTeamHtml(
							data.gameState.teams.left.map((p: playerInfo)=> ({
								id: p.clientId,
								username: p.playerName,
								role: p.role,
								team: p.role.startsWith("left") ? "left" : "right",
								leader: p.clientId === data.leaderId,
								spriteUrl: p.spriteUrl,
								ready: p.ready,
							}))
						);
						// update team lists on right
						setRightTeamHtml(
							data.gameState.teams.right.map((p: playerInfo)=> ({
								id: p.clientId,
								username: p.playerName,
								role: p.role,
								team: p.role.startsWith("left") ? "left" : "right",
								leader: p.clientId === data.leaderId,
								spriteUrl: p.spriteUrl,
								ready: p.ready,
							}))
						);
						// update player leader
						if (data.leaderId) {
                            console.log("Updating leader status:", typeof player.id, typeof data.leaderId);
							setIsLeader(player.id === data.leaderId);
						}
						// update can start status
						setCanStart(data.canStart ?? false);
					}
					if (data.type === "state") {
						// validate the game state
						if (typeof data.gameState !== "object" || data.gameState === null) {
							console.error("Invalid state: missing gameState");
							return;
						}
						// update can start status
						setCanStart(data.canStart ?? false);
						//if game able to start then set game started to true
						if (!gameStarted && ( data.gameState.gameStarted)) {
							setGameStarted(true);
						}
					}
					if (data.type === "countdown") {
						if (typeof data.remaining === "number") {
							//get the remaining time from server and set to countdown state
							setCountdown(data.remaining);
						}
					}
					if (data.type === "countdownCancel") {
						//cancel the countdown
						setCountdown(null);
					}
				} catch (err) {
					console.error("Invalid room message:", err);
					ws.close(1000, "server error");
				}
			};

			// close connection
			ws.onclose = () => { console.log("Room ws disconnected"); };

			ws.onerror = (e) => {
				console.error("Room ws error", e);
				ws.close();
			};


			// clean up on unmount
			return () => {
                if (ws) ws.close();
			};
		}
        connect();
	}, [roomId, roomName, leaderId, player.id, player.name, player.avatar]);

	function onSwitch() {
		if (!socketRef.current) return;
        if (ready && !isLeader) return;
		const newSide = role.startsWith("left") ? "right" : "left";
		socketRef.current.send(JSON.stringify({ type: "switchSide", side: newSide }));
	}

	function onReady() {
	  if (!socketRef.current || isLeader) return;
	  const newReady = !ready;
	  setReady(newReady);
	  socketRef.current.send(JSON.stringify({ type: "ready", ready: newReady }));
	}
	function onStartBtn() {
	  if (!isLeader || !socketRef.current) return;
	  socketRef.current.send(JSON.stringify({ type: "start", start: true }));
	}
	function onLeave() {
	  try { socketRef.current?.close(); } catch {}
	  sessionStorage.removeItem("RoomName");
	  sessionStorage.removeItem("RoomId");
	  sessionStorage.removeItem("RoomLeaderId");
      sessionStorage.removeItem("RoomType");
	}

	return {
		socket: socketRef.current,
		statusText,
		playerText,
		leftTeamHtml,
		rightTeamHtml,
		isLeader,
		role,
		ready,
		setReady,
		canStart,
		countdown,
		onSwitch,
		onReady,
		onStartBtn,
		onLeave,
	};
}
