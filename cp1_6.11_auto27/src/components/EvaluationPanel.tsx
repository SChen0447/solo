import { useState, useCallback, useRef, useEffect } from 'react';
import type { TeamMember } from '../types';
import './EvaluationPanel.css';

interface EvaluationPanelProps {
  members: TeamMember[];
  onSubmit: (targetId: string, rating: number, comment: string) => void;
  getMemberName: (id: string) => string;
}

function EvaluationPanel({ members, onSubmit, getMemberName }: EvaluationPanelProps) {
  const [selectedMember, setSelectedMember] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  const minCommentLength = 20;
  const maxCommentLength = 100;

  const canSubmit = selectedMember && rating > 0 && comment.length >= minCommentLength && comment.length <= maxCommentLength;

  const handleRatingClick = useCallback((value: number) => {
    setRating(value);
  }, []);

  const handleCommentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxCommentLength) {
      setComment(value);
    }
  }, [maxCommentLength]);

  const createRipple = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!canSubmit) return;
    const button = e.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.className = 'ripple-effect';

    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }, [canSubmit]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(selectedMember, rating, comment);
    setSelectedMember('');
    setRating(0);
    setComment('');
  }, [canSubmit, selectedMember, rating, comment, onSubmit]);

  const displayRating = hoverRating || rating;

  return (
    <div className={`evaluation-panel-wrapper ${isVisible ? 'visible' : ''}`}>
      <div className="evaluation-panel glass-card">
        <h2 className="panel-title">匿名评价</h2>
        <p className="panel-subtitle">您的评价将完全匿名，请真实表达</p>

        <form onSubmit={handleSubmit} className="evaluation-form">
          <div className="form-group">
            <label className="form-label">
              评价对象
            </label>
            <select
              className="form-select"
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
            >
              <option value="">请选择评价对象</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {getMemberName(member.id)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              评分
            </label>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`star-btn ${star <= displayRating ? 'active' : ''}`}
                  onClick={() => handleRatingClick(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={{ transitionDelay: `${star * 30}ms` }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="star-icon"
                    style={{
                      animation: star <= rating ? 'starBounce 0.5s ease' : 'none',
                      animationDelay: star <= rating ? `${(5 - star) * 50}ms` : '0ms',
                    }}
                  >
                    <defs>
                      <linearGradient id={`goldGrad-${star}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffd700" />
                        <stop offset="100%" stopColor="#ffb347" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                      fill={star <= displayRating ? `url(#goldGrad-${star})` : '#4a4a5a'}
                      style={{ transition: 'fill 0.3s ease' }}
                    />
                  </svg>
                </button>
              ))}
              <span className="rating-text">
                {rating > 0 ? `${rating} 分` : '请评分'}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              评语
              <span className="hint">({minCommentLength}-{maxCommentLength}字)</span>
            </label>
            <textarea
              className="form-textarea"
              value={comment}
              onChange={handleCommentChange}
              placeholder="请输入您的评价意见..."
              rows={4}
            />
            <div className={`char-count ${comment.length < minCommentLength || comment.length > maxCommentLength ? 'warning' : ''}`}>
              {comment.length}/{maxCommentLength} 字
            </div>
          </div>

          <div className="submit-wrapper" onMouseEnter={() => !canSubmit && setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
            <button
              ref={submitBtnRef}
              type="submit"
              className="submit-btn btn-primary"
              disabled={!canSubmit}
              onClick={createRipple}
            >
              提交评价
            </button>
            {showTooltip && !canSubmit && (
              <div className="tooltip">
                请完成评价
              </div>
            )}
          </div>
        </form>
      </div>

      <style>{`
        @keyframes starBounce {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

export default EvaluationPanel;
