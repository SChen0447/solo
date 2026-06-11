import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { PixelCard as PixelCardType, Danmaku, CELL_SIZE } from '../types';
import { getRandomColor } from '../utils/pixelData';
import { PixelCard } from './PixelCard';
import { v4 as uuidv4 } from 'uuid';

interface GalleryProps {
  cards: PixelCardType[];
  onLikeCard: (cardId: string) => void;
  onCopyCard: (card: PixelCardType) => void;
  onViewProfile: (userId: string, userName: string) => void;
  onReport: (cardId: string) => void;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.1;

export const Gallery: React.FC<GalleryProps> = ({
  cards,
  onLikeCard,
  onCopyCard,
  onViewProfile,
  onReport
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedCard, setSelectedCard] = useState<PixelCardType | null>(null);
  const [danmakus, setDanmakus] = useState<Danmaku[]>([]);
  const [danmakuInput, setDanmakuInput] = useState('');
  const [longPressCard, setLongPressCard] = useState<PixelCardType | null>(null);
  const [longPressPos, setLongPressPos] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
    setScale(prev => Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta)));
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.pixel-card')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.pixel-card')) return;
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setOffset({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleCardClick = useCallback((card: PixelCardType) => {
    if (isMobile) {
      setSelectedCard(card);
      return;
    }

    setClickCount(prev => prev + 1);
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);

    clickTimerRef.current = setTimeout(() => {
      setClickCount(0);
    }, 300);
  }, [isMobile]);

  useEffect(() => {
    if (clickCount === 2 && selectedCard) {
      setSelectedCard(null);
      setClickCount(0);
    } else if (clickCount === 2) {
      setClickCount(0);
    }
  }, [clickCount, selectedCard]);

  const handleCardDoubleClick = useCallback((card: PixelCardType) => {
    setSelectedCard(card);
    setDanmakus([]);
  }, []);

  const handleLongPress = useCallback((card: PixelCardType, e: React.MouseEvent | React.TouchEvent) => {
    let clientX: number, clientY: number;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      clientX = 0;
      clientY = 0;
    }
    setLongPressCard(card);
    setLongPressPos({ x: clientX, y: clientY });
  }, []);

  const closeLongPressMenu = () => {
    setLongPressCard(null);
  };

  const handleCopy = () => {
    if (longPressCard) {
      onCopyCard(longPressCard);
    }
    closeLongPressMenu();
  };

  const handleViewProfile = () => {
    if (longPressCard) {
      onViewProfile(longPressCard.authorId, longPressCard.authorName);
    }
    closeLongPressMenu();
  };

  const handleReport = () => {
    if (longPressCard) {
      onReport(longPressCard.id);
    }
    closeLongPressMenu();
  };

  const closeModal = () => {
    setSelectedCard(null);
    setDanmakus([]);
    setDanmakuInput('');
  };

  const sendDanmaku = () => {
    if (!danmakuInput.trim() || !selectedCard) return;

    const newDanmaku: Danmaku = {
      id: uuidv4(),
      text: danmakuInput,
      color: Math.random() > 0.5 ? '#fff' : getRandomColor(),
      duration: 2 + Math.random() * 2,
      top: 10 + Math.random() * 60,
      createdAt: Date.now()
    };

    setDanmakus(prev => [...prev, newDanmaku]);
    onLikeCard(selectedCard.id);
    setDanmakuInput('');

    setTimeout(() => {
      setDanmakus(prev => prev.filter(d => d.id !== newDanmaku.id));
    }, newDanmaku.duration * 1000 + 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendDanmaku();
    }
  };

  const visibleCards = useMemo(() => {
    if (!containerRef.current) return cards;
    const rect = containerRef.current.getBoundingClientRect();
    const cellSize = CELL_SIZE * scale;

    return cards.filter(card => {
      const x = offset.x + card.gridX * cellSize;
      const y = offset.y + card.gridY * cellSize;
      return (
        x + cellSize > 0 &&
        x < rect.width &&
        y + cellSize > 0 &&
        y < rect.height
      );
    });
  }, [cards, offset, scale]);

  const cellSize = CELL_SIZE * scale;

  const gridLines = useMemo(() => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const lines: React.ReactNode[] = [];

    const startX = Math.floor(-offset.x / cellSize) * cellSize + offset.x;
    const startY = Math.floor(-offset.y / cellSize) * cellSize + offset.y;

    for (let x = startX; x < rect.width; x += cellSize) {
      lines.push(
        <div
          key={`v-${x}`}
          style={{
            position: 'absolute',
            left: x,
            top: 0,
            width: 1,
            height: '100%',
            backgroundColor: '#404060',
            opacity: 0.5
          }}
        />
      );
    }

    for (let y = startY; y < rect.height; y += cellSize) {
      lines.push(
        <div
          key={`h-${y}`}
          style={{
            position: 'absolute',
            left: 0,
            top: y,
            width: '100%',
            height: 1,
            backgroundColor: '#404060',
            opacity: 0.5
          }}
        />
      );
    }

    return lines;
  }, [offset, scale, cellSize]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#1a1a2e',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none'
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={closeLongPressMenu}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      >
        {gridLines}
      </div>

      {visibleCards.map(card => {
        const x = offset.x + card.gridX * cellSize;
        const y = offset.y + card.gridY * cellSize;
        return (
          <div
            key={card.id}
            className="pixel-card"
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: cellSize,
              height: cellSize,
              willChange: 'transform'
            }}
            onDoubleClick={() => handleCardDoubleClick(card)}
            onClick={() => handleCardClick(card)}
            onContextMenu={(e) => {
              e.preventDefault();
              handleLongPress(card, e);
            }}
          >
            <PixelCard
              card={card}
              cellSize={cellSize}
              onClick={() => {}}
              onLongPress={() => handleLongPress(card, { clientX: x, clientY: y } as React.MouseEvent)}
            />
          </div>
        );
      })}

      {selectedCard && (
        <div
          style={styles.modalOverlay}
          onClick={closeModal}
        >
          <div
            style={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.cardDetail}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(32, 1fr)',
                  width: 256,
                  height: 256,
                  border: '2px solid #fff',
                  borderRadius: 8,
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                {selectedCard.pixelData.flat().map((color, i) => (
                  <div
                    key={i}
                    style={{
                      backgroundColor: color === 'transparent' ? '#2a2a3e' : color
                    }}
                  />
                ))}

                {danmakus.map(danmaku => (
                  <div
                    key={danmaku.id}
                    style={{
                      position: 'absolute',
                      top: `${danmaku.top}%`,
                      color: danmaku.color,
                      opacity: 0.8,
                      fontSize: 14,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                      animation: `danmakuMove ${danmaku.duration}s linear forwards`,
                      pointerEvents: 'none',
                      zIndex: 10
                    }}
                  >
                    {danmaku.text}
                  </div>
                ))}
              </div>

              <div style={styles.cardInfo}>
                <div style={{ color: '#999', fontSize: 12 }}>作者: {selectedCard.authorName}</div>
                <div style={{ color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>❤️</span>
                  <span>{selectedCard.likes}</span>
                </div>
              </div>

              <input
                type="text"
                value={danmakuInput}
                onChange={(e) => setDanmakuInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="写下你的感受..."
                style={styles.danmakuInput}
              />

              <button style={styles.sendButton} onClick={sendDanmaku}>
                发送弹幕 + 点赞
              </button>
            </div>

            <button style={styles.closeButton} onClick={closeModal}>
              ✕
            </button>
          </div>
        </div>
      )}

      {longPressCard && (
        <div
          style={{
            position: 'fixed',
            left: longPressPos.x,
            top: longPressPos.y,
            backgroundColor: '#2a2a3e',
            borderRadius: 8,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            zIndex: 1000,
            overflow: 'hidden',
            animation: 'menuPopIn 0.2s ease-out'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button style={styles.menuItem} onClick={handleCopy}>
            📋 复制到画板
          </button>
          <button style={styles.menuItem} onClick={handleViewProfile}>
            👤 查看作者主页
          </button>
          <button style={{ ...styles.menuItem, color: '#ff4444' }} onClick={handleReport}>
            ⚠️ 举报
          </button>
        </div>
      )}

      <style>{`
        @keyframes danmakuMove {
          from {
            left: 100%;
            transform: translateX(0);
          }
          to {
            left: 0;
            transform: translateX(-100%);
          }
        }
        @keyframes menuPopIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes flashExpand {
          from {
            width: 0;
            height: 0;
            opacity: 1;
          }
          to {
            width: 600px;
            height: 600px;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    animation: 'fadeIn 0.3s ease'
  },
  modalCard: {
    position: 'relative',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 30,
    animation: 'cardZoomIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
  },
  cardDetail: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16
  },
  cardInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center'
  },
  danmakuInput: {
    width: '100%',
    padding: '10px 16px',
    backgroundColor: 'transparent',
    border: '1px solid #fff',
    borderRadius: 12,
    color: '#fff',
    fontSize: 14,
    outline: 'none'
  },
  sendButton: {
    width: '100%',
    padding: '10px 0',
    backgroundColor: '#00cc88',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  menuItem: {
    display: 'block',
    width: '100%',
    padding: '12px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: 14,
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
  }
};

export default Gallery;
