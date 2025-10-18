import type {
  BlockAndTackleElement,
  LeverElement,
  Scene,
  Units,
  WinchElement,
} from "./types";
import { CURRENT_SCENE_VERSION, SceneSchema, UnitsSchema } from "./schema";

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createClassILever(options?: {
  id?: string;
  name?: string;
  armLeft?: number;
  armRight?: number;
  fulcrumPos?: number;
  mass?: number;
  eta?: number;
}): LeverElement {
  const armLeft = options?.armLeft ?? 1;
  const armRight = options?.armRight ?? 1;
  const total = armLeft + armRight;
  const fulcrumPos = options?.fulcrumPos ?? armLeft / total;
  return {
    id: options?.id ?? createId("lever"),
    type: "lever",
    name: options?.name ?? "Class I Lever",
    armLeft,
    armRight,
    fulcrumPos,
    mass: options?.mass,
    eta: options?.eta,
  };
}

export function createClassIILever(options?: {
  id?: string;
  name?: string;
  armLeft?: number;
  armRight?: number;
  fulcrumPos?: number;
  mass?: number;
  eta?: number;
}): LeverElement {
  const armLeft = options?.armLeft ?? 0.75;
  const armRight = options?.armRight ?? 1.5;
  const total = armLeft + armRight;
  const fulcrumPos = options?.fulcrumPos ?? Math.max(0.05, Math.min(0.25, armLeft / total));
  return {
    id: options?.id ?? createId("lever"),
    type: "lever",
    name: options?.name ?? "Class II Lever",
    armLeft,
    armRight,
    fulcrumPos,
    mass: options?.mass,
    eta: options?.eta,
  };
}

export function createClassIIILever(options?: {
  id?: string;
  name?: string;
  armLeft?: number;
  armRight?: number;
  fulcrumPos?: number;
  mass?: number;
  eta?: number;
}): LeverElement {
  const armLeft = options?.armLeft ?? 1.5;
  const armRight = options?.armRight ?? 0.75;
  const total = armLeft + armRight;
  const fulcrumPos = options?.fulcrumPos ?? Math.min(0.95, Math.max(0.75, armLeft / total));
  return {
    id: options?.id ?? createId("lever"),
    type: "lever",
    name: options?.name ?? "Class III Lever",
    armLeft,
    armRight,
    fulcrumPos,
    mass: options?.mass,
    eta: options?.eta,
  };
}

export function createBlockAndTackle2x2(options?: {
  id?: string;
  name?: string;
  muPerSheave?: number;
}): BlockAndTackleElement {
  return {
    id: options?.id ?? createId("block"),
    type: "blockAndTackle",
    name: options?.name ?? "2x2 Block and Tackle",
    fixedPulleys: 2,
    movablePulleys: 2,
    muPerSheave: options?.muPerSheave,
  };
}

export function createBlockAndTackle3x3(options?: {
  id?: string;
  name?: string;
  muPerSheave?: number;
}): BlockAndTackleElement {
  return {
    id: options?.id ?? createId("block"),
    type: "blockAndTackle",
    name: options?.name ?? "3x3 Block and Tackle",
    fixedPulleys: 3,
    movablePulleys: 3,
    muPerSheave: options?.muPerSheave,
  };
}

export function createStandardWinch(options?: {
  id?: string;
  name?: string;
  drumDiameter?: number;
  handleDiameter?: number;
  gearRatio?: number;
  eta?: number;
  maxRope?: number;
}): WinchElement {
  return {
    id: options?.id ?? createId("winch"),
    type: "winch",
    name: options?.name ?? "Standard Winch",
    drumDiameter: options?.drumDiameter ?? 0.2,
    handleDiameter: options?.handleDiameter ?? 0.35,
    gearRatio: options?.gearRatio ?? 4,
    eta: options?.eta ?? 0.85,
    maxRope: options?.maxRope ?? 30,
  };
}

export function createSceneFromElements(elements: Scene["elements"], options?: {
  constraints?: Scene["constraints"];
  units?: Units;
  view?: Scene["view"];
}): Scene {
  const units = UnitsSchema.parse(options?.units ?? { g: 9.81 });
  const candidate = {
    version: CURRENT_SCENE_VERSION,
    units,
    elements,
    constraints: options?.constraints ?? [],
    view: options?.view,
  };
  return SceneSchema.parse(candidate);
}
