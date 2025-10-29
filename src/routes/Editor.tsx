import { useCallback, useMemo, useRef, useState } from 'react';
import type {
  ChangeEvent as ReactChangeEvent,
  DragEvent as ReactDragEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { Link } from 'react-router-dom';
import type {
  RopeAnchor,
  RopePass,
  RopeScene,
  RopeTensionResult,
} from '../rope-system';
import { computeTensions } from '../rope-system';
import { solveLeverRequiredForce, solveWinch } from '../physics-core';
import ExplainPanel from '../components/ExplainPanel';
import {
  CURRENT_EDITOR_SCENE_VERSION,
  type CanvasAnchor,
  type CanvasElement,
  type EditorSceneSnapshot,
  type ElementKind,
} from './editor-types';
import { decryptMtrToScene, encryptSceneToMtr } from '../storage/mtr';
import './editor.css';

type Prefab = {
  id: string;
  label: string;
  description: string;
  create: () => CanvasElement;
};

type DragState = {
  elementId: string;
  pointerId: number;
  offset: { x: number; y: number };
};

const GRID_SIZE = 32;

function generateId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function snap(value: number) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function cloneAnchors(elementId: string, baseAnchors: CanvasAnchor[]): CanvasAnchor[] {
  return baseAnchors.map((anchor) => ({
    ...anchor,
    id: `${elementId}-${anchor.id.split(':')[1] ?? anchor.id}`,
  }));
}

function createFixedSupport(): CanvasElement {
  const id = generateId('support');
  const anchors: CanvasAnchor[] = [
    {
      id: `${id}:fixed`,
      label: 'Suport',
      type: 'fixed',
      offset: { x: 50, y: 50 },
    },
  ];
  return {
    id,
    kind: 'fixed',
    name: 'Suport fix',
    position: { x: 96, y: 96 },
    size: { width: 100, height: 100 },
    anchors,
    data: {},
  };
}

function createPulley(): CanvasElement {
  const id = generateId('pulley');
  const anchors: CanvasAnchor[] = [
    {
      id: `${id}:pulley`,
      label: 'Polea',
      type: 'pulley',
      offset: { x: 50, y: 50 },
      defaultWrapAngle: Math.PI,
    },
  ];
  return {
    id,
    kind: 'pulley',
    name: 'Polea simple',
    position: { x: 160, y: 160 },
    size: { width: 120, height: 120 },
    anchors,
    data: {
      diameter: 0.25,
      friction: 0.05,
    },
  };
}

function createLoad(): CanvasElement {
  const id = generateId('load');
  const anchors: CanvasAnchor[] = [
    {
      id: `${id}:load`,
      label: 'Càrrega',
      type: 'load',
      offset: { x: 60, y: 60 },
      attachedToLoad: true,
    },
  ];
  return {
    id,
    kind: 'load',
    name: 'Càrrega',
    position: { x: 224, y: 224 },
    size: { width: 120, height: 120 },
    anchors,
    data: {},
  };
}

function createBlockAndTackle(fixed: number, movable: number, label: string): CanvasElement {
  const id = generateId('polispast');
  const anchors: CanvasAnchor[] = [];
  const spacing = 40;

  for (let i = 0; i < fixed; i += 1) {
    anchors.push({
      id: `${id}:fixed-${i}`,
      label: `Fix ${i + 1}`,
      type: 'pulley',
      offset: { x: 40, y: 40 + i * spacing },
      defaultWrapAngle: Math.PI,
    });
  }

  for (let i = 0; i < movable; i += 1) {
    anchors.push({
      id: `${id}:mov-${i}`,
      label: `Mòbil ${i + 1}`,
      type: 'pulley',
      offset: { x: 140, y: 40 + i * spacing },
      defaultWrapAngle: Math.PI,
      attachedToLoad: true,
    });
  }

  return {
    id,
    kind: 'blockAndTackle',
    name: label,
    position: { x: 320, y: 160 },
    size: { width: 200, height: Math.max(120, (Math.max(fixed, movable) - 1) * spacing + 120) },
    anchors,
    data: {
      fixedPulleys: fixed,
      movablePulleys: movable,
      diameter: 0.18,
      separation: 0.3,
      friction: 0.08,
    },
  };
}

function createLever(kind: 'I' | 'II' | 'III'): CanvasElement {
  const id = generateId('lever');
  const anchors: CanvasAnchor[] = [
    {
      id: `${id}:fulcrum`,
      label: 'Fulcre',
      type: 'fixed',
      offset: { x: 150, y: 80 },
    },
  ];

  return {
    id,
    kind: 'lever',
    name: `Palanca classe ${kind}`,
    position: { x: 96, y: 320 },
    size: { width: 280, height: 120 },
    anchors,
    data: {
      armLeft: kind === 'I' ? 1 : kind === 'II' ? 0.75 : 1.5,
      armRight: kind === 'I' ? 1 : kind === 'II' ? 1.5 : 0.75,
      efficiency: 0.95,
    },
  };
}

function createWinch(): CanvasElement {
  const id = generateId('winch');
  const anchors: CanvasAnchor[] = [
    {
      id: `${id}:drum`,
      label: 'Torn',
      type: 'fixed',
      offset: { x: 70, y: 70 },
    },
  ];
  return {
    id,
    kind: 'winch',
    name: 'Torn simple',
    position: { x: 420, y: 320 },
    size: { width: 160, height: 160 },
    anchors,
    data: {
      drumDiameter: 0.25,
      handleDiameter: 0.4,
      gearRatio: 4,
      efficiency: 0.85,
    },
  };
}

const PREFABS: Prefab[] = [
  {
    id: 'support',
    label: 'Suport fix',
    description: 'Punt d’ancoratge per a la corda.',
    create: createFixedSupport,
  },
  {
    id: 'pulley',
    label: 'Polea simple',
    description: 'Rodet aïllat per canviar la direcció de la corda.',
    create: createPulley,
  },
  {
    id: 'load',
    label: 'Càrrega',
    description: 'Massa suspesa amb ancoratge mòbil.',
    create: createLoad,
  },
  {
    id: 'block2x2',
    label: 'Polispast 2x2',
    description: 'Dos rodets fixos i dos de mòbils.',
    create: () => createBlockAndTackle(2, 2, 'Polispast 2x2'),
  },
  {
    id: 'block3x3',
    label: 'Polispast 3x3',
    description: 'Configuració clàssica de tres politges per bloc.',
    create: () => createBlockAndTackle(3, 3, 'Polispast 3x3'),
  },
  {
    id: 'leverI',
    label: 'Palanca classe I',
    description: 'Fulcre centrat entre càrrega i esforç.',
    create: () => createLever('I'),
  },
  {
    id: 'leverII',
    label: 'Palanca classe II',
    description: 'La càrrega entre fulcre i esforç.',
    create: () => createLever('II'),
  },
  {
    id: 'leverIII',
    label: 'Palanca classe III',
    description: 'Esforç entre fulcre i càrrega.',
    create: () => createLever('III'),
  },
  {
    id: 'winch',
    label: 'Torn simple',
    description: 'Tambor amb maneta i relació de transmissió.',
    create: createWinch,
  },
];

function deriveAnchors(elements: CanvasElement[]): (CanvasAnchor & {
  elementId: string;
  position: { x: number; y: number };
  resolvedId: string;
})[] {
  return elements.flatMap((element) =>
    element.anchors.map((anchor) => {
      const resolvedId = `${element.id}-${anchor.id.split(':')[1] ?? anchor.id}`;
      const baseFriction =
        typeof element.data.friction === 'number' ? Number(element.data.friction) : undefined;
      const frictionCoefficient =
        anchor.frictionCoefficient ?? baseFriction ?? undefined;
      return {
        ...anchor,
        elementId: element.id,
        resolvedId,
        frictionCoefficient,
        position: {
          x: element.position.x + anchor.offset.x,
          y: element.position.y + anchor.offset.y,
        },
      };
    }),
  );
}

type LeverMachineConfig = {
  elementId: string;
  elementName: string;
  distanceEffort: number;
  distanceLoad: number;
  efficiency?: number;
  loadMassOverride?: number;
  loadForceOverride?: number;
};

type WinchMachineConfig = {
  elementId: string;
  elementName: string;
  drumDiameter: number;
  handleDiameter: number;
  gearRatio?: number;
  efficiency?: number;
  inputDisplacement?: number;
  loadDisplacement?: number;
  loadMassOverride?: number;
  loadForceOverride?: number;
};

export type EditorMachineScene = {
  ropeScene: RopeScene;
  baseLoadMass: number;
  levers: LeverMachineConfig[];
  winches: WinchMachineConfig[];
};

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function ensurePositive(value: number | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  return fallback;
}

export function toRopeScene(
  elements: CanvasElement[],
  ropePath: string[],
  massKg: number,
): EditorMachineScene {
  const anchorsWithPos = deriveAnchors(elements);
  const ropeAnchors: RopeAnchor[] = anchorsWithPos.map((anchor) => {
    const base = {
      id: anchor.resolvedId,
      label: anchor.label,
      type: anchor.type,
      frictionCoefficient: anchor.frictionCoefficient,
      defaultWrapAngle: anchor.defaultWrapAngle,
    } as RopeAnchor;

    if (anchor.type === 'pulley') {
      (base as RopeAnchor & { attachedToLoad?: boolean }).attachedToLoad = anchor.attachedToLoad;
    }

    if (anchor.type === 'load') {
      (base as RopeAnchor & { mass: number }).mass = massKg;
    }

    return base;
  });

  const passes: RopePass[] = ropePath.map((anchorId, index) => ({
    anchorId,
    label: `Pas ${index + 1}`,
  }));

  const loadAnchorIds = anchorsWithPos
    .filter((anchor) => anchor.type === 'load' || anchor.attachedToLoad)
    .map((anchor) => anchor.resolvedId);

  const leverConfigs: LeverMachineConfig[] = elements
    .filter((element): element is CanvasElement & { kind: 'lever' } => element.kind === 'lever')
    .map((element) => {
      const distanceEffort = ensurePositive(asNumber(element.data.armLeft), 1);
      const distanceLoad = ensurePositive(asNumber(element.data.armRight), 1);
      const efficiency = asNumber(element.data.efficiency);
      const loadMassOverride = asNumber(element.data.loadMass);
      const loadForceOverride = asNumber(element.data.loadForce);
      return {
        elementId: element.id,
        elementName: element.name,
        distanceEffort,
        distanceLoad,
        efficiency,
        loadMassOverride,
        loadForceOverride,
      } satisfies LeverMachineConfig;
    });

  const winchConfigs: WinchMachineConfig[] = elements
    .filter((element): element is CanvasElement & { kind: 'winch' } => element.kind === 'winch')
    .map((element) => {
      const drumDiameter = ensurePositive(asNumber(element.data.drumDiameter), 0.25);
      const handleDiameter = ensurePositive(asNumber(element.data.handleDiameter), 0.4);
      const gearRatio = asNumber(element.data.gearRatio);
      const efficiency = asNumber(element.data.efficiency);
      const inputDisplacement = asNumber(element.data.inputDisplacement);
      const loadDisplacement = asNumber(element.data.loadDisplacement);
      const loadMassOverride = asNumber(element.data.loadMass);
      const loadForceOverride = asNumber(element.data.loadForce);

      return {
        elementId: element.id,
        elementName: element.name,
        drumDiameter,
        handleDiameter,
        gearRatio,
        efficiency,
        inputDisplacement,
        loadDisplacement,
        loadMassOverride,
        loadForceOverride,
      } satisfies WinchMachineConfig;
    });

  const ropeScene: RopeScene = {
    id: 'editor-scene',
    label: "Escena de l'editor",
    anchors: ropeAnchors,
    path: passes,
    load: {
      mass: massKg,
      anchorIds: loadAnchorIds,
    },
  };

  return {
    ropeScene,
    baseLoadMass: massKg,
    levers: leverConfigs,
    winches: winchConfigs,
  };
}

export type LeverMachineAnalysis = LeverMachineConfig & {
  loadMass: number;
  solver: ReturnType<typeof solveLeverRequiredForce>;
};

export type WinchMachineAnalysis = WinchMachineConfig & {
  loadMass: number;
  solver: ReturnType<typeof solveWinch>;
};

export function analyzeMachines(
  scene: EditorMachineScene | null,
  gravity: number,
): { levers: LeverMachineAnalysis[]; winches: WinchMachineAnalysis[] } {
  if (!scene) {
    return { levers: [], winches: [] };
  }

  const leverAnalyses: LeverMachineAnalysis[] = [];
  for (const lever of scene.levers) {
    try {
      const loadMass =
        lever.loadMassOverride ??
        (lever.loadForceOverride !== undefined
          ? lever.loadForceOverride / gravity
          : scene.baseLoadMass);

      const solver = solveLeverRequiredForce({
        loadMass,
        distanceLoad: lever.distanceLoad,
        distanceEffort: lever.distanceEffort,
        efficiency: lever.efficiency,
        units: { g: gravity },
      });

      leverAnalyses.push({
        ...lever,
        loadMass,
        solver,
      });
    } catch (error) {
      console.warn(error);
    }
  }

  const winchAnalyses: WinchMachineAnalysis[] = [];
  for (const winch of scene.winches) {
    try {
      const loadMass =
        winch.loadMassOverride ??
        (winch.loadForceOverride !== undefined
          ? winch.loadForceOverride / gravity
          : scene.baseLoadMass);

      const solver = solveWinch({
        loadMass,
        drumDiameter: winch.drumDiameter,
        handleDiameter: winch.handleDiameter,
        gearRatio: winch.gearRatio,
        efficiency: winch.efficiency,
        inputDisplacement: winch.inputDisplacement,
        loadDisplacement: winch.loadDisplacement,
        units: { g: gravity },
      });

      winchAnalyses.push({
        ...winch,
        loadMass,
        solver,
      });
    } catch (error) {
      console.warn(error);
    }
  }

  return { levers: leverAnalyses, winches: winchAnalyses };
}

function sanitizePath(path: string[], elements: CanvasElement[]): string[] {
  const validIds = new Set(deriveAnchors(elements).map((anchor) => anchor.resolvedId));
  return path.filter((anchorId) => validIds.has(anchorId));
}

function formatNumber(value: number, options: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat('ca-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

function Editor() {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [elements, setElements] = useState<CanvasElement[]>([createFixedSupport(), createLoad()]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [ropePath, setRopePath] = useState<string[]>([]);
  const [gravity, setGravity] = useState(9.81);
  const [loadMass, setLoadMass] = useState(80);
  const [inputForceOverride, setInputForceOverride] = useState<number | undefined>();

  const anchors = useMemo(() => deriveAnchors(elements), [elements]);

  const selectedElement = useMemo(
    () => (selectedId ? elements.find((element) => element.id === selectedId) ?? null : null),
    [elements, selectedId],
  );

  const machineScene = useMemo<EditorMachineScene | null>(() => {
    try {
      return toRopeScene(elements, ropePath, loadMass);
    } catch (error) {
      console.warn(error);
      return null;
    }
  }, [elements, ropePath, loadMass]);

  const ropeScene = machineScene?.ropeScene ?? null;
  const machineAnalyses = useMemo(() => analyzeMachines(machineScene, gravity), [
    machineScene,
    gravity,
  ]);
  const leverAnalyses = machineAnalyses.levers;
  const winchAnalyses = machineAnalyses.winches;

  const handleSaveScene = useCallback(async () => {
    try {
      const snapshot: EditorSceneSnapshot = {
        editorVersion: CURRENT_EDITOR_SCENE_VERSION,
        elements,
        ropePath: sanitizePath(ropePath, elements),
        gravity,
        loadMass,
        inputForceOverride: inputForceOverride ?? null,
      };

      const blob = await encryptSceneToMtr(snapshot);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'momentor-escena.mtr';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : 'No s\'ha pogut desar l\'escena .mtr',
      );
    }
  }, [elements, ropePath, gravity, loadMass, inputForceOverride]);

  const handleOpenFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImportScene = useCallback(
    async (event: ReactChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      try {
        const buffer = await file.arrayBuffer();
        const scene = await decryptMtrToScene(buffer);
        setElements(scene.elements);
        setRopePath(sanitizePath(scene.ropePath, scene.elements));
        setGravity(scene.gravity);
        setLoadMass(scene.loadMass);
        setInputForceOverride(
          typeof scene.inputForceOverride === 'number' ? scene.inputForceOverride : undefined,
        );
        setSelectedId(null);
      } catch (error) {
        console.error(error);
        alert(
          error instanceof Error
            ? error.message
            : 'No s\'ha pogut carregar el fitxer .mtr',
        );
      } finally {
        event.target.value = '';
      }
    },
    [],
  );

  const analysis = useMemo<RopeTensionResult | null>(() => {
    if (!ropeScene || ropeScene.path.length < 2) {
      return null;
    }

    try {
      return computeTensions(ropeScene, gravity);
    } catch (error) {
      console.warn(error);
      return null;
    }
  }, [ropeScene, gravity]);

  const idealAnalysis = useMemo<RopeTensionResult | null>(() => {
    if (!ropeScene || ropeScene.path.length < 2) {
      return null;
    }

    try {
      const anchorsWithoutFriction = ropeScene.anchors.map((anchor) => ({
        ...anchor,
        frictionCoefficient: 0,
      }));
      return computeTensions(
        {
          ...ropeScene,
          anchors: anchorsWithoutFriction,
        },
        gravity,
      );
    } catch (error) {
      console.warn(error);
      return null;
    }
  }, [ropeScene, gravity]);

  const effectiveInputForce = useMemo(() => {
    if (inputForceOverride && inputForceOverride > 0) {
      return inputForceOverride;
    }
    return analysis?.inputForce;
  }, [analysis, inputForceOverride]);

  const idealMA = idealAnalysis?.mechanicalAdvantage ?? analysis?.nSupportSegments ?? 1;
  const realMA = analysis?.mechanicalAdvantage ?? 0;
  const efficiency = idealMA > 0 ? Math.min(realMA / idealMA, 1) : 0;
  const workIn = effectiveInputForce ? effectiveInputForce * 1 : 0;
  const workOut = analysis ? analysis.loadForce * (idealMA > 0 ? 1 / idealMA : 0) : 0;
  const multiplierSum =
    analysis && analysis.inputForce !== 0
      ? analysis.loadForce / analysis.inputForce
      : analysis?.mechanicalAdvantage ?? null;

  const validationMessages = useMemo(() => {
    if (!analysis) {
      return [];
    }
    const messages: string[] = [];
    messages.push(...analysis.validation.errors.map((error) => `Error: ${error}`));
    messages.push(...analysis.validation.warnings.map((warning) => `Avís: ${warning}`));
    return messages;
  }, [analysis]);

  const handleSelectElement = useCallback((elementId: string | null) => {
    setSelectedId(elementId);
  }, []);

  const handleCanvasPointerDown = useCallback(() => {
    handleSelectElement(null);
  }, [handleSelectElement]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, element: CanvasElement) => {
      event.stopPropagation();
      handleSelectElement(element.id);

      const pointerId = event.pointerId;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      const offset = {
        x: event.clientX - rect.left - element.position.x,
        y: event.clientY - rect.top - element.position.y,
      };

      (event.target as HTMLElement).setPointerCapture(pointerId);
      setDragState({ elementId: element.id, pointerId, offset });
    },
    [handleSelectElement],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      const x = snap(event.clientX - rect.left - dragState.offset.x);
      const y = snap(event.clientY - rect.top - dragState.offset.y);

      setElements((current) =>
        current.map((item) => (item.id === dragState.elementId ? { ...item, position: { x, y } } : item)),
      );
    },
    [dragState],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (dragState && dragState.pointerId === event.pointerId) {
        setDragState(null);
      }
    },
    [dragState],
  );

  const handleDrop = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const prefabId = event.dataTransfer.getData('text/x-prefab');
      const prefab = PREFABS.find((item) => item.id === prefabId);
      if (!prefab) {
        return;
      }

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const element = prefab.create();
      const x = snap(event.clientX - rect.left - element.size.width / 2);
      const y = snap(event.clientY - rect.top - element.size.height / 2);

      const nextElement = {
        ...element,
        position: { x, y },
      };

      setElements((current) => [...current, nextElement]);
    },
    [],
  );

  const handleDragOver = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const updateElement = useCallback(
    (elementId: string, updater: (element: CanvasElement) => CanvasElement) => {
      setElements((current) => {
        const next = current.map((element) => (element.id === elementId ? updater(element) : element));
        setRopePath((path) => sanitizePath(path, next));
        return next;
      });
    },
    [],
  );

  const duplicateSelected = useCallback(() => {
    if (!selectedElement) {
      return;
    }

    const duplicated: CanvasElement = {
      ...selectedElement,
      id: generateId(selectedElement.kind),
      name: `${selectedElement.name} (còpia)`,
      position: {
        x: selectedElement.position.x + GRID_SIZE,
        y: selectedElement.position.y + GRID_SIZE,
      },
      anchors: cloneAnchors(generateId('anchor'), selectedElement.anchors),
    };

    setElements((current) => [...current, duplicated]);
    setSelectedId(duplicated.id);
  }, [selectedElement]);

  const removeSelected = useCallback(() => {
    if (!selectedElement) {
      return;
    }

    setElements((current) => current.filter((element) => element.id !== selectedElement.id));
    setRopePath((path) => path.filter((anchorId) => !anchorId.startsWith(`${selectedElement.id}-`)));
    setSelectedId(null);
  }, [selectedElement]);

  const addAnchorToPath = useCallback((anchorId: string) => {
    setRopePath((current) => [...current, anchorId]);
  }, []);

  const removeAnchorFromPath = useCallback((index: number) => {
    setRopePath((current) => current.filter((_, idx) => idx !== index));
  }, []);

  const toggleAnchorLoadAttachment = useCallback(
    (elementId: string, anchorId: string) => {
      updateElement(elementId, (element) => ({
        ...element,
        anchors: element.anchors.map((anchor) =>
          anchor.id === anchorId ? { ...anchor, attachedToLoad: !anchor.attachedToLoad } : anchor,
        ),
      }));
    },
    [updateElement],
  );

  const updateAnchorFriction = useCallback(
    (elementId: string, anchorId: string, friction: number) => {
      updateElement(elementId, (element) => ({
        ...element,
        anchors: element.anchors.map((anchor) =>
          anchor.id === anchorId ? { ...anchor, frictionCoefficient: friction } : anchor,
        ),
      }));
    },
    [updateElement],
  );

  const updateAnchorWrap = useCallback(
    (elementId: string, anchorId: string, wrapAngle: number) => {
      updateElement(elementId, (element) => ({
        ...element,
        anchors: element.anchors.map((anchor) =>
          anchor.id === anchorId ? { ...anchor, defaultWrapAngle: wrapAngle } : anchor,
        ),
      }));
    },
    [updateElement],
  );

  const updateElementData = useCallback(
    (elementId: string, key: string, value: number) => {
      updateElement(elementId, (element) => ({
        ...element,
        data: {
          ...element.data,
          [key]: value,
        },
      }));
    },
    [updateElement],
  );

  const baseLoadForce = (machineScene?.baseLoadMass ?? loadMass) * gravity;
  const hasAnyReadout = Boolean(analysis) || leverAnalyses.length > 0 || winchAnalyses.length > 0;

  return (
    <section className="editor">
      <header className="editor__header">
        <div>
          <h1>Editor de simulacions</h1>
          <p>Construeix escenes combinant prefabs i traça la corda a través de politges.</p>
        </div>
        <nav className="editor__nav">
          <Link to="/" className="editor__link">
            ← Tornar a la galeria
          </Link>
          <div className="editor__nav-actions">
            <button type="button" onClick={handleOpenFilePicker} className="editor__nav-button">
              Carrega .mtr
            </button>
            <button type="button" onClick={handleSaveScene} className="editor__nav-button">
              Desa com .mtr
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mtr"
            className="editor__file-input"
            onChange={handleImportScene}
          />
        </nav>
      </header>

      <div className="editor__layout">
        <aside className="editor__sidebar">
          <section className="panel">
            <h2>Prefabs</h2>
            <ul className="prefab-list">
              {PREFABS.map((prefab) => (
                <li key={prefab.id}>
                  <article
                    className="prefab"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData('text/x-prefab', prefab.id);
                    }}
                  >
                    <header>
                      <h3>{prefab.label}</h3>
                    </header>
                    <p>{prefab.description}</p>
                    <button
                      type="button"
                      className="prefab__add"
                      onClick={() => {
                        const element = prefab.create();
                        setElements((current) => [...current, element]);
                        setSelectedId(element.id);
                      }}
                    >
                      Afegir
                    </button>
                  </article>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel">
            <h2>Inspector</h2>
            <div className="inspector">
              <fieldset>
                <legend>Unitats</legend>
                <label className="field">
                  <span>g (m/s²)</span>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    step={0.1}
                    value={gravity}
                    onChange={(event) => setGravity(Number(event.target.value))}
                  />
                  <input
                    type="number"
                    value={gravity}
                    min={1}
                    max={20}
                    step={0.1}
                    onChange={(event) => setGravity(Number(event.target.value))}
                  />
                </label>
              </fieldset>

              <fieldset>
                <legend>Càrrega</legend>
                <label className="field">
                  <span>Massa (kg)</span>
                  <input
                    type="range"
                    min={5}
                    max={500}
                    step={1}
                    value={loadMass}
                    onChange={(event) => setLoadMass(Number(event.target.value))}
                  />
                  <input
                    type="number"
                    value={loadMass}
                    min={1}
                    step={1}
                    onChange={(event) => setLoadMass(Number(event.target.value))}
                  />
                </label>
                <label className="field">
                  <span>F
                    <sub>in</sub>
                  </span>
                  <input
                    type="range"
                    min={10}
                    max={2000}
                    step={5}
                    value={inputForceOverride ?? analysis?.inputForce ?? 10}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setInputForceOverride(value);
                    }}
                  />
                  <input
                    type="number"
                    value={inputForceOverride ?? analysis?.inputForce ?? 10}
                    min={0}
                    step={1}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setInputForceOverride(Number.isNaN(value) ? undefined : value);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setInputForceOverride(undefined)}
                    className="field__action"
                  >
                    Reinicialitza
                  </button>
                </label>
              </fieldset>

              {selectedElement ? (
                <fieldset>
                  <legend>{selectedElement.name}</legend>
                  <div className="inspector__group">
                    <p className="inspector__hint">
                      Posició: ({selectedElement.position.x}, {selectedElement.position.y})
                    </p>
                    {selectedElement.kind === 'blockAndTackle' && (
                      <>
                        <label className="field">
                          <span>Politges fixes</span>
                          <input
                            type="number"
                            min={1}
                            max={5}
                            value={Number(selectedElement.data.fixedPulleys ?? 1)}
                            onChange={(event) => {
                              const fixed = Math.max(1, Number(event.target.value));
                              updateElement(selectedElement.id, (element) => {
                                const movable = Number(element.data.movablePulleys ?? 1);
                                const next = createBlockAndTackle(fixed, movable, element.name);
                                return {
                                  ...next,
                                  id: element.id,
                                  position: element.position,
                                  data: {
                                    ...next.data,
                                    friction:
                                      typeof element.data.friction === 'number'
                                        ? Number(element.data.friction)
                                        : next.data.friction,
                                  },
                                };
                              });
                            }}
                          />
                        </label>
                        <label className="field">
                          <span>Politges mòbils</span>
                          <input
                            type="number"
                            min={1}
                            max={5}
                            value={Number(selectedElement.data.movablePulleys ?? 1)}
                            onChange={(event) => {
                              const movable = Math.max(1, Number(event.target.value));
                              updateElement(selectedElement.id, (element) => {
                                const fixed = Number(element.data.fixedPulleys ?? 1);
                                const next = createBlockAndTackle(fixed, movable, element.name);
                                return {
                                  ...next,
                                  id: element.id,
                                  position: element.position,
                                  data: {
                                    ...next.data,
                                    friction:
                                      typeof element.data.friction === 'number'
                                        ? Number(element.data.friction)
                                        : next.data.friction,
                                  },
                                };
                              });
                            }}
                          />
                        </label>
                        <label className="field">
                          <span>Fricció μ</span>
                          <input
                            type="range"
                            min={0}
                            max={0.4}
                            step={0.01}
                            value={Number(selectedElement.data.friction ?? 0)}
                            onChange={(event) =>
                              updateElementData(selectedElement.id, 'friction', Number(event.target.value))
                            }
                          />
                          <input
                            type="number"
                            min={0}
                            max={1}
                            step={0.01}
                            value={Number(selectedElement.data.friction ?? 0)}
                            onChange={(event) =>
                              updateElementData(selectedElement.id, 'friction', Number(event.target.value))
                            }
                          />
                        </label>
                      </>
                    )}
                    {selectedElement.kind === 'pulley' && (
                      <label className="field">
                        <span>Fricció μ</span>
                        <input
                          type="range"
                          min={0}
                          max={0.4}
                          step={0.01}
                          value={Number(selectedElement.data.friction ?? 0)}
                          onChange={(event) =>
                            updateElementData(selectedElement.id, 'friction', Number(event.target.value))
                          }
                        />
                        <input
                          type="number"
                          min={0}
                          max={1}
                          step={0.01}
                          value={Number(selectedElement.data.friction ?? 0)}
                          onChange={(event) =>
                            updateElementData(selectedElement.id, 'friction', Number(event.target.value))
                          }
                        />
                      </label>
                    )}
                    {selectedElement.kind === 'lever' && (
                      <>
                        <label className="field">
                          <span>d esforç (m)</span>
                          <input
                            type="number"
                            min={0.05}
                            max={5}
                            step={0.01}
                            value={Number(selectedElement.data.armLeft ?? 1)}
                            onChange={(event) => {
                              const value = Number(event.target.value);
                              if (Number.isFinite(value)) {
                                updateElementData(selectedElement.id, 'armLeft', value);
                              }
                            }}
                          />
                        </label>
                        <label className="field">
                          <span>d càrrega (m)</span>
                          <input
                            type="number"
                            min={0.05}
                            max={5}
                            step={0.01}
                            value={Number(selectedElement.data.armRight ?? 1)}
                            onChange={(event) => {
                              const value = Number(event.target.value);
                              if (Number.isFinite(value)) {
                                updateElementData(selectedElement.id, 'armRight', value);
                              }
                            }}
                          />
                        </label>
                        <label className="field">
                          <span>η palanca</span>
                          <input
                            type="number"
                            min={0}
                            max={1}
                            step={0.01}
                            value={Number(selectedElement.data.efficiency ?? 1)}
                            onChange={(event) => {
                              const value = Number(event.target.value);
                              if (Number.isFinite(value)) {
                                updateElementData(selectedElement.id, 'efficiency', value);
                              }
                            }}
                          />
                        </label>
                        <label className="field">
                          <span>F
                            <sub>G</sub>
                            {' '}(N)
                          </span>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={Number(selectedElement.data.loadForce ?? baseLoadForce)}
                            onChange={(event) => {
                              const value = Number(event.target.value);
                              if (Number.isFinite(value)) {
                                updateElementData(selectedElement.id, 'loadForce', value);
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="field__action"
                            onClick={() => updateElementData(selectedElement.id, 'loadForce', baseLoadForce)}
                          >
                            Reinicialitza
                          </button>
                        </label>
                      </>
                    )}
                    {selectedElement.kind === 'winch' && (
                      <>
                        <label className="field">
                          <span>Ø tambor (m)</span>
                          <input
                            type="number"
                            min={0.05}
                            max={1}
                            step={0.01}
                            value={Number(selectedElement.data.drumDiameter ?? 0.2)}
                            onChange={(event) =>
                              updateElementData(selectedElement.id, 'drumDiameter', Number(event.target.value))
                            }
                          />
                        </label>
                        <label className="field">
                          <span>Ø maneta (m)</span>
                          <input
                            type="number"
                            min={0.1}
                            max={1}
                            step={0.01}
                            value={Number(selectedElement.data.handleDiameter ?? 0.4)}
                            onChange={(event) =>
                              updateElementData(selectedElement.id, 'handleDiameter', Number(event.target.value))
                            }
                          />
                        </label>
                        <label className="field">
                          <span>Relació (gear)</span>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            step={0.5}
                            value={Number(selectedElement.data.gearRatio ?? 4)}
                            onChange={(event) =>
                              updateElementData(selectedElement.id, 'gearRatio', Number(event.target.value))
                            }
                          />
                        </label>
                        <label className="field">
                          <span>η torn</span>
                          <input
                            type="number"
                            min={0}
                            max={1}
                            step={0.01}
                            value={Number(selectedElement.data.efficiency ?? 0.85)}
                            onChange={(event) => {
                              const value = Number(event.target.value);
                              if (Number.isFinite(value)) {
                                updateElementData(selectedElement.id, 'efficiency', value);
                              }
                            }}
                          />
                        </label>
                      </>
                    )}
                    {selectedElement.anchors.length > 0 && (
                      <div className="inspector__anchors">
                        <h4>Anchors</h4>
                        <ul>
                          {selectedElement.anchors.map((anchor) => {
                            const resolvedId = `${selectedElement.id}-${anchor.id.split(':')[1] ?? anchor.id}`;
                            return (
                              <li key={anchor.id}>
                                <span>{anchor.label}</span>
                                <button type="button" onClick={() => addAnchorToPath(resolvedId)}>
                                  Afegir al traçat
                                </button>
                                <label className="field field--inline">
                                  <span>μ</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={anchor.frictionCoefficient ?? ''}
                                    onChange={(event) =>
                                      updateAnchorFriction(
                                        selectedElement.id,
                                        anchor.id,
                                        Number(event.target.value),
                                      )
                                    }
                                  />
                                </label>
                                <label className="field field--inline">
                                  <span>Δθ</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={6.283}
                                    step={0.1}
                                    value={anchor.defaultWrapAngle ?? ''}
                                    onChange={(event) =>
                                      updateAnchorWrap(
                                        selectedElement.id,
                                        anchor.id,
                                        Number(event.target.value),
                                      )
                                    }
                                  />
                                </label>
                                <label className="field field--inline">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(anchor.attachedToLoad)}
                                    onChange={() =>
                                      toggleAnchorLoadAttachment(selectedElement.id, anchor.id)
                                    }
                                  />
                                  <span>Solidari</span>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    <div className="inspector__actions">
                      <button type="button" onClick={duplicateSelected}>
                        Duplica
                      </button>
                      <button type="button" onClick={removeSelected}>
                        Elimina
                      </button>
                    </div>
                  </div>
                </fieldset>
              ) : (
                <p className="inspector__empty">Selecciona un element per editar-lo.</p>
              )}
            </div>
          </section>
        </aside>

        <div className="editor__workspace">
          <div
            className="canvas"
            ref={canvasRef}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <div className="canvas__grid" aria-hidden="true" />
            <svg className="canvas__rope" viewBox="0 0 1600 900">
              {ropePath.length >= 2 &&
                ropePath.slice(0, -1).map((anchorId, index) => {
                  const from = anchors.find((anchor) => anchor.resolvedId === anchorId);
                  const to = anchors.find((anchor) => anchor.resolvedId === ropePath[index + 1]);
                  if (!from || !to) {
                    return null;
                  }
                  return (
                    <line
                      key={`${anchorId}-${ropePath[index + 1]}`}
                      x1={from.position.x}
                      y1={from.position.y}
                      x2={to.position.x}
                      y2={to.position.y}
                    />
                  );
                })}
            </svg>
            {elements.map((element) => {
              const isSelected = element.id === selectedId;
              return (
                <div
                  key={element.id}
                  className={`canvas__element canvas__element--${element.kind} ${
                    isSelected ? 'is-selected' : ''
                  }`}
                  style={{
                    width: element.size.width,
                    height: element.size.height,
                    transform: `translate(${element.position.x}px, ${element.position.y}px)`,
                  }}
                  onPointerDown={(event) => handlePointerDown(event, element)}
                >
                  <span className="canvas__label">{element.name}</span>
                  {element.anchors.map((anchor) => {
                    const resolvedId = `${element.id}-${anchor.id.split(':')[1] ?? anchor.id}`;
                    const inPathIndex = ropePath.findIndex((id) => id === resolvedId);
                    return (
                      <button
                        type="button"
                        key={anchor.id}
                        className={`canvas__anchor ${inPathIndex >= 0 ? 'is-active' : ''}`}
                        style={{ left: anchor.offset.x - 6, top: anchor.offset.y - 6 }}
                        onClick={(event) => {
                          event.stopPropagation();
                          addAnchorToPath(resolvedId);
                        }}
                        title={`Anchor ${anchor.label}`}
                      >
                        {inPathIndex >= 0 ? inPathIndex + 1 : ''}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <section className="panel readouts">
            <h2>Readouts en viu</h2>
            {hasAnyReadout ? (
              <>
                {analysis && (
                  <div className="readouts__section">
                    <h3>Corda i politges</h3>
                    <dl className="readouts__grid">
                      <div>
                        <dt>F
                          <sub>in</sub>
                        </dt>
                        <dd>{effectiveInputForce ? `${formatNumber(effectiveInputForce)} N` : '—'}</dd>
                      </div>
                      <div>
                        <dt>F
                          <sub>G</sub>
                        </dt>
                        <dd>{formatNumber(analysis.loadForce)} N</dd>
                      </div>
                      <div>
                        <dt>AM ideal</dt>
                        <dd>{idealMA ? formatNumber(idealMA) : '—'}</dd>
                      </div>
                      <div>
                        <dt>AM real</dt>
                        <dd>{realMA ? formatNumber(realMA) : '—'}</dd>
                      </div>
                      <div>
                        <dt>Treball in</dt>
                        <dd>{workIn ? `${formatNumber(workIn)} J` : '—'}</dd>
                      </div>
                      <div>
                        <dt>Treball out</dt>
                        <dd>{workOut ? `${formatNumber(workOut)} J` : '—'}</dd>
                      </div>
                      <div>
                        <dt>Eficiència</dt>
                        <dd>
                          {efficiency
                            ? `${formatNumber(efficiency * 100, { maximumFractionDigits: 1 })}%`
                            : '—'}
                        </dd>
                      </div>
                    </dl>

                    {analysis.segments.length > 0 && (
                      <div className="readouts__segments">
                        <h4>Trams</h4>
                        <ul>
                          {analysis.segments.map((segment) => (
                            <li key={segment.index}>
                              Tram {segment.index + 1}: {formatNumber(segment.tension)} N · μ ={' '}
                              {formatNumber(segment.frictionFactor)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <ExplainPanel
                      title="Derivació de F_{in}"
                      formulaLatex="F_{in} = \\frac{F_G}{\\sum_i m_i}"
                      substitutions={{
                        F_G: analysis.loadForce,
                        '\\sum_i m_i': multiplierSum ?? '—',
                      }}
                      result={{
                        label: 'F_{in}',
                        value: analysis.inputForce,
                        unit: 'N',
                      }}
                      formatNumber={formatNumber}
                    />

                    {ropePath.length > 0 && (
                      <div className="readouts__path">
                        <h4>Seqüència de corda</h4>
                        <ol>
                          {ropePath.map((anchorId, index) => {
                            const anchor = anchors.find((item) => item.resolvedId === anchorId);
                            return (
                              <li key={`${anchorId}-${index}`}>
                                {anchor ? anchor.label : anchorId}
                                <button type="button" onClick={() => removeAnchorFromPath(index)}>
                                  ✕
                                </button>
                              </li>
                            );
                          })}
                        </ol>
                      </div>
                    )}

                    {validationMessages.length > 0 && (
                      <div className="readouts__validation">
                        <h4>Validació</h4>
                        <ul>
                          {validationMessages.map((message, index) => (
                            <li key={index}>{message}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {leverAnalyses.length > 0 && (
                  <div className="readouts__section">
                    <h3>Palanques</h3>
                    {leverAnalyses.map((lever) => {
                      const leverResult = lever.solver.result;
                      const mechanicalAdvantage =
                        leverResult.inputForce !== 0
                          ? leverResult.loadForce / leverResult.inputForce
                          : null;

                      return (
                        <article key={lever.elementId} className="readouts__machine">
                          <header>
                            <h4>{lever.elementName}</h4>
                          </header>
                          <dl className="readouts__grid">
                            <div>
                              <dt>F
                                <sub>in</sub>
                              </dt>
                              <dd>{formatNumber(leverResult.inputForce)} N</dd>
                            </div>
                            <div>
                              <dt>F
                                <sub>G</sub>
                              </dt>
                              <dd>{formatNumber(leverResult.loadForce)} N</dd>
                            </div>
                            <div>
                              <dt>AM</dt>
                              <dd>{mechanicalAdvantage ? formatNumber(mechanicalAdvantage) : '—'}</dd>
                            </div>
                            <div>
                              <dt>d càrrega</dt>
                              <dd>
                                {formatNumber(lever.distanceLoad, {
                                  maximumFractionDigits: 2,
                                })}{' '}
                                m
                              </dd>
                            </div>
                            <div>
                              <dt>d esforç</dt>
                              <dd>
                                {formatNumber(lever.distanceEffort, {
                                  maximumFractionDigits: 2,
                                })}{' '}
                                m
                              </dd>
                            </div>
                            <div>
                              <dt>η palanca</dt>
                              <dd>
                                {leverResult.efficiency
                                  ? `${formatNumber(leverResult.efficiency * 100, {
                                      maximumFractionDigits: 1,
                                    })}%`
                                  : '—'}
                              </dd>
                            </div>
                          </dl>
                          <ExplainPanel
                            title={`Càlcul de ${lever.elementName}`}
                            formulaLatex={lever.solver.formulaLatex}
                            substitutions={lever.solver.substitutions}
                            result={{
                              label: 'F_{in}',
                              value: leverResult.inputForce,
                              unit: 'N',
                            }}
                            formatNumber={formatNumber}
                          />
                        </article>
                      );
                    })}
                  </div>
                )}

                {winchAnalyses.length > 0 && (
                  <div className="readouts__section">
                    <h3>Torns</h3>
                    {winchAnalyses.map((winch) => {
                      const winchResult = winch.solver.result;
                      const mechanicalEfficiency =
                        winchResult.mechanicalAdvantageIdeal !== 0
                          ? winchResult.mechanicalAdvantageReal /
                            winchResult.mechanicalAdvantageIdeal
                          : undefined;
                      const workEfficiency =
                        winchResult.workEfficiency ?? mechanicalEfficiency;

                      return (
                        <article key={winch.elementId} className="readouts__machine">
                          <header>
                            <h4>{winch.elementName}</h4>
                          </header>
                          <dl className="readouts__grid">
                            <div>
                              <dt>F
                                <sub>in</sub>
                              </dt>
                              <dd>{formatNumber(winchResult.inputForce)} N</dd>
                            </div>
                            <div>
                              <dt>τ
                                <sub>in</sub>
                              </dt>
                              <dd>{formatNumber(winchResult.inputTorque)} N·m</dd>
                            </div>
                            <div>
                              <dt>F
                                <sub>G</sub>
                              </dt>
                              <dd>{formatNumber(winchResult.loadForce)} N</dd>
                            </div>
                            <div>
                              <dt>AM ideal</dt>
                              <dd>{formatNumber(winchResult.mechanicalAdvantageIdeal)}</dd>
                            </div>
                            <div>
                              <dt>AM real</dt>
                              <dd>{formatNumber(winchResult.mechanicalAdvantageReal)}</dd>
                            </div>
                            <div>
                              <dt>Eficiència</dt>
                              <dd>
                                {workEfficiency
                                  ? `${formatNumber(workEfficiency * 100, {
                                      maximumFractionDigits: 1,
                                    })}%`
                                  : '—'}
                              </dd>
                            </div>
                            <div>
                              <dt>Treball in</dt>
                              <dd>
                                {winchResult.workInput
                                  ? `${formatNumber(winchResult.workInput)} J`
                                  : '—'}
                              </dd>
                            </div>
                            <div>
                              <dt>Treball out</dt>
                              <dd>
                                {winchResult.workOutput
                                  ? `${formatNumber(winchResult.workOutput)} J`
                                  : '—'}
                              </dd>
                            </div>
                          </dl>
                          <ExplainPanel
                            title={`Càlcul de ${winch.elementName}`}
                            formulaLatex={winch.solver.formulaLatex}
                            substitutions={winch.solver.substitutions}
                            result={{
                              label: 'F_{in}',
                              value: winchResult.inputForce,
                              unit: 'N',
                            }}
                            formatNumber={formatNumber}
                          />
                        </article>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <p>Traça una corda vàlida o configura palanques/torns per obtenir mesures.</p>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}

export default Editor;
