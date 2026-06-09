import type { Plant } from './types';

function hashToHsl(seed: number, saturation = 45, lightness = 40): string {
  const h = (seed * 37) % 360;
  return `hsl(${h}, ${saturation}%, ${lightness}%)`;
}

function hashToColor(seed: number, variant: number): string {
  const colors = [
    '#2E7D32', '#388E3C', '#43A047', '#4CAF50',
    '#66BB6A', '#81C784', '#1B5E20', '#2E8B57',
    '#3CB371', '#228B22', '#006400', '#556B2F',
    '#6B8E23', '#9ACD32', '#7CFC00', '#00FF7F',
    '#32CD32', '#90EE90', '#98FB98', '#00FA9A',
    '#20B2AA', '#48D1CC', '#008B8B', '#008080'
  ];
  return colors[(seed + variant) % colors.length];
}

function drawPot(ctx: CanvasRenderingContext2D, cx: number, cy: number, potW: number, potH: number): void {
  ctx.fillStyle = '#8D6E63';
  ctx.beginPath();
  ctx.moveTo(cx - potW / 2, cy - potH / 2);
  ctx.lineTo(cx + potW / 2, cy - potH / 2);
  ctx.lineTo(cx + potW / 3, cy + potH / 2);
  ctx.lineTo(cx - potW / 3, cy + potH / 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#6D4C41';
  ctx.fillRect(cx - potW / 2 - 2, cy - potH / 2 - 4, potW + 4, 6);
}

function drawLeafyPlant(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, colorSeed: number): void {
  const color1 = hashToColor(colorSeed, 0);
  const color2 = hashToColor(colorSeed, 5);

  ctx.save();
  ctx.translate(cx, cy);

  ctx.strokeStyle = hashToColor(colorSeed, 12);
  ctx.lineWidth = Math.max(1, size * 0.08);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(size * 0.1, -size * 0.5, 0, -size);
  ctx.stroke();

  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI / 2 + (i - 2) * 0.4;
    const leafX = Math.cos(angle) * size * 0.4;
    const leafY = -size * 0.3 - i * size * 0.15;
    const leafW = size * 0.5;
    const leafH = size * 0.3;

    ctx.save();
    ctx.translate(leafX, leafY);
    ctx.rotate(angle + Math.PI / 2 + (i - 2) * 0.2);
    ctx.fillStyle = i % 2 === 0 ? color1 : color2;
    ctx.beginPath();
    ctx.ellipse(0, 0, leafW / 2, leafH / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = hashToColor(colorSeed, 15);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, -leafH / 2);
    ctx.lineTo(0, leafH / 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawTallPlant(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, colorSeed: number): void {
  const trunkColor = '#5D4037';
  const leafColor1 = hashToColor(colorSeed, 1);
  const leafColor2 = hashToColor(colorSeed, 6);

  ctx.save();
  ctx.translate(cx, cy);

  ctx.fillStyle = trunkColor;
  ctx.fillRect(-size * 0.08, -size * 1.2, size * 0.16, size * 1.2);

  for (let i = 0; i < 6; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const y = -size * 0.3 - i * size * 0.18;
    const x = side * size * 0.15;
    const leafW = size * 0.5;
    const leafH = size * 0.22;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(side * 0.3);
    ctx.fillStyle = i < 3 ? leafColor1 : leafColor2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(side * leafW * 0.5, -leafH, side * leafW, -leafH * 0.3);
    ctx.quadraticCurveTo(side * leafW * 0.5, leafH * 0.3, 0, 0);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = leafColor2;
  ctx.beginPath();
  ctx.ellipse(0, -size * 1.3, size * 0.35, size * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawBushyPlant(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, colorSeed: number): void {
  const color1 = hashToColor(colorSeed, 2);
  const color2 = hashToColor(colorSeed, 8);
  const color3 = hashToColor(colorSeed, 14);

  ctx.save();
  ctx.translate(cx, cy);

  const positions = [
    { x: 0, y: -size * 0.3, r: size * 0.4, c: color1 },
    { x: -size * 0.28, y: -size * 0.15, r: size * 0.32, c: color2 },
    { x: size * 0.28, y: -size * 0.15, r: size * 0.32, c: color3 },
    { x: -size * 0.15, y: -size * 0.5, r: size * 0.28, c: color3 },
    { x: size * 0.18, y: -size * 0.48, r: size * 0.3, c: color1 },
    { x: 0, y: -size * 0.65, r: size * 0.25, c: color2 }
  ];

  for (const p of positions) {
    ctx.fillStyle = p.c;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r = size * 0.35 + (i % 3) * size * 0.1;
    const px = Math.cos(a) * r * 0.5;
    const py = -size * 0.4 + Math.sin(a) * r * 0.3;
    ctx.fillStyle = hashToColor(colorSeed, i + 10);
    ctx.beginPath();
    ctx.arc(px, py, size * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawVinePlant(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, colorSeed: number): void {
  const color1 = hashToColor(colorSeed, 3);
  const color2 = hashToColor(colorSeed, 9);
  const stemColor = hashToColor(colorSeed, 18);

  ctx.save();
  ctx.translate(cx, cy);

  for (let vine = 0; vine < 3; vine++) {
    const side = (vine - 1) * 0.3;
    ctx.strokeStyle = stemColor;
    ctx.lineWidth = Math.max(1, size * 0.04);
    ctx.beginPath();
    ctx.moveTo(side * size * 0.3, -size * 0.1);
    for (let i = 0; i < 6; i++) {
      const y = -size * 0.2 - i * size * 0.18;
      const x = side * size * 0.3 + Math.sin(i * 1.2 + vine) * size * 0.2;
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    for (let i = 0; i < 5; i++) {
      const y = -size * 0.25 - i * size * 0.2;
      const x = side * size * 0.3 + Math.sin(i * 1.2 + vine) * size * 0.2;
      const leafSide = i % 2 === 0 ? 1 : -1;

      ctx.fillStyle = i % 2 === 0 ? color1 : color2;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(leafSide * 0.5);
      ctx.beginPath();
      ctx.ellipse(leafSide * size * 0.12, 0, size * 0.14, size * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore();
}

function drawCactusPlant(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, colorSeed: number): void {
  const color1 = hashToColor(colorSeed, 4);
  const color2 = hashToColor(colorSeed, 11);

  ctx.save();
  ctx.translate(cx, cy);

  ctx.fillStyle = color1;
  const mainW = size * 0.28;
  const mainH = size * 1.1;
  roundRect(ctx, -mainW / 2, -mainH, mainW, mainH, size * 0.1);
  ctx.fill();

  ctx.fillStyle = color2;
  const armH = size * 0.5;
  roundRect(ctx, -mainW * 1.5, -mainH * 0.65, mainW * 0.7, armH, size * 0.08);
  ctx.fill();
  ctx.fillStyle = color1;
  roundRect(ctx, -mainW * 1.5, -mainH * 0.65, mainW * 0.7, size * 0.1, size * 0.08);
  ctx.fill();

  ctx.fillStyle = color2;
  roundRect(ctx, mainW * 0.8, -mainH * 0.5, mainW * 0.7, armH * 0.85, size * 0.08);
  ctx.fill();
  ctx.fillStyle = color1;
  roundRect(ctx, mainW * 0.8, -mainH * 0.5, mainW * 0.7, size * 0.1, size * 0.08);
  ctx.fill();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 0.8;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 3; col++) {
      const sx = (col - 1) * mainW * 0.3;
      const sy = -mainH + size * 0.1 + row * size * 0.12;
      ctx.beginPath();
      ctx.moveTo(sx - size * 0.03, sy);
      ctx.lineTo(sx + size * 0.03, sy);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawFernPlant(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, colorSeed: number): void {
  const color1 = hashToColor(colorSeed, 7);
  const color2 = hashToColor(colorSeed, 13);
  const stemColor = hashToColor(colorSeed, 20);

  ctx.save();
  ctx.translate(cx, cy);

  const frondCount = 7;
  for (let f = 0; f < frondCount; f++) {
    const baseAngle = -Math.PI / 2 + ((f - (frondCount - 1) / 2) / (frondCount - 1)) * Math.PI * 0.7;
    const curve = (f % 2 === 0 ? 1 : -1) * 0.2;
    const len = size * (0.8 + Math.random() * 0.3);

    const points: { x: number; y: number }[] = [];
    for (let t = 0; t <= 1; t += 0.05) {
      const a = baseAngle + curve * t * t;
      const r = len * t;
      points.push({
        x: Math.cos(a) * r,
        y: Math.sin(a) * r - size * 0.1
      });
    }

    ctx.strokeStyle = stemColor;
    ctx.lineWidth = Math.max(1, size * 0.03);
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.1);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    for (let i = 3; i < points.length - 1; i += 2) {
      const p = points[i];
      const prev = points[i - 1];
      const segAngle = Math.atan2(p.y - prev.y, p.x - prev.x);
      const leafColor = i % 4 === 0 ? color1 : color2;

      for (const side of [-1, 1]) {
        ctx.fillStyle = leafColor;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(segAngle + side * Math.PI / 2);
        ctx.beginPath();
        ctx.ellipse(side * size * 0.06, 0, size * 0.1, size * 0.04, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
  ctx.restore();
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

function drawPlantThumbnail(
  ctx: CanvasRenderingContext2D,
  plant: Plant,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const cx = x + width / 2;
  const cy = y + height * 0.9;
  const size = Math.min(width, height) * 0.38;

  drawPot(ctx, cx, cy + size * 0.2, size * 0.6, size * 0.45);

  switch (plant.shapeType) {
    case 'leafy':
      drawLeafyPlant(ctx, cx, cy, size, plant.colorSeed);
      break;
    case 'tall':
      drawTallPlant(ctx, cx, cy, size, plant.colorSeed);
      break;
    case 'bushy':
      drawBushyPlant(ctx, cx, cy, size, plant.colorSeed);
      break;
    case 'vine':
      drawVinePlant(ctx, cx, cy, size, plant.colorSeed);
      break;
    case 'cactus':
      drawCactusPlant(ctx, cx, cy, size, plant.colorSeed);
      break;
    case 'fern':
      drawFernPlant(ctx, cx, cy, size, plant.colorSeed);
      break;
  }
}

function drawPlantLarge(
  ctx: CanvasRenderingContext2D,
  plant: Plant,
  x: number,
  y: number,
  width: number,
  height: number,
  saturationBoost = 0
): void {
  const cx = x + width / 2;
  const cy = y + height * 0.95;
  const size = Math.min(width, height) * 0.5;

  const gradient = ctx.createRadialGradient(cx, cy - size * 0.5, size * 0.2, cx, cy - size * 0.5, size * 1.5);
  gradient.addColorStop(0, 'rgba(200, 230, 201, 0.6)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);

  drawPot(ctx, cx, cy + size * 0.15, size * 0.7, size * 0.55);

  ctx.save();
  if (saturationBoost > 0) {
    ctx.filter = `saturate(${1 + saturationBoost})`;
  }

  switch (plant.shapeType) {
    case 'leafy':
      drawLeafyPlant(ctx, cx, cy, size, plant.colorSeed);
      break;
    case 'tall':
      drawTallPlant(ctx, cx, cy, size, plant.colorSeed);
      break;
    case 'bushy':
      drawBushyPlant(ctx, cx, cy, size, plant.colorSeed);
      break;
    case 'vine':
      drawVinePlant(ctx, cx, cy, size, plant.colorSeed);
      break;
    case 'cactus':
      drawCactusPlant(ctx, cx, cy, size, plant.colorSeed);
      break;
    case 'fern':
      drawFernPlant(ctx, cx, cy, size, plant.colorSeed);
      break;
  }

  ctx.restore();
}

function drawPlantGreenhouse(
  ctx: CanvasRenderingContext2D,
  plant: Plant,
  cx: number,
  cy: number,
  radius: number,
  saturation = 0
): void {
  ctx.save();
  if (saturation > 0) {
    ctx.filter = `saturate(${1 + saturation})`;
  }

  switch (plant.shapeType) {
    case 'leafy':
      drawLeafyPlant(ctx, cx, cy + radius * 0.5, radius * 1.5, plant.colorSeed);
      break;
    case 'tall':
      drawTallPlant(ctx, cx, cy + radius * 0.5, radius * 1.5, plant.colorSeed);
      break;
    case 'bushy':
      drawBushyPlant(ctx, cx, cy + radius * 0.5, radius * 1.5, plant.colorSeed);
      break;
    case 'vine':
      drawVinePlant(ctx, cx, cy + radius * 0.5, radius * 1.5, plant.colorSeed);
      break;
    case 'cactus':
      drawCactusPlant(ctx, cx, cy + radius * 0.5, radius * 1.5, plant.colorSeed);
      break;
    case 'fern':
      drawFernPlant(ctx, cx, cy + radius * 0.5, radius * 1.5, plant.colorSeed);
      break;
  }

  ctx.restore();
}

export {
  drawPlantThumbnail,
  drawPlantLarge,
  drawPlantGreenhouse,
  hashToColor,
  hashToHsl
};
