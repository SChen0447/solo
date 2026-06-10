import assets from '../data/assets.json';

export interface Gradient {
  id: string;
  name: string;
  colors: [string, string];
}

export interface Pattern {
  id: string;
  name: string;
  type: string;
}

export interface CardData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  gradient: Gradient;
  pattern: Pattern;
  text: string;
  opacity: number;
  scale: number;
  selected: boolean;
  groupId?: string;
}

export interface PresetElement {
  id: string;
  gradientId: string;
  patternId: string;
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hashKeyword(keyword: string): number {
  let hash = 0;
  for (let i = 0; i < keyword.length; i++) {
    hash = ((hash << 5) - hash) + keyword.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function matchGradient(keyword?: string): Gradient {
  const gradients = assets.gradients as Gradient[];
  if (!keyword) return randomFrom(gradients);

  const keywords = assets.keywords as Record<string, string[]>;
  let matchedIds: string[] | null = null;

  for (const key of Object.keys(keywords)) {
    if (keyword.includes(key)) {
      matchedIds = keywords[key];
      break;
    }
  }

  if (matchedIds) {
    const matched = gradients.filter(g => matchedIds!.includes(g.id));
    return matched.length > 0 ? randomFrom(matched) : randomFrom(gradients);
  }

  const hash = hashKeyword(keyword);
  return gradients[hash % gradients.length];
}

export function matchPattern(keyword?: string): Pattern {
  const patterns = assets.patterns as Pattern[];
  if (!keyword) return randomFrom(patterns);
  const hash = hashKeyword(keyword);
  return patterns[hash % patterns.length];
}

export function matchText(keyword?: string): string {
  const texts = assets.texts as string[];
  if (!keyword) return randomFrom(texts);
  const hash = hashKeyword(keyword);
  return texts[hash % texts.length];
}

let cardIdCounter = 0;

export function createCard(
  x: number,
  y: number,
  keyword?: string,
  options?: Partial<Pick<CardData, 'gradient' | 'pattern'>>
): CardData {
  const gradient = options?.gradient || matchGradient(keyword);
  const pattern = options?.pattern || matchPattern(keyword);

  return {
    id: `card_${++cardIdCounter}_${Date.now()}`,
    x,
    y,
    width: 320,
    height: 240,
    gradient,
    pattern,
    text: matchText(keyword),
    opacity: 1,
    scale: 1,
    selected: false
  };
}

export function generateMoodboard(count: number, canvasWidth: number, canvasHeight: number): CardData[] {
  const cards: CardData[] = [];
  const padding = 40;
  const cols = Math.min(count, 2);
  const cardW = 320;
  const cardH = 240;
  const spacing = 30;
  const totalW = cols * cardW + (cols - 1) * spacing;
  const startX = Math.max(padding, (canvasWidth - totalW) / 2);
  const startY = padding + 80;

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (cardW + spacing);
    const y = startY + row * (cardH + spacing);
    cards.push(createCard(x, y));
  }
  return cards;
}

export function getPresetElements(): (PresetElement & { gradient: Gradient; pattern: Pattern })[] {
  const gradients = assets.gradients as Gradient[];
  const patterns = assets.patterns as Pattern[];
  const presets = assets.presetElements as PresetElement[];

  return presets.map(p => ({
    ...p,
    gradient: gradients.find(g => g.id === p.gradientId)!,
    pattern: patterns.find(pt => pt.id === p.patternId)!
  }));
}

export function drawCard(
  ctx: CanvasRenderingContext2D,
  card: CardData,
  width: number,
  height: number
): void {
  const { gradient, pattern, opacity } = card;

  ctx.save();
  ctx.globalAlpha = opacity;

  const grd = ctx.createLinearGradient(0, 0, width, height);
  grd.addColorStop(0, gradient.colors[0]);
  grd.addColorStop(1, gradient.colors[1]);
  ctx.fillStyle = grd;
  roundRect(ctx, 0, 0, width, height, 12);
  ctx.fill();

  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#ffffff';
  drawPattern(ctx, pattern.type, width, height);
  ctx.restore();

  ctx.fillStyle = '#2d2b3a';
  ctx.font = '14px -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  wrapText(ctx, card.text, width / 2, height / 2, width - 40, 22, true);
  wrapText(ctx, card.text, width / 2, height / 2, width - 40, 22, false);

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
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

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  stroke: boolean
): void {
  const chars = text.split('');
  let line = '';
  const lines: string[] = [];

  for (let i = 0; i < chars.length; i++) {
    const test = line + chars[i];
    if (ctx.measureText(test).width > maxWidth && line.length > 0) {
      lines.push(line);
      line = chars[i];
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  const totalH = lines.length * lineHeight;
  const startY = y - totalH / 2 + lineHeight / 2;

  lines.forEach((l, i) => {
    if (stroke) {
      ctx.strokeText(l, x, startY + i * lineHeight);
    } else {
      ctx.fillText(l, x, startY + i * lineHeight);
    }
  });
}

function drawPattern(
  ctx: CanvasRenderingContext2D,
  type: string,
  w: number,
  h: number
): void {
  switch (type) {
    case 'diamond':
      drawDiamonds(ctx, w, h);
      break;
    case 'hexagon':
      drawHexagons(ctx, w, h);
      break;
    case 'circle':
      drawCircles(ctx, w, h);
      break;
    case 'triangle':
      drawTriangles(ctx, w, h);
      break;
    case 'stripe':
      drawStripes(ctx, w, h);
      break;
    case 'dots':
      drawDots(ctx, w, h);
      break;
    case 'wave':
      drawWaves(ctx, w, h);
      break;
    case 'cross':
      drawCrosses(ctx, w, h);
      break;
    case 'star':
      drawStars(ctx, w, h);
      break;
  }
}

function drawDiamonds(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const size = 40;
  for (let y = -size; y < h + size; y += size) {
    for (let x = -size; x < w + size; x += size) {
      ctx.beginPath();
      ctx.moveTo(x + size / 2, y);
      ctx.lineTo(x + size, y + size / 2);
      ctx.lineTo(x + size / 2, y + size);
      ctx.lineTo(x, y + size / 2);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawHexagons(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const size = 28;
  for (let y = -size; y < h + size; y += size * 1.5) {
    for (let x = -size; x < w + size; x += size * 1.732) {
      drawHex(ctx, x + size, y + size, size * 0.6);
      drawHex(ctx, x + size * 0.866 + size, y + size * 0.75 + size, size * 0.6);
    }
  }
}

function drawHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawCircles(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const size = 50;
  for (let y = size / 2; y < h; y += size) {
    for (let x = size / 2; x < w; x += size) {
      ctx.beginPath();
      ctx.arc(x, y, size * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawTriangles(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const size = 45;
  for (let y = -size; y < h + size; y += size) {
    for (let x = -size; x < w + size; x += size) {
      ctx.beginPath();
      ctx.moveTo(x, y + size);
      ctx.lineTo(x + size / 2, y);
      ctx.lineTo(x + size, y + size);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawStripes(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const spacing = 18;
  ctx.save();
  ctx.rotate(-Math.PI / 6);
  const extend = Math.max(w, h) * 2;
  for (let x = -extend; x < extend * 2; x += spacing) {
    ctx.fillRect(x, -extend, 8, extend * 4);
  }
  ctx.restore();
}

function drawDots(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const size = 22;
  for (let y = size / 2; y < h; y += size) {
    for (let x = size / 2; x < w; x += size) {
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawWaves(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const amplitude = 12;
  const wavelength = 60;
  const lineSpacing = 30;
  ctx.lineWidth = 6;
  ctx.strokeStyle = ctx.fillStyle;
  for (let y = 0; y < h + lineSpacing; y += lineSpacing) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const yy = y + amplitude * Math.sin((x / wavelength) * Math.PI * 2);
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
}

function drawCrosses(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const size = 40;
  ctx.lineWidth = 5;
  ctx.strokeStyle = ctx.fillStyle;
  for (let y = 0; y < h + size; y += size) {
    for (let x = 0; x < w + size; x += size) {
      ctx.beginPath();
      ctx.moveTo(x - 10, y);
      ctx.lineTo(x + 10, y);
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x, y + 10);
      ctx.stroke();
    }
  }
}

function drawStars(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const size = 50;
  for (let y = size / 2; y < h; y += size) {
    for (let x = size / 2; x < w; x += size) {
      drawStar(ctx, x, y, 5, 12, 5);
      ctx.fill();
    }
  }
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerR: number,
  innerR: number
): void {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    let x = cx + Math.cos(rot) * outerR;
    let y = cy + Math.sin(rot) * outerR;
    ctx.lineTo(x, y);
    rot += step;
    x = cx + Math.cos(rot) * innerR;
    y = cy + Math.sin(rot) * innerR;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerR);
  ctx.closePath();
}
