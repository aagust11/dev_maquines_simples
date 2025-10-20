export {};

declare global {
  interface KaTeXRenderOptions {
    throwOnError?: boolean;
    displayMode?: boolean;
  }

  interface KaTeX {
    render: (tex: string, element: HTMLElement, options?: KaTeXRenderOptions) => void;
    renderToString: (tex: string, options?: KaTeXRenderOptions) => string;
  }

  interface JsPDFInstance {
    setFontSize: (size: number) => void;
    text: (text: string | string[], x: number, y: number) => void;
    splitTextToSize: (text: string, maxWidth: number) => string[];
    save: (filename: string) => void;
  }

  interface JsPDFConstructor {
    new (): JsPDFInstance;
  }

  interface JsPDFModule {
    jsPDF: JsPDFConstructor;
  }

  interface Window {
    katex?: KaTeX;
    jspdf?: JsPDFModule;
  }
}
