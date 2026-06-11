import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Book } from './types';

interface CollectionProps {
  onViewBook: (book: Book) => void;
}

export default function Collection({ onViewBook }: CollectionProps) {
  const navigate = useNavigate();
  const [userBooks, setUserBooks] = useState<Book[]>([]);
  const [publicBooks, setPublicBooks] = useState<Book[]>([]);
  const [randomBook, setRandomBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewerBook, setViewerBook] = useState<Book | null>(null);

  const loadUserBooks = useCallback(async () => {
    try {
      const res = await fetch('/api/books');
      if (res.ok) {
        const data = await res.json();
        setUserBooks(data);
      }
    } catch (e) {
      console.error('加载用户收藏失败:', e);
    }
  }, []);

  const loadPublicBooks = useCallback(async () => {
    try {
      const res = await fetch('/api/public-books');
      if (res.ok) {
        const data = await res.json();
        setPublicBooks(data);
      }
    } catch (e) {
      console.error('加载公开古籍失败:', e);
    }
  }, []);

  const loadRandomBook = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/random-book');
      if (res.ok) {
        const data = await res.json();
        setRandomBook(data);
      }
    } catch (e) {
      console.error('加载随机古籍失败:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadUserBooks(), loadPublicBooks()])
      .then(() => loadRandomBook())
      .finally(() => setLoading(false));
  }, [loadUserBooks, loadPublicBooks, loadRandomBook]);

  const handleBookClick = (book: Book, fromPublic: boolean = false) => {
    if (fromPublic) {
      onViewBook(book);
      navigate(`/repair/${book.id}`);
    } else {
      setViewerBook(book);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const allBooks = [...userBooks, ...publicBooks.slice(0, 2)];
  const displayBooks = allBooks.length > 0 ? allBooks : [];

  if (loading && displayBooks.length === 0) {
    return (
      <div className="collection-page">
        <div className="loading">正在加载藏书阁...</div>
      </div>
    );
  }

  return (
    <div className="collection-page">
      <div className="collection-header">
        <h2>私人藏书阁</h2>
        <button 
          className="random-btn"
          onClick={loadRandomBook}
          disabled={loading}
        >
          🎲 随机浏览古籍
        </button>
      </div>

      {randomBook && (
        <div style={{ 
          marginBottom: 40, 
          padding: 20, 
          borderRadius: 12,
          background: 'linear-gradient(135deg, var(--bg-secondary), var(--paper-color))',
          border: '2px dashed var(--accent-gold)'
        }}>
          <div style={{ 
            fontSize: 18, 
            color: 'var(--accent-red)', 
            marginBottom: 20,
            fontFamily: "'Ma Shan Zheng', cursive",
            letterSpacing: 2
          }}>
            ✨ 今日推荐 · 其他修复师的作品
          </div>
          <BookCard 
            book={randomBook} 
            onClick={() => handleBookClick(randomBook, true)}
            formatDate={formatDate}
          />
        </div>
      )}

      {displayBooks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📜</div>
          <div className="empty-state-text">藏书阁空空如也</div>
          <div className="empty-state-sub">前往书坊修复古籍，开启你的藏书之旅</div>
          <div style={{ marginTop: 30 }}>
            <button 
              className="action-btn primary"
              onClick={() => navigate('/')}
            >
              📚 前往书坊
            </button>
          </div>
        </div>
      ) : (
        <div className="books-grid">
          {displayBooks.map(book => (
            <BookCard 
              key={book.id}
              book={book}
              onClick={() => handleBookClick(book, true)}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}

      {userBooks.length > 0 && (
        <>
          <h3 style={{ 
            marginTop: 60, 
            marginBottom: 30,
            fontFamily: "'Ma Shan Zheng', cursive",
            fontSize: 28,
            color: 'var(--accent-brown)',
            borderBottom: '2px solid var(--accent-light-brown)',
            paddingBottom: 10
          }}>
            📖 我的修复记录
          </h3>
          <div className="books-grid">
            {userBooks.map(book => (
              <BookCard 
                key={`my-${book.id}`}
                book={book}
                onClick={() => setViewerBook(book)}
                formatDate={formatDate}
                showOwner
              />
            ))}
          </div>
        </>
      )}

      {viewerBook && (
        <div className="viewer-modal" onClick={() => setViewerBook(null)}>
          <button 
            className="viewer-close"
            onClick={() => setViewerBook(null)}
          >
            ✕
          </button>
          <div 
            onClick={e => e.stopPropagation()}
            style={{ 
              background: 'var(--paper-color)',
              borderRadius: 8,
              maxWidth: 900,
              maxHeight: '85vh',
              overflow: 'auto',
              padding: 40,
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{
              display: 'flex',
              gap: 40,
              marginBottom: 30,
              paddingBottom: 20,
              borderBottom: '2px solid var(--accent-brown)'
            }}>
              <div 
                style={{
                  width: 140,
                  height: 200,
                  borderRadius: '4px 8px 8px 4px',
                  background: viewerBook.coverColor,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '4px 8px 20px rgba(0,0,0,0.3)'
                }}
              >
                <span style={{
                  writingMode: 'vertical-rl',
                  textOrientation: 'upright',
                  fontFamily: "'Ma Shan Zheng', cursive",
                  fontSize: 24,
                  color: 'white',
                  letterSpacing: 4,
                  textShadow: '1px 1px 3px rgba(0,0,0,0.5)'
                }}>
                  {viewerBook.title}
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{
                  fontFamily: "'Ma Shan Zheng', cursive",
                  fontSize: 36,
                  color: 'var(--accent-red)',
                  marginBottom: 15
                }}>
                  {viewerBook.title}
                </h2>
                <p style={{ fontSize: 18, color: 'var(--accent-brown)', margin: '8px 0' }}>
                  <strong>【{viewerBook.dynasty}】</strong> {viewerBook.author} 撰
                </p>
                <p style={{ fontSize: 16, color: 'var(--accent-brown)', margin: '8px 0' }}>
                  修复日期：{formatDate(viewerBook.repairedAt)}
                </p>
                {viewerBook.repairedBy && (
                  <p style={{ fontSize: 16, color: 'var(--accent-brown)', margin: '8px 0' }}>
                    修复者：{viewerBook.repairedBy}
                  </p>
                )}
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 14, color: 'var(--accent-brown)', marginBottom: 8 }}>
                    修复进度
                  </div>
                  <div className="mini-progress" style={{ height: 12, borderRadius: 6 }}>
                    <div 
                      className="mini-progress-fill"
                      style={{ 
                        width: `${viewerBook.repairProgress}%`,
                        borderRadius: 6
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-red)', marginTop: 5 }}>
                    {viewerBook.repairProgress}% 完成
                  </div>
                </div>
              </div>
            </div>

            {viewerBook.repairLog && (
              <div style={{ marginBottom: 30 }}>
                <h3 style={{
                  fontFamily: "'Ma Shan Zheng', cursive",
                  fontSize: 24,
                  color: 'var(--accent-red)',
                  marginBottom: 15,
                  paddingLeft: 15,
                  borderLeft: '4px solid var(--accent-gold)'
                }}>
                  修复日志
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 15,
                  padding: 20,
                  background: 'var(--bg-secondary)',
                  borderRadius: 8
                }}>
                  <div>
                    <div style={{ fontSize: 14, color: 'var(--accent-brown)' }}>去渍刷</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-red)' }}>
                      {viewerBook.repairLog.toolsUsed.stainRemover} 次
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, color: 'var(--accent-brown)' }}>补虫蛀笔</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-red)' }}>
                      {viewerBook.repairLog.toolsUsed.wormholeFiller} 次
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, color: 'var(--accent-brown)' }}>去折痕熨斗</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-red)' }}>
                      {viewerBook.repairLog.toolsUsed.creaseIron} 次
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, color: 'var(--accent-brown)' }}>墨字补全笔</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-red)' }}>
                      {viewerBook.repairLog.toolsUsed.inkRestorer} 次
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3 style={{
                fontFamily: "'Ma Shan Zheng', cursive",
                fontSize: 24,
                color: 'var(--accent-red)',
                marginBottom: 20,
                paddingLeft: 15,
                borderLeft: '4px solid var(--accent-gold)'
              }}>
                内页预览
              </h3>
              <div style={{
                display: 'flex',
                gap: 10,
                background: 'linear-gradient(90deg, var(--paper-color) 0%, var(--bg-color) 48%, var(--accent-brown) 49%, var(--accent-brown) 51%, var(--bg-color) 52%, var(--paper-color) 100%)',
                padding: 10,
                borderRadius: 4
              }}>
                <div style={{
                  flex: 1,
                  background: 'var(--paper-color)',
                  padding: 30,
                  minHeight: 300,
                  boxShadow: 'inset -10px 0 20px rgba(139,94,60,0.15)',
                  borderRadius: '4px 0 0 4px'
                }}>
                  <div style={{
                    fontFamily: "'Ma Shan Zheng', cursive",
                    fontSize: 20,
                    textAlign: 'center',
                    color: 'var(--accent-red)',
                    paddingBottom: 10,
                    borderBottom: '1px solid var(--accent-brown)',
                    marginBottom: 20
                  }}>
                    卷一 · {viewerBook.title}
                  </div>
                  <div style={{
                    writingMode: 'vertical-rl',
                    textOrientation: 'upright',
                    fontSize: 16,
                    lineHeight: 2,
                    letterSpacing: 3,
                    color: 'var(--text-color)',
                    fontWeight: 600,
                    display: 'flex',
                    gap: 15,
                    height: 220
                  }}>
                    {viewerBook.content.left.map((t, i) => (
                      <p key={i}>{t}</p>
                    ))}
                  </div>
                </div>
                <div style={{
                  flex: 1,
                  background: 'var(--paper-color)',
                  padding: 30,
                  minHeight: 300,
                  boxShadow: 'inset 10px 0 20px rgba(139,94,60,0.15)',
                  borderRadius: '0 4px 4px 0'
                }}>
                  <div style={{
                    fontFamily: "'Ma Shan Zheng', cursive",
                    fontSize: 20,
                    textAlign: 'center',
                    color: 'var(--accent-red)',
                    paddingBottom: 10,
                    borderBottom: '1px solid var(--accent-brown)',
                    marginBottom: 20
                  }}>
                    卷二 · {viewerBook.title}
                  </div>
                  <div style={{
                    writingMode: 'vertical-rl',
                    textOrientation: 'upright',
                    fontSize: 16,
                    lineHeight: 2,
                    letterSpacing: 3,
                    color: 'var(--text-color)',
                    fontWeight: 600,
                    display: 'flex',
                    gap: 15,
                    height: 220
                  }}>
                    {viewerBook.content.right.map((t, i) => (
                      <p key={i}>{t}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 30, textAlign: 'center' }}>
              <button 
                className="action-btn primary"
                onClick={() => {
                  onViewBook(viewerBook);
                  setViewerBook(null);
                  navigate(`/repair/${viewerBook.id}`);
                }}
              >
                🔧 再次修复
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BookCard({ 
  book, 
  onClick, 
  formatDate,
  showOwner = false
}: { 
  book: Book; 
  onClick: () => void;
  formatDate: (s: string) => string;
  showOwner?: boolean;
}) {
  return (
    <div className="book-card" onClick={onClick}>
      <div className="book-thumb">
        <div 
          className="book-thumb-cover"
          style={{ backgroundColor: book.coverColor }}
        >
          <span className="book-thumb-title">{book.title}</span>
        </div>
      </div>
      <div className="book-card-body">
        <div className="book-card-title">{book.title}</div>
        <div className="book-card-meta">
          【{book.dynasty}】{book.author}
        </div>
        <div className="book-card-meta">
          修复：{formatDate(book.repairedAt)}
        </div>
        {showOwner && book.repairedBy && (
          <div className="book-card-meta">
            修复者：{book.repairedBy}
          </div>
        )}
        <div className="book-card-progress">
          <div style={{ fontSize: 13, color: 'var(--accent-brown)', marginBottom: 5 }}>
            修复进度 {book.repairProgress}%
          </div>
          <div className="mini-progress">
            <div 
              className="mini-progress-fill"
              style={{ width: `${book.repairProgress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
