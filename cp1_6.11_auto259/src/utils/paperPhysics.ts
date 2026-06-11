export interface TrajectoryPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface Fiber {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  opacity: number;
  width: number;
}

export interface WatermarkImpression {
  x: number;
  y: number;
  stampId: string;
  width: number;
  height: number;
  pixelData: Uint8ClampedArray;
}

export interface Bubble {
  id: string;
  x: number;
  y: number;
  size: number;
}

export interface RubbingPixel {
  x: number;
  y: number;
  grayscale: number;
}

export const calculatePulpConcentration = (
  pointCount: number,
  averageSpeed: number
): number => {
  const baseConcentration = 0.3;
  const speedFactor = Math.min(averageSpeed / 50, 1) * 0.35;
  const densityFactor = Math.min(pointCount / 200, 1) * 0.35;
  return Math.min(baseConcentration + speedFactor + densityFactor, 1);
};

export const calculatePaperThickness = (
  trajectory: TrajectoryPoint[]
): number => {
  if (trajectory.length < 2) return 1;

  let totalDistance = 0;
  let pathLength = 0;
  const start = trajectory[0];
  const end = trajectory[trajectory.length - 1];

  for (let i = 1; i < trajectory.length; i++) {
    const dx = trajectory[i].x - trajectory[i - 1].x;
    const dy = trajectory[i].y - trajectory[i - 1].y;
    pathLength += Math.sqrt(dx * dx + dy * dy);
  }

  totalDistance = Math.sqrt(
    Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
  );

  const weavingDensity = totalDistance > 0 ? pathLength / totalDistance : 0;
  const pointDensity = Math.min(trajectory.length / 150, 1);
  const baseThickness = 1 + weavingDensity * 2 + pointDensity * 2;

  return Math.round(Math.min(Math.max(baseThickness, 1), 5) * 10) / 10;
};

export const calculateAverageSpeed = (
  trajectory: TrajectoryPoint[]
): number => {
  if (trajectory.length < 2) return 0;

  let totalDistance = 0;
  let totalTime = 0;

  for (let i = 1; i < trajectory.length; i++) {
    const dx = trajectory[i].x - trajectory[i - 1].x;
    const dy = trajectory[i].y - trajectory[i - 1].y;
    totalDistance += Math.sqrt(dx * dx + dy * dy);
    totalTime += trajectory[i].timestamp - trajectory[i - 1].timestamp;
  }

  return totalTime > 0 ? (totalDistance / totalTime) * 1000 : 0;
};

export const generateFiberTexture = (
  width: number,
  height: number,
  count: number = 40
): Fiber[] => {
  const fibers: Fiber[] = [];

  for (let i = 0; i < count; i++) {
    const startX = Math.random() * width;
    const startY = Math.random() * height;
    const angle = Math.random() * Math.PI;
    const length = 50 + Math.random() * 150;
    const curvature = (Math.random() - 0.5) * 0.02;

    let endX = startX + Math.cos(angle) * length;
    let endY = startY + Math.sin(angle) * length;
    const midX = (startX + endX) / 2 + Math.sin(angle) * curvature * length;
    const midY = (startY + endY) / 2 - Math.cos(angle) * curvature * length;

    endX = midX + (endX - midX);
    endY = midY + (endY - midY);

    fibers.push({
      startX,
      startY,
      endX,
      endY,
      opacity: 0.05 + Math.random() * 0.15,
      width: 0.5 + Math.random() * 1.5
    });
  }

  return fibers;
};

export const getPulpColor = (concentration: number): string => {
  const r = Math.round(93 + (255 - 93) * concentration);
  const g = Math.round(64 + (248 - 64) * concentration);
  const b = Math.round(55 + (225 - 55) * concentration);
  return `rgb(${r}, ${g}, ${b})`;
};

