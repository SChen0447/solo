import { Butterfly, FlyingButterfly } from '../types';

export const drawButterfly = (
  ctx: CanvasRenderingContext2D,
  butterfly: FlyingButterfly,
  scale: number = 2
) => {
  const { x, y, wingSize, primaryColor, secondaryColor, accentColor,
    patternDensity, wingPhase, isHovering, antennaeWiggle, species } = butterfly;

  const baseWingWidth = 25 * wingSize * scale;
  const baseWingHeight = 35 * wingSize * scale;
  const wingFlap = Math.sin(wingPhase) * 0.4 + 0.6;

  ctx.save();
  ctx.translate(x, y);

  drawWing(ctx, -baseWingWidth * wingFlap, 0, baseWingWidth, baseWingHeight,
    primaryColor, secondaryColor, accentColor, patternDensity, true, species);

  drawWing(ctx, baseWingWidth * wingFlap, 0, baseWingWidth, baseWingHeight,
    primaryColor, secondaryColor, accentColor, patternDensity, false, species);

  drawBody(ctx, 0, 0, wingSize * scale, primaryColor);

  drawAntennae(ctx, 0, -baseWingHeight * 0.8, wingSize * scale, antennaeWiggle, isHovering, primaryColor);

  ctx.restore();
};

const drawWing = (
  ctx: CanvasRenderingContext2D,
  offsetX: number,
  offsetY: number,
  width: number,
  height: number,
  primaryColor: string,
  secondaryColor: string,
  accentColor: string,
  patternDensity: number,
  isLeft: boolean,
  species: string
) => {
  ctx.save();
  ctx.translate(offsetX, offsetY);
  if (!isLeft) {
    ctx.scale(-1, 1);
  }

  const topWingWidth = width * 0.9;
  const topWingHeight = height * 0.6;
  const bottomWingWidth = width * 0.7;
  const bottomWingHeight = height * 0.5;

  ctx.beginPath();
  ctx.moveTo(0, -topWingHeight * 0.3);
  ctx.bezierCurveTo(
    -topWingWidth * 0.3, -topWingHeight,
    -topWingWidth, -topWingHeight * 0.8,
    -topWingWidth * 0.8, -topWingHeight * 0.2
  );
  ctx.bezierCurveTo(
    -topWingWidth * 0.6, topWingHeight * 0.1,
    -bottomWingWidth * 0.7, bottomWingHeight * 0.2,
    -bottomWingWidth * 0.5, bottomWingHeight * 0.4
  );
  ctx.bezierCurveTo(
    -bottomWingWidth * 0.3, bottomWingHeight * 0.6,
    -bottomWingWidth * 0.1, bottomWingHeight * 0.5,
    0, bottomWingHeight * 0.3
  );
  ctx.closePath();

  const gradient = ctx.createLinearGradient(-width, -height * 0.5, 0, height * 0.3);
  gradient.addColorStop(0, primaryColor);
  gradient.addColorStop(0.7, shadeColor(primaryColor, -15));
  gradient.addColorStop(1, shadeColor(primaryColor, -30));
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.strokeStyle = shadeColor(primaryColor, -40);
  ctx.lineWidth = 0.5;
  ctx.stroke();

  drawWingPatterns(ctx, width, height, secondaryColor, accentColor, patternDensity, species);

  ctx.restore();
};

