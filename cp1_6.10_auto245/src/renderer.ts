import type { Ship, Comet, ExplosionParticle, Star, NebulaParticle } from './entities';

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  _nebulaMode: boolean
): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#0a0e27');
  gradient.addColorStop(1, '#1a1f3d');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export function drawStars(
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  time: number,
  rotation: number
): void {
  const centerX = ctx.canvas.width / 2;
  const centerY = ctx.canvas.height / 2;
  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);

  for (const star of stars) {
    const dx = star.x - centerX;
    const dy = star.y - centerY;
    const rx = centerX + dx * cosR - dy * sinR;
    const ry = centerY + dx * sinR + dy * cosR;

    const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
    const alpha = star.baseAlpha + twinkle * 0.15;
    const clampedAlpha = Math.max(0.1, Math.min(0.8, alpha));

    ctx.beginPath();
    ctx.arc(rx, ry, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${clampedAlpha})`;
    ctx.fill();
  }
}

export function drawNebula(
  ctx: CanvasRenderingContext2D,
  nebulaParticles: NebulaParticle[],
  rainbowMode: boolean
): void {
  for (const p of nebulaParticles) {
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
    let color = p.color;
    if (rainbowMode) {
      const hue = (Date.now() / 10 + p.x * 0.5) % 360;
      color = `hsl(${hue}, 80%, 60%)`;
    }
    gradient.addColorStop(0, hexToRgba(color, p.alpha * 2));
    gradient.addColorStop(0.5, hexToRgba(color, p.alpha));
    gradient.addColorStop(1, hexToRgba(color, 0));
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }
}

function hexToRgba(hex: string, alpha: number): string {
  if (hex.startsWith('hsl')) {
    return hex.replace('hsl', 'hsla').replace(')', `, ${alpha})`);
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function drawShip(ctx: CanvasRenderingContext2D, ship: Ship): void {
  for (let i = 0; i < ship.trail.length; i++) {
    const p = ship.trail[i];
    const alpha = (0.8 * (ship.trail.length - i)) / ship.trail.length;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3 - i * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(135, 206, 250, ${alpha})`;
    ctx.fill();
  }

  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);

  const size = 30;
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.7);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.5, '#87cefa');
  gradient.addColorStop(1, 'rgba(135, 206, 250, 0)');

  ctx.beginPath();
  ctx.moveTo(size * 0.7, 0);
  ctx.lineTo(-size * 0.5, -size * 0.4);
  ctx.lineTo(-size * 0.3, 0);
  ctx.lineTo(-size * 0.5, size * 0.4);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(size * 0.6, 0);
  ctx.lineTo(-size * 0.4, -size * 0.3);
  ctx.lineTo(-size * 0.2, 0);
  ctx.lineTo(-size * 0.4, size * 0.3);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.restore();
}

export function drawComet(ctx: CanvasRenderingContext2D, comet: Comet): void {
  for (let i = comet.trail.length - 1; i >= 0; i--) {
    const p = comet.trail[i];
    const alpha = (i / comet.trail.length) * 0.8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * (i / comet.trail.length), 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(comet.color, alpha);
    ctx.fill();
  }

  const glowGradient = ctx.createRadialGradient(
    comet.x, comet.y, 0,
    comet.x, comet.y, comet.radius * 2.5
  );
  glowGradient.addColorStop(0, hexToRgba(comet.color, 0.8));
  glowGradient.addColorStop(0.4, hexToRgba(comet.color, 0.3));
  glowGradient.addColorStop(1, hexToRgba(comet.color, 0));
  ctx.beginPath();
  ctx.arc(comet.x, comet.y, comet.radius * 2.5, 0, Math.PI * 2);
  ctx.fillStyle = glowGradient;
  ctx.fill();

  const coreGradient = ctx.createRadialGradient(
    comet.x, comet.y, 0,
    comet.x, comet.y, comet.radius
  );
  coreGradient.addColorStop(0, '#ffffff');
  coreGradient.addColorStop(0.3, comet.color);
  coreGradient.addColorStop(1, hexToRgba(comet.color, 0.8));
  ctx.beginPath();
  ctx.arc(comet.x, comet.y, comet.radius, 0, Math.PI * 2);
  ctx.fillStyle = coreGradient;
  ctx.fill();
}

export function drawExplosion(ctx: CanvasRenderingContext2D, particles: ExplosionParticle[]): void {
  for (const p of particles) {
    const t = Math.min(p.life / p.maxLife, 1);
    const eased = easeOut(t);
    const x = p.startX + (p.targetX - p.startX) * eased;
    const y = p.startY + (p.targetY - p.startY) * eased;
    const alpha = 1 - t;
    const radius = p.radius * (1 - t * 0.5);

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(p.color, alpha);
    ctx.fill();
  }
}

export function drawScore(ctx: CanvasRenderingContext2D, score: number): void {
  ctx.font = '24px monospace';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillText(`积分: ${score}`, 22, 42);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`积分: ${score}`, 20, 40);
}

function levelToColor(level: number, maxLevel: number): string {
  const t = maxLevel <= 1 ? 0 : level / (maxLevel - 1);
  const r = Math.round(77 + (255 - 77) * t);
  const g = Math.round(150 + (215 - 150) * t);
  const b = Math.round(255 + (0 - 255) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export function drawLevelIndicator(
  ctx: CanvasRenderingContext2D,
  level: number,
  maxLevel: number
): void {
  const dotRadius = 6;
  const spacing = 18;
  const padding = 20;
  const totalWidth = maxLevel * dotRadius * 2 + (maxLevel - 1) * (spacing - dotRadius * 2);
  let x = ctx.canvas.width - padding - totalWidth + dotRadius;
  const y = padding + dotRadius;

  for (let i = 0; i < maxLevel; i++) {
    ctx.beginPath();
    ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
    if (i < level) {
      ctx.fillStyle = levelToColor(i, maxLevel);
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    }
    ctx.fill();
    x += spacing;
  }
}

export function drawHomerunText(ctx: CanvasRenderingContext2D, alpha: number): void {
  ctx.save();
  ctx.font = '64px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const x = ctx.canvas.width / 2;
  const y = ctx.canvas.height / 2;

  ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.5})`;
  ctx.fillText('全垒打！', x + 4, y + 4);

  const gradient = ctx.createLinearGradient(x - 150, y, x + 150, y);
  gradient.addColorStop(0, `rgba(255, 215, 0, ${alpha})`);
  gradient.addColorStop(0.5, `rgba(255, 248, 220, ${alpha})`);
  gradient.addColorStop(1, `rgba(255, 215, 0, ${alpha})`);
  ctx.fillStyle = gradient;
  ctx.fillText('全垒打！', x, y);

  ctx.restore();
}