export const applyWatermarkGrayscale = (
  baseData: Uint8ClampedArray,
  stampData: Uint8ClampedArray,
  offsetX: number,
  offsetY: number,
  canvasWidth: number,
  canvasHeight: number,
  stampWidth: number,
  stampHeight: number,
  featherRadius: number = 8,
  intensityRange: [number, number] = [0.2, 0.5]
): Uint8ClampedArray => {
  const result = new Uint8ClampedArray(baseData);
  const startTime = performance.now();

  for (let y = 0; y < stampHeight; y++) {
    for (let x = 0; x < stampWidth; x++) {
      const targetX = offsetX + x;
      const targetY = offsetY + y;

      if (targetX < 0 || targetX >= canvasWidth || targetY < 0 || targetY >= canvasHeight) {
        continue;
      }

      const stampIdx = (y * stampWidth + x) * 4;
      const stampAlpha = stampData[stampIdx + 3] / 255;

      if (stampAlpha < 0.01) continue;

      const distX = Math.min(x, stampWidth - 1 - x);
      const distY = Math.min(y, stampHeight - 1 - y);
      const distToEdge = Math.min(distX, distY);
      const featherFactor = Math.min(distToEdge / featherRadius, 1);
      const featheredAlpha = stampAlpha * featherFactor;

      const [minIntensity, maxIntensity] = intensityRange;
      const stampGray = (stampData[stampIdx] * 0.299 + stampData[stampIdx + 1] * 0.587 + stampData[stampIdx + 2] * 0.114) / 255;
      const intensity = minIntensity + (maxIntensity - minIntensity) * stampGray;
      const finalAlpha = featheredAlpha * intensity;

      const targetIdx = (targetY * canvasWidth + targetX) * 4;
      const baseGray = (result[targetIdx] * 0.299 + result[targetIdx + 1] * 0.587 + result[targetIdx + 2] * 0.114);

      const newGray = baseGray * (1 - finalAlpha) + (baseGray * (1 - intensity) * 0.6 + 80 * 0.4) * finalAlpha;

      result[targetIdx] = Math.round(newGray);
      result[targetIdx + 1] = Math.round(newGray);
      result[targetIdx + 2] = Math.round(newGray);
    }
  }

  const elapsed = performance.now() - startTime;
  if (elapsed > 5) {
    console.warn(`Watermark processing took ${elapsed.toFixed(2)}ms, exceeding 5ms budget`);
  }

  return result;
};

export const generateShrinkClipPath = (
  width: number,
  height: number,
  shrinkAmount: number = 3
): string => {
  const tl = shrinkAmount + Math.random() * shrinkAmount;
  const tr = shrinkAmount + Math.random() * shrinkAmount;
  const br = shrinkAmount + Math.random() * shrinkAmount;
  const bl = shrinkAmount + Math.random() * shrinkAmount;

  return `polygon(
    ${tl}px ${tl}px,
    calc(100% - ${tr}px) ${tl}px,
    calc(100% - ${br}px) calc(100% - ${br}px),
    ${bl}px calc(100% - ${bl}px)
  )`;
};

export const generateBubbles = (
  width: number,
  height: number
): Bubble[] => {
  const count = 8 + Math.floor(Math.random() * 5);
  const bubbles: Bubble[] = [];
  const usedPositions: { x: number; y: number }[] = [];

  for (let i = 0; i < count; i++) {
    let x: number, y: number;
    let attempts = 0;
    do {
      x = 20 + Math.random() * (width - 40);
      y = 20 + Math.random() * (height - 40);
      attempts++;
    } while (
      attempts < 50 &&
      usedPositions.some(p => Math.abs(p.x - x) < 30 && Math.abs(p.y - y) < 30)
    );

    usedPositions.push({ x, y });
    bubbles.push({
      id: `bubble-${i}-${Date.now()}`,
      x,
      y,
      size: 2 + Math.random() * 2
    });
  }

  return bubbles;
};

