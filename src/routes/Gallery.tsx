import { useState } from 'react';
import { Link } from 'react-router-dom';
import ExplainPanel from '../components/ExplainPanel';
import { solveLeverRequiredForce, solveWinch } from '../physics-core';
import './gallery.css';

const NUMBER_FORMAT = new Intl.NumberFormat('ca-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatNumber(value: number, options: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat('ca-ES', {
    ...options,
    minimumFractionDigits: options.minimumFractionDigits ?? 2,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  }).format(value);
}

const g = 9.81;

const PolispastBasicExample = () => {
  const fixedPulleys = 1;
  const movablePulleys = 1;
  const muPerSheave = 0.05;
  const nTrams = movablePulleys * 2;
  const nSheaves = fixedPulleys + movablePulleys;

  const computeRealForce = (mass: number) => {
    const fg = mass * g;
    const ideal = fg / nTrams;
    const eta = Math.pow(1 - muPerSheave, nSheaves);
    return ideal / eta;
  };

  const [mass, setMass] = useState(10);
  const [inputForce, setInputForce] = useState(() => computeRealForce(10));

  const loadForce = mass * g;
  const eta = Math.pow(1 - muPerSheave, nSheaves);
  const idealMechanicalAdvantage = nTrams;
  const idealForce = loadForce / idealMechanicalAdvantage;
  const realForce = idealForce / eta;
  const status = inputForce >= realForce ? 'suficient' : 'insuficient';

  return (
    <article className="example-card">
      <header>
        <h3>Polispast bàsic</h3>
        <p>Configuració 1×1 amb fricció per rodet μ = 0.05 i massa de 10 kg.</p>
      </header>
      <div className="example-card__layout">
        <section className="example-card__controls">
          <label className="example-field">
            <span>Massa de la càrrega (kg)</span>
            <input
              type="range"
              min={5}
              max={40}
              step={1}
              value={mass}
              onChange={(event) => {
                const value = Number(event.target.value);
                setMass(value);
                setInputForce(computeRealForce(value));
              }}
            />
            <input
              type="number"
              min={1}
              max={100}
              value={mass}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (Number.isFinite(value)) {
                  setMass(value);
                  setInputForce(computeRealForce(value));
                }
              }}
            />
          </label>
          <label className="example-field">
            <span>F<sub>in</sub> aplicat (N)</span>
            <input
              type="range"
              min={10}
              max={400}
              step={1}
              value={inputForce}
              onChange={(event) => setInputForce(Number(event.target.value))}
            />
            <input
              type="number"
              min={0}
              value={inputForce}
              onChange={(event) => {
                const value = Number(event.target.value);
                setInputForce(Number.isFinite(value) ? value : inputForce);
              }}
            />
            <button
              type="button"
              className="example-field__action"
              onClick={() => setInputForce(realForce)}
            >
              Ajusta a F<sub>real</sub>
            </button>
          </label>
          <p className={`example-status ${status === 'suficient' ? 'is-ok' : 'is-ko'}`}>
            F<sub>in</sub> {status}
          </p>
        </section>
        <section className="example-card__data">
          <dl className="example-grid">
            <div>
              <dt>F<sub>G</sub></dt>
              <dd>{NUMBER_FORMAT.format(loadForce)} N</dd>
            </div>
            <div>
              <dt>n<sub>trams</sub></dt>
              <dd>{nTrams}</dd>
            </div>
            <div>
              <dt>AM<sub>ideal</sub></dt>
              <dd>{idealMechanicalAdvantage}</dd>
            </div>
            <div>
              <dt>F<sub>ideal</sub></dt>
              <dd>{NUMBER_FORMAT.format(idealForce)} N</dd>
            </div>
            <div>
              <dt>η ≈ (1 - μ)<sup>n<sub>s</sub></sup></dt>
              <dd>{formatNumber(eta, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}</dd>
            </div>
            <div>
              <dt>F<sub>real</sub></dt>
              <dd>{NUMBER_FORMAT.format(realForce)} N</dd>
            </div>
          </dl>
          <ExplainPanel
            title="Derivació de F_{real}"
            formulaLatex="F_{real} = \\frac{F_G}{n_{trams} \\cdot (1 - \\mu)^{n_s}}"
            substitutions={{
              F_G: loadForce,
              'n_{trams}': idealMechanicalAdvantage,
              '\\mu': muPerSheave,
              'n_s': nSheaves,
            }}
            result={{
              label: 'F_{real}',
              value: realForce,
              unit: 'N',
            }}
            formatNumber={(value) => formatNumber(value)}
          />
        </section>
      </div>
    </article>
  );
};

