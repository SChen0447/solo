import { CONFIG } from './config';
import { Jellyfish } from './jellyfish';
import { Cave } from './cave';
import type { GameState } from './types';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let jellyfish: Jellyfish;
let cave: Cave;
let gameState: GameState;
let lastTime = 0;

function resizeCanvas(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function initGame(): void {
  resizeCanvas();
  
  const width = canvas.width;
  const height = canvas.height;

  jellyfish = new Jellyfish(width, height);
  cave = new Cave(width, height);

  gameState = {
    running: true,
    paused: false,
    gameOver: false,
    victory: false,
    startTime: performance.now(),
    elapsedTime: 0,
    coralsCollected: 0,
    lightsLit: 0,
    totalLights: CONFIG.CAVE.TOTAL_LIGHTS,
    coralsPerLight: CONFIG.CAVE.CORALS_PER_LIGHT,
    lightBeamIntensity: 0.1,
    victoryFade: 0,
    victoryTimer: 0,
  };
}

function handleKeyDown(e: KeyboardEvent): void {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
    e.preventDefault();
    jellyfish.setKeyState(e.key, true);
  }
  
  if (e.key === ' ' || e.key === 'Enter') {
    if (gameState.victory && gameState.victoryTimer <= 0) {
      resetGame();
    }
  }
}

function handleKeyUp(e: KeyboardEvent): void {
  jellyfish.setKeyState(e.key, false);
}

function handleResize(): void {
  resizeCanvas();
  jellyfish.resize(canvas.width, canvas.height);
  cave.resize(canvas.width, canvas.height);
}

function resetGame(): void {
  initGame();
}

function update(dt: number): void {
  if (!gameState.running || gameState.paused) return;

  if (gameState.victory) {
    gameState.victoryTimer -= dt;
    if (gameState.victoryFade < 1) {
      gameState.victoryFade = Math.min(1, gameState.victoryFade + dt * 0.5);
    }
    return;
  }

  if (jellyfish.state.isSinking) {
    jellyfish.update(dt, null);
    return;
  }

  gameState.elapsedTime = (performance.now() - gameState.startTime) / 1000;

  const jellyBounds = jellyfish.getBounds();
  const result = cave.update(dt, jellyBounds.x, jellyBounds.y, jellyBounds.radius);

  jellyfish.update(dt, result.currentForce);

  if (result.coralCollected) {
    jellyfish.addEnergy(5);
    gameState.coralsCollected = cave.coralsCollected;
    gameState.lightsLit = cave.lightsLit;
    gameState.lightBeamIntensity = cave.lightBeamIntensity;
  }

  if (result.bubbleCollected) {
    jellyfish.addEnergy(CONFIG.CAVE.BUBBLE_ENERGY);
    jellyfish.triggerUmbrellaProjection();
  }

  if (cave.isVictory() && !gameState.victory) {
    gameState.victory = true;
    gameState.victoryTimer = 5;
  }
}

function drawBackground(): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, CONFIG.COLORS.DEEP_SEA_TOP);
  gradient.addColorStop(0.5, '#081020');
  gradient.addColorStop(1, CONFIG.COLORS.DEEP_SEA_BOTTOM);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const particleCount = 30;
  for (let i = 0; i < particleCount; i++) {
    const x = (Math.sin(i * 123.456 + gameState.elapsedTime * 0.1) * 0.5 + 0.5) * canvas.width;
    const y = (i * 37 + gameState.elapsedTime * 10) % canvas.height;
    const size = 1 + (i % 3) * 0.5;
    const alpha = 0.2 + (i % 5) * 0.1;

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(150, 200, 255, ${alpha})`;
    ctx.fill();
  }
}

function drawUI(): void {
  ctx.save();

  const timeText = formatTime(gameState.elapsedTime);
  ctx.font = '20px "Microsoft YaHei", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`时间: ${timeText}`, 20, 20);

  const barWidth = 150;
  const barHeight = 12;
  const barX = 20;
  const barY = 55;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(barX, barY, barWidth, barHeight);

  const energyRatio = jellyfish.state.energy / jellyfish.state.maxEnergy;
  const energyGradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
  energyGradient.addColorStop(0, 'rgba(100, 200, 255, 0.8)');
  energyGradient.addColorStop(1, 'rgba(150, 220, 255, 0.8)');
  
  ctx.fillStyle = energyGradient;
  ctx.fillRect(barX, barY, barWidth * energyRatio, barHeight);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barWidth, barHeight);

  ctx.font = '14px "Microsoft YaHei", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText('能量', barX + barWidth + 10, barY + 1);

  const lightsText = `水晶灯: ${gameState.lightsLit} / ${gameState.totalLights}`;
  ctx.font = '16px "Microsoft YaHei", sans-serif';
  ctx.fillStyle = 'rgba(255, 221, 136, 0.8)';
  ctx.fillText(lightsText, 20, 85);

  const coralsText = `珊瑚: ${gameState.coralsCollected % gameState.coralsPerLight} / ${gameState.coralsPerLight}`;
  ctx.fillStyle = 'rgba(255, 150, 180, 0.8)';
  ctx.fillText(coralsText, 20, 110);

  if (jellyfish.state.isSinking) {
    ctx.font = '24px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const seconds = Math.ceil(jellyfish.state.sinkTimer);
    ctx.fillText(`能量耗尽，恢复中... ${seconds}s`, canvas.width / 2, canvas.height / 2);
  }

  ctx.restore();
}

function drawVictory(): void {
  if (!gameState.victory) return;

  const fade = gameState.victoryFade;
  const timer = gameState.victoryTimer;

  ctx.fillStyle = `rgba(255, 255, 255, ${fade * 0.7})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (timer > 0) {
    const blinkAlpha = Math.min(1, (5 - timer) / 1) * (timer > 1 ? 1 : Math.sin(timer * 10) * 0.5 + 0.5);
    
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 30;
    
    ctx.font = 'bold 48px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = `rgba(255, 255, 255, ${blinkAlpha})`;
    ctx.fillText('深海微光 · 通关', canvas.width / 2, canvas.height / 2 - 30);

    ctx.shadowBlur = 15;
    ctx.font = '24px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = `rgba(200, 220, 255, ${blinkAlpha})`;
    ctx.fillText(`用时: ${formatTime(gameState.elapsedTime)}`, canvas.width / 2, canvas.height / 2 + 30);

    ctx.font = '18px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = `rgba(180, 200, 230, ${blinkAlpha * 0.8})`;
    ctx.fillText('按 空格键 或 回车 重新开始', canvas.width / 2, canvas.height / 2 + 70);

    ctx.restore();
  } else {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '20px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = 'rgba(100, 120, 150, 0.8)';
    ctx.fillText('按 空格键 或 回车 重新开始', canvas.width / 2, canvas.height / 2 + 100);
    ctx.restore();
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function render(): void {
  drawBackground();
  cave.draw(ctx);
  jellyfish.draw(ctx);
  drawUI();
  drawVictory();
}

function gameLoop(currentTime: number): void {
  const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
  lastTime = currentTime;

  update(dt);
  render();

  requestAnimationFrame(gameLoop);
}

function startGame(): void {
  initGame();
  
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('resize', handleResize);
  
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

startGame();
