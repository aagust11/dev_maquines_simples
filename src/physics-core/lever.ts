import { clampEfficiency, weightFromMass } from "./utils";
import { ensureNotes, type SolverOptions, type SolverResult } from "./types";

type LeverBalanceInput = {
  forceLeft: number;
  distanceLeft: number;
  distanceRight: number;
};

type LeverRequiredForceInput = SolverOptions & {
  loadMass: number;
  distanceLoad: number;
  distanceEffort: number;
  efficiency?: number;
};

type LeverFulcrumReactionInput = {
  forces: number[];
};

export function solveLeverBalance(
  input: LeverBalanceInput
): SolverResult<{ forceRight: number }> {
  const forceRight = (input.forceLeft * input.distanceLeft) / input.distanceRight;

  return {
    result: { forceRight },
    formulaLatex: "F_{\\mathrm{dre}} = \\frac{F_{\\mathrm{esq}} \\cdot d_{\\mathrm{esq}}}{d_{\\mathrm{dre}}}",
    substitutions: {
      "F_{esq}": input.forceLeft,
      "d_{esq}": input.distanceLeft,
      "d_{dre}": input.distanceRight,
    },
    notes: [
      "En equilibri estàtic, el moment a banda i banda del fulcre és idèntic.",
    ],
  };
}

export function solveLeverRequiredForce(
  input: LeverRequiredForceInput
): SolverResult<{ inputForce: number; loadForce: number; efficiency: number }> {
  const loadForce = weightFromMass(input.loadMass, input);
  const efficiency = clampEfficiency(input.efficiency);
  const effectiveEfficiency = efficiency === 0 ? Number.EPSILON : efficiency;
  const inputForce =
    (loadForce * input.distanceLoad) /
    (input.distanceEffort * effectiveEfficiency);

  return {
    result: { inputForce, loadForce, efficiency },
    formulaLatex:
      "F_{\\text{necessària}} = \\frac{F_G \\cdot d_{\\text{càrrega}}}{d_{\\text{esforç}} \\cdot \\eta_{\\text{palanca}}}",
    substitutions: {
      F_G: loadForce,
      "d_{càrrega}": input.distanceLoad,
      "d_{esforç}": input.distanceEffort,
      "\\eta_{palanca}": efficiency,
    },
    notes: ensureNotes([
      efficiency < 1 && efficiency > 0
        ? "S'aplica una eficiència menor que 1 per modelar pèrdues d'energia."
        : undefined,
      efficiency === 0
        ? "L'eficiència nul·la s'aproxima amb un valor molt petit per evitar divisions per zero."
        : undefined,
      `S'utilitza g = ${input.units.g.toFixed(2)} \\; m/s^2 per calcular el pes de la càrrega.`,
    ]),
  };
}

export function solveLeverFulcrumReaction(
  input: LeverFulcrumReactionInput
): SolverResult<{ reaction: number }> {
  const reaction = input.forces.reduce((sum, value) => sum + value, 0);

  const substitutions = input.forces.reduce<Record<string, number>>((acc, value, index) => {
    acc[`F_${index + 1}`] = value;
    return acc;
  }, {});

  return {
    result: { reaction },
    formulaLatex: "R = \\sum_i F_i",
    substitutions,
    notes: ["La reacció al fulcre equilibra la suma de forces verticals aplicades."],
  };
}
