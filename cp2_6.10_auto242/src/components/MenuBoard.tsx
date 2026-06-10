import { useState, useEffect, useRef } from 'react';
import type { Dish, DishStatus } from '../types';

interface MenuBoardProps {
  dishes: Dish[];
  onStatusChange: (id: string, status: DishStatus) => void;
  onCardClick: (id: string) => void;
}

const STATUS_CYCLE: DishStatus[] = ['available', 'limited', 'soldout'];

const STATUS_LABELS: Record<DishStatus, string> = {
  available: '有货',
  limited: '限量',
  soldout: '售罄',
};

const STATUS_COLORS: Record<DishStatus, string> = {
  available: '#4a8b4a',
  limited: '#c17a47',
  soldout: '#888888',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function MenuBoard({ dishes, onStatusChange, onCardClick }: MenuBoardProps) {
  const [bouncingId, setBouncingId] = useState<string | null>(null);
  const [hourglassId, setHourglassId] = useState<string | null>(null);
  const timersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    return () => {
      timersRef.current.forEach(t => window.clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  const clearTimer = (id: string, key: string) => {
    const fullKey = `${id}-${key}`;
    const t = timersRef.current.get(fullKey);
    if (t) {
      window.clearTimeout(t);
      timersRef.current.delete(fullKey);
    }
  };

  const setTimer = (id: string, key: string, fn: () => void, delay: number) => {
    clearTimer(id, key);
    timersRef.current.set(`${id}-${key}`, window.setTimeout(fn, delay));
  };

  const handleStatusBtnClick = (e: React.MouseEvent, dish: Dish) => {
    e.stopPropagation();
    const currentIdx = STATUS_CYCLE.indexOf(dish.status);
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];

    setBouncingId(dish.id);
    setTimer(dish.id, 'bounce', () => setBouncingId(prev => (prev === dish.id ? null : prev)), 500);

    if (nextStatus === 'soldout') {
      setHourglassId(dish.id);
      setTimer(dish.id, 'hourglass', () => setHourglassId(prev => (prev === dish.id ? null : prev)), 1000);
      setTimer(dish.id, 'status', () => onStatusChange(dish.id, nextStatus), 1000);
    } else {
      onStatusChange(dish.id, nextStatus);
    }
  };

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '32px 24px 48px',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          marginBottom: 28,
        }}
      >
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: '#2c2c2c',
            letterSpacing: 2,
            marginBottom: 6,
          }}
        >
          今日菜品看板
        </h1>
        <p style={{ fontSize: 14, color: '#7a6a5a' }}>
          点击卡片右上角按钮切换状态 · 点击卡片查看详情
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 20,
        }}
      >
        {dishes.map(dish => {
          const isBouncing = bouncingId === dish.id;
          const showHourglass = hourglassId === dish.id;
          const isSoldout = dish.status === 'soldout';

          return (
            <div
              key={dish.id}
              onClick={() => onCardClick(dish.id)}
              style={{
                position: 'relative',
                backgroundColor: '#ffffff',
                borderRadius: 16,
                padding: 16,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(44, 44, 44, 0.08)',
                transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease, opacity 0.3s ease',
                transform: isBouncing ? 'translateY(-50px)' : 'translateY(0)',
                opacity: isSoldout ? 0.6 : 1,
                overflow: 'hidden',
                animation: isBouncing ? undefined : undefined,
              }}
              onMouseEnter={(e) => {
                if (!isBouncing) {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(44, 44, 44, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isBouncing) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(44, 44, 44, 0.08)';
                }
              }}
            >
              {isSoldout && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(136, 136, 136, 0.25)',
                    borderRadius: 16,
                    zIndex: 2,
                    pointerEvents: 'none',
                    transition: 'background-color 0.3s ease',
                  }}
                />
              )}
              {showHourglass && (
                <div
                  style={{
                    position: 'absolute',
                    right: 16,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 32,
                    zIndex: 5,
                    animation: 'hourglass-spin 1s ease-in-out',
                  }}
                >
                  ⏳
                </div>
              )}

              <button
                onClick={(e) => handleStatusBtnClick(e, dish)}
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: STATUS_COLORS[dish.status],
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  transition: 'all 0.3s ease',
                }}
                title={`当前: ${STATUS_LABELS[dish.status]}，点击切换`}
              >
                {STATUS_LABELS[dish.status].charAt(0)}
              </button>

              <div
                style={{
                  width: '100%',
                  aspectRatio: '4 / 3',
                  borderRadius: 10,
                  overflow: 'hidden',
                  backgroundColor: '#eee',
                  marginBottom: 12,
                  position: 'relative',
                }}
              >
                <img
                  src={dish.imageUrl}
                  alt={dish.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.3s ease, filter 0.3s ease',
                    filter: isSoldout ? 'grayscale(80%)' : 'none',
                  }}
                  loading="lazy"
                />
              </div>

              <div style={{ position: 'relative', zIndex: 3 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}
                >
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: isSoldout ? '#888' : '#2c2c2c',
                      transition: 'color 0.3s ease',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '65%',
                    }}
                  >
                    {dish.name}
                  </h3>
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: isSoldout ? '#aaa' : '#c17a47',
                      transition: 'color 0.3s ease',
                    }}
                  >
                    ¥{dish.price}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '2px 10px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      backgroundColor: isSoldout ? '#e0e0e0' : (dish.status === 'limited' ? '#f5e0cc' : '#dff0df'),
                      color: STATUS_COLORS[dish.status],
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {STATUS_LABELS[dish.status]}
                    {dish.status === 'limited' && dish.stock > 0 && ` · 剩${dish.stock}份`}
                  </span>
                  <span style={{ fontSize: 11, color: '#aaa' }}>
                    库存 {dish.stock}/{dish.limited}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: '#aaa',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span>🕐</span>
                  <span>最后更新 {formatTime(dish.lastUpdated)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: repeat(4"] {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
        }
        @keyframes hourglass-spin {
          0% { transform: translateY(-50%) rotate(0deg); opacity: 1; }
          50% { transform: translateY(-50%) rotate(180deg); opacity: 1; }
          100% { transform: translateY(-50%) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
