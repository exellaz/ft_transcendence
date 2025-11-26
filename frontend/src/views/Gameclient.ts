import { Sprite } from "@shared/objects/Sprite";
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

// TODO not populating data beyond the initial handshake

const componentMap: Record<string, new (params: any) => any> = {
  Point2D: function (params: any) {
    return new Point2D(params.x, params.y);
  } as any,
  Vector2D: function (params: any) {
    return new Vector2D(params.x, params.y);
  } as any,
  sprite: Sprite,
  glow: Glow,
  hitbox: HitBox,
};

const gameObjectMap: Record<string, new (params: any) => any> = {
  imageObject: ImageObject,
  label: Label,
  ball: Ball,
  OnScreenLabel: OnScreenLabel,
  gameObject: GameObject,
  arrow: Arrow,
  player: Player,
};

function revive(obj: any): any {
  // -- handle arrays --
  if (Array.isArray(obj)) return obj.map(revive);

  // -- handle object (nested) --
  if (obj && typeof obj === "object") {
    const { className } = obj;

    // If the object matches a known component, rebuild as an instance
    // -end of recursion
    if (className && componentMap[className]) {
      const revivedParams: Record<string, any> = {};
      for (const key in obj) revivedParams[key] = revive(obj[key]);

      return new componentMap[className](revivedParams);
    }

    // Otherwise, recurse further
    for (const key in obj) {
      if (key === "position")
        obj.position = new Point2D(obj.position.x, obj.position.y);
      else if (key === "scaleFactor")
        obj.scaleFactor = new Vector2D(obj.scaleFactor.x, obj.scaleFactor.y);
      else obj[key] = revive(obj[key]);
    }
  }

  return obj;
}

function genericUpdate(obj: Record<string, any>, params: Record<string, any>) {
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
    } else if (key === "cUpdate" && obj.onClientUpdateId !== value) {
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
      if (key === "id") continue;
      obj[key] = value;
    }
  }
}

export class GameClient {
  private id: number = -1;

  private websocketRef: WebSocket | null = null;
  private data: Record<string, any> = {};
  private gameObjectRegistry = new Map<number, GameObject>();
  private componentRegistry = new Map<number, Component>();
  private game: PongGame = new PongGame(true, {});
  private viewport: Viewport | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  static globalId = 0;
  private isFullStateProcessed: boolean = false;
  private keysPressed: Record<string, boolean> = {};

  handleKey(e: KeyboardEvent) {
    if (!isArrowKey(e)) return;

    if (e.type === "keydown") {
      this.keysPressed[e.key] = true;
    } else if (e.type === "keyup") {
      this.keysPressed[e.key] = false;
    }
  }

