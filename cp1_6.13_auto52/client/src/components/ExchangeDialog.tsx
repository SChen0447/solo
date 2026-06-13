import { useState, useEffect, useCallback } from 'react';
import type { Book } from '../types';
import { bookApi } from '../services/api';
import './ExchangeDialog.css';

interface ExchangeDialogProps {
  targetBook: Book;
  onClose: () => void;
  onConfirm: (fromBookId: string) => void;
}

function ExchangeDialog({ targetBook, onClose, onConfirm }: ExchangeDialogProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [myBooks, setMyBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [loading, setLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const fetchMyBooks = async () => {
      try {
        const res = await bookApi.getBooks({ ownerId: 'user-001' });
        const availableBooks = res.data.filter(
          b => b.status === 'available' && b.id !== targetBook.id
        );
        setMyBooks(availableBooks);
      } catch (error) {
        console.error('获取我的书籍失败', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMyBooks();
    
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, [targetBook.id]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose]);

  const handleConfirm = () => {
    if (selectedBookId) {
      onConfirm(selectedBookId);
    }
  };

  return (
    <>
      <div
        className={`dialog-overlay ${isVisible ? 'visible' : ''} ${isClosing ? 'closing' : ''}`}
        onClick={handleClose}
      />
      <div className={`dialog-wrapper ${isVisible ? 'visible' : ''} ${isClosing ? 'closing' : ''}`}>
        <div className="dialog-content paper-texture">
          <h3 className="dialog-title">申请交换</h3>
          
          <div className="book-preview">
            <div className="target-book">
              <p className="preview-label">对方书籍</p>
              <div className="book-mini">
                <img src={targetBook.coverUrl} alt={targetBook.title} />
                <div className="book-mini-info">
                  <p className="book-mini-title">{targetBook.title}</p>
                  <p className="book-mini-author">{targetBook.author}</p>
                </div>
              </div>
            </div>
            
            <div className="exchange-arrow">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth="2">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            
            <div className="my-book">
              <p className="preview-label">我的书籍</p>
              {loading ? (
                <div className="select-skeleton" />
              ) : myBooks.length === 0 ? (
                <p className="no-books">请先发布一本可交换的书</p>
              ) : (
                <select
                  className="input book-select"
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                >
                  <option value="">请选择要交换的书籍</option>
                  {myBooks.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.title} - {book.author}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          
          <div className="dialog-actions">
            <button className="btn btn-outline" onClick={handleClose}>
              取消
            </button>
            <button
              className="btn btn-primary btn-bounce"
              onClick={handleConfirm}
              disabled={!selectedBookId || loading}
            >
              确认交换
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default ExchangeDialog;
