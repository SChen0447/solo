import React, { useState, useMemo, useCallback } from 'react';

interface TestPanelProps {
  regex: string;
}

interface Match {
  start: number;
  end: number;
  text: string;
  groups?: Record<string, string>;
}

const TestPanel: React.FC<TestPanelProps> = ({ regex }) => {
  const [testText, setTestText] = useState<string>('The quick brown fox jumps over 123 lazy dogs.\nEmail: test@example.com, Phone: 123-456-7890');

  const matches = useMemo<Match[]>(() => {
    if (!regex.trim()) return [];
    try {
      const re = new RegExp(regex, 'g');
      const results: Match[] = [];
      let match: RegExpExecArray | null;
      let safety = 0;
      while ((match = re.exec(testText)) !== null && safety < 1000) {
        safety++;
        results.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
          groups: match.groups
        });
        if (match[0].length === 0) {
          re.lastIndex++;
        }
      }
      return results;
    } catch {
      return [];
    }
  }, [regex, testText]);

  const highlightedContent = useMemo(() => {
    if (matches.length === 0) return testText;
    
    const segments: React.ReactNode[] = [];
    let lastEnd = 0;
    
    matches.forEach((m, idx) => {
      if (m.start > lastEnd) {
        segments.push(<span key={`text-${idx}`}>{testText.slice(lastEnd, m.start)}</span>);
      }
      segments.push(
        <mark
          key={`match-${idx}`}
          style={{
            backgroundColor: '#F92672',
            color: '#1E1E2E',
            padding: '1px 2px',
            borderRadius: '3px',
            animation: 'fadeIn 0.3s ease-in-out'
          }}
          title={`匹配: "${m.text}"${m.groups ? `\n分组: ${JSON.stringify(m.groups, null, 2)}` : ''}`}
        >
          {m.text || ' '}
        </mark>
      );
      lastEnd = m.end;
    });
    
    if (lastEnd < testText.length) {
      segments.push(<span key="text-end">{testText.slice(lastEnd)}</span>);
    }
    
    return segments;
  }, [testText, matches]);

  const handleTestTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTestText(e.target.value);
  }, []);

  const isRegexValid = useMemo(() => {
    if (!regex.trim()) return true;
    try {
      new RegExp(regex);
      return true;
    } catch {
      return false;
    }
  }, [regex]);

  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        padding: '16px',
        backgroundColor: '#1E1E2E'
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ color: '#CDD6F4', fontSize: '14px', fontWeight: 500 }}>
          测试文本
        </label>
        <textarea
          value={testText}
          onChange={handleTestTextChange}
          placeholder="在此输入要测试的字符串..."
          style={{
            flex: 1,
            minHeight: '120px',
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: '#2D2D3F',
            color: '#CDD6F4',
            border: isRegexValid ? '1px solid #444466' : '1px solid #F92672',
            fontFamily: "'Fira Code', monospace",
            fontSize: '14px',
            resize: 'vertical',
            outline: 'none'
          }}
        />
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ color: '#CDD6F4', fontSize: '14px', fontWeight: 500 }}>
            匹配结果 {matches.length > 0 && <span style={{ color: '#F92672' }}>({matches.length} 处匹配)</span>}
          </label>
          {!isRegexValid && (
            <span style={{ color: '#F92672', fontSize: '12px' }}>正则表达式语法错误</span>
          )}
        </div>
        <div
          style={{
            flex: 1,
            minHeight: '120px',
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: '#2D2D3F',
            border: '1px solid #444466',
            fontFamily: "'Fira Code', monospace",
            fontSize: '14px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            overflowY: 'auto',
            lineHeight: '1.6',
            animation: 'scaleIn 0.2s ease-out'
          }}
        >
          {highlightedContent || <span style={{ color: '#6C6C8A' }}>（无内容）</span>}
        </div>
      </div>
    </div>
  );
};

export default TestPanel;
