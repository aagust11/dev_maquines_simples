import { describe, expect, it } from 'vitest';

import { analyzeMachines, toRopeScene } from '../Editor';
import type { CanvasElement } from '../editor-types';

describe('Editor machine analysis', () => {
  it('extracts lever and winch data from a mixed scene', () => {
    const leverArmEffort = 0.5;
    const leverArmLoad = 1.2;
    const leverEfficiency = 0.9;
    const leverLoadForce = 200;

    const leverElement: CanvasElement = {
      id: 'lever-test',
      kind: 'lever',
      name: 'Lever prova',
      position: { x: 0, y: 0 },
      size: { width: 200, height: 100 },
      anchors: [],
      data: {
        armLeft: leverArmEffort,
        armRight: leverArmLoad,
        efficiency: leverEfficiency,
        loadForce: leverLoadForce,
      },
    };

    const winchDrumDiameter = 0.3;
    const winchHandleDiameter = 0.4;
    const winchGearRatio = 3;
    const winchEfficiency = 0.8;
    const winchLoadMass = 60;

    const winchElement: CanvasElement = {
      id: 'winch-test',
      kind: 'winch',
      name: 'Torn prova',
      position: { x: 0, y: 0 },
      size: { width: 160, height: 160 },
      anchors: [],
      data: {
        drumDiameter: winchDrumDiameter,
        handleDiameter: winchHandleDiameter,
        gearRatio: winchGearRatio,
        efficiency: winchEfficiency,
        loadMass: winchLoadMass,
      },
    };

    const scene = toRopeScene([leverElement, winchElement], [], 80);
    const { levers, winches } = analyzeMachines(scene, 9.81);

    expect(levers).toHaveLength(1);
    expect(winches).toHaveLength(1);

    const leverAnalysis = levers[0];
    const expectedLeverInput =
      (leverLoadForce * leverArmLoad) / (leverArmEffort * leverEfficiency);
    expect(leverAnalysis.loadMass).toBeCloseTo(leverLoadForce / 9.81, 5);
    expect(leverAnalysis.solver.result.loadForce).toBeCloseTo(leverLoadForce, 5);
    expect(leverAnalysis.solver.result.inputForce).toBeCloseTo(expectedLeverInput, 5);

    const winchAnalysis = winches[0];
    const expectedWinchMAIdeal = (winchHandleDiameter / winchDrumDiameter) * winchGearRatio;
    const expectedWinchMAReal = expectedWinchMAIdeal * winchEfficiency;
    const expectedWinchInputForce = (winchLoadMass * 9.81) / expectedWinchMAReal;

    expect(winchAnalysis.loadMass).toBeCloseTo(winchLoadMass, 5);
    expect(winchAnalysis.solver.result.mechanicalAdvantageIdeal).toBeCloseTo(
      expectedWinchMAIdeal,
      5,
    );
    expect(winchAnalysis.solver.result.mechanicalAdvantageReal).toBeCloseTo(
      expectedWinchMAReal,
      5,
    );
    expect(winchAnalysis.solver.result.inputForce).toBeCloseTo(expectedWinchInputForce, 5);
  });
});
