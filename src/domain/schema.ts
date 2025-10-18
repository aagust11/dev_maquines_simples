import { z } from "zod";

export const UnitsSchema = z.object({
  g: z.number().positive().default(9.81),
});

export type Units = z.infer<typeof UnitsSchema>;

export const AnchorRefSchema = z.object({
  elementId: z.string().min(1, "elementId cannot be empty"),
  anchor: z.string().min(1, "anchor cannot be empty"),
});

export type AnchorRef = z.infer<typeof AnchorRefSchema>;

const ElementBaseSchema = z.object({
  id: z.string().min(1, "Element id cannot be empty"),
  name: z.string().min(1).optional(),
});

export const MassElementSchema = ElementBaseSchema.extend({
  type: z.literal("mass"),
  mass: z.number().nonnegative(),
});
export type MassElement = z.infer<typeof MassElementSchema>;

export const LeverElementSchema = ElementBaseSchema.extend({
  type: z.literal("lever"),
  armLeft: z.number().positive(),
  armRight: z.number().positive(),
  fulcrumPos: z.number().min(0).max(1),
  mass: z.number().nonnegative().optional(),
  eta: z.number().positive().max(1).optional(),
});
export type LeverElement = z.infer<typeof LeverElementSchema>;

export const PulleyElementSchema = ElementBaseSchema.extend({
  type: z.literal("pulley"),
  radius: z.number().positive(),
  mass: z.number().nonnegative().optional(),
  muBearing: z.number().nonnegative().optional(),
  muGroove: z.number().nonnegative().optional(),
  isFixed: z.boolean(),
});
export type PulleyElement = z.infer<typeof PulleyElementSchema>;

export const BlockAndTackleElementSchema = ElementBaseSchema.extend({
  type: z.literal("blockAndTackle"),
  fixedPulleys: z.number().int().min(1),
  movablePulleys: z.number().int().min(1),
  muPerSheave: z.number().nonnegative().optional(),
});
export type BlockAndTackleElement = z.infer<typeof BlockAndTackleElementSchema>;

export const WinchElementSchema = ElementBaseSchema.extend({
  type: z.literal("winch"),
  drumDiameter: z.number().positive(),
  handleDiameter: z.number().positive(),
  gearRatio: z.number().positive().optional(),
  eta: z.number().positive().max(1).optional(),
  maxRope: z.number().positive().optional(),
});
export type WinchElement = z.infer<typeof WinchElementSchema>;

export const RopeElementSchema = ElementBaseSchema.extend({
  type: z.literal("rope"),
  path: z.array(AnchorRefSchema).min(2),
});
export type RopeElement = z.infer<typeof RopeElementSchema>;

export const PivotElementSchema = ElementBaseSchema.extend({
  type: z.literal("pivot"),
});
export type PivotElement = z.infer<typeof PivotElementSchema>;

export const ElementSchema = z.discriminatedUnion("type", [
  MassElementSchema,
  LeverElementSchema,
  PulleyElementSchema,
  BlockAndTackleElementSchema,
  WinchElementSchema,
  RopeElementSchema,
  PivotElementSchema,
]);

export type Element = z.infer<typeof ElementSchema>;

export const ConstraintSchema = z.object({
  type: z.string(),
  data: z.unknown().optional(),
});

export type Constraint = z.infer<typeof ConstraintSchema>;

export const ViewSchema = z
  .object({
    camera: z
      .object({
        position: z.array(z.number()).length(3).optional(),
        target: z.array(z.number()).length(3).optional(),
      })
      .optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .partial();

export type View = z.infer<typeof ViewSchema>;

export const SceneSchema = z.object({
  version: z.literal(1),
  units: UnitsSchema,
  elements: z.array(ElementSchema),
  constraints: z.array(ConstraintSchema),
  view: ViewSchema.optional(),
});

export type Scene = z.infer<typeof SceneSchema>;

export const CURRENT_SCENE_VERSION = 1 as const;
