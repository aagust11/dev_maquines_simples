import { z } from 'zod';

export const MACHINE_KINDS = [
  'lever',
  'pulley-fixed',
  'pulley-movable',
  'block-and-tackle',
  'winch',
  'mass',
  'rope',
  'pivot'
] as const;

export type MachineKind = (typeof MACHINE_KINDS)[number];

export interface SimulationEnvironment {
  gravity: number;
}

export interface NumericParameterDefinition {
  type: 'number';
  key: string;
  label: string;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue: number;
  helper?: string;
}

export interface SelectParameterDefinition {
  type: 'select';
  key: string;
  label: string;
  options: { label: string; value: string }[];
  defaultValue: string;
}

export type ParameterDefinition =
  | NumericParameterDefinition
  | SelectParameterDefinition;

export type MachineParameters = Record<string, number | string>;

export interface MachineSolution {
  idealMechanicalAdvantage: number;
  actualMechanicalAdvantage: number;
  efficiency: number;
  inputForce: number;
  outputForce: number;
  workInput?: number;
  workOutput?: number;
  effortDisplacement?: number;
  loadDisplacement?: number;
  notes: string[];
}

export interface MachineComputation {
  solution: MachineSolution;
  derivation: string[];
}

export interface MachineDefinition {
  kind: MachineKind;
  label: string;
  parameters: ParameterDefinition[];
  schema: z.ZodTypeAny;
  solve: (params: MachineParameters, env: SimulationEnvironment) => MachineComputation;
}

const round = (value: number, digits = 4) => {
  return Math.round(value * 10 ** digits) / 10 ** digits;
};

const numberParam = (
  config: Omit<NumericParameterDefinition, 'type'>
): NumericParameterDefinition => ({ type: 'number', ...config });

const selectParam = (
  config: Omit<SelectParameterDefinition, 'type'>
): SelectParameterDefinition => ({ type: 'select', ...config });

const baseMechanicalSolution = (
  idealMechanicalAdvantage: number,
  actualMechanicalAdvantage: number,
  inputForce: number,
  outputForce: number,
  extra?: Partial<MachineSolution>
): MachineSolution => ({
  idealMechanicalAdvantage,
  actualMechanicalAdvantage,
  efficiency:
    idealMechanicalAdvantage === 0
      ? 0
      : round((actualMechanicalAdvantage / idealMechanicalAdvantage) * 100, 2),
  inputForce,
  outputForce,
  notes: [],
  ...extra
});

const safeDivision = (numerator: number, denominator: number) =>
  denominator === 0 ? 0 : numerator / denominator;