const drawWingPatterns = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  secondaryColor: string,
  accentColor: string,
  density: number,
  species: string
) => {
  const normalizedDensity = density / 100;

  if (species.includes('citrus') || species.includes('swallowtail')) {
    ctx.fillStyle = secondaryColor;
    for (let i = 0; i < Math.floor(5 * normalizedDensity); i++) {
      const spotX = -width * 0.2 - Math.random() * width * 0.5;
      const spotY = -height * 0.2 + Math.random() * height * 0.4;
      const spotSize = 3 + Math.random() * 5;
      ctx.beginPath();
      ctx.ellipse(spotX, spotY, spotSize, spotSize * 0.7, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(-width * 0.3, height * 0.3);
    ctx.bezierCurveTo(-width * 0.5, height * 0.5, -width * 0.6, height * 0.4, -width * 0.4, height * 0.55);
    ctx.lineTo(-width * 0.25, height * 0.45);
    ctx.closePath();
    ctx.fill();
  } else if (species.includes('golden') || species.includes('pansy')) {
    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < Math.floor(4 * normalizedDensity); i++) {
      const startX = -width * 0.1;
      const startY = -height * 0.3 - i * 8;
      const endX = -width * 0.7 - i * 3;
      const endY = -height * 0.1 - i * 5;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
    ctx.fillStyle = accentColor;
    for (let i = 0; i < Math.floor(6 * normalizedDensity); i++) {
      const spotX = -width * 0.3 - Math.random() * width * 0.4;
      const spotY = -height * 0.1 + Math.random() * height * 0.3;
      ctx.beginPath();
      ctx.arc(spotX, spotY, 2 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (species.includes('dead') || species.includes('leaf')) {
    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = 1;
    for (let i = 0; i < Math.floor(8 * normalizedDensity); i++) {
      const startX = -width * 0.1;
      const startY = -height * 0.4 + i * 6;
      const endX = -width * 0.6 - Math.random() * 20;
      const endY = -height * 0.2 + i * 5 + (Math.random() - 0.5) * 10;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(
        startX - 10, startY + 5,
        endX + 10, endY - 5,
        endX, endY
      );
      ctx.stroke();
    }
  } else if (species.includes('cabbage') || species.includes('white')) {
    ctx.fillStyle = secondaryColor;
    ctx.beginPath();
    ctx.moveTo(-width * 0.1, -height * 0.5);
    ctx.lineTo(-width * 0.6, -height * 0.45);
    ctx.lineTo(-width * 0.5, -height * 0.35);
    ctx.lineTo(-width * 0.15, -height * 0.38);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = accentColor;
    if (normalizedDensity > 0.3) {
      ctx.beginPath();
      ctx.arc(-width * 0.3, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (normalizedDensity > 0.6) {
      ctx.beginPath();
      ctx.arc(-width * 0.45, height * 0.1, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = secondaryColor;
    const spotCount = Math.floor(3 + normalizedDensity * 8);
    for (let i = 0; i < spotCount; i++) {
      const spotX = -width * 0.2 - Math.random() * width * 0.5;
      const spotY = -height * 0.3 + Math.random() * height * 0.5;
      const spotSize = 2 + Math.random() * 4;
      ctx.beginPath();
      ctx.arc(spotX, spotY, spotSize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = accentColor;
    for (let i = 0; i < Math.floor(spotCount * 0.5); i++) {
      const spotX = -width * 0.3 - Math.random() * width * 0.4;
      const spotY = -height * 0.2 + Math.random() * height * 0.4;
      ctx.beginPath();
      ctx.arc(spotX, spotY, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};

const drawBody = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) => {
  ctx.fillStyle = shadeColor(color, -30);
  ctx.beginPath();
  ctx.ellipse(x, y, 3 * size, 18 * size, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = shadeColor(color, -20);
  ctx.beginPath();
  ctx.ellipse(x, y - 15 * size, 2.5 * size, 5 * size, 0, 0, Math.PI * 2);
  ctx.fill();
};

const drawAntennae = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  wiggle: number,
  isHovering: boolean,
  color: string
) => {
  ctx.strokeStyle = shadeColor(color, -20);
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';

  const wiggleAmount = isHovering ? Math.sin(wiggle * 3) * 3 : 0;

  ctx.beginPath();
  ctx.moveTo(x - 2 * size, y);
  ctx.bezierCurveTo(
    x - 8 * size + wiggleAmount, y - 8 * size,
    x - 12 * size + wiggleAmount * 0.5, y - 15 * size,
    x - 10 * size, y - 20 * size
  );
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + 2 * size, y);
  ctx.bezierCurveTo(
    x + 8 * size - wiggleAmount, y - 8 * size,
    x + 12 * size - wiggleAmount * 0.5, y - 15 * size,
    x + 10 * size, y - 20 * size
  );
  ctx.stroke();

  ctx.fillStyle = shadeColor(color, -10);
  ctx.beginPath();
  ctx.arc(x - 10 * size, y - 20 * size, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 10 * size, y - 20 * size, 1.5, 0, Math.PI * 2);
  ctx.fill();
};

const shadeColor = (color: string, percent: number): string => {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (
    0x1000000 +
    (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)
  ).toString(16).slice(1);
};

export const drawButterflyThumbnail = (
  ctx: CanvasRenderingContext2D,
  butterfly: Butterfly,
  width: number,
  height: number
) => {
  const centerX = width / 2;
  const centerY = height / 2;
  const scale = Math.min(width, height) / 50;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(scale, scale);

  const wingWidth = 18 * butterfly.wingSize;
  const wingHeight = 28 * butterfly.wingSize;

  ctx.beginPath();
  ctx.moveTo(0, -wingHeight * 0.3);
  ctx.bezierCurveTo(-wingWidth * 0.3, -wingHeight, -wingWidth, -wingHeight * 0.8, -wingWidth * 0.8, -wingHeight * 0.2);
  ctx.bezierCurveTo(-wingWidth * 0.6, wingHeight * 0.1, -wingWidth * 0.7, wingHeight * 0.4, -wingWidth * 0.5, wingHeight * 0.5);
  ctx.bezierCurveTo(-wingWidth * 0.3, wingHeight * 0.6, -wingWidth * 0.1, wingHeight * 0.5, 0, wingHeight * 0.3);
  ctx.closePath();
  ctx.fillStyle = butterfly.primaryColor;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, -wingHeight * 0.3);
  ctx.bezierCurveTo(wingWidth * 0.3, -wingHeight, wingWidth, -wingHeight * 0.8, wingWidth * 0.8, -wingHeight * 0.2);
  ctx.bezierCurveTo(wingWidth * 0.6, wingHeight * 0.1, wingWidth * 0.7, wingHeight * 0.4, wingWidth * 0.5, wingHeight * 0.5);
  ctx.bezierCurveTo(wingWidth * 0.3, wingHeight * 0.6, wingWidth * 0.1, wingHeight * 0.5, 0, wingHeight * 0.3);
  ctx.closePath();
  ctx.fillStyle = butterfly.primaryColor;
  ctx.fill();

  const patternCount = Math.floor(butterfly.patternDensity / 20);
  ctx.fillStyle = butterfly.secondaryColor;
  for (let i = 0; i < patternCount; i++) {
    const offsetY = -wingHeight * 0.2 + i * 6;
    ctx.beginPath();
    ctx.ellipse(-wingWidth * 0.4, offsetY, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(wingWidth * 0.4, offsetY, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = shadeColor(butterfly.primaryColor, -30);
  ctx.beginPath();
  ctx.ellipse(0, 0, 2.5, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};
