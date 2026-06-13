import { useState } from 'react';
import type { Book } from '../types';
import BookModal from './BookModal';
import BookCard from './BookCard';
import BookCardSkeleton from './BookCardSkeleton';
import './CardList.css';

interface CardListProps {
  books: Book[];
  loading: boolean;
  onExchange?: (book: Book) => void;
}

function CardList({ books, loading, onExchange }: CardListProps) {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  if (loading) {
    return (
      <div className="card-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <BookCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <p className="empty-text">暂无符合条件的书籍</p>
      </div>
    );
  }

  return (
    <>
      <div className="card-grid">
        {books.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            onClick={() => setSelectedBook(book)}
          />
        ))}
      </div>
      
      {selectedBook && (
        <BookModal
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onExchange={onExchange}
        />
      )}
    </>
  );
}

export default CardList;
