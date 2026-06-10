import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { debounce } from 'lodash';

interface CodeBlockSegment {
  type: 'code';
  id: string;
  language: string;
  code: string;
}

interface TextSegment {
  type: 'text';
  content: string;
}

type Segment = CodeBlockSegment | TextSegment;

interface PreviewProps {
  markdown: string;
  onTextSelect: (text: string | null) => void;
  commentAnchors: string[];
  onRefresh?: () => void;
}

const RUNNABLE_LANGS = ['javascript', 'typescript', 'js', 'ts', 'html'];

function getLanguageLabel(lang: string): { label: string; color: string; bg: string } {
  const l = lang.toLowerCase();
  if (l === 'javascript' || l === 'js') {
    return { label: 'JS', color: '#000', bg: '#f0db4f' };
  }
  if (l === 'typescript' || l === 'ts') {
    return { label: 'TS', color: '#fff', bg: '#3178c6' };
  }
  if (l === 'html') {
    return { label: 'HTML', color: '#fff', bg: '#e44d26' };
  }
  return { label: lang.toUpperCase().slice(0, 4), color: '#fff', bg: '#4a4a6a' };
}

function parseSegments(markdown: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /```(\w+)?\s*\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idCounter = 0;

  while ((match = regex.exec(markdown)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: markdown.slice(lastIndex, match.index),
      });
    }
    const language = (match[1] || '').trim() || 'text';
    const code = match[2];
    if (RUNNABLE_LANGS.includes(language.toLowerCase())) {
      segments.push({
        type: 'code',
        id: `code-${idCounter++}-${Date.now()}`,
        language,
        code,
      });
    } else {
      segments.push({
        type: 'text',
        content: match[0],
      });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < markdown.length) {
    segments.push({ type: 'text', content: markdown.slice(lastIndex) });
  }

  return segments;
}

function RunnableCodeBlock({
  segment,
  onRefresh,
}: {
  segment: CodeBlockSegment;
  onRefresh?: () => void;
}) {
  const [showOutput, setShowOutput] = useState(false);
  const [outputKey, setOutputKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { label, color, bg } = getLanguageLabel(segment.language);

  const runCode = useCallback(() => {
    setShowOutput(true);
    setOutputKey((k) => k + 1);
  }, []);

  const resetCode = useCallback(() => {
    setShowOutput(false);
    setOutputKey(0);
  }, []);

  useEffect(() => {
    if (onRefresh) {
      const handler = () => {
        setShowOutput(false);
        setOutputKey(0);
      };
      window.addEventListener('preview-refresh', handler);
      return () => window.removeEventListener('preview-refresh', handler);
    }
  }, [onRefresh]);

  const langExt =
    segment.language.toLowerCase() === 'html'
      ? [html()]
      : [javascript({ typescript: segment.language.toLowerCase().startsWith('t') })];

  const buildIframeSrcDoc = () => {
    const isHtml = segment.language.toLowerCase() === 'html';
    if (isHtml) {
      return `<!DOCTYPE html><html><head><style>body{font-family:Inter,sans-serif;background:#fff;color:#000;margin:0;padding:12px;}</style></head><body>${segment.code}</body></html>`;
    }
    const isTs = segment.language.toLowerCase().startsWith('t');
    const script = isTs ? segment.code : segment.code;
    const interceptedConsole = `
      <script>
        (function(){
          var logs = [];
          var origLog = console.log;
          var origErr = console.error;
          var origWarn = console.warn;
          function capture(type, args) {
            var str = Array.from(args).map(function(a) {
              try {
                if (typeof a === 'object') return JSON.stringify(a, null, 2);
                return String(a);
              } catch(e) { return String(a); }
            }).join(' ');
            logs.push({ type: type, text: str });
          }
          console.log = function() { capture('log', arguments); origLog.apply(console, arguments); };
          console.error = function() { capture('error', arguments); origErr.apply(console, arguments); };
          console.warn = function() { capture('warn', arguments); origWarn.apply(console, arguments); };
          window.addEventListener('load', function() {
            try {
              ${script}
            } catch(e) {
              logs.push({ type: 'error', text: 'Error: ' + e.message });
            }
            var out = document.getElementById('__out');
            if (out) {
              out.innerHTML = logs.map(function(l) {
                var color = l.type === 'error' ? '#e53e3e' : (l.type === 'warn' ? '#d69e2e' : '#2d3748');
                return '<div style="padding:2px 0;color:'+color+';">'+l.text.replace(/\\n/g,'<br>')+'</div>';
              }).join('') || '<div style="color:#718096;">(no console output)</div>';
            }
          });
        })();
      </script>
    `;
    return `<!DOCTYPE html><html><head><style>body{font-family:Inter,sans-serif;background:#f8f8f8;color:#111;margin:0;padding:10px;}#__out{font-family:JetBrains Mono,monospace;font-size:13px;white-space:pre-wrap;word-break:break-word;}</style></head><body><div id="__out"></div>${interceptedConsole}</body></html>`;
  };

  return (
    <div
      style={{
        margin: '16px 0',
        backgroundColor: '#2d2d44',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #3a3a55',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '6px 10px',
          backgroundColor: '#252545',
        }}
      >
        <span
          style={{
            padding: '2px 8px',
            backgroundColor: bg,
            color: color,
            fontSize: '11px',
            fontWeight: 700,
            borderRadius: '4px',
            letterSpacing: '0.5px',
          }}
        >
          {label}
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={runCode}
            style={{
              padding: '4px 12px',
              backgroundColor: '#7c3aed',
              color: '#fff',
              borderRadius: '5px',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            ▶ 运行
          </button>
          <button
            onClick={resetCode}
            style={{
              padding: '4px 12px',
              backgroundColor: '#4a4a6a',
              color: '#eaeaea',
              borderRadius: '5px',
              fontSize: '12px',
            }}
          >
            ↺ 重置
          </button>
        </div>
      </div>
      <div style={{ fontSize: '13px' }}>
        <CodeMirror
          value={segment.code}
          height="auto"
          theme="dark"
          extensions={langExt}
          basicSetup={{
            lineNumbers: false,
            highlightActiveLine: false,
            foldGutter: false,
            readOnly: true,
          }}
          editable={false}
        />
      </div>
      {showOutput && (
        <div
          style={{
            borderTop: '1px solid #4a4a6a',
            backgroundColor: '#1e1e2e',
          }}
        >
          <iframe
            key={outputKey}
            ref={iframeRef}
            srcDoc={buildIframeSrcDoc()}
            title={`output-${segment.id}`}
            sandbox="allow-scripts"
            style={{
              width: '100%',
              height: '200px',
              border: '1px solid #4a4a6a',
              borderRadius: '8px',
              margin: '8px',
              backgroundColor: '#fff',
            }}
          />
        </div>
      )}
    </div>
  );
}

function TextBlock({
  content,
  onTextSelect,
  anchors,
}: {
  content: string;
  onTextSelect: (t: string | null) => void;
  anchors: string[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [bubblePos, setBubblePos] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState<string | null>(null);

  const debouncedRender = useMemo(
    () =>
      debounce((md: string): string => {
        marked.setOptions({ breaks: true, gfm: true });
        const raw = marked.parse(md) as string;
        return DOMPurify.sanitize(raw);
      }, 100),
    []
  );

  const [html, setHtml] = useState('');

  useEffect(() => {
    const result = debouncedRender(content);
    if (typeof result === 'string') setHtml(result);
    else result.then((r: string) => setHtml(r));
  }, [content, debouncedRender]);

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim()) {
      const text = sel.toString().trim();
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (containerRect) {
        setSelectedText(text);
        setBubblePos({
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top - 8,
        });
      }
    }
  }, []);

  const handleDocClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-comment-bubble]') && !window.getSelection()?.toString().trim()) {
      setBubblePos(null);
      setSelectedText(null);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, [handleDocClick]);

  useEffect(() => {
    if (!containerRef.current || anchors.length === 0) return;
    const walker = document.createTreeWalker(containerRef.current, NodeFilter.SHOW_TEXT, null);
    const highlights: { textNode: Text; match: string }[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const tn = node as Text;
      const nodeText = tn.nodeValue || '';
      for (const a of anchors) {
        if (nodeText.includes(a)) {
          highlights.push({ textNode: tn, match: a });
          break;
        }
      }
    }
    highlights.forEach(({ textNode, match }) => {
      if (textNode.parentNode && !(textNode.parentNode as HTMLElement).classList?.contains('comment-anchor')) {
        try {
          const parent = textNode.parentNode;
          const fullText = textNode.nodeValue || '';
          const idx = fullText.indexOf(match);
          if (idx >= 0) {
            const before = fullText.slice(0, idx);
            const after = fullText.slice(idx + match.length);
            const span = document.createElement('span');
            span.className = 'comment-anchor';
            span.textContent = match;
            span.style.borderBottom = '2px solid #7c3aed';
            span.style.paddingBottom = '1px';
            span.style.backgroundColor = 'rgba(124, 58, 237, 0.15)';
            span.style.borderRadius = '2px';
            if (before) parent.insertBefore(document.createTextNode(before), textNode);
            parent.insertBefore(span, textNode);
            if (after) parent.insertBefore(document.createTextNode(after), textNode);
            parent.removeChild(textNode);
          }
        } catch {
          // ignore
        }
      }
    });
  }, [html, anchors]);

  return (
    <div
      ref={containerRef}
      onMouseUp={handleMouseUp}
      className="markdown-body"
      style={{
        position: 'relative',
        color: '#eaeaea',
        lineHeight: 1.7,
      }}
    >
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {bubblePos && selectedText && (
        <button
          data-comment-bubble
          onClick={(e) => {
            e.stopPropagation();
            onTextSelect(selectedText);
            setBubblePos(null);
            setSelectedText(null);
            window.getSelection()?.removeAllRanges();
          }}
          style={{
            position: 'absolute',
            left: bubblePos.x,
            top: bubblePos.y,
            transform: 'translate(-50%, -100%)',
            padding: '6px 14px',
            backgroundColor: '#7c3aed',
            color: '#fff',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 500,
            boxShadow: '0 4px 14px rgba(124,58,237,0.5)',
            zIndex: 50,
          }}
        >
          💬 评论
        </button>
      )}
    </div>
  );
}

