import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import EmotionCard from './EmotionCard';
import RecorderModal from './RecorderModal';
import TimelineNav from './TimelineNav';
import type { EmotionRecord, NewRecordData } from './types';
import { format } from 'date-fns';

const CARD_WIDTH = 220;
const BUFFER = 5;

export default function App() {
  const [records, setRecords] = useState<EmotionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<EmotionRecord | null>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/records');
      const data = await res.json();
      setRecords(data);
    } catch (err) {
      console.error('获取记录失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && records.length > 0 && !initialScrollDone.current && containerRef.current && !isMobile) {
      const todayStr = new Date().toISOString().split('T')[0];
      const todayIndex = records.findIndex((r) => r.date >= todayStr);
      const scrollIndex = todayIndex === -1 ? records.length - 1 : todayIndex;
      const targetScroll = Math.max(0, scrollIndex * CARD_WIDTH - containerRef.current.clientWidth / 2 + CARD_WIDTH / 2);
      containerRef.current.scrollLeft = targetScroll;
      initialScrollDone.current = true;
    }
  }, [loading, records, isMobile]);

  const updateVisibleRange = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    if (isMobile) {
      const viewTop = container.scrollTop;
      const viewBottom = viewTop + container.clientHeight;
      const cardHeight = 200;
      const start = Math.max(0, Math.floor(viewTop / cardHeight) - BUFFER);
      const end = Math.min(records.length, Math.ceil(viewBottom / cardHeight) + BUFFER);
      setVisibleRange({ start, end });
    } else {
      const viewLeft = container.scrollLeft;
      const viewRight = viewLeft + container.clientWidth;
      const start = Math.max(0, Math.floor(viewLeft / CARD_WIDTH) - BUFFER);
      const end = Math.min(records.length, Math.ceil(viewRight / CARD_WIDTH) + BUFFER);
      setVisibleRange({ start, end });
    }
  }, [records.length, isMobile]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let rafId: number;
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateVisibleRange);
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    updateVisibleRange();
    return () => {
      container.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [updateVisibleRange]);

  const handleCreateRecord = async (data: NewRecordData) => {
    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const newRecord = await res.json();
      setRecords((prev) => {
        const updated = [...prev, newRecord];
        updated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return updated;
      });
      setModalOpen(false);

      setTimeout(() => {
        if (containerRef.current && !isMobile) {
          const idx = records.length;
          containerRef.current.scrollLeft = idx * CARD_WIDTH;
        }
      }, 100);
    } catch (err) {
      console.error('创建记录失败:', err);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      await fetch(`/api/records/${id}`, { method: 'DELETE' });
      setRecords((prev) => prev.filter((r) => r.id !== id));
      setModalOpen(false);
      setViewingRecord(null);
    } catch (err) {
      console.error('删除记录失败:', err);
    }
  };

  const handleLikeRecord = async (id: string) => {
    try {
      await fetch(`/api/records/${id}/like`, { method: 'POST' });
      setRecords((prev) =>
        prev.map((r) => (r.id === id ? { ...r, likes: r.likes + 1 } : r))
      );
      setViewingRecord((prev) =>
        prev && prev.id === id ? { ...prev, likes: prev.likes + 1 } : prev
      );
    } catch (err) {
      console.error('点赞失败:', err);
    }
  };

  const handleCardClick = (record: EmotionRecord) => {
    setViewingRecord(record);
    setModalOpen(true);
  };

  const handleOpenRecorder = () => {
    setViewingRecord(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setTimeout(() => setViewingRecord(null), 300);
  };

  const handleMonthClick = (month: string) => {
    const idx = records.findIndex((r) => r.date.startsWith(month));
    if (idx === -1) return;
    if (containerRef.current) {
      if (isMobile) {
        containerRef.current.scrollTop = idx * 200;
      } else {
        containerRef.current.scrollLeft = idx * CARD_WIDTH;
      }
    }
  };

  const visibleRecords = useMemo(() => {
    return records.slice(visibleRange.start, visibleRange.end);
  }, [records, visibleRange]);

  const placeholderBefore = visibleRange.start;
  const placeholderAfter = records.length - visibleRange.end;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">情绪光谱</h1>
        <p className="app-subtitle">
          {format(new Date(), 'yyyy年MM月dd日')} · 记录每天的心情色彩，汇成你的情绪河流
        </p>
      </header>

      <div className="timeline-container" ref={containerRef}>
        <div className="timeline-track" ref={trackRef}>
          {loading ? (
            <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>
              加载中...
            </div>
          ) : records.length === 0 ? (
            <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>
              还没有情绪记录，点击右下角按钮开始记录吧！
            </div>
          ) : (
            <>
              {placeholderBefore > 0 && (
                <div
                  style={{
                    width: isMobile ? '100%' : placeholderBefore * CARD_WIDTH,
                    height: isMobile ? placeholderBefore * 200 : 'auto',
                    flexShrink: 0,
                  }}
                />
              )}
              {visibleRecords.map((record, i) => (
                <EmotionCard
                  key={record.id}
                  record={record}
                  onClick={handleCardClick}
                  index={visibleRange.start + i}
                />
              ))}
              {placeholderAfter > 0 && (
                <div
                  style={{
                    width: isMobile ? '100%' : placeholderAfter * CARD_WIDTH,
                    height: isMobile ? placeholderAfter * 200 : 'auto',
                    flexShrink: 0,
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>

      <button className="record-btn" onClick={handleOpenRecorder} title="记录情绪">
        +
      </button>

      <RecorderModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onSubmit={handleCreateRecord}
        onDelete={handleDeleteRecord}
        onLike={handleLikeRecord}
        viewingRecord={viewingRecord}
      />

      <TimelineNav records={records} onMonthClick={handleMonthClick} />
    </div>
  );
}
