import React, { useRef, useEffect, useCallback } from 'react';
import type { Album } from '../utils/AlbumData';
import styles from './FlipCard.module.css';

interface FlipCardProps {
  album: Album;
  isFlipped: boolean;
  isActive: boolean;
  isPlaying: boolean;
  frequencyData: Uint8Array | null;
  onFlip: () => void;
  onPlay: () => void;
}

const FlipCard: React.FC<FlipCardProps> = ({
  album,
  isFlipped,
  isActive,
  isPlaying,
  frequencyData,
  onFlip,
  onPlay,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastDrawRef = useRef<number>(0);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frequencyData || !isPlaying) return;

    const now = performance.now();
    if (now - lastDrawRef.current < 1000 / 30) {
      animationRef.current = requestAnimationFrame(drawWaveform);
      return;
    }
    lastDrawRef.current = now;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#00adb5');
    gradient.addColorStop(1, '#6c63ff');

    const barCount = frequencyData.length;
    const barWidth = width / barCount;

    for (let i = 0; i < barCount; i++) {
      const barHeight = (frequencyData[i] / 255) * height * 0.8;
      const x = i * barWidth;
      const y = height - barHeight;

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    }

    animationRef.current = requestAnimationFrame(drawWaveform);
  }, [frequencyData, isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(drawWaveform);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, drawWaveform]);

  const handleCardClick = (e: React.MouseEvent) => {
    if (!isActive) return;
    const target = e.target as HTMLElement;
    if (target.closest(`.${styles.playButton}`)) return;
    onFlip();
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlay();
  };

  return (
    <div
      className={`${styles.cardContainer} ${isActive ? styles.active : ''}`}
      onClick={handleCardClick}
    >
      <div
        className={`${styles.card} ${isFlipped ? styles.flipped : ''}`}
        style={{ willChange: 'transform' }}
      >
        <div
          className={styles.cardFront}
          style={{ background: album.coverColor }}
        >
          <div className={styles.frontContent}>
            <h2 className={styles.albumTitle}>{album.title}</h2>
            <p className={styles.albumArtist}>{album.artist}</p>
          </div>
          <div className={styles.yearBadge}>{album.releaseYear}</div>
          <div className={styles.artistTooltip}>
            <div
              className={styles.artistIcon}
              style={{ background: album.coverColor }}
            />
            <span className={styles.artistName}>{album.artist}</span>
          </div>
        </div>

        <div className={styles.cardBack}>
          <h3 className={styles.tracklistTitle}>Tracklist</h3>
          <div className={styles.tracklist}>
            {album.tracks.map((track, index) => (
              <div key={index} className={styles.trackItem}>
                <span className={styles.trackNumber}>{String(index + 1).padStart(2, '0')}</span>
                <span className={styles.trackName}>{track.name}</span>
                <span className={styles.trackDuration}>{track.duration}</span>
              </div>
            ))}
          </div>
          <canvas
            ref={canvasRef}
            className={styles.waveformCanvas}
            width={260}
            height={60}
          />
          <button
            className={`${styles.playButton} ${isPlaying ? styles.playing : ''}`}
            onClick={handlePlayClick}
          >
            {isPlaying ? 'Playing...' : 'Play'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlipCard;
