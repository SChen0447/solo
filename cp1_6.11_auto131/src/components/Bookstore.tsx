import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Book, Fragment, LogEntry } from '../App';
import { v4 as uuidv4 } from 'uuid';

interface BookstoreProps {
  books: Book[];
  fragments: Fragment[];
  setFragments: React.Dispatch<React.SetStateAction<Fragment[]>>;
  collection: Book[];
  addLogEntry: (entry: LogEntry) => void;
}

const typeColors: Record<string, string> = {
  '经': '#C41E3A',
  '史': '#1E3A5F',
  '子': '#2D5A27',
  '集': '#8B4513'
};

const Bookstore = ({ books, fragments, setFragments, collection, addLogEntry }: BookstoreProps) => {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [spiritMessage, setSpiritMessage] = useState<string>('欢迎光临翰墨斋，道友欲寻觅何卷典籍？不妨从架上取下一观。');
  const [displayedMessage, setDisplayedMessage] = useState('');
  const [typing, setTyping] = useState(false);
  const [droppedFragments, setDroppedFragments] = useState<Fragment[]>([]);
  const [draggingFragment, setDraggingFragment] = useState<Fragment | null>(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [showSuccess, setShowSuccess] = useState(false);
  const [flyPages, setFlyPages] = useState<Array<{ id: number; x: number; y: number; rotate: number }>>([]);
  const [recommend, setRecommend] = useState<{ book: Book; comment: string; cost: number; recommendation: string } | null>(null);
  const [showRecommend, setShowRecommend] = useState(false);

  const counterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!spiritMessage) return;
    setDisplayedMessage('');
    setTyping(true);
    let i = 0;
    const interval = setInterval(() => {
      if (i < spiritMessage.length) {
        setDisplayedMessage(spiritMessage.slice(0, i + 1));
        i++;
      } else {
        setTyping(false);
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [spiritMessage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecommendation();
    }, 8000);
    return () => clearTimeout(timer);
  }, [collection]);

  const fetchRecommendation = async () => {
    try {
      const ownedTypes = collection.map(b => b.type).join(',');
      const ownedIds = collection.map(b => b.id).join(',');
      const res = await fetch(`/api/recommend?ownedTypes=${ownedTypes}&ownedIds=${ownedIds}`);
      const data = await res.json();
      if (data.book) {
        setRecommend(data);
        setShowRecommend(true);
      }
    } catch (e) {
      console.error('获取推荐失败:', e);
    }
  };

  const handleBookClick = (book: Book) => {
    if (collection.find(b => b.id === book.id)) {
      setSpiritMessage(`道友已藏有《${book.title}》，可于藏书志中细细品读。`);
      return;
    }
    setSelectedBook(book);
    setDroppedFragments([]);
    const required = book.fragmentsRequired;
    const available = required.filter(r => fragments.find(f => f.id === r));
    const missing = required.filter(r => !fragments.find(f => f.id === r));
    let msg = `道友慧眼识珠！此《${book.title}》乃「${book.type}」部珍本。`;
    msg += `若欲得之，需献碎玉${required.length}枚，分别为 ${required.map(n => `${n}号`).join('、')}。`;
    if (missing.length > 0) {
      msg += `然${missing.map(n => `${n}号`).join('、')}尚缺，万望道友搜求补齐。`;
    } else {
      msg += `所需碎玉道友皆已备齐，不妨取出放入兑换之槽，小书灵即为君呈书。`;
    }
    setSpiritMessage(msg);
  };

  const handleFragmentDragStart = (e: React.MouseEvent, fragment: Fragment) => {
    if (selectedBook && !selectedBook.fragmentsRequired.includes(fragment.id)) return;
    if (droppedFragments.find(f => f.id === fragment.id)) return;
    setDraggingFragment(fragment);
    setDragPosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingFragment) {
      setDragPosition({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!draggingFragment || !counterRef.current) {
      setDraggingFragment(null);
      return;
    }
    const rect = counterRef.current.getBoundingClientRect();
    const slotElements = document.querySelectorAll('.exchange-slot');
    let dropped = false;
    slotElements.forEach((slot, idx) => {
      if (dropped) return;
      const slotRect = slot.getBoundingClientRect();
      if (
        e.clientX >= slotRect.left && e.clientX <= slotRect.right &&
        e.clientY >= slotRect.top && e.clientY <= slotRect.bottom
      ) {
        if (idx === droppedFragments.length && selectedBook?.fragmentsRequired.includes(draggingFragment.id)) {
          setDroppedFragments(prev => [...prev, draggingFragment]);
          dropped = true;
          setTimeout(() => checkExchange([...droppedFragments, draggingFragment]), 150);
        }
      }
    });
    if (!dropped) {
    }
    setDraggingFragment(null);
  };

  const checkExchange = async (dropped: Fragment[]) => {
    if (!selectedBook) return;
    if (dropped.length === selectedBook.fragmentsRequired.length) {
      const fragmentIds = dropped.map(f => f.id);
      try {
        const res = await fetch('/api/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId: selectedBook.id, fragmentIds })
        });
        const data = await res.json();
        if (data.success) {
          performSuccessAnimation();
          setTimeout(() => {
            addLogEntry({
              id: uuidv4(),
              book: data.book,
              timestamp: data.timestamp,
              comment: data.comment
            });
            setSpiritMessage(`妙哉！《${selectedBook.title}》自此归于道友藏书楼。${data.comment}`);
            setSelectedBook(null);
            setShowSuccess(false);
          }, 1200);
        } else {
          setSpiritMessage(`啊呀...${data.message}`);
          const fragmentIdsToReturn = dropped.map(f => f.id);
          setDroppedFragments([]);
        }
      } catch (e) {
        console.error('交换失败:', e);
      }
    }
  };

  const performSuccessAnimation = () => {
    setShowSuccess(true);
    const pages = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 800,
      y: 300 + Math.random() * 400,
      rotate: (Math.random() - 0.5) * 720
    }));
    setFlyPages(pages);
    setTimeout(() => setFlyPages([]), 1200);
  };

  const handleAcceptRecommend = async () => {
    if (!recommend) return;
    const generalFragments = fragments.slice(0, recommend.cost);
    if (generalFragments.length < recommend.cost) {
      setSpiritMessage(`道友碎玉不足三枚，尚需再搜集${recommend.cost - generalFragments.length}枚方能获得推荐珍本。`);
      return;
    }
    try {
      const requiredIds = recommend.book.fragmentsRequired;
      const res = await fetch('/api/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: recommend.book.id, fragmentIds: requiredIds })
      });
      const data = await res.json();
      if (data.success || recommend.book) {
        performSuccessAnimation();
        setShowRecommend(false);
        const bookToAdd = data.book || recommend.book;
        const comment = data.comment || recommend.comment;
        setTimeout(() => {
          addLogEntry({
            id: uuidv4(),
            book: bookToAdd,
            timestamp: new Date().toISOString(),
            comment: comment
          });
          setFragments(prev => prev.slice(recommend.cost));
          setSpiritMessage(`恭喜道友获得推荐珍本《${bookToAdd.title}》！${comment}`);
          setShowSuccess(false);
        }, 1200);
      }
    } catch (e) {
      console.error('获取推荐书失败:', e);
    }
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 60px)',
        background: 'linear-gradient(180deg, #f4e4c1 0%, #e8d4a8 50%, #dcc496 100%)',
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '"KaiTi", "STKaiti", "楷体", serif'
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <LampDecorations />
      <Bookshelf books={books} collection={collection} onBookClick={handleBookClick} />
      <div
        ref={counterRef}
        style={{
          marginTop: '30px',
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '20px',
          alignItems: 'center',
          padding: '20px',
          maxWidth: '1400px',
          margin: '30px auto 0'
        }}
      >
        <div style={{ gridColumn: 'span 3', position: 'relative', height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BookSpirit />
        </div>
        <div style={{ gridColumn: 'span 6', position: 'relative' }}>
          <Counter
            selectedBook={selectedBook}
            spiritMessage={displayedMessage}
            typing={typing}
            droppedFragments={droppedFragments}
            showSuccess={showSuccess}
            flyPages={flyPages}
          />
        </div>
        <div style={{ gridColumn: 'span 3', position: 'relative' }}>
          <FragmentArea
            fragments={fragments}
            selectedBook={selectedBook}
            droppedFragments={droppedFragments}
            onDragStart={handleFragmentDragStart}
          />
        </div>
      </div>
      <AnimatePresence>
        {draggingFragment && (
          <motion.div
            initial={{ scale: 1 }}
            animate={{
              x: dragPosition.x - 40,
              y: dragPosition.y - 50,
              scale: 0.8,
              rotate: draggingFragment.id * 7
            }}
            style={{
              position: 'fixed',
              width: '80px',
              height: '100px',
              zIndex: 1000,
              pointerEvents: 'none'
            }}
          >
            <FragmentPiece fragment={draggingFragment} />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showRecommend && recommend && (
          <RecommendationScroll
            recommend={recommend}
            onAccept={handleAcceptRecommend}
            onClose={() => setShowRecommend(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const LampDecorations = () => {
  return (
    <>
      {[0, 1, 2, 3].map(i => (
        <motion.div
          key={`lamp-${i}`}
          animate={{ rotate: [-5, 5, -5] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: '0',
            left: `${15 + i * 25}%`,
            transformOrigin: 'top center',
            zIndex: 5
          }}
        >
          <svg width="60" height="90" viewBox="0 0 60 90">
            <line x1="30" y1="0" x2="30" y2="20" stroke="#8b4513" strokeWidth="2" />
            <ellipse cx="30" cy="22" rx="8" ry="3" fill="#8b4513" />
            <path d="M18 28 Q30 22 42 28 L45 55 Q30 62 15 55 Z" fill="#cd853f" stroke="#8b4513" strokeWidth="1.5" />
            <ellipse cx="30" cy="55" rx="15" ry="4" fill="#654321" />
            <rect x="28" y="55" width="4" height="12" fill="#654321" />
            <ellipse cx="30" cy="67" rx="6" ry="2" fill="#8b4513" />
            <ellipse cx="30" cy="42" rx="10" ry="15" fill="url(#lampGlow)" opacity="0.8" />
            <defs>
              <radialGradient id="lampGlow">
                <stop offset="0%" stopColor="#fff8dc" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#ffd700" stopOpacity="0" />
              </radialGradient>
            </defs>
          </svg>
        </motion.div>
      ))}
    </>
  );
};

const Bookshelf = ({ books, collection, onBookClick }: { books: Book[]; collection: Book[]; onBookClick: (b: Book) => void }) => {
  return (
    <div style={{
      maxWidth: '1400px',
      margin: '60px auto 0',
      padding: '20px',
      perspective: '1500px'
    }}>
      <div style={{
        background: 'linear-gradient(180deg, #8b4513 0%, #654321 100%)',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.4), inset 0 2px 10px rgba(0,0,0,0.3)',
        border: '3px solid #d4af37'
      }}>
        {[0, 1, 2].map(row => (
          <div
            key={`row-${row}`}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: '12px',
              padding: '16px 8px',
              borderBottom: row < 2 ? '8px solid #654321' : 'none',
              marginBottom: row < 2 ? '8px' : '0',
              transform: 'rotateX(3deg)',
              transformStyle: 'preserve-3d'
            }}
          >
            {books.slice(row * 6, row * 6 + 6).map(book => (
              <BookSpine
                key={book.id}
                book={book}
                owned={!!collection.find(b => b.id === book.id)}
                onClick={() => onBookClick(book)}
              />
            ))}
          </div>
        ))}
      </div>
      <style>{`
        @media (max-width: 1280px) {
          .shelf-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
      `}</style>
    </div>
  );
};

const BookSpine = ({ book, owned, onClick }: { book: Book; owned: boolean; onClick: () => void }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.1, rotateY: -8, y: -10, z: 20 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      style={{
        height: '140px',
        background: `linear-gradient(90deg, ${book.coverColor} 0%, ${shadeColor(book.coverColor, -20)} 30%, ${book.coverColor} 70%, ${shadeColor(book.coverColor, -30)} 100%)`,
        borderRadius: '2px 8px 8px 2px',
        padding: '12px 8px',
        cursor: 'pointer',
        position: 'relative',
        boxShadow: owned
          ? '0 0 15px 3px #d4af37, 2px 4px 8px rgba(0,0,0,0.3)'
          : '2px 4px 8px rgba(0,0,0,0.3), inset -2px 0 4px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        transformStyle: 'preserve-3d',
        transition: 'all 0.3s ease',
        overflow: 'hidden'
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'repeating-linear-gradient(180deg, transparent 0, transparent 20px, rgba(0,0,0,0.06) 20px, rgba(0,0,0,0.06) 21px)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'radial-gradient(ellipse at 20% 30%, rgba(139,69,19,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(139,69,19,0.1) 0%, transparent 40%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        writingMode: 'vertical-rl',
        textOrientation: 'upright',
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#f4e4c1',
        textShadow: '1px 1px 0 #8b4513, -1px -1px 0 rgba(212,175,55,0.3)',
        letterSpacing: '3px',
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1
      }}>
        {book.title}
      </div>
      <div style={{
        fontSize: '11px',
        color: '#d4af37',
        textShadow: '1px 1px 0 #8b4513',
        border: '1px solid #d4af37',
        padding: '2px 6px',
        borderRadius: '3px',
        background: 'rgba(0,0,0,0.2)',
        zIndex: 1
      }}>
        {book.type}部
      </div>
      {owned && (
        <div style={{
          position: 'absolute',
          top: '4px',
          right: '4px',
          fontSize: '14px',
          zIndex: 2
        }}>
          ✨
        </div>
      )}
    </motion.div>
  );
};

const BookSpirit = () => {
  return (
    <div style={{ position: 'relative', width: '200px', height: '200px' }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 720, ease: 'linear' }}
        style={{ position: 'absolute', inset: 0 }}
      >
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ repeat: Infinity, duration: 3 + (i % 5), delay: i * 0.1 }}
            style={{
              position: 'absolute',
              width: '60px',
              height: '80px',
              left: '50%',
              top: '50%',
              background: 'linear-gradient(135deg, rgba(255,248,220,0.8) 0%, rgba(245,222,179,0.6) 100%)',
              border: '1px solid rgba(139,69,19,0.2)',
              transform: `translate(-50%, -50%) rotate(${i * 18}deg) translateY(${30 + (i % 3) * 10}px)`,
              transformOrigin: 'center center',
              borderRadius: '2px 6px 6px 2px',
              boxShadow: '0 0 8px rgba(212,175,55,0.3)',
              opacity: 0.6
            }}
          />
        ))}
      </motion.div>
      <div style={{
        position: 'absolute',
        inset: '40px',
        background: 'radial-gradient(circle, rgba(255,248,220,0.9) 0%, rgba(255,215,0,0.5) 40%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(2px)',
        animation: 'pulse 2s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '36px',
        zIndex: 10
      }}>
        📚
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

const Counter = ({ selectedBook, spiritMessage, typing, droppedFragments, showSuccess, flyPages }: {
  selectedBook: Book | null;
  spiritMessage: string;
  typing: boolean;
  droppedFragments: Fragment[];
  showSuccess: boolean;
  flyPages: Array<{ id: number; x: number; y: number; rotate: number }>;
}) => {
  return (
    <div style={{
      position: 'relative',
      background: 'radial-gradient(ellipse at center, #cd853f 0%, #a0522d 50%, #8b4513 100%)',
      borderRadius: '8px',
      padding: '24px',
      border: '4px solid #654321',
      boxShadow: '0 10px 40px rgba(0,0,0,0.3), inset 0 2px 10px rgba(255,215,0,0.2)',
      minHeight: '320px'
    }}>
      <div style={{
        position: 'absolute',
        top: '8px',
        left: '8px',
        right: '8px',
        height: '3px',
        background: 'linear-gradient(90deg, transparent, #d4af37, transparent)',
        borderRadius: '2px'
      }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ minHeight: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {selectedBook ? (
            <AnimatePresence mode="wait">
              {!showSuccess && (
                <motion.div
                  key={selectedBook.id}
                  initial={{ scale: 0.1, x: -300, y: -300, opacity: 0, rotate: -30 }}
                  animate={{ scale: 1, x: 0, y: 0, opacity: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 150, damping: 15, duration: 0.6 }}
                  style={{
                    width: '120px',
                    height: '160px',
                    background: `linear-gradient(90deg, ${selectedBook.coverColor} 0%, ${shadeColor(selectedBook.coverColor, -15)} 50%, ${selectedBook.coverColor} 100%)`,
                    borderRadius: '4px 10px 10px 4px',
                    padding: '16px 8px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.5), 0 0 20px rgba(212,175,55,0.3)',
                    border: '2px solid #d4af37',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{
                    writingMode: 'vertical-rl',
                    textOrientation: 'upright',
                    fontSize: '26px',
                    fontWeight: 'bold',
                    color: '#f4e4c1',
                    textShadow: '1px 1px 0 #8b4513, 0 0 10px rgba(212,175,55,0.5)',
                    letterSpacing: '5px'
                  }}>
                    {selectedBook.title}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#d4af37',
                    border: '1px solid #d4af37',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'rgba(0,0,0,0.2)'
                  }}>
                    {selectedBook.type}部
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            <div style={{
              color: '#f4e4c1',
              fontSize: '18px',
              opacity: 0.7,
              fontStyle: 'italic',
              textAlign: 'center'
            }}>
              ~ 请从架上取书，置于柜台观览 ~
            </div>
          )}
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          padding: '8px'
        }}>
          {(selectedBook?.fragmentsRequired || []).map((_, idx) => (
            <div
              key={`slot-${idx}`}
              className="exchange-slot"
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, #3d2817 0%, #1a0f08 100%)',
                border: '4px solid #d4af37',
                boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.6), 0 0 10px rgba(212,175,55,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}
            >
              {droppedFragments[idx] && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{
                    scale: 1,
                    rotate: 0,
                    boxShadow: [
                      '0 0 0px #ffd700',
                      '0 0 30px #ffd700',
                      '0 0 5px #ffd700'
                    ]
                  }}
                  transition={{
                    scale: { type: 'spring', stiffness: 300 },
                    boxShadow: { duration: 0.6, repeat: 2 }
                  }}
                  style={{
                    width: '48px',
                    height: '48px'
                  }}
                >
                  <FragmentPiece fragment={droppedFragments[idx]} small />
                </motion.div>
              )}
              {!droppedFragments[idx] && (
                <span style={{ color: '#d4af37', opacity: 0.5, fontSize: '20px' }}>
                  {selectedBook?.fragmentsRequired[idx]}
                </span>
              )}
            </div>
          ))}
        </div>
        <div style={{
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid rgba(212,175,55,0.4)',
          borderRadius: '6px',
          padding: '14px 18px',
          minHeight: '64px',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: '-10px',
            left: '20px',
            background: '#8b4513',
            padding: '2px 12px',
            borderRadius: '4px',
            color: '#ffd700',
            fontSize: '13px',
            border: '1px solid #d4af37'
          }}>
            书灵曰
          </div>
          <p style={{
            color: '#fff8dc',
            fontSize: '17px',
            lineHeight: 1.6,
            marginTop: '4px'
          }}>
            {spiritMessage}
            {typing && <span style={{
              display: 'inline-block',
              width: '2px',
              height: '18px',
              background: '#ffd700',
              marginLeft: '2px',
              animation: 'blink 0.8s infinite'
            }} />}
          </p>
        </div>
      </div>
      <AnimatePresence>
        {flyPages.map(page => (
          <motion.div
            key={page.id}
            initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
            animate={{ x: page.x, y: page.y, rotate: page.rotate, opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: '50%',
              top: '30%',
              width: '40px',
              height: '55px',
              background: 'linear-gradient(135deg, #fff8dc, #f5deb3)',
              border: '1px solid rgba(139,69,19,0.3)',
              borderRadius: '2px 4px 4px 2px',
              pointerEvents: 'none',
              zIndex: 100
            }}
          />
        ))}
      </AnimatePresence>
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

