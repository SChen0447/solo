import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { scaleLinear } from 'd3-scale';
import { HistoryEvent, categoryColors, dotSizes, EventCategory } from './eventData';

interface TimelineProps {
  events: HistoryEvent[];
  selectedCategory: EventCategory | '全部';
  onEventClick: (event: HistoryEvent) => void;
  highlightedYear: number | null;
}

const MIN_SPAN = 50;
const MAX_SPAN = 200;
const INITIAL_START = 1800;
const INITIAL_END = 2020;

const Timeline: React.FC<TimelineProps> = ({ events, selectedCategory, onEventClick, highlightedYear }) => {
  const [startYear, setStartYear] = useState(INITIAL_START);
  const [endYear, setEndYear] = useState(INITIAL_END);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartYear, setDragStartYear] = useState(0);
  const [hoveredEvent, setHoveredEvent] = useState<HistoryEvent | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isAnimating, setIsAnimating] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  const [dimensions, setDimensions] = useState({ width: 800, height: 200 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth } = containerRef.current;
        setDimensions({
          width: clientWidth,
          height: 200,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const padding = { top: 40, right: 50, bottom: 50, left: 50 };
  const innerWidth = dimensions.width - padding.left - padding.right;
  const innerHeight = dimensions.height - padding.top - padding.bottom;

  const xScale = useMemo(() => {
    return scaleLinear()
      .domain([startYear, endYear])
      .range([0, innerWidth]);
  }, [startYear, endYear, innerWidth]);

  const filteredEvents = useMemo(() => {
    if (selectedCategory === '全部') return events;
    return events.filter(e => e.category === selectedCategory);
  }, [events, selectedCategory]);

  const animateTo = useCallback((newStart: number, newEnd: number, duration: number = 600) => {
    if (isAnimating) return;
    setIsAnimating(true);

    const startTime = performance.now();
    const start = startYear;
    const end = endYear;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      setStartYear(start + (newStart - start) * easeOut);
      setEndYear(end + (newEnd - end) * easeOut);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [startYear, endYear, isAnimating]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const handlePan = useCallback((direction: 'left' | 'right') => {
    const delta = 50 * (direction === 'left' ? -1 : 1);
    animateTo(startYear + delta, endYear + delta, 400);
  }, [startYear, endYear, animateTo]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isAnimating) return;

    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left - padding.left;
    const focusYear = xScale.invert(mouseX);

    const currentSpan = endYear - startYear;
    const zoomFactor = e.deltaY > 0 ? 1.15 : 0.87;
    let newSpan = currentSpan * zoomFactor;

    newSpan = Math.max(MIN_SPAN, Math.min(MAX_SPAN, newSpan));

    const ratio = mouseX / innerWidth;
    const newStart = focusYear - newSpan * ratio;
    const newEnd = focusYear + newSpan * (1 - ratio);

    setStartYear(newStart);
    setEndYear(newEnd);
  }, [xScale, startYear, endYear, innerWidth, padding.left, isAnimating]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartYear(startYear);
  }, [startYear]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStartX;
    const span = endYear - startYear;
    const deltaYear = -(deltaX / innerWidth) * span;

    setStartYear(dragStartYear + deltaYear);
    setEndYear(dragStartYear + span + deltaYear);
  }, [isDragging, dragStartX, dragStartYear, endYear, startYear, innerWidth]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setHoveredEvent(null);
  }, []);

  const handleEventHover = useCallback((e: React.MouseEvent, event: HistoryEvent) => {
    if (isDragging) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    setHoveredEvent(event);
    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 10,
    });
  }, [isDragging]);

  const handleEventLeave = useCallback(() => {
    setHoveredEvent(null);
  }, []);

  const handleFocusToday = useCallback(() => {
    const span = endYear - startYear;
    const centerYear = highlightedYear ?? 2020;
    const newStart = centerYear - span / 2;
    const newEnd = centerYear + span / 2;
    animateTo(newStart, newEnd, 600);
  }, [startYear, endYear, highlightedYear, animateTo]);

  const ticks = useMemo(() => {
    const result: { year: number; type: 'major' | 'minor' }[] = [];
    const start = Math.floor(startYear / 5) * 5;
    const end = Math.ceil(endYear / 5) * 5;

    for (let year = start; year <= end; year += 5) {
      result.push({
        year,
        type: year % 10 === 0 ? 'major' : 'minor',
      });
    }
    return result;
  }, [startYear, endYear]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const labelFontSize = isMobile ? 10 : 12;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        position: 'relative',
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(34, 34, 34, 0.8)',
          borderRadius: '10px',
          border: '1px solid #333',
          boxShadow: '0 0 20px rgba(77, 171, 247, 0.1), 0 0 20px rgba(204, 93, 232, 0.05)',
          padding: '16px',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px',
          }}
        >
          <button
            onClick={() => handlePan('left')}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(68, 68, 68, 0.8)',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(77, 171, 247, 0.6)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(68, 68, 68, 0.8)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <span
            style={{
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            {Math.round(startYear)} - {Math.round(endYear)}
          </span>

          <button
            onClick={() => handlePan('right')}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(68, 68, 68, 0.8)',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(77, 171, 247, 0.6)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(68, 68, 68, 0.8)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        <div style={{ position: 'relative', cursor: isDragging ? 'grabbing' : 'grab' }}>
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              {Object.entries(categoryColors).map(([category]) => (
                <filter key={category} id={`glow-${category}`}>
                  <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              ))}
            </defs>

            <g transform={`translate(${padding.left}, ${padding.top})`}>
              <line
                x1={0}
                y1={innerHeight / 2}
                x2={innerWidth}
                y2={innerHeight / 2}
                stroke="#444"
                strokeWidth="2"
              />

              {ticks.map(({ year, type }) => {
                const x = xScale(year);
                if (x < -20 || x > innerWidth + 20) return null;

                const isMajor = type === 'major';
                const tickHeight = isMajor ? 20 : 10;
                const tickY = innerHeight / 2 - tickHeight / 2;

                return (
                  <g key={year}>
                    <line
                      x1={x}
                      y1={tickY}
                      x2={x}
                      y2={tickY + tickHeight}
                      stroke={isMajor ? '#555' : '#333'}
                      strokeWidth={isMajor ? 2 : 1}
                    />
                    {isMajor && (
                      <text
                        x={x}
                        y={innerHeight / 2 + 28}
                        fill="#fff"
                        fontSize={labelFontSize}
                        textAnchor="middle"
                        style={{ userSelect: 'none' }}
                      >
                        {year}
                      </text>
                    )}
                  </g>
                );
              })}

              {filteredEvents.map((event) => {
                const x = xScale(event.year);
                if (x < -20 || x > innerWidth + 20) return null;

                const baseSize = dotSizes[event.influenceLevel];
                const color = categoryColors[event.category];
                const isHovered = hoveredEvent?.id === event.id;
                const isHighlighted = highlightedYear !== null && Math.abs(event.year - highlightedYear) <= 2;
                const size = isHovered ? baseSize * 1.5 : baseSize;

                return (
                  <g
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isDragging) onEventClick(event);
                    }}
                    style={{ cursor: 'pointer', transition: 'opacity 0.3s ease-out' }}
                  >
                    {isHighlighted && (
                      <circle
                        cx={x}
                        cy={innerHeight / 2}
                        r={size + 10}
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        opacity="0.6"
                        style={{
                          animation: 'pulse 1.5s ease-in-out infinite',
                        }}
                      />
                    )}
                    <circle
                      cx={x}
                      cy={innerHeight / 2}
                      r={size}
                      fill={color}
                      filter={`url(#glow-${event.category})`}
                      onMouseEnter={(e) => handleEventHover(e, event)}
                      onMouseLeave={handleEventLeave}
                      style={{
                        transition: 'all 0.2s ease-out',
                      }}
                    />
                  </g>
                );
              })}
            </g>
          </svg>

          {hoveredEvent && (
            <div
              style={{
                position: 'absolute',
                left: tooltipPos.x,
                top: tooltipPos.y,
                transform: 'translate(-50%, -100%)',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                color: '#fff',
                padding: '8px 12px',
                borderRadius: '5px',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                zIndex: 1000,
                animation: 'fadeIn 0.2s ease-out',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '2px' }}>{hoveredEvent.title}</div>
              <div style={{ color: '#aaa' }}>{hoveredEvent.year}年</div>
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: '-6px',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: '6px solid rgba(0, 0, 0, 0.85)',
                }}
              />
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '12px',
          }}
        >
          <span
            style={{
              color: '#888',
              fontSize: '12px',
            }}
          >
            显示 {filteredEvents.length} 个事件
          </span>
          <button
            onClick={handleFocusToday}
            style={{
              background: 'linear-gradient(135deg, #4dabf7 0%, #cc5de8 100%)',
              border: 'none',
              color: '#fff',
              padding: '8px 20px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.3s ease-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(77, 171, 247, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            聚焦今日
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -90%); }
          to { opacity: 1; transform: translate(-50%, -100%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
};

export default Timeline;
