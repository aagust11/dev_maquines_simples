import { clampEfficiency, weightFromMass } from "./utils";
import { ensureNotes, type SolverOptions, type SolverResult } from "./types";

type BlockAndTackleInput = SolverOptions & {
  loadMass: number;
  segmentsOnLoad: number;
  sheaveCount: number;
  frictionPerSheave?: number;
  loadDisplacement?: number;
};

export function solveBlockAndTackle(
  input: BlockAndTackleInput
): SolverResult<{
  idealForce: number;
  realForce: number;
  inputDisplacement: number | undefined;
  efficiency: number;
}> {
  const loadForce = weightFromMass(input.loadMass, input);
  const idealForce = loadForce / input.segmentsOnLoad;
  const efficiency = clampEfficiency(
    input.frictionPerSheave !== undefined
      ? Math.pow(1 - input.frictionPerSheave, input.sheaveCount)
      : undefined
  );
  const effectiveEfficiency = efficiency === 0 ? Number.EPSILON : efficiency;
  const realForce = loadForce / (input.segmentsOnLoad * effectiveEfficiency);
  const inputDisplacement =
    input.loadDisplacement !== undefined
      ? input.loadDisplacement * input.segmentsOnLoad
      : undefined;

  return {
    result: {
      idealForce,
      realForce,
      inputDisplacement,
      efficiency,
    },
    formulaLatex:
      "F_{real} = \\frac{F_G}{n \\cdot \\eta}, \\quad \\Delta x_{in} = n \\cdot \\Delta x_{càrrega}",
    substitutions: {
      F_G: loadForce,
      n: input.segmentsOnLoad,
      "\\eta": efficiency,
      "\\Delta x_{càrrega}": input.loadDisplacement ?? "-",
    },
    notes: ensureNotes([
      input.frictionPerSheave !== undefined
        ? "L'eficiència global s'aproxima com (1 - \\mu)^{n_s}."
        : undefined,
      input.loadDisplacement === undefined
        ? "No s'ha proporcionat el desplaçament de la càrrega; només es calcula la força."
        : undefined,
      efficiency === 0
        ? "S'utilitza una eficiència mínima per evitar divisions per zero."
        : undefined,
    ]),
  };
}
