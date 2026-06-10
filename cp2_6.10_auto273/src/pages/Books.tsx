import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, Reader, BorrowRecord } from '../types';
import './Books.css';

interface BooksProps {
  bookList: Book[];
  readerList: Reader[];
  borrowRecords: BorrowRecord[];
  refreshData: () => void;
}

const getStatusLabel = (status: Book['status']) => {
  switch (status) {
    case 'available':
      return '在库';
    case 'borrowed':
      return '已借出';
    case 'exchanged':
      return '已交换';
  }
};

export default function Books({ bookList, readerList, borrowRecords, refreshData }: BooksProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedReaderId, setSelectedReaderId] = useState('');
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    year: '',
    isbn: '',
    coverUrl: '',
    notes: '',
  });
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  const bookBorrowRecords = useMemo(() => {
    if (!selectedBook) return [];
    return borrowRecords.filter((r) => r.bookId === selectedBook.id)
      .sort((a, b) => new Date(b.borrowDate).getTime() - new Date(a.borrowDate).getTime());
  }, [selectedBook, borrowRecords]);

  const currentBorrowRecord = useMemo(() => {
    if (!selectedBook) return null;
    return borrowRecords.find((r) => r.bookId === selectedBook.id && r.status === 'borrowed');
  }, [selectedBook, borrowRecords]);

  const handleAddBook = async () => {
    if (!newBook.title.trim() || !newBook.author.trim()) {
      alert('请填写书名和作者');
      return;
    }
    await fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBook),
    });
    setNewBook({ title: '', author: '', year: '', isbn: '', coverUrl: '', notes: '' });
    setShowAddModal(false);
    refreshData();
  };

  const handleEditBook = async () => {
    if (!editingBook) return;
    await fetch(`/api/books/${editingBook.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingBook),
    });
    setEditingBook(null);
    refreshData();
  };

  const handleDeleteBook = async (id: string) => {
    if (!confirm('确定要删除这本书吗？')) return;
    await fetch(`/api/books/${id}`, { method: 'DELETE' });
    setSelectedBook(null);
    refreshData();
  };

  const handleBorrow = async () => {
    if (!selectedBook || !selectedReaderId) {
      alert('请选择读者');
      return;
    }
    await fetch('/api/borrow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookId: selectedBook.id,
        readerId: selectedReaderId,
      }),
    });
    setSelectedReaderId('');
    refreshData();
  };

  const handleReturn = async () => {
    if (!currentBorrowRecord) return;
    await fetch(`/api/borrow/${currentBorrowRecord.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    refreshData();
  };

  return (
    <div className="books-page">
      <h1 className="page-title">书籍管理</h1>

      {bookList.length === 0 ? (
        <div className="empty-state">还没有书籍，点击右下角按钮添加</div>
      ) : (
        <div className="books-grid">
          {bookList.map((book) => (
            <motion.div
              key={book.id}
              className="book-card"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
              whileTap={{ scale: 1.02 }}
              onClick={() => setSelectedBook(book)}
            >
              {book.coverUrl ? (
                <img src={book.coverUrl} alt={book.title} className="book-cover" />
              ) : (
                <div className="book-cover-placeholder">
                  <span className="book-cover-icon">📖</span>
                </div>
              )}
              <div className="book-info">
                <h3 className="book-title">{book.title}</h3>
                <p className="book-author">{book.author}</p>
                <span className={`status-tag ${book.status}`}>{getStatusLabel(book.status)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <motion.button
        className="add-book-btn"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowAddModal(true)}
      >
        <span className="add-icon">+</span>
      </motion.button>

      <AnimatePresence>
        {showAddModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="modal-title">添加书籍</h2>
              <div className="form-group">
                <label>书名 *</label>
                <input
                  type="text"
                  value={newBook.title}
                  onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                  placeholder="请输入书名"
                />
              </div>
              <div className="form-group">
                <label>作者 *</label>
                <input
                  type="text"
                  value={newBook.author}
                  onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                  placeholder="请输入作者"
                />
              </div>
              <div className="form-group">
                <label>出版年份</label>
                <input
                  type="text"
                  value={newBook.year}
                  onChange={(e) => setNewBook({ ...newBook, year: e.target.value })}
                  placeholder="如：2020"
                />
              </div>
              <div className="form-group">
                <label>ISBN</label>
                <input
                  type="text"
                  value={newBook.isbn}
                  onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
                  placeholder="可选"
                />
              </div>
              <div className="form-group">
                <label>封面URL</label>
                <input
                  type="text"
                  value={newBook.coverUrl}
                  onChange={(e) => setNewBook({ ...newBook, coverUrl: e.target.value })}
                  placeholder="可选"
                />
              </div>
              <div className="form-group">
                <label>笔记</label>
                <textarea
                  value={newBook.notes}
                  onChange={(e) => setNewBook({ ...newBook, notes: e.target.value })}
                  placeholder="如：书脊微损，内页干净"
                />
              </div>
              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  取消
                </button>
                <button className="btn" onClick={handleAddBook}>
                  添加
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingBook && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditingBook(null)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="modal-title">编辑书籍</h2>
              <div className="form-group">
                <label>书名</label>
                <input
                  type="text"
                  value={editingBook.title}
                  onChange={(e) => setEditingBook({ ...editingBook, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>作者</label>
                <input
                  type="text"
                  value={editingBook.author}
                  onChange={(e) => setEditingBook({ ...editingBook, author: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>出版年份</label>
                <input
                  type="text"
                  value={editingBook.year}
                  onChange={(e) => setEditingBook({ ...editingBook, year: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>状态</label>
                <select
                  value={editingBook.status}
                  onChange={(e) =>
                    setEditingBook({ ...editingBook, status: e.target.value as Book['status'] })
                  }
                >
                  <option value="available">在库</option>
                  <option value="borrowed">已借出</option>
                  <option value="exchanged">已交换</option>
                </select>
              </div>
              <div className="form-group">
                <label>ISBN</label>
                <input
                  type="text"
                  value={editingBook.isbn}
                  onChange={(e) => setEditingBook({ ...editingBook, isbn: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>封面URL</label>
                <input
                  type="text"
                  value={editingBook.coverUrl}
                  onChange={(e) => setEditingBook({ ...editingBook, coverUrl: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>笔记</label>
                <textarea
                  value={editingBook.notes}
                  onChange={(e) => setEditingBook({ ...editingBook, notes: e.target.value })}
                />
              </div>
              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setEditingBook(null)}>
                  取消
                </button>
                <button className="btn" onClick={handleEditBook}>
                  保存
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedBook && (
          <>
            <motion.div
              className="detail-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBook(null)}
            />
            <motion.div
              className="detail-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <button className="close-detail" onClick={() => setSelectedBook(null)}>
                ×
              </button>
              <div className="detail-content">
                {selectedBook.coverUrl ? (
                  <img src={selectedBook.coverUrl} alt={selectedBook.title} className="detail-cover" />
                ) : (
                  <div className="detail-cover-placeholder">
                    <span className="detail-cover-icon">📖</span>
                  </div>
                )}
                <h2 className="detail-title">{selectedBook.title}</h2>
                <p className="detail-author">作者：{selectedBook.author}</p>
                <div className="detail-status-row">
                  <span className={`status-tag ${selectedBook.status}`}>
                    {getStatusLabel(selectedBook.status)}
                  </span>
                </div>
                <div className="detail-info">
                  <div className="info-item">
                    <span className="info-label">出版年份：</span>
                    <span className="info-value">{selectedBook.year || '-'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">ISBN：</span>
                    <span className="info-value">{selectedBook.isbn || '-'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">入库时间：</span>
                    <span className="info-value">{selectedBook.createdAt}</span>
                  </div>
                  {selectedBook.notes && (
                    <div className="info-item notes">
                      <span className="info-label">备注：</span>
                      <span className="info-value">{selectedBook.notes}</span>
                    </div>
                  )}
                </div>

                {currentBorrowRecord && (
                  <div className="current-borrow">
                    <h3 className="detail-subtitle">当前借阅</h3>
                    <div className="borrow-info">
                      <p>借阅人：{currentBorrowRecord.readerName}</p>
                      <p>借出日期：{currentBorrowRecord.borrowDate}</p>
                      <p>预计归还：{currentBorrowRecord.expectedReturnDate}</p>
                      {currentBorrowRecord.overdueDays && currentBorrowRecord.overdueDays > 0 && (
                        <p className="overdue-text">已逾期 {currentBorrowRecord.overdueDays} 天</p>
                      )}
                    </div>
                    <button className="btn btn-success" onClick={handleReturn}>
                      归还
                    </button>
                  </div>
                )}

                {selectedBook.status === 'available' && (
                  <div className="borrow-section">
                    <h3 className="detail-subtitle">借出书籍</h3>
                    <div className="form-group">
                      <label>选择读者</label>
                      <select
                        value={selectedReaderId}
                        onChange={(e) => setSelectedReaderId(e.target.value)}
                      >
                        <option value="">请选择读者</option>
                        {readerList.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}（信用：{r.credit}）
                          </option>
                        ))}
                      </select>
                    </div>
                    <button className="btn btn-warning" onClick={handleBorrow}>
                      借出
                    </button>
                  </div>
                )}

                <h3 className="detail-subtitle">借阅历史</h3>
                {bookBorrowRecords.length === 0 ? (
                  <p className="no-history">暂无借阅记录</p>
                ) : (
                  <div className="borrow-history">
                    {bookBorrowRecords.map((record) => (
                      <div key={record.id} className="history-item">
                        <div className="history-info">
                          <p className="history-reader">{record.readerName}</p>
                          <p className="history-dates">
                            借出：{record.borrowDate}
                            {record.returnDate && ` / 归还：${record.returnDate}`}
                          </p>
                        </div>
                        <span
                          className={`status-tag ${
                            record.status === 'borrowed' ? 'borrowed' : 'available'
                          }`}
                        >
                          {record.status === 'borrowed'
                            ? record.overdueDays && record.overdueDays > 0
                              ? '已逾期'
                              : '进行中'
                            : '已完成'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="detail-actions">
                  <button className="btn btn-secondary" onClick={() => setEditingBook(selectedBook)}>
                    编辑
                  </button>
                  <button
                    className="btn"
                    style={{ backgroundColor: '#e74c3c' }}
                    onClick={() => handleDeleteBook(selectedBook.id)}
                  >
                    删除
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