const createLeverDefinition = (): MachineDefinition => {
  const schema = z.object({
    leverClass: z.enum(['first', 'second', 'third']),
    effortArm: z.number().positive(),
    loadArm: z.number().positive(),
    loadMass: z.number().positive(),
    effortForce: z.number().positive(),
    loadDisplacement: z.number().positive()
  });

  const parameters: ParameterDefinition[] = [
    selectParam({
      key: 'leverClass',
      label: 'Tipus de palanca',
      options: [
        { value: 'first', label: '1r gènere (balancí)' },
        { value: 'second', label: '2n gènere (carretó)' },
        { value: 'third', label: '3r gènere (braç humà)' }
      ],
      defaultValue: 'first'
    }),
    numberParam({
      key: 'effortArm',
      label: 'Braç de potència',
      unit: 'm',
      min: 0.01,
      defaultValue: 1.2
    }),
    numberParam({
      key: 'loadArm',
      label: 'Braç de resistència',
      unit: 'm',
      min: 0.01,
      defaultValue: 0.6
    }),
    numberParam({
      key: 'loadMass',
      label: 'Massa de la càrrega',
      unit: 'kg',
      min: 0.1,
      defaultValue: 20
    }),
    numberParam({
      key: 'effortForce',
      label: 'Força aplicada',
      unit: 'N',
      min: 1,
      defaultValue: 120
    }),
    numberParam({
      key: 'loadDisplacement',
      label: 'Desplaçament de la càrrega',
      unit: 'm',
      min: 0.01,
      defaultValue: 0.2
    })
  ];

  return {
    kind: 'lever',
    label: 'Palanca',
    parameters,
    schema,
    solve: (params, env) => {
      const parsed = schema.parse(params);
      const weight = parsed.loadMass * env.gravity;
      const idealEffort = weight * parsed.loadArm * (1 / parsed.effortArm);
      const ima = safeDivision(parsed.effortArm, parsed.loadArm);
      const ama = safeDivision(weight, parsed.effortForce);
      const effortDisplacement = parsed.loadDisplacement * safeDivision(parsed.loadArm, parsed.effortArm);
      const workOutput = weight * parsed.loadDisplacement;
      const workInput = parsed.effortForce * effortDisplacement;

      const solution = baseMechanicalSolution(ima, ama, parsed.effortForce, weight, {
        loadDisplacement: round(parsed.loadDisplacement, 4),
        effortDisplacement: round(effortDisplacement, 4),
        workInput: round(workInput, 4),
        workOutput: round(workOutput, 4)
      });

      const derivation = [
        `F_G = m g = ${parsed.loadMass}\\,\n\text{kg} \cdot ${env.gravity}\\,\n\text{m·s}^{-2} = ${round(weight, 3)}\\,\n\text{N}`,
        `IMA = \n\frac{d_\\text{potència}}{d_\\text{resistència}} = \n\frac{${parsed.effortArm}}{${parsed.loadArm}} = ${round(ima, 3)}`,
        `F_\\text{ideal} = \n\frac{F_G \cdot d_\\text{resistència}}{d_\\text{potència}} = \n\frac{${round(weight, 3)} \cdot ${parsed.loadArm}}{${parsed.effortArm}} = ${round(idealEffort, 3)}\\,\n\text{N}`,
        `AM_R = \n\frac{F_G}{F_\\text{aplicada}} = \n\frac{${round(weight, 3)}}{${parsed.effortForce}} = ${round(ama, 3)}`,
        `\eta = \n\frac{AM_R}{IMA} \cdot 100 = \n\frac{${round(ama, 3)}}{${round(ima, 3)}} \cdot 100 = ${round(solution.efficiency, 2)}\\,\%`,
        `s_\\text{potència} = s_\\text{resistència} \cdot \n\frac{d_\\text{resistència}}{d_\\text{potència}} = ${parsed.loadDisplacement} \cdot \n\frac{${parsed.loadArm}}{${parsed.effortArm}} = ${round(effortDisplacement, 4)}\\,\n\text{m}`,
        `W_\\text{sortida} = F_G \cdot s_\\text{resistència} = ${round(weight, 3)} \cdot ${parsed.loadDisplacement} = ${round(workOutput, 4)}\\,\n\text{J}`,
        `W_\\text{entrada} = F_\\text{aplicada} \cdot s_\\text{potència} = ${parsed.effortForce} \cdot ${round(effortDisplacement, 4)} = ${round(workInput, 4)}\\,\n\text{J}`
      ];

      if (parsed.leverClass === 'third' && ima > 1) {
        solution.notes.push(
          'Les palanques de tercer gènere solen tenir avantatge mecànic inferior a 1; revisa la configuració.'
        );
      }

      return { solution, derivation };
    }
  };
};

const createFixedPulleyDefinition = (): MachineDefinition => {
  const schema = z.object({
    loadMass: z.number().positive(),
    effortForce: z.number().positive()
  });

  const parameters: ParameterDefinition[] = [
    numberParam({
      key: 'loadMass',
      label: 'Massa de la càrrega',
      unit: 'kg',
      min: 0.1,
      defaultValue: 30
    }),
    numberParam({
      key: 'effortForce',
      label: 'Força aplicada',
      unit: 'N',
      min: 1,
      defaultValue: 300
    })
  ];

  return {
    kind: 'pulley-fixed',
    label: 'Politja fixa',
    parameters,
    schema,
    solve: (params, env) => {
      const parsed = schema.parse(params);
      const weight = parsed.loadMass * env.gravity;
      const ima = 1;
      const ama = safeDivision(weight, parsed.effortForce);
      const solution = baseMechanicalSolution(ima, ama, parsed.effortForce, weight);
      const derivation = [
        `F_G = m g = ${parsed.loadMass} \cdot ${env.gravity} = ${round(weight, 3)}\\,\n\text{N}`,
        `IMA = 1 \text{ (politja fixa)}`,
        `AM_R = \n\frac{F_G}{F_\\text{aplicada}} = \n\frac{${round(weight, 3)}}{${parsed.effortForce}} = ${round(ama, 3)}`,
        `\eta = \n\frac{AM_R}{IMA} \cdot 100 = ${round(solution.efficiency, 2)}\\,\%`
      ];
      if (ama < 0.9) {
        solution.notes.push('La força aplicada és sensiblement superior al pes; pot indicar pèrdues elevades.');
      }
      return { solution, derivation };
    }
  };
};

