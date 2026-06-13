export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface AromaSystem {
  particles: Particle[];
  active: boolean;
}

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  speed: number;
}

export type PaintingStyle = 'mountains' | 'bamboo' | 'clouds' | 'stream' | 'birds' | 'stars';

export const PAINTING_STYLES: PaintingStyle[] = ['mountains', 'bamboo', 'clouds', 'stream', 'birds', 'stars'];

export const PAINTING_POEMS: Record<PaintingStyle, string> = {
  mountains: '青山隐隐水迢迢，秋尽江南草未凋',
  bamboo: '独坐幽篁里，弹琴复长啸',
  clouds: '行到水穷处，坐看云起时',
  stream: '明月松间照，清泉石上流',
  birds: '两个黄鹂鸣翠柳，一行白鹭上青天',
  stars: '危楼高百尺，手可摘星辰',
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 200, g: 200, b: 200 };
}

function mixColors(color1: string, color2: string, ratio: number = 0.5): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r * ratio + c2.r * (1 - ratio));
  const g = Math.round(c1.g * ratio + c2.g * (1 - ratio));
  const b = Math.round(c1.b * ratio + c2.b * (1 - ratio));
  return `rgb(${r}, ${g}, ${b})`;
}

export function createAromaParticles(
  startX: number,
  startY: number,
  teaColor: string,
  spiceColors: string[]
): AromaSystem {
  const particles: Particle[] = [];
  const count = 50 + Math.floor(Math.random() * 31);

  let baseColor = teaColor;
  if (spiceColors.length > 0) {
    const spiceMix = spiceColors.reduce((acc, c, i) => {
      return mixColors(acc, c, 1 / (i + 2));
    }, spiceColors[0]);
    baseColor = mixColors(teaColor, spiceMix, 0.6);
  }

  for (let i = 0; i < count; i++) {
    particles.push({
      x: startX + (Math.random() - 0.5) * 20,
      y: startY,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -0.5 - Math.random() * 1,
      size: 3 + Math.random() * 5,
      opacity: 0.4 + Math.random() * 0.3,
      life: 0,
      maxLife: 2 + Math.random(),
      color: baseColor,
    });
  }

  return { particles, active: true };
}

export function updateAromaParticles(system: AromaSystem, deltaTime: number): boolean {
  let hasActive = false;
  for (const p of system.particles) {
    p.life += deltaTime;
    if (p.life < p.maxLife) {
      hasActive = true;
      p.x += p.vx + Math.sin(p.life * 2) * 0.2;
      p.y += p.vy;
      p.vy *= 0.99;
      p.opacity = Math.max(0, 0.5 * (1 - p.life / p.maxLife));
      p.size *= 1.005;
    }
  }
  system.active = hasActive;
  return hasActive;
}

