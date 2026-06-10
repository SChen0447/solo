import React, { useState, useEffect, useRef, useCallback } from 'react';
import BookShelf from './BookShelf';
import BookDetail from './BookDetail';
import RecommendPanel from './RecommendPanel';
import { initialBooks } from './booksData';
import { getRecommendations } from './recommendService';
import type { Book, RecommendedBook, RatingMap } from './types';

const RATINGS_STORAGE_KEY = 'virtual_bookshelf_ratings';

const App: React.FC = () => {
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [userRatings, setUserRatings] = useState<RatingMap>({});
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedBook[]>([]);
  const scrollTargetRef = useRef<{ bookId: string | null }>({ bookId: null });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RATINGS_STORAGE_KEY);
      if (stored) {
        setUserRatings(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load ratings from localStorage');
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(RATINGS_STORAGE_KEY, JSON.stringify(userRatings));
    } catch (e) {
      console.warn('Failed to save ratings to localStorage');
    }
  }, [userRatings]);

  useEffect(() => {
    const recs = getRecommendations(books, userRatings, 3);
    setRecommendations(recs);
  }, [books, userRatings]);

  const handleBookClick = useCallback((book: Book) => {
    setSelectedBook(book);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedBook(null);
  }, []);

  const handleRatingChange = useCallback((bookId: string, rating: number) => {
    setUserRatings(prev => ({
      ...prev,
      [bookId]: rating
    }));
  }, []);

  const handleRecommendClick = useCallback((recBook: RecommendedBook) => {
    setBooks(prevBooks => {
      const exists = prevBooks.some(b => b.title === recBook.title);
      if (!exists) {
        return [...prevBooks, { ...recBook, rating: recBook.rating }];
      }
      return prevBooks;
    });
    setTimeout(() => {
      const targetBook = books.find(b => b.title === recBook.title) || recBook;
      scrollTargetRef.current.bookId = targetBook.id;
      setSelectedBook(targetBook);
    }, 50);
  }, [books]);

  return (
    <div className="app-root">
      <div className="main-container">
        <BookShelf
          books={books}
          userRatings={userRatings}
          onBookClick={handleBookClick}
          scrollTargetRef={scrollTargetRef}
        />
        <RecommendPanel
          recommendations={recommendations}
          onRecommendClick={handleRecommendClick}
        />
      </div>
      <BookDetail
        book={selectedBook}
        userRatings={userRatings}
        onClose={handleCloseDetail}
        onRatingChange={handleRatingChange}
      />
    </div>
  );
};

export default App;