const createMovablePulleyDefinition = (): MachineDefinition => {
  const schema = z.object({
    loadMass: z.number().positive(),
    effortForce: z.number().positive()
  });

  const parameters: ParameterDefinition[] = [
    numberParam({
      key: 'loadMass',
      label: 'Massa de la càrrega',
      unit: 'kg',
      min: 0.1,
      defaultValue: 30
    }),
    numberParam({
      key: 'effortForce',
      label: 'Força aplicada',
      unit: 'N',
      min: 1,
      defaultValue: 200
    })
  ];

  return {
    kind: 'pulley-movable',
    label: 'Politja mòbil',
    parameters,
    schema,
    solve: (params, env) => {
      const parsed = schema.parse(params);
      const weight = parsed.loadMass * env.gravity;
      const ima = 2;
      const ama = safeDivision(weight, parsed.effortForce);
      const solution = baseMechanicalSolution(ima, ama, parsed.effortForce, weight, {
        effortDisplacement: round(2, 3)
      });
      const derivation = [
        `F_G = m g = ${parsed.loadMass} \cdot ${env.gravity} = ${round(weight, 3)}\\,\n\text{N}`,
        `IMA = 2 \text{ (dos trams de corda de suport)}`,
        `AM_R = \n\frac{F_G}{F_\\text{aplicada}} = \n\frac{${round(weight, 3)}}{${parsed.effortForce}} = ${round(ama, 3)}`,
        `\eta = \n\frac{AM_R}{IMA} \cdot 100 = ${round(solution.efficiency, 2)}\\,\%`
      ];
      return { solution, derivation };
    }
  };
};

const createBlockAndTackleDefinition = (): MachineDefinition => {
  const schema = z.object({
    loadMass: z.number().positive(),
    supportingRopes: z.number().int().min(2).max(6),
    effortForce: z.number().positive()
  });

  const parameters: ParameterDefinition[] = [
    numberParam({
      key: 'loadMass',
      label: 'Massa de la càrrega',
      unit: 'kg',
      min: 0.1,
      defaultValue: 50
    }),
    numberParam({
      key: 'supportingRopes',
      label: 'Trams de corda de suport',
      unit: '—',
      min: 2,
      max: 6,
      step: 1,
      defaultValue: 4,
      helper: 'Nombre de cordes que suporten directament la càrrega.'
    }),
    numberParam({
      key: 'effortForce',
      label: 'Força aplicada',
      unit: 'N',
      min: 1,
      defaultValue: 180
    })
  ];

  return {
    kind: 'block-and-tackle',
    label: 'Polispast',
    parameters,
    schema,
    solve: (params, env) => {
      const parsed = schema.parse(params);
      const weight = parsed.loadMass * env.gravity;
      const ima = parsed.supportingRopes;
      const ama = safeDivision(weight, parsed.effortForce);
      const effortDisplacement = parsed.supportingRopes;
      const solution = baseMechanicalSolution(ima, ama, parsed.effortForce, weight, {
        effortDisplacement: round(effortDisplacement, 3),
        loadDisplacement: 1,
        workInput: round(parsed.effortForce * effortDisplacement, 3),
        workOutput: round(weight * 1, 3)
      });
      const derivation = [
        `F_G = m g = ${parsed.loadMass} \cdot ${env.gravity} = ${round(weight, 3)}\\,\n\text{N}`,
        `IMA = n_\\text{cordes} = ${parsed.supportingRopes}`,
        `AM_R = \n\frac{F_G}{F_\\text{aplicada}} = \n\frac{${round(weight, 3)}}{${parsed.effortForce}} = ${round(ama, 3)}`,
        `s_\\text{potència} = n_\\text{cordes} \cdot s_\\text{resistència} = ${parsed.supportingRopes} \cdot 1 = ${parsed.supportingRopes}\\,\n\text{m}`,
        `\eta = \n\frac{AM_R}{IMA} \cdot 100 = ${round(solution.efficiency, 2)}\\,\%`
      ];
      if (ama < ima * 0.5) {
        solution.notes.push('Revisa els fregaments i la massa de les politges: l’avantatge real és baix.');
      }
      return { solution, derivation };
    }
  };
};

