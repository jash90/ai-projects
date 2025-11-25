import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import DOMPurify from 'dompurify';

interface MermaidDiagramProps {
  chart: string;
  id?: string;
}

// Initialize mermaid with secure configuration
mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'strict', // Prevent XSS attacks
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  darkMode: false, // Will be handled via CSS
});

export function MermaidDiagram({ chart, id }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Detect dark mode
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(darkModeQuery.matches);

    const handleDarkModeChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
    };

    darkModeQuery.addEventListener('change', handleDarkModeChange);
    return () => darkModeQuery.removeEventListener('change', handleDarkModeChange);
  }, []);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!chart || !ref.current) return;

      try {
        setError('');

        // Update theme based on dark mode
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'strict',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        });

        // Generate unique ID for this diagram
        const diagramId = id || `mermaid-${Math.random().toString(36).substr(2, 9)}`;

        // Render the diagram
        const { svg: renderedSvg } = await mermaid.render(diagramId, chart);

        // Sanitize SVG for defense-in-depth against potential mermaid vulnerabilities
        const sanitizedSvg = DOMPurify.sanitize(renderedSvg, {
          USE_PROFILES: { svg: true, svgFilters: true },
        });
        setSvg(sanitizedSvg);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
      }
    };

    renderDiagram();
  }, [chart, id, isDark]);

  if (error) {
    return (
      <div className="mermaid-error">
        <div className="mermaid-error-title">⚠️ Mermaid Diagram Error</div>
        <pre className="mermaid-error-message">{error}</pre>
        <details className="mermaid-error-details">
          <summary>Show diagram code</summary>
          <pre>{chart}</pre>
        </details>
      </div>
    );
  }

  return (
    <div
      className="mermaid-wrapper"
      ref={ref}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default MermaidDiagram;
