import type { RopeScene, RopeSceneValidation, RopeAnchor, RopePass } from "./types";

const TWO_PI = Math.PI * 2;

function findUnusedAnchors(anchors: RopeAnchor[], path: RopePass[]): string[] {
  const used = new Set(path.map((pass) => pass.anchorId));
  return anchors.filter((anchor) => !used.has(anchor.id)).map((anchor) => anchor.id);
}

export function validateScene(scene: RopeScene): RopeSceneValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!scene.path || scene.path.length < 2) {
    errors.push("La seqüència d'anchors ha de tenir com a mínim dos nodes.");
    return { errors, warnings };
  }

  const anchorMap = new Map(scene.anchors.map((anchor) => [anchor.id, anchor]));

  scene.path.forEach((pass, index) => {
    const anchor = anchorMap.get(pass.anchorId);
    if (!anchor) {
      errors.push(`L'anchor amb id "${pass.anchorId}" (pas ${index}) no existeix.`);
      return;
    }

    const wrap = pass.wrapAngle ?? anchor.defaultWrapAngle ?? (anchor.type === "pulley" ? Math.PI : 0);
    if (wrap < 0) {
      errors.push(`El desviament angular no pot ser negatiu (pas ${index}).`);
    } else if (wrap > TWO_PI) {
      warnings.push(`Desviament angular superior a 2π detectat al pas ${index}.`);
    }

    const friction = pass.frictionCoefficient ?? anchor.frictionCoefficient ?? 0;
    if (friction < 0) {
      errors.push(`El coeficient de fricció no pot ser negatiu (pas ${index}).`);
    }
  });

  const loadAnchors = new Set(scene.load.anchorIds);
  if (loadAnchors.size === 0) {
    errors.push("La càrrega ha d'estar vinculada com a mínim a un anchor.");
  }

  for (const id of loadAnchors) {
    if (!anchorMap.has(id)) {
      errors.push(`Anchor solidari amb la càrrega inexistent: "${id}".`);
    }
  }

  if (scene.load.mass <= 0) {
    errors.push("La massa de la càrrega ha de ser positiva.");
  }

  const segmentsSupportingLoad: number[] = [];
  for (let i = 0; i < scene.path.length - 1; i += 1) {
    const from = scene.path[i];
    const to = scene.path[i + 1];
    if (loadAnchors.has(from.anchorId) || loadAnchors.has(to.anchorId)) {
      segmentsSupportingLoad.push(i);
    }
  }

  if (segmentsSupportingLoad.length === 0) {
    errors.push("No hi ha cap tram de corda associat a la càrrega.");
  }

  const unused = findUnusedAnchors(scene.anchors, scene.path);
  if (unused.length > 0) {
    warnings.push(`Anchors sense utilitzar a l'escena: ${unused.join(", ")}.`);
  }

  return { errors, warnings };
}
