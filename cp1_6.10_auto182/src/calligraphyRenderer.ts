export type ThemeColor = '#2a1a0a' | '#c0392b' | '#1a5276';

export interface RenderOptions {
  theme: ThemeColor;
  diffusionSpeed: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  life: number;
  maxLife: number;
}

interface BrushPoint {
  x: number;
  y: number;
  pressure: number;
}

interface AnimationState {
  startTime: number;
  writeDuration: number;
  particleStartTime: number;
  isWriting: boolean;
  particles: Particle[];
  currentPeriod: string;
  currentTheme: ThemeColor;
  currentSpeed: number;
  brushPaths: BrushPoint[][];
}

let animationState: AnimationState | null = null;
let rafId: number | null = null;

export function drawCalligraphy(
  canvas: HTMLCanvasElement,
  period: string,
  options: RenderOptions
): void {
  if (!canvas) return;

  const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d');
  if (!ctx) return;

  setupCanvasResolution(canvas);

  const changed: boolean = !animationState ||
    animationState.currentPeriod !== period ||
    animationState.currentTheme !== options.theme ||
    animationState.currentSpeed !== options.diffusionSpeed;

  if (changed) {
    const brushPaths: BrushPoint[][] = generateBrushPaths(canvas, period);
    animationState = {
      startTime: performance.now(),
      writeDuration: 5000,
      particleStartTime: 0,
      isWriting: true,
      particles: [],
      currentPeriod: period,
      currentTheme: options.theme,
      currentSpeed: options.diffusionSpeed,
      brushPaths
    };
  }

  if (rafId === null) {
    startAnimationLoop(canvas, options);
  }
}

export function triggerParticleEffect(
  canvas: HTMLCanvasElement,
  centerX: number,
  centerY: number,
  color: string
): void {
  if (!animationState) return;

  const particleCount: number = 60 + Math.floor(Math.random() * 21);
  const speedFactor: number = animationState.currentSpeed / 5;

  for (let i: number = 0; i < particleCount; i++) {
    const angle: number = Math.random() * Math.PI * 2;
    const speed: number = (0.5 + Math.random() * 1.5) * speedFactor;
    const particle: Particle = {
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 2 + Math.random() * 3,
      opacity: 0.6,
      life: 0,
      maxLife: 1500 / speedFactor
    };
    animationState.particles.push(particle);
  }

  animationState.particleStartTime = performance.now();
}

function setupCanvasResolution(canvas: HTMLCanvasElement): void {
  const dpr: number = window.devicePixelRatio || 1;
  const rect: DOMRect = canvas.getBoundingClientRect();
  const logicalWidth: number = rect.width;
  const logicalHeight: number = rect.height;

  if (canvas.width !== logicalWidth * dpr || canvas.height !== logicalHeight * dpr) {
    canvas.width = logicalWidth * dpr;
    canvas.height = logicalHeight * dpr;
    const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }
}

function generateBrushPaths(canvas: HTMLCanvasElement, period: string): BrushPoint[][] {
  const rect: DOMRect = canvas.getBoundingClientRect();
  const w: number = rect.width;
  const h: number = rect.height;
  const centerX: number = w / 2;
  const centerY: number = h / 2;

  const paths: BrushPoint[][] = [];
  const chars: string[] = period.split('');

  chars.forEach((char: string, charIndex: number): void => {
    const charOffsetX: number = (charIndex - (chars.length - 1) / 2) * (w * 0.32);
    const baseX: number = centerX + charOffsetX;
    const baseY: number = centerY;

    const charPaths: BrushPoint[][] = getCharacterStrokes(char, baseX, baseY, Math.min(w, h) * 0.35);
    paths.push(...charPaths);
  });

  return paths;
}

