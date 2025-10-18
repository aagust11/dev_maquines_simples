import { describe, expect, it } from "vitest";

import { computeTensions } from "./compute";
import {
  blockAndTackle2x2,
  blockAndTackle3x3,
  fixedPulley,
  movablePulley,
} from "./examples";

const GRAVITY = 9.81;

describe("rope-system computeTensions", () => {
  it("calculates mechanical advantage for the fixed pulley", () => {
    const result = computeTensions(fixedPulley, GRAVITY);
    expect(result.nSupportSegments).toBe(1);
    expect(result.mechanicalAdvantage).toBeCloseTo(1, 5);
  });

  it("calculates mechanical advantage for the movable pulley", () => {
    const result = computeTensions(movablePulley, GRAVITY);
    expect(result.nSupportSegments).toBe(2);
    expect(result.mechanicalAdvantage).toBeCloseTo(2, 5);
  });

  it("calculates mechanical advantage for the 2x2 block and tackle", () => {
    const result = computeTensions(blockAndTackle2x2, GRAVITY);
    expect(result.nSupportSegments).toBe(4);
    expect(result.mechanicalAdvantage).toBeCloseTo(4, 5);
  });

  it("calculates mechanical advantage for the 3x3 block and tackle", () => {
    const result = computeTensions(blockAndTackle3x3, GRAVITY);
    expect(result.nSupportSegments).toBe(6);
    expect(result.mechanicalAdvantage).toBeCloseTo(6, 5);
  });

  it("reduces the mechanical advantage when friction is present", () => {
    const sceneWithFriction = {
      ...blockAndTackle2x2,
      anchors: blockAndTackle2x2.anchors.map((anchor) =>
        anchor.type === "pulley"
          ? { ...anchor, frictionCoefficient: 0.05 }
          : anchor,
      ),
    };

    const result = computeTensions(sceneWithFriction, GRAVITY);
    expect(result.mechanicalAdvantage).toBeLessThan(4);
    expect(result.mechanicalAdvantage).toBeGreaterThan(0);
  });
});
