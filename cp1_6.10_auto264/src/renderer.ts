import { Tower, LaserBeam, TOWER_CONFIGS } from './tower';
import { Enemy, Particle, FlashEffect } from './enemy';

export interface HexCell {
  q: number;
  r: number;
  x: number;
  y: number;
}

export interface RenderState {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  hexSize: number;
  hexGrid: HexCell[];
  offsetX: number;
  offsetY: number;
  gridCols: number;
  gridRows: number;
  towers: Tower[];
  enemies: Enemy[];
  lasers: LaserBeam[];
  particles: Particle[];
  flashes: FlashEffect[];
  selectedHex: { q: number; r: number } | null;
  hoveredTower: Tower | null;
  time: number;
}

export function getHexCorner(cx: number, cy: number, size: number, i: number): { x: number; y: number } {
  const angleDeg = 60 * i - 30;
  const angleRad = (Math.PI / 180) * angleDeg;
  return {
    x: cx + size * Math.cos(angleRad),
    y: cy + size * Math.sin(angleRad)
  };
}

export function drawHexagon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  fillStyle?: string | CanvasGradient,
  strokeStyle?: string,
  lineWidth: number = 1
): void {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const corner = getHexCorner(cx, cy, size, i);
    if (i === 0) {
      ctx.moveTo(corner.x, corner.y);
    } else {
      ctx.lineTo(corner.x, corner.y);
    }
  }
  ctx.closePath();

  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

export function renderGrid(state: RenderState): void {
  const { ctx, hexGrid, hexSize, time, selectedHex } = state;
  const pulse = 0.1 + 0.2 * (0.5 + 0.5 * Math.sin((time / 3) * Math.PI * 2));

  for (const hex of hexGrid) {
    let highlight = false;
    if (selectedHex && selectedHex.q === hex.q && selectedHex.r === hex.r) {
      highlight = true;
    }

    if (highlight) {
      const gradient = ctx.createRadialGradient(hex.x, hex.y, 0, hex.x, hex.y, hexSize);
      gradient.addColorStop(0, 'rgba(100, 150, 255, 0.3)');
      gradient.addColorStop(1, 'rgba(100, 150, 255, 0.05)');
      drawHexagon(ctx, hex.x, hex.y, hexSize * 0.98, gradient, 'rgba(100, 150, 255, 0.6)', 2);
    } else {
      ctx.globalAlpha = pulse;
      drawHexagon(ctx, hex.x, hex.y, hexSize * 0.98, undefined, '#1a1f3d', 1);
      ctx.globalAlpha = 1;
    }
  }
}

