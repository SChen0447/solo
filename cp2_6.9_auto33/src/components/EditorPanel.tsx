import { useEffect, useRef, useState, useCallback } from 'react';
import Editor, { OnChange, OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import type { Language, User } from '../types';

interface EditorPanelProps {
  code: Record<Language, string>;
  onCodeChange: (language: Language, value: string) => void;
  users: User[];
  currentUserId: string;
  onCursorChange: (cursor: any, selection: any) => void;
  restoreAnimationKey?: number;
}

const TABS: { key: Language; label: string; language: string }[] = [
  { key: 'html', label: 'HTML', language: 'html' },
  { key: 'css', label: 'CSS', language: 'css' },
  { key: 'js', label: 'JavaScript', language: 'javascript' },
];

const EditorPanel = ({
  code,
  onCodeChange,
  users,
  currentUserId,
  onCursorChange,
  restoreAnimationKey = 0,
}: EditorPanelProps) => {
  const [activeTab, setActiveTab] = useState<Language>('html');
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  const isRemoteChangeRef = useRef(false);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.onDidChangeCursorPosition((e) => {
      const model = editor.getModel();
      if (!model) return;
      const selection = editor.getSelection();
      onCursorChange(e.position, selection);
    });

    editor.onDidChangeCursorSelection((e) => {
      const model = editor.getModel();
      if (!model) return;
      const position = editor.getPosition();
      onCursorChange(position, e.selection);
    });
  };

  const handleChange: OnChange = (value) => {
    if (isRemoteChangeRef.current) {
      isRemoteChangeRef.current = false;
      return;
    }
    if (value !== undefined) {
      onCodeChange(activeTab, value);
    }
  };

  const updateRemoteDecorations = useCallback(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const monaco = monacoRef.current;
    const otherUsers = users.filter((u) => u.id !== currentUserId);

    const decorations: any[] = [];

    otherUsers.forEach((user) => {
      if (user.cursor) {
        decorations.push({
          range: new monaco.Range(
            user.cursor.lineNumber,
            user.cursor.column,
            user.cursor.lineNumber,
            user.cursor.column
          ),
          options: {
            isWholeLine: false,
            className: 'remote-cursor',
            beforeContentClassName: 'remote-cursor-before',
            overviewRuler: {
              color: user.color,
              position: monaco.editor.OverviewRulerLane.Full,
            },
            before: {
              content: ' ',
              inlineClassName: 'remote-cursor-line',
            },
          },
        });

        decorations.push({
          range: new monaco.Range(
            user.cursor.lineNumber,
            Math.max(1, user.cursor.column - 1),
            user.cursor.lineNumber,
            user.cursor.column
          ),
          options: {
            isWholeLine: false,
            before: {
              content: ' ',
              inlineClassName: `cursor-color-${user.id.slice(0, 8)}`,
            },
          },
        });
      }

      if (user.selection && !user.selection.isEmpty()) {
        decorations.push({
          range: new monaco.Range(
            user.selection.startLineNumber,
            user.selection.startColumn,
            user.selection.endLineNumber,
            user.selection.endColumn
          ),
          options: {
            isWholeLine: false,
            className: `remote-selection-${user.id.slice(0, 8)}`,
          },
        });
      }
    });

    decorationsRef.current = editorRef.current.deltaDecorations(
      decorationsRef.current,
      decorations
    );
  }, [users, currentUserId]);

  useEffect(() => {
    updateRemoteDecorations();
  }, [users, updateRemoteDecorations]);

  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      isRemoteChangeRef.current = true;
      const model = editorRef.current.getModel();
      if (model && model.getValue() !== code[activeTab]) {
        editorRef.current.setValue(code[activeTab]);
      }
    }
  }, [code, activeTab]);

  const activeTabConfig = TABS.find((t) => t.key === activeTab)!;

  const styleSheet = document.createElement('style');
  users.forEach((user) => {
    const id = user.id.slice(0, 8);
    styleSheet.textContent += `
      .cursor-color-${id} {
        background: ${user.color} !important;
        width: 2px !important;
        height: 18px !important;
        animation: cursorBlink 1s infinite;
        display: inline-block !important;
        position: relative !important;
      }
      .remote-selection-${id} {
        background: ${user.color}33 !important;
        border-radius: 2px;
      }
    `;
  });
  if (!document.getElementById('remote-cursor-styles')) {
    styleSheet.id = 'remote-cursor-styles';
    document.head.appendChild(styleSheet);
  } else {
    const existing = document.getElementById('remote-cursor-styles');
    if (existing) existing.textContent = styleSheet.textContent;
  }

  return (
    <div style={styles.container}>
      <div style={styles.tabBar}>
        {TABS.map((tab, index) => (
          <div
            key={tab.key}
            style={{
              ...styles.tab,
              ...(activeTab === tab.key ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {activeTab === tab.key && <div style={styles.tabUnderline} />}
          </div>
        ))}
      </div>
      <div
        key={restoreAnimationKey}
        className={restoreAnimationKey > 0 ? 'code-restore-animation' : ''}
        style={styles.editorWrapper}
      >
        <Editor
          height="100%"
          language={activeTabConfig.language}
          value={code[activeTab]}
          theme="vs-dark"
          onChange={handleChange}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            minimap: { enabled: false },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            padding: { top: 16, bottom: 16 },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'smart',
            quickSuggestions: true,
            wordBasedSuggestions: 'off',
            tabSize: 2,
            autoIndent: 'advanced',
            formatOnPaste: true,
            formatOnType: true,
          }}
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
    background: '#2A2A3E',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  tabBar: {
    display: 'flex',
    background: '#1E1E2E',
    borderBottom: '1px solid #3F3F5A',
    padding: '0 8px',
    gap: '4px',
  },
  tab: {
    position: 'relative',
    padding: '12px 20px',
    color: '#9CA3AF',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    borderRadius: '8px 8px 0 0',
    transition: 'color 0.2s, background 0.2s',
    userSelect: 'none',
  },
  tabActive: {
    color: '#FFFFFF',
    background: '#2A2A3E',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: '16px',
    right: '16px',
    height: '2px',
    background: 'linear-gradient(90deg, #6366F1, #8B5CF6)',
    borderRadius: '1px',
  },
  editorWrapper: {
    flex: 1,
    minHeight: 0,
  },
};

export default EditorPanel;
