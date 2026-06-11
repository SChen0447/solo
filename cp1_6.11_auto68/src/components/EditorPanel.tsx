import { useEffect, useRef, useState, useCallback } from 'react';
import * as monaco from 'monaco-editor';
import { CodeTab, CodeSnippets } from '../types';
import { debounce } from '../utils/codeUtils';
import styles from './EditorPanel.module.css';

interface EditorPanelProps {
  snippets: CodeSnippets;
  onChange: (tab: CodeTab, code: string) => void;
}

const LANGUAGE_MAP: Record<CodeTab, string> = {
  html: 'html',
  css: 'css',
  js: 'javascript'
};

const TAB_LABELS: Record<CodeTab, string> = {
  html: 'HTML',
  css: 'CSS',
  js: 'JavaScript'
};

export default function EditorPanel({ snippets, onChange }: EditorPanelProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [activeTab, setActiveTab] = useState<CodeTab>('html');
  const isInternalChangeRef = useRef(false);

  const debouncedOnChange = useCallback(
    debounce((tab: CodeTab, value: string) => {
      onChange(tab, value);
    }, 500),
    [onChange]
  );

  useEffect(() => {
    if (!editorRef.current) return;

    monacoEditorRef.current = monaco.editor.create(editorRef.current, {
      value: snippets[activeTab],
      language: LANGUAGE_MAP[activeTab],
      theme: 'vs-dark',
      fontSize: 14,
      lineHeight: 21,
      fontFamily: "'Cascadia Code', 'Consolas', 'Monaco', monospace",
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      tabSize: 2,
      insertSpaces: true
    });

    monacoEditorRef.current.onDidChangeModelContent(() => {
      if (isInternalChangeRef.current) return;
      const value = monacoEditorRef.current?.getValue() || '';
      debouncedOnChange(activeTab, value);
    });

    return () => {
      monacoEditorRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (monacoEditorRef.current) {
      const currentValue = monacoEditorRef.current.getValue();
      const targetValue = snippets[activeTab];
      if (currentValue !== targetValue) {
        isInternalChangeRef.current = true;
        monacoEditorRef.current.setValue(targetValue);
        isInternalChangeRef.current = false;
      }
      const model = monacoEditorRef.current.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, LANGUAGE_MAP[activeTab]);
      }
    }
  }, [activeTab, snippets]);

  const handleTabClick = (tab: CodeTab) => {
    setActiveTab(tab);
  };

  const tabs: CodeTab[] = ['html', 'css', 'js'];

  return (
    <div className={styles.editorPanel}>
      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.active : ''}`}
            onClick={() => handleTabClick(tab)}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>
      <div className={styles.editorContainer}>
        <div ref={editorRef} style={{ width: '100%', height: '100%' }} />
        {!snippets[activeTab] && (
          <div className={styles.editorPlaceholder}>
            // 在左侧编写{TAB_LABELS[activeTab]}代码，
            <br />
            右侧将自动预览效果
          </div>
        )}
      </div>
    </div>
  );
}