export const convertToRubbingEffect = (
  imageData: ImageData,
  threshold: number = 0.5
): ImageData => {
  const startTime = performance.now();
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const result = new Uint8ClampedArray(data);

  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const normalizedGray = gray / 255;

    if (normalizedGray < threshold) {
      result[i] = 26;
      result[i + 1] = 26;
      result[i + 2] = 26;
    } else {
      result[i] = 245;
      result[i + 1] = 245;
      result[i + 2] = 245;
    }
    result[i + 3] = 255;
  }

  const elapsed = performance.now() - startTime;
  if (elapsed > 10) {
    console.warn(`Rubbing conversion took ${elapsed.toFixed(2)}ms, exceeding 10ms budget`);
  }

  return new ImageData(result, width, height);
};

export const applyBrushStroke = (
  canvas: HTMLCanvasElement,
  centerX: number,
  centerY: number,
  toolType: 'soft' | 'hard' | 'sponge' | 'roller'
): { touchedPixels: number; totalPixels: number } => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { touchedPixels: 0, totalPixels: 0 };

  const brushSizes: Record<string, number> = {
    soft: 45,
    hard: 25,
    sponge: 60,
    roller: 80
  };

  const brushSize = brushSizes[toolType] || 40;
  const radius = brushSize / 2;

  let touchedPixels = 0;

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.clip();

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const startX = Math.max(0, Math.floor(centerX - radius));
  const endX = Math.min(canvas.width, Math.ceil(centerX + radius));
  const startY = Math.max(0, Math.floor(centerY - radius));
  const endY = Math.min(canvas.height, Math.ceil(centerY + radius));

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        const idx = (y * canvas.width + x) * 4;
        const falloff = 1 - (dist / radius);
        
        let effectStrength: number;
        switch (toolType) {
          case 'soft':
            effectStrength = falloff * 0.7;
            break;
          case 'hard':
            effectStrength = dist < radius * 0.8 ? 1 : (radius - dist) / (radius * 0.2);
            break;
          case 'sponge':
            const noise = Math.sin(x * 0.5 + y * 0.7) * Math.cos(x * 0.3 - y * 0.5);
            effectStrength = falloff * (0.4 + noise * 0.3 + Math.random() * 0.3);
            break;
          case 'roller':
            const lineEffect = Math.abs(Math.sin((x + y) * 0.08));
            effectStrength = falloff * (0.5 + lineEffect * 0.3);
            break;
          default:
            effectStrength = falloff;
        }

        const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
        const normalizedGray = gray / 255;
        const threshold = 0.5;

        let newR = data[idx];
        let newG = data[idx + 1];
        let newB = data[idx + 2];

        if (effectStrength >= 0.15) {
          if (normalizedGray < threshold) {
            const blend = effectStrength;
            newR = data[idx] * (1 - blend) + 26 * blend;
            newG = data[idx + 1] * (1 - blend) + 26 * blend;
            newB = data[idx + 2] * (1 - blend) + 26 * blend;
          } else {
            const blend = effectStrength;
            newR = data[idx] * (1 - blend) + 245 * blend;
            newG = data[idx + 1] * (1 - blend) + 245 * blend;
            newB = data[idx + 2] * (1 - blend) + 245 * blend;
          }

          if (data[idx + 3] === 0 || (data[idx] === 250 && data[idx + 1] === 240 && data[idx + 2] === 230)) {
            touchedPixels++;
          }

          data[idx] = Math.round(newR);
          data[idx + 1] = Math.round(newG);
          data[idx + 2] = Math.round(newB);
          data[idx + 3] = 255;
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  ctx.restore();

  const totalPixels = canvas.width * canvas.height;
  return { touchedPixels, totalPixels };
};

export const calculateRubbingProgress = (
  canvas: HTMLCanvasElement
): number => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  let processedPixels = 0;
  const totalPixels = canvas.width * canvas.height;

  for (let i = 0; i < data.length; i += 4) {
    const isBlack = data[i] <= 26 && data[i + 1] <= 26 && data[i + 2] <= 26;
    const isWhite = data[i] >= 245 && data[i + 1] >= 245 && data[i + 2] >= 245;
    
    if (isBlack || isWhite) {
      processedPixels++;
    }
  }

  return Math.min(Math.round((processedPixels / totalPixels) * 100), 100);
};
