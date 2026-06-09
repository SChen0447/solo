import React, { useState } from 'react';
import { api } from '../api';
import { Book } from '../../shared/types';

interface AddBookModalProps {
  onClose: () => void;
  onAdded: (book: Book) => void;
  addNotification: (msg: string) => void;
}

export default function AddBookModal({ onClose, onAdded, addNotification }: AddBookModalProps) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) return;
    setLoading(true);
    try {
      const book = await api.addBook(title.trim(), author.trim(), coverUrl.trim() || undefined);
      onAdded(book);
      addNotification('书籍已添加');
      onClose();
    } catch (err: any) {
      addNotification(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content add-book-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>添加书籍</h2>
        <form onSubmit={handleSubmit} className="add-book-form">
          <div className="form-group">
            <label>书名 *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="如：百年孤独"
              maxLength={100}
              required
            />
          </div>
          <div className="form-group">
            <label>作者 *</label>
            <input
              type="text"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder="如：加西亚·马尔克斯"
              maxLength={50}
              required
            />
          </div>
          <div className="form-group">
            <label>封面图片链接（可选）</label>
            <input
              type="url"
              value={coverUrl}
              onChange={e => setCoverUrl(e.target.value)}
              placeholder="https://..."
            />
            <small>留空将自动生成随机封面</small>
          </div>
          <button type="submit" className="btn-primary btn-block" disabled={loading}>
            {loading ? '添加中...' : '添加到书架'}
          </button>
        </form>
      </div>
    </div>
  );
}
