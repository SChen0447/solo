import { useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { DocVersion } from '@/utils/docUtils';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  versions: DocVersion[];
  currentVersion: string;
  onSave: () => void;
  onVersionChange: (version: string) => void;
}

export default function Editor({
  value,
  onChange,
  versions,
  currentVersion,
  onSave,
  onVersionChange,
}: EditorProps) {
  const handleChange = useCallback(
    (val: string) => {
      onChange(val);
    },
    [onChange]
  );

  const insertCodeBlock = (lang: string) => {
    const snippet = `\n\`\`\`${lang}\n// 在此输入${lang.toUpperCase()}代码\n\`\`\`\n`;
    onChange(value + snippet);
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1e1e2e',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '10px 16px',
          backgroundColor: '#252545',
          borderBottom: '1px solid #4a4a6a',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            padding: '4px 10px',
            backgroundColor: '#7c3aed',
            color: '#fff',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          {currentVersion}
        </div>

        <select
          value={currentVersion}
          onChange={(e) => onVersionChange(e.target.value)}
          style={{
            padding: '6px 10px',
            backgroundColor: '#2d2d44',
            border: '1px solid #4a4a6a',
            borderRadius: '6px',
            color: '#eaeaea',
            fontSize: '13px',
            cursor: 'pointer',
          }}
          title="历史版本"
        >
          {versions.map((v) => (
            <option key={v.version} value={v.version}>
              {v.version} — {v.timestamp}
            </option>
          ))}
        </select>

        <button
          onClick={onSave}
          style={{
            padding: '6px 14px',
            background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
            color: '#fff',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          💾 保存为新版本
        </button>

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: '12px', color: '#9ca3af' }}>插入代码块:</span>
        <button
          onClick={() => insertCodeBlock('javascript')}
          style={{
            padding: '4px 10px',
            backgroundColor: '#f0db4f',
            color: '#000',
            borderRadius: '5px',
            fontSize: '12px',
            fontWeight: 600,
          }}
          title="插入 JavaScript 代码块"
        >
          JS
        </button>
        <button
          onClick={() => insertCodeBlock('typescript')}
          style={{
            padding: '4px 10px',
            backgroundColor: '#3178c6',
            color: '#fff',
            borderRadius: '5px',
            fontSize: '12px',
            fontWeight: 600,
          }}
          title="插入 TypeScript 代码块"
        >
          TS
        </button>
        <button
          onClick={() => insertCodeBlock('html')}
          style={{
            padding: '4px 10px',
            backgroundColor: '#e44d26',
            color: '#fff',
            borderRadius: '5px',
            fontSize: '12px',
            fontWeight: 600,
          }}
          title="插入 HTML 代码块"
        >
          HTML
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <CodeMirror
          value={value}
          height="100%"
          theme="dark"
          extensions={[markdown({ base: markdownLanguage, codeLanguages: languages })]}
          onChange={handleChange}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            foldGutter: true,
          }}
          style={{ height: '100%' }}
        />
      </div>
    </div>
  );
}
