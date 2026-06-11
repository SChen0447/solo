import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Bookstore from './components/Bookstore';
import ReadingLog from './components/ReadingLog';
import ReadingView from './components/ReadingView';

export interface Book {
  id: string;
  title: string;
  type: '经' | '史' | '子' | '集';
  fragmentsRequired: number[];
  description: string;
  content: string;
  coverColor: string;
}

export interface Fragment {
  id: number;
  char: string;
}

export interface LogEntry {
  id: string;
  book: Book;
  timestamp: string;
  comment: string;
  notes?: string;
}

const App = () => {
  const [fragments, setFragments] = useState<Fragment[]>([
    { id: 1, char: '甲' },
    { id: 2, char: '乙' },
    { id: 3, char: '丙' },
    { id: 4, char: '丁' },
    { id: 5, char: '戊' },
    { id: 6, char: '己' },
    { id: 7, char: '庚' },
    { id: 8, char: '辛' },
    { id: 9, char: '壬' },
    { id: 10, char: '癸' },
    { id: 11, char: '子' },
    { id: 12, char: '丑' },
  ]);

  const [collection, setCollection] = useState<Book[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const res = await fetch('/api/books');
        const data = await res.json();
        setBooks(data);
      } catch (e) {
        console.error('加载古籍数据失败:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, []);

  const addLogEntry = (entry: LogEntry) => {
    setLogEntries(prev => [entry, ...prev]);
    if (entry.book) {
      setCollection(prev => [...prev, entry.book]);
      setFragments(prev => prev.filter(f => !entry.book.fragmentsRequired.includes(f.id)));
    }
  };

  const updateNote = (bookId: string, note: string) => {
    setLogEntries(prev => prev.map(entry =>
      entry.book.id === bookId ? { ...entry, notes: note } : entry
    ));
  };

  if (loading) {
    return (
      <div style={{
        width: '100vw', height: '100vh',
        background: '#f4e4c1',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '"KaiTi", "STKaiti", "楷体", serif',
        fontSize: '32px', color: '#8b4513'
      }}>
        书斋开启中...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', background: '#f4e4c1' }}>
        <Nav />
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={
              <Bookstore
                books={books}
                fragments={fragments}
                setFragments={setFragments}
                collection={collection}
                addLogEntry={addLogEntry}
              />
            } />
            <Route path="/log" element={
              <ReadingLog entries={logEntries} />
            } />
            <Route path="/reading/:id" element={
              <ReadingView
                entries={logEntries}
                updateNote={updateNote}
              />
            } />
          </Routes>
        </AnimatePresence>
      </div>
    </BrowserRouter>
  );
};

const Nav = () => {
  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 80, damping: 20 }}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'linear-gradient(180deg, #8b4513 0%, #654321 100%)',
        padding: '12px 24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        borderBottom: '3px solid #d4af37'
      }}
    >
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontFamily: '"KaiTi", "STKaiti", "楷体", serif'
      }}>
        <Link to="/" style={{
          textDecoration: 'none',
          color: '#f4e4c1',
          fontSize: '26px',
          fontWeight: 'bold',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
          letterSpacing: '2px'
        }}>
          📜 翰墨斋 · 古籍市集
        </Link>
        <div style={{ display: 'flex', gap: '16px' }}>
          <NavLink to="/">🏪 书肆</NavLink>
          <NavLink to="/log">📖 藏书志</NavLink>
        </div>
      </div>
    </motion.nav>
  );
};

const NavLink = ({ to, children }: { to: string; children: React.ReactNode }) => {
  return (
    <Link to={to} style={{
      textDecoration: 'none',
      color: '#f4e4c1',
      fontSize: '18px',
      padding: '8px 16px',
      borderRadius: '6px',
      transition: 'all 0.3s ease',
      background: 'rgba(212, 175, 55, 0.15)',
      border: '1px solid rgba(212, 175, 55, 0.3)'
    }}
    onMouseEnter={(e) => {
      (e.target as HTMLElement).style.background = 'rgba(212, 175, 55, 0.35)';
      (e.target as HTMLElement).style.transform = 'translateY(-2px)';
    }}
    onMouseLeave={(e) => {
      (e.target as HTMLElement).style.background = 'rgba(212, 175, 55, 0.15)';
      (e.target as HTMLElement).style.transform = 'translateY(0)';
    }}
    >
      {children}
    </Link>
  );
};

export default App;
