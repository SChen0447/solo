import { useState } from 'react';
import type { Idea } from '../types';
import './IdeaCard.css';

interface IdeaCardProps {
  idea: Idea;
  index: number;
  onClick: () => void;
  isSearchResult?: boolean;
}

function IdeaCard({ idea, index, onClick, isSearchResult = false }: IdeaCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const previewReplies = idea.replies.slice(0, 3);

  const animationStyle = isSearchResult
    ? {
        animation: 'fadeInUp 0.4s ease-out forwards',
        animationDelay: `${index * 0.08}s`,
        opacity: 0,
      }
    : {
        animation: 'slideInFromRight 0.25s ease-out forwards',
        animationDelay: `${index * 0.05}s`,
        opacity: 0,
      };

  return (
    <div
      className={`idea-card ${isHovered ? 'hovered' : ''}`}
      style={animationStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className="card-content">
        <p className="card-text">{idea.content}</p>
      </div>

      <div className="card-footer">
        <div className="reply-count">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>{idea.replies.length} 条续写</span>
        </div>
      </div>

      {previewReplies.length > 0 && (
        <div className={`card-replies ${isHovered ? 'visible' : ''}`}>
          <div className="replies-divider" />
          {previewReplies.map((reply) => (
            <div
              key={reply.id}
              className={`reply-preview reply-${reply.type}`}
            >
              <span className="reply-indicator" />
              <span className="reply-text">{reply.content}</span>
            </div>
          ))}
          {idea.replies.length > 3 && (
            <div className="more-replies">还有 {idea.replies.length - 3} 条...</div>
          )}
        </div>
      )}
    </div>
  );
}

export default IdeaCard;
