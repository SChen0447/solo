import { useState, useCallback, useRef, useEffect } from 'react';
import EditorPanel from './components/EditorPanel';
import PreviewPanel from './components/PreviewPanel';
import { CodeSnippets, CodeTab } from './types';
import { mergeCode } from './utils/codeUtils';
import { DEFAULT_HTML, DEFAULT_CSS, DEFAULT_JS } from './constants/defaultCode';
import styles from './App.module.css';

export default function App() {
  const [snippets, setSnippets] = useState<CodeSnippets>({
    html: DEFAULT_HTML,
    css: DEFAULT_CSS,
    js: DEFAULT_JS
  });

  const [mergedHtml, setMergedHtml] = useState<string>(mergeCode({
    html: DEFAULT_HTML,
    css: DEFAULT_CSS,
    js: DEFAULT_JS
  }));

  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [editorWidth, setEditorWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleCodeChange = useCallback((tab: CodeTab, code: string) => {
    setSnippets((prev) => {
      const newSnippets = { ...prev, [tab]: code };
      setMergedHtml(mergeCode(newSnippets));
      return newSnippets;
    });
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(mergedHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
      const clampedWidth = Math.min(Math.max(newWidth, 20), 80);
      setEditorWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.target instanceof HTMLIFrameElement) {
        return;
      }
      setHasError(true);
      setErrorMessage(event.message || '未知错误');
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'error') {
        setHasError(true);
        setErrorMessage(event.data.message || '未知错误');
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    if (mergedHtml) {
      setHasError(false);
      setErrorMessage('');
    }
  }, [mergedHtml]);

  return (
    <div className={styles.app}>
      <div className={styles.appHeader}>
        <h1 className={styles.appTitle}>代码实时编辑与预览沙盒</h1>
        <button
          className={`${styles.copyButton} ${copied ? styles.copied : ''}`}
          onClick={handleCopy}
        >
          {copied ? '已复制!' : '复制代码'}
        </button>
      </div>
      <div className={styles.mainContent} ref={containerRef}>
        <div
          className={styles.editorWrapper}
          style={{ width: `${editorWidth}%` }}
        >
          <EditorPanel snippets={snippets} onChange={handleCodeChange} />
        </div>
        <div
          className={`${styles.divider} ${isDragging ? styles.dragging : ''}`}
          onMouseDown={handleMouseDown}
        />
        <div className={styles.previewWrapper}>
          <PreviewPanel
            htmlCode={mergedHtml}
            hasError={hasError}
            errorMessage={errorMessage}
          />
        </div>
      </div>
    </div>
  );
}
