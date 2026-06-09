import { useState, useEffect, useCallback } from 'react';
import BookList from './components/BookList';
import CardWall from './components/CardWall';
import type { Book } from './types';

const COLORS = [
  '#E91E63', '#3F51B5', '#009688', '#FF9800',
  '#9C27B0', '#2196F3', '#4CAF50', '#F44336',
  '#673AB7', '#00BCD4', '#8BC34A', '#FFC107'
];

export default function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [showAddBook, setShowAddBook] = useState(false);
  const [filterBookId, setFilterBookId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const [newBookName, setNewBookName] = useState('');
  const [newBookAuthor, setNewBookAuthor] = useState('');
  const [newBookColor, setNewBookColor] = useState(COLORS[0]);
  const [newBookPages, setNewBookPages] = useState('');
  const [addError, setAddError] = useState('');

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = useCallback(async () => {
    try {
      const res = await fetch('/api/books');
      const data = await res.json();
      setBooks(data);
    } catch (err) {
      console.error('获取书籍失败:', err);
    }
  }, []);

  const handleAddBook = async () => {
    setAddError('');
    if (!newBookName.trim()) {
      setAddError('请输入书籍名称');
      return;
    }
    if (newBookName.length > 50) {
      setAddError('书籍名称不能超过50字');
      return;
    }
    if (!newBookAuthor.trim()) {
      setAddError('请输入作者');
      return;
    }
    const pages = parseInt(newBookPages);
    if (isNaN(pages) || pages < 10 || pages > 1000) {
      setAddError('总页数必须在10-1000之间');
      return;
    }

    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBookName,
          author: newBookAuthor,
          color: newBookColor,
          totalPages: pages
        })
      });
      if (!res.ok) {
        const err = await res.json();
        setAddError(err.error || '添加失败');
        return;
      }
      const newBook = await res.json();
      setBooks(prev => [newBook, ...prev]);
      setNewBookName('');
      setNewBookAuthor('');
      setNewBookColor(COLORS[0]);
      setNewBookPages('');
      setShowAddBook(false);
    } catch (err) {
      setAddError('网络错误');
    }
  };

  const handleUpdateProgress = async (bookId: string, currentPage: number) => {
    try {
      const res = await fetch(`/api/books/${bookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPage })
      });
      if (res.ok) {
        const updatedBook = await res.json();
        setBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));
      }
    } catch (err) {
      console.error('更新进度失败:', err);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    try {
      const res = await fetch(`/api/books/${bookId}`, { method: 'DELETE' });
      if (res.ok) {
        setBooks(prev => prev.filter(b => b.id !== bookId));
        if (selectedBookId === bookId) setSelectedBookId(null);
        if (filterBookId === bookId) setFilterBookId(null);
      }
    } catch (err) {
      console.error('删除书籍失败:', err);
    }
  };

  const selectedBook = books.find(b => b.id === selectedBookId) || null;

  const leftPanelStyle: React.CSSProperties = isMobile
    ? {
        width: '100%',
        padding: 16,
        backgroundColor: '#1E1E1E',
        overflowX: 'auto',
        overflowY: 'hidden'
      }
    : {
        width: '30%',
        minWidth: 300,
        padding: 20,
        backgroundColor: '#1E1E1E',
        overflowY: 'auto'
      };

  const containerStyle: React.CSSProperties = isMobile
    ? { display: 'flex', flexDirection: 'column', minHeight: '100vh' }
    : { display: 'flex', minHeight: '100vh' };

  const rightPanelStyle: React.CSSProperties = {
    flex: 1,
    padding: isMobile ? 16 : 20,
    overflowY: 'auto'
  };

  const dividerStyle: React.CSSProperties = isMobile
    ? { height: 1, backgroundColor: '#333', flexShrink: 0, width: '100%' }
    : { width: 1, backgroundColor: '#333', flexShrink: 0 };

  return (
    <div style={styles.app}>
      <div style={containerStyle}>
        <div style={leftPanelStyle} className="left-panel">
          <div style={styles.leftHeader}>
            <h1 style={styles.title}>我的书架</h1>
            <button
              onClick={() => setShowAddBook(!showAddBook)}
              style={{
                ...styles.addBtn,
                backgroundColor: showAddBook ? '#F44336' : '#4CAF50'
              }}
            >
              {showAddBook ? '取消' : '+ 添加书籍'}
            </button>
          </div>

          {showAddBook && (
            <div style={styles.addBookForm}>
              <input
                type="text"
                placeholder="书籍名称（最多50字）"
                value={newBookName}
                onChange={e => setNewBookName(e.target.value)}
                style={styles.input}
                maxLength={50}
              />
              <input
                type="text"
                placeholder="作者"
                value={newBookAuthor}
                onChange={e => setNewBookAuthor(e.target.value)}
                style={styles.input}
              />
              <input
                type="number"
                placeholder="总页数（10-1000）"
                value={newBookPages}
                onChange={e => setNewBookPages(e.target.value)}
                style={styles.input}
                min={10}
                max={1000}
              />
              <div style={styles.colorPicker}>
                <span style={styles.colorLabel}>选择封面颜色：</span>
                <div style={styles.colorGrid}>
                  {COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewBookColor(color)}
                      style={{
                        ...styles.colorDot,
                        backgroundColor: color,
                        border: newBookColor === color ? '3px solid #fff' : '2px solid transparent'
                      }}
                    />
                  ))}
                </div>
              </div>
              {addError && <div style={styles.error}>{addError}</div>}
              <button onClick={handleAddBook} style={styles.submitBtn}>
                确认添加
              </button>
            </div>
          )}

          <BookList
            books={books}
            selectedBookId={selectedBookId}
            onSelectBook={setSelectedBookId}
            onUpdateProgress={handleUpdateProgress}
            onDeleteBook={handleDeleteBook}
            selectedBook={selectedBook}
            isMobile={isMobile}
          />
        </div>

        <div style={dividerStyle} />

        <div style={rightPanelStyle}>
          <CardWall
            books={books}
            filterBookId={filterBookId}
            onFilterChange={setFilterBookId}
          />
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .left-panel {
            max-height: 50vh;
          }
        }
      `}</style>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#121212',
    color: '#fff'
  },
  leftHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  addBtn: {
    padding: '8px 16px',
    borderRadius: 6,
    color: '#fff',
    fontWeight: 500,
    fontSize: 14
  },
  addBookForm: {
    padding: 16,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    marginBottom: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  input: {
    padding: '10px 12px',
    borderRadius: 6,
    border: '1px solid #444',
    backgroundColor: '#333',
    color: '#fff',
    fontSize: 14
  },
  colorPicker: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  colorLabel: {
    fontSize: 14,
    color: '#ccc'
  },
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: 8
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    cursor: 'pointer'
  },
  error: {
    color: '#FF6B6B',
    fontSize: 13
  },
  submitBtn: {
    padding: '10px',
    backgroundColor: '#2196F3',
    color: '#fff',
    borderRadius: 6,
    fontWeight: 500
  }
};
