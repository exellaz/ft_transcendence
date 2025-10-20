export enum Skin {
  ghost_yellow,
  ghost_green,
  ghost_blue,
  ghost_red,
  ghost_purple,
  ghost_dark,
  ghost_light,
  ghost_42,
}
// Maps enum values to asset paths

interface SkinDefinition {
  base: string;
  iris: string;
  arrow: string;
  eyes: string;
}

export const SKIN_BASE_PATH = "assets/skins";

export const SKIN_PATHS: Record<Skin, SkinDefinition> = {
  [Skin.ghost_dark]: {
    base: `${SKIN_BASE_PATH}/ghost_dark.png`,
    iris: `${SKIN_BASE_PATH}/components/iris.png`,
    eyes: `${SKIN_BASE_PATH}/components/eyes.png`,
    arrow: `${SKIN_BASE_PATH}/arrows/arrow_dark.png`,
  },
  [Skin.ghost_light]: {
    base: `${SKIN_BASE_PATH}/ghost_light.png`,
    iris: `${SKIN_BASE_PATH}/components/iris.png`,
    eyes: `${SKIN_BASE_PATH}/components/eyes.png`,
    arrow: `${SKIN_BASE_PATH}/arrows/arrow_light.png`,
  },
  [Skin.ghost_blue]: {
    base: `${SKIN_BASE_PATH}/ghost_blue.png`,
    iris: `${SKIN_BASE_PATH}/components/iris.png`,
    eyes: `${SKIN_BASE_PATH}/components/eyes.png`,
    arrow: `${SKIN_BASE_PATH}/arrows/arrow_blue.png`,
  },
  [Skin.ghost_green]: {
    base: `${SKIN_BASE_PATH}/ghost_green.png`,
    iris: `${SKIN_BASE_PATH}/components/iris.png`,
    eyes: `${SKIN_BASE_PATH}/components/eyes.png`,
    arrow: `${SKIN_BASE_PATH}/arrows/arrow_green.png`,
  },
  [Skin.ghost_purple]: {
    base: `${SKIN_BASE_PATH}/ghost_purple.png`,
    iris: `${SKIN_BASE_PATH}/components/iris.png`,
    eyes: `${SKIN_BASE_PATH}/components/eyes.png`,
    arrow: `${SKIN_BASE_PATH}/arrows/arrow_purple.png`,
  },
  [Skin.ghost_red]: {
    base: `${SKIN_BASE_PATH}/ghost_red.png`,
    iris: `${SKIN_BASE_PATH}/components/iris.png`,
    eyes: `${SKIN_BASE_PATH}/components/eyes.png`,
    arrow: `${SKIN_BASE_PATH}/arrows/arrow_red.png`,
  },
  [Skin.ghost_yellow]: {
    base: `${SKIN_BASE_PATH}/ghost_yellow.png`,
    iris: `${SKIN_BASE_PATH}/components/iris.png`,
    eyes: `${SKIN_BASE_PATH}/components/eyes.png`,
    arrow: `${SKIN_BASE_PATH}/arrows/arrow_yellow.png`,
  },
  [Skin.ghost_42]: {
    base: `${SKIN_BASE_PATH}/ghost_42.png`,
    iris: `${SKIN_BASE_PATH}/components/iris2.png`,
    eyes: `${SKIN_BASE_PATH}/components/eyes2.png`,
    arrow: `${SKIN_BASE_PATH}/arrows/arrow_42.png`,
  },
};
