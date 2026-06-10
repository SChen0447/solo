import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Editor from '@/components/Editor';
import Preview from '@/components/Preview';
import CommentPanel from '@/components/CommentPanel';
import {
  Comment,
  CommentReply,
  DocVersion,
  exportMarkdown,
  generateShareLink,
  generateTimestamp,
  saveVersionSnapshot,
} from '@/utils/docUtils';

const INITIAL_CONTENT = `# 交互式技术文档示例

欢迎使用交互式技术文档平台！这里支持 **Markdown** 语法和可运行代码块。

## 功能特点

- 支持 JavaScript / TypeScript / HTML 代码实时运行
- 选中文字即可添加锚点评论
- 多版本快照管理
- 一键导出与分享

## JavaScript 示例

\`\`\`javascript
// 点击右上角"运行"按钮查看结果
const greet = (name) => \`Hello, \${name}!\`;
console.log(greet('World'));
console.log('当前时间:', new Date().toLocaleString());
\`\`\`

## HTML 示例

\`\`\`html
<div style="padding: 20px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 12px;">
  <h2 style="color: white; margin: 0;">🎉 交互式 HTML</h2>
  <p style="color: rgba(255,255,255,0.9);">这段 HTML 会被直接渲染到 iframe 中。</p>
  <button onclick="alert('你点击了按钮！')" style="padding: 8px 16px; background: #fff; border: none; border-radius: 6px; cursor: pointer;">点我</button>
</div>
\`\`\`

> 提示：选中本段文字后点击"评论"按钮即可添加讨论锚点。
`;

const INITIAL_VERSION: DocVersion = {
  version: 'v1.0',
  content: INITIAL_CONTENT,
  timestamp: generateTimestamp(),
};