const createWinchDefinition = (): MachineDefinition => {
  const schema = z.object({
    handleLength: z.number().positive(),
    drumRadius: z.number().positive(),
    loadMass: z.number().positive(),
    effortForce: z.number().positive()
  });

  const parameters: ParameterDefinition[] = [
    numberParam({
      key: 'handleLength',
      label: 'Radi de la manovella',
      unit: 'm',
      min: 0.05,
      defaultValue: 0.3
    }),
    numberParam({
      key: 'drumRadius',
      label: 'Radi del tambor',
      unit: 'm',
      min: 0.02,
      defaultValue: 0.08
    }),
    numberParam({
      key: 'loadMass',
      label: 'Massa de la càrrega',
      unit: 'kg',
      min: 0.1,
      defaultValue: 40
    }),
    numberParam({
      key: 'effortForce',
      label: 'Força aplicada tangencial',
      unit: 'N',
      min: 1,
      defaultValue: 160
    })
  ];

  return {
    kind: 'winch',
    label: 'Torn / Manovella',
    parameters,
    schema,
    solve: (params, env) => {
      const parsed = schema.parse(params);
      const weight = parsed.loadMass * env.gravity;
      const torqueEffort = parsed.effortForce * parsed.handleLength;
      const outputForce = safeDivision(torqueEffort, parsed.drumRadius);
      const ima = safeDivision(parsed.handleLength, parsed.drumRadius);
      const ama = safeDivision(outputForce, parsed.effortForce);
      const solution = baseMechanicalSolution(ima, ama, parsed.effortForce, outputForce, {
        workInput: round(2 * Math.PI * parsed.handleLength * parsed.effortForce, 4),
        workOutput: round(2 * Math.PI * parsed.drumRadius * outputForce, 4)
      });
      const derivation = [
        `\tau_\\text{entrada} = F_\\text{aplicada} \cdot r_\\text{manovella} = ${parsed.effortForce} \cdot ${parsed.handleLength} = ${round(
          torqueEffort,
          3
        )}\\,\n\text{N·m}`,
        `F_\\text{sortida} = \n\frac{\tau_\\text{entrada}}{r_\\text{tambor}} = \n\frac{${round(torqueEffort, 3)}}{${parsed.drumRadius}} = ${round(outputForce, 3)}\\,\n\text{N}`,
        `IMA = \n\frac{r_\\text{manovella}}{r_\\text{tambor}} = \n\frac{${parsed.handleLength}}{${parsed.drumRadius}} = ${round(ima, 3)}`,
        `AM_R = \n\frac{F_\\text{sortida}}{F_\\text{aplicada}} = \n\frac{${round(outputForce, 3)}}{${parsed.effortForce}} = ${round(ama, 3)}`,
        `\eta = \n\frac{AM_R}{IMA} \cdot 100 = ${round(solution.efficiency, 2)}\\,\%`
      ];
      if (outputForce < weight) {
        solution.notes.push('La força de sortida no és suficient per elevar la càrrega especificada.');
      }
      return { solution, derivation };
    }
  };
};

const createMassDefinition = (): MachineDefinition => {
  const schema = z.object({
    mass: z.number().positive(),
    height: z.number().nonnegative()
  });

  const parameters: ParameterDefinition[] = [
    numberParam({
      key: 'mass',
      label: 'Massa',
      unit: 'kg',
      min: 0.1,
      defaultValue: 5
    }),
    numberParam({
      key: 'height',
      label: 'Alçada respecte a la referència',
      unit: 'm',
      min: 0,
      defaultValue: 2
    })
  ];

  return {
    kind: 'mass',
    label: 'Massa puntual',
    parameters,
    schema,
    solve: (params, env) => {
      const parsed = schema.parse(params);
      const weight = parsed.mass * env.gravity;
      const potentialEnergy = weight * parsed.height;
      const solution = baseMechanicalSolution(1, 1, weight, weight, {
        workOutput: round(potentialEnergy, 4)
      });
      const derivation = [
        `F_G = m g = ${parsed.mass} \cdot ${env.gravity} = ${round(weight, 3)}\\,\n\text{N}`,
        `E_p = m g h = ${parsed.mass} \cdot ${env.gravity} \cdot ${parsed.height} = ${round(potentialEnergy, 3)}\\,\n\text{J}`
      ];
      solution.notes.push('Model puntual ideal per combinar amb altres elements de l’escena.');
      return { solution, derivation };
    }
  };
};

