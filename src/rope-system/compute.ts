import { validateScene } from "./validator";
import type {
  RopeScene,
  RopeTensionResult,
  RopeSegmentResult,
  RopeAnchor,
} from "./types";

const DEFAULT_GRAVITY = 9.81;

function resolveAnchor(scene: RopeScene, anchorId: string): RopeAnchor {
  const anchor = scene.anchors.find((item) => item.id === anchorId);
  if (!anchor) {
    throw new Error(`Anchor inexistent: ${anchorId}`);
  }
  return anchor;
}

function computeFrictionFactor(anchor: RopeAnchor, wrapAngle?: number, friction?: number): number {
  const effectiveWrap = wrapAngle ?? anchor.defaultWrapAngle ?? (anchor.type === "pulley" ? Math.PI : 0);
  const effectiveFriction = friction ?? anchor.frictionCoefficient ?? 0;
  if (effectiveWrap <= 0 || effectiveFriction <= 0) {
    return 1;
  }
  return Math.exp(effectiveFriction * effectiveWrap);
}

function buildSegmentResults(scene: RopeScene, inputForce: number): RopeSegmentResult[] {
  const segments: RopeSegmentResult[] = [];
  const loadAnchors = new Set(scene.load.anchorIds);
  const pathLength = scene.path.length;
  if (pathLength < 2) {
    return segments;
  }

  let cumulativeMultiplier = 1;
  for (let i = 0; i < pathLength - 1; i += 1) {
    const currentPass = scene.path[i];
    const nextPass = scene.path[i + 1];
    const nextAnchor = resolveAnchor(scene, nextPass.anchorId);

    const frictionFactor = computeFrictionFactor(
      nextAnchor,
      nextPass.wrapAngle,
      nextPass.frictionCoefficient,
    );

    const tension = inputForce * cumulativeMultiplier;
    const supportsLoad =
      loadAnchors.has(currentPass.anchorId) || loadAnchors.has(nextPass.anchorId);

    segments.push({
      index: i,
      fromAnchorId: currentPass.anchorId,
      toAnchorId: nextPass.anchorId,
      supportsLoad,
      multiplier: cumulativeMultiplier,
      frictionFactor,
      tension,
    });

    if (frictionFactor !== 0) {
      cumulativeMultiplier /= frictionFactor;
    }
  }

  return segments;
}

export function computeTensions(scene: RopeScene, g: number = DEFAULT_GRAVITY): RopeTensionResult {
  const validation = validateScene(scene);
  if (validation.errors.length > 0) {
    throw new Error(
      `L'escena presenta inconsistències: ${validation.errors.join("; ")}`,
    );
  }

  const loadForce = scene.load.mass * g;
  const segments = buildSegmentResults(scene, 1);

  const supportingSegments = segments.filter((segment) => segment.supportsLoad);
  if (supportingSegments.length === 0) {
    throw new Error("No s'ha detectat cap tram solidari amb la càrrega.");
  }

  const sumMultipliers = supportingSegments.reduce(
    (sum, segment) => sum + segment.multiplier,
    0,
  );

  if (sumMultipliers <= 0) {
    throw new Error("No és possible equilibrar la càrrega amb els paràmetres actuals.");
  }

  const inputForce = loadForce / sumMultipliers;
  const resolvedSegments = buildSegmentResults(scene, inputForce);

  const mechanicalAdvantage = loadForce / inputForce;

  return {
    sceneId: scene.id,
    g,
    loadForce,
    inputForce,
    mechanicalAdvantage,
    nSupportSegments: supportingSegments.length,
    segments: resolvedSegments,
    validation,
  };
}

export function computeInputForce(scene: RopeScene, g?: number): number {
  const result = computeTensions(scene, g);
  return result.inputForce;
}
