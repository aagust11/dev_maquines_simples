export const CURRENT_EDITOR_SCENE_VERSION = 1 as const;

export type RopeAnchorType = "fixed" | "pulley" | "load";

export type CanvasAnchor = {
  id: string;
  label: string;
  type: RopeAnchorType;
  offset: { x: number; y: number };
  attachedToLoad?: boolean;
  frictionCoefficient?: number;
  defaultWrapAngle?: number;
  diameter?: number;
};

export type ElementKind =
  | "fixed"
  | "pulley"
  | "blockAndTackle"
  | "lever"
  | "winch"
  | "load";

export type CanvasElement = {
  id: string;
  kind: ElementKind;
  name: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  anchors: CanvasAnchor[];
  data: Record<string, number | boolean | string>;
};

export type EditorSceneSnapshot = {
  editorVersion: typeof CURRENT_EDITOR_SCENE_VERSION;
  elements: CanvasElement[];
  ropePath: string[];
  gravity: number;
  loadMass: number;
  inputForceOverride?: number | null;
};
