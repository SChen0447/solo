import { useState, useRef, useEffect } from 'react';
import type { Book } from '../App';

interface BookDetailProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Book>) => void;
  onSave: () => void;
}

function BookDetail({ book, isOpen, onClose, onUpdate, onSave }: BookDetailProps) {
  const [notes, setNotes] = useState(book.notes);
  const [status, setStatus] = useState<'read' | 'unread'>(book.status);
  const [rating, setRating] = useState(book.rating);
  const [isSaving, setIsSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [ratingAnimation, setRatingAnimation] = useState(false);
  const [statusRotation, setStatusRotation] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNotes(book.notes);
    setStatus(book.status);
    setRating(book.rating);
  }, [book.id, book.notes, book.status, book.rating]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleStatusToggle = () => {
    const newStatus = status === 'read' ? 'unread' : 'read';
    setStatusRotation(true);
    setStatus(newStatus);
    onUpdate(book.id, { status: newStatus });
    setTimeout(() => setStatusRotation(false), 600);
  };

  const handleRatingClick = (star: number) => {
    const newRating = rating === star ? star - 1 : star;
    setRating(newRating);
    setRatingAnimation(true);
    onUpdate(book.id, { rating: newRating });
    setTimeout(() => setRatingAnimation(false), 500);
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      onUpdate(book.id, { notes, status, rating });
      setIsSaving(false);
      setIsClosing(true);
      setTimeout(() => {
        onSave();
        setIsClosing(false);
      }, 300);
    }, 300);
  };

  const handleFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleNotesChange = () => {
    if (editorRef.current) {
      setNotes(editorRef.current.innerHTML);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsClosing(true);
      setTimeout(() => {
        onClose();
        setIsClosing(false);
      }, 300);
    }
  };

  return (
    <div
      className={`modal-overlay ${isOpen ? 'fade-in' : 'fade-out'} ${isClosing ? 'fade-out' : ''}`}
      onClick={handleOverlayClick}
    >
      <div
        className={`book-detail-modal ${isOpen ? 'slide-up' : 'slide-down'} ${isClosing ? 'slide-down' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <button className="close-btn" onClick={() => { setIsClosing(true); setTimeout(() => { onClose(); setIsClosing(false); }, 300); }}>
            ✕
          </button>
        </div>

        <div className="book-detail-content">
          <div
            className="book-detail-cover"
            style={{
              background: `linear-gradient(135deg, ${book.coverColor}, ${adjustColor(book.coverColor, -40)})`,
            }}
          >
            <h2 className="book-detail-title">{book.title}</h2>
            <p className="book-detail-author">{book.author}</p>
          </div>

          <div className="book-detail-info">
            <div className="detail-row status-row">
              <span className="detail-label">阅读状态</span>
              <button
                className={`status-toggle-btn ${status} ${statusRotation ? 'rotating' : ''}`}
                onClick={handleStatusToggle}
              >
                <span className="status-icon">
                  {status === 'read' ? '✅' : '📖'}
                </span>
                <span className="status-text">
                  {status === 'read' ? '已读' : '想读'}
                </span>
              </button>
            </div>

            <div className="detail-row rating-row">
              <span className="detail-label">我的评分</span>
              <div className={`star-rating ${ratingAnimation ? 'bounce' : ''}`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className={`star-btn ${star <= rating ? 'filled' : 'empty'}`}
                    onClick={() => handleRatingClick(star)}
                  >
                    <span className="star-icon">
                      {star <= rating ? '★' : '☆'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="detail-row notes-row">
              <span className="detail-label">阅读笔记</span>
              <div className="rich-text-editor">
                <div className="editor-toolbar">
                  <button
                    className="toolbar-btn"
                    onClick={() => handleFormat('bold')}
                    title="加粗"
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    className="toolbar-btn"
                    onClick={() => handleFormat('italic')}
                    title="斜体"
                  >
                    <em>I</em>
                  </button>
                  <button
                    className="toolbar-btn"
                    onClick={() => handleFormat('insertUnorderedList')}
                    title="无序列表"
                  >
                    • 列表
                  </button>
                  <button
                    className="toolbar-btn"
                    onClick={() => handleFormat('insertOrderedList')}
                    title="有序列表"
                  >
                    1. 列表
                  </button>
                </div>
                <div
                  ref={editorRef}
                  className="editor-content"
                  contentEditable
                  onInput={handleNotesChange}
                  dangerouslySetInnerHTML={{ __html: notes }}
                  placeholder="写下你的阅读感想..."
                />
              </div>
            </div>

            <button
              className={`save-btn ${isSaving ? 'saving' : ''} ${isClosing ? 'shrink' : ''}`}
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? '保存中...' : '保存笔记'}
            </button>
          </div>
        </div>
      </div>
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

export default BookDetail;
