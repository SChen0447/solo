export interface FontEngineParams {
  text: string;
  distortion: number;
  glowRadius: number;
  glowColor: string;
  noiseIntensity: number;
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  positionX: number;
  positionY: number;
}

export interface RenderState {
  params: FontEngineParams;
  frameCount: number;
  fps: number;
  lastFrameTime: number;
}

const PERMUTATION_SIZE = 512;
const NOISE_TABLE_SIZE = 256;

let permutation: number[] = [];
let noiseLUT: number[] = [];

function buildPermutation(): number[] {
  const p: number[] = [];
  for (let i = 0; i < 256; i++) {
    p[i] = i;
  }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm: number[] = new Array(PERMUTATION_SIZE);
  for (let i = 0; i < PERMUTATION_SIZE; i++) {
    perm[i] = p[i & 255];
  }
  return perm;
}

function buildNoiseLUT(): number[] {
  const lut: number[] = new Array(NOISE_TABLE_SIZE * NOISE_TABLE_SIZE);
  for (let y = 0; y < NOISE_TABLE_SIZE; y++) {
    for (let x = 0; x < NOISE_TABLE_SIZE; x++) {
      lut[y * NOISE_TABLE_SIZE + x] = Math.random();
    }
  }
  return lut;
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function grad(hash: number, x: number, y: number): number {
  const h = hash & 3;
  const u = h < 2 ? x : y;
  const v = h < 2 ? y : x;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

function perlinNoise2D(x: number, y: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;

  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);

  const u = fade(xf);
  const v = fade(yf);

  const aa = permutation[permutation[X] + Y];
  const ab = permutation[permutation[X] + Y + 1];
  const ba = permutation[permutation[X + 1] + Y];
  const bb = permutation[permutation[X + 1] + Y + 1];

  const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
  const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);

  return (lerp(x1, x2, v) + 1) / 2;
}

function sampledNoise(x: number, y: number, time: number): number {
  const px = Math.floor((x + time * 0.7)) & (NOISE_TABLE_SIZE - 1);
  const py = Math.floor((y + time * 1.3)) & (NOISE_TABLE_SIZE - 1);
  return noiseLUT[py * NOISE_TABLE_SIZE + px];
}

