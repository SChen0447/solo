export interface ParticleData {
  positions: Float32Array;
  colors: Float32Array;
  targetPositions: Float32Array;
  targetColors: Float32Array;
  sizes: Float32Array;
  charIndices: Int32Array;
  charCount: number;
  totalParticles: number;
}

const COLOR_BOTTOM = { r: 0x3b / 255, g: 0x82 / 255, b: 0xf6 / 255 };
const COLOR_TOP = { r: 0xf5 / 255, g: 0x9e / 255, b: 0x0b / 255 };
const FONT_SIZE = 200;
const CANVAS_HEIGHT = 260;
const DEPTH = 0.8;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b };
}

function lerpColor(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
  t: number
): { r: number; g: number; b: number } {
  return {
    r: c1.r + (c2.r - c1.r) * t,
    g: c1.g + (c2.g - c1.g) * t,
    b: c1.b + (c2.b - c1.b) * t,
  };
}

export function getParticleCountForChar(
  char: string,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): number {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `bold ${FONT_SIZE}px monospace`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  const metrics = ctx.measureText(char);
  const w = Math.ceil(metrics.width) + 20;
  canvas.width = Math.max(w, 40);
  canvas.height = CANVAS_HEIGHT;
  ctx.font = `bold ${FONT_SIZE}px monospace`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(char, canvas.width / 2, canvas.height / 2);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  let filledPixels = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 128) filledPixels++;
  }
  const ratio = filledPixels / (canvas.width * canvas.height);
  const base = 800;
  const extra = Math.floor(ratio * 400 * 50);
  return Math.min(1200, Math.max(600, base + extra));
}

export function sampleCharPixels(
  char: string,
  numParticles: number,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): Array<{ x: number; y: number; canvasW: number; canvasH: number }> {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `bold ${FONT_SIZE}px monospace`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  const metrics = ctx.measureText(char);
  const w = Math.ceil(metrics.width) + 20;
  canvas.width = Math.max(w, 40);
  canvas.height = CANVAS_HEIGHT;
  ctx.font = `bold ${FONT_SIZE}px monospace`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(char, canvas.width / 2, canvas.height / 2);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const filledPoints: Array<{ x: number; y: number }> = [];

  for (let py = 0; py < canvas.height; py++) {
    for (let px = 0; px < canvas.width; px++) {
      const idx = (py * canvas.width + px) * 4;
      if (data[idx + 3] > 128) {
        filledPoints.push({ x: px, y: py });
      }
    }
  }

  const samples: Array<{ x: number; y: number; canvasW: number; canvasH: number }> = [];
  if (filledPoints.length === 0) return samples;

  for (let i = 0; i < numParticles; i++) {
    const idx = Math.floor(Math.random() * filledPoints.length);
    const p = filledPoints[idx];
    samples.push({ x: p.x, y: p.y, canvasW: canvas.width, canvasH: canvas.height });
  }

  return samples;
}

export function generateTextParticles(text: string): ParticleData {
  const trimmed = text.trim();
  const chars = trimmed.length > 0 ? trimmed.split('') : ['S', 'T', 'A', 'R'];

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

  const charParticleCounts: number[] = [];
  let totalParticles = 0;
  const maxTotal = 12000;

  for (const ch of chars) {
    if (ch === ' ') {
      charParticleCounts.push(0);
      continue;
    }
    let count = getParticleCountForChar(ch, canvas, ctx);
    if (totalParticles + count > maxTotal) {
      count = Math.max(200, maxTotal - totalParticles);
    }
    charParticleCounts.push(count);
    totalParticles += count;
    if (totalParticles >= maxTotal) break;
  }

  const positions = new Float32Array(totalParticles * 3);
  const colors = new Float32Array(totalParticles * 3);
  const targetPositions = new Float32Array(totalParticles * 3);
  const targetColors = new Float32Array(totalParticles * 3);
  const sizes = new Float32Array(totalParticles);
  const charIndices = new Int32Array(totalParticles);

  ctx.font = `bold ${FONT_SIZE}px monospace`;
  const spaceWidth = ctx.measureText(' ').width;

  let cursorX = 0;
  let particleOffset = 0;
  const charCenters: Array<{ x: number; w: number }> = [];

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const count = charParticleCounts[i];
    if (ch === ' ') {
      cursorX += spaceWidth * 0.6;
      charCenters.push({ x: cursorX, w: spaceWidth * 0.6 });
      continue;
    }
    if (count === 0) continue;

    const samples = sampleCharPixels(ch, count, canvas, ctx);
    const charWidth = samples.length > 0 ? samples[0].canvasW : 100;
    const charHeight = samples.length > 0 ? samples[0].canvasH : CANVAS_HEIGHT;

    charCenters.push({ x: cursorX + charWidth / 2, w: charWidth });

    for (let j = 0; j < samples.length; j++) {
      const s = samples[j];
      const pIdx = particleOffset + j;

      const localX = (s.x / s.canvasW - 0.5) * (charWidth / FONT_SIZE) * 2;
      const localY = -(s.y / s.canvasH - 0.5) * (charHeight / FONT_SIZE) * 2;
      const depthZ = (Math.random() - 0.5) * DEPTH;

      const worldX = cursorX / FONT_SIZE * 2 + localX;
      const worldY = localY;
      const worldZ = depthZ;

      const yNorm = (s.y / s.canvasH);
      const color = lerpColor(COLOR_BOTTOM, COLOR_TOP, 1 - yNorm);

      const randomDist = 15 + Math.random() * 10;
      const randomTheta = Math.random() * Math.PI * 2;
      const randomPhi = Math.acos(2 * Math.random() - 1);

      const startX = randomDist * Math.sin(randomPhi) * Math.cos(randomTheta);
      const startY = randomDist * Math.sin(randomPhi) * Math.sin(randomTheta);
      const startZ = randomDist * Math.cos(randomPhi);

      targetPositions[pIdx * 3] = worldX;
      targetPositions[pIdx * 3 + 1] = worldY;
      targetPositions[pIdx * 3 + 2] = worldZ;

      positions[pIdx * 3] = startX;
      positions[pIdx * 3 + 1] = startY;
      positions[pIdx * 3 + 2] = startZ;

      targetColors[pIdx * 3] = color.r;
      targetColors[pIdx * 3 + 1] = color.g;
      targetColors[pIdx * 3 + 2] = color.b;

      colors[pIdx * 3] = color.r;
      colors[pIdx * 3 + 1] = color.g;
      colors[pIdx * 3 + 2] = color.b;

      sizes[pIdx] = 3.0;
      charIndices[pIdx] = i;
    }

    cursorX += charWidth + FONT_SIZE * 0.15;
    particleOffset += count;
  }

  const centerOffset = (cursorX / FONT_SIZE * 2) / 2;
  for (let i = 0; i < totalParticles; i++) {
    targetPositions[i * 3] -= centerOffset;
    positions[i * 3] -= centerOffset * 0.1;
  }

  return {
    positions,
    colors,
    targetPositions,
    targetColors,
    sizes,
    charIndices,
    charCount: chars.length,
    totalParticles,
  };
}
