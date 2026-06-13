export interface PixelData {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function generateMonetSunset(canvas: HTMLCanvasElement, width: number, height: number): void {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const horizonY = height * 0.42;

  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGrad.addColorStop(0, '#1a0a2e');
  skyGrad.addColorStop(0.15, '#2d1b4e');
  skyGrad.addColorStop(0.35, '#6b2f5f');
  skyGrad.addColorStop(0.55, '#c44e3d');
  skyGrad.addColorStop(0.75, '#e87d30');
  skyGrad.addColorStop(0.9, '#f4a935');
  skyGrad.addColorStop(1, '#fcd777');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, horizonY + 2);

  const waterGrad = ctx.createLinearGradient(0, horizonY, 0, height);
  waterGrad.addColorStop(0, '#fcd777');
  waterGrad.addColorStop(0.08, '#d4944a');
  waterGrad.addColorStop(0.2, '#6a7fa8');
  waterGrad.addColorStop(0.45, '#3a5a8a');
  waterGrad.addColorStop(0.7, '#1e3a6a');
  waterGrad.addColorStop(1, '#0a1a3a');
  ctx.fillStyle = waterGrad;
  ctx.fillRect(0, horizonY, width, height - horizonY);

  const sunX = width * 0.52;
  const sunY = horizonY - height * 0.04;
  const sunR = Math.max(1, height * 0.045);

  const glowR = sunR * 6;
  const sunGlow = ctx.createRadialGradient(sunX, sunY, sunR * 0.5, sunX, sunY, glowR);
  sunGlow.addColorStop(0, 'rgba(255, 250, 220, 0.9)');
  sunGlow.addColorStop(0.15, 'rgba(255, 220, 120, 0.6)');
  sunGlow.addColorStop(0.35, 'rgba(255, 170, 60, 0.3)');
  sunGlow.addColorStop(0.6, 'rgba(230, 100, 40, 0.12)');
  sunGlow.addColorStop(1, 'rgba(200, 60, 30, 0)');
  ctx.fillStyle = sunGlow;
  ctx.fillRect(0, 0, width, height);

  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  const sunFill = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
  sunFill.addColorStop(0, '#fffbe8');
  sunFill.addColorStop(0.6, '#ffe580');
  sunFill.addColorStop(1, '#f4a935');
  ctx.fillStyle = sunFill;
  ctx.fill();

  const waterSunY = horizonY + height * 0.06;
  let rng = 42;
  function nextRng(): number {
    rng = (rng * 16807 + 0) % 2147483647;
    return rng / 2147483647;
  }

  for (let i = 0; i < 40; i++) {
    const ry = waterSunY + i * (height * 0.012);
    if (ry > height) break;
    const rw = sunR * (1.5 + i * 0.25) + (nextRng() - 0.5) * sunR * 0.5;
    const rx = sunX + (nextRng() - 0.5) * sunR * 0.3;
    const alpha = 0.25 * (1 - i / 40);
    ctx.fillStyle = `rgba(255, 230, 140, ${alpha})`;
    ctx.fillRect(rx - rw / 2, ry, rw, Math.max(1, height * 0.006));
  }

  for (let i = 0; i < 6000; i++) {
    const bx = nextRng() * width;
    const by = nextRng() * height;
    const bw = 3 + nextRng() * 12;
    const bh = 1.5 + nextRng() * 5;
    const angle = by < horizonY ? (nextRng() - 0.5) * 0.3 : (nextRng() - 0.5) * 0.08;

    let r: number, g: number, b: number;
    const t = by / height;

    if (by < horizonY) {
      if (t < 0.15) {
        r = lerp(26, 45, nextRng()); g = lerp(10, 27, nextRng()); b = lerp(46, 78, nextRng());
      } else if (t < 0.3) {
        r = lerp(107, 196, nextRng()); g = lerp(47, 78, nextRng()); b = lerp(95, 95, nextRng());
      } else if (t < 0.4) {
        r = lerp(196, 232, nextRng()); g = lerp(78, 125, nextRng()); b = lerp(61, 48, nextRng());
      } else {
        r = lerp(232, 244, nextRng()); g = lerp(125, 169, nextRng()); b = lerp(48, 53, nextRng());
      }
    } else {
      const wt = (by - horizonY) / (height - horizonY);
      if (wt < 0.15) {
        r = lerp(244, 212, nextRng()); g = lerp(169, 148, nextRng()); b = lerp(53, 74, nextRng());
      } else if (wt < 0.4) {
        r = lerp(106, 58, nextRng()); g = lerp(127, 90, nextRng()); b = lerp(168, 138, nextRng());
      } else {
        r = lerp(58, 10, nextRng()); g = lerp(90, 26, nextRng()); b = lerp(138, 58, nextRng());
      }
    }

    const variation = 30;
    r = clamp(r + (nextRng() - 0.5) * variation, 0, 255);
    g = clamp(g + (nextRng() - 0.5) * variation, 0, 255);
    b = clamp(b + (nextRng() - 0.5) * variation, 0, 255);

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.3 + nextRng() * 0.4;
    ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
    ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  for (let i = 0; i < 8; i++) {
    const cx = width * (0.08 + nextRng() * 0.84);
    const cy = horizonY * (0.1 + nextRng() * 0.7);
    const cw = 30 + nextRng() * 80;
    const ch = 8 + nextRng() * 20;
    ctx.globalAlpha = 0.12 + nextRng() * 0.15;
    const cloudR = 180 + nextRng() * 60;
    const cloudG = 100 + nextRng() * 80;
    const cloudB = 60 + nextRng() * 40;
    ctx.fillStyle = `rgb(${cloudR | 0},${cloudG | 0},${cloudB | 0})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw / 2, ch / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function extractPixels(canvas: HTMLCanvasElement, particleCount: number): PixelData[] {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  const step = Math.sqrt((width * height) / particleCount);
  const result: PixelData[] = [];

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const px = Math.min(Math.round(x), width - 1);
      const py = Math.min(Math.round(y), height - 1);
      const idx = (py * width + px) * 4;
      result.push({
        x: px,
        y: py,
        r: pixels[idx],
        g: pixels[idx + 1],
        b: pixels[idx + 2],
      });
    }
  }

  return result.slice(0, particleCount);
}
