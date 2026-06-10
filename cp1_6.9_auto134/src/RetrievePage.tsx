import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bottle,
  Mood,
  MOOD_COLORS,
  MOOD_LABELS,
  MAX_REPLIES,
} from './types';

interface RetrievePageProps {
  onBack: () => void;
  onSeal: () => void;
}

function RetrievePage({ onBack, onSeal }: RetrievePageProps) {
  const [bottle, setBottle] = useState<Bottle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [replyMood, setReplyMood] = useState<Mood | ''>('');
  const [replyError, setReplyError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showGlow, setShowGlow] = useState(false);
  const [glowColor, setGlowColor] = useState('#66ccff');
  const letterRef = useRef<HTMLDivElement>(null);

  const fetchBottle = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/bottles/random', {
        method: 'POST',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || '捞取失败');
      }
      const data = await response.json();
      setBottle(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '捞取失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBottle();
  }, [fetchBottle]);

  const validateReply = useCallback((): string => {
    if (replyContent.length < 10 || replyContent.length > 100) {
      return '回复字数需在10-100字之间';
    }
    if (!replyMood) {
      return '请选择心情标签';
    }
    return '';
  }, [replyContent, replyMood]);

  const handleReply = useCallback(async () => {
    if (!bottle) return;

    const validationError = validateReply();
    if (validationError) {
      setReplyError(validationError);
      return;
    }

    if (bottle.status === 'sealed' || bottle.replies.length >= MAX_REPLIES) {
      setReplyError('这个瓶子已封存，无法回复');
      onSeal();
      return;
    }

    setReplyError('');
    setSubmitting(true);

    try {
      const response = await fetch(`/api/bottles/${bottle.id}/reply`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: replyContent,
          mood: replyMood,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data.sealed) {
          setReplyError(data.error || '瓶子已封存');
          onSeal();
          return;
        }
        throw new Error(data.error || '回复失败');
      }

      setBottle(data.bottle);
      setGlowColor(MOOD_COLORS[replyMood as Mood]);
      setShowGlow(true);

      setTimeout(() => {
        setShowGlow(false);
      }, 2000);

      setReplyContent('');
      setReplyMood('');

      setTimeout(() => {
        if (letterRef.current) {
          letterRef.current.scrollTop = letterRef.current.scrollHeight;
        }
      }, 100);

      if (data.justSealed) {
        setTimeout(() => {
          onSeal();
        }, 2500);
      }
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : '回复失败');
    } finally {
      setSubmitting(false);
    }
  }, [bottle, replyContent, replyMood, validateReply, onSeal]);

  if (loading) {
    return (
      <div className="retrieve-page">
        <div className="loading-container">
          <div className="loading-spinner" />
          <div className="loading-text">正在从大海中捞取漂流瓶...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="retrieve-page">
        <div className="empty-state">
          <div className="empty-icon">🌊</div>
          <div className="empty-text">{error}</div>
          <button className="submit-btn" onClick={fetchBottle}>
            再捞一次
          </button>
        </div>
      </div>
    );
  }

  if (!bottle) {
    return (
      <div className="retrieve-page">
        <div className="empty-state">
          <div className="empty-icon">💨</div>
          <div className="empty-text">没有捞到瓶子</div>
          <button className="submit-btn" onClick={fetchBottle}>
            再捞一次
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="retrieve-page">
      <h1 className="page-title">你捞到了一个漂流瓶</h1>

      <div className="retrieve-container">
        <div className="bottle-display">
          {bottle.status === 'sealed' && (
            <div className="sealed-badge">已封存</div>
          )}
          <div
            className="bottle-glow active"
            style={{
              background: showGlow
                ? `radial-gradient(circle, ${glowColor}66 0%, transparent 70%)`
                : 'transparent',
            }}
          />
          <div
            className="bottle-preview bottle-preview-large"
            style={{ '--bottle-color': bottle.appearance.color } as React.CSSProperties}
          >
            <div className="bottle-cap" />
            <div className="bottle-neck" />
            <div className="bottle-body">
              <div className={`bottle-texture texture-${bottle.appearance.texture}`} />
              <div className="bottle-highlight" />
              <div className="letter-paper" ref={letterRef}>
                <div className="letter-section">
                  <div className="letter-header">
                    <span className="letter-emoji">{bottle.emoji}</span>
                    <span
                      className="mood-dot"
                      style={{ background: MOOD_COLORS[bottle.mood] }}
                      title={MOOD_LABELS[bottle.mood]}
                    />
                    <span className="letter-label">原记忆 · {MOOD_LABELS[bottle.mood]}</span>
                  </div>
                  <div className="letter-content">{bottle.content}</div>
                </div>
                {bottle.replies.map((reply, idx) => (
                  <div key={reply.id} className="letter-section">
                    <div className="letter-header">
                      <span
                        className="mood-dot"
                        style={{ background: MOOD_COLORS[reply.mood] }}
                        title={MOOD_LABELS[reply.mood]}
                      />
                      <span className="letter-label">
                        回复 {idx + 1} · {MOOD_LABELS[reply.mood]}
                      </span>
                    </div>
                    <div className="letter-content">{reply.content}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="reply-indicator">
            回复层数：{bottle.replies.length}/{MAX_REPLIES}
            {bottle.status === 'sealed' && ' · 已封存'}
          </div>
        </div>

        {bottle.status !== 'sealed' && bottle.replies.length < MAX_REPLIES && (
          <div className="reply-section">
            <div className="form-section" style={{ padding: 16 }}>
              <label className="section-label">
                留下你的回复
                <span className="char-count">({replyContent.length}/100)</span>
              </label>
              <textarea
                className={`reply-textarea ${replyError && replyError.includes('字数') ? 'error' : ''}`}
                placeholder="写下你的回复（10-100字）..."
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                maxLength={100}
              />
              <div className="reply-controls">
                <select
                  className="mood-select"
                  value={replyMood}
                  onChange={e => setReplyMood(e.target.value as Mood)}
                >
                  <option value="">选择心情...</option>
                  {(Object.entries(MOOD_LABELS) as [Mood, string][]).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <button
                  className="reply-btn"
                  onClick={handleReply}
                  disabled={submitting}
                >
                  {submitting ? '投入中...' : '投入瓶'}
                </button>
              </div>
              {replyError && (
                <div className="error-text" style={{ marginTop: 8 }}>{replyError}</div>
              )}
            </div>
          </div>
        )}

        {bottle.status !== 'sealed' && bottle.replies.length < MAX_REPLIES && (
          <button className="submit-btn" onClick={fetchBottle} style={{ marginTop: 0 }}>
            捞取另一个
          </button>
        )}
      </div>
    </div>
  );
}

export default RetrievePage;
