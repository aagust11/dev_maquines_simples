import { describe, expect, it } from 'vitest';
import { MACHINE_BY_KIND, MachineParameters, SimulationEnvironment } from '../domain/machines';

const env: SimulationEnvironment = { gravity: 9.81 };

describe('Lever calculations', () => {
  it('computes ideal and real mechanical advantage', () => {
    const definition = MACHINE_BY_KIND['lever'];
    const parameters: MachineParameters = {
      leverClass: 'first',
      effortArm: 1,
      loadArm: 0.5,
      loadMass: 10,
      effortForce: 60,
      loadDisplacement: 0.2
    };

    const { solution } = definition.solve(parameters, env);
    expect(solution.idealMechanicalAdvantage).toBeCloseTo(2, 3);
    const weight = parameters.loadMass * env.gravity;
    expect(solution.actualMechanicalAdvantage).toBeCloseTo(weight / parameters.effortForce, 3);
    expect(solution.workOutput).toBeCloseTo(weight * parameters.loadDisplacement, 3);
  });
});

describe('Block and tackle', () => {
  it('scales ideal mechanical advantage with number of ropes', () => {
    const definition = MACHINE_BY_KIND['block-and-tackle'];
    const parameters: MachineParameters = {
      loadMass: 20,
      supportingRopes: 4,
      effortForce: 120
    };

    const { solution } = definition.solve(parameters, env);
    expect(solution.idealMechanicalAdvantage).toBe(4);
    expect(solution.actualMechanicalAdvantage).toBeCloseTo(
      (parameters.loadMass * env.gravity) / parameters.effortForce,
      3
    );
  });
});
