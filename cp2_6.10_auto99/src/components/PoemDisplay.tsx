import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { selectCurrentLines } from '../store/poemSlice';
import { PoemLine } from '../utils/versionManager';

const CARD_HEIGHT = 120;
const CARD_WIDTH = 220;
const CARD_GAP = 16;
const VISIBLE_COUNT = 10;

const PoemDisplay: React.FC = () => {
  const lines = useSelector(selectCurrentLines);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const updateWidth = () => {
      if (scrollRef.current) {
        setContainerWidth(scrollRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      setScrollLeft(scrollRef.current.scrollLeft);
    }
  }, []);

  const startIndex = Math.max(
    0,
    Math.floor(scrollLeft / (CARD_WIDTH + CARD_GAP)) - 1
  );
  const endIndex = Math.min(
    lines.length,
    startIndex + VISIBLE_COUNT + 2
  );

  const visibleLines = lines.slice(startIndex, endIndex);

  if (lines.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>✍️</div>
        <div style={styles.emptyText}>开始创作你的第一句诗吧</div>
        <div style={styles.emptyHint}>在上方输入作者名和诗句，点击提交或按 Enter</div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      style={styles.scrollContainer}
      onScroll={handleScroll}
    >
      <div
        style={{
          ...styles.track,
          width: lines.length * (CARD_WIDTH + CARD_GAP) + 40,
          position: 'relative',
        }}
      >
        {visibleLines.map((line, idx) => {
          const actualIndex = startIndex + idx;
          return (
            <React.Fragment key={line.id}>
              <motion.div
                style={{
                  ...styles.card,
                  position: 'absolute',
                  left: actualIndex * (CARD_WIDTH + CARD_GAP) + 20,
                  top: 0,
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.03 }}
                whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
              >
                <div style={styles.cardHeader}>
                  <span style={styles.lineNumber}>#{actualIndex + 1}</span>
                  <span style={styles.lineAuthor}>{line.author}</span>
                </div>
                <div style={styles.lineText}>{line.text}</div>
              </motion.div>
              {actualIndex < lines.length - 1 && (
                <div
                  style={{
                    ...styles.connector,
                    position: 'absolute',
                    left: actualIndex * (CARD_WIDTH + CARD_GAP) + CARD_WIDTH + 20,
                    top: CARD_HEIGHT / 2,
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  scrollContainer: {
    width: '100%',
    overflowX: 'auto',
    overflowY: 'hidden',
    padding: '20px 0',
    scrollbarWidth: 'thin',
  },
  track: {
    height: CARD_HEIGHT + 20,
    minWidth: '100%',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.2s ease',
    border: '1px solid #eee',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px',
  },
  lineNumber: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#764ba2',
    backgroundColor: '#f3eef9',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  lineAuthor: {
    fontSize: '12px',
    color: '#999',
  },
  lineText: {
    fontSize: '16px',
    color: '#2d3436',
    lineHeight: 1.6,
    flex: 1,
    display: 'flex',
    alignItems: 'center',
  },
  connector: {
    width: CARD_GAP,
    height: '1px',
    backgroundColor: '#bbb',
  },
  emptyState: {
    width: '100%',
    padding: '60px 20px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '18px',
    color: '#555',
    marginBottom: '8px',
    fontWeight: 500,
  },
  emptyHint: {
    fontSize: '13px',
    color: '#999',
  },
};

export default PoemDisplay;
