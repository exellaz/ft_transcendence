import type { GameObject } from "../objects/GameObject.ts";
import { oscillateValue } from "../utils/calculations.ts";

export const clientScripts: Record<string, (object) => void> = {
  moveCrowd: (object: GameObject) => {
    const amplitude = 5;
    const frequency = 0.5;
    const baseY = -240;

    // apply oscillation
    object.position.y = oscillateValue(
      baseY,
      amplitude,
      frequency,
      Number(object.id % 2 === 0) * 15,
    );
  },
};
