import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Bubble,
  FlyingBubble,
  Particle,
  BubbleColor,
  BUBBLE_RADIUS,
  BUBBLE_DIAMETER,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  COLOR_HEX,
  generateInitialBubbles,
  buildBubbleMap,
  findConnectedSameColor,
  findIsolatedBubbles,
  checkWallCollision,
  findSnapPosition,
  createBubble,
  createParticles,
  randomColor,
} from '../utils/physics';
import HeaderPanel from './HeaderPanel';

interface GameState {
  score: number;
  level: number;
  remainingBubbles: number;
  gameStatus: 'playing' | 'won' | 'lost';
  scorePulse: boolean;
  shotsRemaining: number;
}

interface FallingBubble extends Bubble {
  vy: number;
  startTime: number;
}

interface DissolvingBubble {
  bubble: Bubble;
  startTime: number;
  duration: number;
}

interface WinStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
}

const BUBBLE_SPEED = 400;
const SHOOTS_PER_LEVEL = 30;
const DISSOLVE_DURATION = 0.3;
const FALL_DURATION = 0.5;
const MAX_FALL_SPEED = 200;
const COMBO_WINDOW = 2;
const WIN_DURATION = 3;
const MAX_PARTICLES = 50;
const MAX_ROWS = 12;

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const fpsRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const fpsLastUpdateRef = useRef<number>(0);

  const bubblesRef = useRef<Bubble[]>([]);
  const bubbleMapRef = useRef<Map<string, Bubble>>(new Map());
  const flyingBubbleRef = useRef<FlyingBubble | null>(null);
  const nextBubbleColorRef = useRef<BubbleColor>(randomColor());

  const particlesRef = useRef<Particle[]>([]);
  const dissolvingRef = useRef<DissolvingBubble[]>([]);
  const fallingRef = useRef<FallingBubble[]>([]);
  const winStarsRef = useRef<WinStar[]>([]);

  const mouseRef = useRef({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 60, isDown: false });
  const isAnimatingRef = useRef(false);

  const lastMatchTimeRef = useRef<number>(0);
  const comboCountRef = useRef<number>(0);

  const winStartTimeRef = useRef<number>(0);
  const levelStartTimeRef = useRef<number>(0);

  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    level: 1,
    remainingBubbles: 64,
    gameStatus: 'playing',
    scorePulse: false,
    shotsRemaining: SHOOTS_PER_LEVEL,
  });

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const getRowsForLevel = useCallback((level: number): number => {
    return Math.min(8 + level - 1, MAX_ROWS);
  }, []);

  const initLevel = useCallback((level: number) => {
    const rows = getRowsForLevel(level);
    const bubbles = generateInitialBubbles(rows);
    bubblesRef.current = bubbles;
    bubbleMapRef.current = buildBubbleMap(bubbles);
    flyingBubbleRef.current = null;
    nextBubbleColorRef.current = randomColor();
    particlesRef.current = [];
    dissolvingRef.current = [];
    fallingRef.current = [];
    winStarsRef.current = [];
    isAnimatingRef.current = false;
    comboCountRef.current = 0;
    lastMatchTimeRef.current = 0;

    setGameState((prev) => ({
      ...prev,
      level,
      remainingBubbles: bubbles.length,
      gameStatus: 'playing',
      shotsRemaining: SHOOTS_PER_LEVEL,
    }));
  }, [getRowsForLevel]);

  const resetCurrentLevel = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      score: 0,
    }));
    initLevel(gameStateRef.current.level);
  }, [initLevel]);

  const addScore = useCallback((points: number) => {
    setGameState((prev) => ({
      ...prev,
      score: prev.score + points,
      scorePulse: true,
    }));
    setTimeout(() => {
      setGameState((prev) => ({ ...prev, scorePulse: false }));
    }, 200);
  }, []);

  const fireBubble = useCallback(() => {
    if (isAnimatingRef.current) return;
    if (flyingBubbleRef.current) return;
    if (gameStateRef.current.gameStatus !== 'playing') return;
    if (gameStateRef.current.shotsRemaining <= 0) return;

    const mouse = mouseRef.current;
    const startX = CANVAS_WIDTH / 2;
    const startY = CANVAS_HEIGHT - 60;

    const dx = mouse.x - startX;
    const dy = mouse.y - startY;

    if (dy >= -10) return;

    const dist = Math.sqrt(dx * dx + dy * dy);
    const vx = (dx / dist) * BUBBLE_SPEED;
    const vy = (dy / dist) * BUBBLE_SPEED;

    const color = nextBubbleColorRef.current;

    flyingBubbleRef.current = {
      x: startX,
      y: startY,
      vx,
      vy,
      color,
      radius: BUBBLE_RADIUS,
    };

    nextBubbleColorRef.current = randomColor();

    setGameState((prev) => ({
      ...prev,
      shotsRemaining: prev.shotsRemaining - 1,
    }));
  }, []);

  const handleBubbleLanding = useCallback(
    (row: number, col: number, color: BubbleColor) => {
      const bubble = createBubble(row, col, color);
      bubblesRef.current.push(bubble);
      bubbleMapRef.current.set(bubble.id, bubble);

      const connected = findConnectedSameColor(bubbleMapRef.current, bubble);

      if (connected.length >= 3) {
        const now = performance.now() / 1000;
        if (now - lastMatchTimeRef.current < COMBO_WINDOW) {
          comboCountRef.current++;
        } else {
          comboCountRef.current = 1;
        }
        lastMatchTimeRef.current = now;

        isAnimatingRef.current = true;

        let totalParticles = 0;
        for (const b of connected) {
          if (totalParticles < MAX_PARTICLES) {
            const newParticles = createParticles(
              b.x,
              b.y,
              COLOR_HEX[b.color],
              Math.min(6, MAX_PARTICLES - totalParticles)
            );
            particlesRef.current.push(...newParticles);
            totalParticles += newParticles.length;
          }
          dissolvingRef.current.push({
            bubble: b,
            startTime: performance.now() / 1000,
            duration: DISSOLVE_DURATION,
          });
          bubbleMapRef.current.delete(b.id);
        }

        const baseScore = connected.length * 5;
        const comboBonus = (comboCountRef.current - 1) * 5;
        addScore(baseScore + comboBonus);

        const remaining = bubblesRef.current.filter((b) => bubbleMapRef.current.has(b.id));
        bubblesRef.current = remaining;

        setTimeout(() => {
          const isolated = findIsolatedBubbles(bubbleMapRef.current, MAX_ROWS);

          if (isolated.length > 0) {
            const now = performance.now() / 1000;
            for (const b of isolated) {
              fallingRef.current.push({
                ...b,
                vy: 0,
                startTime: now,
              });
              bubbleMapRef.current.delete(b.id);
            }

            const remaining2 = bubblesRef.current.filter((b) =>
              bubbleMapRef.current.has(b.id)
            );
            bubblesRef.current = remaining2;

            addScore(isolated.length * 10);
          }

          setTimeout(() => {
            isAnimatingRef.current = false;
            const currentBubbles = bubblesRef.current.length;
            setGameState((prev) => {
              let status = prev.gameStatus;
              if (currentBubbles === 0) {
                status = 'won';
                winStartTimeRef.current = performance.now() / 1000;
                generateWinStars();
                setTimeout(() => {
                  initLevel(prev.level + 1);
                }, WIN_DURATION * 1000);
              } else if (prev.shotsRemaining <= 0 && !flyingBubbleRef.current) {
                status = 'lost';
              }
              return {
                ...prev,
                remainingBubbles: currentBubbles,
                gameStatus: status,
              };
            });
          }, FALL_DURATION * 1000 + 100);
        }, DISSOLVE_DURATION * 1000 + 50);
      } else {
        isAnimatingRef.current = false;
        setGameState((prev) => {
          let status = prev.gameStatus;
          const remaining = bubblesRef.current.length;
          if (prev.shotsRemaining <= 0 && remaining > 0) {
            status = 'lost';
          }
          return {
            ...prev,
            remainingBubbles: remaining,
            gameStatus: status,
          };
        });
      }
    },
    [addScore, initLevel]
  );

  const generateWinStars = useCallback(() => {
    const stars: WinStar[] = [];
    const colors = Object.values(COLOR_HEX);
    for (let i = 0; i < 30; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: -20 - Math.random() * 100,
        vx: (Math.random() - 0.5) * 40,
        vy: 50 + Math.random() * 100,
        size: 8 + Math.random() * 12,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 4,
      });
    }
    winStarsRef.current = stars;
  }, []);

  const drawStar = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number, color: string) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
        const innerAngle = angle + Math.PI / 5;
        const outerX = Math.cos(angle) * size;
        const outerY = Math.sin(angle) * size;
        const innerX = Math.cos(innerAngle) * (size * 0.4);
        const innerY = Math.sin(innerAngle) * (size * 0.4);
        if (i === 0) {
          ctx.moveTo(outerX, outerY);
        } else {
          ctx.lineTo(outerX, outerY);
        }
        ctx.lineTo(innerX, innerY);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },
    []
  );

  const drawBubble = useCallback(
    (ctx: CanvasRenderingContext2D, bubble: Bubble, scale: number = 1, opacity: number = 1) => {
      const radius = BUBBLE_RADIUS * scale;
      const color = COLOR_HEX[bubble.color];

      ctx.save();
      ctx.globalAlpha = opacity;

      const gradient = ctx.createRadialGradient(
        bubble.x - radius * 0.3,
        bubble.y - radius * 0.3,
        radius * 0.1,
        bubble.x,
        bubble.y,
        radius
      );
      gradient.addColorStop(0, lightenColor(color, 0.5));
      gradient.addColorStop(0.3, color);
      gradient.addColorStop(1, darkenColor(color, 0.3));

      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(bubble.x - radius * 0.3, bubble.y - radius * 0.3, radius * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fill();

      ctx.restore();
    },
    []
  );

  const drawFlyingBubble = useCallback(
    (ctx: CanvasRenderingContext2D, bubble: FlyingBubble) => {
      const color = COLOR_HEX[bubble.color];
      const radius = bubble.radius;

      const gradient = ctx.createRadialGradient(
        bubble.x - radius * 0.3,
        bubble.y - radius * 0.3,
        radius * 0.1,
        bubble.x,
        bubble.y,
        radius
      );
      gradient.addColorStop(0, lightenColor(color, 0.5));
      gradient.addColorStop(0.3, color);
      gradient.addColorStop(1, darkenColor(color, 0.3));

      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(bubble.x - radius * 0.3, bubble.y - radius * 0.3, radius * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fill();
    },
    []
  );

  const drawAimLine = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!mouseRef.current.isDown) return;
    if (flyingBubbleRef.current) return;
    if (gameStateRef.current.gameStatus !== 'playing') return;
    if (gameStateRef.current.shotsRemaining <= 0) return;

    const startX = CANVAS_WIDTH / 2;
    const startY = CANVAS_HEIGHT - 60;
    const mouse = mouseRef.current;

    const dx = mouse.x - startX;
    const dy = mouse.y - startY;

    if (dy >= -10) return;

    const dist = Math.sqrt(dx * dx + dy * dy);
    const vx = dx / dist;
    const vy = dy / dist;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(startX, startY);

    let px = startX;
    let py = startY;
    let cvx = vx;
    let cvy = vy;
    const maxDist = 1000;
    let traveled = 0;
    const step = 10;

    while (traveled < maxDist) {
      const nextX = px + cvx * step;
      const nextY = py + cvy * step;

      if (nextX - BUBBLE_RADIUS <= 0 || nextX + BUBBLE_RADIUS >= CANVAS_WIDTH) {
        cvx = -cvx;
        continue;
      }
      if (nextY - BUBBLE_RADIUS <= 0) {
        break;
      }

      ctx.lineTo(nextX, nextY);
      px = nextX;
      py = nextY;
      traveled += step;
    }

    ctx.stroke();
    ctx.restore();
  }, []);

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#0a0e27');
    gradient.addColorStop(1, '#1a1f4e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }, []);

  const drawBottomBar = useCallback((ctx: CanvasRenderingContext2D) => {
    const barHeight = 80;
    const barY = CANVAS_HEIGHT - barHeight;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, barY, CANVAS_WIDTH, barHeight);

    const progressWidth = 200;
    const progressHeight = 12;
    const progressX = CANVAS_WIDTH / 2 - progressWidth / 2;
    const progressY = barY + (barHeight - progressHeight) / 2;

    const { shotsRemaining } = gameStateRef.current;
    const progress = shotsRemaining / SHOOTS_PER_LEVEL;

    let progressColor = '#44ff44';
    if (shotsRemaining < 10) progressColor = '#ffdd44';
    if (shotsRemaining < 5) progressColor = '#ff4444';

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.roundRect(progressX, progressY, progressWidth, progressHeight, 6);
    ctx.fill();

    ctx.fillStyle = progressColor;
    ctx.beginPath();
    ctx.roundRect(progressX, progressY, progressWidth * progress, progressHeight, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px "SimHei", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`剩余发射: ${shotsRemaining}`, CANVAS_WIDTH / 2, progressY - 8);

    const nextBubbleX = 80;
    const nextBubbleY = barY + barHeight / 2;
    const nextColor = COLOR_HEX[nextBubbleColorRef.current];

    const gradient = ctx.createRadialGradient(
      nextBubbleX - 10,
      nextBubbleY - 10,
      5,
      nextBubbleX,
      nextBubbleY,
      25
    );
    gradient.addColorStop(0, lightenColor(nextColor, 0.5));
    gradient.addColorStop(0.3, nextColor);
    gradient.addColorStop(1, darkenColor(nextColor, 0.3));

    ctx.beginPath();
    ctx.arc(nextBubbleX, nextBubbleY, 25, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(nextBubbleX - 8, nextBubbleY - 8, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#cccccc';
    ctx.font = '12px "SimHei", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('下一个', nextBubbleX, nextBubbleY - 35);
  }, []);

  const drawFPS = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px "SimHei", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`FPS: ${fpsRef.current}`, 10, CANVAS_HEIGHT - 10);
  }, []);

  const drawBorder = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, CANVAS_WIDTH - 2, CANVAS_HEIGHT - 2);
  }, []);

  const drawGameOver = useCallback((ctx: CanvasRenderingContext2D, won: boolean) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = won ? '#44ff44' : '#ff4444';
    ctx.font = 'bold 48px "SimHei", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(won ? '🎉 恭喜通关！' : '💔 游戏结束', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

    ctx.fillStyle = '#ffffff';
    ctx.font = '20px "SimHei", "Microsoft YaHei", sans-serif';
    ctx.fillText(
      won ? `最终得分: ${gameStateRef.current.score}` : `得分: ${gameStateRef.current.score}`,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2 + 30
    );

    if (!won) {
      ctx.font = '16px "SimHei", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#aaaaaa';
      ctx.fillText('点击右上角"重置关卡"重新开始', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
    }
  }, []);

  const update = useCallback(
    (deltaTime: number, currentTime: number) => {
      if (gameStateRef.current.gameStatus === 'won') {
        const elapsed = currentTime - winStartTimeRef.current;
        if (elapsed < WIN_DURATION) {
          for (const star of winStarsRef.current) {
            star.x += star.vx * deltaTime;
            star.y += star.vy * deltaTime;
            star.rotation += star.rotationSpeed * deltaTime;
            if (star.y > CANVAS_HEIGHT + 20) {
              star.y = -20;
              star.x = Math.random() * CANVAS_WIDTH;
            }
          }
        }
      }

      const flying = flyingBubbleRef.current;
      if (flying) {
        flying.x += flying.vx * deltaTime;
        flying.y += flying.vy * deltaTime;

        const wallHit = checkWallCollision(flying);
        if (wallHit === 'left') {
          flying.x = BUBBLE_RADIUS;
          flying.vx = Math.abs(flying.vx);
        } else if (wallHit === 'right') {
          flying.x = CANVAS_WIDTH - BUBBLE_RADIUS;
          flying.vx = -Math.abs(flying.vx);
        } else if (wallHit === 'top') {
          flying.y = BUBBLE_RADIUS;
          const snapPos = findSnapPosition(flying, bubbleMapRef.current, MAX_ROWS);
          if (snapPos) {
            const color = flying.color;
            flyingBubbleRef.current = null;
            handleBubbleLanding(snapPos.row, snapPos.col, color);
          }
        }

        if (flyingBubbleRef.current) {
          let hitBubble: Bubble | null = null;
          for (const bubble of bubblesRef.current) {
            const dx = flying.x - bubble.x;
            const dy = flying.y - bubble.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < BUBBLE_DIAMETER - 4) {
              hitBubble = bubble;
              break;
            }
          }

          if (hitBubble) {
            const snapPos = findSnapPosition(flying, bubbleMapRef.current, MAX_ROWS);
            if (snapPos) {
              const color = flying.color;
              flyingBubbleRef.current = null;
              handleBubbleLanding(snapPos.row, snapPos.col, color);
            } else {
              flyingBubbleRef.current = null;
            }
          }
        }

        if (flyingBubbleRef.current && flying.y > CANVAS_HEIGHT + BUBBLE_DIAMETER) {
          flyingBubbleRef.current = null;
          isAnimatingRef.current = false;
        }
      }

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * deltaTime;
        p.y += p.vy * deltaTime;
        p.vy += 100 * deltaTime;
        p.life -= deltaTime;
        if (p.life <= 0) {
          particles.splice(i, 1);
        }
      }

      const dissolving = dissolvingRef.current;
      for (let i = dissolving.length - 1; i >= 0; i--) {
        const d = dissolving[i];
        const elapsed = currentTime - d.startTime;
        if (elapsed >= d.duration) {
          dissolving.splice(i, 1);
        }
      }

      const falling = fallingRef.current;
      for (let i = falling.length - 1; i >= 0; i--) {
        const f = falling[i];
        const elapsed = currentTime - f.startTime;
        const progress = Math.min(elapsed / FALL_DURATION, 1);
        f.vy = MAX_FALL_SPEED * progress;
        f.y += f.vy * deltaTime;
        if (f.y > CANVAS_HEIGHT + BUBBLE_DIAMETER) {
          falling.splice(i, 1);
        }
      }
    },
    [handleBubbleLanding]
  );

  const render = useCallback(
    (ctx: CanvasRenderingContext2D, currentTime: number) => {
      drawBackground(ctx);
      drawBorder(ctx);

      for (const bubble of bubblesRef.current) {
        drawBubble(ctx, bubble);
      }

      for (const d of dissolvingRef.current) {
        const elapsed = currentTime - d.startTime;
        const progress = Math.min(elapsed / d.duration, 1);
        const scale = 1 - progress * 0.8;
        const opacity = 1 - progress;
        drawBubble(ctx, d.bubble, scale, opacity);
      }

      for (const f of fallingRef.current) {
        const elapsed = currentTime - f.startTime;
        const progress = Math.min(elapsed / FALL_DURATION, 1);
        const opacity = 1 - progress * 0.5;
        drawBubble(ctx, f as Bubble, 1, opacity);
      }

      if (flyingBubbleRef.current) {
        drawFlyingBubble(ctx, flyingBubbleRef.current);
      }

      drawAimLine(ctx);

      for (const p of particlesRef.current) {
        const alpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (gameStateRef.current.gameStatus === 'won') {
        for (const star of winStarsRef.current) {
          drawStar(ctx, star.x, star.y, star.size, star.rotation, star.color);
        }
      }

      drawBottomBar(ctx);
      drawFPS(ctx);

      if (
        gameStateRef.current.gameStatus !== 'playing' &&
        gameStateRef.current.gameStatus !== 'won'
      ) {
        drawGameOver(ctx, false);
      }
    },
    [
      drawBackground,
      drawBorder,
      drawBubble,
      drawFlyingBubble,
      drawAimLine,
      drawBottomBar,
      drawFPS,
      drawStar,
      drawGameOver,
    ]
  );

  const gameLoop = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const deltaTime = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = timestamp;

      frameCountRef.current++;
      if (timestamp - fpsLastUpdateRef.current >= 1000) {
        fpsRef.current = frameCountRef.current;
        frameCountRef.current = 0;
        fpsLastUpdateRef.current = timestamp;
      }

      const currentTime = timestamp / 1000;

      update(deltaTime, currentTime);
      render(ctx, currentTime);

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    },
    [update, render]
  );

  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoords(e);
      mouseRef.current = { x, y, isDown: true };
    },
    [getCanvasCoords]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoords(e);
      if (mouseRef.current.isDown) {
        mouseRef.current.x = x;
        mouseRef.current.y = y;
      } else {
        mouseRef.current.x = x;
        mouseRef.current.y = y;
      }
    },
    [getCanvasCoords]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoords(e);
      mouseRef.current.x = x;
      mouseRef.current.y = y;
      mouseRef.current.isDown = false;
      fireBubble();
    },
    [fireBubble, getCanvasCoords]
  );

  const handleMouseLeave = useCallback(() => {
    if (mouseRef.current.isDown) {
      mouseRef.current.isDown = false;
      fireBubble();
    }
  }, [fireBubble]);

  useEffect(() => {
    initLevel(1);
    levelStartTimeRef.current = performance.now() / 1000;
  }, [initLevel]);

  useEffect(() => {
    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameLoop]);

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '800px',
    height: '600px',
    margin: '0 auto',
  };

  const canvasStyle: React.CSSProperties = {
    display: 'block',
    cursor: 'crosshair',
    borderRadius: '4px',
  };

  return (
    <div style={containerStyle}>
      <HeaderPanel
        score={gameState.score}
        level={gameState.level}
        remainingBubbles={gameState.remainingBubbles}
        onReset={resetCurrentLevel}
        scorePulse={gameState.scorePulse}
      />
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={canvasStyle}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
};

function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.floor(255 * amount));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.floor(255 * amount));
  const b = Math.min(255, (num & 0xff) + Math.floor(255 * amount));
  return `rgb(${r}, ${g}, ${b})`;
}

function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, ((num >> 16) & 0xff) - Math.floor(255 * amount));
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.floor(255 * amount));
  const b = Math.max(0, (num & 0xff) - Math.floor(255 * amount));
  return `rgb(${r}, ${g}, ${b})`;
}

export default GameCanvas;
