import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, BookStatus, STATUS_LABELS, STATUS_COLORS } from './data';

interface BookCardProps {
  book: Book;
  visible: boolean;
  isNew?: boolean;
  onStatusChange: (id: string, status: BookStatus) => void;
}

const STATUS_ORDER: BookStatus[] = ['available', 'borrowed', 'reserved'];

const BookCard: React.FC<BookCardProps> = ({
  book,
  visible,
  isNew,
  onStatusChange,
}) => {
  const navigate = useNavigate();

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.status-tag')) return;
    navigate(`/book/${book.id}`);
  };

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIdx = STATUS_ORDER.indexOf(book.status);
    const nextStatus = STATUS_ORDER[(currentIdx + 1) % STATUS_ORDER.length];
    onStatusChange(book.id, nextStatus);
  };

  return (
    <div
      className={
        'book-card ' +
        (!visible ? 'shrink-out ' : '') +
        (isNew ? 'scale-in ' : 'fade-in')
      }
      style={cardStyle}
      onClick={handleCardClick}
    >
      <div
        className="cover"
        style={{
          width: '100%',
          height: '120px',
          borderRadius: '8px',
          backgroundColor: book.coverColor,
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '28px',
          fontWeight: 600,
          letterSpacing: '2px',
          textShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }}
      >
        {book.title.charAt(0)}
      </div>

      <h3
        style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#4e4e4e',
          marginBottom: '6px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={book.title}
      >
        {book.title}
      </h3>

      <p
        style={{
          fontSize: '13px',
          color: '#7a7a7a',
          marginBottom: '4px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        作者：{book.author}
      </p>

      <p
        style={{
          fontSize: '12px',
          color: '#9e9e9e',
          marginBottom: '14px',
          fontFamily: 'monospace',
        }}
      >
        ISBN: {book.isbn}
      </p>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '12px', color: '#9e9e9e' }}>
          库存: {book.stock}
        </span>
        <span
          className="status-tag"
          onClick={handleStatusClick}
          style={{
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            color: '#fff',
            backgroundColor: STATUS_COLORS[book.status],
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform =
              'translateY(-1px)';
            (e.currentTarget as HTMLElement).style.boxShadow =
              '0 2px 6px rgba(0,0,0,0.15)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
          }}
        >
          {STATUS_LABELS[book.status]}
        </span>
      </div>
    </div>
  );
};

const cardStyle: React.CSSProperties = {
  width: '260px',
  padding: '16px',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  boxShadow: '0 2px 8px #eee',
  cursor: 'pointer',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
};

export default BookCard;