export default function App() {
  const [content, setContent] = useState<string>(INITIAL_CONTENT);
  const [versions, setVersions] = useState<DocVersion[]>([INITIAL_VERSION]);
  const [currentVersion, setCurrentVersion] = useState<string>('v1.0');
  const [comments, setComments] = useState<Comment[]>([]);
  const [selectedAnchor, setSelectedAnchor] = useState<string | null>(null);
  const [commentPanelOpen, setCommentPanelOpen] = useState<boolean>(true);
  const [splitRatio, setSplitRatio] = useState<number>(0.6);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [shareLink, setShareLink] = useState<string>('');
  const [linkCopied, setLinkCopied] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(() => window.innerWidth < 768);

  const isDraggingRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const handleSaveVersion = useCallback(() => {
    const newVersion = saveVersionSnapshot(content, versions);
    setVersions((prev) => [...prev, newVersion]);
    setCurrentVersion(newVersion.version);
  }, [content, versions]);

  const handleVersionChange = useCallback(
    (version: string) => {
      const target = versions.find((v) => v.version === version);
      if (target) {
        setCurrentVersion(version);
        setContent(target.content);
      }
    },
    [versions]
  );

  const handleAddComment = useCallback((comment: Comment) => {
    setComments((prev) => [...prev, comment]);
  }, []);

  const handleAddReply = useCallback((commentId: string, reply: CommentReply) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, replies: [...c.replies, reply] } : c))
    );
  }, []);

  const handleTextSelect = useCallback((text: string | null) => {
    setSelectedAnchor(text);
    setCommentPanelOpen(true);
  }, []);

  const handleAnchorClick = useCallback((anchorText: string) => {
    setSelectedAnchor(anchorText);
  }, []);

  const handleMouseDownDivider = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalWidth = rect.width;
      const x = e.clientX - rect.left;
      const ratio = Math.min(Math.max(x / totalWidth, 0.2), 0.8);
      setSplitRatio(ratio);
    };
    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleExportMarkdown = useCallback(() => {
    exportMarkdown(content, 'tech-doc.md');
  }, [content]);

  const handleGenerateShareLink = useCallback(() => {
    const link = generateShareLink();
    setShareLink(link);
    setShowShareModal(true);
    setLinkCopied(false);
  }, []);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = shareLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  }, [shareLink]);

  const commentAnchors = useMemo(() => comments.map((c) => c.anchorText), [comments]);

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1a1a2e',
        color: '#eaeaea',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          padding: '10px 20px',
          backgroundColor: '#16162a',
          borderBottom: '1px solid #2a2a4a',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '22px' }}>📝</span>
          <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>交互式技术文档平台</h1>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleExportMarkdown}
          style={{
            padding: '7px 14px',
            backgroundColor: '#2d3240',
            color: '#eaeaea',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            border: '1px solid #4a4a6a',
          }}
        >
          ⬇ 导出 Markdown
        </button>
        <button
          onClick={handleGenerateShareLink}
          style={{
            padding: '7px 14px',
            backgroundColor: '#7c3aed',
            color: '#fff',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          🔗 生成分享链接
        </button>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div
          ref={containerRef}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            padding: '12px',
            gap: '12px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: isMobile ? '100%' : `${splitRatio * 100}%`,
              height: isMobile ? '50%' : '100%',
              minWidth: isMobile ? undefined : '200px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <Editor
              value={content}
              onChange={setContent}
              versions={versions}
              currentVersion={currentVersion}
              onSave={handleSaveVersion}
              onVersionChange={handleVersionChange}
            />
          </div>

          {!isMobile && (
            <div
              onMouseDown={handleMouseDownDivider}
              style={{
                width: '4px',
                minWidth: '4px',
                cursor: 'col-resize',
                backgroundColor: '#4a4a6a',
                borderRadius: '2px',
                transition: 'background-color 0.2s ease-out',
                alignSelf: 'stretch',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = '#7c3aed';
              }}
              onMouseLeave={(e) => {
                if (!isDraggingRef.current) {
                  (e.currentTarget as HTMLDivElement).style.backgroundColor = '#4a4a6a';
                }
              }}
            />
          )}

          <div
            style={{
              flex: isMobile ? '1' : undefined,
              width: isMobile ? '100%' : `${(1 - splitRatio) * 100}%`,
              height: isMobile ? '50%' : '100%',
              minWidth: isMobile ? undefined : '200px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <Preview
              markdown={content}
              onTextSelect={handleTextSelect}
              commentAnchors={commentAnchors}
            />
          </div>
        </div>

        {!isMobile && (
          <CommentPanel
            comments={comments}
            onAddComment={handleAddComment}
            onAddReply={handleAddReply}
            isOpen={commentPanelOpen}
            onToggle={() => setCommentPanelOpen((prev) => !prev)}
            selectedAnchor={selectedAnchor}
            onAnchorClick={handleAnchorClick}
          />
        )}
        {isMobile && commentPanelOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              zIndex: 200,
              boxShadow: '-4px 0 20px rgba(0,0,0,0.4)',
            }}
          >
            <CommentPanel
              comments={comments}
              onAddComment={handleAddComment}
              onAddReply={handleAddReply}
              isOpen={commentPanelOpen}
              onToggle={() => setCommentPanelOpen(false)}
              selectedAnchor={selectedAnchor}
              onAnchorClick={handleAnchorClick}
            />
          </div>
        )}
      </div>

      {showShareModal && (
        <div
          onClick={() => setShowShareModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 500,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#1e1e2e',
              border: '1px solid #4a4a6a',
              borderRadius: '12px',
              padding: '24px',
              width: '440px',
              maxWidth: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            <h2 style={{ margin: '0 0 16px', fontSize: '18px' }}>🔗 分享链接</h2>
            <p style={{ margin: '0 0 16px', color: '#9ca3af', fontSize: '13px' }}>
              通过以下链接分享此文档给你的团队成员：
            </p>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              <input
                readOnly
                value={shareLink}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  backgroundColor: '#252a34',
                  border: '1px solid #4a4a6a',
                  borderRadius: '6px',
                  color: '#eaeaea',
                  fontSize: '13px',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              />
              <button
                onClick={handleCopyLink}
                style={{
                  padding: '10px 18px',
                  backgroundColor: linkCopied ? '#10b981' : '#7c3aed',
                  color: '#fff',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}
              >
                {linkCopied ? '✓ 已复制' : '复制链接'}
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowShareModal(false)}
                style={{
                  padding: '8px 18px',
                  backgroundColor: 'transparent',
                  color: '#9ca3af',
                  borderRadius: '6px',
                  fontSize: '13px',
                  border: '1px solid #4a4a6a',
                }}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