export function drawAromaParticles(ctx: CanvasRenderingContext2D, system: AromaSystem) {
  for (const p of system.particles) {
    if (p.life < p.maxLife) {
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

export function createRipple(x: number, y: number, maxRadius: number = 60): Ripple {
  return {
    x,
    y,
    radius: 2,
    maxRadius,
    opacity: 0.3,
    speed: 20,
  };
}

export function updateRipple(ripple: Ripple, deltaTime: number): boolean {
  ripple.radius += ripple.speed * deltaTime;
  ripple.opacity = 0.3 * (1 - ripple.radius / ripple.maxRadius);
  return ripple.radius < ripple.maxRadius;
}

export function drawRipple(ctx: CanvasRenderingContext2D, ripple: Ripple, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = Math.max(0, ripple.opacity);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawInkPainting(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  style: PaintingStyle,
  time: number
) {
  ctx.save();
  ctx.fillStyle = '#f5f0e8';
  ctx.fillRect(0, 0, width, height);

  switch (style) {
    case 'mountains':
      drawMountains(ctx, width, height, time);
      break;
    case 'bamboo':
      drawBamboo(ctx, width, height, time);
      break;
    case 'clouds':
      drawClouds(ctx, width, height, time);
      break;
    case 'stream':
      drawStream(ctx, width, height, time);
      break;
    case 'birds':
      drawBirds(ctx, width, height, time);
      break;
    case 'stars':
      drawStars(ctx, width, height, time);
      break;
  }

  ctx.restore();
}

function drawMountains(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  const layers = [
    { y: h * 0.3, color: 'rgba(60, 60, 80, 0.3)', speed: 0.0005 },
    { y: h * 0.45, color: 'rgba(80, 80, 100, 0.5)', speed: 0.001 },
    { y: h * 0.6, color: 'rgba(100, 100, 120, 0.7)', speed: 0.0015 },
  ];

  layers.forEach((layer, idx) => {
    ctx.fillStyle = layer.color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    const peaks = 5 + idx;
    for (let i = 0; i <= peaks; i++) {
      const x = w * (i / peaks);
      const peakHeight = h * (0.2 + Math.sin(time * layer.speed + i + idx) * 0.3);
      const y = layer.y - peakHeight;
      if (i === 0) {
        ctx.lineTo(x, y);
      } else {
        const prevX = w * ((i - 1) / peaks);
        ctx.quadraticCurveTo(prevX + w * 0.05, y - h * 0.05, x, y);
      }
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  });

  ctx.fillStyle = 'rgba(200, 200, 200, 0.4)';
  for (let i = 0; i < 3; i++) {
    const mistY = h * 0.35 + i * h * 0.1;
    const mistOffset = Math.sin(time * 0.0008 + i) * 20;
    ctx.beginPath();
    ctx.ellipse(w * 0.3 + mistOffset, mistY, w * 0.4, h * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBamboo(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  const bambooCount = 7;
  for (let i = 0; i < bambooCount; i++) {
    const x = w * (0.1 + (i / bambooCount) * 0.8 + Math.sin(time * 0.001 + i) * 5 / w);
    const stalkHeight = h * (0.6 + (Math.sin(i * 1.5) * 0.5 + 0.5) * 0.3);

    ctx.strokeStyle = `rgba(70, 100, 60, ${0.5 + i * 0.05})`;
    ctx.lineWidth = 4 + i * 0.5;
    ctx.lineCap = 'round';

    const sway = Math.sin(time * 0.002 + i * 0.5) * 8;

    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.quadraticCurveTo(x + sway * 0.5, h / 2, x + sway, h - stalkHeight);
    ctx.stroke();

    for (let j = 1; j < 5; j++) {
      const nodeY = h - (stalkHeight * j) / 5;
      const nodeX = x + sway * (j / 5);
      ctx.strokeStyle = 'rgba(50, 80, 40, 0.6)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(nodeX - 5, nodeY);
      ctx.lineTo(nodeX + 5, nodeY);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(100, 140, 80, 0.6)';
    for (let k = 0; k < 3; k++) {
      const leafY = h - stalkHeight * 0.3 - k * stalkHeight * 0.15;
      const leafX = x + sway * (0.5 + k * 0.15);
      const dir = k % 2 === 0 ? 1 : -1;
      const angle = k % 2 === 0 ? 0.3 : -0.3;
      ctx.beginPath();
      ctx.ellipse(leafX + 15 * dir, leafY, 20, 4, angle, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawClouds(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  ctx.fillStyle = 'rgba(200, 200, 220, 0.6)';

  const cloudCount = 5;
  for (let i = 0; i < cloudCount; i++) {
    const baseX = ((time * 0.02 + i * w / cloudCount) % (w + 200)) - 100;
    const y = h * (0.2 + i * 0.12);
    const size = 30 + i * 10;

    ctx.beginPath();
    ctx.arc(baseX, y, size, 0, Math.PI * 2);
    ctx.arc(baseX + size * 0.7, y - size * 0.2, size * 0.8, 0, Math.PI * 2);
    ctx.arc(baseX + size * 1.3, y, size * 0.9, 0, Math.PI * 2);
    ctx.arc(baseX + size * 0.5, y + size * 0.3, size * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(150, 150, 170, 0.3)';
  for (let i = 0; i < 8; i++) {
    const x = ((time * 0.05 + i * 200) % (w + 300)) - 150;
    const y = h * (0.5 + Math.sin(time * 0.001 + i) * 0.3);
    ctx.beginPath();
    ctx.ellipse(x, y, 80, 15, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStream(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  ctx.fillStyle = 'rgba(180, 200, 220, 0.4)';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.7);
  for (let x = 0; x <= w; x += 10) {
    const y = h * 0.7 + Math.sin(x * 0.02 + time * 0.003) * 10;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const startX = ((time * 0.05 + i * 200) % w);
    const y = h * 0.75 + Math.sin(startX * 0.02 + time * 0.003) * 10;
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(startX + 30, y);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(100, 100, 120, 0.6)';
  const rockPositions = [0.15, 0.35, 0.55, 0.75, 0.9];
  rockPositions.forEach((pos, i) => {
    const rx = w * pos;
    const ry = h * 0.8 + Math.sin(time * 0.002 + i) * 5;
    ctx.beginPath();
    ctx.ellipse(rx, ry, 15 + i * 3, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = 'rgba(80, 100, 70, 0.5)';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.7);
  ctx.lineTo(w * 0.2, h * 0.3);
  ctx.lineTo(w * 0.4, h * 0.5);
  ctx.lineTo(w * 0.6, h * 0.25);
  ctx.lineTo(w * 0.8, h * 0.45);
  ctx.lineTo(w, h * 0.35);
  ctx.lineTo(w, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
}

function drawBirds(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  const birdGroups = 3;
  for (let g = 0; g < birdGroups; g++) {
    const groupX = ((time * 0.03 + g * w / 2) % (w + 100)) - 50;
    const groupY = h * (0.2 + g * 0.15) + Math.sin(time * 0.002 + g) * 10;

    for (let b = 0; b < 4 + g; b++) {
      const bx = groupX + b * 25;
      const by = groupY + Math.sin(b + time * 0.005) * 8;
      const wingPhase = (time * 0.01 + b) % (Math.PI * 2);
      const wingSpread = 8 + Math.sin(wingPhase) * 4;

      ctx.strokeStyle = 'rgba(50, 50, 60, 0.7)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(bx - wingSpread, by);
      ctx.quadraticCurveTo(bx, by - 5, bx + wingSpread, by);
      ctx.stroke();
    }
  }

  ctx.fillStyle = 'rgba(180, 180, 200, 0.3)';
  for (let i = 0; i < 4; i++) {
    const x = w * (0.1 + i * 0.25);
    const y = h * (0.6 + Math.sin(time * 0.001 + i) * 0.1);
    ctx.beginPath();
    ctx.arc(x, y, 40 + i * 10, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStars(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, w, h);

  const starCount = 60;
  for (let i = 0; i < starCount; i++) {
    const x = (i * 37) % w;
    const y = (i * 53) % (h * 0.7);
    const twinkle = Math.sin(time * 0.003 + i) * 0.5 + 0.5;
    const size = 1 + (i % 3) * 0.5;

    ctx.fillStyle = `rgba(255, 255, 230, ${0.3 + twinkle * 0.7})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    if (i % 5 === 0) {
      ctx.strokeStyle = `rgba(255, 255, 200, ${0.2 + twinkle * 0.3})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x - size * 2, y);
      ctx.lineTo(x + size * 2, y);
      ctx.moveTo(x, y - size * 2);
      ctx.lineTo(x, y + size * 2);
      ctx.stroke();
    }
  }

  ctx.fillStyle = 'rgba(255, 250, 200, 0.9)';
  ctx.beginPath();
  ctx.arc(w * 0.75, h * 0.15, 15, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.arc(w * 0.75 + 5, h * 0.13, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(40, 40, 60, 0.8)';
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w * 0.2, h * 0.7);
  ctx.lineTo(w * 0.4, h * 0.8);
  ctx.lineTo(w * 0.6, h * 0.65);
  ctx.lineTo(w * 0.8, h * 0.75);
  ctx.lineTo(w, h * 0.6);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

export function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export const SPICE_COLORS: Record<string, string> = {
  mint: '#4caf50',
  cinnamon: '#ff8f00',
  rose: '#f48fb1',
  ginger: '#ff6f00',
  lemon: '#ffee58',
  honey: '#ffd54f',
};

export const TEA_COLORS: Record<string, string> = {
  green: '#8bc34a',
  black: '#d84315',
  flower: '#e91e63',
};
