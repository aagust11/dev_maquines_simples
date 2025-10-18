import { getAnchorMap } from "./anchors";
import type { AnchorRef, Element, Scene } from "./types";

export type SceneIssue = {
  code: string;
  message: string;
  severity: "error" | "warning";
  elementId?: string;
  relatedAnchor?: AnchorRef;
};

function validateLever(element: Extract<Element, { type: "lever" }>): SceneIssue[] {
  const issues: SceneIssue[] = [];
  const totalArm = element.armLeft + element.armRight;
  if (totalArm <= 0) {
    issues.push({
      code: "lever/invalid-arms",
      message: "Lever arm lengths must be positive.",
      severity: "error",
      elementId: element.id,
    });
    return issues;
  }

  if (element.fulcrumPos <= 0 || element.fulcrumPos >= 1) {
    issues.push({
      code: "lever/fulcrum-out-of-range",
      message: "Fulcrum position must be strictly between 0 and 1 for usable levers.",
      severity: "error",
      elementId: element.id,
    });
  }

  const expectedFulcrum = element.armLeft / totalArm;
  if (Math.abs(expectedFulcrum - element.fulcrumPos) > 0.6) {
    issues.push({
      code: "lever/fulcrum-unbalanced",
      message: "Fulcrum position is far from the balance point and may be unstable.",
      severity: "warning",
      elementId: element.id,
    });
  }

  return issues;
}

function validateRope(
  element: Extract<Element, { type: "rope" }>,
  anchors: Map<string, readonly string[]>
): SceneIssue[] {
  const issues: SceneIssue[] = [];

  const seen: AnchorRef[] = [];
  element.path.forEach((ref, index) => {
    const anchorList = anchors.get(ref.elementId);
    if (!anchorList) {
      issues.push({
        code: "rope/missing-element",
        message: `Rope references unknown element '${ref.elementId}'.`,
        severity: "error",
        elementId: element.id,
        relatedAnchor: ref,
      });
      return;
    }

    if (!anchorList.includes(ref.anchor)) {
      issues.push({
        code: "rope/missing-anchor",
        message: `Rope references missing anchor '${ref.anchor}' on element '${ref.elementId}'.`,
        severity: "error",
        elementId: element.id,
        relatedAnchor: ref,
      });
      return;
    }

    if (index > 0) {
      const prev = seen[index - 1];
      if (prev && prev.elementId === ref.elementId && prev.anchor === ref.anchor) {
        issues.push({
          code: "rope/degenerate-segment",
          message: "Rope has consecutive identical anchor references.",
          severity: "warning",
          elementId: element.id,
          relatedAnchor: ref,
        });
      }
    }

    seen[index] = ref;
  });

  if (element.path.length < 2) {
    issues.push({
      code: "rope/too-short",
      message: "Rope paths must connect at least two anchors.",
      severity: "error",
      elementId: element.id,
    });
  }

  return issues;
}

function validateBlockAndTackle(
  element: Extract<Element, { type: "blockAndTackle" }>
): SceneIssue[] {
  const issues: SceneIssue[] = [];

  if (element.fixedPulleys + element.movablePulleys < 2) {
    issues.push({
      code: "block/insufficient-pulleys",
      message: "Block and tackle must have at least two pulleys in total.",
      severity: "error",
      elementId: element.id,
    });
  }

  return issues;
}

export function validateScene(scene: Scene): SceneIssue[] {
  const issues: SceneIssue[] = [];

  if (scene.units.g <= 0) {
    issues.push({
      code: "units/invalid-gravity",
      message: "Gravity must be a positive value.",
      severity: "error",
    });
  }

  const anchors = getAnchorMap(scene.elements);

  const ids = new Set<string>();
  scene.elements.forEach((element) => {
    if (ids.has(element.id)) {
      issues.push({
        code: "element/duplicate-id",
        message: `Duplicate element id '${element.id}'.`,
        severity: "error",
        elementId: element.id,
      });
    } else {
      ids.add(element.id);
    }

    switch (element.type) {
      case "lever":
        issues.push(...validateLever(element));
        break;
      case "rope":
        issues.push(...validateRope(element, anchors));
        break;
      case "blockAndTackle":
        issues.push(...validateBlockAndTackle(element));
        break;
      default:
        break;
    }
  });

  scene.constraints.forEach((constraint, index) => {
    if (!constraint.type) {
      issues.push({
        code: "constraint/missing-type",
        message: `Constraint at index ${index} is missing a type.`,
        severity: "error",
      });
    }
  });

  return issues;
}
