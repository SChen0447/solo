export interface RenderParams {
  brushDetail: number;
  inkDensity: number;
  lineSpacingRatio: number;
}

export interface CharPosition {
  char: string;
  x: number;
  y: number;
  size: number;
  color: string;
  column: number;
  row: number;
}

export interface RenderProgress {
  current: number;
  total: number;
  percentage: number;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 800;
const RIGHT_MARGIN = 30;
const BASE_CHAR_SIZE = 48;
const BASE_CHAR_SPACING = 20;
const BASE_LINE_SPACING = 30;
const TOP_PADDING = 40;
const LEFT_PADDING = 30;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function addJitter(value: number, amount: number): number {
  return value + (Math.random() - 0.5) * amount * 2;
}

export function calculateLayout(
  text: string,
  params: RenderParams
): CharPosition[] {
  const chars = text.split('').filter((c) => c.trim() !== '');
  const positions: CharPosition[] = [];

  const charSpacing = BASE_CHAR_SPACING * params.lineSpacingRatio;
  const lineSpacing = BASE_LINE_SPACING * params.lineSpacingRatio;
  const charSize = BASE_CHAR_SIZE;

  const availableHeight = CANVAS_HEIGHT - TOP_PADDING * 2;
  const charsPerColumn = Math.floor(
    (availableHeight + charSpacing) / (charSize + charSpacing)
  );

  let column = 0;
  let row = 0;

  for (let i = 0; i < chars.length; i++) {
    if (row >= charsPerColumn) {
      row = 0;
      column++;
    }

    const x =
      CANVAS_WIDTH -
      RIGHT_MARGIN -
      column * (charSize + lineSpacing) -
      charSize / 2;
    const y = TOP_PADDING + row * (charSize + charSpacing) + charSize / 2;

    const colorT = Math.random();
    const color = lerpColor('#1A1A1A', '#4A3A2A', colorT);

    positions.push({
      char: chars[i],
      x,
      y,
      size: charSize,
      color,
      column,
      row,
    });

    row++;
  }

  return positions;
}

export function drawPaperTexture(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#FAF6EE';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 12;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    data[i + 3] = Math.floor(255 * 0.95);
  }

  ctx.putImageData(imageData, 0, 0);
}

export function drawCharWithInk(
  ctx: CanvasRenderingContext2D,
  pos: CharPosition,
  params: RenderParams,
  animationProgress: number
): void {
  const { char, x, y, size, color } = pos;

  ctx.save();

  const jitterAmount = (1 - params.brushDetail) * 4;
  const drawX = addJitter(x, jitterAmount);
  const drawY = addJitter(y, jitterAmount);

  const layers = Math.ceil(params.inkDensity * 3);
  for (let i = 0; i < layers; i++) {
    const alpha = (params.inkDensity / layers) * (1 - i * 0.2);
    const jx = addJitter(drawX, jitterAmount * 0.5);
    const jy = addJitter(drawY, jitterAmount * 0.5);

    ctx.globalAlpha = alpha * Math.min(1, animationProgress * 2);
    ctx.font = `${size}px 'Ma Shan Zheng', cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(char, jx, jy);
  }

  if (animationProgress > 0 && animationProgress <= 1) {
    const maxRadius = 12;
    const radius = maxRadius * animationProgress;
    const alpha = 0.6 * (1 - animationProgress);

    const rgb = hexToRgb(color);
    const gradient = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, radius);
    gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`);
    gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

    ctx.globalAlpha = 1;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(drawX, drawY, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export async function renderCalligraphy(
  ctx: CanvasRenderingContext2D,
  text: string,
  params: RenderParams,
  onProgress?: (progress: RenderProgress) => void
): Promise<CharPosition[]> {
  const positions = calculateLayout(text, params);
  const total = positions.length;

  drawPaperTexture(ctx);

  if (total === 0) return positions;

  const animationDuration = 1200;
  const delayBetween = 300;

  await new Promise<void>((resolve) => {
    const startTime = performance.now();
    let lastFrame = startTime;

    function animate(now: number) {
      const elapsed = now - startTime;
      let allDone = true;

      drawPaperTexture(ctx);

      positions.forEach((pos, index) => {
        const charStartTime = index * delayBetween;
        const charElapsed = elapsed - charStartTime;

        if (charElapsed >= 0) {
          const progress = Math.min(1, charElapsed / animationDuration);
          const easedProgress = 1 - Math.pow(1 - progress, 3);
          drawCharWithInk(ctx, pos, params, easedProgress);

          if (progress < 1) allDone = false;
        } else {
          allDone = false;
        }
      });

      const completedCount = positions.filter((_, i) => {
        const charStartTime = i * delayBetween;
        return elapsed - charStartTime >= animationDuration;
      }).length;

      onProgress?.({
        current: completedCount,
        total,
        percentage: Math.floor((completedCount / total) * 100),
      });

      if (allDone) {
        resolve();
      } else {
        requestAnimationFrame(animate);
      }

      lastFrame = now;
    }

    requestAnimationFrame(animate);
  });

  return positions;
}

export function renderStatic(
  ctx: CanvasRenderingContext2D,
  text: string,
  params: RenderParams
): CharPosition[] {
  const positions = calculateLayout(text, params);
  drawPaperTexture(ctx);

  positions.forEach((pos) => {
    drawCharWithInk(ctx, pos, params, 1);
  });

  return positions;
}

export function getCanvasSize(): { width: number; height: number } {
  return { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
}
