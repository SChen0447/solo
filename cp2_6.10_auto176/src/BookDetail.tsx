import React, { useState } from 'react';
import type { Book, RatingMap } from './types';

interface BookDetailProps {
  book: Book | null;
  userRatings: RatingMap;
  onClose: () => void;
  onRatingChange: (bookId: string, rating: number) => void;
}

const StarIcon: React.FC<{ filled: boolean; onClick: () => void; onHover: () => void; onLeave: () => void }> = ({
  filled,
  onClick,
  onHover,
  onLeave
}) => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
    onClick={onClick}
    onMouseEnter={onHover}
    onMouseLeave={onLeave}
    className="star-icon"
  >
    <path
      d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
      fill={filled ? '#ffc107' : '#e0e0e0'}
      stroke={filled ? '#ffc107' : '#c0c0c0'}
      strokeWidth="1"
    />
  </svg>
);

const BookDetail: React.FC<BookDetailProps> = ({ book, userRatings, onClose, onRatingChange }) => {
  const [expanded, setExpanded] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  if (!book) return null;

  const currentRating = userRatings[book.id] ?? book.rating;
  const displayRating = hoverRating > 0 ? hoverRating : currentRating;
  const fullStars = Math.round(displayRating);
  const descriptionLines = book.description.split(/(?<=。|！|？|.)/);
  const shortDescription = descriptionLines.slice(0, 2).join('');
  const needsExpand = descriptionLines.length > 2 || book.description.length > 60;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-body">
          <div className="modal-cover">
            <img src={book.cover} alt={book.title} />
          </div>
          <div className="modal-info">
            <h2 className="modal-title">{book.title}</h2>
            <div className="modal-meta">
              <span>作者：{book.author}</span>
              <span className="meta-divider">|</span>
              <span>出版：{book.year}年</span>
            </div>
            <div className="modal-rating">
              {[1, 2, 3, 4, 5].map(n => (
                <StarIcon
                  key={n}
                  filled={n <= fullStars}
                  onClick={() => onRatingChange(book.id, n)}
                  onHover={() => setHoverRating(n)}
                  onLeave={() => setHoverRating(0)}
                />
              ))}
              <span className="rating-text">{currentRating.toFixed(1)} / 5.0</span>
            </div>
            <p className="modal-description">
              {expanded || !needsExpand ? book.description : shortDescription}
              {needsExpand && (
                <button
                  className="expand-btn"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? '收起' : '展开'}
                </button>
              )}
            </p>
            <div className="modal-tags">
              {book.tags.map(tag => (
                <span key={tag} className="tag-chip">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetail;