export function renderTower(state: RenderState, tower: Tower): void {
  const { ctx, hexSize } = state;
  const progress = tower.deployProgress;
  if (progress <= 0) return;

  const color = tower.getColor();
  const cfg = tower.config;
  const displaySize = hexSize * 0.85 * progress;

  if (progress < 1) {
    ctx.beginPath();
    ctx.arc(tower.pixelX, tower.pixelY, displaySize * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.3 * (1 - progress);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  const gradient = ctx.createRadialGradient(
    tower.pixelX, tower.pixelY, 0,
    tower.pixelX, tower.pixelY, displaySize
  );
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, thisDarkenColor(color, 0.4));

  drawHexagon(ctx, tower.pixelX, tower.pixelY, displaySize, gradient, thisLightenColor(color, 0.3), 2);

  ctx.save();
  ctx.translate(tower.pixelX, tower.pixelY);
  ctx.rotate(tower.currentAngle);

  if (tower.type === 'refract') {
    ctx.beginPath();
    ctx.moveTo(0, -displaySize * 0.6);
    ctx.lineTo(-displaySize * 0.35, displaySize * 0.3);
    ctx.lineTo(displaySize * 0.35, displaySize * 0.3);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.9;
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (tower.type === 'focus') {
    ctx.beginPath();
    ctx.arc(0, 0, displaySize * 0.4, 0, Math.PI * 2);
    const focusGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, displaySize * 0.4);
    focusGradient.addColorStop(0, '#ffffff');
    focusGradient.addColorStop(1, color);
    ctx.fillStyle = focusGradient;
    ctx.fill();
  } else if (tower.type === 'split') {
    ctx.beginPath();
    ctx.moveTo(0, -displaySize * 0.55);
    ctx.lineTo(displaySize * 0.5, displaySize * 0.1);
    ctx.lineTo(displaySize * 0.25, displaySize * 0.45);
    ctx.lineTo(-displaySize * 0.25, displaySize * 0.45);
    ctx.lineTo(-displaySize * 0.5, displaySize * 0.1);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.beginPath();
  ctx.arc(0, -displaySize * 0.15, displaySize * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.restore();

  if (tower.level > 1) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(hexSize * 0.35)}px Consolas, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.fillText('★'.repeat(tower.level - 1), tower.pixelX, tower.pixelY + displaySize * 0.7);
    ctx.shadowBlur = 0;
  }
}

export function renderTowers(state: RenderState): void {
  for (const tower of state.towers) {
    renderTower(state, tower);
  }
}

export function renderLaser(state: RenderState, laser: LaserBeam): void {
  const { ctx, time } = state;
  const alpha = laser.life / laser.maxLife;

  const glowPulse = 0.3 + 0.3 * (0.5 + 0.5 * Math.sin(time * 10));

  ctx.save();
  ctx.globalAlpha = alpha * glowPulse * 0.5;
  ctx.strokeStyle = laser.color;
  ctx.lineWidth = laser.width + 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(laser.startX, laser.startY);
  ctx.lineTo(laser.endX, laser.endY);
  ctx.stroke();
  ctx.restore();

  const gradient = ctx.createLinearGradient(laser.startX, laser.startY, laser.endX, laser.endY);
  gradient.addColorStop(0, laser.color);
  gradient.addColorStop(1, '#ffffff');

  ctx.save();
  ctx.globalAlpha = alpha * 0.9;
  ctx.strokeStyle = gradient;
  ctx.lineWidth = laser.width;
  ctx.lineCap = 'round';
  ctx.shadowColor = laser.color;
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.moveTo(laser.startX, laser.startY);
  ctx.lineTo(laser.endX, laser.endY);
  ctx.stroke();
  ctx.restore();

  const dx = laser.endX - laser.startX;
  const dy = laser.endY - laser.startY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > 0) {
    const nx = dx / dist;
    const ny = dy / dist;
    const tailX = laser.startX + nx * 8;
    const tailY = laser.startY + ny * 8;

    const glowR = 5 + 3 * (0.5 + 0.5 * Math.sin(time * 8));
    const glowGradient = ctx.createRadialGradient(tailX, tailY, 0, tailX, tailY, glowR);
    glowGradient.addColorStop(0, `rgba(255, 255, 255, ${glowPulse * alpha})`);
    glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(tailX, tailY, glowR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function renderLasers(state: RenderState): void {
  for (const laser of state.lasers) {
    renderLaser(state, laser);
  }
}

export function renderEnemy(state: RenderState, enemy: Enemy): void {
  const { ctx } = state;
  const cfg = enemy.config;
  const hpRatio = enemy.getHpRatio();
  const flash = enemy.damageFlash;

  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(enemy.rotation);

  let color = cfg.baseColor;
  if (flash > 0) {
    color = interpolateColor(cfg.baseColor, '#ffffff', flash * 0.5);
  } else {
    color = interpolateColor(cfg.baseColor, '#2d3436', (1 - hpRatio) * 0.4);
  }

  ctx.shadowColor = color;
  ctx.shadowBlur = 8;

  if (enemy.type === 'triangle') {
    ctx.beginPath();
    ctx.moveTo(0, -enemy.size);
    ctx.lineTo(enemy.size * 0.866, enemy.size * 0.5);
    ctx.lineTo(-enemy.size * 0.866, enemy.size * 0.5);
    ctx.closePath();
  } else if (enemy.type === 'diamond') {
    ctx.beginPath();
    ctx.moveTo(0, -enemy.size);
    ctx.lineTo(enemy.size * 0.7, 0);
    ctx.lineTo(0, enemy.size);
    ctx.lineTo(-enemy.size * 0.7, 0);
    ctx.closePath();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, enemy.size, 0, Math.PI * 2);
  }

  const fillGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, enemy.size);
  fillGradient.addColorStop(0, thisLightenColor(color, 0.3));
  fillGradient.addColorStop(1, color);
  ctx.fillStyle = fillGradient;
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  ctx.restore();

  const barWidth = 30;
  const barHeight = 4;
  const barX = enemy.x - barWidth / 2;
  const barY = enemy.y - enemy.size - 10;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(barX, barY, barWidth, barHeight);

  const hpColor = interpolateColor('#ff4757', '#2ed573', hpRatio);
  ctx.fillStyle = hpColor;
  ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barWidth, barHeight);
}

