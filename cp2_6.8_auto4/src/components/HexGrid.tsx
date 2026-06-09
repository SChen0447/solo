import React, { useMemo } from 'react';
import type { CellType, HexCoord } from '../types';

interface HexGridProps {
  grid: CellType[][];
  start: HexCoord | null;
  end: HexCoord | null;
  hexSize: number;
  onHexClick: (coord: HexCoord) => void;
  highlightedCells?: HexCoord[];
}

const HexGrid: React.FC<HexGridProps> = ({
  grid,
  start,
  end,
  hexSize,
  onHexClick,
  highlightedCells = [],
}) => {
  const height = grid.length;
  const width = grid[0]?.length || 0;

  const hexWidth = hexSize * 2;
  const hexHeight = Math.sqrt(3) * hexSize;
  const horizontalSpacing = hexWidth * 0.75;
  const verticalSpacing = hexHeight;

  const svgWidth = width * horizontalSpacing + hexWidth * 0.25;
  const svgHeight = height * verticalSpacing + hexHeight * 0.5;

  const getHexCenter = (x: number, y: number): { cx: number; cy: number } => {
    const cx = x * horizontalSpacing + hexSize;
    const cy = y * verticalSpacing + (x % 2 === 1 ? verticalSpacing / 2 : 0) + hexHeight / 2;
    return { cx, cy };
  };

  const getHexPoints = (cx: number, cy: number, size: number): string => {
    const points: string[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = cx + size * Math.cos(angle);
      const py = cy + size * Math.sin(angle);
      points.push(`${px},${py}`);
    }
    return points.join(' ');
  };

  const isHighlighted = (x: number, y: number): boolean => {
    return highlightedCells.some((c) => c.x === x && c.y === y);
  };

  const isStart = (x: number, y: number): boolean => {
    return start !== null && start.x === x && start.y === y;
  };

  const isEnd = (x: number, y: number): boolean => {
    return end !== null && end.x === x && end.y === y;
  };

  const hexElements = useMemo(() => {
    const elements: React.ReactNode[] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const { cx, cy } = getHexCenter(x, y);
        const cellType = grid[y][x];
        const highlighted = isHighlighted(x, y);
        const startCell = isStart(x, y);
        const endCell = isEnd(x, y);

        let fillColor = '';
        let strokeColor = 'rgba(100, 200, 255, 0.3)';
        let glowFilter = '';
        let scale = 1;

        if (cellType === 'obstacle') {
          fillColor = '#2d2d44';
          strokeColor = 'rgba(80, 80, 120, 0.5)';
        } else {
          const intensity = 0.3 + (x + y) % 5 * 0.15;
          fillColor = `rgba(46, ${120 + intensity * 50}, 100, ${0.6 + intensity * 0.2})`;
        }

        if (highlighted) {
          fillColor = 'rgba(255, 107, 107, 0.6)';
          strokeColor = '#ff6b6b';
          glowFilter = 'url(#glow)';
        }

        if (startCell) {
          fillColor = 'rgba(72, 219, 251, 0.8)';
          strokeColor = '#48dbfb';
          glowFilter = 'url(#glow-blue)';
          scale = 1.05;
        }

        if (endCell) {
          fillColor = 'rgba(255, 107, 107, 0.8)';
          strokeColor = '#ff6b6b';
          glowFilter = 'url(#glow-red)';
          scale = 1.05;
        }

        const points = getHexPoints(cx, cy, hexSize * scale * 0.95);

        elements.push(
          <polygon
            key={`hex-${x}-${y}`}
            points={points}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
            filter={glowFilter || undefined}
            className="hex-cell"
            onClick={() => onHexClick({ x, y })}
            style={{
              cursor: cellType === 'obstacle' ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (cellType !== 'obstacle') {
                (e.currentTarget as SVGPolygonElement).style.filter = 'url(#glow-hover)';
                (e.currentTarget as SVGPolygonElement).style.transform = `scale(${scale * 1.02})`;
                (e.currentTarget as SVGPolygonElement).style.transformOrigin = `${cx}px ${cy}px`;
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as SVGPolygonElement).style.filter = glowFilter || '';
              (e.currentTarget as SVGPolygonElement).style.transform = 'scale(1)';
            }}
          />
        );
      }
    }

    return elements;
  }, [grid, start, end, highlightedCells, hexSize, width, height]);

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      className="hex-grid-svg"
      style={{ display: 'block' }}
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="glow-blue" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="glow-hover" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {hexElements}
    </svg>
  );
};

export default HexGrid;
