import React, { useRef, useEffect } from 'react';
import { Cell, Position, AIState, MAZE_WIDTH, MAZE_HEIGHT } from '../utils/gameTypes';

interface MazeProps {
  maze: Cell[][];
  playerPos: Position;
  ais: AIState[];
  shortestPath: Position[];
  showPath: boolean;
  traps: Position[];
  trapFlashActive: boolean;
  darkVision: boolean;
  cellSize?: number;
  pathOpacity: number;
}

const COLORS = {
  background: '#1a1a2e',
  wall: '#4a0e4e',
  path: '#e0e0e0',
  start: '#4ade80',
  end: '#fbbf24',
  player: '#3b82f6',
  playerGlow: 'rgba(59, 130, 246, 0.4)',
  ai: '#ef4444',
  aiChaseGlow: 'rgba(239, 68, 68, 0.6)',
  trap: 'transparent',
  pathLine: '#22c55e',
  darkOverlay: 'rgba(0, 0, 0, 0.6)',
  explored: '#c0c0c0',
};

const Maze: React.FC<MazeProps> = ({
  maze,
  playerPos,
  ais,
  shortestPath,
  showPath,
  trapFlashActive,
  darkVision,
  cellSize = 32,
  pathOpacity,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = MAZE_WIDTH * cellSize;
    const height = MAZE_HEIGHT * cellSize;
    canvas.width = width;
    canvas.height = height;

    const render = (timestamp: number) => {
      const deltaTime = timestamp - timeRef.current;
      timeRef.current = timestamp;

      ctx.fillStyle = COLORS.background;
      ctx.fillRect(0, 0, width, height);

      for (let y = 0; y < MAZE_HEIGHT; y++) {
        for (let x = 0; x < MAZE_WIDTH; x++) {
          const cell = maze[y][x];
          const px = x * cellSize;
          const py = y * cellSize;

          switch (cell.type) {
            case 'wall':
              ctx.fillStyle = COLORS.wall;
              break;
            case 'path':
            case 'start':
            case 'end':
              ctx.fillStyle = cell.explored ? COLORS.explored : COLORS.path;
              break;
          }
          ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);

          if (cell.type === 'start') {
            ctx.fillStyle = COLORS.start;
            ctx.beginPath();
            ctx.arc(px + cellSize / 2, py + cellSize / 2, cellSize / 4, 0, Math.PI * 2);
            ctx.fill();
          } else if (cell.type === 'end') {
            ctx.fillStyle = COLORS.end;
            ctx.fillRect(
              px + cellSize / 4,
              py + cellSize / 4,
              cellSize / 2,
              cellSize / 2
            );
          }
        }
      }

      if (showPath && shortestPath.length > 1) {
        ctx.globalAlpha = pathOpacity;
        ctx.strokeStyle = COLORS.pathLine;
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(
          shortestPath[0].x * cellSize + cellSize / 2,
          shortestPath[0].y * cellSize + cellSize / 2
        );
        for (let i = 1; i < shortestPath.length; i++) {
          ctx.lineTo(
            shortestPath[i].x * cellSize + cellSize / 2,
            shortestPath[i].y * cellSize + cellSize / 2
          );
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }

      for (const ai of ais) {
        const aiPx = ai.position.x * cellSize + cellSize / 2;
        const aiPy = ai.position.y * cellSize + cellSize / 2;

        if (ai.state === 'chase') {
          const pulseSize = Math.sin(timestamp / 150) * 4 + cellSize * 0.7;
          const gradient = ctx.createRadialGradient(aiPx, aiPy, 0, aiPx, aiPy, pulseSize);
          gradient.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
          gradient.addColorStop(0.5, 'rgba(239, 68, 68, 0.3)');
          gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(aiPx, aiPy, pulseSize, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = COLORS.ai;
        ctx.beginPath();
        ctx.arc(aiPx, aiPy, cellSize / 3, 0, Math.PI * 2);
        ctx.fill();
      }

      const playerPx = playerPos.x * cellSize + cellSize / 2;
      const playerPy = playerPos.y * cellSize + cellSize / 2;

      const glowSize = cellSize * 0.9 + Math.sin(timestamp / 300) * 3;
      const playerGradient = ctx.createRadialGradient(playerPx, playerPy, 0, playerPx, playerPy, glowSize);
      playerGradient.addColorStop(0, 'rgba(59, 130, 246, 0.6)');
      playerGradient.addColorStop(0.6, 'rgba(59, 130, 246, 0.2)');
      playerGradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
      ctx.fillStyle = playerGradient;
      ctx.beginPath();
      ctx.arc(playerPx, playerPy, glowSize, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = COLORS.player;
      ctx.beginPath();
      ctx.arc(playerPx, playerPy, cellSize / 3, 0, Math.PI * 2);
      ctx.fill();

      if (darkVision) {
        ctx.fillStyle = COLORS.darkOverlay;
        ctx.fillRect(0, 0, width, height);

        const visionRadius = cellSize * 2.5;
        ctx.globalCompositeOperation = 'destination-out';
        const visionGradient = ctx.createRadialGradient(
          playerPx, playerPy, 0,
          playerPx, playerPy, visionRadius
        );
        visionGradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
        visionGradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.5)');
        visionGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = visionGradient;
        ctx.beginPath();
        ctx.arc(playerPx, playerPy, visionRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }

      if (trapFlashActive) {
        const flashIntensity = 0.3 + Math.sin(timestamp / 50) * 0.2;
        ctx.strokeStyle = `rgba(239, 68, 68, ${flashIntensity})`;
        ctx.lineWidth = 12;
        ctx.strokeRect(0, 0, width, height);
      }

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [maze, playerPos, ais, shortestPath, showPath, trapFlashActive, darkVision, cellSize, pathOpacity]);

  return (
    <div className="maze-container">
      <canvas
        ref={canvasRef}
        className="maze-canvas"
        style={{
          borderRadius: '8px',
          boxShadow: '0 0 30px rgba(74, 14, 78, 0.5)',
        }}
      />
    </div>
  );
};

export default Maze;
