export enum RuneType {
  FIRE = 'fire',
  WATER = 'water',
  WIND = 'wind',
  EARTH = 'earth',
}

export const RUNE_COLORS: Record<RuneType, string> = {
  [RuneType.FIRE]: '#ff4500',
  [RuneType.WATER]: '#00bfff',
  [RuneType.WIND]: '#dcdcdc',
  [RuneType.EARTH]: '#8b4513',
};

export const RUNE_ICONS: Record<RuneType, string> = {
  [RuneType.FIRE]: '\u{1F525}',
  [RuneType.WATER]: '\u{1F4A7}',
  [RuneType.WIND]: '\u{1F4A8}',
  [RuneType.EARTH]: '\u{1F31F}',
};

export const RUNE_SIZE = 60;

export function drawFireRune(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number = RUNE_SIZE): void {
  ctx.beginPath();
  const amplitude = size * 0.35;
  const waves = 5;
  const points = 40;
  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const x = cx - size * 0.6 + t * size * 1.2;
    const y = cy + Math.sin(t * Math.PI * waves) * amplitude * (1 - Math.abs(t - 0.5) * 1.2) +
              Math.sin(t * Math.PI * waves * 2 + 0.5) * amplitude * 0.3;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}

export function drawWaterRune(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number = RUNE_SIZE): void {
  ctx.beginPath();
  const amplitude = size * 0.3;
  const waves = 3;
  const points = 50;
  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const x = cx - size * 0.6 + t * size * 1.2;
    const phaseOffset = Math.sin(t * Math.PI * 0.8) * 0.5;
    const y = cy + Math.sin(t * Math.PI * waves + phaseOffset) * amplitude +
              Math.sin(t * Math.PI * waves * 1.7 + 1.2) * amplitude * 0.35;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}

export function drawWindRune(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number = RUNE_SIZE): void {
  ctx.beginPath();
  const turns = 2.5;
  const points = 60;
  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const angle = t * Math.PI * 2 * turns;
    const radius = t * size * 0.6;
    const x = cx + Math.cos(angle) * radius;
    const y = cy - size * 0.2 + Math.sin(angle) * radius - t * size * 0.4;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}

export function drawEarthRune(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number = RUNE_SIZE): void {
  ctx.beginPath();
  const r = size * 0.55;
  for (let i = 0; i <= 6; i++) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  const innerR = r * 0.5;
  for (let i = 0; i <= 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const x = cx + Math.cos(angle) * innerR;
    const y = cy + Math.sin(angle) * innerR;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.stroke();
}

export function drawRune(
  ctx: CanvasRenderingContext2D,
  type: RuneType,
  cx: number,
  cy: number,
  size: number = RUNE_SIZE,
  activated: boolean = false,
  flashTimer: number = 0
): void {
  const color = RUNE_COLORS[type];
  const baseAlpha = activated ? 1.0 : 0.55;
  const alpha = flashTimer > 0 ? baseAlpha + Math.sin(flashTimer * 20) * 0.3 : baseAlpha;
  const shadowBlur = activated ? (flashTimer > 0 ? 20 + Math.sin(flashTimer * 20) * 8 : 12) : 8;

  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.strokeStyle = color;
  ctx.lineWidth = activated ? 3 : 2;
  ctx.shadowColor = color;
  ctx.shadowBlur = shadowBlur;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (type) {
    case RuneType.FIRE:
      drawFireRune(ctx, cx, cy, size);
      break;
    case RuneType.WATER:
      drawWaterRune(ctx, cx, cy, size);
      break;
    case RuneType.WIND:
      drawWindRune(ctx, cx, cy, size);
      break;
    case RuneType.EARTH:
      drawEarthRune(ctx, cx, cy, size);
      break;
  }
  ctx.restore();

  ctx.save();
  ctx.font = `${size * 0.5}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = activated ? 1 : 0.7;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(RUNE_ICONS[type], cx, cy);
  ctx.restore();
}

export function generateTemplatePoints(type: RuneType, sampleCount: number = 48): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const cx = 100;
  const cy = 100;
  const size = 80;

  switch (type) {
    case RuneType.FIRE: {
      const amplitude = size * 0.35;
      const waves = 5;
      for (let i = 0; i < sampleCount; i++) {
        const t = i / (sampleCount - 1);
        const x = cx - size * 0.6 + t * size * 1.2;
        const y = cy + Math.sin(t * Math.PI * waves) * amplitude * (1 - Math.abs(t - 0.5) * 1.2) +
                  Math.sin(t * Math.PI * waves * 2 + 0.5) * amplitude * 0.3;
        points.push({ x, y });
      }
      break;
    }
    case RuneType.WATER: {
      const amplitude = size * 0.3;
      const waves = 3;
      for (let i = 0; i < sampleCount; i++) {
        const t = i / (sampleCount - 1);
        const x = cx - size * 0.6 + t * size * 1.2;
        const phaseOffset = Math.sin(t * Math.PI * 0.8) * 0.5;
        const y = cy + Math.sin(t * Math.PI * waves + phaseOffset) * amplitude +
                  Math.sin(t * Math.PI * waves * 1.7 + 1.2) * amplitude * 0.35;
        points.push({ x, y });
      }
      break;
    }
    case RuneType.WIND: {
      const turns = 2.5;
      for (let i = 0; i < sampleCount; i++) {
        const t = i / (sampleCount - 1);
        const angle = t * Math.PI * 2 * turns;
        const radius = t * size * 0.6;
        const x = cx + Math.cos(angle) * radius;
        const y = cy - size * 0.2 + Math.sin(angle) * radius - t * size * 0.4;
        points.push({ x, y });
      }
      break;
    }
    case RuneType.EARTH: {
      const r = size * 0.55;
      const totalPoints = sampleCount;
      for (let i = 0; i < totalPoints; i++) {
        const t = i / (totalPoints - 1);
        const angle = (t * 7 / 6) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        points.push({ x, y });
      }
      break;
    }
  }

  return points;
}
