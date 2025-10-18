import type {
  BlockAndTackleElement,
  Element,
  LeverElement,
  MassElement,
  PivotElement,
  PulleyElement,
  RopeElement,
  WinchElement,
} from "./types";

type ElementWithAnchors =
  | MassElement
  | LeverElement
  | PulleyElement
  | WinchElement
  | RopeElement
  | PivotElement
  | BlockAndTackleElement;

const MASS_ANCHORS = ["topRing"] as const;
const LEVER_ANCHORS = ["leftHook", "rightHook", "fulcrum"] as const;
const PULLEY_ANCHORS = ["axle", "in", "out"] as const;
const WINCH_ANCHORS = ["drumOut"] as const;
const PIVOT_ANCHORS: readonly string[] = [];
const ROPE_ANCHORS: readonly string[] = [];
const BLOCK_AND_TACKLE_ANCHORS: readonly string[] = [];

export type MassAnchor = (typeof MASS_ANCHORS)[number];
export type LeverAnchor = (typeof LEVER_ANCHORS)[number];
export type PulleyAnchor = (typeof PULLEY_ANCHORS)[number];
export type WinchAnchor = (typeof WINCH_ANCHORS)[number];

export function getAnchors(element: ElementWithAnchors): readonly string[] {
  switch (element.type) {
    case "mass":
      return MASS_ANCHORS;
    case "lever":
      return LEVER_ANCHORS;
    case "pulley":
      return PULLEY_ANCHORS;
    case "winch":
      return WINCH_ANCHORS;
    case "pivot":
      return PIVOT_ANCHORS;
    case "rope":
      return ROPE_ANCHORS;
    case "blockAndTackle":
      return BLOCK_AND_TACKLE_ANCHORS;
    default:
      return [];
  }
}

export function getAnchorMap(elements: Element[]): Map<string, readonly string[]> {
  return new Map(elements.map((element) => [element.id, getAnchors(element)]));
}
