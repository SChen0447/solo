import { useState, useEffect, useRef } from 'react';
import type { CalendarEvent } from '../App';

interface CalendarPanelProps {
  year: number;
  onYearChange: (year: number) => void;
  events: CalendarEvent[];
  isLoading: boolean;
  onCompute: () => void;
}

const TYPE_META: Record<CalendarEvent['type'], { label: string; icon: string; color: string; bgColor: string }> = {
  solar_term: {
    label: '節氣',
    icon: '❋',
    color: '#2d6a4f',
    bgColor: 'rgba(45, 106, 79, 0.12)'
  },
  solar_eclipse: {
    label: '日食',
    icon: '🌑',
    color: '#8b0000',
    bgColor: 'rgba(139, 0, 0, 0.1)'
  },
  lunar_eclipse: {
    label: '月食',
    icon: '🌕',
    color: '#5c2a82',
    bgColor: 'rgba(92, 42, 130, 0.1)'
  },
  transit: {
    label: '凌日',
    icon: '★',
    color: '#8b5e3c',
    bgColor: 'rgba(139, 94, 60, 0.12)'
  }
};

const TYPE_FILTERS: { value: 'all' | CalendarEvent['type']; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'solar_term', label: '節氣' },
  { value: 'solar_eclipse', label: '日食' },
  { value: 'lunar_eclipse', label: '月食' },
  { value: 'transit', label: '凌日' }
];

