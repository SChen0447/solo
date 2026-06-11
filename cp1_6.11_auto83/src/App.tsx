import React, { useState, useMemo, useEffect } from 'react';
import Timeline from './Timeline';
import EventCard from './EventCard';
import { HistoryEvent, EventCategory, events, categoryColors } from './eventData';

const categories: (EventCategory | '全部')[] = ['全部', '科技', '人文', '灾难', '艺术'];

const App: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | '全部'>('全部');
  const [selectedEvents, setSelectedEvents] = useState<HistoryEvent[]>([]);
  const [showDrawer, setShowDrawer] = useState(false);
  const [highlightedYear, setHighlightedYear] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const filteredEvents = useMemo(() => {
    if (selectedCategory === '全部') return events;
    return events.filter(e => e.category === selectedCategory);
  }, [selectedCategory]);

  const filteredSelectedEvents = useMemo(() => {
    if (selectedCategory === '全部') return selectedEvents;
    return selectedEvents.filter(e => e.category === selectedCategory);
  }, [selectedEvents, selectedCategory]);

  const handleEventClick = (event: HistoryEvent) => {
    setSelectedEvents(prev => {
      const exists = prev.find(e => e.id === event.id);
      if (exists) {
        return prev.filter(e => e.id !== event.id);
      }
      return [...prev, event].sort((a, b) => a.year - b.year);
    });
    setHighlightedYear(event.year);
    if (isMobile) {
      setShowDrawer(true);
    }
  };

  const handleCategoryChange = (category: EventCategory | '全部') => {
    setSelectedCategory(category);
  };

  const getCategoryColor = (category: EventCategory | '全部'): string => {
    if (category === '全部') return '#666';
    return categoryColors[category];
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <header
        style={{
          padding: '20px 24px',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            color: '#fff',
            fontSize: isMobile ? '24px' : '32px',
            fontWeight: 700,
            marginBottom: '16px',
            background: 'linear-gradient(135deg, #4dabf7 0%, #cc5de8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          历史时间轴
        </h1>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            justifyContent: 'center',
          }}
        >
          {categories.map((category) => {
            const isActive = selectedCategory === category;
            const color = getCategoryColor(category);

            return (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: isActive ? color : 'rgba(68, 68, 68, 0.5)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  opacity: isActive ? 1 : 0.5,
                  transition: 'all 0.3s ease-out',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.opacity = '0.8';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.opacity = '0.5';
                  }
                }}
              >
                {category}
              </button>
            );
          })}
        </div>
      </header>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          padding: '0 24px 24px',
          gap: '20px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            flex: isMobile ? '0 0 auto' : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 0,
          }}
        >
          <div style={{ width: '100%', maxWidth: '1200px' }}>
            <Timeline
              events={filteredEvents}
              selectedCategory={selectedCategory}
              onEventClick={handleEventClick}
              highlightedYear={highlightedYear}
            />
          </div>
        </div>

        {!isMobile && (
          <div
            style={{
              width: '360px',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.3s ease-out',
              opacity: selectedEvents.length > 0 ? 1 : 0.3,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <h2
                style={{
                  color: '#fff',
                  fontSize: '18px',
                  fontWeight: 600,
                }}
              >
                已选事件 ({filteredSelectedEvents.length})
              </h2>
              {selectedEvents.length > 0 && (
                <button
                  onClick={() => setSelectedEvents([])}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#888',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'color 0.3s ease-out',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#fa5252';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#888';
                  }}
                >
                  清空
                </button>
              )}
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                paddingRight: '8px',
                scrollbarWidth: 'thin',
                scrollbarColor: 'linear-gradient(135deg, #4dabf7, #cc5de8) transparent',
              }}
            >
              {filteredSelectedEvents.length > 0 ? (
                filteredSelectedEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    isHighlighted={highlightedYear === event.year}
                  />
                ))
              ) : (
                <div
                  style={{
                    color: '#666',
                    textAlign: 'center',
                    padding: '40px 20px',
                    fontSize: '14px',
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>👆</div>
                  <p>点击时间轴上的事件圆点查看详情</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {isMobile && (
        <>
          {selectedEvents.length > 0 && !showDrawer && (
            <button
              onClick={() => setShowDrawer(true)}
              style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4dabf7 0%, #cc5de8 100%)',
                border: 'none',
                color: '#fff',
                fontSize: '24px',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              📋
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#fa5252',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {filteredSelectedEvents.length}
              </span>
            </button>
          )}

          {showDrawer && (
            <>
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  zIndex: 200,
                  transition: 'opacity 0.3s ease-out',
                }}
                onClick={() => setShowDrawer(false)}
              />
              <div
                style={{
                  position: 'fixed',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  maxHeight: '70vh',
                  backgroundColor: '#1a1a2e',
                  borderTopLeftRadius: '16px',
                  borderTopRightRadius: '16px',
                  zIndex: 300,
                  transform: 'translateY(0)',
                  transition: 'transform 0.3s ease-out',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                  }}
                >
                  <h2
                    style={{
                      color: '#fff',
                      fontSize: '16px',
                      fontWeight: 600,
                    }}
                  >
                    已选事件 ({filteredSelectedEvents.length})
                  </h2>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {selectedEvents.length > 0 && (
                      <button
                        onClick={() => setSelectedEvents([])}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#888',
                          fontSize: '12px',
                          cursor: 'pointer',
                          padding: '4px 8px',
                        }}
                      >
                        清空
                      </button>
                    )}
                    <button
                      onClick={() => setShowDrawer(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#fff',
                        fontSize: '20px',
                        cursor: 'pointer',
                        padding: '0 8px',
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '12px 16px',
                  }}
                >
                  {filteredSelectedEvents.length > 0 ? (
                    filteredSelectedEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        isHighlighted={highlightedYear === event.year}
                      />
                    ))
                  ) : (
                    <div
                      style={{
                        color: '#666',
                        textAlign: 'center',
                        padding: '40px 20px',
                        fontSize: '14px',
                      }}
                    >
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>👆</div>
                      <p>点击时间轴上的事件圆点查看详情</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

      <style>{`
        ::-webkit-scrollbar {
          width: 4px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #4dabf7, #cc5de8);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #339af0, #be4bdb);
        }
      `}</style>
    </div>
  );
};

export default App;
