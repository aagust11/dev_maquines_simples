import { type ChangeEventHandler, useMemo, useRef, useState } from 'react';
import MachineSelector from '../components/MachineSelector';
import MachineParametersForm from '../components/MachineParametersForm';
import EnvironmentControls from '../components/EnvironmentControls';
import Readouts from '../components/Readouts';
import DerivationPanel from '../components/DerivationPanel';
import {
  MACHINE_BY_KIND,
  MachineDefinition,
  MachineKind,
  MachineParameters,
  SimulationEnvironment,
  machineParameterDefaults
} from '../domain/machines';
import { normalizeScene, Scene } from '../domain/scene';
import { decodeScene, encodeScene } from '../utils/crypto';

const fallbackComputation = (definition: MachineDefinition, env: SimulationEnvironment) =>
  definition.solve(machineParameterDefaults(definition), env);

const ScenePage = () => {
  const [machineKind, setMachineKind] = useState<MachineKind>('lever');
  const definition = MACHINE_BY_KIND[machineKind];
  const [parameters, setParameters] = useState<MachineParameters>(machineParameterDefaults(definition));
  const [environment, setEnvironment] = useState<SimulationEnvironment>({ gravity: 9.81 });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const computation = useMemo(() => {
    try {
      return definition.solve(parameters, environment);
    } catch (error) {
      console.warn('Error en el càlcul', error);
      return fallbackComputation(definition, environment);
    }
  }, [definition, parameters, environment]);

  const handleMachineChange = (kind: MachineKind) => {
    const nextDefinition = MACHINE_BY_KIND[kind];
    setMachineKind(kind);
    setParameters(machineParameterDefaults(nextDefinition));
  };

  const handleExport = async () => {
    const scene: Scene = {
      environment,
      machine: {
        kind: machineKind,
        parameters
      }
    };
    const encoded = await encodeScene(scene);
    const blob = new Blob([encoded], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'momentor-escena.mtr';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport: ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const content = await file.text();
    try {
      const scene = normalizeScene(await decodeScene(content));
      setEnvironment(scene.environment);
      setMachineKind(scene.machine.kind);
      setParameters(scene.machine.parameters);
    } catch (error) {
      console.error('No s’ha pogut carregar l’escena', error);
      alert('No s’ha pogut carregar l’escena .mtr (format invàlid o clau incorrecta).');
    }
  };

  return (
    <>
      <section className="sidebar">
        <MachineSelector value={machineKind} onChange={handleMachineChange} />
        <MachineParametersForm definition={definition} values={parameters} onChange={setParameters} />
        <EnvironmentControls environment={environment} onChange={setEnvironment} />
        <div className="card">
          <h2>Fitxers .mtr</h2>
          <p>Exporta o importa escenes completament deterministes (AES-GCM).</p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" onClick={handleExport}>
              Exporta escena
            </button>
            <button type="button" onClick={handleImportClick}>
              Importa escena
            </button>
          </div>
          <input
            type="file"
            accept=".mtr"
            ref={fileInputRef}
            onChange={handleImport}
            style={{ display: 'none' }}
          />
        </div>
      </section>
      <section className="content">
        <Readouts solution={computation.solution} />
        <DerivationPanel steps={computation.derivation} />
      </section>
    </>
  );
};

export default ScenePage;
