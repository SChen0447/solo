import { GRID_SIZE, getMapData, getKeys, getTraps, getEndPos, CELL_WALL } from './map';
import { PlayerState } from './player';

export interface GameStats {
  steps: number;
  time: number;
  energy: number;
  keysCollected: number;
  isRewinding: boolean;
  victory: boolean;
  victoryTime: number;
  lastEnergyRecoverTime: number;
  showEnergyPulse: boolean;
  energyPulseTime: number;
}

export interface VirtualButton {
  x: number;
  y: number;
  w: number;
  h: number;
  dir: string;
}

const COLORS = {
  bg: '#1a1a2e',
  wall: '#3d3d5c',
  floor: '#e0e0e0',
  grid: 'rgba(255,255,255,0.08)',
  player: '#00d4ff',
  playerGlow: 'rgba(0,212,255,0.5)',
  key: '#ffd700',
  trap: '#ff4444',
  end: '#44ff44',
  text: '#ffffff',
  panelBg: 'rgba(26,26,46,0.85)'
};

let canvasWidth = 0;
let canvasHeight = 0;
let cellSize = 0;
let offsetX = 0;
let offsetY = 0;
let isMobile = false;
let victoryPanelScale = 0;
let confettiParticles: Array<{
  x: number; y: number; vx: number; vy: number;
  color: string; size: number; rot: number; vr: number;
}> = [];

export function getVirtualButtons(): VirtualButton[] {
  if (!isMobile) return [];
  const btnSize = Math.min(60, canvasWidth / 6);
  const bottomMargin = 30;
  const centerX = canvasWidth / 2;
  const baseY = canvasHeight - bottomMargin - btnSize * 2.5;
  return [
    { x: centerX - btnSize / 2, y: baseY, w: btnSize, h: btnSize, dir: 'up' },
    { x: centerX - btnSize * 1.5 - 10, y: baseY + btnSize + 10, w: btnSize, h: btnSize, dir: 'left' },
    { x: centerX + btnSize / 2 + 10, y: baseY + btnSize + 10, w: btnSize, h: btnSize, dir: 'right' },
    { x: centerX - btnSize / 2, y: baseY + btnSize * 2 + 20, w: btnSize, h: btnSize, dir: 'down' }
  ];
}

export function resizeCanvas(canvas: HTMLCanvasElement): void {
  const dpr = window.devicePixelRatio || 1;
  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight;
  isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  canvas.width = canvasWidth * dpr;
  canvas.height = canvasHeight * dpr;
  canvas.style.width = canvasWidth + 'px';
  canvas.style.height = canvasHeight + 'px';
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  calculateGrid();
}

function calculateGrid(): void {
  const uiTop = 80;
  const uiBottom = isMobile ? 220 : 100;
  const availableW = canvasWidth - 40;
  const availableH = canvasHeight - uiTop - uiBottom;
  cellSize = Math.floor(Math.min(availableW / GRID_SIZE, availableH / GRID_SIZE));
  cellSize = Math.max(20, cellSize);
  offsetX = (canvasWidth - cellSize * GRID_SIZE) / 2;
  offsetY = uiTop + (availableH - cellSize * GRID_SIZE) / 2;
}

export function getCellAtPixel(px: number, py: number): { gx: number; gy: number } | null {
  const gx = Math.floor((px - offsetX) / cellSize);
  const gy = Math.floor((py - offsetY) / cellSize);
  if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
    return { gx, gy };
  }
  return null;
}

export function render(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  stats: GameStats,
  now: number
): void {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  drawMap(ctx, now);
  drawKeys(ctx, now);
  drawTraps(ctx, now);
  drawEnd(ctx, now);
  drawPlayer(ctx, player, now);

  if (stats.isRewinding) {
    drawRewindEffect(ctx, now);
  }

  drawEnergyBar(ctx, stats, now);
  drawBottomHUD(ctx, stats);

  if (isMobile) {
    drawVirtualButtons(ctx, now);
  }

  if (stats.victory) {
    updateVictory(now, stats);
    drawVictoryPanel(ctx, stats, now);
  }
}

function drawMap(ctx: CanvasRenderingContext2D, _now: number): void {
  const mapData = getMapData();
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const px = offsetX + x * cellSize;
      const py = offsetY + y * cellSize;
      if (mapData[y][x] === CELL_WALL) {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(px, py, cellSize, cellSize);
      } else {
        ctx.fillStyle = COLORS.floor;
        ctx.fillRect(px, py, cellSize, cellSize);
      }
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, cellSize - 1, cellSize - 1);
    }
  }
}

function drawKeys(ctx: CanvasRenderingContext2D, now: number): void {
  const keys = getKeys();
  for (const key of keys) {
    if (key.collected) continue;
    const cx = offsetX + key.x * cellSize + cellSize / 2;
    const cy = offsetY + key.y * cellSize + cellSize / 2;
    const bob = Math.sin(now / 300 + key.id) * 3;
    ctx.save();
    ctx.translate(cx, cy + bob);
    drawKeyIcon(ctx, cellSize * 0.35, COLORS.key);
    ctx.restore();
  }
}

