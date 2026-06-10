import React, { memo, useCallback, useEffect, useState } from 'react';
import BrailleCell from './BrailleCell';
import { DotPosition, getAlphabetLetters, letterToDots } from '@/utils/brailleMap';

type LearningMode = 'browse' | 'practice' | 'test';

interface BrailleGridProps {
  mode: LearningMode;
  inputText: string;
  onCellClick?: (letter: string, index: number) => void;
  practiceTarget?: string;
  testQuestion?: {
    letter: string;
    options: string[];
  } | null;
  cellFeedback?: Record<number, 'correct' | 'wrong' | null>;
}

const GRID_ROWS = 6;
const GRID_COLS = 6;
const TOTAL_CELLS = GRID_ROWS * GRID_COLS;

const BrailleGrid: React.FC<BrailleGridProps> = memo(({
  mode,
  inputText,
  onCellClick,
  practiceTarget,
  testQuestion,
  cellFeedback = {},
}) => {
  const [columns, setColumns] = useState(GRID_COLS);

  useEffect(() => {
    const handleResize = () => {
      setColumns(window.innerWidth < 768 ? 4 : GRID_COLS);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const alphabetLetters = getAlphabetLetters();

  const getHighlightDotsForIndex = useCallback((index: number): DotPosition[] => {
    const chars = inputText.toUpperCase().split('').filter(c => /[A-Z]/.test(c));
    if (index < chars.length) {
      return letterToDots(chars[index]);
    }
    return [];
  }, [inputText]);

  const isPracticeCell = mode === 'practice';
  const isTestCell = mode === 'test' && testQuestion !== null;

  const cells: JSX.Element[] = [];
  const totalCells = mode === 'test' ? 1 : TOTAL_CELLS;

  if (mode === 'test' && testQuestion) {
    const letter = testQuestion.letter;
    cells.push(
      <div key="test-cell" style={{ display: 'flex', justifyContent: 'center' }}>
        <BrailleCell
          letter={letter}
          activeDots={letterToDots(letter)}
          showHint={false}
          size="normal"
        />
      </div>
    );
  } else if (mode === 'practice' && practiceTarget) {
    cells.push(
      <div key="practice-cell" style={{ display: 'flex', justifyContent: 'center' }}>
        <BrailleCell
          letter={practiceTarget}
          activeDots={letterToDots(practiceTarget)}
          showHint={false}
          isPracticeCell
          onClick={() => onCellClick?.(practiceTarget, 0)}
          feedback={cellFeedback[0] || null}
          size="normal"
        />
      </div>
    );
  } else {
    for (let i = 0; i < TOTAL_CELLS; i++) {
      const letter = alphabetLetters[i] || '';
      const highlightDots = getHighlightDotsForIndex(i);

      cells.push(
        <BrailleCell
          key={i}
          letter={letter}
          activeDots={letter ? letterToDots(letter) : []}
          highlightDots={highlightDots}
          showHint={mode === 'browse'}
          onClick={() => onCellClick?.(letter, i)}
          feedback={cellFeedback[i] || null}
          size="normal"
        />
      );
    }
  }

  if (mode === 'test') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 32,
        }}
      >
        {cells}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 16,
            maxWidth: 400,
            width: '100%',
          }}
        >
          {testQuestion?.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => onCellClick?.(option, idx)}
              style={{
                padding: '16px 24px',
                fontSize: 24,
                fontWeight: 700,
                color: '#FFFFFF',
                background: 'linear-gradient(135deg, rgba(255,191,0,0.1), rgba(255,100,50,0.1))',
                border: '2px solid transparent',
                borderImage: 'linear-gradient(135deg, #FFBF00, #FF6347) 1',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.3s ease-out',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 0 8px rgba(255, 191, 0, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (mode === 'practice') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
        }}
      >
        {cells}
        <div style={{ color: '#FFFFFF', fontSize: 18 }}>
          点击单元格查看答案
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, auto)`,
        gap: 8,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {cells}
    </div>
  );
});

BrailleGrid.displayName = 'BrailleGrid';

export default BrailleGrid;
