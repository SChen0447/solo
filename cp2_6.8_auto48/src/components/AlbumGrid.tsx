import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { Album } from '../utils/AlbumData';
import FlipCard from './FlipCard';
import styles from './AlbumGrid.module.css';

interface AlbumGridProps {
  albums: Album[];
  currentIndex: number;
  flippedAlbumId: string | null;
  playingAlbumId: string | null;
  frequencyData: Uint8Array | null;
  onIndexChange: (index: number) => void;
  onFlip: (albumId: string) => void;
  onPlay: (albumId: string) => void;
}

const CARD_GAP = 30;
const DESKTOP_CARD_WIDTH = 300;
const TABLET_CARD_WIDTH = 240;
const MOBILE_CARD_WIDTH = 180;
const MOBILE_CARD_HEIGHT = 240;

const AlbumGrid: React.FC<AlbumGridProps> = ({
  albums,
  currentIndex,
  flippedAlbumId,
  playingAlbumId,
  frequencyData,
  onIndexChange,
  onFlip,
  onPlay,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isVertical, setIsVertical] = useState(false);
  const [cardWidth, setCardWidth] = useState(DESKTOP_CARD_WIDTH);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateLayout = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setIsVertical(true);
        setCardWidth(MOBILE_CARD_WIDTH);
      } else if (width <= 1024) {
        setIsVertical(false);
        setCardWidth(TABLET_CARD_WIDTH);
      } else {
        setIsVertical(false);
        setCardWidth(DESKTOP_CARD_WIDTH);
      }
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  useEffect(() => {
    const updateContainerSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateContainerSize();
    window.addEventListener('resize', updateContainerSize);
    return () => window.removeEventListener('resize', updateContainerSize);
  }, []);

  const getTrackOffset = useCallback(() => {
    const size = isVertical ? containerSize.height : containerSize.width;
    const cardSize = isVertical ? MOBILE_CARD_HEIGHT : cardWidth;
    const centerOffset = size / 2 - cardSize / 2;
    const itemOffset = currentIndex * (cardSize + CARD_GAP);
    return centerOffset - itemOffset + dragOffset;
  }, [isVertical, containerSize, cardWidth, currentIndex, dragOffset]);

  const getCardOpacity = useCallback((index: number) => {
    const distance = Math.abs(index - currentIndex);
    if (distance === 0) return 1;
    if (distance === 1) return 0.6;
    return 0.3;
  }, [currentIndex]);

  const getCardScale = useCallback((index: number) => {
    const distance = Math.abs(index - currentIndex);
    if (distance === 0) return 1;
    if (distance === 1) return 0.9;
    return 0.8;
  }, [currentIndex]);

  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragStart(isVertical ? clientY : clientX);
    setDragOffset(0);
  }, [isVertical]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    const current = isVertical ? clientY : clientX;
    const offset = current - dragStart;
    setDragOffset(offset);
  }, [isDragging, dragStart, isVertical]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;

    const cardSize = isVertical ? MOBILE_CARD_HEIGHT : cardWidth;
    const threshold = (cardSize + CARD_GAP) / 3;
    const absOffset = Math.abs(dragOffset);

    if (absOffset > threshold) {
      const direction = dragOffset > 0 ? -1 : 1;
      const newIndex = Math.max(0, Math.min(albums.length - 1, currentIndex + direction));
      onIndexChange(newIndex);
    }

    setIsDragging(false);
    setDragOffset(0);
  }, [isDragging, dragOffset, cardWidth, currentIndex, albums.length, onIndexChange, isVertical]);

  const handleMouseDown = (e: React.MouseEvent) => {
    handleDragStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    handleDragEnd();
  };

  const handleMouseLeave = () => {
    handleDragEnd();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragMove(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  const trackOffset = getTrackOffset();

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${isVertical ? styles.vertical : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className={styles.gradientLeft} />
      <div className={styles.gradientRight} />
      <div className={styles.gradientTop} />
      <div className={styles.gradientBottom} />

      <div
        className={`${styles.track} ${isVertical ? styles.verticalTrack : ''}`}
        style={{
          transform: isVertical
            ? `translateY(${trackOffset}px)`
            : `translateX(${trackOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        {albums.map((album, index) => (
          <div
            key={album.id}
            className={`${styles.cardWrapper} ${isVertical ? styles.verticalCard : ''}`}
            style={{
              transform: `scale(${getCardScale(index)})`,
              opacity: getCardOpacity(index),
              transition: isDragging ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
              zIndex: albums.length - Math.abs(index - currentIndex),
            }}
          >
            <FlipCard
              album={album}
              isFlipped={flippedAlbumId === album.id}
              isActive={index === currentIndex}
              isPlaying={playingAlbumId === album.id}
              frequencyData={playingAlbumId === album.id ? frequencyData : null}
              onFlip={() => {
                if (index === currentIndex) {
                  onFlip(album.id);
                }
              }}
              onPlay={() => {
                if (index === currentIndex) {
                  onPlay(album.id);
                }
              }}
            />
          </div>
        ))}
      </div>

      <div className={styles.indicators}>
        {albums.map((_, index) => (
          <button
            key={index}
            className={`${styles.indicator} ${index === currentIndex ? styles.activeIndicator : ''}`}
            onClick={() => onIndexChange(index)}
            aria-label={`Go to album ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default AlbumGrid;