function drawKeyIcon(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(-size * 0.3, 0, size * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillRect(-size * 0.05, -size * 0.1, size * 0.8, size * 0.2);
  ctx.fillRect(size * 0.4, -size * 0.1, size * 0.12, size * 0.35);
  ctx.fillRect(size * 0.6, -size * 0.1, size * 0.12, size * 0.25);
}

function drawTraps(ctx: CanvasRenderingContext2D, now: number): void {
  const traps = getTraps();
  const flash = (Math.sin(now / 200) + 1) / 2;
  for (const trap of traps) {
    const px = offsetX + trap.x * cellSize + 4;
    const py = offsetY + trap.y * cellSize + 4;
    const size = cellSize - 8;
    ctx.save();
    ctx.globalAlpha = 0.4 + flash * 0.6;
    ctx.fillStyle = COLORS.trap;
    ctx.shadowColor = COLORS.trap;
    ctx.shadowBlur = 15;
    ctx.fillRect(px, py, size, size);
    ctx.restore();
    ctx.strokeStyle = COLORS.trap;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px + 5, py + 5);
    ctx.lineTo(px + size - 5, py + size - 5);
    ctx.moveTo(px + size - 5, py + 5);
    ctx.lineTo(px + 5, py + size - 5);
    ctx.stroke();
  }
}

function drawEnd(ctx: CanvasRenderingContext2D, now: number): void {
  const end = getEndPos();
  const cx = offsetX + end.x * cellSize + cellSize / 2;
  const cy = offsetY + end.y * cellSize + cellSize / 2;
  const pulse = (Math.sin(now / 400) + 1) / 2;
  ctx.save();
  ctx.globalAlpha = 0.3 + pulse * 0.4;
  ctx.fillStyle = COLORS.end;
  ctx.shadowColor = COLORS.end;
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(cx, cy, cellSize * 0.4 + pulse * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = COLORS.end;
  ctx.font = `bold ${cellSize * 0.5}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', cx, cy);
}

function drawPlayer(ctx: CanvasRenderingContext2D, player: PlayerState, now: number): void {
  const pos = { x: player.renderX, y: player.renderY };
  const cx = offsetX + pos.x * cellSize + cellSize / 2;
  const cy = offsetY + pos.y * cellSize + cellSize / 2;
  const r = cellSize * 0.35;

  ctx.save();

  if (player.status === 'rewinding') {
    ctx.globalAlpha = 0.5 + Math.sin(now / 50) * 0.2;
  } else if (player.status === 'flash') {
    const flashAlpha = (Math.sin(now / 50) + 1) / 2;
    ctx.fillStyle = `rgba(255,68,68,${0.3 + flashAlpha * 0.5})`;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowColor = COLORS.playerGlow;
  ctx.shadowBlur = 20;
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx - r * 0.3, cy - r * 0.1, r * 0.15, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.3, cy - r * 0.1, r * 0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawRewindEffect(ctx: CanvasRenderingContext2D, now: number): void {
  const w = canvasWidth;
  const h = canvasHeight;
  const gradient = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.7);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.5, `rgba(100,0,200,${0.2 + Math.sin(now / 80) * 0.1})`);
  gradient.addColorStop(1, `rgba(0,0,50,${0.6 + Math.sin(now / 100) * 0.1})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = `rgba(0,212,255,${0.3 + Math.sin(now / 60) * 0.2})`;
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const r = ((now / 15 + i * 80) % 200) + 50;
    ctx.globalAlpha = 1 - r / 250;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawEnergyBar(ctx: CanvasRenderingContext2D, stats: GameStats, now: number): void {
  const barW = Math.min(200, canvasWidth * 0.35);
  const barH = 22;
  const x = canvasWidth - barW - 20;
  const y = 20;

  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  roundRect(ctx, x - 8, y - 8, barW + 16, barH + 38, 10);
  ctx.fill();

  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('回溯能量', x, y - 4);

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  roundRect(ctx, x, y + 16, barW, barH, 6);
  ctx.fill();

  const energyRatio = Math.max(0, Math.min(1, stats.energy / 100));
  let fillColor: string;
  if (energyRatio > 0.6) fillColor = '#44ff88';
  else if (energyRatio > 0.3) fillColor = '#ffdd44';
  else fillColor = '#ff4466';

  const gradient = ctx.createLinearGradient(x, 0, x + barW, 0);
  gradient.addColorStop(0, '#44ff88');
  gradient.addColorStop(0.5, '#ffdd44');
  gradient.addColorStop(1, '#ff4466');

  const fillW = barW * energyRatio;
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, x, y + 16, barW, barH, 6);
  ctx.clip();
  ctx.fillStyle = gradient;
  ctx.fillRect(barW - fillW + x - (barW * (1 - energyRatio)), y + 16, fillW, barH);
  ctx.restore();

  let textAlpha = 1;
  let textScale = 1;
  if (stats.showEnergyPulse) {
    const t = (now - stats.energyPulseTime) / 400;
    if (t < 1) {
      textScale = 1 + Math.sin(t * Math.PI) * 0.3;
      textAlpha = 1 - t * 0.3;
    } else {
      stats.showEnergyPulse = false;
    }
  }

  ctx.save();
  ctx.globalAlpha = textAlpha;
  ctx.font = `bold ${Math.floor(13 * textScale)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`${Math.floor(stats.energy)}%`, x + barW / 2, y + 16 + barH / 2);
  ctx.restore();
}

function drawBottomHUD(ctx: CanvasRenderingContext2D, stats: GameStats): void {
  const y = canvasHeight - (isMobile ? 200 : 60);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, 20, y - 8, canvasWidth - 40, 50, 12);
  ctx.fill();

  const cx = canvasWidth / 2;
  const iconSize = 28;

  ctx.save();
  ctx.translate(cx - 160, y + 17);
  drawKeyIcon(ctx, iconSize * 0.6, COLORS.key);
  ctx.restore();
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${stats.keysCollected}/3`, cx - 120, y + 17);

  ctx.fillText(`👣 ${stats.steps}`, cx - 30, y + 17);

  ctx.fillText(`⏱ ${stats.time.toFixed(1)}s`, cx + 80, y + 17);
}

