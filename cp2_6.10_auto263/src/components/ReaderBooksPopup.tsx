import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { readerApi } from '../utils/api';
import type { BorrowedBook } from '../types';

interface ReaderBooksPopupProps {
  isOpen: boolean;
  readerId: string;
  readerName: string;
  onClose: () => void;
}

const ReaderBooksPopup: React.FC<ReaderBooksPopupProps> = ({ isOpen, readerId, readerName, onClose }) => {
  const [books, setBooks] = useState<BorrowedBook[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && readerId) {
      setLoading(true);
      readerApi
        .getBorrowedBooks(readerId)
        .then((data) => {
          setBooks(data.borrowedBooks?.slice(0, 3) || []);
        })
        .catch(() => {
          setBooks([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, readerId]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="reader-books-popup"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <h3 className="reader-books-title">{readerName} 的最近借阅</h3>
            {loading ? (
              <div className="loading">加载中...</div>
            ) : books.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📚</div>
                <p>暂无借阅记录</p>
              </div>
            ) : (
              <div className="book-list">
                {books.map((book, idx) => (
                  <motion.div
                    key={book.id}
                    className="book-item"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.08 }}
                  >
                    <div className="book-cover" style={{ background: book.coverColor || '#d4a373' }}>
                      {book.title.slice(0, 2)}
                    </div>
                    <div className="book-info">
                      <div className="book-title">{book.title}</div>
                      <div className="book-author">{book.author}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            <div className="form-actions">
              <button className="btn btn-back" onClick={onClose}>
                关闭
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReaderBooksPopup;