export function createFontEngine(canvas: HTMLCanvasElement) {
  permutation = buildPermutation();
  noiseLUT = buildNoiseLUT();

  const ctx = canvas.getContext('2d')!;
  const dpr = window.devicePixelRatio || 1;

  const state: RenderState = {
    params: {
      text: 'Raster Font',
      distortion: 30,
      glowRadius: 5,
      glowColor: '#00D4FF',
      noiseIntensity: 10,
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: 48,
      fontColor: '#FFFFFF',
      positionX: 0,
      positionY: 0,
    },
    frameCount: 0,
    fps: 60,
    lastFrameTime: performance.now(),
  };

  let centered = false;

  function resizeCanvas() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!centered) {
      state.params.positionX = window.innerWidth / 2;
      state.params.positionY = window.innerHeight / 2;
      centered = true;
    }
  }

  function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { r: 255, g: 255, b: 255 };
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    };
  }

  function measureText(): { width: number; height: number } {
    ctx.font = `${state.params.fontSize}px ${state.params.fontFamily}`;
    const metrics = ctx.measureText(state.params.text);
    const width = metrics.width;
    const height = state.params.fontSize * 1.2;
    return { width, height };
  }

  function renderFrame() {
    const now = performance.now();
    const delta = now - state.lastFrameTime;
    state.fps = 1000 / delta;
    state.lastFrameTime = now;
    state.frameCount++;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const time = state.frameCount * 0.016;

    ctx.clearRect(0, 0, w, h);

    drawScanlines(w, h, time);
    drawText(time);

    return state;
  }

  function drawScanlines(w: number, h: number, _time: number) {
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    for (let y = 0; y < h; y += 3) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const dim = 0.92;
        data[i] = Math.floor(data[i] * dim);
        data[i + 1] = Math.floor(data[i + 1] * dim);
        data[i + 2] = Math.floor(data[i + 2] * dim);
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  function drawText(time: number) {
    const text = state.params.text;
    if (!text) return;

    const { width, height } = measureText();
    const x = state.params.positionX - width / 2;
    const y = state.params.positionY;

    const distortion = state.params.distortion / 100;
    const noiseStrength = state.params.noiseIntensity / 100;

    if (state.params.glowRadius > 0) {
      drawGlowLayer(x, y, width, height, time);
    }

    drawMainText(x, y, time, distortion, noiseStrength);
  }

  function drawGlowLayer(
    baseX: number,
    baseY: number,
    _width: number,
    _height: number,
    time: number
  ) {
    const glowRgb = hexToRgb(state.params.glowColor);
    const radius = state.params.glowRadius;

    ctx.save();
    ctx.font = `${state.params.fontSize}px ${state.params.fontFamily}`;
    ctx.textBaseline = 'middle';

    for (let layer = 3; layer >= 0; layer--) {
      const alpha = (1 - layer / 4) * 0.35;
      const offset = radius * (layer + 1) * 0.5;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgba(${glowRgb.r}, ${glowRgb.g}, ${glowRgb.b}, ${alpha})`;

      drawDistortedText(baseX, baseY, time, offset, 0);
    }
    ctx.restore();
  }

  function drawMainText(
    baseX: number,
    baseY: number,
    time: number,
    distortion: number,
    noiseStrength: number
  ) {
    ctx.save();
    ctx.font = `${state.params.fontSize}px ${state.params.fontFamily}`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = state.params.fontColor;
    ctx.globalAlpha = 1;

    drawDistortedText(baseX, baseY, time, distortion * 3, noiseStrength);
    ctx.restore();
  }

  function drawDistortedText(
    baseX: number,
    baseY: number,
    time: number,
    maxOffset: number,
    noiseStrength: number
  ) {
    const text = state.params.text;
    let charX = baseX;
    const fontSize = state.params.fontSize;

    ctx.font = `${fontSize}px ${state.params.fontFamily}`;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const charWidth = ctx.measureText(char).width;

      const seed1 = Math.sin(i * 12.9898 + time * 2.3) * 43758.5453;
      const seed2 = Math.sin(i * 78.233 + time * 3.7) * 43758.5453;
      const noiseX = ((seed1 - Math.floor(seed1)) - 0.5) * 2 * maxOffset;
      const noiseY = ((seed2 - Math.floor(seed2)) - 0.5) * 2 * maxOffset;

      const charCenterX = charX + charWidth / 2;
      const perlinVal = perlinNoise2D(
        charCenterX * 0.005 + time * 0.1,
        baseY * 0.005
      );
      const perlinOffset = (perlinVal - 0.5) * maxOffset * 0.5;

      if (noiseStrength > 0) {
        const sample = sampledNoise(charCenterX, baseY, time * 2);
        if (sample < noiseStrength * 0.5) {
          charX += charWidth;
          continue;
        }
      }

      const glitchOffsetY =
        Math.random() < 0.015 * (maxOffset / 6) ? (Math.random() - 0.5) * fontSize * 0.3 : 0;

      const noiseAlpha =
        noiseStrength > 0
          ? 1 - sampledNoise(charCenterX + 100, baseY + 50, time) * noiseStrength * 0.4
          : 1;

      ctx.globalAlpha = Math.max(0.3, Math.min(1, noiseAlpha));

      if (Math.random() < 0.02 * (maxOffset / 5)) {
        const rgb = hexToRgb(state.params.glowColor);
        ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
      } else {
        ctx.fillStyle = state.params.fontColor;
      }

      ctx.fillText(
        char,
        charX + noiseX + perlinOffset,
        baseY + noiseY + perlinOffset + glitchOffsetY
      );

      if (Math.random() < 0.03 * (maxOffset / 5)) {
        ctx.globalAlpha = 0.5;
        ctx.fillText(
          char,
          charX + noiseX + perlinOffset + (Math.random() - 0.5) * 10,
          baseY + noiseY + perlinOffset + glitchOffsetY
        );
      }

      charX += charWidth;
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = state.params.fontColor;
  }

  function setParams(partial: Partial<FontEngineParams>) {
    Object.assign(state.params, partial);
  }

  function resetPosition() {
    state.params.positionX = window.innerWidth / 2;
    state.params.positionY = window.innerHeight / 2;
  }

  function getState(): RenderState {
    return state;
  }

  return {
    resizeCanvas,
    renderFrame,
    setParams,
    resetPosition,
    getState,
    measureText,
  };
}

export type FontEngine = ReturnType<typeof createFontEngine>;