function drawVirtualButtons(ctx: CanvasRenderingContext2D, now: number): void {
  const buttons = getVirtualButtons();
  for (const btn of buttons) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = COLORS.text;
    ctx.font = `bold ${btn.w * 0.5}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const arrows: Record<string, string> = { up: '▲', down: '▼', left: '◀', right: '▶' };
    ctx.fillText(arrows[btn.dir] || '', btn.x + btn.w / 2, btn.y + btn.h / 2 + 2);
    ctx.restore();
  }
}

function updateVictory(now: number, stats: GameStats): void {
  const elapsed = now - stats.victoryTime;
  if (elapsed < 400) {
    victoryPanelScale = elasticOut(elapsed / 400);
  } else {
    victoryPanelScale = 1;
  }
  if (confettiParticles.length === 0 && elapsed < 2000) {
    spawnConfetti();
  }
  updateConfetti();
}

function elasticOut(t: number): number {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
}

function spawnConfetti(): void {
  const colors = ['#ff4466', '#44ff88', '#ffdd44', '#00d4ff', '#ff88ff'];
  for (let i = 0; i < 3; i++) {
    confettiParticles.push({
      x: canvasWidth / 2 + (Math.random() - 0.5) * 100,
      y: canvasHeight / 2,
      vx: (Math.random() - 0.5) * 8,
      vy: -Math.random() * 8 - 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 4 + Math.random() * 6,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.3
    });
  }
}

function updateConfetti(): void {
  for (let i = confettiParticles.length - 1; i >= 0; i--) {
    const p = confettiParticles[i];
    p.vy += 0.3;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    if (p.y > canvasHeight + 50) {
      confettiParticles.splice(i, 1);
    }
  }
}

function drawVictoryPanel(ctx: CanvasRenderingContext2D, stats: GameStats, now: number): void {
  for (const p of confettiParticles) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    ctx.restore();
  }

  if (now - stats.victoryTime > 2000) {
    confettiParticles = [];
  }

  const panelW = Math.min(360, canvasWidth - 60);
  const panelH = 280;
  const px = (canvasWidth - panelW) / 2;
  const py = (canvasHeight - panelH) / 2;

  ctx.save();
  ctx.translate(px + panelW / 2, py + panelH / 2);
  ctx.scale(victoryPanelScale, victoryPanelScale);
  ctx.translate(-(px + panelW / 2), -(py + panelH / 2));

  ctx.fillStyle = 'rgba(26,26,46,0.9)';
  ctx.shadowColor = 'rgba(0,212,255,0.4)';
  ctx.shadowBlur = 30;
  roundRect(ctx, px, py, panelW, panelH, 20);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('🎉 胜利！', px + panelW / 2, py + 30);

  ctx.fillStyle = COLORS.text;
  ctx.font = '20px sans-serif';
  ctx.fillText(`总步数：${stats.steps}`, px + panelW / 2, py + 100);
  ctx.fillText(`用时：${stats.time.toFixed(1)} 秒`, px + panelW / 2, py + 140);

  const btnW = 140;
  const btnH = 48;
  const bx = px + (panelW - btnW) / 2;
  const by = py + 200;
  ctx.fillStyle = '#00d4ff';
  roundRect(ctx, bx, by, btnW, btnH, 12);
  ctx.fill();
  ctx.fillStyle = '#1a1a2e';
  ctx.font = 'bold 18px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('再玩一次', px + panelW / 2, by + btnH / 2);

  ctx.restore();
}

export function isVictoryButtonClicked(mx: number, my: number, stats: GameStats): boolean {
  if (!stats.victory) return false;
  const panelW = Math.min(360, canvasWidth - 60);
  const panelH = 280;
  const px = (canvasWidth - panelW) / 2;
  const py = (canvasHeight - panelH) / 2;
  const btnW = 140;
  const btnH = 48;
  const bx = px + (panelW - btnW) / 2;
  const by = py + 200;
  return mx >= bx && mx <= bx + btnW && my >= by && my <= by + btnH;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
