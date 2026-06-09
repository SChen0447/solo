import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { initShelf, ShelfAPI } from './BookShelf';
import { BookData } from './BookCard';

const COLORS = [
  '#FF6B6B', '#FF8E72', '#FFD93D', '#6BCB77', '#4D96FF', '#845EC2',
  '#FF6F91', '#FF9671', '#FFC75F', '#F9F871', '#00C9A7', '#2C73D2',
  '#C34A36', '#D65DB1', '#FF6F91', '#FF9671', '#B0A8B9', '#845EC2',
  '#2D3436', '#636E72', '#74B9FF', '#A29BFE', '#FD79A8', '#00B894'
];

interface Comment {
  id: string;
  text: string;
  createdAt: number;
}

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const shelfRef = useRef<ShelfAPI | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[4]);
  const [selectedBook, setSelectedBook] = useState<BookData | null>(null);
  const [newComment, setNewComment] = useState('');
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const shelf = initShelf(containerRef.current);
    shelfRef.current = shelf;

    shelf.onBookClick((bookId) => {
      const bookData = shelf.getBookData(bookId);
      if (bookData) {
        setSelectedBook({ ...bookData });
        setUserRating(0);
        setNewComment('');
      }
    });

    fetch('/api/books')
      .then(res => res.json())
      .then((data: BookData[]) => {
        data.forEach(book => shelf.addBook(book, false));
      });

    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('users:update', (count: number) => {
      setOnlineUsers(count);
    });

    socket.on('book:added', (book: BookData) => {
      if (shelfRef.current && !shelfRef.current.getBookData(book.id)) {
        shelfRef.current.addBook(book, false);
      }
    });

    socket.on('book:updated', (update: { id: string; rating?: number; comments?: Comment[] }) => {
      if (shelfRef.current) {
        const current = shelfRef.current.getBookData(update.id);
        if (current) {
          const updates: Partial<BookData> = {};
          if (update.rating !== undefined) updates.rating = update.rating;
          if (update.comments !== undefined) updates.comments = update.comments as any;
          shelfRef.current.updateBook(update.id, updates);
          
          if (selectedBook && selectedBook.id === update.id) {
            setSelectedBook(prev => prev ? { ...prev, ...updates } : null);
          }
        }
      }
    });

    return () => {
      shelf.dispose();
      socket.disconnect();
    };
  }, []);

  const handleAddBook = useCallback(async () => {
    if (!title.trim() || !author.trim()) return;
    if (title.length > 50 || author.length > 30) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          author: author.trim(),
          color: selectedColor
        })
      });
      
      if (res.ok) {
        const book: BookData = await res.json();
        if (shelfRef.current) {
          shelfRef.current.addBook(book, true);
        }
        setTitle('');
        setAuthor('');
      }
    } catch (err) {
      console.error('添加书籍失败:', err);
    } finally {
      setLoading(false);
    }
  }, [title, author, selectedColor]);

  const handleRate = useCallback(async (rating: number) => {
    if (!selectedBook) return;
    setUserRating(rating);
    
    try {
      await fetch(`/api/books/${selectedBook.id}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating })
      });
    } catch (err) {
      console.error('评分失败:', err);
    }
  }, [selectedBook]);

  const handleComment = useCallback(async () => {
    if (!selectedBook || !newComment.trim() || newComment.length > 200) return;
    
    try {
      await fetch(`/api/books/${selectedBook.id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newComment.trim() })
      });
      setNewComment('');
    } catch (err) {
      console.error('评论失败:', err);
    }
  }, [selectedBook, newComment]);

  const closeModal = useCallback(() => {
    setSelectedBook(null);
    setHoverRating(0);
  }, []);

  const renderStars = (rating: number, interactive: boolean = false) => {
    return (
      <div style={{ display: 'flex', gap: '4px' }}>
        {[1, 2, 3, 4, 5].map(star => {
          const filled = interactive
            ? (hoverRating || userRating) >= star
            : rating >= star;
          return (
            <span
              key={star}
              onClick={interactive ? () => handleRate(star) : undefined}
              onMouseEnter={interactive ? () => setHoverRating(star) : undefined}
              onMouseLeave={interactive ? () => setHoverRating(0) : undefined}
              style={{
                fontSize: interactive ? '32px' : '20px',
                color: filled ? '#FFD700' : '#555',
                cursor: interactive ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                transform: interactive && (hoverRating || userRating) >= star ? 'scale(1.2)' : 'scale(1)',
                userSelect: 'none'
              }}
            >
              ★
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: 'rgba(40,40,50,0.85)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #4A90D9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4A90D9" />
                <stop offset="100%" stopColor="#357ABD" />
              </linearGradient>
            </defs>
            <path d="M4 6 L4 26 L8 26 L8 6 Z M10 8 L10 26 L14 26 L14 8 Z M16 10 L16 26 L20 26 L20 10 Z M22 7 L22 26 L26 26 L26 7 Z M28 12 L28 26" 
              stroke="url(#logoGrad)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </svg>
          <span style={{
            fontSize: '20px',
            fontWeight: 600,
            background: 'linear-gradient(135deg, #4A90D9, #357ABD)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.5px'
          }}>
            虚拟书架
          </span>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(74, 144, 217, 0.15)',
          padding: '6px 14px',
          borderRadius: '20px',
          border: '1px solid rgba(74, 144, 217, 0.3)'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#4ADE80',
            boxShadow: '0 0 8px #4ADE80'
          }} />
          <span style={{ fontSize: '14px', color: '#ccc' }}>
            在线: <strong style={{ color: '#fff' }}>{onlineUsers}</strong>
          </span>
        </div>
      </nav>

      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          top: '60px',
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: 'calc(100% - 60px)'
        }}
      />

      <div style={{
        position: 'fixed',
        left: '24px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '280px',
        background: 'rgba(40,40,50,0.9)',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid rgba(74, 144, 217, 0.2)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        zIndex: 50,
        '@media (max-width: 768px)': {
          left: '50%',
          transform: 'translateX(-50%)',
          top: 'auto',
          bottom: '140px',
          width: '90%'
        }
      }}>
        <h3 style={{
          fontSize: '18px',
          marginBottom: '20px',
          color: '#fff',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          paddingBottom: '12px'
        }}>
          📚 添加新书
        </h3>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            color: '#aaa',
            marginBottom: '6px'
          }}>
            书名 ({title.length}/50)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 50))}
            placeholder="请输入书名..."
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '14px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#4A90D9';
              e.target.style.boxShadow = '0 0 0 2px rgba(74,144,217,0.2)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255,255,255,0.1)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            color: '#aaa',
            marginBottom: '6px'
          }}>
            作者 ({author.length}/30)
          </label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value.slice(0, 30))}
            placeholder="请输入作者..."
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '14px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#4A90D9';
              e.target.style.boxShadow = '0 0 0 2px rgba(74,144,217,0.2)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255,255,255,0.1)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            color: '#aaa',
            marginBottom: '6px'
          }}>
            封面颜色
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '8px'
          }}>
            {COLORS.map(color => (
              <div
                key={color}
                onClick={() => setSelectedColor(color)}
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: '50%',
                  background: color,
                  cursor: 'pointer',
                  border: selectedColor === color ? '3px solid #fff' : '2px solid transparent',
                  transition: 'all 0.2s ease',
                  boxShadow: selectedColor === color ? `0 0 12px ${color}` : 'none'
                }}
              />
            ))}
          </div>
        </div>

        <button
          onClick={handleAddBook}
          disabled={!title.trim() || !author.trim() || loading}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '15px',
            fontWeight: 600,
            background: 'linear-gradient(135deg, #4A90D9, #357ABD)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            cursor: (!title.trim() || !author.trim() || loading) ? 'not-allowed' : 'pointer',
            opacity: (!title.trim() || !author.trim() || loading) ? 0.5 : 1,
            transition: 'all 0.2s ease',
            letterSpacing: '0.5px'
          }}
          onMouseOver={(e) => {
            if (!(!title.trim() || !author.trim() || loading)) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(74,144,217,0.4)';
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {loading ? '上架中...' : '📖 上架'}
        </button>
      </div>

      <div style={{
        position: 'fixed',
        right: '24px',
        bottom: '24px',
        width: '200px',
        background: 'rgba(40,40,50,0.9)',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        padding: '16px',
        border: '1px solid rgba(74, 144, 217, 0.2)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        zIndex: 50
      }}>
        <div style={{
          fontSize: '13px',
          color: '#aaa',
          marginBottom: '12px',
          textAlign: 'center'
        }}>
          🎨 颜色选择器
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '6px'
        }}>
          {COLORS.map(color => (
            <div
              key={color}
              onClick={() => setSelectedColor(color)}
              style={{
                width: '100%',
                aspectRatio: '1',
                borderRadius: '50%',
                background: color,
                cursor: 'pointer',
                border: selectedColor === color ? '2px solid #fff' : '2px solid transparent',
                transition: 'all 0.2s ease',
                boxShadow: selectedColor === color ? `0 0 10px ${color}` : 'none'
              }}
            />
          ))}
        </div>
      </div>

      {selectedBook && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '90%',
              maxWidth: '500px',
              maxHeight: '90vh',
              background: 'rgba(40,40,50,0.85)',
              backdropFilter: 'blur(8px)',
              borderRadius: '16px',
              padding: '32px',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '200px',
                  height: '280px',
                  borderRadius: '8px',
                  background: selectedBook.color,
                  boxShadow: `0 8px 24px ${selectedBook.color}40`,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: 'rotate(-2deg)'
                }}
              >
                <span style={{
                  color: '#fff',
                  fontSize: '18px',
                  fontWeight: 600,
                  textAlign: 'center',
                  padding: '0 20px',
                  transform: 'rotate(90deg)',
                  whiteSpace: 'nowrap'
                }}>
                  {selectedBook.title}
                </span>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{
                  fontSize: '24px',
                  marginBottom: '8px',
                  color: '#fff',
                  wordBreak: 'break-word'
                }}>
                  {selectedBook.title}
                </h2>
                <p style={{
                  fontSize: '15px',
                  color: '#aaa',
                  marginBottom: '16px'
                }}>
                  作者: {selectedBook.author}
                </p>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    fontSize: '13px',
                    color: '#aaa',
                    marginBottom: '6px'
                  }}>
                    平均评分
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {renderStars(selectedBook.rating)}
                    <span style={{ color: '#FFD700', fontWeight: 600 }}>
                      {selectedBook.rating > 0 ? selectedBook.rating.toFixed(1) : '暂无'}
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{
                    fontSize: '13px',
                    color: '#aaa',
                    marginBottom: '6px'
                  }}>
                    我的评分
                  </div>
                  {renderStars(0, true)}
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '28px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              paddingTop: '20px'
            }}>
              <div style={{
                fontSize: '15px',
                color: '#ddd',
                marginBottom: '12px',
                fontWeight: 600
              }}>
                💬 评论区
              </div>

              <div style={{
                maxHeight: '150px',
                overflowY: 'auto',
                marginBottom: '16px',
                paddingRight: '8px'
              }}>
                {selectedBook.comments && selectedBook.comments.length > 0 ? (
                  selectedBook.comments.map((comment) => (
                    <div
                      key={comment.id}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        marginBottom: '8px'
                      }}
                    >
                      <p style={{
                        fontSize: '14px',
                        color: '#ccc',
                        lineHeight: 1.5
                      }}>
                        {comment.text}
                      </p>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#666', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
                    还没有评论，快来发表第一条吧！
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value.slice(0, 200))}
                  placeholder="写下你的书评... (200字以内)"
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    fontSize: '14px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    outline: 'none',
                    resize: 'none',
                    height: '60px',
                    transition: 'all 0.2s ease',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4A90D9';
                    e.target.style.boxShadow = '0 0 0 2px rgba(74,144,217,0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  onClick={handleComment}
                  disabled={!newComment.trim() || newComment.length > 200}
                  style={{
                    padding: '0 20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #4A90D9, #357ABD)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: !newComment.trim() || newComment.length > 200 ? 'not-allowed' : 'pointer',
                    opacity: !newComment.trim() || newComment.length > 200 ? 0.5 : 1,
                    transition: 'all 0.2s ease',
                    height: '60px'
                  }}
                >
                  发送
                </button>
              </div>
              <div style={{
                fontSize: '12px',
                color: '#666',
                marginTop: '6px',
                textAlign: 'right'
              }}>
                {newComment.length}/200
              </div>
            </div>

            <button
              onClick={closeModal}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#fff',
                fontSize: '18px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                e.currentTarget.style.transform = 'rotate(90deg)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.transform = 'rotate(0deg)';
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(40,40,50,0.8)',
        backdropFilter: 'blur(10px)',
        padding: '8px 20px',
        borderRadius: '20px',
        fontSize: '13px',
        color: '#aaa',
        border: '1px solid rgba(255,255,255,0.05)',
        zIndex: 50
      }}>
        🖱️ 拖拽旋转视角 | 滚轮缩放 | 点击书籍查看详情
      </div>
    </div>
  );
};

export default App;