const WinchExample = () => {
  const drumDiameter = 0.04;
  const handleDiameter = 0.2;
  const efficiency = 0.9;
  const loadForce = 50;
  const loadMass = loadForce / g;

  const { result } = solveWinch({
    loadMass,
    drumDiameter,
    handleDiameter,
    efficiency,
    gearRatio: 1,
    units: { g },
    inputDisplacement: Math.PI * handleDiameter,
    loadDisplacement: Math.PI * drumDiameter,
  });

  const workEfficiency = result.workEfficiency ?? result.mechanicalAdvantageReal / result.mechanicalAdvantageIdeal;

  return (
    <article className="example-card">
      <header>
        <h3>Torn simple</h3>
        <p>Tambor de 0,04 m, manovella de 0,20 m, η = 0,9 i càrrega de 50 N.</p>
      </header>
      <div className="example-card__layout">
        <section className="example-card__data">
          <dl className="example-grid">
            <div>
              <dt>AM<sub>ideal</sub></dt>
              <dd>{NUMBER_FORMAT.format(result.mechanicalAdvantageIdeal)}</dd>
            </div>
            <div>
              <dt>AM<sub>real</sub></dt>
              <dd>{NUMBER_FORMAT.format(result.mechanicalAdvantageReal)}</dd>
            </div>
            <div>
              <dt>F<sub>in</sub></dt>
              <dd>{NUMBER_FORMAT.format(result.inputForce)} N</dd>
            </div>
            <div>
              <dt>τ<sub>in</sub></dt>
              <dd>{NUMBER_FORMAT.format(result.inputTorque)} N·m</dd>
            </div>
            <div>
              <dt>Treball in</dt>
              <dd>{result.workInput ? `${NUMBER_FORMAT.format(result.workInput)} J` : '—'}</dd>
            </div>
            <div>
              <dt>Treball out</dt>
              <dd>{result.workOutput ? `${NUMBER_FORMAT.format(result.workOutput)} J` : '—'}</dd>
            </div>
            <div>
              <dt>Eficiència</dt>
              <dd>{formatNumber(workEfficiency * 100, { maximumFractionDigits: 1 })}%</dd>
            </div>
          </dl>
          <ExplainPanel
            title="Càlcul del parell d'entrada"
            formulaLatex="\\tau_{in} = \\frac{F_G}{AM_{ideal} \\cdot \\eta} \\cdot r_h"
            substitutions={{
              F_G: result.loadForce,
              'AM_{ideal}': result.mechanicalAdvantageIdeal,
              '\\eta': efficiency,
              r_h: handleDiameter / 2,
            }}
            result={{
              label: '\\tau_{in}',
              value: result.inputTorque,
              unit: 'N\\cdot m',
            }}
            formatNumber={(value) => formatNumber(value)}
          />
        </section>
      </div>
    </article>
  );
};

