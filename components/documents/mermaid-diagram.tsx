'use client';

import { useEffect, useId, useState } from 'react';
import mermaid from 'mermaid';

type MermaidDiagramProps = {
  chart: string;
};

let isMermaidInitialized = false;

function initializeMermaid() {
  if (isMermaidInitialized) {
    return;
  }

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    fontFamily: 'IBM Plex Sans, ui-sans-serif, system-ui, sans-serif',
    themeVariables: {
      background: '#fffdf8',
      primaryColor: '#eef4ff',
      primaryBorderColor: '#4361a8',
      primaryTextColor: '#14213d',
      secondaryColor: '#edf7f0',
      secondaryBorderColor: '#2f7d57',
      tertiaryColor: '#fff4e8',
      tertiaryBorderColor: '#b96a12',
      lineColor: '#55637a',
      mainBkg: '#eef4ff',
      nodeBorder: '#4361a8',
      clusterBkg: '#f8f6ef',
      clusterBorder: '#cbbd9b',
      fontSize: '15px',
    },
    flowchart: {
      curve: 'cardinal',
      useMaxWidth: true,
      htmlLabels: false,
      nodeSpacing: 40,
      rankSpacing: 55,
    },
  });

  isMermaidInitialized = true;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const reactId = useId();
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    initializeMermaid();

    const render = async () => {
      try {
        const diagramId = `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
        const { svg: renderedSvg } = await mermaid.render(diagramId, chart);

        if (!isCancelled) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (renderError) {
        if (!isCancelled) {
          setSvg('');
          setError(renderError instanceof Error ? renderError.message : 'Unable to render Mermaid diagram');
        }
      }
    };

    void render();

    return () => {
      isCancelled = true;
    };
  }, [chart, reactId]);

  if (error) {
    return (
      <div className="my-5 rounded-2xl border border-amber-300 bg-amber-50/80 p-4 text-sm text-amber-950">
        <p className="font-semibold">Diagram rendering failed</p>
        <p className="mt-1">{error}</p>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-amber-200 bg-white/70 p-3 text-xs text-amber-950">
          <code>{chart}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className="my-5 overflow-x-auto rounded-3xl border border-stone-200 bg-[linear-gradient(180deg,rgba(255,253,248,0.98),rgba(248,244,235,0.98))] p-5 shadow-[0_18px_48px_rgba(28,35,52,0.08)]">
      {svg ? <div className="min-w-[40rem] [&_.cluster-label]:font-semibold [&_.edgeLabel]:rounded-md [&_.edgeLabel]:bg-white/85 [&_.edgeLabel]:px-1 [&_.label]:font-medium [&>svg]:h-auto [&>svg]:max-w-none [&>svg]:min-w-full" dangerouslySetInnerHTML={{ __html: svg }} /> : null}
    </div>
  );
}