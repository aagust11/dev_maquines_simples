import type { Units } from "../domain/types";

export type SolverResult<T> = {
  /**
   * Main numeric or structured result of the solver.
   */
  result: T;
  /**
   * LaTeX representation of the main formula used in the solver.
   */
  formulaLatex: string;
  /**
   * Substitutions performed on the symbolic formula.
   */
  substitutions: Record<string, number | string>;
  /**
   * Additional qualitative observations about the computation.
   */
  notes: string[];
};

export type SolverOptions = {
  units: Units;
};

export function ensureNotes(notes?: Array<string | undefined>): string[] {
  return (
    notes?.filter(
      (note): note is string => typeof note === 'string' && note.trim().length > 0
    ) ?? []
  );
}
