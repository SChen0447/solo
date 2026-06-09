import { useState, useEffect, useRef } from 'react';
import type { CodeContent } from '../types';

interface PreviewFrameProps {
  code: CodeContent;
}

const generateSrcDoc = (code: CodeContent) => {
  const cssInjection = code.css
    ? `<style>${code.css}</style>`
    : '';
  const jsInjection = code.js
    ? `<script>${code.js}<\/script>`
    : '';

  let html = code.html || '';

  if (!html.includes('<head>') && !html.includes('<HEAD>')) {
    html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${cssInjection}
</head>
<body>
  ${html}
  ${jsInjection}
</body>
</html>`;
  } else {
    if (!html.includes('<style') && cssInjection) {
      html = html.replace('</head>', `${cssInjection}</head>`);
    }
    if (!html.includes('<script') && jsInjection) {
      html = html.replace('</body>', `${jsInjection}</body>`);
    }
  }

  return html;
};

const PreviewFrame = ({ code }: PreviewFrameProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [srcDoc, setSrcDoc] = useState(generateSrcDoc(code));
  const debounceRef = useRef<number | null>(null);
  const loadingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    setIsLoading(true);

    debounceRef.current = window.setTimeout(() => {
      setSrcDoc(generateSrcDoc(code));
      loadingTimeoutRef.current = window.setTimeout(() => {
        setIsLoading(false);
      }, 400);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
  }, [code.html, code.css, code.js]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.dotRed} />
          <div style={styles.dotYellow} />
          <div style={styles.dotGreen} />
        </div>
        <span style={styles.headerTitle}>实时预览</span>
        <div style={styles.headerRight} />
      </div>
      <div style={styles.previewWrapper}>
        {isLoading && (
          <div style={styles.loadingOverlay} className="preview-loading">
            <div style={styles.spinner}>
              <div style={styles.spinnerInner} />
            </div>
          </div>
        )}
        <iframe
          srcDoc={srcDoc}
          style={styles.iframe}
          sandbox="allow-scripts allow-forms allow-popups allow-modals"
          title="preview"
        />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#FFFFFF',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #3F3F5A',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    background: '#1E1E2E',
    borderBottom: '1px solid #3F3F5A',
  },
  headerLeft: {
    display: 'flex',
    gap: '6px',
    width: '60px',
  },
  headerRight: {
    width: '60px',
  },
  headerTitle: {
    fontSize: '12px',
    color: '#9CA3AF',
    fontWeight: 500,
  },
  dotRed: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: '#FF5F56',
  },
  dotYellow: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: '#FFBD2E',
  },
  dotGreen: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: '#27C93F',
  },
  previewWrapper: {
    flex: 1,
    position: 'relative',
    background: '#FFFFFF',
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
    background: '#FFFFFF',
  },
  loadingOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(255, 255, 255, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  spinner: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '3px solid #E5E7EB',
    borderTopColor: '#6366F1',
    animation: 'spin 0.8s linear infinite',
  },
  spinnerInner: {
    display: 'none',
  },
};

export default PreviewFrame;
