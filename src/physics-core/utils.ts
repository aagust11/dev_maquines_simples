import type { SolverOptions } from "./types";

export function weightFromMass(mass: number, { units }: SolverOptions): number {
  return mass * units.g;
}

export function clampEfficiency(value: number | undefined): number {
  if (value === undefined) {
    return 1;
  }

  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return 1;
  }

  return Math.min(Math.max(value, 0), 1);
}