function getCharacterStrokes(char: string, cx: number, cy: number, size: number): BrushPoint[][] {
  const strokes: BrushPoint[][] = [];
  const s: number = size;

  switch (char) {
    case '子':
      strokes.push(makeStroke([[cx - s * 0.4, cy - s * 0.5], [cx - s * 0.1, cy - s * 0.35], [cx + s * 0.2, cy - s * 0.45]]));
      strokes.push(makeStroke([[cx + s * 0.3, cy - s * 0.3], [cx + s * 0.15, cy], [cx + s * 0.35, cy + s * 0.2]]));
      strokes.push(makeStroke([[cx - s * 0.3, cy - s * 0.1], [cx - s * 0.15, cy + s * 0.1], [cx - s * 0.35, cy + s * 0.4]]));
      strokes.push(makeStroke([[cx - s * 0.05, cy + s * 0.05], [cx + s * 0.05, cy + s * 0.15], [cx - s * 0.05, cy + s * 0.45]]));
      break;
    case '丑':
      strokes.push(makeStroke([[cx - s * 0.35, cy - s * 0.5], [cx - s * 0.1, cy - s * 0.4], [cx + s * 0.3, cy - s * 0.45]]));
      strokes.push(makeStroke([[cx - s * 0.25, cy - s * 0.3], [cx - s * 0.2, cy - s * 0.05]]));
      strokes.push(makeStroke([[cx + s * 0.1, cy - s * 0.3], [cx + s * 0.15, cy - s * 0.05]]));
      strokes.push(makeStroke([[cx - s * 0.35, cy], [cx - s * 0.05, cy + s * 0.05], [cx + s * 0.3, cy]]));
      strokes.push(makeStroke([[cx - s * 0.25, cy + s * 0.1], [cx - s * 0.2, cy + s * 0.4]]));
      strokes.push(makeStroke([[cx + s * 0.1, cy + s * 0.1], [cx + s * 0.15, cy + s * 0.4]]));
      strokes.push(makeStroke([[cx - s * 0.3, cy + s * 0.45], [cx + s * 0.05, cy + s * 0.5], [cx + s * 0.3, cy + s * 0.45]]));
      break;
    case '寅':
      strokes.push(makeStroke([[cx - s * 0.1, cy - s * 0.55], [cx, cy - s * 0.4], [cx + s * 0.1, cy - s * 0.55]]));
      strokes.push(makeStroke([[cx - s * 0.25, cy - s * 0.35], [cx + s * 0.25, cy - s * 0.3]]));
      strokes.push(makeStroke([[cx - s * 0.35, cy - s * 0.15], [cx - s * 0.1, cy - s * 0.1], [cx + s * 0.35, cy - s * 0.15]]));
      strokes.push(makeStroke([[cx - s * 0.3, cy], [cx - s * 0.15, cy + s * 0.05], [cx - s * 0.4, cy + s * 0.5]]));
      strokes.push(makeStroke([[cx - s * 0.05, cy + s * 0.05], [cx + s * 0.1, cy + s * 0.2], [cx - s * 0.05, cy + s * 0.5]]));
      strokes.push(makeStroke([[cx + s * 0.15, cy + s * 0.05], [cx + s * 0.3, cy + s * 0.15], [cx + s * 0.35, cy + s * 0.45]]));
      break;
    case '卯':
      strokes.push(makeStroke([[cx - s * 0.35, cy - s * 0.5], [cx - s * 0.25, cy - s * 0.2]]));
      strokes.push(makeStroke([[cx - s * 0.4, cy - s * 0.35], [cx - s * 0.15, cy - s * 0.3]]));
      strokes.push(makeStroke([[cx - s * 0.4, cy], [cx - s * 0.15, cy + s * 0.05]]));
      strokes.push(makeStroke([[cx - s * 0.35, cy + s * 0.3], [cx - s * 0.25, cy + s * 0.5]]));
      strokes.push(makeStroke([[cx, cy - s * 0.5], [cx + s * 0.05, cy - s * 0.15], [cx - s * 0.05, cy + s * 0.5]]));
      strokes.push(makeStroke([[cx + s * 0.1, cy - s * 0.35], [cx + s * 0.35, cy - s * 0.3], [cx + s * 0.4, cy - s * 0.1]]));
      strokes.push(makeStroke([[cx + s * 0.1, cy], [cx + s * 0.35, cy + s * 0.05], [cx + s * 0.35, cy + s * 0.25]]));
      break;
    case '辰':
      strokes.push(makeStroke([[cx - s * 0.1, cy - s * 0.55], [cx, cy - s * 0.4], [cx + s * 0.35, cy - s * 0.5]]));
      strokes.push(makeStroke([[cx - s * 0.3, cy - s * 0.3], [cx + s * 0.05, cy - s * 0.25]]));
      strokes.push(makeStroke([[cx + s * 0.15, cy - s * 0.3], [cx + s * 0.2, cy - s * 0.05]]));
      strokes.push(makeStroke([[cx - s * 0.35, cy - s * 0.05], [cx, cy], [cx + s * 0.3, cy - s * 0.05]]));
      strokes.push(makeStroke([[cx - s * 0.3, cy + s * 0.1], [cx - s * 0.15, cy + s * 0.15]]));
      strokes.push(makeStroke([[cx + s * 0.1, cy + s * 0.1], [cx + s * 0.25, cy + s * 0.2], [cx, cy + s * 0.35]]));
      strokes.push(makeStroke([[cx - s * 0.4, cy + s * 0.3], [cx - s * 0.1, cy + s * 0.4], [cx + s * 0.2, cy + s * 0.3]]));
      strokes.push(makeStroke([[cx - s * 0.25, cy + s * 0.45], [cx - s * 0.15, cy + s * 0.5]]));
      break;
    case '巳':
      strokes.push(makeStroke([[cx - s * 0.25, cy - s * 0.5], [cx - s * 0.15, cy - s * 0.3]]));
      strokes.push(makeStroke([[cx - s * 0.3, cy - s * 0.35], [cx - s * 0.05, cy - s * 0.3], [cx + s * 0.1, cy - s * 0.15]]));
      strokes.push(makeStroke([[cx - s * 0.35, cy - s * 0.1], [cx - s * 0.1, cy - s * 0.05], [cx + s * 0.05, cy + s * 0.1]]));
      strokes.push(makeStroke([[cx - s * 0.3, cy + s * 0.15], [cx - s * 0.1, cy + s * 0.2], [cx + s * 0.1, cy + s * 0.35]]));
      strokes.push(makeStroke([[cx - s * 0.25, cy + s * 0.4], [cx - s * 0.15, cy + s * 0.5]]));
      strokes.push(makeStroke([[cx + s * 0.1, cy - s * 0.3], [cx + s * 0.3, cy - s * 0.4], [cx + s * 0.35, cy - s * 0.1]]));
      strokes.push(makeStroke([[cx + s * 0.1, cy - s * 0.05], [cx + s * 0.35, cy], [cx + s * 0.3, cy + s * 0.2]]));
      strokes.push(makeStroke([[cx + s * 0.1, cy + s * 0.3], [cx + s * 0.3, cy + s * 0.35], [cx + s * 0.2, cy + s * 0.5]]));
      break;
    case '午':
      strokes.push(makeStroke([[cx - s * 0.35, cy - s * 0.45], [cx - s * 0.1, cy - s * 0.35], [cx + s * 0.3, cy - s * 0.45]]));
      strokes.push(makeStroke([[cx, cy - s * 0.55], [cx + s * 0.05, cy - s * 0.1], [cx - s * 0.05, cy + s * 0.5]]));
      strokes.push(makeStroke([[cx - s * 0.25, cy - s * 0.2], [cx - s * 0.25, cy + s * 0.05]]));
      strokes.push(makeStroke([[cx + s * 0.2, cy - s * 0.2], [cx + s * 0.25, cy + s * 0.05]]));
      break;
    case '未':
      strokes.push(makeStroke([[cx - s * 0.1, cy - s * 0.55], [cx, cy - s * 0.4], [cx + s * 0.1, cy - s * 0.55]]));
      strokes.push(makeStroke([[cx - s * 0.35, cy - s * 0.35], [cx - s * 0.1, cy - s * 0.3], [cx + s * 0.35, cy - s * 0.35]]));
      strokes.push(makeStroke([[cx - s * 0.3, cy - s * 0.1], [cx - s * 0.15, cy - s * 0.05]]));
      strokes.push(makeStroke([[cx + s * 0.1, cy - s * 0.1], [cx + s * 0.25, cy - s * 0.05]]));
      strokes.push(makeStroke([[cx - s * 0.4, cy + s * 0.1], [cx, cy + s * 0.15], [cx + s * 0.4, cy + s * 0.1]]));
      strokes.push(makeStroke([[cx - s * 0.25, cy + s * 0.2], [cx - s * 0.3, cy + s * 0.5]]));
      strokes.push(makeStroke([[cx - s * 0.05, cy + s * 0.2], [cx, cy + s * 0.5]]));
      strokes.push(makeStroke([[cx + s * 0.2, cy + s * 0.2], [cx + s * 0.3, cy + s * 0.5]]));
      break;
    case '申':
      strokes.push(makeStroke([[cx - s * 0.35, cy - s * 0.5], [cx - s * 0.25, cy - s * 0.2]]));
      strokes.push(makeStroke([[cx - s * 0.4, cy - s * 0.35], [cx - s * 0.1, cy - s * 0.3]]));
      strokes.push(makeStroke([[cx - s * 0.35, cy + s * 0.1], [cx - s * 0.1, cy + s * 0.15]]));
      strokes.push(makeStroke([[cx - s * 0.3, cy + s * 0.35], [cx - s * 0.25, cy + s * 0.5]]));
      strokes.push(makeStroke([[cx, cy - s * 0.5], [cx + s * 0.05, cy], [cx - s * 0.05, cy + s * 0.5]]));
      strokes.push(makeStroke([[cx + s * 0.1, cy - s * 0.5], [cx + s * 0.35, cy - s * 0.35]]));
      strokes.push(makeStroke([[cx + s * 0.1, cy - s * 0.3], [cx + s * 0.4, cy - s * 0.2]]));
      strokes.push(makeStroke([[cx + s * 0.4, cy - s * 0.2], [cx + s * 0.35, cy + s * 0.1]]));
      strokes.push(makeStroke([[cx + s * 0.1, cy + s * 0.1], [cx + s * 0.4, cy + s * 0.15]]));
      strokes.push(makeStroke([[cx + s * 0.35, cy + s * 0.15], [cx + s * 0.25, cy + s * 0.5]]));
      break;
    case '酉':
      strokes.push(makeStroke([[cx - s * 0.35, cy - s * 0.5], [cx - s * 0.1, cy - s * 0.4], [cx + s * 0.3, cy - s * 0.5]]));
      strokes.push(makeStroke([[cx - s * 0.4, cy - s * 0.35], [cx - s * 0.35, cy + s * 0.1]]));
      strokes.push(makeStroke([[cx + s * 0.35, cy - s * 0.35], [cx + s * 0.3, cy + s * 0.1]]));
      strokes.push(makeStroke([[cx - s * 0.3, cy - s * 0.25], [cx + s * 0.05, cy - s * 0.2]]));
      strokes.push(makeStroke([[cx + s * 0.15, cy - s * 0.25], [cx + s * 0.2, cy - s * 0.05]]));
      strokes.push(makeStroke([[cx - s * 0.35, cy], [cx + s * 0.05, cy + s * 0.05]]));
      strokes.push(makeStroke([[cx + s * 0.15, cy], [cx + s * 0.2, cy + s * 0.2]]));
      strokes.push(makeStroke([[cx - s * 0.3, cy + s * 0.3], [cx - s * 0.1, cy + s * 0.35], [cx + s * 0.2, cy + s * 0.3]]));
      strokes.push(makeStroke([[cx - s * 0.25, cy + s * 0.4], [cx - s * 0.15, cy + s * 0.5]]));
      strokes.push(makeStroke([[cx + s * 0.1, cy + s * 0.4], [cx + s * 0.2, cy + s * 0.5]]));
      break;
    case '戌':
      strokes.push(makeStroke([[cx - s * 0.35, cy - s * 0.5], [cx - s * 0.25, cy - s * 0.2]]));
      strokes.push(makeStroke([[cx - s * 0.4, cy - s * 0.35], [cx - s * 0.15, cy - s * 0.3]]));
      strokes.push(makeStroke([[cx - s * 0.1, cy - s * 0.5], [cx + s * 0.05, cy - s * 0.25], [cx - s * 0.05, cy + s * 0.1]]));
      strokes.push(makeStroke([[cx - s * 0.35, cy - s * 0.05], [cx - s * 0.15, cy]]));
      strokes.push(makeStroke([[cx - s * 0.25, cy + s * 0.15], [cx - s * 0.15, cy + s * 0.4]]));
      strokes.push(makeStroke([[cx + s * 0.05, cy - s * 0.5], [cx + s * 0.35, cy - s * 0.4]]));
      strokes.push(makeStroke([[cx + s * 0.3, cy - s * 0.4], [cx + s * 0.35, cy - s * 0.1]]));
      strokes.push(makeStroke([[cx + s * 0.1, cy - s * 0.25], [cx + s * 0.35, cy - s * 0.2], [cx + s * 0.35, cy + s * 0.05]]));
      strokes.push(makeStroke([[cx + s * 0.1, cy], [cx + s * 0.3, cy + s * 0.05], [cx + s * 0.2, cy + s * 0.35]]));
      strokes.push(makeStroke([[cx - s * 0.05, cy + s * 0.25], [cx + s * 0.1, cy + s * 0.35], [cx - s * 0.1, cy + s * 0.5]]));
      break;
    case '亥':
      strokes.push(makeStroke([[cx - s * 0.35, cy - s * 0.5], [cx - s * 0.25, cy - s * 0.15]]));
      strokes.push(makeStroke([[cx - s * 0.4, cy - s * 0.35], [cx - s * 0.1, cy - s * 0.3]]));
      strokes.push(makeStroke([[cx - s * 0.35, cy], [cx - s * 0.1, cy + s * 0.05]]));
      strokes.push(makeStroke([[cx - s * 0.3, cy + s * 0.25], [cx - s * 0.25, cy + s * 0.5]]));
      strokes.push(makeStroke([[cx, cy - s * 0.55], [cx + s * 0.05, cy - s * 0.3], [cx - s * 0.05, cy]]));
      strokes.push(makeStroke([[cx - s * 0.1, cy + s * 0.1], [cx + s * 0.05, cy + s * 0.25], [cx - s * 0.05, cy + s * 0.5]]));
      strokes.push(makeStroke([[cx + s * 0.1, cy - s * 0.45], [cx + s * 0.35, cy - s * 0.35]]));
      strokes.push(makeStroke([[cx + s * 0.3, cy - s * 0.35], [cx + s * 0.35, cy - s * 0.05]]));
      strokes.push(makeStroke([[cx + s * 0.1, cy - s * 0.15], [cx + s * 0.35, cy - s * 0.1], [cx + s * 0.35, cy + s * 0.15]]));
      strokes.push(makeStroke([[cx + s * 0.1, cy + s * 0.1], [cx + s * 0.3, cy + s * 0.15], [cx + s * 0.2, cy + s * 0.45]]));
      strokes.push(makeStroke([[cx + s * 0.35, cy - s * 0.05], [cx + s * 0.4, cy + s * 0.1], [cx + s * 0.35, cy + s * 0.2]]));
      break;
    default:
      strokes.push(makeStroke([[cx - s * 0.3, cy - s * 0.3], [cx, cy], [cx + s * 0.3, cy + s * 0.3]]));
      strokes.push(makeStroke([[cx + s * 0.3, cy - s * 0.3], [cx, cy], [cx - s * 0.3, cy + s * 0.3]]));
  }

  return strokes;
}

