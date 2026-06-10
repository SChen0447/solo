import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { MazeGrid } from '../utils/mazeGenerator';
import type { CharacterType } from '../utils/exportUtils';

const CELL_SIZE = 32;
const WALL_COLOR = '#3d3d3d';
const FLOOR_COLOR = '#f5f0e1';
const CHAR_SIZE = 16;
const MOVE_SPEED = 2;

export type Direction = 'up' | 'down' | 'left' | 'right';
export type EditMode = 'wall' | 'erase';

interface CharacterState {
  x: number;
  y: number;
  direction: Direction;
  frameIndex: number;
  isMoving: boolean;
  isShaking: boolean;
  shakeStart: number;
  opacity: number;
  moveStartTime: number;
}

interface MazeCanvasProps {
  maze: MazeGrid;
  onMazeChange: (maze: MazeGrid) => void;
  characterType: CharacterType;
  frameDelays: number[];
  currentFrame: number;
  editMode: EditMode;
}

const MazeCanvas: React.FC<MazeCanvasProps> = ({
  maze,
  onMazeChange,
  characterType,
  frameDelays,
  editMode
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const charRef = useRef<CharacterState>({
    x: CELL_SIZE * 1.5,
    y: CELL_SIZE * 1.5,
    direction: 'down',
    frameIndex: 0,
    isMoving: false,
    isShaking: false,
    shakeStart: 0,
    opacity: 1,
    moveStartTime: 0
  });
  const lastFrameTimeRef = useRef<number>(0);
  const frameAccumulatorRef = useRef<number>(0);
  const [, forceUpdate] = useState(0);

  const getSpeedMultiplier = useCallback((startTime: number): number => {
    if (startTime === 0) return 1;
    const elapsed = performance.now() - startTime;
    if (elapsed < 500) return 1;
    const steps = Math.floor((elapsed - 500) / 500);
    return Math.min(1 + steps * 0.1, 2);
  }, []);

  const checkCollision = useCallback((x: number, y: number): boolean => {
    const halfSize = CHAR_SIZE / 2;
    const corners = [
      { x: x - halfSize, y: y - halfSize },
      { x: x + halfSize - 1, y: y - halfSize },
      { x: x - halfSize, y: y + halfSize - 1 },
      { x: x + halfSize - 1, y: y + halfSize - 1 }
    ];

    for (const corner of corners) {
      const col = Math.floor(corner.x / CELL_SIZE);
      const row = Math.floor(corner.y / CELL_SIZE);
      if (row < 0 || row >= maze.length || col < 0 || col >= maze[0].length) {
        return true;
      }
      if (maze[row][col] === 1) {
        return true;
      }
    }
    return false;
  }, [maze]);

  const drawKnight = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, direction: Direction, frame: number) => {
    const cx = x;
    const cy = y;
    const size = CHAR_SIZE;

    ctx.fillStyle = '#333';
    ctx.fillRect(cx - size / 2, cy - size / 2, size, size);

    ctx.fillStyle = '#888';
    ctx.fillRect(cx - size / 2 + 2, cy - size / 2 + 2, size - 4, size - 4);

    ctx.fillStyle = '#fff';
    if (direction === 'up') {
      const offset = frame % 2 === 0 ? 0 : 1;
      ctx.fillRect(cx - 4, cy - 4 + offset, 2, 2);
      ctx.fillRect(cx + 2, cy - 4 + offset, 2, 2);
    } else if (direction === 'down') {
      const offset = frame % 2 === 0 ? 0 : 1;
      ctx.fillRect(cx - 4, cy + 2 + offset, 2, 2);
      ctx.fillRect(cx + 2, cy + 2 + offset, 2, 2);
    } else if (direction === 'left') {
      const offset = frame % 2 === 0 ? 0 : 1;
      ctx.fillRect(cx - 5 + offset, cy - 2, 2, 2);
      ctx.fillRect(cx - 5 + offset, cy + 2, 2, 2);
    } else {
      const offset = frame % 2 === 0 ? 0 : 1;
      ctx.fillRect(cx + 3 + offset, cy - 2, 2, 2);
      ctx.fillRect(cx + 3 + offset, cy + 2, 2, 2);
    }
  }, []);

  const drawMouse = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, direction: Direction, frame: number) => {
    const cx = x;
    const cy = y;
    const size = CHAR_SIZE;

    ctx.fillStyle = '#aaa';
    ctx.fillRect(cx - size / 2 + 1, cy - size / 2 + 3, size - 2, size - 4);

    ctx.fillStyle = '#f9a';
    if (direction === 'up' || direction === 'down') {
      ctx.fillRect(cx - 5, cy - size / 2 + 1, 3, 3);
      ctx.fillRect(cx + 2, cy - size / 2 + 1, 3, 3);
    } else if (direction === 'left') {
      ctx.fillRect(cx - size / 2 + 1, cy - 5, 3, 3);
      ctx.fillRect(cx - size / 2 + 1, cy + 2, 3, 3);
    } else {
      ctx.fillRect(cx + size / 2 - 4, cy - 5, 3, 3);
      ctx.fillRect(cx + size / 2 - 4, cy + 2, 3, 3);
    }

    ctx.fillStyle = '#333';
    const offset = frame % 2 === 0 ? 0 : 1;
    if (direction === 'up') {
      ctx.fillRect(cx - 3, cy - 3 + offset, 2, 2);
      ctx.fillRect(cx + 1, cy - 3 + offset, 2, 2);
    } else if (direction === 'down') {
      ctx.fillRect(cx - 3, cy + 2 + offset, 2, 2);
      ctx.fillRect(cx + 1, cy + 2 + offset, 2, 2);
    } else if (direction === 'left') {
      ctx.fillRect(cx - 5 + offset, cy - 2, 2, 2);
      ctx.fillRect(cx - 5 + offset, cy + 1, 2, 2);
    } else {
      ctx.fillRect(cx + 3 + offset, cy - 2, 2, 2);
      ctx.fillRect(cx + 3 + offset, cy + 1, 2, 2);
    }
  }, []);

  const draw = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rows = maze.length;
    const cols = maze[0].length;
    canvas.width = cols * CELL_SIZE;
    canvas.height = rows * CELL_SIZE;

    ctx.fillStyle = FLOOR_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (maze[r][c] === 1) {
          ctx.fillStyle = WALL_COLOR;
          ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      }
    }

    const char = charRef.current;
    const deltaTime = timestamp - lastFrameTimeRef.current;
    lastFrameTimeRef.current = timestamp;

    let moving = false;
    let dx = 0;
    let dy = 0;
    let newDirection: Direction = char.direction;

    const speedMult = getSpeedMultiplier(char.moveStartTime);
    const speed = MOVE_SPEED * speedMult;

    if (keysRef.current.has('w') || keysRef.current.has('W')) {
      dy = -speed;
      newDirection = 'up';
      moving = true;
    } else if (keysRef.current.has('s') || keysRef.current.has('S')) {
      dy = speed;
      newDirection = 'down';
      moving = true;
    } else if (keysRef.current.has('a') || keysRef.current.has('A')) {
      dx = -speed;
      newDirection = 'left';
      moving = true;
    } else if (keysRef.current.has('d') || keysRef.current.has('D')) {
      dx = speed;
      newDirection = 'right';
      moving = true;
    }

    if (!moving) {
      char.moveStartTime = 0;
    } else if (char.moveStartTime === 0) {
      char.moveStartTime = performance.now();
    }

    char.direction = newDirection;

    if (moving && dx !== 0) {
      const newX = char.x + dx;
      if (!checkCollision(newX, char.y)) {
        char.x = newX;
        char.isShaking = false;
      } else {
        if (!char.isShaking) {
          char.isShaking = true;
          char.shakeStart = performance.now();
        }
      }
    }
    if (moving && dy !== 0) {
      const newY = char.y + dy;
      if (!checkCollision(char.x, newY)) {
        char.y = newY;
        if (dx === 0) char.isShaking = false;
      } else {
        if (!char.isShaking && dx === 0) {
          char.isShaking = true;
          char.shakeStart = performance.now();
        }
      }
    }

    char.isMoving = moving;

    if (moving) {
      const dirIndex = directionToIndex(char.direction);
      const frameDelay = frameDelays[dirIndex * 4 + char.frameIndex % 4] || 100;
      const adjustedDelay = frameDelay / speedMult;
      frameAccumulatorRef.current += deltaTime;
      if (frameAccumulatorRef.current >= adjustedDelay) {
        frameAccumulatorRef.current = 0;
        char.frameIndex = (char.frameIndex + 1) % 4;
        forceUpdate(n => n + 1);
      }
    }

    let drawX = char.x;
    let drawY = char.y;
    if (char.isShaking) {
      const elapsed = performance.now() - char.shakeStart;
      if (elapsed < 200) {
        const shakePhase = Math.floor(elapsed / 30);
        drawX += (shakePhase % 2 === 0 ? 1 : -1);
        char.opacity = elapsed % 60 < 30 ? 0.9 : 1;
      } else {
        char.isShaking = false;
        char.opacity = 1;
      }
    } else {
      char.opacity = 1;
    }

    ctx.globalAlpha = char.opacity;
    if (characterType === 'knight') {
      drawKnight(ctx, drawX, drawY, char.direction, char.frameIndex);
    } else {
      drawMouse(ctx, drawX, drawY, char.direction, char.frameIndex);
    }
    ctx.globalAlpha = 1;

    animationRef.current = requestAnimationFrame(draw);
  }, [maze, characterType, frameDelays, checkCollision, drawKnight, drawMouse, getSpeedMultiplier]);

  function directionToIndex(dir: Direction): number {
    switch (dir) {
      case 'up': return 0;
      case 'down': return 1;
      case 'left': return 2;
      case 'right': return 3;
    }
  }

  useEffect(() => {
    lastFrameTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [draw]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
        keysRef.current.add(e.key);
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);
    toggleCell(row, col);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.buttons !== 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);
    toggleCell(row, col);
  };

  const toggleCell = (row: number, col: number) => {
    if (row < 0 || row >= maze.length || col < 0 || col >= maze[0].length) return;
    if (row === 0 || row === maze.length - 1 || col === 0 || col === maze[0].length - 1) return;
    const newMaze = maze.map(r => [...r]);
    newMaze[row][col] = editMode === 'wall' ? 1 : 0;
    onMazeChange(newMaze);
  };

  return (
    <canvas
      ref={canvasRef}
      className="maze-canvas"
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
    />
  );
};

export default MazeCanvas;
