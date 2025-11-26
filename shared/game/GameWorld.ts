import { GameObject } from "../objects/GameObject.ts";
import type { Camera } from "../objects/Camera.ts";
import { Viewport } from "../objects/Viewport.ts";
import { HitBox } from "../objects/HitBox.ts";
import { PeriodicTimer, Timer } from "../objects/Timer.ts";
import { Component } from "@shared/objects/Component.ts";

export class GameWorld {
  gameObjects: Map<number, GameObject> = new Map();
  camera: Camera | null = null;
  bgColor: string = "#000000";
  viewport: Viewport;
  game: any;

  public timers: Record<string, Timer | PeriodicTimer> = {};

  constructor(viewport?: Viewport) {
    this.viewport = viewport ?? new Viewport({ width: 800, height: 400 });
  }

  // cleqr all game objects from the world ( prevent ovelap issue )
  public clear(): void {
    if (this.gameObjects) {
      this.gameObjects.clear();
    }
  }

  public addTimer(
    identifier: string,
    durationSeconds: number,
    callback: () => void,
  ) {
    this.timers[identifier] = new Timer(durationSeconds, callback);
  }

  public addPeriodicTimer(
    identifier: string,
    durationSeconds: number,
    callback: () => void,
  ) {
    this.timers[identifier] = new PeriodicTimer(durationSeconds, callback);
  }

  public removePeriodicTimer(identifier: string) {
    delete this.timers[identifier];
  }

  public addObject(object: GameObject) {
    this.gameObjects.set(object.id, object);
    object.game = this.game;
    object.init();
    if (object.children && object.children.length > 0) {
      // for (const child of object.children) {
      //   this.addObject(child);
      // }
    }
    return object;
  }

  public checkCollisions() {
    const hitboxes: HitBox[] = [];
    for (const obj of this.gameObjects.values()) {
      for (const comp of obj.getComponents()) {
        if (comp instanceof HitBox) {
          hitboxes.push(comp);
        }
      }
    }

    for (let i = 0; i < hitboxes.length; i++) {
      for (let j = i + 1; j < hitboxes.length; j++) {
        const a = hitboxes[i]!;
        const b = hitboxes[j]!;
        if (a.isCollidingWith(b)) {
          a.isColliding = b.isColliding = true;
          a.onCollide?.(b);
          b.onCollide?.(a);
        } else {
          a.isColliding = b.isColliding = false;
        }
      }
    }
  }

  public update() {
    for (const object of this.gameObjects.values()) {
      object.update();
    }
    this.checkCollisions();

    for (const timer of Object.values(this.timers)) {
      timer.update();
    }
  }

  exportState(includeStaticObjects: boolean = false) {
    const visited = new Set();
    const flatObjects: any[] = [];

    const components: Component[] = [];

    function flatten(obj: GameObject) {
      if (!obj || visited.has(obj.id)) return;
      visited.add(obj.id);

      if (
        obj.isStatic === true && // if only exports once
        !includeStaticObjects
      )
        return;

      const exportedObject = obj.export(includeStaticObjects);

      const componentIds = [];
      for (const [key, component] of obj.components) {
        if (component.id) componentIds.push(key);
      }

      exportedObject.components = componentIds;
      if (componentIds.length === 0 || !includeStaticObjects)
        delete exportedObject.components;

      flatObjects.push(exportedObject);

      // todo flaw here. Double-export
      const componentJson = obj.componentToJSON(includeStaticObjects);

      components.push(...componentJson);

      if ("children" in exportedObject) {
        if (obj.children && obj.children.length > 0) {
          for (const child of obj.children) flatten(child);
        }
      } else {
        // console.log("no children");
      }
    }

    for (const obj of this.gameObjects.values()) {
      flatten(obj);
    }

    const output: Record<string, any> = {
      camera: {
        position: this.camera?.position,
      },
      bgColor: this.bgColor,
      gameObjects: flatObjects,
      components: components,
    };

    return output;
  }
}
