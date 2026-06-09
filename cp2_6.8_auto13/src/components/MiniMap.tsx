import React, { useRef, useEffect } from 'react';
import { Cell, Position, MAZE_WIDTH, MAZE_HEIGHT, AIState } from '../utils/gameTypes';

interface MiniMapProps {
  maze: Cell[][];
  playerPos: Position;
  ais: AIState[];
  endPos: Position;
}

const MiniMap: React.FC<MiniMapProps> = ({ maze, playerPos, ais, endPos }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cellSize = 8;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = MAZE_WIDTH * cellSize;
    const height = MAZE_HEIGHT * cellSize;
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    for (let y = 0; y < MAZE_HEIGHT; y++) {
      for (let x = 0; x < MAZE_WIDTH; x++) {
        const cell = maze[y][x];
        const px = x * cellSize;
        const py = y * cellSize;

        if (cell.type === 'wall') {
          ctx.fillStyle = '#4a0e4e';
        } else if (cell.explored) {
          ctx.fillStyle = '#c0c0c0';
        } else {
          ctx.fillStyle = '#2a2a4e';
        }
        ctx.fillRect(px, py, cellSize - 1, cellSize - 1);
      }
    }

    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(
      endPos.x * cellSize,
      endPos.y * cellSize,
      cellSize,
      cellSize
    );

    for (const ai of ais) {
      ctx.fillStyle = ai.state === 'chase' ? '#ff6b6b' : '#ef4444';
      ctx.fillRect(
        ai.position.x * cellSize,
        ai.position.y * cellSize,
        cellSize,
        cellSize
      );
    }

    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(
      playerPos.x * cellSize,
      playerPos.y * cellSize,
      cellSize,
      cellSize
    );
  }, [maze, playerPos, ais, endPos, cellSize]);

  return (
    <div className="minimap-container">
      <h3 className="minimap-title">小地图</h3>
      <canvas
        ref={canvasRef}
        className="minimap-canvas"
        style={{
          borderRadius: '4px',
          border: '2px solid #4a0e4e',
        }}
      />
      <div className="minimap-legend">
        <div className="legend-item">
          <span className="legend-color player-color" />
          <span>玩家</span>
        </div>
        <div className="legend-item">
          <span className="legend-color ai-color" />
          <span>敌人</span>
        </div>
        <div className="legend-item">
          <span className="legend-color end-color" />
          <span>终点</span>
        </div>
      </div>
    </div>
  );
};

export default MiniMap;
