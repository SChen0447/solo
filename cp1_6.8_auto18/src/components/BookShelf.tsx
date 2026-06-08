import { useState, useRef, useCallback, useEffect } from 'react';
import type { Book, Category } from '../App';

interface BookShelfProps {
  books: Book[];
  categories: Category[];
  selectedCategory: string;
  onBookClick: (book: Book) => void;
  onBookMove: (bookId: string, position: number, categoryId?: string) => void;
  onBookSwap: (bookId1: string, bookId2: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

interface DragState {
  isDragging: boolean;
  draggedBook: Book | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  targetBookId: string | null;
  targetCategoryId: string | null;
}

function BookShelf({
  books,
  categories,
  selectedCategory,
  onBookClick,
  onBookMove,
  onBookSwap,
  showToast,
}: BookShelfProps) {
  const shelfRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedBook: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    targetBookId: null,
    targetCategoryId: null,
  });
  const [highlightedBookId, setHighlightedBookId] = useState<string | null>(null);
  const [flashCategoryId, setFlashCategoryId] = useState<string | null>(null);
  const [swappingBooks, setSwappingBooks] = useState<{ id1: string; id2: string } | null>(null);

  const bookRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (books.length > 0 && selectedCategory) {
      const categoryBooks = selectedCategory === 'all'
        ? books
        : selectedCategory === 'read'
        ? books.filter((b) => b.status === 'read')
        : selectedCategory === 'unread'
        ? books.filter((b) => b.status === 'unread')
        : books.filter((b) => b.categoryId === selectedCategory);

      if (categoryBooks.length > 0) {
        setHighlightedBookId(categoryBooks[0].id);
        const timer = setTimeout(() => setHighlightedBookId(null), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedCategory, books]);

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent, book: Book) => {
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setDragState({
      isDragging: true,
      draggedBook: book,
      startX: clientX,
      startY: clientY,
      currentX: clientX,
      currentY: clientY,
      targetBookId: null,
      targetCategoryId: null,
    });
  }, []);

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragState.isDragging || !dragState.draggedBook) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setDragState((prev) => ({
      ...prev,
      currentX: clientX,
      currentY: clientY,
    }));

    let foundTarget: string | null = null;
    bookRefs.current.forEach((el, id) => {
      if (id === dragState.draggedBook?.id) return;
      const rect = el.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        foundTarget = id;
      }
    });

    let foundCategory: string | null = null;
    const categoryElements = document.querySelectorAll('.category-item');
    categoryElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        const catId = el.getAttribute('data-category-id');
        if (catId && catId !== 'all' && catId !== 'read' && catId !== 'unread') {
          foundCategory = catId;
        }
      }
    });

    setDragState((prev) => ({
      ...prev,
      targetBookId: foundTarget,
      targetCategoryId: foundCategory,
    }));
  }, [dragState.isDragging, dragState.draggedBook]);

  const handleDragEnd = useCallback(() => {
    if (!dragState.isDragging || !dragState.draggedBook) {
      setDragState((prev) => ({ ...prev, isDragging: false }));
      return;
    }

    const { draggedBook, targetBookId, targetCategoryId } = dragState;

    if (targetCategoryId && targetCategoryId !== draggedBook.categoryId) {
      setFlashCategoryId(targetCategoryId);
      setTimeout(() => setFlashCategoryId(null), 500);
      onBookMove(draggedBook.id, 999, targetCategoryId);
      showToast('书籍已移动到新分类', 'success');
    } else if (targetBookId && targetBookId !== draggedBook.id) {
      setSwappingBooks({ id1: draggedBook.id, id2: targetBookId });
      setTimeout(() => {
        onBookSwap(draggedBook.id, targetBookId);
        setSwappingBooks(null);
        showToast('书籍位置已交换', 'success');
      }, 300);
    }

    setDragState({
      isDragging: false,
      draggedBook: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      targetBookId: null,
      targetCategoryId: null,
    });
  }, [dragState, onBookMove, onBookSwap, showToast]);

  useEffect(() => {
    if (dragState.isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDragMove);
        window.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [dragState.isDragging, handleDragMove, handleDragEnd]);

  const categoryBooks = selectedCategory === 'all'
    ? books
    : selectedCategory === 'read'
    ? books.filter((b) => b.status === 'read')
    : selectedCategory === 'unread'
    ? books.filter((b) => b.status === 'unread')
    : books.filter((b) => b.categoryId === selectedCategory);

  const currentCategory = categories.find((c) => c.id === selectedCategory);

  const isSwapping = (bookId: string) => {
    if (!swappingBooks) return false;
    return swappingBooks.id1 === bookId || swappingBooks.id2 === bookId;
  };

  const getSwapStyle = (bookId: string): React.CSSProperties => {
    if (!swappingBooks) return {};
    const isFirst = swappingBooks.id1 === bookId;
    const isSecond = swappingBooks.id2 === bookId;
    if (!isFirst && !isSecond) return {};

    const book1El = bookRefs.current.get(swappingBooks.id1);
    const book2El = bookRefs.current.get(swappingBooks.id2);
    if (!book1El || !book2El) return {};

    const rect1 = book1El.getBoundingClientRect();
    const rect2 = book2El.getBoundingClientRect();

    if (isFirst) {
      return {
        transform: `translate(${rect2.left - rect1.left}px, ${rect2.top - rect1.top}px)`,
        transition: 'transform 0.3s ease-in-out',
        zIndex: 10,
      };
    } else {
      return {
        transform: `translate(${rect1.left - rect2.left}px, ${rect1.top - rect2.top}px)`,
        transition: 'transform 0.3s ease-in-out',
        zIndex: 10,
      };
    }
  };

  return (
    <div className="bookshelf-wrapper">
      <div className="shelf-category-title">
        <span className="category-icon-large">{currentCategory?.icon || '📚'}</span>
        <h2>{currentCategory?.name || '全部书籍'}</h2>
        <span className="book-count">共 {categoryBooks.length} 本书</span>
      </div>

      <div className="bookshelf" ref={shelfRef}>
        <div className="wood-texture" />

        <div className="books-grid">
          {categoryBooks.map((book, index) => (
            <div
              key={book.id}
              ref={(el) => {
                if (el) bookRefs.current.set(book.id, el);
              }}
              className={`book-card-container ${
                highlightedBookId === book.id ? 'highlighted' : ''
              } ${dragState.targetBookId === book.id ? 'drop-target' : ''} ${
                isSwapping(book.id) ? 'swapping' : ''
              }`}
              style={getSwapStyle(book.id)}
              onClick={() => !dragState.isDragging && onBookClick(book)}
              onMouseDown={(e) => handleDragStart(e, book)}
              onTouchStart={(e) => handleDragStart(e, book)}
            >
              <div
                className="book-card"
                style={{
                  background: `linear-gradient(135deg, ${book.coverColor}, ${adjustColor(book.coverColor, -30)})`,
                }}
              >
                <div className="book-spine" />
                <div className="book-cover">
                  <div className="book-title-on-cover">{book.title}</div>
                  <div className="book-author-on-cover">{book.author}</div>
                </div>
                <div className="book-hover-info">
                  <h3 className="book-title">{book.title}</h3>
                  <p className="book-author">{book.author}</p>
                  {book.status === 'read' && <span className="book-status-badge read">已读</span>}
                  {book.status === 'unread' && <span className="book-status-badge unread">想读</span>}
                  {book.rating > 0 && (
                    <div className="book-rating-small">
                      {'⭐'.repeat(book.rating)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {categoryBooks.length === 0 && (
          <div className="empty-shelf">
            <span className="empty-icon">📭</span>
            <p>这个分类还没有书</p>
          </div>
        )}
      </div>

      {dragState.isDragging && dragState.draggedBook && (
        <div
          className="dragged-book"
          style={{
            left: dragState.currentX - 60,
            top: dragState.currentY - 80,
            background: `linear-gradient(135deg, ${dragState.draggedBook.coverColor}, ${adjustColor(dragState.draggedBook.coverColor, -30)})`,
          }}
        >
          <div className="book-title-on-cover">{dragState.draggedBook.title}</div>
          <div className="book-author-on-cover">{dragState.draggedBook.author}</div>
        </div>
      )}

      {flashCategoryId && (
        <style>{`
          .category-item[data-category-id="${flashCategoryId}"] {
            animation: flash 0.5s ease-in-out;
          }
        `}</style>
      )}
    </div>
  );
}

function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export default BookShelf;
