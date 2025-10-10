import type { GameObject } from "./GameObject.ts";

export class Component {
  static globalId: number = 1;

  id: number = -1;

  name: string = "";
  renderable: boolean = false;
  enabled: boolean = true;
  host: GameObject | null = null;

  public onUpdate?: () => void;

  constructor(params: Partial<Component>) {
    Object.assign(this, params);
    this.id = Component.globalId;
    Component.globalId++;
  }

  init(): Component {
    return this;
  }

  update() {
    if (this.onUpdate) this.onUpdate();
  }

  export() {
    return this;
  }
}
