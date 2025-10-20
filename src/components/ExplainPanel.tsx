import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './explain-panel.css';

type ExplainPanelProps = {
  title?: string;
  formulaLatex: string;
  substitutions: Record<string, number | string>;
  result: {
    label: string;
    value: number | string;
    unit?: string;
  };
  formatNumber?: (value: number) => string;
};

type FeedbackState = 'idle' | 'success' | 'error';

function buildMarkdown(
  title: string,
  formulaLatex: string,
  substitutionLatex: string,
  resultLatex: string,
  substitutions: Record<string, number | string>,
  formatValue: (value: number | string) => string,
): string {
  const lines: string[] = [`## ${title}`, ''];
  lines.push(`1. Fórmula: $$${formulaLatex}$$`);
  lines.push(`2. Substitució: $$${substitutionLatex}$$`);
  lines.push(`3. Resultat: $$${resultLatex}$$`, '');

  const substitutionEntries = Object.entries(substitutions);
  if (substitutionEntries.length > 0) {
    lines.push('### Substitucions');
    substitutionEntries.forEach(([symbol, value]) => {
      lines.push(`- ${symbol} = ${formatValue(value)}`);
    });
  }

  return lines.join('\n');
}

const ExplainPanel = ({
  title = 'Derivació del càlcul',
  formulaLatex,
  substitutions,
  result,
  formatNumber,
}: ExplainPanelProps) => {
  const formulaRef = useRef<HTMLDivElement | null>(null);
  const substitutionRef = useRef<HTMLDivElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const [katexReady, setKatexReady] = useState(
    () => typeof window !== 'undefined' && !!window.katex,
  );
  const [copyStatus, setCopyStatus] = useState<FeedbackState>('idle');
  const [pdfStatus, setPdfStatus] = useState<FeedbackState>('idle');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    if (katexReady) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      if (window.katex) {
        setKatexReady(true);
        window.clearInterval(interval);
      }
    }, 200);

    return () => {
      window.clearInterval(interval);
    };
  }, [katexReady]);

  const defaultNumberFormatter = useMemo(() => {
    const formatter = new Intl.NumberFormat('ca-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return (value: number) => formatter.format(value);
  }, []);

  const formatValue = useCallback(
    (value: number | string) => {
      if (typeof value === 'number') {
        const formatter = formatNumber ?? defaultNumberFormatter;
        return formatter(value);
      }
      return value.toString();
    },
    [defaultNumberFormatter, formatNumber],
  );

  const substitutionLatex = useMemo(() => {
    let rendered = formulaLatex;
    Object.entries(substitutions).forEach(([symbol, value]) => {
      rendered = rendered.replaceAll(symbol, formatValue(value));
    });
    return rendered;
  }, [formulaLatex, substitutions, formatValue]);

  const resultLatex = useMemo(() => {
    const formattedValue = formatValue(result.value);
    const unitSegment = result.unit ? `\\,\\text{${result.unit}}` : '';
    return `${result.label} = ${formattedValue}${unitSegment}`;
  }, [formatValue, result]);

  useEffect(() => {
    const katex = typeof window !== 'undefined' ? window.katex : undefined;
    const renderLatex = (element: HTMLDivElement | null, latex: string) => {
      if (!element) {
        return;
      }

      if (katex) {
        try {
          katex.render(latex, element, { throwOnError: false, displayMode: true });
          return;
        } catch (error) {
          console.warn('No s\'ha pogut renderitzar KaTeX', error);
        }
      }

      element.textContent = latex;
    };

    renderLatex(formulaRef.current, formulaLatex);
    renderLatex(substitutionRef.current, substitutionLatex);
    renderLatex(resultRef.current, resultLatex);
  }, [formulaLatex, substitutionLatex, resultLatex, katexReady]);

  const markdown = useMemo(
    () =>
      buildMarkdown(
        title,
        formulaLatex,
        substitutionLatex,
        resultLatex,
        substitutions,
        formatValue,
      ),
    [title, formulaLatex, substitutionLatex, resultLatex, substitutions, formatValue],
  );

  const handleCopyReport = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(markdown);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = markdown;
        textArea.setAttribute('readonly', 'true');
        textArea.style.position = 'absolute';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopyStatus('success');
      window.setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (error) {
      console.error('No s\'ha pogut copiar l\'informe', error);
      setCopyStatus('error');
    }
  }, [markdown]);

  const handleDownloadPdf = useCallback(() => {
    try {
      const module = typeof window !== 'undefined' ? window.jspdf : undefined;
      if (!module?.jsPDF) {
        throw new Error('jsPDF no disponible');
      }

      const doc = new module.jsPDF();
      let cursorY = 20;

      doc.setFontSize(16);
      doc.text(title, 10, cursorY);
      cursorY += 10;

      doc.setFontSize(12);
      const sections: { heading: string; content: string }[] = [
        { heading: '1. Fórmula', content: `$$${formulaLatex}$$` },
        { heading: '2. Substitució', content: `$$${substitutionLatex}$$` },
        { heading: '3. Resultat', content: `$$${resultLatex}$$` },
      ];

      sections.forEach(({ heading, content }) => {
        doc.text(heading, 10, cursorY);
        cursorY += 6;
        const lines = doc.splitTextToSize(content, 180);
        lines.forEach((line) => {
          doc.text(line, 10, cursorY);
          cursorY += 6;
        });
        cursorY += 4;
      });

      const substitutionEntries = Object.entries(substitutions);
      if (substitutionEntries.length > 0) {
        doc.text('Substitucions', 10, cursorY);
        cursorY += 6;
        substitutionEntries.forEach(([symbol, value]) => {
          const line = `${symbol} = ${formatValue(value)}`;
          const splitLine = doc.splitTextToSize(line, 170);
          splitLine.forEach((lineText) => {
            doc.text(lineText, 12, cursorY);
            cursorY += 6;
          });
        });
      }

      doc.save('informe.pdf');
      setPdfStatus('success');
      window.setTimeout(() => setPdfStatus('idle'), 2000);
    } catch (error) {
      console.error('No s\'ha pogut generar el PDF', error);
      setPdfStatus('error');
    }
  }, [title, formulaLatex, substitutionLatex, resultLatex, substitutions, formatValue]);

  return (
    <section className="explain-panel">
      <header className="explain-panel__header">
        <h3>{title}</h3>
        <div className="explain-panel__actions">
          <button type="button" onClick={handleCopyReport}>
            Copia com a informe
          </button>
          <button type="button" onClick={handleDownloadPdf}>
            Descarrega PDF
          </button>
        </div>
      </header>

      <div className="explain-panel__steps">
        <div className="explain-panel__step">
          <span className="explain-panel__label">1. Fórmula</span>
          <div className="explain-panel__math" ref={formulaRef} />
        </div>
        <div className="explain-panel__step">
          <span className="explain-panel__label">2. Substitució de valors</span>
          <div className="explain-panel__math" ref={substitutionRef} />
        </div>
        <div className="explain-panel__step">
          <span className="explain-panel__label">3. Resultat</span>
          <div className="explain-panel__math" ref={resultRef} />
        </div>
      </div>

      <footer className="explain-panel__feedbacks">
        <span className={`explain-panel__feedback ${copyStatus}`}>
          {copyStatus === 'success'
            ? 'Informe copiat al porta-retalls.'
            : copyStatus === 'error'
            ? "No s'ha pogut copiar l'informe."
            : ''}
        </span>
        <span className={`explain-panel__feedback ${pdfStatus}`}>
          {pdfStatus === 'success'
            ? 'PDF generat correctament.'
            : pdfStatus === 'error'
            ? "No s'ha pogut generar el PDF."
            : ''}
        </span>
      </footer>
    </section>
  );
};

export default ExplainPanel;
