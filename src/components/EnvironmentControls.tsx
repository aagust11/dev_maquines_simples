import { SimulationEnvironment } from '../domain/machines';

interface EnvironmentControlsProps {
  environment: SimulationEnvironment;
  onChange: (environment: SimulationEnvironment) => void;
}

const EnvironmentControls = ({ environment, onChange }: EnvironmentControlsProps) => {
  return (
    <div className="card">
      <h2>Entorn</h2>
      <div className="form-grid">
        <label>
          <span>Gravetat (g)</span>
          <input
            type="number"
            value={environment.gravity}
            min={0}
            step={0.01}
            onChange={(event) =>
              onChange({
                gravity: Number(event.target.value)
              })
            }
          />
        </label>
      </div>
    </div>
  );
};

export default EnvironmentControls;
