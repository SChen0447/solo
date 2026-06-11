import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import {
  SelectedParts,
  Obstacle,
  checkAABBCollision,
  TRACK_LENGTH,
  TRACK_WIDTH,
  TRACK_HEIGHT,
  COLLISION_DAMAGE,
  generateObstacles,
  calculateAircraftStats,
  EngineSound,
  playCrashSound
} from './utils';

export interface RaceTrackHandle {
  startRace: () => void;
  resetRace: () => void;
  getCanvasDataURL: () => string;
}

interface RaceTrackProps {
  selectedParts: SelectedParts;
  isRacing: boolean;
  onRaceEnd: (data: { time: number; collisions: number; durability: number }) => void;
  onDurabilityChange: (durability: number) => void;
}

const AIRCRAFT_WIDTH = 60;
const AIRCRAFT_HEIGHT = 40;

const RaceTrack = forwardRef<RaceTrackHandle, RaceTrackProps>((
  { selectedParts, isRacing, onRaceEnd, onDurabilityChange },
  ref
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const aircraftRef = useRef({
    x: 100,
    y: TRACK_HEIGHT / 2 - AIRCRAFT_HEIGHT / 2,
    vx: 0,
    vy: 0,
    durability: 100,
    collisions: 0,
    isShaking: false,
    shakeTime: 0
  });
  const cameraRef = useRef({ x: 0 });
  const startTimeRef = useRef<number | null>(null);
  const engineSoundRef = useRef<EngineSound | null>(null);
  const lastCollisionIdRef = useRef<string | null>(null);
  const collisionCooldownRef = useRef(0);
  const slowdownTimeRef = useRef(0);

  const stats = calculateAircraftStats(selectedParts);
  const baseSpeed = stats.speed;

  useImperativeHandle(ref, () => ({
    startRace: () => {
      startRace();
    },
    resetRace: () => {
      resetRace();
    },
    getCanvasDataURL: () => {
      if (canvasRef.current) {
        return canvasRef.current.toDataURL('image/png');
      }
      return '';
    }
  }));

  const resetRace = useCallback(() => {
    aircraftRef.current = {
      x: 100,
      y: TRACK_HEIGHT / 2 - AIRCRAFT_HEIGHT / 2,
      vx: 0,
      vy: 0,
      durability: stats.durability,
      collisions: 0,
      isShaking: false,
      shakeTime: 0
    };
    cameraRef.current = { x: 0 };
    startTimeRef.current = null;
    obstaclesRef.current = generateObstacles();
    lastCollisionIdRef.current = null;
    collisionCooldownRef.current = 0;
    slowdownTimeRef.current = 0;
    onDurabilityChange(stats.durability);

    if (engineSoundRef.current) {
      engineSoundRef.current.stop();
      engineSoundRef.current = null;
    }
  }, [stats.durability, onDurabilityChange]);

  const startRace = useCallback(() => {
    resetRace();
    startTimeRef.current = performance.now();

    if (!engineSoundRef.current) {
      engineSoundRef.current = new EngineSound();
      engineSoundRef.current.start();
      engineSoundRef.current.setDurability(aircraftRef.current.durability);
    }
  }, [resetRace]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      keysRef.current.add(e.key);
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

  useEffect(() => {
    obstaclesRef.current = generateObstacles();
    aircraftRef.current.durability = stats.durability;
  }, [stats.durability]);

  useEffect(() => {
    if (!isRacing) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      draw();
      return;
    }

    let lastTime = performance.now();

    const gameLoop = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      update(deltaTime);
      draw();

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRacing]);

  const update = (deltaTime: number) => {
    const aircraft = aircraftRef.current;
    const keys = keysRef.current;

    if (collisionCooldownRef.current > 0) {
      collisionCooldownRef.current -= deltaTime;
    }

    if (slowdownTimeRef.current > 0) {
      slowdownTimeRef.current -= deltaTime;
    }

    const speedMultiplier = slowdownTimeRef.current > 0 ? 0.5 : 1;
    const currentSpeed = baseSpeed * speedMultiplier;

    const acceleration = 400;
    const friction = 3;

    if (keys.has('ArrowLeft') || keys.has('a')) {
      aircraft.vx -= acceleration * deltaTime;
    }
    if (keys.has('ArrowRight') || keys.has('d')) {
      aircraft.vx += acceleration * deltaTime;
    }
    if (keys.has('ArrowUp') || keys.has('w')) {
      aircraft.vy -= acceleration * deltaTime;
    }
    if (keys.has('ArrowDown') || keys.has('s')) {
      aircraft.vy += acceleration * deltaTime;
    }

    aircraft.vx += (currentSpeed - aircraft.vx) * deltaTime * 0.5;

    aircraft.vx -= aircraft.vx * friction * deltaTime;
    aircraft.vy -= aircraft.vy * friction * deltaTime;

    aircraft.x += aircraft.vx * deltaTime;
    aircraft.y += aircraft.vy * deltaTime;

    aircraft.x = Math.max(50, Math.min(TRACK_LENGTH - 50, aircraft.x));
    aircraft.y = Math.max(20, Math.min(TRACK_HEIGHT - AIRCRAFT_HEIGHT - 20, aircraft.y));

    if (aircraft.isShaking) {
      aircraft.shakeTime -= deltaTime;
      if (aircraft.shakeTime <= 0) {
        aircraft.isShaking = false;
      }
    }

    cameraRef.current.x = Math.max(0, Math.min(
      TRACK_LENGTH - TRACK_WIDTH,
      aircraft.x - TRACK_WIDTH / 3
    ));

    checkCollisions();

    if (aircraft.x >= TRACK_LENGTH - 80) {
      endRace();
    }

    if (aircraft.durability <= 0) {
      endRace();
    }
  };

  const checkCollisions = () => {
    const aircraft = aircraftRef.current;
    const obstacles = obstaclesRef.current;

    if (collisionCooldownRef.current > 0) return;

    const aircraftAABB = {
      x: aircraft.x,
      y: aircraft.y,
      width: AIRCRAFT_WIDTH,
      height: AIRCRAFT_HEIGHT
    };

    const time = performance.now() / 1000;

    for (const obstacle of obstacles) {
      let obstacleY = obstacle.y;
      if (obstacle.type === 'pipe') {
        obstacleY = obstacle.y + Math.sin(time * obstacle.floatSpeed + obstacle.floatOffset) * 20;
      }

      const obstacleAABB = {
        x: obstacle.x,
        y: obstacleY,
        width: obstacle.width,
        height: obstacle.height
      };

      if (checkAABBCollision(aircraftAABB, obstacleAABB)) {
        if (lastCollisionIdRef.current !== obstacle.id || collisionCooldownRef.current <= 0) {
          handleCollision(obstacle);
          lastCollisionIdRef.current = obstacle.id;
          collisionCooldownRef.current = 0.5;
        }
        break;
      }
    }
  };

  const handleCollision = (obstacle: Obstacle) => {
    const aircraft = aircraftRef.current;

    aircraft.durability -= COLLISION_DAMAGE;
    aircraft.collisions += 1;
    aircraft.isShaking = true;
    aircraft.shakeTime = 0.3;

    const pushBackForce = 100;
    aircraft.vx = -pushBackForce;

    if (obstacle.type === 'clock') {
      slowdownTimeRef.current = 5;
    }

    playCrashSound();
    onDurabilityChange(Math.max(0, aircraft.durability));

    if (engineSoundRef.current) {
      engineSoundRef.current.setDurability(aircraft.durability);
    }
  };

  const endRace = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (engineSoundRef.current) {
      engineSoundRef.current.stop();
      engineSoundRef.current = null;
    }

    const endTime = performance.now();
    const totalTime = startTimeRef.current ? endTime - startTimeRef.current : 0;

    onRaceEnd({
      time: totalTime,
      collisions: aircraftRef.current.collisions,
      durability: Math.max(0, aircraftRef.current.durability)
    });
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const camera = cameraRef.current;
    const aircraft = aircraftRef.current;

    ctx.clearRect(0, 0, TRACK_WIDTH, TRACK_HEIGHT);

    drawBackground(ctx, camera.x);
    drawObstacles(ctx, camera.x);
    drawAircraft(ctx, aircraft, camera.x);
    drawUI(ctx, camera.x);
  };

  const drawBackground = (ctx: CanvasRenderingContext2D, cameraX: number) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, TRACK_HEIGHT);
    gradient.addColorStop(0, '#c4b89a');
    gradient.addColorStop(1, '#3a2a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, TRACK_WIDTH, TRACK_HEIGHT);

    ctx.fillStyle = 'rgba(59, 43, 26, 0.3)';
    for (let i = 0; i < 10; i++) {
      const buildingX = (i * 400 - cameraX * 0.3) % (TRACK_LENGTH + 400) - 200;
      const buildingHeight = 80 + Math.sin(i * 1.5) * 40;
      const buildingWidth = 60 + Math.cos(i * 2) * 20;

      ctx.fillRect(
        buildingX,
        TRACK_HEIGHT - buildingHeight - 30,
        buildingWidth,
        buildingHeight
      );

      ctx.fillStyle = 'rgba(245, 222, 179, 0.3)';
      for (let wy = 0; wy < buildingHeight - 20; wy += 15) {
        for (let wx = 0; wx < buildingWidth - 10; wx += 15) {
          ctx.fillRect(buildingX + 5 + wx, TRACK_HEIGHT - buildingHeight - 25 + wy, 8, 8);
        }
      }
      ctx.fillStyle = 'rgba(59, 43, 26, 0.3)';
    }

    ctx.fillStyle = '#3b2b1a';
    ctx.fillRect(0, TRACK_HEIGHT - 30, TRACK_WIDTH, 30);

    ctx.strokeStyle = '#5a3a2a';
    ctx.lineWidth = 2;
    for (let i = 0; i < TRACK_WIDTH + 50; i += 50) {
      const x = (i - cameraX * 0.5) % TRACK_WIDTH;
      ctx.beginPath();
      ctx.moveTo(x, TRACK_HEIGHT - 30);
      ctx.lineTo(x + 25, TRACK_HEIGHT);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let i = 0; i < 5; i++) {
      const fogX = (i * 200 - cameraX * 0.1) % (TRACK_WIDTH + 200) - 100;
      const fogY = 50 + i * 60;
      ctx.beginPath();
      ctx.ellipse(fogX, fogY, 100, 20, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawObstacles = (ctx: CanvasRenderingContext2D, cameraX: number) => {
    const time = performance.now() / 1000;

    for (const obstacle of obstaclesRef.current) {
      const screenX = obstacle.x - cameraX;

      if (screenX < -100 || screenX > TRACK_WIDTH + 100) continue;

      let screenY = obstacle.y;
      if (obstacle.type === 'pipe') {
        screenY = obstacle.y + Math.sin(time * obstacle.floatSpeed + obstacle.floatOffset) * 20;
      }

      switch (obstacle.type) {
        case 'gear':
          drawGear(ctx, screenX, screenY, obstacle.width, time);
          break;
        case 'pipe':
          drawPipe(ctx, screenX, screenY, obstacle.width, obstacle.height);
          break;
        case 'clock':
          drawClock(ctx, screenX, screenY, obstacle.width, obstacle.height, time);
          break;
      }
    }
  };

  const drawGear = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, time: number) => {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const radius = size / 2;
    const teeth = 12;
    const toothDepth = size * 0.15;

    const rotation = (time * Math.PI * 2) / 1.5;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);

    ctx.fillStyle = '#7a3a2a';
    ctx.strokeStyle = '#3b2b1a';
    ctx.lineWidth = 2;

    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
      const angle = (i / teeth) * Math.PI * 2;
      const nextAngle = ((i + 0.5) / teeth) * Math.PI * 2;
      const outerAngle = ((i + 0.25) / teeth) * Math.PI * 2;
      const innerAngle = ((i + 0.75) / teeth) * Math.PI * 2;

      const innerR = radius - toothDepth;

      if (i === 0) {
        ctx.moveTo(
          Math.cos(angle) * innerR,
          Math.sin(angle) * innerR
        );
      }
      ctx.lineTo(
        Math.cos(outerAngle) * radius,
        Math.sin(outerAngle) * radius
      );
      ctx.lineTo(
        Math.cos(nextAngle) * innerR,
        Math.sin(nextAngle) * innerR
      );
      ctx.lineTo(
        Math.cos(innerAngle) * innerR,
        Math.sin(innerAngle) * innerR
      );
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#b87333';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#3b2b1a';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  const drawPipe = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
    ctx.save();
    ctx.globalAlpha = 0.6;

    const gradient = ctx.createLinearGradient(x, y, x + width, y);
    gradient.addColorStop(0, '#6b4423');
    gradient.addColorStop(0.5, '#8b6b4a');
    gradient.addColorStop(1, '#5a3a2a');

    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#3b2b1a';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(x, y, width, height, width / 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(245, 222, 179, 0.3)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const ringY = y + height * (0.25 + i * 0.25);
      ctx.beginPath();
      ctx.ellipse(x + width / 2, ringY, width / 2 - 2, 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawClock = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, time: number) => {
    const centerX = x + width / 2;
    const topY = y;

    ctx.fillStyle = '#5a3a2a';
    ctx.strokeStyle = '#3b2b1a';
    ctx.lineWidth = 2;

    ctx.fillRect(centerX - 4, topY, 8, height * 0.3);
    ctx.strokeRect(centerX - 4, topY, 8, height * 0.3);

    const pendulumLength = height * 0.6;
    const swingAngle = Math.sin(time * 1.5) * 0.4;

    ctx.save();
    ctx.translate(centerX, topY + height * 0.3);
    ctx.rotate(swingAngle);

    ctx.strokeStyle = '#b87333';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, pendulumLength);
    ctx.stroke();

    const bobRadius = 15;
    const gradient = ctx.createRadialGradient(-3, pendulumLength - 3, 2, 0, pendulumLength, bobRadius);
    gradient.addColorStop(0, '#d4a574');
    gradient.addColorStop(1, '#7a3a2a');

    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#3b2b1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, pendulumLength, bobRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  };

  const drawAircraft = (ctx: CanvasRenderingContext2D, aircraft: typeof aircraftRef.current, cameraX: number) => {
    const screenX = aircraft.x - cameraX;
    let screenY = aircraft.y;

    if (aircraft.isShaking) {
      screenY += (Math.random() - 0.5) * 6;
      const shakeX = (Math.random() - 0.5) * 4;
      drawAircraftBody(ctx, screenX + shakeX, screenY, aircraft.vx > 0 ? 0 : -0.1);
    } else {
      const tiltAngle = Math.max(-0.2, Math.min(0.2, aircraft.vy / 500));
      drawAircraftBody(ctx, screenX, screenY, tiltAngle);
    }
  };

  const drawAircraftBody = (ctx: CanvasRenderingContext2D, x: number, y: number, tilt: number) => {
    const centerX = x + AIRCRAFT_WIDTH / 2;
    const centerY = y + AIRCRAFT_HEIGHT / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(tilt);

    if (selectedParts.wing) {
      const wingColor = selectedParts.wing.color;
      const wingAccent = selectedParts.wing.accentColor;

      ctx.fillStyle = wingColor;
      ctx.strokeStyle = '#3b2b1a';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(-AIRCRAFT_WIDTH / 2 + 5, 0);
      ctx.lineTo(-10, -AIRCRAFT_HEIGHT / 2 + 5);
      ctx.lineTo(10, -AIRCRAFT_HEIGHT / 2 + 5);
      ctx.lineTo(AIRCRAFT_WIDTH / 2 - 10, 0);
      ctx.lineTo(10, AIRCRAFT_HEIGHT / 2 - 5);
      ctx.lineTo(-10, AIRCRAFT_HEIGHT / 2 - 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = wingAccent;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -AIRCRAFT_HEIGHT / 2 + 5);
      ctx.lineTo(0, AIRCRAFT_HEIGHT / 2 - 5);
      ctx.stroke();
    }

    if (selectedParts.engine) {
      const engineColor = selectedParts.engine.color;
      const engineAccent = selectedParts.engine.accentColor;

      ctx.fillStyle = engineColor;
      ctx.strokeStyle = '#3b2b1a';
      ctx.lineWidth = 2;
      ctx.fillRect(-AIRCRAFT_WIDTH / 2 + 5, -8, 25, 16);
      ctx.strokeRect(-AIRCRAFT_WIDTH / 2 + 5, -8, 25, 16);

      ctx.fillStyle = engineAccent;
      ctx.beginPath();
      ctx.arc(-AIRCRAFT_WIDTH / 2 + 10, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 150, 50, 0.6)';
      ctx.beginPath();
      ctx.moveTo(-AIRCRAFT_WIDTH / 2 + 2, -4);
      ctx.lineTo(-AIRCRAFT_WIDTH / 2 - 8 - Math.random() * 5, 0);
      ctx.lineTo(-AIRCRAFT_WIDTH / 2 + 2, 4);
      ctx.closePath();
      ctx.fill();
    }

    if (selectedParts.cockpit) {
      const cockpitColor = selectedParts.cockpit.color;
      const cockpitAccent = selectedParts.cockpit.accentColor;

      ctx.fillStyle = cockpitColor;
      ctx.strokeStyle = '#3b2b1a';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.ellipse(5, 0, 18, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = cockpitAccent;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.ellipse(8, -2, 10, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (selectedParts.propeller) {
      const propColor = selectedParts.propeller.color;
      const propAccent = selectedParts.propeller.accentColor;
      const time = performance.now() / 1000;
      const propRotation = time * 20;

      ctx.save();
      ctx.translate(AIRCRAFT_WIDTH / 2 - 5, 0);
      ctx.rotate(propRotation);

      ctx.fillStyle = propColor;
      ctx.strokeStyle = '#3b2b1a';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(0, 0, 3, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = propAccent;
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  };

  const drawUI = (ctx: CanvasRenderingContext2D, cameraX: number) => {
    const progress = Math.min(1, aircraftRef.current.x / TRACK_LENGTH);

    ctx.fillStyle = 'rgba(59, 43, 26, 0.8)';
    ctx.fillRect(10, 10, 200, 24);
    ctx.strokeStyle = '#b87333';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 200, 24);

    ctx.fillStyle = '#b87333';
    ctx.fillRect(12, 12, 196 * progress, 20);

    ctx.fillStyle = '#f5deb3';
    ctx.font = 'bold 12px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(progress * 100)}%`, 110, 27);

    const finishX = TRACK_LENGTH - 50 - cameraX;
    if (finishX > 0 && finishX < TRACK_WIDTH) {
      ctx.fillStyle = '#7a3a2a';
      ctx.fillRect(finishX, 30, 4, TRACK_HEIGHT - 60);

      ctx.fillStyle = '#b87333';
      ctx.font = 'bold 14px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.save();
      ctx.translate(finishX + 2, 50);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('终点', 0, 5);
      ctx.restore();
    }

    if (slowdownTimeRef.current > 0) {
      ctx.fillStyle = 'rgba(122, 58, 42, 0.8)';
      ctx.fillRect(TRACK_WIDTH / 2 - 60, 40, 120, 30);
      ctx.strokeStyle = '#f5deb3';
      ctx.lineWidth = 2;
      ctx.strokeRect(TRACK_WIDTH / 2 - 60, 40, 120, 30);

      ctx.fillStyle = '#f5deb3';
      ctx.font = 'bold 14px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(`减速中 ${slowdownTimeRef.current.toFixed(1)}s`, TRACK_WIDTH / 2, 60);
    }
  };

  return (
    <div className="race-track-container">
      <style>{`
        .race-track-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .track-canvas {
          border: 4px solid #7a3a2a;
          border-radius: 8px;
          box-shadow: 
            inset 0 0 20px rgba(0,0,0,0.3),
            0 4px 12px rgba(0,0,0,0.4);
          background: #3a2a1a;
        }

        .track-label {
          color: #f5deb3;
          font-size: 14px;
          font-weight: bold;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
          letter-spacing: 1px;
        }

        .controls-hint {
          color: rgba(245, 222, 179, 0.6);
          font-size: 11px;
          text-align: center;
        }

        @media (max-width: 768px) {
          .track-canvas {
            width: 100%;
            max-width: 500px;
            height: auto;
          }
        }
      `}</style>

      <div className="track-label">◆ 赛道预览 ◆</div>
      <canvas
        ref={canvasRef}
        width={TRACK_WIDTH}
        height={TRACK_HEIGHT}
        className="track-canvas"
      />
      <div className="controls-hint">
        使用 ↑ ↓ ← → 方向键控制飞行器移动
      </div>
    </div>
  );
});

RaceTrack.displayName = 'RaceTrack';

export default RaceTrack;
