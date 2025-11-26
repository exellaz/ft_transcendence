import { Point2D, Vector2D } from "./Coordinates.ts";
import { Sprite } from "./Sprite.ts";
import type { PongGame } from "../game/pong.ts";
import type { Viewport } from "./Viewport.ts";
import { Component } from "./Component.ts";
import { clientScripts } from "../game/clientScripts.ts";

// const RenderableMarker = Symbol("Renderable");

function ownsProperty(obj: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function exportCleanup<T extends Record<string, any>>(
  obj: T,
  exportStatic: boolean = false,
): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value) && value.length === 0) continue;

    if (
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0
    )
      continue;

    if (key.startsWith("STATIC_")) {
      const keyName = key.slice("STATIC_".length);

      if (exportStatic) {
        result[keyName] = value;
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

export class GameObject {
  public game: PongGame | null = null;

  // identification
  public static globalId = 0;

  public name: string = "";
  public id: number;

  // grouping
  public parent: GameObject | null = null;
  public children: GameObject[] = [];

  // physics
  public position: Point2D = new Point2D(0, 0);
  public rotation: number = 0;
  public scale: Vector2D = new Vector2D(10, 10);
  public velocity: Vector2D = new Vector2D(0, 0);
  public acceleration: Vector2D = new Vector2D(0, 0);
  public maximumVelocity: Vector2D = new Vector2D(1000, 1000);

  // events
  public onUpdate?: () => void;
  public onClientUpdate?: () => void;
  public onClientUpdateId?: string;

  public isClient: boolean = false;

  // order
  public zIndex: number = 0;

  // --webserver stuff--
  cache: any = {};
  isStatic: boolean = false;
  component_list: number[] | Component[] = [];

  // /** Each subclass can declare extra fields here */
  // protected staticFields(): Record<string, any> {
  //   return {};
  // }

  // /** override if needed to stream live (non-static) properties */
  // protected dynamicFields(): Record<string, any> {
  //   return { position: this.position.export() };
  // }

  init() {}

  public components: Map<number, Component> = new Map<number, Component>();
  toScreenPosition: (viewport: Viewport) => Point2D;

  constructor(params: Partial<GameObject>) {
    this.toScreenPosition = (viewport: Viewport) => {
      return viewport.toScreenCoords(this.getWorldPosition());
    };

    Object.assign(this, params);
    this.id = GameObject.globalId;
    GameObject.globalId++;

    const map = new Map<number, Component>();
    if (Array.isArray(params.components)) {
      for (const component of params.components) {
        component.host = this;
        component.init();
        map.set(component.id, component);
      }
    }
    this.components = map;
  }

  addComponent(component: Component) {
    if (this.components instanceof Array) {
      this.components = new Map<number, Component>();
    }
    (this.components as Map<number, Component>).set(component.id, component);
    component.host = this;
    component.init();
    return component;
  }

  getComponents(): Component[] {
    const components: Component[] = [];

    this.components.forEach((x) => {
      components.push(x);
    });

    return components;
  }

  addChild(object: GameObject, overrideClient: boolean = false) {
    // todo problem here

    if (this.isClient && !overrideClient) {
      return;
    }
    // if (object.constructor.name === "ImageObject") {
    //   console.log("added child", object.sprite);
    // }
    this.children.push(object);
    object.parent = this;
    object.game = this.game;
  }

  update() {
    this.velocity = this.velocity.add(
      this.acceleration.multiply(this.game!.delta),
    );

    if (this.maximumVelocity) {
      this.velocity.x = Math.max(
        -Math.abs(this.maximumVelocity.x),
        Math.min(this.velocity.x, Math.abs(this.maximumVelocity.x)),
      );
      this.velocity.y = Math.max(
        -Math.abs(this.maximumVelocity.y),
        Math.min(this.velocity.y, Math.abs(this.maximumVelocity.y)),
      );
    }

    this.position = this.position.add(this.velocity.multiply(this.game!.delta));

    if (this.onUpdate) this.onUpdate();
    for (const child of this.children) {
      child.update();
    }
  }

  setOnClientUpdate(id: string) {
    const script = clientScripts[id];
    if (script) {
      this.onClientUpdateId = id;
      this.onClientUpdate = () => script(this); // pass the current object
    }
  }

  clientUpdate() {
    if (this.onClientUpdate) {
      this.onClientUpdate();
    }
  }

  getWorldPosition(added: Vector2D = new Vector2D(0, 0)): Point2D {
    if (!this.parent) {
      return new Point2D(this.position.x, this.position.y).add(added);
    }
    const parentPos = this.parent.getWorldPosition(new Vector2D(0, 0));
    return new Point2D(
      parentPos.x + this.position.x,
      parentPos.y + this.position.y,
    ).add(added);
  }

  getWorldScale(): Vector2D {
    if (!this.parent) {
      return new Vector2D(this.scale.x, this.scale.y);
    }
    const parentScale = this.parent.getWorldScale();
    return parentScale.multiply(this.scale);
  }

  componentToJSON(exportStatic: boolean = false) {
    return this.getComponents().map((component) => {
      if (typeof (component as any).toJSON === "function") {
        return (component as any).toJSON(exportStatic);
      }

      const componentJson: Record<string, any> = {};
      for (const key in component) {
        if (key !== "host" && ownsProperty(component, key)) {
          componentJson[key] = (component as any)[key];
        }
      }
      return componentJson;
    });
  }

  draw(viewport: Viewport) {
    for (const component of this.getComponents()) {
      if (component === null || component.host === null) {
        continue;
      }

      try {
        if (component instanceof Sprite) (component as Sprite).draw(viewport);
        // else if (component instanceof HitBox)
        // 	(component as HitBox).draw(viewport);
      } catch (error: unknown) {
        console.log("cannot draw: ", error);
        console.log((component as Sprite).imagePath);
        console.log(component as Sprite);
      }
    }

    // Recursively draw children
    for (const child of this.children) {
      if (child instanceof GameObject) {
        child.draw(viewport);
      }
    }
  }

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
      STATIC_cUpdate: this.onClientUpdateId,
    };

    return exportCleanup(json, exportStatic);
  }
}

// export class ClientObject extends GameObject {

// 	constructor(params: Partial<ClientObject>) {
// 		super({});
// 		Object.assign(this, params);
// 	}

// 	updateComponents(componentRegistry) {
// 		for (const id of this.component_list) {
// 			if (typeof id !== "number")
// 				continue;
// 			const compObj = componentRegistry.get(id);
// 			if (!compObj) continue;

// 			compObj.host = this;
// 			this.addComponent(compObj);
// 		}
// 	}
// }
