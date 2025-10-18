import { z } from 'zod';
import { MACHINE_BY_KIND, MACHINE_KINDS, MachineDefinition, MachineParameters } from './machines';

export const environmentSchema = z.object({
  gravity: z.number().positive().max(50)
});

export const sceneSchema = z.object({
  environment: environmentSchema,
  machine: z.object({
    kind: z.enum(MACHINE_KINDS),
    parameters: z.record(z.union([z.number(), z.string()]))
  })
});

export type Scene = z.infer<typeof sceneSchema>;

export const createDefaultScene = (definition: MachineDefinition): Scene => ({
  environment: { gravity: 9.81 },
  machine: {
    kind: definition.kind,
    parameters: definition.parameters.reduce<MachineParameters>((acc, param) => {
      acc[param.key] = param.defaultValue;
      return acc;
    }, {})
  }
});

export const normalizeScene = (scene: Scene): Scene => {
  const machineDefinition = MACHINE_BY_KIND[scene.machine.kind];
  return {
    environment: {
      gravity: scene.environment.gravity
    },
    machine: {
      kind: scene.machine.kind,
      parameters: {
        ...machineDefinition.parameters.reduce((acc, param) => {
          if (!(param.key in scene.machine.parameters)) {
            acc[param.key] = param.defaultValue;
          }
          return acc;
        }, {} as MachineParameters),
        ...scene.machine.parameters
      }
    }
  };
};
