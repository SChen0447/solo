import React, { memo, useCallback, useRef, useState } from 'react';
import { DotPosition } from '@/utils/brailleMap';

interface BrailleCellProps {
  letter?: string;
  activeDots?: DotPosition[];
  highlightDots?: DotPosition[];
  showHint?: boolean;
  isPracticeCell?: boolean;
  isTestCell?: boolean;
  onClick?: () => void;
  feedback?: 'correct' | 'wrong' | null;
  size?: 'normal' | 'small';
}

const DOT_ROWS = 3;
const DOT_COLS = 2;

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: any[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

function playTone(frequency: number, duration: number = 0.1) {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    // ignore audio errors
  }
}

const BrailleCell: React.FC<BrailleCellProps> = memo(({
  letter = '',
  activeDots = [],
  highlightDots = [],
  showHint = false,
  isPracticeCell = false,
  isTestCell = false,
  onClick,
  feedback = null,
  size = 'normal',
}) => {
  const [hoveredDot, setHoveredDot] = useState<number | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cellSize = size === 'small' ? 56 : 80;
  const dotSize = size === 'small' ? 12 : 18;
  const dotGap = size === 'small' ? 8 : 12;

  const isDotActive = useCallback((row: number, col: number): boolean => {
    return activeDots.some(([r, c]) => r === row && c === col);
  }, [activeDots]);

  const isDotHighlighted = useCallback((row: number, col: number): boolean => {
    return highlightDots.some(([r, c]) => r === row && c === col);
  }, [highlightDots]);

  const handleDotHover = useCallback(debounce((index: number) => {
    setHoveredDot(index);
    playTone(200, 0.05);
  }, 150), []);

  const handleDotLeave = useCallback(debounce(() => {
    setHoveredDot(null);
  }, 150), []);

  const handleCellEnter = useCallback(() => {
    if (showHint && letter) {
      hoverTimerRef.current = setTimeout(() => {
        setShowTooltip(true);
      }, 100);
    }
  }, [showHint, letter]);

  const handleCellLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    setShowTooltip(false);
  }, []);

  const handleClick = useCallback(() => {
    playTone(200, 0.08);
    onClick?.();
  }, [onClick]);

  const dots: JSX.Element[] = [];
  for (let row = 0; row < DOT_ROWS; row++) {
    for (let col = 0; col < DOT_COLS; col++) {
      const index = row * DOT_COLS + col;
      const isActive = isDotActive(row, col);
      const isHighlighted = isDotHighlighted(row, col);
      const isHovered = hoveredDot === index;
      const shouldElevate = isActive || isHighlighted || isHovered;

      dots.push(
        <div
          key={index}
          onMouseEnter={() => handleDotHover(index)}
          onMouseLeave={handleDotLeave}
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            backgroundColor: shouldElevate ? '#FFBF00' : '#F5F5DC',
            boxShadow: shouldElevate
              ? `0 ${6}px 0 rgba(0,0,0,0.3), 0 0 12px rgba(255, 191, 0, 0.5)`
              : `0 ${3}px 0 rgba(0,0,0,0.2)`,
            transform: `translateY(${shouldElevate ? -2 : 0}px)`,
            transition: 'all 0.2s ease-out',
            cursor: isPracticeCell || isTestCell ? 'pointer' : 'default',
          }}
        />
      );
    }
  }

  return (
    <div
      onMouseEnter={handleCellEnter}
      onMouseLeave={handleCellLeave}
      onClick={handleClick}
      style={{
        position: 'relative',
        width: cellSize,
        height: cellSize,
        backgroundColor: '#2C3E50',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isPracticeCell || isTestCell ? 'pointer' : 'default',
        transition: 'all 0.3s ease-out',
        animation: feedback === 'correct'
          ? 'flashGreen 0.3s ease-out'
          : feedback === 'wrong'
          ? 'flashRed 0.3s ease-out'
          : 'none',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${DOT_COLS}, ${dotSize}px)`,
          gridTemplateRows: `repeat(${DOT_ROWS}, ${dotSize}px)`,
          gap: dotGap,
        }}
      >
        {dots}
      </div>
      {showTooltip && showHint && letter && (
        <div
          style={{
            position: 'absolute',
            bottom: -36,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(255, 191, 0, 0.95)',
            color: '#1a1a2e',
            padding: '4px 12px',
            borderRadius: 6,
            fontSize: size === 'small' ? 12 : 14,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            zIndex: 10,
            animation: 'fadeInUp 0.3s ease-out',
            pointerEvents: 'none',
          }}
        >
          {letter}
        </div>
      )}
    </div>
  );
});

BrailleCell.displayName = 'BrailleCell';

export { playTone };
export default BrailleCell;
