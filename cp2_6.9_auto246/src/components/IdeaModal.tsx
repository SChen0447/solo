import { useState, useEffect, useRef } from 'react';
import type { Idea, Reply } from '../types';
import './IdeaModal.css';

interface IdeaModalProps {
  idea: Idea;
  onClose: () => void;
  onUpdate: (idea: Idea) => void;
}

function IdeaModal({ idea, onClose, onUpdate }: IdeaModalProps) {
  const [replyContent, setReplyContent] = useState('');
  const [replyType, setReplyType] = useState<'continue' | 'refute'>('continue');
  const [submitting, setSubmitting] = useState(false);
  const [likedReplies, setLikedReplies] = useState<Set<string>>(new Set());
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleSubmit = async () => {
    if (!replyContent.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/ideas/${idea.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent.trim(), type: replyType }),
      });
      if (res.ok) {
        const { data: newReply } = await res.json();
        const updatedIdea = {
          ...idea,
          replies: [...idea.replies, newReply],
        };
        onUpdate(updatedIdea);
        setReplyContent('');
      }
    } catch (err) {
      console.error('提交续写失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (reply: Reply) => {
    if (likedReplies.has(reply.id)) return;
    try {
      const res = await fetch(`/api/ideas/${idea.id}/reply/${reply.id}/like`, {
        method: 'POST',
      });
      if (res.ok) {
        const { data: updatedReply } = await res.json();
        setLikedReplies((prev) => new Set(prev).add(reply.id));
        const updatedIdea = {
          ...idea,
          replies: idea.replies.map((r) =>
            r.id === reply.id ? updatedReply : r
          ),
        };
        onUpdate(updatedIdea);
      }
    } catch (err) {
      console.error('点赞失败:', err);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-container" ref={modalRef}>
        <button className="modal-close" onClick={onClose} aria-label="关闭">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        <div className="modal-body">
          <div className="modal-left">
            <div className="idea-full-content">
              <p className="idea-full-text">{idea.content}</p>
            </div>
          </div>

          <div className="modal-right">
            <div className="replies-header">
              <h3>灵感续写</h3>
              <span className="replies-count">共 {idea.replies.length} 条</span>
            </div>

            <div className="replies-list">
              {idea.replies.length === 0 ? (
                <div className="replies-empty">
                  还没有续写，来写下第一个吧
                </div>
              ) : (
                idea.replies.map((reply) => (
                  <div key={reply.id} className={`reply-item reply-${reply.type}`}>
                    <span className="reply-line" />
                    <div className="reply-content">
                      <p className="reply-content-text">{reply.content}</p>
                      <div className="reply-actions">
                        <button
                          className={`like-btn ${likedReplies.has(reply.id) ? 'liked' : ''}`}
                          onClick={() => handleLike(reply)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M7 10v12" />
                            <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H7V10l4.34-8.66a1.93 1.93 0 0 1 3.66 1.54Z" />
                          </svg>
                          <span>{reply.likes}</span>
                        </button>
                        <span className="reply-type-tag">
                          {reply.type === 'continue' ? '续写' : '反驳'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <div className="reply-type-toggle">
            <button
              className={`toggle-btn ${replyType === 'continue' ? 'active continue' : ''}`}
              onClick={() => setReplyType('continue')}
            >
              续写
            </button>
            <button
              className={`toggle-btn ${replyType === 'refute' ? 'active refute' : ''}`}
              onClick={() => setReplyType('refute')}
            >
              反驳
            </button>
          </div>
          <div className="reply-input-wrapper">
            <input
              type="text"
              className="reply-input"
              placeholder="用一句话写下你的想法..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <button
              className="gradient-btn submit-btn"
              onClick={handleSubmit}
              disabled={!replyContent.trim() || submitting}
            >
              {submitting ? (
                <span className="btn-spinner" />
              ) : (
                '提交'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IdeaModal;
