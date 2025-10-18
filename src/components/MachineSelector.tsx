import { MACHINE_DEFINITIONS, MachineKind } from '../domain/machines';

interface MachineSelectorProps {
  value: MachineKind;
  onChange: (kind: MachineKind) => void;
}

const MachineSelector = ({ value, onChange }: MachineSelectorProps) => {
  return (
    <div className="card">
      <h2>Model</h2>
      <label>
        <span>Element de l&apos;escena</span>
        <select value={value} onChange={(event) => onChange(event.target.value as MachineKind)}>
          {MACHINE_DEFINITIONS.map((definition) => (
            <option key={definition.kind} value={definition.kind}>
              {definition.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};

export default MachineSelector;
