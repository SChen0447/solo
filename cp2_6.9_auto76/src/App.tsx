import React, { useState, useEffect, useCallback, useRef } from 'react';
import SVGVis from './SVGVis';
import TestPanel from './TestPanel';
import {
  parseRegex,
  generateRegex,
  updateNodeParams,
  deleteNode,
  type ParseNode
} from './RegexParser';

const DEFAULT_REGEX = '(\\w+)@(\\w+)\\.(\\w+)';

const App: React.FC = () => {
  const [regex, setRegex] = useState<string>(DEFAULT_REGEX);
  const [ast, setAst] = useState<ParseNode | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const parseLocal = useCallback((pattern: string) => {
    try {
      if (!pattern.trim()) {
        setAst(null);
        setParseError(null);
        return;
      }
      const result = parseRegex(pattern);
      setAst(result);
      setParseError(null);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : '解析失败');
    }
  }, []);

  const parseWithBackend = useCallback(async (pattern: string) => {
    if (!pattern.trim()) {
      setAst(null);
      setParseError(null);
      return;
    }

    setIsParsing(true);
    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regex: pattern })
      });
      const data = await response.json();
      if (data.success) {
        setAst(data.ast);
        setParseError(null);
      } else {
        throw new Error(data.error);
      }
    } catch {
      parseLocal(pattern);
    } finally {
      setIsParsing(false);
    }
  }, [parseLocal]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      parseWithBackend(regex);
    }, 50);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [regex, parseWithBackend]);

  const handleRegexChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRegex(e.target.value);
  }, []);

  const handleNodeUpdate = useCallback((nodeId: string, params: Partial<ParseNode['params']>) => {
    setAst((prev) => {
      if (!prev) return prev;
      const updated = updateNodeParams(prev, nodeId, params);
      const newRegex = generateRegex(updated);
      setRegex(newRegex);
      return updated;
    });
  }, []);

  const handleNodeDelete = useCallback((nodeId: string) => {
    setAst((prev) => {
      if (!prev) return prev;
      const updated = deleteNode(prev, nodeId);
      const newRegex = generateRegex(updated);
      setRegex(newRegex);
      return updated;
    });
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1E1E2E',
        fontFamily: "'Fira Code', monospace"
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes inputGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(166, 226, 46, 0); }
          50% { box-shadow: 0 0 20px 2px rgba(166, 226, 46, 0.15); }
        }
      `}</style>

      <header
        style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #2D2D3F'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #F92672 0%, #AE81FF 50%, #66D9EF 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1E1E2E',
              fontWeight: 700,
              fontSize: '20px'
            }}
          >
            .*
          </div>
          <div>
            <h1
              style={{
                color: '#CDD6F4',
                fontSize: '20px',
                fontWeight: 600,
                margin: 0,
                letterSpacing: '0.5px'
              }}
            >
              正则表达式可视化编辑器
            </h1>
            <p style={{ color: '#6C6C8A', fontSize: '12px', margin: '4px 0 0' }}>
              输入正则表达式，实时查看语法树，支持拖拽编辑与节点修改
            </p>
          </div>
          {isParsing && (
            <span
              style={{
                marginLeft: 'auto',
                color: '#6C6C8A',
                fontSize: '12px',
                animation: 'fadeIn 0.3s ease'
              }}
            >
              解析中...
            </span>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={regex}
            onChange={handleRegexChange}
            placeholder="在此输入正则表达式，例如: (\\w+)@(\\w+)\\.(\\w+)"
            style={{
              width: '100%',
              padding: '18px 24px',
              borderRadius: '8px',
              backgroundColor: '#2D2D3F',
              border: parseError ? '1px solid #F92672' : '1px solid #444466',
              color: '#A6E22E',
              fontFamily: "'Fira Code', monospace",
              fontSize: '18px',
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              animation: 'inputGlow 3s ease-in-out infinite'
            }}
          />
          {parseError && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '6px',
                color: '#F92672',
                fontSize: '13px',
                backgroundColor: 'rgba(249, 38, 114, 0.1)',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(249, 38, 114, 0.3)',
                animation: 'fadeIn 0.2s ease'
              }}
            >
              ⚠ {parseError}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
          {['\\d+', '[a-zA-Z]+', '(foo|bar)', '^\\w+$', '.*?'].map((example) => (
            <button
              key={example}
              onClick={() => setRegex(example)}
              style={{
                padding: '6px 14px',
                backgroundColor: '#2D2D3F',
                border: '1px solid #444466',
                borderRadius: '6px',
                color: '#66D9EF',
                fontFamily: "'Fira Code', monospace",
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.borderColor = '#66D9EF';
                (e.target as HTMLButtonElement).style.backgroundColor = '#3C3C5A';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.borderColor = '#444466';
                (e.target as HTMLButtonElement).style.backgroundColor = '#2D2D3F';
              }}
            >
              {example}
            </button>
          ))}
        </div>
      </header>

      <SVGVis
        ast={ast}
        onNodeUpdate={handleNodeUpdate}
        onNodeDelete={handleNodeDelete}
      />

      <TestPanel regex={regex} />
    </div>
  );
};

export default App;
