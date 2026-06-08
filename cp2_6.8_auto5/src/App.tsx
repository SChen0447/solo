import { useState, useEffect, useCallback } from 'react';
import BookList from './BookList';
import BookDetail from './BookDetail';
import StatsDashboard from './StatsDashboard';
import { Book, Stats, ViewType } from './types';
import { api } from './api';
import './App.css';

export default function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('list');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [navTab, setNavTab] = useState<'books' | 'stats'>('books');

  const loadBooks = useCallback(async () => {
    try {
      const data = await api.getBooks();
      setBooks(data);
    } catch (error) {
      console.error('加载书籍失败:', error);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await loadBooks();
      await loadStats();
      setLoading(false);
    };
    init();
  }, [loadBooks, loadStats]);

  const handleSelectBook = (book: Book) => {
    setSelectedBook(book);
    setCurrentView('detail');
  };

  const handleBackToList = () => {
    setSelectedBook(null);
    setCurrentView('list');
    loadBooks();
    loadStats();
  };

  const handleAddBook = async (title: string, author: string, totalChapters: number) => {
    try {
      const newBook = await api.addBook(title, author, totalChapters);
      setBooks([...books, newBook]);
      loadStats();
    } catch (error) {
      console.error('添加书籍失败:', error);
    }
  };

  const handleUpdateProgress = async (bookId: string, chapter: number) => {
    try {
      const updatedBook = await api.updateProgress(bookId, chapter);
      setBooks(books.map(b => b.id === bookId ? updatedBook : b));
      if (selectedBook?.id === bookId) {
        setSelectedBook(updatedBook);
      }
      loadStats();
    } catch (error) {
      console.error('更新进度失败:', error);
    }
  };

  const handleAddBookmark = async (bookId: string, chapter: number, note: string, tags: string[]) => {
    try {
      await api.addBookmark(bookId, chapter, note, tags);
      const updatedBooks = await api.getBooks();
      setBooks(updatedBooks);
      const updatedBook = updatedBooks.find(b => b.id === bookId);
      if (updatedBook && selectedBook?.id === bookId) {
        setSelectedBook(updatedBook);
      }
      loadStats();
    } catch (error) {
      console.error('添加书签失败:', error);
    }
  };

  const handleDeleteBookmark = async (bookId: string, bookmarkId: string) => {
    try {
      await api.deleteBookmark(bookId, bookmarkId);
      const updatedBooks = await api.getBooks();
      setBooks(updatedBooks);
      const updatedBook = updatedBooks.find(b => b.id === bookId);
      if (updatedBook && selectedBook?.id === bookId) {
        setSelectedBook(updatedBook);
      }
      loadStats();
    } catch (error) {
      console.error('删除书签失败:', error);
    }
  };

  const handleNavChange = (tab: 'books' | 'stats') => {
    setNavTab(tab);
    if (tab === 'stats') {
      setCurrentView('stats');
      loadStats();
    } else {
      setCurrentView('list');
      setSelectedBook(null);
    }
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand">📖 阅读追踪</div>
        <div className="nav-tabs">
          <button
            className={`nav-tab ${navTab === 'books' ? 'active' : ''}`}
            onClick={() => handleNavChange('books')}
          >
            书架
          </button>
          <button
            className={`nav-tab ${navTab === 'stats' ? 'active' : ''}`}
            onClick={() => handleNavChange('stats')}
          >
            统计
          </button>
        </div>
      </nav>

      <main className="main-content">
        {currentView === 'list' && (
          <BookList
            books={books}
            onSelectBook={handleSelectBook}
            onAddBook={handleAddBook}
          />
        )}

        {currentView === 'detail' && selectedBook && (
          <BookDetail
            book={selectedBook}
            onBack={handleBackToList}
            onUpdateProgress={handleUpdateProgress}
            onAddBookmark={handleAddBookmark}
            onDeleteBookmark={handleDeleteBookmark}
          />
        )}

        {currentView === 'stats' && (
          <StatsDashboard
            stats={stats}
            onBack={() => handleNavChange('books')}
          />
        )}
      </main>
    </div>
  );
}
