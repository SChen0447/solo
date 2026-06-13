import { useState } from 'react';
import type { Book } from '../types';
import './BookCard.css';

interface BookCardProps {
  book: Book;
  onClick: () => void;
}

function BookCard({ book, onClick }: BookCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`book-card paper-texture ${isHovered ? 'hovered' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="book-cover">
        {!imageLoaded && (
          <div className="cover-skeleton">
            <svg width="40" height="50" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="1.5">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
        )}
        <img
          src={book.coverUrl}
          alt={book.title}
          className={`cover-image ${imageLoaded ? 'loaded' : ''}`}
          onLoad={() => setImageLoaded(true)}
        />
        <span className={`status-tag ${book.status}`}>
          {book.status === 'available' ? '可交换' : '已交换'}
        </span>
      </div>
      
      <div className="book-info">
        <h3 className="book-title" title={book.title}>{book.title}</h3>
        <p className="book-author">{book.author} · {book.year}</p>
        <p className="book-desc">{book.description}</p>
      </div>
    </div>
  );
}

export default BookCard;