function makeStroke(points: number[][]): BrushPoint[] {
  const result: BrushPoint[] = [];
  for (let i: number = 0; i < points.length - 1; i++) {
    const start: number[] = points[i];
    const end: number[] = points[i + 1];
    const segments: number = 15;
    for (let j: number = 0; j <= segments; j++) {
      const t: number = j / segments;
      const pressure: number = 0.3 + Math.sin(t * Math.PI) * 0.7;
      result.push({
        x: start[0] + (end[0] - start[0]) * t,
        y: start[1] + (end[1] - start[1]) * t,
        pressure
      });
    }
  }
  return result;
}

function startAnimationLoop(canvas: HTMLCanvasElement, options: RenderOptions): void {
  const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d');
  if (!ctx) return;

  const animate = (): void => {
    if (!animationState) {
      rafId = null;
      return;
    }

    const rect: DOMRect = canvas.getBoundingClientRect();
    clearCanvas(ctx, rect.width, rect.height);

    const now: number = performance.now();
    const elapsed: number = now - animationState.startTime;
    const writeProgress: number = Math.min(elapsed / animationState.writeDuration, 1);

    drawInkBackground(ctx, rect.width, rect.height, options);
    drawWriting(ctx, animationState.brushPaths, writeProgress, animationState.currentTheme);

    if (writeProgress >= 1 && animationState.isWriting) {
      animationState.isWriting = false;
      triggerParticleEffect(canvas, rect.width / 2, rect.height / 2, animationState.currentTheme);
    }

    updateAndDrawParticles(ctx, animationState.particles);

    if (animationState.particles.length > 0 || animationState.isWriting) {
      rafId = requestAnimationFrame(animate);
    } else {
      rafId = null;
    }
  };

  rafId = requestAnimationFrame(animate);
}