function CalendarPanel({
  year,
  onYearChange,
  events,
  isLoading,
  onCompute
}: CalendarPanelProps) {
  const [filterType, setFilterType] = useState<'all' | CalendarEvent['type']>('all');
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);
  const [currentSeason, setCurrentSeason] = useState<string>('');
  const animRef = useRef<number[]>([]);

  const filteredEvents = events.filter(e =>
    filterType === 'all' ? true : e.type === filterType
  );

  const filteredEventsKey = filteredEvents.map(e => `${e.date}-${e.name}`).join('|');

  useEffect(() => {
    animRef.current.forEach(id => clearTimeout(id));
    animRef.current = [];
    setVisibleItems(new Set());
    if (filteredEvents.length > 0) {
      const startTimer = window.setTimeout(() => {
        filteredEvents.forEach((ev, i) => {
          const id = window.setTimeout(() => {
            setVisibleItems(prev => {
              const next = new Set(prev);
              next.add(`${ev.date}-${ev.name}-${i}`);
              return next;
            });
          }, i * 40);
          animRef.current.push(id);
        });
      }, 50);
      animRef.current.push(startTimer);
    }
    return () => {
      animRef.current.forEach(id => clearTimeout(id));
      animRef.current = [];
    };
  }, [filteredEventsKey]);

  useEffect(() => {
    const seasons = ['孟春', '仲春', '季春', '孟夏', '仲夏', '季夏', '孟秋', '仲秋', '季秋', '孟冬', '仲冬', '季冬'];
    const now = new Date();
    if (now.getFullYear() === year) {
      setCurrentSeason(seasons[now.getMonth()]);
    } else {
      setCurrentSeason('');
    }
  }, [year]);

  const formatYearDisplay = () => {
    if (year > 0) return `公元 ${year} 年`;
    return `公元前 ${-year} 年`;
  };

  const getMonthName = (month: number) => {
    const names = ['', '正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '臘月'];
    return names[month] || '';
  };

  const groupedByMonth: Record<string, CalendarEvent[]> = {};
  filteredEvents.forEach(ev => {
    const month = parseInt(ev.date.split('-')[1]);
    const key = String(month);
    if (!groupedByMonth[key]) groupedByMonth[key] = [];
    groupedByMonth[key].push(ev);
  });

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(245, 230, 211, 0.92)',
        border: '2px solid #8b5e3c',
        borderRadius: '16px',
        overflow: 'hidden',
        position: 'relative',
        minHeight: 0,
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3), inset 0 0 30px rgba(139, 94, 60, 0.1)',
        backdropFilter: 'blur(8px)'
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`,
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, padding: '16px 20px', borderBottom: '2px solid #8b5e3c', background: 'rgba(139, 94, 60, 0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2
            style={{
              fontFamily: '"Ma Shan Zheng", cursive',
              fontSize: 24,
              color: '#5c3d2e',
              letterSpacing: 6,
              margin: 0
            }}
          >
            【 曆 法 簿 】
          </h2>
          {currentSeason && (
            <span style={{
              fontFamily: '"ZCOOL XiaoWei", serif',
              fontSize: 12,
              color: '#8b5e3c',
              padding: '2px 10px',
              border: '1px solid #b8860b',
              borderRadius: 12,
              background: 'rgba(184, 134, 11, 0.1)'
            }}>
              今：{currentSeason}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => onYearChange(year - 100)}
            className="year-nav-btn"
            title="后退百年"
            style={navBtnStyle}
          >
            ◀◀
          </button>
          <button
            onClick={() => onYearChange(year - 10)}
            className="year-nav-btn"
            title="后退十年"
            style={navBtnStyle}
          >
            ◀
          </button>
          <button
            onClick={() => onYearChange(year - 1)}
            className="year-nav-btn"
            title="后退一年"
            style={navBtnStyle}
          >
            -
          </button>
          <div
            style={{
              fontFamily: '"Ma Shan Zheng", cursive',
              fontSize: 20,
              color: '#8b0000',
              padding: '4px 16px',
              minWidth: 150,
              textAlign: 'center',
              borderBottom: '2px solid #b8860b'
            }}
          >
            {formatYearDisplay()}
          </div>
          <button
            onClick={() => onYearChange(Math.min(2024, year + 1))}
            className="year-nav-btn"
            title="前进一年"
            style={navBtnStyle}
          >
            +
          </button>
          <button
            onClick={() => onYearChange(Math.min(2024, year + 10))}
            className="year-nav-btn"
            title="前进十年"
            style={navBtnStyle}
          >
            ▶
          </button>
          <button
            onClick={() => onYearChange(Math.min(2024, year + 100))}
            className="year-nav-btn"
            title="前进百年"
            style={navBtnStyle}
          >
            ▶▶
          </button>

          <div style={{ flex: 1 }} />

          <button
            onClick={onCompute}
            disabled={isLoading}
            style={{
              padding: '6px 14px',
              background: '#5c3d2e',
              color: '#f5e3c3',
              border: '1px solid #3a2817',
              borderRadius: 6,
              fontFamily: '"Ma Shan Zheng", cursive',
              fontSize: 13,
              cursor: isLoading ? 'progress' : 'pointer',
              letterSpacing: 3,
              transition: 'all 0.3s',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? '⟳ 推演中…' : '★ 推 演'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {TYPE_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilterType(f.value)}
              style={{
                padding: '5px 14px',
                borderRadius: 16,
                border: filterType === f.value ? '2px solid #b8860b' : '1px solid #b8860b80',
                background: filterType === f.value
                  ? 'rgba(184, 134, 11, 0.25)'
                  : 'rgba(255, 255, 255, 0.3)',
                color: filterType === f.value ? '#5c3d2e' : '#8b5e3c',
                fontFamily: '"ZCOOL XiaoWei", serif',
                fontSize: 12,
                cursor: 'pointer',
                letterSpacing: 2,
                transition: 'all 0.3s',
                fontWeight: filterType === f.value ? 600 : 400
              }}
            >
              {f.value !== 'all' && TYPE_META[f.value as CalendarEvent['type']].icon}{' '}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px 20px',
          position: 'relative',
          zIndex: 1,
          minHeight: 0
        }}
      >
        {isLoading ? (
          <div style={loadingStyle}>
            <div style={{
              fontSize: 18,
              color: '#8b5e3c',
              fontFamily: '"Ma Shan Zheng", cursive',
              letterSpacing: 6,
              marginBottom: 12
            }}>
              ⟳ 司天監推演中…
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#b8860b',
                    animation: `pulse 1.2s ${i * 0.15}s infinite ease-in-out`
                  }}
                />
              ))}
            </div>
            <style>{`
              @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 0.4; }
                50% { transform: scale(1.4); opacity: 1; }
              }
            `}</style>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div style={{ ...loadingStyle, color: '#8b7959' }}>
            <div style={{ fontFamily: '"Ma Shan Zheng", cursive', fontSize: 20, letterSpacing: 4 }}>
              ○ 未有曆象
            </div>
            <div style={{ fontFamily: '"ZCOOL XiaoWei", serif', fontSize: 13, marginTop: 8 }}>
              請輸入年份並點擊「推演」按鈕
            </div>
          </div>
        ) : (
          Object.entries(groupedByMonth).map(([monthKey, monthEvents]) => (
            <div key={monthKey} style={{ marginBottom: 16 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
                paddingLeft: 4
              }}>
                <div style={{
                  fontFamily: '"Ma Shan Zheng", cursive',
                  fontSize: 17,
                  color: '#8b0000',
                  letterSpacing: 3
                }}>
                  {getMonthName(parseInt(monthKey))}
                </div>
                <div style={{
                  flex: 1,
                  height: 1,
                  background: 'linear-gradient(90deg, rgba(139, 94, 60, 0.35) 0%, transparent 100%)'
                }} />
                <span style={{
                  fontFamily: '"ZCOOL XiaoWei", serif',
                  fontSize: 11,
                  color: '#8b7959'
                }}>
                  {monthEvents.length} 事
                </span>
              </div>

              <div style={{
                position: 'relative',
                paddingLeft: 24,
                borderLeft: '2px solid rgba(139, 94, 60, 0.25)'
              }}>
                {monthEvents.map((ev, idx) => {
                  const meta = TYPE_META[ev.type];
                  const globalIdx = filteredEvents.indexOf(ev);
                  const itemKey = `${ev.date}-${ev.name}-${globalIdx}`;
                  const isVisible = visibleItems.has(itemKey);
                  return (
                    <div
                      key={itemKey}
                      style={{
                        position: 'relative',
                        height: 48,
                        minHeight: 48,
                        marginBottom: 8,
                        padding: '8px 12px',
                        borderRadius: 10,
                        background: meta.bgColor,
                        border: `1px solid ${meta.color}33`,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        opacity: isVisible ? 1 : 0,
                        transform: isVisible ? 'translateX(0)' : 'translateX(-20px)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        overflow: 'hidden'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#e0c9a6';
                        e.currentTarget.style.transform = `translateX(0) scale(1.01)`;
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 94, 60, 0.2)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = meta.bgColor;
                        e.currentTarget.style.transform = 'translateX(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{
                        position: 'absolute',
                        left: -32,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: meta.color,
                        border: '2px solid #f5e3c3',
                        boxShadow: `0 0 0 1px ${meta.color}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 7,
                        color: '#fff'
                      }}>
                        {meta.icon}
                      </div>

                      <div style={{
                        fontFamily: '"Ma Shan Zheng", cursive',
                        fontSize: 15,
                        color: meta.color,
                        minWidth: 52,
                        letterSpacing: 1
                      }}>
                        {ev.date.slice(5)}
                      </div>

                      <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          fontFamily: '"Ma Shan Zheng", cursive',
                          fontSize: 16,
                          color: '#3a2817',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          letterSpacing: 1
                        }}>
                          {meta.icon} {ev.name}
                          {ev.planet ? ` · ${ev.planet}` : ''}
                        </div>
                        <div style={{
                          fontFamily: '"ZCOOL XiaoWei", serif',
                          fontSize: 11,
                          color: '#5c3d2e',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: 1.3,
                          opacity: 0.85
                        }}>
                          {ev.description}
                        </div>
                      </div>

                      <div style={{
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: `${meta.color}22`,
                        border: `1px solid ${meta.color}44`,
                        fontFamily: '"ZCOOL XiaoWei", serif',
                        fontSize: 10,
                        color: meta.color,
                        letterSpacing: 1,
                        whiteSpace: 'nowrap'
                      }}>
                        {meta.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {!isLoading && filteredEvents.length > 0 && (
        <div style={{
          position: 'relative',
          zIndex: 1,
          padding: '10px 20px',
          borderTop: '2px solid #8b5e3c',
          background: 'rgba(139, 94, 60, 0.08)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center'
        }}>
          {Object.entries(TYPE_META).map(([type, meta]) => {
            const count = events.filter(e => e.type === type).length;
            return (
              <div key={type} style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: '"Ma Shan Zheng", cursive',
                  fontSize: 20,
                  color: meta.color
                }}>
                  {count}
                </div>
                <div style={{
                  fontFamily: '"ZCOOL XiaoWei", serif',
                  fontSize: 10,
                  color: '#8b7959',
                  letterSpacing: 1
                }}>
                  {meta.label}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  background: 'rgba(139, 94, 60, 0.15)',
  color: '#5c3d2e',
  border: '1px solid rgba(139, 94, 60, 0.3)',
  borderRadius: 6,
  fontFamily: '"ZCOOL XiaoWei", serif',
  fontSize: 13,
  cursor: 'pointer',
  transition: 'all 0.2s',
  minWidth: 32
};

const loadingStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '60px 20px',
  textAlign: 'center'
};

export default CalendarPanel;
