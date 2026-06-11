import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useTheme } from './context/ThemeContext';
import BookShop from './BookShop';
import RepairWorkshop from './RepairWorkshop';
import Collection from './Collection';
import { useState } from 'react';
import type { Book } from './types';

export default function App() {
  const location = useLocation();
  const { mode, toggleMode } = useTheme();
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  return (
    <div className="app-container">
      <nav className="nav-bar">
        <div className="nav-title">藏经阁 · 古籍修复坊</div>
        <div className="nav-links">
          <Link 
            to="/" 
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            📚 书坊
          </Link>
          <Link 
            to="/collection" 
            className={`nav-link ${location.pathname === '/collection' ? 'active' : ''}`}
          >
            🏛️ 收藏架
          </Link>
          <button 
            className="theme-toggle" 
            onClick={toggleMode}
            title={mode === 'day' ? '切换至夜读模式' : '切换至昼读模式'}
          >
            {mode === 'day' ? '🌙' : '☀️'}
          </button>
        </div>
      </nav>

      <Routes>
        <Route 
          path="/" 
          element={
            <BookShop 
              onSelectBook={(book) => setSelectedBook(book)} 
            />
          } 
        />
        <Route 
          path="/repair/:bookId" 
          element={
            <RepairWorkshop 
              book={selectedBook}
              onBack={() => setSelectedBook(null)}
            />
          } 
        />
        <Route 
          path="/collection" 
          element={
            <Collection 
              onViewBook={(book) => setSelectedBook(book)}
            />
          } 
        />
      </Routes>
    </div>
  );
}
