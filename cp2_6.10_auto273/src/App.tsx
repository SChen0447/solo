import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from './pages/Dashboard';
import Books from './pages/Books';
import Readers from './pages/Readers';
import { Book, Reader, BorrowRecord, ExchangeRequest } from './types';
import './App.css';

export default function App() {
  const [bookList, setBookList] = useState<Book[]>([]);
  const [readerList, setReaderList] = useState<Reader[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecord[]>([]);
  const [exchangeRequests, setExchangeRequests] = useState<ExchangeRequest[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [books, readers, borrow, exchanges] = await Promise.all([
        fetch('/api/books').then((r) => r.json()),
        fetch('/api/readers').then((r) => r.json()),
        fetch('/api/borrow').then((r) => r.json()),
        fetch('/api/exchanges').then((r) => r.json()),
      ]);
      setBookList(books);
      setReaderList(readers);
      setBorrowRecords(borrow);
      setExchangeRequests(exchanges);
    } catch (err) {
      console.error('加载数据失败:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetch('/api/borrow')
        .then((r) => r.json())
        .then(setBorrowRecords)
        .catch(console.error);
      fetch('/api/readers')
        .then((r) => r.json())
        .then(setReaderList)
        .catch(console.error);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="navbar-brand">书站小记</div>
        <div className="navbar-links-desktop">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            看板
          </NavLink>
          <NavLink to="/books" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            书籍
          </NavLink>
          <NavLink to="/readers" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            读者
          </NavLink>
        </div>
        <button className="hamburger-btn" onClick={() => setMenuOpen(!menuOpen)}>
          <span></span>
          <span></span>
          <span></span>
        </button>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <NavLink to="/" end onClick={() => setMenuOpen(false)} className={({ isActive }) => (isActive ? 'mobile-nav-link active' : 'mobile-nav-link')}>
              看板
            </NavLink>
            <NavLink to="/books" onClick={() => setMenuOpen(false)} className={({ isActive }) => (isActive ? 'mobile-nav-link active' : 'mobile-nav-link')}>
              书籍
            </NavLink>
            <NavLink to="/readers" onClick={() => setMenuOpen(false)} className={({ isActive }) => (isActive ? 'mobile-nav-link active' : 'mobile-nav-link')}>
              读者
            </NavLink>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="main-content">
        <Routes>
          <Route
            path="/"
            element={
              <Dashboard
                bookList={bookList}
                readerList={readerList}
                borrowRecords={borrowRecords}
                exchangeRequests={exchangeRequests}
              />
            }
          />
          <Route
            path="/books"
            element={
              <Books
                bookList={bookList}
                readerList={readerList}
                borrowRecords={borrowRecords}
                refreshData={fetchData}
              />
            }
          />
          <Route
            path="/readers"
            element={
              <Readers
                readerList={readerList}
                borrowRecords={borrowRecords}
                exchangeRequests={exchangeRequests}
                bookList={bookList}
                refreshData={fetchData}
              />
            }
          />
        </Routes>
      </main>
    </div>
  );
}