function clearCanvas(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.clearRect(0, 0, w, h);
}

function drawInkBackground(ctx: CanvasRenderingContext2D, w: number, h: number, options: RenderOptions): void {
  const speedFactor: number = options.diffusionSpeed / 10;
  const gradient: CanvasGradient = ctx.createRadialGradient(
    w / 2, h / 2, 0,
    w / 2, h / 2, Math.max(w, h) * 0.6
  );
  const rgb: string = hexToRgb(options.theme);
  gradient.addColorStop(0, `rgba(${rgb}, ${0.03 * speedFactor})`);
  gradient.addColorStop(0.5, `rgba(${rgb}, ${0.015 * speedFactor})`);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function drawWriting(
  ctx: CanvasRenderingContext2D,
  paths: BrushPoint[][],
  progress: number,
  color: ThemeColor
): void {
  const totalStrokes: number = paths.length;
  const strokesToShow: number = Math.floor(progress * totalStrokes);
  const currentStrokeProgress: number = (progress * totalStrokes) - strokesToShow;

  for (let i: number = 0; i < strokesToShow && i < paths.length; i++) {
    drawBrushStroke(ctx, paths[i], 1, color);
  }

  if (strokesToShow < paths.length && currentStrokeProgress > 0) {
    drawBrushStroke(ctx, paths[strokesToShow], currentStrokeProgress, color);
  }

  const baseOpacity: number = 0.2 + progress * 0.7;
  ctx.globalAlpha = baseOpacity;
}

function drawBrushStroke(
  ctx: CanvasRenderingContext2D,
  points: BrushPoint[],
  progress: number,
  color: ThemeColor
): void {
  if (points.length < 2) return;

  const count: number = Math.max(2, Math.floor(points.length * progress));
  const showPoints: BrushPoint[] = points.slice(0, count);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let layer: number = 0; layer < 3; layer++) {
    ctx.beginPath();
    ctx.globalAlpha = layer === 0 ? 0.15 : layer === 1 ? 0.4 : 1;
    ctx.strokeStyle = color;

    for (let i: number = 0; i < showPoints.length; i++) {
      const p: BrushPoint = showPoints[i];
      const baseWidth: number = 8 - (8 - 2) * (1 - p.pressure);
      const width: number = baseWidth * (1 - layer * 0.3);
      ctx.lineWidth = Math.max(width, 1);

      if (i === 0) {
        ctx.moveTo(p.x, p.y);
      } else {
        const prev: BrushPoint = showPoints[i - 1];
        const midX: number = (prev.x + p.x) / 2;
        const midY: number = (prev.y + p.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
      }
    }
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

function updateAndDrawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  for (let i: number = particles.length - 1; i >= 0; i--) {
    const p: Particle = particles[i];
    p.life += 16.67;
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.98;
    p.vy *= 0.98;
    p.opacity = 0.6 * (1 - p.life / p.maxLife);

    if (p.life >= p.maxLife || p.opacity <= 0) {
      particles.splice(i, 1);
      continue;
    }

    ctx.beginPath();
    ctx.globalAlpha = Math.max(p.opacity, 0);
    const gradient: CanvasGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
    gradient.addColorStop(0, `rgba(42, 26, 10, ${p.opacity})`);
    gradient.addColorStop(1, 'rgba(42, 26, 10, 0)');
    ctx.fillStyle = gradient;
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function hexToRgb(hex: string): string {
  const result: RegExpExecArray | null = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '42, 26, 10';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

export function redrawStatic(canvas: HTMLCanvasElement, period: string, options: RenderOptions): void {
  if (!animationState) {
    drawCalligraphy(canvas, period, options);
    return;
  }

  const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d');
  if (!ctx) return;

  const rect: DOMRect = canvas.getBoundingClientRect();
  setupCanvasResolution(canvas);
  clearCanvas(ctx, rect.width, rect.height);
  drawInkBackground(ctx, rect.width, rect.height, options);
  drawWriting(ctx, animationState.brushPaths, 1, options.theme);
  animationState.currentTheme = options.theme;
  animationState.currentSpeed = options.diffusionSpeed;
}