const FragmentArea = ({ fragments, selectedBook, droppedFragments, onDragStart }: {
  fragments: Fragment[];
  selectedBook: Book | null;
  droppedFragments: Fragment[];
  onDragStart: (e: React.MouseEvent, f: Fragment) => void;
}) => {
  const displayFragments = fragments.slice(0, 6);
  while (displayFragments.length < 6) {
    displayFragments.push({ id: -1 - displayFragments.length, char: '' });
  }

  return (
    <div style={{
      background: 'rgba(139,69,19,0.15)',
      border: '2px dashed #8b4513',
      borderRadius: '8px',
      padding: '16px',
      position: 'relative'
    }}>
      <div style={{
        position: 'absolute',
        top: '-14px',
        left: '16px',
        background: '#f4e4c1',
        padding: '2px 12px',
        color: '#8b4513',
        fontSize: '15px',
        fontWeight: 'bold',
        fontFamily: '"KaiTi", serif'
      }}>
        📜 碎玉阁
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px',
        marginTop: '8px'
      }}>
        {displayFragments.map((fragment, idx) => {
          const isUsed = droppedFragments.find(f => f.id === fragment.id);
          const isRequired = selectedBook?.fragmentsRequired.includes(fragment.id);
          const canDrag = fragment.id > 0 && !isUsed && isRequired;
          return (
            <div
              key={`frag-display-${idx}`}
              onMouseDown={(e) => canDrag && onDragStart(e, fragment)}
              style={{
                width: '80px',
                height: '100px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: fragment.id < 0 ? 0.2 : (isUsed ? 0.3 : 1),
                cursor: canDrag ? 'grab' : 'default',
                filter: canDrag ? 'drop-shadow(0 0 8px rgba(212,175,55,0.6))' : 'none',
                transform: canDrag ? 'scale(1)' : 'scale(0.95)',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              {fragment.id > 0 && (
                <FragmentPiece fragment={fragment} highlight={!!canDrag} />
              )}
            </div>
          );
        })}
      </div>
      <div style={{
        marginTop: '12px',
        textAlign: 'center',
        fontSize: '12px',
        color: '#8b4513',
        opacity: 0.7
      }}>
        共 {fragments.length} 枚碎玉
        {selectedBook && (
          <div style={{ marginTop: '4px', color: '#d4af37' }}>
            需要: {selectedBook.fragmentsRequired.join(' · ')} 号
          </div>
        )}
      </div>
    </div>
  );
};

