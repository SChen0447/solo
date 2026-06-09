import { useState, useEffect } from 'react';
import type { Book, Card as CardType } from '../types';

interface BookListProps {
  books: Book[];
  selectedBookId: string | null;
  onSelectBook: (id: string | null) => void;
  onUpdateProgress: (bookId: string, currentPage: number) => void;
  onDeleteBook: (bookId: string) => void;
  selectedBook: Book | null;
  isMobile?: boolean;
}

export default function BookList({
  books,
  selectedBookId,
  onSelectBook,
  onUpdateProgress,
  onDeleteBook,
  selectedBook,
  isMobile = false
}: BookListProps) {
  const [currentPageInput, setCurrentPageInput] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [note, setNote] = useState('');
  const [cardError, setCardError] = useState('');
  const [bookCards, setBookCards] = useState<CardType[]>([]);

  useEffect(() => {
    if (selectedBook) {
      setCurrentPageInput(String(selectedBook.currentPage));
      fetchBookCards(selectedBook.id);
    }
  }, [selectedBook]);

  const fetchBookCards = async (bookId: string) => {
    try {
      const res = await fetch(`/api/cards?bookId=${bookId}&limit=10`);
      const data = await res.json();
      setBookCards(data.cards);
    } catch (err) {
      console.error('获取卡片失败:', err);
    }
  };

  const handleProgressUpdate = () => {
    if (!selectedBook) return;
    const page = parseInt(currentPageInput);
    if (isNaN(page) || page < 0 || page > selectedBook.totalPages) {
      return;
    }
    onUpdateProgress(selectedBook.id, page);
  };

  const handleAddCard = async () => {
    setCardError('');
    if (!selectedBook) return;
    if (!excerpt.trim()) {
      setCardError('请输入摘录内容');
      return;
    }
    if (excerpt.length > 120) {
      setCardError('摘录不能超过120字');
      return;
    }
    if (note.length > 200) {
      setCardError('批注不能超过200字');
      return;
    }

    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: selectedBook.id,
          excerpt,
          note
        })
      });
      if (!res.ok) {
        const err = await res.json();
        setCardError(err.error || '添加失败');
        return;
      }
      const newCard = await res.json();
      setBookCards(prev => [newCard, ...prev]);
      setExcerpt('');
      setNote('');
    } catch (err) {
      setCardError('网络错误');
    }
  };

  const getProgress = (book: Book) => {
    return Math.round((book.currentPage / book.totalPages) * 100);
  };

  const getProgressGradient = (progress: number) => {
    const ratio = progress / 100;
    const r = Math.round(255 - (255 - 78) * ratio);
    const g = Math.round(107 + (205 - 107) * ratio);
    const b = Math.round(107 + (196 - 107) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 30) return `${days}天前`;
    return new Date(timestamp).toLocaleDateString('zh-CN');
  };

  if (selectedBook) {
    const progress = getProgress(selectedBook);
    return (
      <div style={styles.detailContainer}>
        <button onClick={() => onSelectBook(null)} style={styles.backBtn}>
          ← 返回书架
        </button>

        <div
          style={{
            ...styles.detailBookCard,
            backgroundColor: selectedBook.color
          }}
        >
          <div style={styles.detailBookInfo}>
            <h2 style={styles.detailBookTitle}>{selectedBook.name}</h2>
            <p style={styles.detailBookAuthor}>{selectedBook.author}</p>
          </div>
          <div style={styles.detailProgressInfo}>
            <span style={styles.detailProgressPercent}>{progress}%</span>
            <span style={styles.detailPageInfo}>
              {selectedBook.currentPage} / {selectedBook.totalPages}
            </span>
          </div>
          <div style={styles.progressBarContainer}>
            <div
              style={{
                ...styles.progressBar,
                width: `${progress}%`,
                backgroundColor: getProgressGradient(progress)
              }}
            />
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>阅读进度</h3>
          <div style={styles.progressInputRow}>
            <input
              type="number"
              min={0}
              max={selectedBook.totalPages}
              value={currentPageInput}
              onChange={e => setCurrentPageInput(e.target.value)}
              style={styles.pageInput}
              placeholder="当前页码"
            />
            <span style={styles.pageLabel}> / {selectedBook.totalPages} 页</span>
          </div>
          <button onClick={handleProgressUpdate} style={styles.updateBtn}>
            更新进度
          </button>
          <div style={{ ...styles.progressBarContainer, marginTop: 12 }}>
            <div
              style={{
                ...styles.progressBar,
                width: `${progress}%`,
                backgroundColor: getProgressGradient(progress)
              }}
            />
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>添加观点卡片</h3>
          <textarea
            value={excerpt}
            onChange={e => setExcerpt(e.target.value)}
            placeholder="一句话摘录（最多120字）"
            style={styles.textarea}
            maxLength={120}
            rows={3}
          />
          <div style={styles.charCount}>
            {excerpt.length}/120
          </div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="个人批注（可选，最多200字）"
            style={styles.textarea}
            maxLength={200}
            rows={3}
          />
          <div style={styles.charCount}>
            {note.length}/200
          </div>
          {cardError && <div style={styles.error}>{cardError}</div>}
          <button onClick={handleAddCard} style={styles.addCardBtn}>
            添加卡片
          </button>
        </div>

        {bookCards.length > 0 && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>本书卡片 ({bookCards.length})</h3>
            <div style={styles.bookCardsList}>
              {bookCards.map(card => (
                <div key={card.id} style={styles.miniCard}>
                  <p style={styles.miniCardExcerpt}>"{card.excerpt}"</p>
                  {card.note && (
                    <p style={styles.miniCardNote}>{card.note}</p>
                  )}
                  <div style={styles.miniCardFooter}>
                    <span>{formatRelativeTime(card.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => {
            if (confirm('确定要删除这本书吗？相关卡片也会被删除。')) {
              onDeleteBook(selectedBook.id);
            }
          }}
          style={styles.deleteBtn}
        >
          删除这本书
        </button>
      </div>
    );
  }

  const bookGridStyle: React.CSSProperties = isMobile
    ? {
        display: 'flex',
        gap: 16,
        overflowX: 'auto',
        overflowY: 'hidden',
        paddingBottom: 16,
        whiteSpace: 'nowrap' as const
      }
    : {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, 180px)',
        gap: 16,
        justifyContent: 'center'
      };

  const bookCardWrapperStyle: React.CSSProperties = isMobile
    ? { flexShrink: 0 }
    : {};

  return (
    <div style={bookGridStyle}>
      {books.length === 0 ? (
        <div style={styles.emptyState}>
          <p>书架空空如也</p>
          <p style={styles.emptyHint}>点击上方"添加书籍"开始记录吧</p>
        </div>
      ) : (
        books.map(book => {
          const progress = getProgress(book);
          return (
            <div key={book.id} style={bookCardWrapperStyle}>
              <div
                onClick={() => onSelectBook(book.id)}
                style={{
                  ...styles.bookCard,
                  backgroundColor: book.color,
                  outline: selectedBookId === book.id ? '2px solid #fff' : 'none'
                }}
              >
                <div style={styles.bookCardContent}>
                  <h3 style={styles.bookCardTitle}>{book.name}</h3>
                  <p style={styles.bookCardAuthor}>{book.author}</p>
                </div>
                <div style={styles.bookCardProgress}>
                  <span style={styles.progressPercent}>{progress}%</span>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  bookGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, 180px)',
    gap: 16,
    justifyContent: 'center'
  },
  bookCard: {
    width: 180,
    height: 240,
    borderRadius: 8,
    padding: 16,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    position: 'relative',
    transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out',
    color: '#fff'
  },
  bookCardContent: {
    flex: 1
  },
  bookCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    wordBreak: 'break-all',
    lineHeight: 1.3
  },
  bookCardAuthor: {
    fontSize: 14,
    opacity: 0.9
  },
  bookCardProgress: {
    textAlign: 'right'
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: 'bold',
    textShadow: '0 1px 2px rgba(0,0,0,0.3)'
  },
  emptyState: {
    textAlign: 'center',
    padding: 40,
    color: '#888'
  },
  emptyHint: {
    fontSize: 14,
    marginTop: 8,
    color: '#666'
  },
  detailContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20
  },
  backBtn: {
    alignSelf: 'flex-start',
    padding: '8px 16px',
    backgroundColor: '#333',
    color: '#fff',
    borderRadius: 6,
    fontSize: 14
  },
  detailBookCard: {
    padding: 24,
    borderRadius: 12,
    color: '#fff'
  },
  detailBookInfo: {
    marginBottom: 16
  },
  detailBookTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8
  },
  detailBookAuthor: {
    fontSize: 16,
    opacity: 0.9
  },
  detailProgressInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8
  },
  detailProgressPercent: {
    fontSize: 32,
    fontWeight: 'bold'
  },
  detailPageInfo: {
    fontSize: 14,
    opacity: 0.9
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.3s ease-out, background-color 0.3s ease-out'
  },
  section: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12
  },
  progressInputRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 12
  },
  pageInput: {
    padding: '10px 12px',
    borderRadius: 6,
    border: '1px solid #444',
    backgroundColor: '#333',
    color: '#fff',
    fontSize: 14,
    width: 100
  },
  pageLabel: {
    marginLeft: 8,
    color: '#ccc',
    fontSize: 14
  },
  updateBtn: {
    padding: '10px 20px',
    backgroundColor: '#2196F3',
    color: '#fff',
    borderRadius: 6,
    fontWeight: 500,
    fontSize: 14
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 6,
    border: '1px solid #444',
    backgroundColor: '#333',
    color: '#fff',
    fontSize: 14,
    resize: 'vertical',
    marginTop: 8
  },
  charCount: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
    marginTop: 4
  },
  error: {
    color: '#FF6B6B',
    fontSize: 13,
    marginTop: 8
  },
  addCardBtn: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#4CAF50',
    color: '#fff',
    borderRadius: 6,
    fontWeight: 500,
    marginTop: 8
  },
  bookCardsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  miniCard: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12
  },
  miniCardExcerpt: {
    fontSize: 14,
    lineHeight: 1.5,
    fontStyle: 'italic',
    marginBottom: 8
  },
  miniCardNote: {
    fontSize: 13,
    color: '#aaa',
    lineHeight: 1.5,
    marginBottom: 8
  },
  miniCardFooter: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right'
  },
  deleteBtn: {
    padding: '10px',
    backgroundColor: '#F44336',
    color: '#fff',
    borderRadius: 6,
    fontWeight: 500
  }
};
