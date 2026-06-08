import { useState } from 'react';
import { Book } from './types';

interface BookListProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  onAddBook: (title: string, author: string, totalChapters: number) => void;
}

export default function BookList({ books, onSelectBook, onAddBook }: BookListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [totalChapters, setTotalChapters] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title && author && totalChapters) {
      onAddBook(title, author, parseInt(totalChapters));
      setTitle('');
      setAuthor('');
      setTotalChapters('');
      setShowAddForm(false);
    }
  };

  const getProgressPercent = (book: Book) => {
    return Math.round((book.currentChapter / book.totalChapters) * 100);
  };

  return (
    <div className="book-list-container">
      <div className="page-header">
        <h1>我的书架</h1>
        <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? '取消' : '+ 添加书籍'}
        </button>
      </div>

      {showAddForm && (
        <div className="add-book-form fade-in">
          <h3>添加新书</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>书名</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请输入书名"
                required
              />
            </div>
            <div className="form-group">
              <label>作者</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="请输入作者"
                required
              />
            </div>
            <div className="form-group">
              <label>总章节数</label>
              <input
                type="number"
                value={totalChapters}
                onChange={(e) => setTotalChapters(e.target.value)}
                placeholder="请输入总章节数"
                min="1"
                required
              />
            </div>
            <button type="submit" className="btn-primary btn-full">
              添加
            </button>
          </form>
        </div>
      )}

      <div className="books-grid">
        {books.map((book) => (
          <div
            key={book.id}
            className="book-card fade-in"
            onClick={() => onSelectBook(book)}
          >
            <div
              className="book-cover"
              style={{ backgroundColor: book.coverColor }}
            >
              <span className="book-cover-text">
                {book.title.charAt(0)}
              </span>
            </div>
            <div className="book-info">
              <h3 className="book-title">{book.title}</h3>
              <p className="book-author">{book.author}</p>
              <div className="progress-container">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${getProgressPercent(book)}%` }}
                  />
                </div>
                <span className="progress-text">
                  {getProgressPercent(book)}%
                </span>
              </div>
              <p className="book-chapters">
                第 {book.currentChapter} / {book.totalChapters} 章
              </p>
            </div>
          </div>
        ))}
      </div>

      {books.length === 0 && (
        <div className="empty-state">
          <p>书架空空如也，点击上方按钮添加你的第一本书吧！</p>
        </div>
      )}
    </div>
  );
}