const FragmentPiece = ({ fragment, small, highlight }: { fragment: Fragment; small?: boolean; highlight?: boolean }) => {
  const size = small ? 48 : 80;
  const fontSize = small ? 18 : 28;
  const clipPath = `polygon(
    ${10 + Math.random() * 5}% ${5 + Math.random() * 5}%,
    ${90 - Math.random() * 5}% ${5 + Math.random() * 8}%,
    ${95 - Math.random() * 3}% ${30 + Math.random() * 10}%,
    ${100 - Math.random() * 5}% ${60 + Math.random() * 10}%,
    ${85 - Math.random() * 8}% ${92 + Math.random() * 5}%,
    ${50 + Math.random() * 10}% ${100 - Math.random() * 3}%,
    ${10 + Math.random() * 8}% ${95 - Math.random() * 5}%,
    ${5 + Math.random() * 5}% ${55 + Math.random() * 10}%,
    ${3 + Math.random() * 4}% ${25 + Math.random() * 10}%
  )`;

  return (
    <div
      style={{
        width: '100%',
        height: `${size * 1.25}px`,
        position: 'relative',
        clipPath,
        background: highlight
          ? 'linear-gradient(135deg, #fff8dc 0%, #ffe4a0 40%, #ffd700 100%)'
          : 'linear-gradient(135deg, #f5deb3 0%, #deb887 40%, #d2b48c 100%)',
        boxShadow: highlight
          ? 'inset 0 0 15px rgba(255,165,0,0.3), 0 2px 8px rgba(0,0,0,0.2)'
          : 'inset 0 0 15px rgba(139,69,19,0.2), 0 2px 8px rgba(0,0,0,0.2)'
      }}
    >
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(circle at ${20 + Math.random() * 10}% ${15 + Math.random() * 10}%, rgba(139,69,19,0.25) 0%, transparent 12%),
          radial-gradient(circle at ${70 + Math.random() * 10}% ${80 + Math.random() * 10}%, rgba(139,69,19,0.2) 0%, transparent 15%),
          radial-gradient(circle at ${40 + Math.random() * 15}% ${60 + Math.random() * 15}%, rgba(139,69,19,0.15) 0%, transparent 10%)
        `,
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: small ? '2px' : '4px'
      }}>
        <span style={{
          fontFamily: '"STKaiti", "KaiTi", "楷体", serif',
          fontWeight: 'bold',
          color: '#8b4513',
          fontSize: `${fontSize}px`,
          textShadow: highlight ? '0 0 10px rgba(255,215,0,0.8)' : 'none'
        }}>
          {fragment.char}
        </span>
        <span style={{
          fontFamily: 'serif',
          color: '#654321',
          fontSize: `${small ? 10 : 14}px`,
          opacity: 0.8
        }}>
          {fragment.id}
        </span>
      </div>
    </div>
  );
};

const RecommendationScroll = ({ recommend, onAccept, onClose }: {
  recommend: { book: Book; comment: string; cost: number; recommendation: string };
  onAccept: () => void;
  onClose: () => void;
}) => {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        right: '30px',
        top: '120px',
        width: '320px',
        background: 'linear-gradient(180deg, rgba(255,248,220,0.97) 0%, rgba(245,222,179,0.97) 100%)',
        border: '3px solid #d4af37',
        borderRadius: '4px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.4), 0 0 30px rgba(212,175,55,0.2)',
        overflow: 'hidden',
        zIndex: 50,
        fontFamily: '"KaiTi", "STKaiti", serif'
      }}
    >
      <div style={{
        padding: '16px 20px',
        background: 'linear-gradient(90deg, rgba(212,175,55,0.3) 0%, transparent 50%, rgba(212,175,55,0.3) 100%)',
        borderBottom: '2px solid rgba(139,69,19,0.3)'
      }}>
        <div style={{
          textAlign: 'center',
          fontSize: '18px',
          fontWeight: 'bold',
          background: 'linear-gradient(180deg, #d4af37 0%, #b8860b 50%, #d4af37 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '3px'
        }}>
          ✦ 书灵荐书 ✦
        </div>
      </div>
      <div style={{ padding: '16px 20px' }}>
        <div style={{
          display: 'flex',
          gap: '14px',
          alignItems: 'flex-start'
        }}>
          <div style={{
            width: '70px',
            height: '95px',
            flexShrink: 0,
            background: `linear-gradient(90deg, ${recommend.book.coverColor} 0%, ${shadeColor(recommend.book.coverColor, -15)} 100%)`,
            borderRadius: '2px 6px 6px 2px',
            padding: '8px 4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #d4af37',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            <span style={{
              writingMode: 'vertical-rl',
              fontSize: '16px',
              color: '#f4e4c1',
              fontWeight: 'bold',
              textShadow: '1px 1px 0 #8b4513',
              letterSpacing: '2px'
            }}>
              {recommend.book.title}
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'inline-block',
              fontSize: '12px',
              color: '#d4af37',
              border: '1px solid #d4af37',
              padding: '1px 6px',
              borderRadius: '3px',
              background: '#fff8dc',
              marginBottom: '6px'
            }}>
              {recommend.book.type}部
            </div>
            <div style={{
              fontSize: '14px',
              color: '#8b4513',
              lineHeight: 1.6,
              marginBottom: '8px'
            }}>
              {recommend.book.description}
            </div>
          </div>
        </div>
        <p style={{
          marginTop: '12px',
          padding: '10px 12px',
          background: 'rgba(212,175,55,0.15)',
          borderLeft: '3px solid #d4af37',
          fontSize: '14px',
          color: '#654321',
          fontStyle: 'italic',
          lineHeight: 1.6,
          borderRadius: '0 4px 4px 0'
        }}>
          「{recommend.recommendation}」
        </p>
        <div style={{
          display: 'flex',
          gap: '10px',
          marginTop: '14px'
        }}>
          <button
            onClick={onAccept}
            style={{
              flex: 1,
              padding: '10px',
              background: 'linear-gradient(180deg, #d4af37 0%, #b8860b 100%)',
              border: '2px solid #8b4513',
              borderRadius: '4px',
              color: '#fff8dc',
              fontFamily: '"KaiTi", serif',
              fontSize: '15px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)';
              (e.target as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.target as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
            }}
          >
            以 3 枚碎玉换之
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '10px 14px',
              background: 'linear-gradient(180deg, #cd853f 0%, #8b4513 100%)',
              border: '2px solid #654321',
              borderRadius: '4px',
              color: '#fff8dc',
              fontFamily: '"KaiTi", serif',
              fontSize: '15px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
          >
            再议
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const shadeColor = (color: string, percent: number): string => {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000
    + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000
    + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100
    + (B < 255 ? B < 1 ? 0 : B : 255)
  ).toString(16).slice(1);
};

export default Bookstore;
