import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Socket } from 'socket.io-client';
import type { Story, Paragraph } from '../../shared/types';

interface Props {
  socket: Socket | null;
  penName: string;
  onRequirePenName: () => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return '0秒';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0) return `${min}分${sec}秒`;
  return `${sec}秒`;
}

export default function StoryPage({ socket, penName, onRequirePenName }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [currentWriter, setCurrentWriter] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const userIdRef = useRef<string>(socket?.id || Math.random().toString(36).slice(2));
  const storyEndRef = useRef<HTMLDivElement>(null);
  const joinedRef = useRef(false);

  const totalWords = useMemo(() => {
    if (!story) return 0;
    return story.paragraphs.reduce((sum, p) => sum + p.content.length, 0);
  }, [story]);

  const totalUsers = useMemo(() => {
    if (!story) return 0;
    return new Set(story.paragraphs.map(p => p.authorName)).size;
  }, [story]);

  const joinStory = useCallback(() => {
    if (!socket || !id || !penName || joinedRef.current) return;
    joinedRef.current = true;
    userIdRef.current = socket.id || userIdRef.current;
    socket.emit('join-story', { storyId: id, userName: penName });
  }, [socket, id, penName]);

  useEffect(() => {
    if (!penName.trim()) {
      onRequirePenName();
      return;
    }
  }, [penName, onRequirePenName]);

  useEffect(() => {
    if (!socket) return;
    joinStory();

    const handleStoryState = (s: Story | null) => {
      setLoading(false);
      if (!s) {
        setError('故事不存在');
        return;
      }
      setStory(s);
      if (s.currentWriterId === userIdRef.current) {
        setIsMyTurn(true);
      } else {
        setIsMyTurn(false);
      }
      setCurrentWriter(s.currentWriterName);
    };

    const handleParagraphAdded = (data: { storyId: string; paragraph: Paragraph }) => {
      setStory(prev => {
        if (!prev || prev.id !== data.storyId) return prev;
        const updated = { ...prev, paragraphs: [...prev.paragraphs, data.paragraph] };
        return updated;
      });
      setTimeout(() => {
        storyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    };

    const handleLockGranted = (data: { storyId: string; userId: string }) => {
      if (data.userId === userIdRef.current) {
        setIsMyTurn(true);
      }
    };

    const handleLockDenied = () => {
      setIsMyTurn(false);
    };

    const handleLockReleased = () => {
      setIsMyTurn(false);
    };

    const handleWriterStatus = (data: { storyId: string; writerName: string | null }) => {
      setCurrentWriter(data.writerName);
    };

    socket.on('story-state', handleStoryState);
    socket.on('paragraph-added', handleParagraphAdded);
    socket.on('lock-granted', handleLockGranted);
    socket.on('lock-denied', handleLockDenied);
    socket.on('lock-released', handleLockReleased);
    socket.on('writer-status', handleWriterStatus);

    return () => {
      socket.off('story-state', handleStoryState);
      socket.off('paragraph-added', handleParagraphAdded);
      socket.off('lock-granted', handleLockGranted);
      socket.off('lock-denied', handleLockDenied);
      socket.off('lock-released', handleLockReleased);
      socket.off('writer-status', handleWriterStatus);
    };
  }, [socket, joinStory]);

  function requestWrite() {
    if (!socket || !id || !penName) return;
    userIdRef.current = socket.id || userIdRef.current;
    socket.emit('request-lock', {
      storyId: id,
      userId: userIdRef.current,
      userName: penName
    });
  }

  function submitParagraph() {
    if (!socket || !id || !content.trim() || isMyTurn === false) return;
    setSubmitting(true);
    socket.emit('submit-paragraph', {
      storyId: id,
      userId: userIdRef.current,
      content: content.trim()
    });
    setContent('');
    setIsMyTurn(false);
    setSubmitting(false);
  }

  function jumpToParagraph(index: number) {
    setHighlightIndex(index);
    const el = document.getElementById(`paragraph-${index}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => setHighlightIndex(null), 2500);
    }
  }

  if (loading) {
    return (
      <div className="page fade-in">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="page fade-in">
        <div className="error-page">
          <p className="error-text">{error || '故事不存在'}</p>
          <Link to="/create" className="btn btn-primary">返回首页</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page page-story fade-in">
      <div className="story-layout">
        <div className="story-main">
          <header className="story-header">
            <div className="story-header-left">
              <Link to="/create" className="back-link">← 返回</Link>
              <h1 className="story-title">{story.title}</h1>
            </div>
            <div className="story-id-badge">
              故事ID: <span className="story-id">{story.id}</span>
            </div>
          </header>

          <div className="story-content">
            {story.paragraphs.map((p, i) => (
              <div
                key={p.id}
                id={`paragraph-${i}`}
                className={`paragraph ${highlightIndex === i ? 'paragraph-highlight' : ''} paragraph-enter`}
              >
                <div className="paragraph-meta">
                  <span className="paragraph-author">✎ {p.authorName}</span>
                  <span className="paragraph-time">{formatTime(p.timestamp)}</span>
                </div>
                <p className="paragraph-text">{p.content}</p>
                {i < story.paragraphs.length - 1 && <div className="paragraph-divider" />}
              </div>
            ))}
            <div ref={storyEndRef} />
          </div>

          <div className={`writer-box ${isMyTurn ? 'writer-box-active' : ''}`}>
            {isMyTurn ? (
              <>
                <div className="writer-status writer-status-active">
                  ✒️ 当前轮到你了
                </div>
                <div className="writer-input-wrap">
                  <textarea
                    className="writer-input"
                    placeholder="写下你的段落，最多300字..."
                    value={content}
                    onChange={(e) => setContent(e.target.value.slice(0, 300))}
                    rows={3}
                    autoFocus
                  />
                  <div className="writer-footer">
                    <span className="char-count">{content.length}/300</span>
                    <button
                      className="btn btn-primary"
                      onClick={submitParagraph}
                      disabled={!content.trim() || submitting}
                    >
                      提交段落
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="writer-status" onClick={requestWrite}>
                {currentWriter
                  ? `⏳ ${currentWriter} 正在写作中，请稍候...`
                  : '✋ 点击此处开始写下一段'}
              </div>
            )}
          </div>
        </div>

        <aside className="story-sidebar">
          <h3 className="sidebar-title">写作时间线</h3>
          <div className="timeline">
            {story.paragraphs.map((p, i) => (
              <div
                key={p.id}
                className="timeline-item"
                onClick={() => jumpToParagraph(i)}
              >
                <div className="timeline-dot" />
                <div className="timeline-line" />
                <div className="timeline-content">
                  <div className="timeline-header">
                    <span className="timeline-index">第{i + 1}段</span>
                    <span className="timeline-duration">{formatDuration(p.durationMs)}</span>
                  </div>
                  <div className="timeline-author">✎ {p.authorName}</div>
                  <div className="timeline-time">{formatTime(p.timestamp)}</div>
                  <div className="timeline-preview">
                    {p.content.length > 30 ? p.content.slice(0, 30) + '...' : p.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="sidebar-stats">
            <div className="stat-card">
              <div className="stat-value">{totalWords}</div>
              <div className="stat-label">总字数</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{totalUsers}</div>
              <div className="stat-label">参与人数</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
