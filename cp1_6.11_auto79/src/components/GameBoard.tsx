import { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import { getDirectionAngle } from '../utils/commandExecutor';
import { Direction, Level, Fragment } from '../types';
import './GameBoard.css';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

interface CollectEffect {
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

const CELL_SIZE = 60;
const MOBILE_CELL_SIZE = 45;

export default function GameBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const collectEffectsRef = useRef<CollectEffect[]>([]);
  const lastCollectedRef = useRef<string[]>([]);
  const [cellSize, setCellSize] = useState(CELL_SIZE);

  const { currentLevel, state } = useGame();
  const { robot, gameStatus, isRunning } = state;

  useEffect(() => {
    const handleResize = () => {
      setCellSize(window.innerWidth < 768 ? MOBILE_CELL_SIZE : CELL_SIZE);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const canvasSize = currentLevel.size * cellSize;

  useEffect(() => {
    if (gameStatus === 'success' && particlesRef.current.length === 0) {
      createFireworks(canvasSize / 2, canvasSize / 2);
    }
    if (gameStatus !== 'success') {
      particlesRef.current = [];
    }
  }, [gameStatus, canvasSize]);

  const createFireworks = (centerX: number, centerY: number) => {
    const particles: Particle[] = [];
    const count = 80;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 2 + Math.random() * 4;
      const hue = 40 + Math.random() * 20;
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: `hsl(${hue}, 100%, 60%)`,
        life: 1.5,
        maxLife: 1.5,
        size: 2 + Math.random() * 3,
      });
    }
    particlesRef.current = particles;
  };

  useEffect(() => {
    const newCollected = robot.collectedFragments.filter(
      id => !lastCollectedRef.current.includes(id)
    );
    for (const fragId of newCollected) {
      const fragment = currentLevel.fragments.find(f => f.id === fragId);
      if (fragment) {
        const x = fragment.position.x * cellSize + cellSize / 2;
        const y = fragment.position.y * cellSize + cellSize / 2;
        collectEffectsRef.current.push({ x, y, startTime: performance.now(), duration: 200 });
      }
    }
    lastCollectedRef.current = [...robot.collectedFragments];
  }, [robot.collectedFragments, currentLevel.fragments, cellSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();
    let bounceTime = 0;

    const render = (timestamp: number) => {
      const deltaTime = (timestamp - lastTime) / 1000;
      lastTime = timestamp;
      bounceTime += deltaTime;

      ctx.clearRect(0, 0, canvasSize, canvasSize);

      drawMaze(ctx, cellSize, currentLevel, timestamp);
      drawFragments(ctx, cellSize, currentLevel.fragments, robot.collectedFragments, timestamp);
      drawCollectEffects(ctx, collectEffectsRef.current, timestamp);
      drawRobot(ctx, cellSize, robot.position.x, robot.position.y, robot.direction, bounceTime, isRunning);

      updateParticles(deltaTime);
      drawParticles(ctx, particlesRef.current);

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationRef.current);
  }, [canvasSize, cellSize, currentLevel, robot, isRunning]);

  const updateParticles = (deltaTime: number) => {
    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= deltaTime;
      return p.life > 0;
    });
    collectEffectsRef.current = collectEffectsRef.current.filter(
      e => performance.now() - e.startTime < e.duration
    );
  };

  return (
    <div className="game-board-container">
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        className="game-canvas"
      />
    </div>
  );
}