const createRopeDefinition = (): MachineDefinition => {
  const schema = z.object({
    loadMass: z.number().positive(),
    segments: z.number().int().min(1).max(6),
    angle: z.number().min(0).max(90)
  });

  const parameters: ParameterDefinition[] = [
    numberParam({
      key: 'loadMass',
      label: 'Massa penjada',
      unit: 'kg',
      min: 0.1,
      defaultValue: 10
    }),
    numberParam({
      key: 'segments',
      label: 'Segments de corda que suporten el pes',
      unit: '—',
      min: 1,
      max: 6,
      step: 1,
      defaultValue: 1
    }),
    numberParam({
      key: 'angle',
      label: 'Angle respecte l’horitzontal',
      unit: '°',
      min: 0,
      max: 90,
      defaultValue: 0,
      helper: 'Per a cordes inclinades (per exemple, tirants).' 
    })
  ];

  return {
    kind: 'rope',
    label: 'Corda / Tirant',
    parameters,
    schema,
    solve: (params, env) => {
      const parsed = schema.parse(params);
      const weight = parsed.loadMass * env.gravity;
      const angleRad = (parsed.angle * Math.PI) / 180;
      const cosine = Math.cos(angleRad);
      const tension = safeDivision(weight, parsed.segments * cosine);
      const solution = baseMechanicalSolution(1, 1, tension, weight, {
        notes: [`Tensió total a cada corda: ${round(tension, 3)} N`]
      });
      const derivation = [
        `F_G = m g = ${parsed.loadMass} \cdot ${env.gravity} = ${round(weight, 3)}\\,\n\text{N}`,
        `T = \n\frac{F_G}{n_\\text{segments} \cdot \cos(\theta)} = \n\frac{${round(weight, 3)}}{${parsed.segments} \cdot \cos(${parsed.angle}^\\circ)} = ${round(tension, 3)}\\,\n\text{N}`
      ];
      if (parsed.angle > 60) {
        solution.notes.push('Angles grans incrementen notablement la tensió; comprova els materials.');
      }
      if (Math.abs(cosine) < 0.05) {
        solution.notes.push('L’angle és massa proper a 90°; el model retorna tensions molt elevades.');
      }
      return { solution, derivation };
    }
  };
};

const createPivotDefinition = (): MachineDefinition => {
  const schema = z.object({
    span: z.number().positive(),
    loadMass: z.number().positive(),
    offset: z.number().min(-0.5).max(0.5)
  });

  const parameters: ParameterDefinition[] = [
    numberParam({
      key: 'span',
      label: 'Separació dels suports',
      unit: 'm',
      min: 0.1,
      defaultValue: 2
    }),
    numberParam({
      key: 'loadMass',
      label: 'Massa aplicada a la biga',
      unit: 'kg',
      min: 0.1,
      defaultValue: 15
    }),
    numberParam({
      key: 'offset',
      label: 'Posició relativa de la càrrega (-0.5 a 0.5)',
      unit: '—',
      min: -0.5,
      max: 0.5,
      step: 0.05,
      defaultValue: 0
    })
  ];

  return {
    kind: 'pivot',
    label: 'Suport / Pivot',
    parameters,
    schema,
    solve: (params, env) => {
      const parsed = schema.parse(params);
      const weight = parsed.loadMass * env.gravity;
      const leftArm = (0.5 + parsed.offset) * parsed.span;
      const rightArm = parsed.span - leftArm;
      const reactionLeft = safeDivision(weight * rightArm, parsed.span);
      const reactionRight = weight - reactionLeft;
      const solution = baseMechanicalSolution(1, 1, weight, weight, {
        notes: [
          `Reacció esquerra: ${round(reactionLeft, 3)} N`,
          `Reacció dreta: ${round(reactionRight, 3)} N`
        ]
      });
      const derivation = [
        `F_G = m g = ${parsed.loadMass} \cdot ${env.gravity} = ${round(weight, 3)}\\,\n\text{N}`,
        `\sum M_{E} = 0 \Rightarrow R_D \cdot ${parsed.span} = F_G \cdot ${round(leftArm, 3)}`,
        `R_D = \n\frac{F_G \cdot ${round(leftArm, 3)}}{${parsed.span}} = ${round(reactionRight, 3)}\\,\n\text{N}`,
        `R_E = F_G - R_D = ${round(weight, 3)} - ${round(reactionRight, 3)} = ${round(reactionLeft, 3)}\\,\n\text{N}`
      ];
      return { solution, derivation };
    }
  };
};

export const MACHINE_DEFINITIONS: MachineDefinition[] = [
  createLeverDefinition(),
  createFixedPulleyDefinition(),
  createMovablePulleyDefinition(),
  createBlockAndTackleDefinition(),
  createWinchDefinition(),
  createMassDefinition(),
  createRopeDefinition(),
  createPivotDefinition()
];

export const MACHINE_BY_KIND: Record<MachineKind, MachineDefinition> = Object.fromEntries(
  MACHINE_DEFINITIONS.map((definition) => [definition.kind, definition])
) as Record<MachineKind, MachineDefinition>;

export const machineParameterDefaults = (definition: MachineDefinition): MachineParameters => {
  const defaults: MachineParameters = {};
  definition.parameters.forEach((param) => {
    if (param.type === 'number') {
      defaults[param.key] = param.defaultValue;
    } else {
      defaults[param.key] = param.defaultValue;
    }
  });
  return defaults;
};
