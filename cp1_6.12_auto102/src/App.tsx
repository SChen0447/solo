import { useState, useEffect, useCallback } from 'react';
import { Annotation, Book, ViewMode, Position } from './types';
import { BOOKS } from './data/books';
import { getAnnotations, createAnnotation } from './services/api';
import Bookshelf from './components/Bookshelf';
import BookReader from './components/BookReader';
import './styles/App.css';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('bookshelf');
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLine, setSelectedLine] = useState<{ position: Position; text: string } | null>(null);
  const [annotationInput, setAnnotationInput] = useState('');

  const loadAnnotations = useCallback(async (bookId: string) => {
    setLoading(true);
    try {
      const data = await getAnnotations(bookId);
      setAnnotations(data);
    } catch (error) {
      console.error('Failed to load annotations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleBookSelect = (book: Book) => {
    setCurrentBook(book);
    setViewMode('reading');
    loadAnnotations(book.id);
  };

  const handleBackToBookshelf = () => {
    setViewMode('bookshelf');
    setCurrentBook(null);
    setSelectedLine(null);
    setAnnotations([]);
  };

  const handleLineClick = (position: Position, text: string) => {
    setSelectedLine({ position, text });
    setAnnotationInput('');
  };

  const handleSendAnnotation = async () => {
    if (!currentBook || !selectedLine || !annotationInput.trim()) return;

    try {
      const newAnnotation = await createAnnotation({
        userId: 1,
        bookId: currentBook.id,
        segmentText: selectedLine.text,
        fullText: annotationInput,
        position: selectedLine.position,
      });
      setAnnotations(prev => [...prev, newAnnotation]);
      setSelectedLine(null);
      setAnnotationInput('');
    } catch (error) {
      console.error('Failed to create annotation:', error);
    }
  };

  const handleAnnotationUpdate = useCallback((updatedAnnotation: Annotation) => {
    setAnnotations(prev =>
      prev.map(a => (a.id === updatedAnnotation.id ? updatedAnnotation : a))
    );
  }, []);

  const handleCloseInput = () => {
    setSelectedLine(null);
    setAnnotationInput('');
  };

  useEffect(() => {
    if (viewMode === 'reading' && currentBook) {
      loadAnnotations(currentBook.id);
    }
  }, [viewMode, currentBook, loadAnnotations]);

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="navbar-content">
          <button className="nav-button" onClick={handleBackToBookshelf}>
            📚 书架
          </button>
          {currentBook && (
            <span className="current-book-title">{currentBook.title}</span>
          )}
        </div>
      </nav>

      <main className="main-content">
        {viewMode === 'bookshelf' ? (
          <Bookshelf books={BOOKS} onSelectBook={handleBookSelect} />
        ) : currentBook ? (
          <BookReader
            book={currentBook}
            annotations={annotations}
            selectedLine={selectedLine}
            annotationInput={annotationInput}
            onLineClick={handleLineClick}
            onAnnotationInputChange={setAnnotationInput}
            onSendAnnotation={handleSendAnnotation}
            onAnnotationUpdate={handleAnnotationUpdate}
            onCloseInput={handleCloseInput}
            loading={loading}
          />
        ) : null}
      </main>
    </div>
  );
}

export default App;
