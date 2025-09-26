import type { GameObject } from "../objects/GameObject.js";
import { oscillateValue } from "../utils/calculations.js";

export const clientScripts: Record<string, (object) => void> = {
  moveCrowd: (object: GameObject) => {
    const amplitude = 5;
    const frequency = 0.5;
    const baseY = -240;

    // apply oscillation
    object.position.y = oscillateValue(baseY, amplitude, frequency, Number(object.id % 2 === 0) * 15);

  },
};
