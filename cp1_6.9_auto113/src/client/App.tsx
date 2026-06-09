import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import ActivityWall from './components/ActivityWall';
import BookShelf from './components/BookShelf';
import BookDetail from './components/BookDetail';
import BorrowRequestsModal from './components/BorrowRequestsModal';
import AddBookModal from './components/AddBookModal';
import { useAuth } from './AuthContext';
import { useSocket, useSocketEvent } from './SocketContext';
import { api } from './api';
import { Book } from '../shared/types';
import { ShelfUpdateEvent, ShelfRemoveEvent, ShelfRemoveBorrowedEvent, ShelfReorderEvent, BorrowResponseEvent } from './api';

export default function App() {
  const { user } = useAuth();
  const { notifications, dismissNotification, addNotification } = useSocket();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [requestsModalOpen, setRequestsModalOpen] = useState(false);
  const [addBookModalOpen, setAddBookModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<string>('explore');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const [ownedBooks, setOwnedBooks] = useState<Book[]>([]);
  const [borrowedBooks, setBorrowedBooks] = useState<Book[]>([]);
  const [publicBooks, setPublicBooks] = useState<Book[]>([]);
  const [users, setUsers] = useState<Record<number, { nickname: string; avatarColor: string }>>({});

  const fetchUsers = useCallback(async () => {
    try {
      const list = await api.getUsers();
      const map: Record<number, { nickname: string; avatarColor: string }> = {};
      list.forEach(u => { map[u.id] = { nickname: u.nickname, avatarColor: u.avatarColor }; });
      setUsers(map);
    } catch {}
  }, []);

  const fetchMyBooks = useCallback(async () => {
    try {
      const data = await api.getMyBooks();
      setOwnedBooks(data.owned);
      setBorrowedBooks(data.borrowed);
    } catch {}
  }, []);

  const fetchPublicBooks = useCallback(async () => {
    try {
      const books = await api.getPublicBooks();
      setPublicBooks(books);
    } catch {}
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchPublicBooks();
  }, [fetchUsers, fetchPublicBooks]);

  useEffect(() => {
    if (user) {
      fetchMyBooks();
    } else {
      setOwnedBooks([]);
      setBorrowedBooks([]);
    }
  }, [user, fetchMyBooks]);

  useSocketEvent('shelf:update', (e: any) => {
    const evt = e as ShelfUpdateEvent;
    if (user && evt.userId === user.id && !evt.asBorrower) {
      setOwnedBooks(prev => {
        const idx = prev.findIndex(b => b.id === evt.book.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = evt.book;
          return copy;
        }
        return [...prev, evt.book];
      });
    }
    if (user && evt.userId === user.id && evt.asBorrower) {
      setBorrowedBooks(prev => {
        if (prev.find(b => b.id === evt.book.id)) return prev;
        return [...prev, evt.book];
      });
    }
    if (user && evt.book.borrowerId === user.id) {
      setBorrowedBooks(prev => {
        const idx = prev.findIndex(b => b.id === evt.book.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = evt.book;
          return copy;
        }
        return prev;
      });
    }
    setPublicBooks(prev => {
      const idx = prev.findIndex(b => b.id === evt.book.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = evt.book;
        return copy;
      }
      return [evt.book, ...prev];
    });
    fetchUsers();
  });

  useSocketEvent('shelf:remove', (e: any) => {
    const evt = e as ShelfRemoveEvent;
    if (user && evt.userId === user.id) {
      setOwnedBooks(prev => prev.filter(b => b.id !== evt.bookId));
    }
    setPublicBooks(prev => prev.filter(b => b.id !== evt.bookId));
  });

  useSocketEvent('shelf:removeBorrowed', (e: any) => {
    const evt = e as ShelfRemoveBorrowedEvent;
    if (user && evt.userId === user.id) {
      setBorrowedBooks(prev => prev.filter(b => b.id !== evt.bookId));
    }
  });

  useSocketEvent('shelf:reorder', (e: any) => {
    const evt = e as ShelfReorderEvent;
    if (user && evt.userId === user.id) {
      setOwnedBooks(prev => {
        const map = new Map(prev.map(b => [b.id, b]));
        return evt.order.map(id => map.get(id)!).filter(Boolean);
      });
    }
  });

  useSocketEvent('borrow:response', (e: any) => {
    const evt = e as BorrowResponseEvent;
    if (evt.request.status === 'approved' && evt.book) {
      fetchMyBooks();
    }
  });

  const handleReorder = async (newBooks: Book[]) => {
    setOwnedBooks(newBooks);
    try {
      await api.reorderBooks(newBooks.map(b => b.id));
    } catch (err: any) {
      addNotification(err.message);
      fetchMyBooks();
    }
  };

  const handleBookAdded = (book: Book) => {
    setOwnedBooks(prev => [...prev, book]);
    setPublicBooks(prev => [book, ...prev]);
  };

  const handleBookUpdated = () => {
    fetchMyBooks();
    fetchPublicBooks();
  };

  return (
    <div className="app">
      <Navbar
        onAuthClick={() => setAuthModalOpen(true)}
        onRequestsClick={() => {
          if (!user) {
            setAuthModalOpen(true);
            return;
          }
          setRequestsModalOpen(true);
        }}
        currentView={currentView}
        onViewChange={setCurrentView}
      />

      <main className="main-content">
        <div className="content-grid">
          <section className="main-section">
            {!user ? (
              <div className="welcome-panel">
                <h1>📚 读者书架漂流社区</h1>
                <p className="welcome-desc">
                  在虚拟书架上放置你的书，与其他读者相互借阅，记录阅读轨迹，
                  让每一本书开启属于自己的漂流之旅。
                </p>
                <button className="btn-primary btn-large" onClick={() => setAuthModalOpen(true)}>
                  立即加入漂流
                </button>
              </div>
            ) : currentView === 'explore' ? (
              <div>
                <div className="section-header">
                  <h2 className="section-title">🌐 发现漂流书架</h2>
                </div>
                <BookShelf
                  books={publicBooks.filter(b => b.ownerId !== user.id)}
                  isOwner={false}
                  onBookClick={setSelectedBook}
                  users={users}
                />
              </div>
            ) : currentView === 'my-shelf' ? (
              <div>
                <div className="section-header">
                  <h2 className="section-title">📖 我的书架</h2>
                  <button className="btn-primary" onClick={() => setAddBookModalOpen(true)}>
                    + 添加书籍
                  </button>
                </div>
                <p className="section-hint">提示：拖拽书籍可以调整顺序</p>
                <BookShelf
                  books={ownedBooks}
                  isOwner={true}
                  onBookClick={setSelectedBook}
                  onReorder={handleReorder}
                  users={users}
                />
              </div>
            ) : currentView === 'borrowed' ? (
              <div>
                <div className="section-header">
                  <h2 className="section-title">📘 我在阅读</h2>
                </div>
                <BookShelf
                  books={borrowedBooks}
                  isOwner={false}
                  isBorrowed={true}
                  onBookClick={setSelectedBook}
                  users={users}
                />
              </div>
            ) : null}
          </section>

          <aside className="sidebar">
            <ActivityWall />
          </aside>
        </div>
      </main>

      <div className="notifications">
        {notifications.map(n => (
          <div key={n.id} className="notification" onClick={() => dismissNotification(n.id)}>
            {n.message}
          </div>
        ))}
      </div>

      {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}
      {requestsModalOpen && <BorrowRequestsModal onClose={() => setRequestsModalOpen(false)} />}
      {addBookModalOpen && (
        <AddBookModal
          onClose={() => setAddBookModalOpen(false)}
          onAdded={handleBookAdded}
          addNotification={addNotification}
        />
      )}
      {selectedBook && (
        <BookDetail
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onUpdate={handleBookUpdated}
          users={users}
        />
      )}
    </div>
  );
}