const LeverFirstClassExample = () => {
  const loadForce = 80;
  const loadMass = loadForce / g;
  const distanceEffort = 0.3;
  const distanceLoad = 0.6;
  const [efficiency, setEfficiency] = useState(1);

  const { result, formulaLatex, substitutions } = solveLeverRequiredForce({
    loadMass,
    distanceLoad,
    distanceEffort,
    efficiency,
    units: { g },
  });

  const momentLoad = loadForce * distanceLoad;
  const momentEffort = result.inputForce * distanceEffort;

  const scale = 200;
  const fulcrumX = 160;
  const effortX = fulcrumX - distanceEffort * scale;
  const loadX = fulcrumX + distanceLoad * scale;

  return (
    <article className="example-card">
      <header>
        <h3>Palanca de 1r gènere</h3>
        <p>Fulcre centrat amb braços de 0,30 m (esforç) i 0,60 m (càrrega).</p>
      </header>
      <div className="example-card__layout">
        <section className="example-card__controls">
          <label className="example-field">
            <span>η<sub>palanca</sub></span>
            <input
              type="range"
              min={0.5}
              max={1}
              step={0.01}
              value={efficiency}
              onChange={(event) => setEfficiency(Number(event.target.value))}
            />
            <input
              type="number"
              min={0.1}
              max={1}
              step={0.01}
              value={efficiency}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (Number.isFinite(value)) {
                  const clamped = Math.max(0.1, Math.min(1, value));
                  setEfficiency(clamped);
                }
              }}
            />
          </label>
        </section>
        <section className="example-card__data">
          <div className="lever-diagram">
            <svg viewBox="0 0 320 160" role="img" aria-label="Diagrama de la palanca">
              <line x1={effortX} y1={100} x2={loadX} y2={100} className="lever-diagram__beam" />
              <polygon
                points={`${fulcrumX - 20},100 ${fulcrumX + 20},100 ${fulcrumX},60`}
                className="lever-diagram__fulcrum"
              />
              <line x1={effortX} y1={100} x2={effortX} y2={40} className="lever-diagram__vector" />
              <line x1={loadX} y1={100} x2={loadX} y2={40} className="lever-diagram__vector lever-diagram__vector--load" />
              <text x={effortX - 30} y={35} className="lever-diagram__label">
                F_aplicada
              </text>
              <text x={loadX - 20} y={35} className="lever-diagram__label">
                80 N
              </text>
              <text x={(effortX + fulcrumX) / 2 - 30} y={120} className="lever-diagram__label">
                0,30 m
              </text>
              <text x={(fulcrumX + loadX) / 2 - 30} y={120} className="lever-diagram__label">
                0,60 m
              </text>
            </svg>
          </div>
          <dl className="example-grid">
            <div>
              <dt>F<sub>necessària</sub></dt>
              <dd>{NUMBER_FORMAT.format(result.inputForce)} N</dd>
            </div>
            <div>
              <dt>Moment càrrega</dt>
              <dd>{NUMBER_FORMAT.format(momentLoad)} N·m</dd>
            </div>
            <div>
              <dt>Moment esforç</dt>
              <dd>{NUMBER_FORMAT.format(momentEffort)} N·m</dd>
            </div>
          </dl>
          <ExplainPanel
            title="Equilibri de moments"
            formulaLatex={formulaLatex}
            substitutions={substitutions}
            result={{
              label: 'F_{necessària}',
              value: result.inputForce,
              unit: 'N',
            }}
            formatNumber={(value) => formatNumber(value)}
          />
        </section>
      </div>
    </article>
  );
};

const Gallery = () => {
  return (
    <section className="page page--gallery">
      <header className="page__header">
        <h1>Momentor</h1>
        <p>Explora la col·lecció d'activitats i simulacions de màquines simples.</p>
      </header>
      <nav className="page__nav">
        <Link to="/editor" className="page__link">
          Obrir l'editor
        </Link>
      </nav>
      <article className="page__content">
        <h2>Escenes d'exemple (ESO/Batx)</h2>
        <div className="examples-grid">
          <PolispastBasicExample />
          <WinchExample />
          <LeverFirstClassExample />
        </div>
      </article>
    </section>
  );
};

export default Gallery;
