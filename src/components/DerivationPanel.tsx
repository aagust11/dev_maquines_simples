import katex from 'katex';

interface DerivationPanelProps {
  steps: string[];
}

const renderLatex = (expression: string) => {
  return {
    __html: katex.renderToString(expression, {
      throwOnError: false,
      displayMode: true,
      output: 'html'
    })
  };
};

const DerivationPanel = ({ steps }: DerivationPanelProps) => {
  if (steps.length === 0) {
    return null;
  }

  return (
    <div className="card">
      <h2>Derivació analítica</h2>
      {steps.map((step, index) => (
        <div className="derive-step" key={index} dangerouslySetInnerHTML={renderLatex(step)} />
      ))}
    </div>
  );
};

export default DerivationPanel;