export function renderEnemies(state: RenderState): void {
  for (const enemy of state.enemies) {
    renderEnemy(state, enemy);
  }
}

export function renderParticle(state: RenderState, particle: Particle): void {
  const { ctx } = state;
  const alpha = particle.life / particle.maxLife;
  const size = particle.size * alpha;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = particle.color;
  ctx.shadowColor = particle.color;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, Math.max(1, size), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function renderParticles(state: RenderState): void {
  for (const particle of state.particles) {
    renderParticle(state, particle);
  }
}

export function renderFlash(state: RenderState, flash: FlashEffect): void {
  const { ctx } = state;
  const alpha = flash.life / flash.maxLife;
  const radius = flash.radius * (1 + (1 - alpha) * 0.5);

  const gradient = ctx.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, radius);
  gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
  gradient.addColorStop(0.5, `rgba(200, 220, 255, ${alpha * 0.5})`);
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(flash.x, flash.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function renderFlashes(state: RenderState): void {
  for (const flash of state.flashes) {
    renderFlash(state, flash);
  }
}

export function renderHoveredTowerRange(state: RenderState): void {
  const { ctx, hoveredTower, hexSize } = state;
  if (!hoveredTower) return;

  const rangePixels = hoveredTower.getRangePixels(hexSize);

  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = hoveredTower.getColor();
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(hoveredTower.pixelX, hoveredTower.pixelY, rangePixels, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function renderAll(state: RenderState): void {
  const { ctx, canvas } = state;
  ctx.fillStyle = '#0b0d17';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  renderGrid(state);
  renderHoveredTowerRange(state);
  renderLasers(state);
  renderTowers(state);
  renderEnemies(state);
  renderParticles(state);
  renderFlashes(state);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function interpolateColor(color1: string, color2: string, t: number): string {
  let c1 = hexToRgb(color1);
  let c2 = hexToRgb(color2);

  if (color1.startsWith('rgb')) {
    const m = color1.match(/rgb\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) c1 = { r: parseInt(m[1]), g: parseInt(m[2]), b: parseInt(m[3]) };
  }
  if (color2.startsWith('rgb')) {
    const m = color2.match(/rgb\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) c2 = { r: parseInt(m[1]), g: parseInt(m[2]), b: parseInt(m[3]) };
  }

  const r = c1.r + (c2.r - c1.r) * t;
  const g = c1.g + (c2.g - c1.g) * t;
  const b = c1.b + (c2.b - c1.b) * t;
  return rgbToHex(r, g, b);
}

function thisLightenColor(color: string, amount: number): string {
  return interpolateColor(color, '#ffffff', amount);
}

function thisDarkenColor(color: string, amount: number): string {
  return interpolateColor(color, '#000000', amount);
}
