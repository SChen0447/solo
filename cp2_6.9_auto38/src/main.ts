import { ParticleSystem } from './particles';
import { Ship } from './ship';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctxRaw = canvas.getContext('2d');

if (!ctxRaw) {
  throw new Error('无法获取 Canvas 2D 上下文');
}

const ctx: CanvasRenderingContext2D = ctxRaw;

function resizeCanvas(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();

const particleSystem = new ParticleSystem(canvas.width, canvas.height, 3200);
const ship = new Ship(canvas.width / 2, canvas.height / 2);
ship.attachKeyboardListeners();

window.addEventListener('resize', () => {
  resizeCanvas();
  particleSystem.resize(canvas.width, canvas.height);
});

let lastTime = performance.now();
let fps = 0;
let fpsAccumulator = 0;
let fpsFrames = 0;
let fpsUpdateTimer = 0;

function drawBackground(ctx: CanvasRenderingContext2D): void {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#0F172A');
  gradient.addColorStop(0.5, '#171536');
  gradient.addColorStop(1, '#1E1B4B');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawDashboard(ctx: CanvasRenderingContext2D, speed: number, maxSpeed: number, particleCount: number, currentFps: number): void {
  const panelX = 20;
  const panelY = canvas.height - 140;
  const panelWidth = 220;
  const panelHeight = 120;
  const cornerRadius = 12;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(panelX + cornerRadius, panelY);
  ctx.lineTo(panelX + panelWidth - cornerRadius, panelY);
  ctx.quadraticCurveTo(panelX + panelWidth, panelY, panelX + panelWidth, panelY + cornerRadius);
  ctx.lineTo(panelX + panelWidth, panelY + panelHeight - cornerRadius);
  ctx.quadraticCurveTo(panelX + panelWidth, panelY + panelHeight, panelX + panelWidth - cornerRadius, panelY + panelHeight);
  ctx.lineTo(panelX + cornerRadius, panelY + panelHeight);
  ctx.quadraticCurveTo(panelX, panelY + panelHeight, panelX, panelY + panelHeight - cornerRadius);
  ctx.lineTo(panelX, panelY + cornerRadius);
  ctx.quadraticCurveTo(panelX, panelY, panelX + cornerRadius, panelY);
  ctx.closePath();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fill();

  ctx.strokeStyle = 'rgba(100, 150, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const textColor = '#D1D5DB';
  ctx.font = '300 13px "Microsoft YaHei", "微软雅黑", sans-serif';
  ctx.fillStyle = textColor;
  ctx.textBaseline = 'top';

  const speedText = '速度';
  ctx.fillText(speedText, panelX + 16, panelY + 14);

  const speedValue = speed.toFixed(1);
  ctx.font = '300 16px "Microsoft YaHei", "微软雅黑", sans-serif';
  ctx.fillStyle = '#60A5FA';
  ctx.fillText(`${speedValue}`, panelX + 55, panelY + 11);

  const barX = panelX + 16;
  const barY = panelY + 38;
  const barWidth = panelWidth - 32;
  const barHeight = 6;
  const barRadius = 3;

  ctx.beginPath();
  ctx.moveTo(barX + barRadius, barY);
  ctx.lineTo(barX + barWidth - barRadius, barY);
  ctx.quadraticCurveTo(barX + barWidth, barY, barX + barWidth, barY + barRadius);
  ctx.lineTo(barX + barWidth, barY + barHeight - barRadius);
  ctx.quadraticCurveTo(barX + barWidth, barY + barHeight, barX + barWidth - barRadius, barY + barHeight);
  ctx.lineTo(barX + barRadius, barY + barHeight);
  ctx.quadraticCurveTo(barX, barY + barHeight, barX, barY + barHeight - barRadius);
  ctx.lineTo(barX, barY + barRadius);
  ctx.quadraticCurveTo(barX, barY, barX + barRadius, barY);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fill();

  const speedRatio = Math.min(speed / maxSpeed, 1);
  const fillWidth = barWidth * speedRatio;
  if (fillWidth > 0) {
    const progressGradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    progressGradient.addColorStop(0, '#34D399');
    progressGradient.addColorStop(0.6, '#FBBF24');
    progressGradient.addColorStop(1, '#F87171');

    const fillRadius = Math.min(barRadius, fillWidth / 2);
    ctx.beginPath();
    ctx.moveTo(barX + fillRadius, barY);
    ctx.lineTo(barX + fillWidth - fillRadius, barY);
    ctx.quadraticCurveTo(barX + fillWidth, barY, barX + fillWidth, barY + barRadius);
    ctx.lineTo(barX + fillWidth, barY + barHeight - barRadius);
    ctx.quadraticCurveTo(barX + fillWidth, barY + barHeight, barX + fillWidth - fillRadius, barY + barHeight);
    ctx.lineTo(barX + fillRadius, barY + barHeight);
    ctx.quadraticCurveTo(barX, barY + barHeight, barX, barY + barHeight - barRadius);
    ctx.lineTo(barX, barY + barRadius);
    ctx.quadraticCurveTo(barX, barY, barX + fillRadius, barY);
    ctx.closePath();
    ctx.fillStyle = progressGradient;
    ctx.fill();
  }

  ctx.font = '300 13px "Microsoft YaHei", "微软雅黑", sans-serif';
  ctx.fillStyle = textColor;
  ctx.fillText('粒子数', panelX + 16, panelY + 58);

  ctx.font = '300 16px "Microsoft YaHei", "微软雅黑", sans-serif';
  ctx.fillStyle = '#A78BFA';
  ctx.fillText(`${particleCount}`, panelX + 70, panelY + 55);

  ctx.font = '300 13px "Microsoft YaHei", "微软雅黑", sans-serif';
  ctx.fillStyle = textColor;
  ctx.fillText('FPS', panelX + 16, panelY + 88);

  ctx.font = '300 16px "Microsoft YaHei", "微软雅黑", sans-serif';
  let fpsColor = '#34D399';
  if (currentFps < 40) fpsColor = '#FBBF24';
  if (currentFps < 25) fpsColor = '#F87171';
  ctx.fillStyle = fpsColor;
  ctx.fillText(`${currentFps}`, panelX + 55, panelY + 85);

  ctx.restore();
}

function gameLoop(currentTime: number): void {
  const dt = Math.min(currentTime - lastTime, 50);
  lastTime = currentTime;

  fpsAccumulator += dt;
  fpsFrames++;
  fpsUpdateTimer += dt;
  if (fpsUpdateTimer >= 500) {
    fps = Math.round((fpsFrames * 1000) / fpsAccumulator);
    fpsAccumulator = 0;
    fpsFrames = 0;
    fpsUpdateTimer = 0;
  }

  ship.update(dt, canvas.width, canvas.height);

  if (ship.shouldEmitStardust()) {
    const spreadAngle = ship.angle + Math.PI + (Math.random() - 0.5) * 0.5;
    const backDist = 15 + Math.random() * 10;
    particleSystem.addStardust(
      ship.x + Math.cos(spreadAngle) * backDist,
      ship.y + Math.sin(spreadAngle) * backDist
    );
  }

  particleSystem.update(dt, ship.getState());

  drawBackground(ctx);
  particleSystem.render(ctx, ship.x, ship.y);
  ship.render(ctx);
  drawDashboard(ctx, ship.getSpeed(), ship.getMaxSpeed(), particleSystem.getParticleCount(), fps);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
