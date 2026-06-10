import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { Book, RatingMap } from './types';

interface BookShelfProps {
  books: Book[];
  userRatings: RatingMap;
  onBookClick: (book: Book) => void;
  scrollTargetRef: React.MutableRefObject<{ bookId: string | null }>;
}

const COVER_WIDTH = 140;
const COVER_HEIGHT = 200;
const COVER_GAP = 16;
const MOBILE_COVER_WIDTH = 100;
const MOBILE_COVER_HEIGHT = 140;
const EDGE_FADE_DISTANCE = 80;
const INERTIA_FRICTION = 0.95;

const BookShelf: React.FC<BookShelfProps> = ({ books, userRatings, onBookClick, scrollTargetRef }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scrollX, setScrollX] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  const dragState = useRef({
    startX: 0,
    startScrollX: 0,
    velocity: 0,
    lastX: 0,
    lastTime: 0,
    isClick: true,
    rafId: 0
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setAnimationKey(prev => prev + 1);
  }, [books.length]);

  useEffect(() => {
    if (scrollTargetRef.current.bookId && trackRef.current) {
      const idx = books.findIndex(b => b.id === scrollTargetRef.current.bookId);
      if (idx >= 0) {
        const coverW = isMobile ? MOBILE_COVER_WIDTH : COVER_WIDTH;
        const gap = COVER_GAP;
        const targetX = idx * (coverW + gap) - 50;
        setScrollX(Math.max(0, targetX));
      }
      scrollTargetRef.current.bookId = null;
    }
  }, [scrollTargetRef, books, isMobile]);

  const getContainerWidth = useCallback(() => {
    return containerRef.current?.clientWidth || 800;
  }, []);

  const getMaxScroll = useCallback(() => {
    const coverW = isMobile ? MOBILE_COVER_WIDTH : COVER_WIDTH;
    const totalWidth = books.length * coverW + (books.length - 1) * COVER_GAP;
    const containerW = getContainerWidth();
    return Math.max(0, totalWidth - containerW);
  }, [books.length, isMobile, getContainerWidth]);

  const getOpacityForPosition = useCallback((itemCenterX: number): number => {
    const containerW = getContainerWidth();
    const visibleCenterX = itemCenterX - scrollX;
    const distToLeftEdge = visibleCenterX;
    const distToRightEdge = containerW - visibleCenterX;
    const minDist = Math.min(distToLeftEdge, distToRightEdge);
    if (minDist >= EDGE_FADE_DISTANCE) return 1;
    if (minDist <= 0) return 0.3;
    return 0.3 + (0.7 * (minDist / EDGE_FADE_DISTANCE));
  }, [scrollX, getContainerWidth]);

  const clampScroll = useCallback((x: number) => {
    const max = getMaxScroll();
    return Math.max(0, Math.min(max, x));
  }, [getMaxScroll]);

  const runInertia = useCallback(() => {
    const state = dragState.current;
    if (Math.abs(state.velocity) < 0.5) {
      setScrollX(prev => clampScroll(prev));
      return;
    }
    setScrollX(prev => {
      const next = clampScroll(prev + state.velocity);
      state.velocity *= INERTIA_FRICTION;
      if (next !== prev + state.velocity / INERTIA_FRICTION) {
        state.velocity = 0;
      }
      return next;
    });
    state.rafId = requestAnimationFrame(runInertia);
  }, [clampScroll]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (dragState.current.rafId) {
      cancelAnimationFrame(dragState.current.rafId);
    }
    setIsDragging(true);
    dragState.current.startX = e.clientX;
    dragState.current.startScrollX = scrollX;
    dragState.current.lastX = e.clientX;
    dragState.current.lastTime = performance.now();
    dragState.current.velocity = 0;
    dragState.current.isClick = true;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragState.current.startX;
    if (Math.abs(dx) > 5) {
      dragState.current.isClick = false;
    }
    const now = performance.now();
    const dt = Math.max(1, now - dragState.current.lastTime);
    dragState.current.velocity = (e.clientX - dragState.current.lastX) / dt * 16;
    dragState.current.lastX = e.clientX;
    dragState.current.lastTime = now;
    setScrollX(clampScroll(dragState.current.startScrollX - dx));
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    dragState.current.rafId = requestAnimationFrame(runInertia);
  };

  const handleMouseLeave = () => {
    if (!isDragging) return;
    setIsDragging(false);
    dragState.current.rafId = requestAnimationFrame(runInertia);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (dragState.current.rafId) {
      cancelAnimationFrame(dragState.current.rafId);
    }
    const touch = e.touches[0];
    setIsDragging(true);
    dragState.current.startX = touch.clientX;
    dragState.current.startScrollX = scrollX;
    dragState.current.lastX = touch.clientX;
    dragState.current.lastTime = performance.now();
    dragState.current.velocity = 0;
    dragState.current.isClick = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragState.current.startX;
    if (Math.abs(dx) > 5) {
      dragState.current.isClick = false;
    }
    const now = performance.now();
    const dt = Math.max(1, now - dragState.current.lastTime);
    dragState.current.velocity = (touch.clientX - dragState.current.lastX) / dt * 16;
    dragState.current.lastX = touch.clientX;
    dragState.current.lastTime = now;
    setScrollX(clampScroll(dragState.current.startScrollX - dx));
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    dragState.current.rafId = requestAnimationFrame(runInertia);
  };

  const coverW = isMobile ? MOBILE_COVER_WIDTH : COVER_WIDTH;
  const coverH = isMobile ? MOBILE_COVER_HEIGHT : COVER_HEIGHT;
  const maxScroll = getMaxScroll();
  const progress = maxScroll > 0 ? scrollX / maxScroll : 0;
  const containerW = getContainerWidth();
  const thumbWidth = maxScroll > 0 ? Math.max(60, containerW * (containerW / (books.length * (coverW + COVER_GAP)))) : containerW;
  const thumbLeft = maxScroll > 0 ? (containerW - thumbWidth) * progress : 0;

  return (
    <div className="bookshelf-wrapper">
      <h2 className="bookshelf-title">虚拟书架</h2>
      <div
        ref={containerRef}
        className={`bookshelf-container ${isDragging ? 'dragging' : ''}`}
        style={{ height: isMobile ? 280 : 420 }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={trackRef}
          className="bookshelf-track"
          style={{
            transform: `translateX(${-scrollX}px)`,
            transition: isDragging ? 'none' : undefined
          }}
        >
          {books.map((book, idx) => {
            const itemCenterX = idx * (coverW + COVER_GAP) + coverW / 2;
            const opacity = getOpacityForPosition(itemCenterX);
            const rating = userRatings[book.id] ?? book.rating;
            return (
              <div
                key={`${book.id}-${animationKey}`}
                className="book-cover-wrapper"
                style={{
                  width: coverW,
                  height: coverH,
                  marginRight: COVER_GAP,
                  opacity,
                  animationDelay: `${idx * 80}ms`
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (dragState.current.isClick) {
                    onBookClick(book);
                  }
                }}
              >
                <img
                  src={book.cover}
                  alt={book.title}
                  className="book-cover-img"
                  style={{ width: coverW, height: coverH }}
                  draggable={false}
                />
                <div className="book-rating-badge">{rating.toFixed(1)} ★</div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="scroll-progress-track">
        <div
          className="scroll-progress-thumb"
          style={{ width: thumbWidth, transform: `translateX(${thumbLeft}px)` }}
        />
      </div>
    </div>
  );
};

export default BookShelf;