function drawMaze(
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  level: Level,
  timestamp: number
) {
  const { size, grid } = level;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cellType = grid[y][x];
      const px = x * cellSize;
      const py = y * cellSize;

      switch (cellType) {
        case 'wall':
          ctx.fillStyle = '#7f8c8d';
          ctx.fillRect(px, py, cellSize, cellSize);
          ctx.strokeStyle = '#5d6d7e';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, cellSize - 1, cellSize - 1);
          ctx.fillStyle = '#6c7a7a';
          ctx.fillRect(px + 4, py + 4, cellSize - 8, 3);
          ctx.fillRect(px + 4, py + cellSize - 7, cellSize - 8, 3);
          break;
        case 'path':
          ctx.fillStyle = '#ecf0f1';
          ctx.fillRect(px, py, cellSize, cellSize);
          ctx.strokeStyle = '#d5dbdb';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, cellSize - 1, cellSize - 1);
          break;
        case 'start': {
          const alpha = 0.8 + 0.2 * Math.sin(timestamp / 500);
          const gradient = ctx.createLinearGradient(px, py, px, py + cellSize);
          gradient.addColorStop(0, `rgba(39, 174, 96, ${alpha})`);
          gradient.addColorStop(1, `rgba(125, 206, 140, ${alpha})`);
          ctx.fillStyle = gradient;
          ctx.fillRect(px, py, cellSize, cellSize);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('起点', px + cellSize / 2, py + cellSize / 2);
          break;
        }
        case 'end': {
          const alpha = 0.8 + 0.2 * Math.sin(timestamp / 500);
          const gradient = ctx.createLinearGradient(px, py, px, py + cellSize);
          gradient.addColorStop(0, `rgba(231, 76, 60, ${alpha})`);
          gradient.addColorStop(1, `rgba(243, 156, 18, ${alpha})`);
          ctx.fillStyle = gradient;
          ctx.fillRect(px, py, cellSize, cellSize);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('终点', px + cellSize / 2, py + cellSize / 2);
          break;
        }
      }
    }
  }
}

function drawFragments(
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  fragments: Fragment[],
  collectedIds: string[],
  timestamp: number
) {
  for (const fragment of fragments) {
    if (collectedIds.includes(fragment.id)) continue;
    const cx = fragment.position.x * cellSize + cellSize / 2;
    const cy = fragment.position.y * cellSize + cellSize / 2;
    const floatY = Math.sin(timestamp / 300 + fragment.position.x) * 3;
    drawStar(ctx, cx, cy + floatY, cellSize * 0.3, '#f1c40f', '#f39c12');
  }
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  fillColor: string,
  strokeColor: string
) {
  const spikes = 5;
  const outerRadius = size;
  const innerRadius = size * 0.4;
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawCollectEffects(
  ctx: CanvasRenderingContext2D,
  effects: CollectEffect[],
  timestamp: number
) {
  for (const effect of effects) {
    const progress = (timestamp - effect.startTime) / effect.duration;
    if (progress > 1) continue;
    const alpha = 1 - progress;
    const size = 15 + progress * 20;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, size, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#f1c40f';
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 + progress * 2;
      const dist = size * 0.7;
      const px = effect.x + Math.cos(angle) * dist;
      const py = effect.y + Math.sin(angle) * dist;
      ctx.beginPath();
      ctx.arc(px, py, 3 * (1 - progress), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawRobot(
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  gridX: number,
  gridY: number,
  direction: Direction,
  bounceTime: number,
  isRunning: boolean
) {
  const cx = gridX * cellSize + cellSize / 2;
  const cy = gridY * cellSize + cellSize / 2;
  const bounce = isRunning ? Math.sin(bounceTime * 10) * 3 : 0;
  const angle = getDirectionAngle(direction);

  ctx.save();
  ctx.translate(cx, cy + bounce);
  ctx.rotate((angle * Math.PI) / 180);

  const robotSize = cellSize * 0.7;
  const halfSize = robotSize / 2;

  ctx.fillStyle = '#bdc3c7';
  ctx.fillRect(-halfSize, -halfSize * 0.6, robotSize, robotSize * 0.8);

  ctx.fillStyle = '#95a5a6';
  ctx.fillRect(-halfSize * 0.8, -halfSize, robotSize * 0.8, robotSize * 0.5);

  ctx.fillStyle = '#3498db';
  ctx.shadowColor = '#3498db';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(-halfSize * 0.3, -halfSize * 0.7, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(halfSize * 0.3, -halfSize * 0.7, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#7f8c8d';
  ctx.fillRect(-halfSize * 0.9, halfSize * 0.2, 6, robotSize * 0.4);
  ctx.fillRect(halfSize * 0.9 - 6, halfSize * 0.2, 6, robotSize * 0.4);

  ctx.fillStyle = '#e74c3c';
  ctx.beginPath();
  ctx.moveTo(halfSize * 0.8, 0);
  ctx.lineTo(halfSize * 0.6, -5);
  ctx.lineTo(halfSize * 0.6, 5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
