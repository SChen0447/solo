import React, { useRef, useCallback } from 'react';
import { Book } from '../../shared/types';

interface BookShelfProps {
  books: Book[];
  isOwner: boolean;
  isBorrowed?: boolean;
  onBookClick: (book: Book) => void;
  onReorder?: (newOrder: Book[]) => void;
  users?: Record<number, { nickname: string; avatarColor: string }>;
}

export default function BookShelf({ books, isOwner, isBorrowed, onBookClick, onReorder, users }: BookShelfProps) {
  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => {
    if (!isOwner || !onReorder) return;
    dragIndex.current = idx;
    e.dataTransfer.effectAllowed = 'move';
    (e.currentTarget as HTMLElement).style.opacity = '0.5';
  }, [isOwner, onReorder]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
    dragIndex.current = null;
    dragOverIndex.current = null;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (!isOwner || !onReorder) return;
    dragOverIndex.current = idx;
  }, [isOwner, onReorder]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!isOwner || !onReorder || dragIndex.current === null || dragOverIndex.current === null) return;
    const from = dragIndex.current;
    const to = dragOverIndex.current;
    if (from === to) return;
    const newBooks = [...books];
    const [moved] = newBooks.splice(from, 1);
    newBooks.splice(to, 0, moved);
    onReorder(newBooks);
    dragIndex.current = null;
    dragOverIndex.current = null;
  }, [books, isOwner, onReorder]);

  if (books.length === 0) {
    return (
      <div className="empty-shelf">
        <p>
          {isOwner ? '书架还是空的，点击"添加书籍"开始漂流吧' : '这位读者还没有公开的书籍'}
        </p>
      </div>
    );
  }

  return (
    <div className="bookshelf-grid">
      {books.map((book, idx) => {
        const borrower = book.borrowerId ? users?.[book.borrowerId] : null;
        return (
          <div
            key={book.id}
            className="book-card-container"
            draggable={isOwner && !isBorrowed}
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={handleDrop}
            onClick={() => onBookClick(book)}
          >
            <div className="book-card">
              <img
                src={book.coverUrl}
                alt={book.title}
                className="book-cover"
                loading="lazy"
              />
              <div className={`book-status-tag ${book.status}`}>
                {isBorrowed ? '已借阅' : book.status === 'available' ? '可借阅' : '已借出'}
              </div>
              {book.status === 'borrowed' && !isBorrowed && borrower && (
                <div className="book-borrower">
                  <span
                    className="borrower-dot"
                    style={{ background: borrower.avatarColor }}
                  />
                  借阅者: {borrower.nickname}
                </div>
              )}
              {isBorrowed && (
                <div className="book-borrower borrowed-self">
                  我在阅读中
                </div>
              )}
              <div className="book-info">
                <h3 className="book-title" title={book.title}>
                  {book.title}
                </h3>
                <p className="book-author">{book.author}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
