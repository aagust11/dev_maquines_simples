import {
  MachineDefinition,
  MachineParameters,
  NumericParameterDefinition,
  ParameterDefinition,
  SelectParameterDefinition
} from '../domain/machines';

interface MachineParametersFormProps {
  definition: MachineDefinition;
  values: MachineParameters;
  onChange: (values: MachineParameters) => void;
}

const renderNumberField = (
  definition: NumericParameterDefinition,
  value: number,
  onValueChange: (next: number) => void
) => {
  return (
    <label key={definition.key}>
      <span>
        {definition.label} ({definition.unit})
        {definition.helper ? <small style={{ color: '#607597' }}>{definition.helper}</small> : null}
      </span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ''}
        min={definition.min}
        max={definition.max}
        step={definition.step ?? 'any'}
        onChange={(event) => onValueChange(Number(event.target.value))}
      />
    </label>
  );
};

const renderSelectField = (
  definition: SelectParameterDefinition,
  value: string,
  onValueChange: (next: string) => void
) => (
  <label key={definition.key}>
    <span>{definition.label}</span>
    <select value={value} onChange={(event) => onValueChange(event.target.value)}>
      {definition.options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

const MachineParametersForm = ({ definition, values, onChange }: MachineParametersFormProps) => {
  const updateParameter = (key: string, value: number | string) => {
    onChange({
      ...values,
      [key]: value
    });
  };

  return (
    <div className="card">
      <h2>Paràmetres</h2>
      <div className="form-grid">
        {definition.parameters.map((parameter: ParameterDefinition) => {
          if (parameter.type === 'number') {
            return renderNumberField(
              parameter,
              Number(values[parameter.key] ?? parameter.defaultValue),
              (next) => updateParameter(parameter.key, next)
            );
          }
          return renderSelectField(
            parameter,
            String(values[parameter.key] ?? parameter.defaultValue),
            (next) => updateParameter(parameter.key, next)
          );
        })}
      </div>
    </div>
  );
};

export default MachineParametersForm;
