import { MachineSolution } from '../domain/machines';
import { formatNumber } from '../utils/format';

interface ReadoutsProps {
  solution: MachineSolution;
}

const Readouts = ({ solution }: ReadoutsProps) => {
  return (
    <div className="card">
      <h2>Resultats</h2>
      <div className="readouts-grid">
        <div className="readout">
          <h4>Avantatge mecànic ideal</h4>
          <strong>{formatNumber(solution.idealMechanicalAdvantage, 3)}</strong>
        </div>
        <div className="readout">
          <h4>Avantatge mecànic real</h4>
          <strong>{formatNumber(solution.actualMechanicalAdvantage, 3)}</strong>
        </div>
        <div className="readout">
          <h4>Eficiència</h4>
          <strong>{formatNumber(solution.efficiency, 2)} %</strong>
        </div>
        <div className="readout">
          <h4>Força aplicada</h4>
          <strong>{formatNumber(solution.inputForce, 2)} N</strong>
        </div>
        <div className="readout">
          <h4>Força útil</h4>
          <strong>{formatNumber(solution.outputForce, 2)} N</strong>
        </div>
        {typeof solution.workInput === 'number' ? (
          <div className="readout">
            <h4>Treball d&apos;entrada</h4>
            <strong>{formatNumber(solution.workInput, 2)} J</strong>
          </div>
        ) : null}
        {typeof solution.workOutput === 'number' ? (
          <div className="readout">
            <h4>Treball útil</h4>
            <strong>{formatNumber(solution.workOutput, 2)} J</strong>
          </div>
        ) : null}
        {typeof solution.loadDisplacement === 'number' ? (
          <div className="readout">
            <h4>Desplaçament càrrega</h4>
            <strong>{formatNumber(solution.loadDisplacement, 3)} m</strong>
          </div>
        ) : null}
        {typeof solution.effortDisplacement === 'number' ? (
          <div className="readout">
            <h4>Desplaçament esforç</h4>
            <strong>{formatNumber(solution.effortDisplacement, 3)} m</strong>
          </div>
        ) : null}
      </div>
      {solution.notes.length > 0 ? (
        <div className="warning" role="status">
          <ul>
            {solution.notes.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

export default Readouts;
