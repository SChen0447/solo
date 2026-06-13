import { useState, useEffect, useCallback } from 'react';
import type { Book } from '../types';
import ExchangeDialog from './ExchangeDialog';
import './BookModal.css';

interface BookModalProps {
  book: Book;
  onClose: () => void;
  onExchange?: (book: Book, fromBookId: string) => void;
}

function BookModal({ book, onClose, onExchange }: BookModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showExchangeDialog, setShowExchangeDialog] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showExchangeDialog) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, showExchangeDialog]);

  const handleExchange = (fromBookId: string) => {
    if (onExchange) {
      onExchange(book, fromBookId);
    }
    setShowExchangeDialog(false);
    handleClose();
  };

  return (
    <>
      <div
        className={`modal-overlay ${isVisible ? 'visible' : ''} ${isClosing ? 'closing' : ''}`}
        onClick={handleClose}
      />
      <div className={`modal-wrapper ${isVisible ? 'visible' : ''} ${isClosing ? 'closing' : ''}`}>
        <div className="modal-content paper-texture">
          <button className="modal-close" onClick={handleClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <div className="modal-body">
            <div className="modal-cover">
              {!imageLoaded && <div className="cover-skeleton-large" />}
              <img
                src={book.coverUrl}
                alt={book.title}
                className={`large-cover ${imageLoaded ? 'loaded' : ''}`}
                onLoad={() => setImageLoaded(true)}
              />
            </div>

            <div className="modal-details">
              <h2 className="modal-title">{book.title}</h2>
              <p className="modal-meta">
                <span className="meta-label">作者：</span>
                <span className="meta-value">{book.author}</span>
              </p>
              <p className="modal-meta">
                <span className="meta-label">出版年份：</span>
                <span className="meta-value">{book.year}年</span>
              </p>
              <p className="modal-meta">
                <span className="meta-label">状态：</span>
                <span className={`status-tag-large ${book.status}`}>
                  {book.status === 'available' ? '可交换' : '已交换'}
                </span>
              </p>

              <div className="modal-description">
                <h3 className="section-title">书籍简介</h3>
                <p className="description-text">{book.description}</p>
              </div>

              <div className="modal-owner">
                <h3 className="section-title">书籍所有者</h3>
                <div className="owner-info">
                  <img src={book.ownerAvatar} alt={book.ownerName} className="owner-avatar" />
                  <span className="owner-name">{book.ownerName}</span>
                </div>
              </div>

              {book.status === 'available' && onExchange && (
                <button
                  className="btn btn-primary btn-bounce exchange-btn"
                  onClick={() => setShowExchangeDialog(true)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  申请交换
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showExchangeDialog && (
        <ExchangeDialog
          targetBook={book}
          onClose={() => setShowExchangeDialog(false)}
          onConfirm={handleExchange}
        />
      )}
    </>
  );
}

export default BookModal;
