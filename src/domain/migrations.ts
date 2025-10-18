import { CURRENT_SCENE_VERSION, SceneSchema, UnitsSchema } from "./schema";
import type { Scene } from "./types";

type LegacyScene = {
  version?: number;
  units?: Partial<Scene["units"]>;
  elements?: unknown[];
  constraints?: unknown[];
  view?: unknown;
};

function ensureUnits(units: LegacyScene["units"]): Scene["units"] {
  return UnitsSchema.parse({ g: 9.81, ...units });
}

function normalizeLegacyScene(scene: LegacyScene): unknown {
  const normalizedElements = (scene.elements ?? []).map((element, index) => {
    if (typeof element === "object" && element !== null) {
      const typed = element as Record<string, unknown>;
      return typed.id ? typed : { ...typed, id: `legacy-${index}` };
    }
    return { id: `legacy-${index}`, type: "unknown" };
  });

  const normalizedConstraints = (scene.constraints ?? []).map((constraint, index) => {
    if (typeof constraint === "object" && constraint !== null) {
      const typed = constraint as Record<string, unknown>;
      return typed.type ? typed : { ...typed, type: "unknown" };
    }
    return { type: `unknown-${index}` };
  });

  return {
    version: CURRENT_SCENE_VERSION,
    units: ensureUnits(scene.units),
    elements: normalizedElements,
    constraints: normalizedConstraints,
    view: scene.view && typeof scene.view === "object" ? scene.view : undefined,
  };
}

export function migrateScene(input: unknown): Scene {
  if (!input || typeof input !== "object") {
    throw new Error("Cannot migrate scene: input must be an object");
  }

  const scene = input as LegacyScene & Scene;

  if (scene.version === CURRENT_SCENE_VERSION) {
    return SceneSchema.parse(scene);
  }

  if (scene.version === undefined) {
    return SceneSchema.parse(
      normalizeLegacyScene({
        ...scene,
        version: CURRENT_SCENE_VERSION,
      })
    );
  }

  switch (scene.version) {
    case 0:
      return SceneSchema.parse(normalizeLegacyScene(scene));
    default:
      throw new Error(`Unsupported scene version: ${scene.version}`);
  }
}
