import { useState, useEffect, useCallback, useRef } from 'react';
import type { Book, Card } from '../types';

interface CardWallProps {
  books: Book[];
  filterBookId: string | null;
  onFilterChange: (bookId: string | null) => void;
}

const COLUMN_WIDTH = 220;
const COLUMN_GAP = 20;
const PAGE_SIZE = 10;
const MAX_CARDS = 50;

export default function CardWall({ books, filterBookId, onFilterChange }: CardWallProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fadeIn, setFadeIn] = useState(true);
  const [columnCount, setColumnCount] = useState(3);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadCards = useCallback(async (reset: boolean = false) => {
    if (loading) return;
    setLoading(true);

    const offset = reset ? 0 : cards.length;
    if (offset >= MAX_CARDS) {
      setLoading(false);
      return;
    }

    let url = `/api/cards?limit=${PAGE_SIZE}&offset=${offset}`;
    if (filterBookId) {
      url += `&bookId=${filterBookId}`;
    }

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (reset) {
        setCards(data.cards);
      } else {
        setCards(prev => {
          const newCards = [...prev, ...data.cards];
          return newCards.slice(0, MAX_CARDS);
        });
      }
      setTotal(data.total);
    } catch (err) {
        console.error('获取卡片失败:', err);
      }

    setLoading(false);
  }, [filterBookId, cards.length, loading]);

  useEffect(() => {
    setFadeIn(false);
    const timer = setTimeout(() => {
      setCards([]);
      loadCards(true);
      setFadeIn(true);
    }, 150);
    return () => clearTimeout(timer);
  }, [filterBookId]);

  useEffect(() => {
    loadCards(true);
  }, []);

  useEffect(() => {
    const updateColumnCount = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const count = Math.floor((width + COLUMN_GAP) / (COLUMN_WIDTH + COLUMN_GAP));
        setColumnCount(Math.max(1, count));
      }
    };

    updateColumnCount();
    window.addEventListener('resize', updateColumnCount);
    return () => window.removeEventListener('resize', updateColumnCount);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const fullHeight = document.documentElement.scrollHeight;

      if (fullHeight - (scrollTop + windowHeight) < 500) {
        if (!loading && cards.length < total && cards.length < MAX_CARDS) {
          loadCards(false);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, cards.length, total, loadCards]);

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

  const getCardHeight = (card: Card) => {
    const baseHeight = 100;
    const excerptHeight = Math.ceil(card.excerpt.length / 15) * 20;
    const noteHeight = card.note ? Math.ceil(card.note.length / 18) * 18 : 0;
    const random = 60;
    const total = baseHeight + excerptHeight + noteHeight + random;
    return Math.min(320, Math.max(200, total));
  };

  const arrangeCardsInColumns = () => {
    const columns: Card[][] = Array.from({ length: columnCount }, () => []);
    const columnHeights = new Array(columnCount).fill(0);

    for (const card of cards) {
      const shortestCol = columnHeights.indexOf(Math.min(...columnHeights));
      columns[shortestCol].push(card);
      columnHeights[shortestCol] += getCardHeight(card) + COLUMN_GAP;
    }

    return columns;
  };

  const columns = arrangeCardsInColumns();

  return (
    <div style={styles.container} ref={containerRef}>
      <div style={styles.header}>
        <h2 style={styles.title}>观点卡片墙</h2>
        <div style={styles.filters}>
          <button
            onClick={() => onFilterChange(null)}
            style={{
              ...styles.filterBtn,
              backgroundColor: filterBookId === null ? '#2196F3' : '#333',
              color: filterBookId === null ? '#fff' : '#ccc'
            }}
          >
            全部
          </button>
          {books.map(book => (
            <button
              key={book.id}
              onClick={() => onFilterChange(book.id)}
              style={{
                ...styles.filterBtn,
                backgroundColor: filterBookId === book.id ? book.color : '#333',
                color: filterBookId === book.id ? '#fff' : '#ccc'
              }}
            >
              {book.name}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.wallContainer}>
        {cards.length === 0 && !loading ? (
          <div style={styles.emptyState}>
            <p style={{ fontSize: 16, color: '#888' }}>暂无卡片</p>
            <p style={{ fontSize: 14, color: '#666', marginTop: 8 }}>
              选择书籍添加观点卡片吧
            </p>
          </div>
        ) : (
            <div
              style={{
                display: 'flex',
                gap: `${COLUMN_GAP}px`,
                opacity: fadeIn ? 1 : 0,
                transition: 'opacity 0.3s ease-out',
                alignItems: 'flex-start'
              }}
            >
              {columns.map((column, colIndex) => (
              <div
                key={colIndex}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: `${COLUMN_GAP}px`,
                  width: `${COLUMN_WIDTH}px`
                }}
              >
                {column.map(card => {
                  const book = books.find(b => b.id === card.bookId);
                  return (
                    <div
                      key={card.id}
                      style={{
                        ...styles.card,
                        height: getCardHeight(card),
                        borderLeft: book ? `4px solid ${book.color}` : '4px solid #666'
                      }}
                      className="card-wall-card"
                    >
                      <p style={styles.excerpt}>"{card.excerpt}"</p>
                      {card.note && (
                        <p style={styles.note}>{card.note}</p>
                      )}
                      <div style={styles.cardFooter}>
                          <span style={styles.bookName}>{card.bookName}</span>
                          <span style={styles.time}>{formatRelativeTime(card.createdAt)}</span>
                        </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div style={styles.loading}>
          <span>加载中...</span>
        </div>
      )}

      {!loading && cards.length > 0 && cards.length >= total && (
        <div style={styles.end}>
          <span>— 已加载全部 {total} 张卡片 —</span>
        </div>
      )}
      {!loading && cards.length >= MAX_CARDS && total > MAX_CARDS && (
        <div style={styles.end}>
          <span>— 最多展示 {MAX_CARDS} 张卡片 —</span>
        </div>
      )}

      <style>{`
        .card-wall-card:hover {
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4) !important;
          transform: translateY(-4px);
        }
      `}</style>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    height: '100%'
  },
  header: {
    marginBottom: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16
  },
  filters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8
  },
  filterBtn: {
    padding: '6px 14px',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 500
  },
  wallContainer: {
    minHeight: 200
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxShadow: '0 2px 8px rgba(224, 224, 224, 0.3)',
    transition: 'all 0.2s ease-out',
    color: '#333',
    overflow: 'hidden'
  },
  excerpt: {
    fontSize: 14,
    lineHeight: 1.6,
    fontStyle: 'italic',
    color: '#222',
    marginBottom: 8,
    overflow: 'hidden',
    wordBreak: 'break-word'
  },
  note: {
    fontSize: 13,
    lineHeight: 1.5,
    color: '#666',
    marginBottom: 12
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 8,
    borderTop: '1px solid #f0f0f0'
  },
  bookName: {
    fontSize: 12,
    color: '#888',
    fontWeight: 500
  },
  time: {
    fontSize: 11,
    color: '#aaa'
  },
  emptyState: {
    textAlign: 'center',
    padding: 60
  },
  loading: {
    textAlign: 'center',
    padding: 20,
    color: '#888',
    fontSize: 14
  },
  end: {
    textAlign: 'center',
    padding: 20,
    color: '#666',
    fontSize: 13
  }
};
