import React, { useState, useEffect } from 'react';
import { Book, BorrowHistory } from '../../shared/types';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import { useSocket, useSocketEvent } from '../SocketContext';

interface BookDetailProps {
  book: Book;
  onClose: () => void;
  onUpdate?: (book: Book) => void;
  users?: Record<number, { nickname: string; avatarColor: string }>;
}

export default function BookDetail({ book: initialBook, onClose, onUpdate, users }: BookDetailProps) {
  const { user } = useAuth();
  const { addNotification } = useSocket();
  const [book, setBook] = useState<Book>(initialBook);
  const [history, setHistory] = useState<BorrowHistory[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const isOwner = user?.id === book.ownerId;
  const isBorrower = user?.id === book.borrowerId;
  const canBorrow = !isOwner && !isBorrower && book.status === 'available';

  useEffect(() => {
    let alive = true;
    api.getBook(book.id).then(data => {
      if (!alive) return;
      setBook(data.book);
      setHistory(data.history);
    }).catch(err => addNotification(err.message));
    return () => { alive = false; };
  }, [book.id, addNotification]);

  useSocketEvent('note:new', (e: any) => {
    if (e.history.bookId === book.id) {
      setHistory(prev => [e.history, ...prev]);
    }
  });

  useSocketEvent('shelf:update', (e: any) => {
    if (e.book && e.book.id === book.id) {
      setBook(e.book);
      onUpdate?.(e.book);
    }
  });

  const handleBorrow = async () => {
    if (!user) return;
    setRequesting(true);
    try {
      await api.requestBorrow(book.id);
      addNotification('借阅请求已发送');
    } catch (err: any) {
      addNotification(err.message);
    } finally {
      setRequesting(false);
    }
  };

  const handleReturn = async () => {
    setLoading(true);
    try {
      const updated = await api.returnBook(book.id);
      setBook(updated);
      onUpdate?.(updated);
      addNotification('已归还');
    } catch (err: any) {
      addNotification(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm('确定要从书架移除这本书吗？')) return;
    try {
      await api.removeBook(book.id);
      onUpdate?.(book);
      addNotification('已移除');
      onClose();
    } catch (err: any) {
      addNotification(err.message);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    setLoading(true);
    try {
      const h = await api.addNote(book.id, note.trim());
      setHistory(prev => [h, ...prev]);
      setNote('');
    } catch (err: any) {
      addNotification(err.message);
    } finally {
      setLoading(false);
    }
  };

  const owner = users?.[book.ownerId];
  const borrower = book.borrowerId ? users?.[book.borrowerId] : null;

  const actionLabel = (a: string) => {
    switch (a) {
      case 'borrowed': return '借阅';
      case 'returned': return '归还';
      case 'note_added': return '笔记';
      default: return a;
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content book-detail" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="book-detail-header">
          <img src={book.coverUrl} alt={book.title} className="detail-cover" />
          <div className="detail-meta">
            <h2>{book.title}</h2>
            <p className="detail-author">作者：{book.author}</p>
            <div className="detail-status">
              <span className={`status-badge ${book.status}`}>
                {book.status === 'available' ? '可借阅' : '已借出'}
              </span>
              {owner && (
                <span className="owner-info">
                  <span className="avatar-dot" style={{ background: owner.avatarColor }} />
                  所有者：{owner.nickname}
                </span>
              )}
              {borrower && (
                <span className="owner-info">
                  <span className="avatar-dot" style={{ background: borrower.avatarColor }} />
                  借阅者：{borrower.nickname}
                </span>
              )}
            </div>
            <div className="detail-actions">
              {canBorrow && (
                <button className="btn-primary" onClick={handleBorrow} disabled={requesting}>
                  {requesting ? '发送中...' : '申请借阅'}
                </button>
              )}
              {isBorrower && (
                <button className="btn-primary" onClick={handleReturn} disabled={loading}>
                  {loading ? '归还中...' : '归还书籍'}
                </button>
              )}
              {isOwner && book.status === 'available' && (
                <button className="btn-danger" onClick={handleRemove}>
                  从书架移除
                </button>
              )}
            </div>
          </div>
        </div>

        {isBorrower && (
          <form className="note-form" onSubmit={handleAddNote}>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="写下你的阅读笔记...（支持文字和表情）"
              rows={3}
              maxLength={500}
            />
            <div className="note-form-actions">
              <span className="note-count">{note.length}/500</span>
              <button type="submit" className="btn-primary" disabled={loading || !note.trim()}>
                {loading ? '提交中...' : '添加笔记'}
              </button>
            </div>
          </form>
        )}

        <div className="timeline">
          <h3>借阅与阅读轨迹</h3>
          {history.length === 0 ? (
            <p className="empty-timeline">暂无轨迹记录</p>
          ) : (
            <ul className="timeline-list">
              {history.map(h => {
                const u = users?.[h.borrowerId];
                return (
                  <li key={h.id} className="timeline-item">
                    <span className="timeline-dot" style={{ background: u?.avatarColor || '#999' }} />
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="timeline-user">
                          {u?.nickname || '未知用户'}
                        </span>
                        <span className={`timeline-action action-${h.action}`}>
                          {actionLabel(h.action)}
                        </span>
                        <span className="timeline-time">
                          {new Date(h.createdAt).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      {h.note && <p className="timeline-note">{h.note}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
