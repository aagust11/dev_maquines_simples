import { clampEfficiency, weightFromMass } from "./utils";
import { ensureNotes, type SolverOptions, type SolverResult } from "./types";

type WinchInput = SolverOptions & {
  loadMass: number;
  drumDiameter: number;
  handleDiameter: number;
  gearRatio?: number;
  efficiency?: number;
  inputDisplacement?: number;
  loadDisplacement?: number;
};

export function solveWinch(
  input: WinchInput
): SolverResult<{
  mechanicalAdvantageIdeal: number;
  mechanicalAdvantageReal: number;
  inputForce: number;
  loadForce: number;
  inputTorque: number;
  workInput?: number;
  workOutput?: number;
  workEfficiency?: number;
}> {
  const loadForce = weightFromMass(input.loadMass, input);
  const rHandle = input.handleDiameter / 2;
  const rDrum = input.drumDiameter / 2;
  const gearRatio = input.gearRatio ?? 1;
  const eta = clampEfficiency(input.efficiency);
  const etaSafe = eta === 0 ? Number.EPSILON : eta;

  const mechanicalAdvantageIdeal = (rHandle / rDrum) * gearRatio;
  const mechanicalAdvantageReal = mechanicalAdvantageIdeal * etaSafe;
  const inputForce = loadForce / mechanicalAdvantageReal;
  const inputTorque = inputForce * rHandle;
  const workInput =
    input.inputDisplacement !== undefined
      ? inputForce * input.inputDisplacement
      : undefined;
  const workOutput =
    input.loadDisplacement !== undefined
      ? loadForce * input.loadDisplacement
      : undefined;
  const workEfficiency =
    workInput !== undefined && workOutput !== undefined && workInput !== 0
      ? workOutput / workInput
      : undefined;

  return {
    result: {
      mechanicalAdvantageIdeal,
      mechanicalAdvantageReal,
      inputForce,
      loadForce,
      inputTorque,
      workInput,
      workOutput,
      workEfficiency,
    },
    formulaLatex:
      "AM_{real} = AM_{ideal} \\cdot \\eta, \\quad F_{in} = \\frac{F_G}{AM_{real}}, \\quad \\tau_{in} = F_{in} \\cdot r_h",
    substitutions: {
      F_G: loadForce,
      "r_h": rHandle,
      "r_d": rDrum,
      "AM_{ideal}": mechanicalAdvantageIdeal,
      "\\eta": etaSafe,
    },
    notes: ensureNotes([
      gearRatio !== 1
        ? `Es considera una relació de transmissió (gearRatio) = ${gearRatio}.`
        : undefined,
      eta < 1 && eta > 0
        ? "L'eficiència redueix l'avantatge mecànic respecte a la condició ideal."
        : undefined,
      eta === 0
        ? "L'eficiència nul·la s'aproxima amb un valor molt petit per evitar divisions per zero."
        : undefined,
      input.inputDisplacement !== undefined
        ? "El treball d'entrada es calcula amb el desplaçament aplicat a la manovella."
        : undefined,
      input.loadDisplacement !== undefined
        ? "El treball de sortida utilitza el desplaçament de la càrrega sobre el tambor."
        : undefined,
    ]),
  };
}
