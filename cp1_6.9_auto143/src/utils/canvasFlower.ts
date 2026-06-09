import type { FlowerSpecies } from '../types';

export function drawPixelFlower(
  ctx: CanvasRenderingContext2D,
  species: FlowerSpecies,
  color: string,
  size: number,
  progress: number
) {
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;
  const scale = size / 100;

  const growthScale = 0.3 + (progress / 100) * 0.7;

  ctx.save();
  ctx.translate(cx, cy + 20 * scale);
  ctx.scale(scale * growthScale, scale * growthScale);

  ctx.fillStyle = '#4A8B3A';
  ctx.fillRect(-2, -10, 4, 45);

  ctx.fillStyle = '#5BA348';
  ctx.beginPath();
  ctx.ellipse(-12, 15, 8, 4, -0.5, 0, Math.PI * 2);
  ctx.fill();

  if (species === 'rose') {
    drawRose(ctx, color);
  } else if (species === 'iris') {
    drawIris(ctx, color);
  } else {
    drawSunflower(ctx, color);
  }

  ctx.restore();
}

function drawRose(ctx: CanvasRenderingContext2D, color: string) {
  ctx.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
    const px = Math.cos(angle) * 15;
    const py = Math.sin(angle) * 15 - 25;
    ctx.beginPath();
    ctx.arc(px, py, 12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(0, -25, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(0, -25, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#FFE4B5';
  ctx.beginPath();
  ctx.arc(0, -25, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawIris(ctx: CanvasRenderingContext2D, color: string) {
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.9;
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3;
    ctx.save();
    ctx.translate(0, -25);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, -18, 7, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 0.7;
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3 + Math.PI / 3;
    ctx.save();
    ctx.translate(0, -25);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, -12, 5, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#FFE4B5';
  ctx.beginPath();
  ctx.arc(0, -25, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawSunflower(ctx: CanvasRenderingContext2D, color: string) {
  ctx.fillStyle = color;
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI * 2) / 12;
    const px = Math.cos(angle) * 18;
    const py = Math.sin(angle) * 18 - 25;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#8B4513';
  ctx.beginPath();
  ctx.arc(0, -25, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#654321';
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if ((i + j) % 2 === 0) {
        ctx.fillRect(-8 + i * 2, -33 + j * 2, 2, 2);
      }
    }
  }
}
