import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { HistoricalEvent, eraColors } from '../data/initialEvents';

interface TimelineProps {
  events: HistoricalEvent[];
  selectedEvent: HistoricalEvent | null;
  viewStart: number;
  viewEnd: number;
  searchQuery: string;
  onEventClick: (event: HistoricalEvent) => void;
  onViewChange: (start: number, end: number) => void;
}

const MIN_VIEW_SPAN = 10;
const MAX_VIEW_SPAN = 5000;

const Timeline: React.FC<TimelineProps> = ({
  events,
  selectedEvent,
  viewStart,
  viewEnd,
  searchQuery,
  onEventClick,
  onViewChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartView = useRef({ start: 0, end: 0 });
  const rafId = useRef<number | null>(null);

  const viewSpan = viewEnd - viewStart;

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const dateToX = useCallback(
    (date: number): number => {
      return ((date - viewStart) / viewSpan) * containerWidth;
    },
    [viewStart, viewSpan, containerWidth]
  );

  const xToDate = useCallback(
    (x: number): number => {
      return viewStart + (x / containerWidth) * viewSpan;
    },
    [viewStart, viewSpan, containerWidth]
  );

  const visibleEvents = useMemo(() => {
    return events.filter((e) => e.date >= viewStart - viewSpan * 0.1 && e.date <= viewEnd + viewSpan * 0.1);
  }, [events, viewStart, viewEnd, viewSpan]);

  const matchedEventIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const query = searchQuery.toLowerCase();
    return new Set(
      events
        .filter(
          (e) =>
            e.title.toLowerCase().includes(query) ||
            e.description.toLowerCase().includes(query)
        )
        .map((e) => e.id)
    );
  }, [events, searchQuery]);

  const eventPositions = useMemo(() => {
    const positions: Map<string, { x: number; row: number; isCustom: boolean; era: string; matched: boolean; selected: boolean }> = new Map();
    const rows: number[] = [];
    const rowWidth = 40;

    const sorted = [...visibleEvents].sort((a, b) => a.date - b.date);

    for (const event of sorted) {
      const x = dateToX(event.date);
      const eventWidth = rowWidth;

      let row = 0;
      while (true) {
        if (rows[row] === undefined || x - eventWidth / 2 > rows[row]) {
          rows[row] = x + eventWidth / 2;
          break;
        }
        row++;
      }

      positions.set(event.id, {
        x,
        row,
        isCustom: event.isCustom || false,
        era: event.era,
        matched: matchedEventIds.has(event.id),
        selected: selectedEvent?.id === event.id,
      });
    }

    return positions;
  }, [visibleEvents, dateToX, matchedEventIds, selectedEvent]);

  const tickMarks = useMemo(() => {
    const ticks: { year: number; label: string; major: boolean }[] = [];
    const targetTicks = 10;
    const rawInterval = viewSpan / targetTicks;

    let interval: number;
    if (rawInterval >= 500) {
      interval = 500;
    } else if (rawInterval >= 200) {
      interval = 200;
    } else if (rawInterval >= 100) {
      interval = 100;
    } else if (rawInterval >= 50) {
      interval = 50;
    } else if (rawInterval >= 20) {
      interval = 20;
    } else if (rawInterval >= 10) {
      interval = 10;
    } else if (rawInterval >= 5) {
      interval = 5;
    } else {
      interval = 1;
    }

    const startYear = Math.ceil(viewStart / interval) * interval;
    const endYear = Math.floor(viewEnd / interval) * interval;

    for (let year = startYear; year <= endYear; year += interval) {
      const isMajor = year % (interval * 5) === 0;
      let label = '';
      if (year < 0) {
        label = `${Math.abs(year)} BC`;
      } else {
        label = `${year} AD`;
      }
      ticks.push({ year, label, major: isMajor });
    }

    return ticks;
  }, [viewStart, viewEnd, viewSpan]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setIsDragging(true);
      dragStartX.current = e.clientX;
      dragStartView.current = { start: viewStart, end: viewEnd };
      e.preventDefault();
    },
    [viewStart, viewEnd]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartX.current;
      const yearDelta = -(dx / containerWidth) * viewSpan;
      const newStart = dragStartView.current.start + yearDelta;
      const newEnd = dragStartView.current.end + yearDelta;

      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
      rafId.current = requestAnimationFrame(() => {
        onViewChange(newStart, newEnd);
      });
    },
    [isDragging, containerWidth, viewSpan, onViewChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseDate = xToDate(mouseX);

      const zoomFactor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
      let newSpan = viewSpan * zoomFactor;
      newSpan = Math.max(MIN_VIEW_SPAN, Math.min(MAX_VIEW_SPAN, newSpan));

      const ratio = mouseX / containerWidth;
      const newStart = mouseDate - newSpan * ratio;
      const newEnd = mouseDate + newSpan * (1 - ratio);

      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
      rafId.current = requestAnimationFrame(() => {
        onViewChange(newStart, newEnd);
      });
    },
    [viewSpan, xToDate, containerWidth, onViewChange]
  );

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const touchStartX = useRef(0);
  const touchStartDist = useRef(0);
  const touchStartView = useRef({ start: 0, end: 0 });

  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        setIsDragging(true);
        touchStartX.current = e.touches[0].clientX;
        touchStartView.current = { start: viewStart, end: viewEnd };
      } else if (e.touches.length === 2) {
        touchStartDist.current = getTouchDistance(e.touches);
        touchStartView.current = { start: viewStart, end: viewEnd };
      }
    },
    [viewStart, viewEnd]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && isDragging) {
        const dx = e.touches[0].clientX - touchStartX.current;
        const yearDelta = -(dx / containerWidth) * viewSpan;
        const newStart = touchStartView.current.start + yearDelta;
        const newEnd = touchStartView.current.end + yearDelta;
        onViewChange(newStart, newEnd);
      } else if (e.touches.length === 2) {
        const newDist = getTouchDistance(e.touches);
        const scale = touchStartDist.current / newDist;
        let newSpan = (touchStartView.current.end - touchStartView.current.start) * scale;
        newSpan = Math.max(MIN_VIEW_SPAN, Math.min(MAX_VIEW_SPAN, newSpan));

        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const centerDate = xToDate(centerX - rect.left);
        const ratio = (centerX - rect.left) / containerWidth;

        const newStart = centerDate - newSpan * ratio;
        const newEnd = centerDate + newSpan * (1 - ratio);
        onViewChange(newStart, newEnd);
      }
    },
    [isDragging, containerWidth, viewSpan, xToDate, onViewChange]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const maxRows = useMemo(() => {
    let max = 0;
    eventPositions.forEach((pos) => {
      if (pos.row > max) max = pos.row;
    });
    return max + 1;
  }, [eventPositions]);

  return (
    <div
      ref={containerRef}
      className={`timeline-container ${isDragging ? 'dragging' : ''}`}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="timeline-track" style={{ height: `${80 + maxRows * 32}px` }}>
        <div className="timeline-axis">
          {tickMarks.map((tick) => (
            <div
              key={tick.year}
              className={`tick-mark ${tick.major ? 'major' : 'minor'}`}
              style={{ left: `${dateToX(tick.year)}px` }}
            >
              <div className="tick-line" />
              {tick.major && <span className="tick-label">{tick.label}</span>}
            </div>
          ))}
        </div>

        <div className="timeline-events">
          {Array.from(eventPositions.entries()).map(([eventId, pos]) => {
            const event = events.find((e) => e.id === eventId);
            if (!event) return null;
            const color = pos.isCustom ? eraColors['custom'] : eraColors[pos.era] || '#888';

            return (
              <div
                key={eventId}
                className={`event-node ${pos.isCustom ? 'custom' : ''} ${pos.matched ? 'matched' : ''} ${pos.selected ? 'selected' : ''}`}
                style={{
                  left: `${pos.x}px`,
                  bottom: `${24 + pos.row * 32}px`,
                  backgroundColor: color,
                  boxShadow: pos.matched ? `0 0 12px 4px ${color}` : 'none',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick(event);
                }}
                title={event.title}
              >
                {pos.isCustom && <span className="custom-star">★</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Timeline;
