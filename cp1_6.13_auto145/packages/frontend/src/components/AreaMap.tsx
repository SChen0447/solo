import { useMemo } from 'react';
import type { PuzzleData, SolvedPuzzle } from '../App';
import './AreaMap.scss';

interface AreaMapProps {
  puzzles: PuzzleData[];
  solvedPuzzles: Map<number, SolvedPuzzle>;
  dissipatingIds: Set<number>;
  onPuzzleClick: (puzzle: PuzzleData) => void;
  onOpenCollection: () => void;
  solvedCount: number;
  totalCount: number;
}

interface MapArea {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  clipPath: string;
}

const MAP_AREAS: MapArea[] = [
  { id: 1, x: 2, y: 3, w: 28, h: 30, clipPath: 'polygon(15% 0%, 100% 8%, 90% 75%, 65% 100%, 0% 85%, 5% 20%)' },
  { id: 2, x: 30, y: 1, w: 32, h: 28, clipPath: 'polygon(8% 5%, 95% 0%, 100% 70%, 75% 100%, 0% 90%, 5% 35%)' },
  { id: 3, x: 63, y: 3, w: 32, h: 30, clipPath: 'polygon(5% 10%, 90% 0%, 100% 85%, 80% 100%, 0% 95%, 10% 40%)' },
  { id: 4, x: 3, y: 34, w: 34, h: 28, clipPath: 'polygon(0% 5%, 85% 0%, 100% 65%, 70% 100%, 5% 95%)' },
  { id: 5, x: 36, y: 30, w: 28, h: 32, clipPath: 'polygon(10% 0%, 95% 8%, 100% 80%, 60% 100%, 0% 85%)' },
  { id: 6, x: 65, y: 34, w: 30, h: 28, clipPath: 'polygon(5% 15%, 100% 0%, 95% 90%, 80% 100%, 0% 80%)' },
  { id: 7, x: 4, y: 63, w: 30, h: 30, clipPath: 'polygon(8% 0%, 100% 10%, 90% 100%, 0% 85%)' },
  { id: 8, x: 36, y: 62, w: 54, h: 32, clipPath: 'polygon(5% 8%, 95% 0%, 100% 85%, 85% 100%, 0% 90%)' },
];

const PINE_TREES = [
  { x: 8, y: 18, size: 95, rotate: -5 },
  { x: 45, y: 8, size: 110, rotate: 3 },
  { x: 78, y: 15, size: 85, rotate: -8 },
  { x: 15, y: 50, size: 100, rotate: 5 },
  { x: 55, y: 45, size: 80, rotate: -3 },
  { x: 85, y: 55, size: 120, rotate: 7 },
  { x: 25, y: 78, size: 90, rotate: -6 },
  { x: 70, y: 80, size: 105, rotate: 4 },
  { x: 50, y: 72, size: 88, rotate: -2 },
];

function PineTree({ x, y, size, rotate }: { x: number; y: number; size: number; rotate: number }) {
  return (
    <svg
      className="pine-tree"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${size}px`,
        height: `${size * 1.4}px`,
        transform: `rotate(${rotate}deg)`,
      }}
      viewBox="0 0 100 140"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polygon
        points="50,5 80,40 65,38 90,70 70,68 95,100 5,100 30,68 10,70 35,38 20,40"
        fill="rgba(26,58,42,0.7)"
      />
      <rect x="43" y="100" width="14" height="35" fill="rgba(61,43,31,0.6)" />
    </svg>
  );
}

function AreaMap({ puzzles, solvedPuzzles, dissipatingIds, onPuzzleClick, onOpenCollection, solvedCount, totalCount }: AreaMapProps) {
  const puzzleMap = useMemo(() => {
    const map = new Map<number, PuzzleData>();
    puzzles.forEach(p => map.set(p.id, p));
    return map;
  }, [puzzles]);

  return (
    <div className="area-map">
      <div className="map-background">
        {PINE_TREES.map((tree, i) => (
          <PineTree key={i} {...tree} />
        ))}
      </div>

      <div className="map-areas">
        {MAP_AREAS.map(area => {
          const puzzle = puzzleMap.get(area.id);
          const isSolved = puzzle?.unlocked || solvedPuzzles.has(area.id);
          const isDissipating = dissipatingIds.has(area.id);
          const solvedData = solvedPuzzles.get(area.id);

          return (
            <div
              key={area.id}
              className={`map-area ${isSolved ? 'solved' : ''} ${isDissipating ? 'dissipating' : ''}`}
              style={{
                left: `${area.x}%`,
                top: `${area.y}%`,
                width: `${area.w}%`,
                height: `${area.h}%`,
                clipPath: area.clipPath,
              }}
              onClick={() => puzzle && onPuzzleClick(puzzle)}
            >
              <div className="fog-overlay" />

              {isSolved && solvedData && (
                <div className={`revealed-content ${isDissipating ? 'appearing' : ''}`}>
                  <div className="painting-wrapper">
                    <img
                      src={solvedData.painting}
                      alt="水墨配图"
                      className="painting"
                    />
                    <div className="painting-ink-border" />
                  </div>
                  <p className="description">{solvedData.description}</p>
                </div>
              )}

              {!isSolved && puzzle && (
                <div className="area-label">{puzzle.name}</div>
              )}
            </div>
          );
        })}
      </div>

      <button className="collection-btn" onClick={onOpenCollection}>
        <span className="collection-count">{solvedCount}/{totalCount}</span>
      </button>
    </div>
  );
}

export default AreaMap;
