import { clampEfficiency, weightFromMass } from "./utils";
import { ensureNotes, type SolverOptions, type SolverResult } from "./types";

type PulleyInput = SolverOptions & {
  loadMass: number;
  muSheave?: number;
};

export function solveFixedPulley(
  input: PulleyInput
): SolverResult<{ inputForce: number; loadForce: number; efficiency: number }> {
  return solvePulleyWithAdvantage({ ...input, mechanicalAdvantage: 1 });
}

export function solveMovablePulley(
  input: PulleyInput
): SolverResult<{ inputForce: number; loadForce: number; efficiency: number }> {
  return solvePulleyWithAdvantage({ ...input, mechanicalAdvantage: 2 });
}

type InternalPulleyInput = PulleyInput & { mechanicalAdvantage: number };

function solvePulleyWithAdvantage(
  input: InternalPulleyInput
): SolverResult<{ inputForce: number; loadForce: number; efficiency: number }> {
  const loadForce = weightFromMass(input.loadMass, input);
  const efficiency = clampEfficiency(
    input.muSheave !== undefined ? 1 - input.muSheave : undefined
  );
  const effectiveEfficiency = efficiency === 0 ? Number.EPSILON : efficiency;
  const inputForce =
    loadForce / (input.mechanicalAdvantage * effectiveEfficiency);

  return {
    result: { inputForce, loadForce, efficiency },
    formulaLatex:
      "F_{in} = \\frac{F_G}{AM_{ideal} \\cdot \\eta_{\\text{politja}}}",
    substitutions: {
      F_G: loadForce,
      "AM_{ideal}": input.mechanicalAdvantage,
      "\\eta_{politja}": efficiency,
    },
    notes: ensureNotes([
      `AM_{ideal} = ${input.mechanicalAdvantage}`,
      input.muSheave !== undefined
        ? "L'eficiència de la politja es deriva de (1 - \\mu_{sheave})."
        : undefined,
      efficiency === 0
        ? "S'empra una eficiència mínima per evitar divisions per zero."
        : undefined,
    ]),
  };
}
