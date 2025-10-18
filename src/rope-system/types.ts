export type RopeAnchorType = "fixed" | "pulley" | "load";

export interface BaseAnchor {
  id: string;
  label?: string;
  type: RopeAnchorType;
  /**
   * Coeficient de fricció per defecte aplicat a cada pas per aquest anchor.
   */
  frictionCoefficient?: number;
  /**
   * Angle de desviació per defecte (radiants) quan no s'especifica al pas.
   */
  defaultWrapAngle?: number;
}

export interface FixedAnchor extends BaseAnchor {
  type: "fixed";
}

export interface PulleyAnchor extends BaseAnchor {
  type: "pulley";
  /**
   * Indica si aquest rodet està solidari amb la càrrega.
   */
  attachedToLoad?: boolean;
}

export interface LoadAnchor extends BaseAnchor {
  type: "load";
  /**
   * Massa de la càrrega en kg.
   */
  mass: number;
}

export type RopeAnchor = FixedAnchor | PulleyAnchor | LoadAnchor;

export interface RopePass {
  anchorId: string;
  /**
   * Angle de contacte (radiants) per aquest pas concret.
   */
  wrapAngle?: number;
  /**
   * Coeficient de fricció específic del pas (prioritari sobre l'anchor).
   */
  frictionCoefficient?: number;
  label?: string;
}

export interface RopeLoad {
  /**
   * Massa de la càrrega en kg.
   */
  mass: number;
  /**
   * Identificadors dels anchors solidaris amb la càrrega.
   */
  anchorIds: string[];
}

export interface RopeScene {
  id: string;
  label?: string;
  anchors: RopeAnchor[];
  path: RopePass[];
  load: RopeLoad;
}

export interface RopeSceneValidation {
  errors: string[];
  warnings: string[];
}

export interface RopeSegmentResult {
  index: number;
  fromAnchorId: string;
  toAnchorId: string;
  supportsLoad: boolean;
  /**
   * Factor multiplicador respecte la tensió d'entrada.
   */
  multiplier: number;
  /**
   * Factor de fricció aplicat en travessar l'anchor següent.
   */
  frictionFactor: number;
  /**
   * Tensió efectiva en el tram.
   */
  tension: number;
}

export interface RopeTensionResult {
  sceneId: string;
  g: number;
  loadForce: number;
  inputForce: number;
  mechanicalAdvantage: number;
  nSupportSegments: number;
  segments: RopeSegmentResult[];
  validation: RopeSceneValidation;
}
