import { useState, useEffect } from 'react';
import type { Idea } from '../types';
import './CreateIdeaModal.css';

interface CreateIdeaModalProps {
  onClose: () => void;
  onCreated: (idea: Idea) => void;
}

function CreateIdeaModal({ onClose, onCreated }: CreateIdeaModalProps) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (res.ok) {
        const { data: newIdea } = await res.json();
        onCreated(newIdea);
      }
    } catch (err) {
      console.error('发布灵感失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="create-modal-overlay" onClick={handleOverlayClick}>
      <div className="create-modal-container">
        <button className="modal-close" onClick={onClose} aria-label="关闭">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        <h2 className="create-modal-title">发布新灵感</h2>
        <p className="create-modal-hint">写下此刻的想法，匿名分享给世界</p>

        <textarea
          className="create-textarea"
          placeholder="此刻你在想什么..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={500}
          autoFocus
        />

        <div className="create-footer">
          <span className="char-count">{content.length}/500</span>
          <button
            className="gradient-btn"
            onClick={handleSubmit}
            disabled={!content.trim() || submitting}
          >
            {submitting ? <span className="btn-spinner" /> : '发布'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateIdeaModal;