export default function Preview({ markdown, onTextSelect, commentAnchors, onRefresh }: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const segments = useMemo(() => parseSegments(markdown), [markdown]);

  const handleRefresh = useCallback(() => {
    window.dispatchEvent(new CustomEvent('preview-refresh'));
    if (onRefresh) onRefresh();
  }, [onRefresh]);

  const handleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#252a34',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '10px 16px',
          backgroundColor: '#2d3240',
          borderBottom: '1px solid #4a4a6a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#eaeaea' }}>📄 文档预览</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleRefresh}
            style={{
              padding: '5px 12px',
              backgroundColor: '#3a3f55',
              color: '#eaeaea',
              borderRadius: '6px',
              fontSize: '12px',
            }}
            title="刷新"
          >
            ↻ 刷新
          </button>
          <button
            onClick={handleFullscreen}
            style={{
              padding: '5px 12px',
              backgroundColor: '#3a3f55',
              color: '#eaeaea',
              borderRadius: '6px',
              fontSize: '12px',
            }}
            title="全屏"
          >
            ⛶ 全屏
          </button>
        </div>
      </div>
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 28px',
        }}
      >
        {segments.map((seg, idx) =>
          seg.type === 'code' ? (
            <RunnableCodeBlock key={`${seg.id}-${idx}`} segment={seg} onRefresh={onRefresh} />
          ) : (
            <TextBlock
              key={`text-${idx}`}
              content={seg.content}
              onTextSelect={onTextSelect}
              anchors={commentAnchors}
            />
          )
        )}
        {segments.length === 0 && (
          <div style={{ color: '#6b7280', textAlign: 'center', padding: '40px 0' }}>
            在左侧编辑器中输入 Markdown 开始编写文档
          </div>
        )}
      </div>
    </div>
  );
}