  sendData(type: string, payload: Record<string, any> = {}) {
    if (this.websocketRef?.readyState === WebSocket.OPEN) {
      const msg = JSON.stringify({ type, payload });
      //  console.log("[game] sending data", {
      //    type,
      //    payload,
      //    socketState: this.websocketRef.readyState,
      //  }); ////debug
      try {
        this.websocketRef.send(msg);
        //console.log("[game] data sent successfully"); ////debug
      } catch (err) {
        //console.error("[game] failed to send data:", err); ////debug
      }
    } else {
      console.warn(
        "[game] cannot send data, socket not open:",
        this.websocketRef?.readyState,
      ); ////debug
    }
  }
  async processStateAsync(state: any) {
    const { gameObjects = [], components = [] } = state;
    const chunkSize = 50;
    this.isFullStateProcessed = true;

    // --- 1️⃣ Components ---
    for (let i = 0; i < components.length; i += chunkSize) {
      const chunk = components.slice(i, i + chunkSize);
      for (const stateComp of chunk) {
        const existing = this.componentRegistry.get(stateComp.id);
        if (existing) {
          Object.assign(existing, revive(stateComp));
        } else if (componentMap[stateComp.name]) {
          const newComp = new componentMap[stateComp.name](revive(stateComp));
          this.componentRegistry.set(stateComp.id, newComp);
        }
      }
      await new Promise((r) => setTimeout(r, 0));
    }

    // --- 2️⃣ Game Objects ---
    for (let i = 0; i < gameObjects.length; i += chunkSize) {
      const chunk = gameObjects.slice(i, i + chunkSize);
      for (const stateObj of chunk) {
        const id = stateObj.id;
        const obj = this.getObject(id);

        if (!obj) {
          const revived = revive(stateObj);
          this.setObject(id, this.createNewInstance(revived));
        } else {
          genericUpdate(obj, stateObj);
          if (stateObj.className === "camera") {
            this.viewport!.camera = obj as Camera;
          }
        }
      }
      await new Promise((r) => setTimeout(r, 0));
    }

    // --- 3️⃣ Re-link child/parent + components ---
    for (const [id, obj] of this.gameObjectRegistry) {
      // children linking
      obj.children = obj.children.map((child: any) => {
        if (typeof child !== "number") return child;
        const childObj = this.gameObjectRegistry.get(child);
        if (childObj) {
          childObj.parent = obj;
          return childObj;
        }
        return child;
      });

      // component linking
      if (obj.component_list) {
        for (const cid of obj.component_list) {
          if (typeof cid !== "number") continue;
          const comp = this.componentRegistry.get(cid);
          if (!comp) continue;
          comp.host = obj;
          obj.addComponent(comp);
        }
      }

      obj.clientUpdate?.();
    }
  }
  private processingPromise: Promise<void> = Promise.resolve();
  constructor(canvasRef: HTMLCanvasElement | null, websocketRef: WebSocket) {
    //console.log("[game] created game client"); ////debug

    //check for websocket
    if (!websocketRef) {
      throw new Error("[game] websocketRef is required");
    }

    //check websocket state
    if (
      websocketRef.readyState === WebSocket.CLOSING ||
      websocketRef.readyState === WebSocket.CLOSED
    ) {
      throw new Error(
        `[game] websocketRef is not open (readyState: ${websocketRef.readyState})`,
      );
    }

    this.id = GameClient.globalId;
    GameClient.globalId++;
    //console.log("[game] assigned client id:", this.id); ////debug
    this.websocketRef = websocketRef;

    // -- WEBSOCKET --
    this.websocketRef.addEventListener("message", (event) => {
      const data = JSON.parse(event.data);
      this.data = data;
      //  console.log("[game] received data", data); ////debug

      //check for handshakePing
      if (data.type === "handshakePing") {
        //console.log("[game] 📤 received handshakePing, sending handshakePong"); ////debug
        this.sendData("handshakePong");
        //console.log("[game] 📤 Sending ready after handshakePong");
        this.sendData("ready");
        return;
      }

      this.processingPromise = this.processingPromise.then(async () => {
        if (data["state"]?.type === "full") {
          await this.processStateAsync(data["state"]);
          this.isFullStateProcessed = true;
          this.sendData("received_full_state");
          this.game.initSettings(data["settings"]);
          this.loop();
        } else if (data["state"]?.gameObjects || data["state"]?.components) {
          await this.processStateAsync(data["state"]); // now awaited in sequence
        }
      });
    });
    // this.websocketRef.onclose = () => console.log("❌ Disconnected"); ////debug

    this.handleKey = this.handleKey.bind(this);
    // -- KEYBOARD --

    window.addEventListener("keydown", this.handleKey);
    window.addEventListener("keyup", this.handleKey);

    let lastKeyTime = 0;
    document.addEventListener("keydown", () => {
      const t = performance.now();
      console.log("Input delay since last key:", t - lastKeyTime);
      lastKeyTime = t;
    });

    this.canvas = canvasRef;
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext("2d");
    if (!this.ctx) return;

    this.viewport = new Viewport({
      ctx: this.ctx,
      width: this.canvas.width,
      height: this.canvas.height,
    });

    this.loop = this.loop.bind(this);
  }

  start() {
    this.loop();
  }

  loop() {
    if (this.websocketRef?.readyState === WebSocket.OPEN) {
      if (this.keysPressed["ArrowUp"])
        this.sendData("input", { key: "ArrowUp", action: "hold" });
      if (this.keysPressed["ArrowDown"])
        this.sendData("input", { key: "ArrowDown", action: "hold" });
    }

    if (!this.isFullStateProcessed) {
      requestAnimationFrame(this.loop);
      return;
    }

    // Rendering only — state updates happen async
    this.draw();
    requestAnimationFrame(this.loop);
  }

  createNewInstance(object: any) {
    const params = {
      ...object,
      components: [],
      isClient: true,
      component_list: object.components ?? [],
    };
    const objectInstance = gameObjectMap[object.className]
      ? new gameObjectMap[object.className](params)
      : new GameObject(params);
    objectInstance.game = this.game;
    return objectInstance;
  }

  draw() {
    const renderList = Array.from(this.gameObjectRegistry.values()).sort(
      (a, b) => a.zIndex - b.zIndex,
    );

    // -- CLEAR CANVAS --
    this.ctx!.clearRect(0, 0, this.canvas!.width, this.canvas!.height);
    this.ctx!.fillStyle = this.game.world.bgColor;
    this.ctx!.fillRect(0, 0, this.canvas!.width, this.canvas!.height);

    // -- RENDER OBJECTS --
    for (const clientObj of renderList) clientObj.draw(this.viewport!);
  }

  getObject(id: number) {
    return this.gameObjectRegistry.get(id);
  }
  setObject(id: number, object: any) {
    this.gameObjectRegistry.set(id, object);
  }

  public destroy() {
    this.websocketRef?.close();
    window.removeEventListener("keydown", this.handleKey);
    window.removeEventListener("keyup", this.handleKey);
  }
}
