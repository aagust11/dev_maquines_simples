import type { RopeScene } from "./types";

const DEFAULT_MU = 0;
const PI = Math.PI;

export const fixedPulley: RopeScene = {
  id: "fixed-pulley",
  label: "Polidora fixa (AM = 1)",
  anchors: [
    { id: "input", type: "fixed", label: "Extrem lliure" },
    { id: "pulley", type: "pulley", label: "Rodat fix", frictionCoefficient: DEFAULT_MU, defaultWrapAngle: PI },
    { id: "load", type: "load", label: "Càrrega", mass: 100 },
  ],
  path: [
    { anchorId: "input" },
    { anchorId: "pulley", wrapAngle: PI },
    { anchorId: "load" },
  ],
  load: {
    mass: 100,
    anchorIds: ["load"],
  },
};

export const movablePulley: RopeScene = {
  id: "movable-pulley",
  label: "Polidora mòbil (AM = 2)",
  anchors: [
    { id: "input", type: "fixed", label: "Extrem lliure" },
    {
      id: "moving",
      type: "pulley",
      label: "Rodat mòbil",
      frictionCoefficient: DEFAULT_MU,
      defaultWrapAngle: PI,
      attachedToLoad: true,
    },
    { id: "support", type: "fixed", label: "Punt fixe" },
  ],
  path: [
    { anchorId: "input" },
    { anchorId: "moving", wrapAngle: PI },
    { anchorId: "support" },
  ],
  load: {
    mass: 100,
    anchorIds: ["moving"],
  },
};

export const blockAndTackle2x2: RopeScene = {
  id: "block-tackle-2x2",
  label: "Polispast 2×2",
  anchors: [
    { id: "input", type: "fixed", label: "Extrem lliure" },
    { id: "top2", type: "pulley", label: "Rodat superior 2", frictionCoefficient: DEFAULT_MU, defaultWrapAngle: PI },
    {
      id: "bottom2",
      type: "pulley",
      label: "Rodat inferior 2",
      frictionCoefficient: DEFAULT_MU,
      defaultWrapAngle: PI,
      attachedToLoad: true,
    },
    { id: "top1", type: "pulley", label: "Rodat superior 1", frictionCoefficient: DEFAULT_MU, defaultWrapAngle: PI },
    {
      id: "bottom1",
      type: "pulley",
      label: "Rodat inferior 1",
      frictionCoefficient: DEFAULT_MU,
      defaultWrapAngle: PI,
      attachedToLoad: true,
    },
    { id: "tie", type: "fixed", label: "Ancoratge superior" },
  ],
  path: [
    { anchorId: "input" },
    { anchorId: "top2", wrapAngle: PI },
    { anchorId: "bottom2", wrapAngle: PI },
    { anchorId: "top1", wrapAngle: PI },
    { anchorId: "bottom1", wrapAngle: PI },
    { anchorId: "tie" },
  ],
  load: {
    mass: 100,
    anchorIds: ["bottom1", "bottom2"],
  },
};

export const blockAndTackle3x3: RopeScene = {
  id: "block-tackle-3x3",
  label: "Polispast 3×3",
  anchors: [
    { id: "input", type: "fixed", label: "Extrem lliure" },
    { id: "top3", type: "pulley", label: "Rodat superior 3", frictionCoefficient: DEFAULT_MU, defaultWrapAngle: PI },
    {
      id: "bottom3",
      type: "pulley",
      label: "Rodat inferior 3",
      frictionCoefficient: DEFAULT_MU,
      defaultWrapAngle: PI,
      attachedToLoad: true,
    },
    { id: "top2", type: "pulley", label: "Rodat superior 2", frictionCoefficient: DEFAULT_MU, defaultWrapAngle: PI },
    {
      id: "bottom2",
      type: "pulley",
      label: "Rodat inferior 2",
      frictionCoefficient: DEFAULT_MU,
      defaultWrapAngle: PI,
      attachedToLoad: true,
    },
    { id: "top1", type: "pulley", label: "Rodat superior 1", frictionCoefficient: DEFAULT_MU, defaultWrapAngle: PI },
    {
      id: "bottom1",
      type: "pulley",
      label: "Rodat inferior 1",
      frictionCoefficient: DEFAULT_MU,
      defaultWrapAngle: PI,
      attachedToLoad: true,
    },
    { id: "tie", type: "fixed", label: "Ancoratge superior" },
  ],
  path: [
    { anchorId: "input" },
    { anchorId: "top3", wrapAngle: PI },
    { anchorId: "bottom3", wrapAngle: PI },
    { anchorId: "top2", wrapAngle: PI },
    { anchorId: "bottom2", wrapAngle: PI },
    { anchorId: "top1", wrapAngle: PI },
    { anchorId: "bottom1", wrapAngle: PI },
    { anchorId: "tie" },
  ],
  load: {
    mass: 100,
    anchorIds: ["bottom1", "bottom2", "bottom3"],
  },
};

export const ropeSystemExamples = {
  fixedPulley,
  movablePulley,
  blockAndTackle2x2,
  blockAndTackle3x3,
};
