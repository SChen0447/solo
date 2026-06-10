export type AlgorithmType = 'flowCurves' | 'fractalTree' | 'ringArray' | 'randomScatter' | 'waveLines' | 'moirePattern';
export type ParamKey = 'density' | 'lineWidth' | 'rotationSpeed' | 'colorOffset';

export interface RenderParams {
  density: number;
  lineWidth: number;
  rotationSpeed: number;
  colorOffset: number;
}

export interface ColorTheme {
  name: string;
  primary: [string, string];
  accents: [string, string, string];
  background: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    name: '霓虹深空',
    primary: ['#ff00ff', '#00ffff'],
    accents: ['#ff6b9d', '#7b2cbf', '#3a0ca3'],
    background: '#0a0a1f'
  },
  {
    name: '暖阳秋叶',
    primary: ['#ff6b35', '#f7c59f'],
    accents: ['#efa00b', '#d65108', '#591f0a'],
    background: '#1a0f00'
  },
  {
    name: '冷冽冰川',
    primary: ['#a8dadc', '#457b9d'],
    accents: ['#1d3557', '#f1faee', '#e63946'],
    background: '#0a1628'
  },
  {
    name: '赛博朋克',
    primary: ['#f72585', '#7209b7'],
    accents: ['#3a0ca3', '#4361ee', '#4cc9f0'],
    background: '#0d0221'
  },
  {
    name: '极光幻彩',
    primary: ['#06d6a0', '#118ab2'],
    accents: ['#073b4c', '#ffd166', '#ef476f'],
    background: '#021b2e'
  },
  {
    name: '复古胶片',
    primary: ['#d4a574', '#c9b79c'],
    accents: ['#7d5a50', '#8c1c13', '#2d0806'],
    background: '#1a1410'
  }
];

export const ALGORITHM_LABELS: Record<AlgorithmType, string> = {
  flowCurves: '流动曲线',
  fractalTree: '分形树',
  ringArray: '圆环阵列',
  randomScatter: '随机散点',
  waveLines: '波形线条',
  moirePattern: '莫尔条纹'
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.replace('#', '').match(/.{1,2}/g)!;
  return { r: parseInt(m[0], 16), g: parseInt(m[1], 16), b: parseInt(m[2], 16) };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('');
}

function lerpColor(c1: string, c2: string, t: number): string {
  const a = hexToRgb(c1), b = hexToRgb(c2);
  return rgbToHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.l + (b.l - a.l) * t);
}

function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { r: r * 255, g: g * 255, b: b * 255 };
}

function hslToHex(h: number, s: number, l: number): string {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

function offsetColor(hex: string, offset: number): string {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  hsl.h = (hsl.h + offset) % 360;
  if (hsl.h < 0) hsl.h += 360;
  return hslToHex(hsl.h, hsl.s, hsl.l);
}

class PerlinNoise {
  private perm: number[] = [];
  constructor(seed = Math.random() * 10000) {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = Math.floor((s / 2147483647) * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    this.perm = p.concat(p);
  }
  private fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10); }
  private lerp(a: number, b: number, t: number) { return a + t * (b - a); }
  private grad(hash: number, x: number, y: number) {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
  noise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const A = this.perm[X] + Y, AA = this.perm[A], AB = this.perm[A + 1];
    const B = this.perm[X + 1] + Y, BA = this.perm[B], BB = this.perm[B + 1];
    return this.lerp(
      this.lerp(this.grad(this.perm[AA], x, y), this.grad(this.perm[BA], x - 1, y), u),
      this.lerp(this.grad(this.perm[AB], x, y - 1), this.grad(this.perm[BB], x - 1, y - 1), u),
      v
    );
  }
}

export class ArtGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dpr = 1;

  private params: RenderParams = {
    density: 0.5,
    lineWidth: 3,
    rotationSpeed: 1,
    colorOffset: 0
  };

  private algorithm: AlgorithmType = 'flowCurves';
  private theme: ColorTheme = COLOR_THEMES[0];
  private currentTheme: ColorTheme;
  private targetTheme: ColorTheme;
  private themeTransitionProgress = 1;

  private mousePos: { x: number; y: number } | null = null;
  private particles: Particle[] = [];
  private particlePool: Particle[] = [];

  private time = 0;
  private noise: PerlinNoise;
  private treeSeed = 12345;

  private prevBuffer: HTMLCanvasElement;
  private currBuffer: HTMLCanvasElement;
  private prevCtx: CanvasRenderingContext2D;
  private currCtx: CanvasRenderingContext2D;
  private transitionProgress = 1;
  private transitioningFrom: AlgorithmType | null = null;

  private svgCommands: string[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.resize();

    this.prevBuffer = document.createElement('canvas');
    this.currBuffer = document.createElement('canvas');
    this.prevCtx = this.prevBuffer.getContext('2d')!;
    this.currCtx = this.currBuffer.getContext('2d')!;

    this.noise = new PerlinNoise();
    this.currentTheme = JSON.parse(JSON.stringify(this.theme));
    this.targetTheme = JSON.parse(JSON.stringify(this.theme));
    this.resizeBuffers();
  }

  resize(): void {
    this.width = this.canvas.clientWidth || window.innerWidth;
    this.height = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.resizeBuffers();
  }

  private resizeBuffers(): void {
    [this.prevBuffer, this.currBuffer].forEach(c => {
      c.width = this.width * this.dpr;
      c.height = this.height * this.dpr;
    });
    this.prevCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.currCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  generateArt(): void {
    this.noise = new PerlinNoise(Math.random() * 10000);
    this.treeSeed = Math.floor(Math.random() * 100000);
  }

  resetArt(): void {
    this.generateArt();
  }

  setAlgorithm(algo: AlgorithmType): void {
    if (algo === this.algorithm && this.transitionProgress === 1) return;
    this.transitioningFrom = this.algorithm;
    this.transitionProgress = 0;
    this.renderToBuffer(this.prevCtx, this.transitioningFrom);
    this.algorithm = algo;
  }

  setParam(key: ParamKey, value: number): void {
    this.params[key] = value;
  }

  getParams(): RenderParams {
    return { ...this.params };
  }

  setColorTheme(theme: ColorTheme): void {
    this.theme = theme;
    this.targetTheme = JSON.parse(JSON.stringify(theme));
    this.themeTransitionProgress = 0;
  }

  getCurrentTheme(): ColorTheme {
    return this.theme;
  }

  setCustomColors(primary1: string, primary2: string, bg: string): void {
    const newTheme: ColorTheme = {
      name: 'custom',
      primary: [primary1, primary2],
      accents: this.theme.accents,
      background: bg
    };
    this.setColorTheme(newTheme);
  }

  setMouse(pos: { x: number; y: number } | null): void {
    this.mousePos = pos;
  }

  emitParticles(x: number, y: number): void {
    const allColors = [...this.currentTheme.primary, ...this.currentTheme.accents];
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      const p = this.particlePool.pop() || ({} as Particle);
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.size = 5 + Math.random() * 10;
      p.color = allColors[Math.floor(Math.random() * allColors.length)];
      p.maxLife = 30;
      p.life = 30;
      this.particles.push(p);
    }
  }

  private applyMouseDistortion(px: number, py: number): { x: number; y: number } {
    if (!this.mousePos) return { x: px, y: py };
    const dx = px - this.mousePos.x;
    const dy = py - this.mousePos.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 50 && d > 0) {
      const factor = (50 - d) * 0.6;
      return { x: px + (dx / d) * factor, y: py + (dy / d) * factor };
    }
    return { x: px, y: py };
  }

  private getColor(i: number, total: number): string {
    const allColors = [...this.currentTheme.primary, ...this.currentTheme.accents];
    const idx = Math.floor((i / total) * allColors.length) % allColors.length;
    return offsetColor(allColors[idx], this.params.colorOffset);
  }

  private lerpTheme(): void {
    if (this.themeTransitionProgress >= 1) return;
    this.themeTransitionProgress = Math.min(1, this.themeTransitionProgress + 1 / 60);
    const t = this.themeTransitionProgress;
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    this.currentTheme = {
      name: this.targetTheme.name,
      primary: [
        lerpColor(this.theme.primary[0], this.targetTheme.primary[0], ease),
        lerpColor(this.theme.primary[1], this.targetTheme.primary[1], ease)
      ],
      accents: [
        lerpColor(this.theme.accents[0], this.targetTheme.accents[0], ease),
        lerpColor(this.theme.accents[1], this.targetTheme.accents[1], ease),
        lerpColor(this.theme.accents[2], this.targetTheme.accents[2], ease)
      ],
      background: lerpColor(this.theme.background, this.targetTheme.background, ease)
    };
  }

  private clearBackground(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = this.currentTheme.background;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private renderFlowCurves(ctx: CanvasRenderingContext2D): void {
    const { density, lineWidth, rotationSpeed } = this.params;
    const cols = Math.floor(20 + density * 60);
    const rows = Math.floor(20 + density * 60);
    const stepX = this.width / cols;
    const stepY = this.height / rows;
    const t = this.time * 0.005;
    const rot = rotationSpeed * 0.01;

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const sx = i * stepX + stepX / 2;
        const sy = j * stepY + stepY / 2;
        const n = this.noise.noise(sx * 0.005 + t, sy * 0.005 + t);
        const angle = n * Math.PI * 4 + rot * this.time;
        const len = stepX * (0.4 + density * 0.8);

        ctx.beginPath();
        ctx.strokeStyle = this.getColor(i + j, cols + rows);
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.7;

        let px = sx, py = sy;
        const { x: sx0, y: sy0 } = this.applyMouseDistortion(px, py);
        ctx.moveTo(sx0, sy0);

        for (let k = 0; k < 5; k++) {
          const lt = k / 5;
          const nx = sx + Math.cos(angle + lt * Math.PI) * len * lt;
          const ny = sy + Math.sin(angle + lt * Math.PI) * len * lt;
          const { x, y } = this.applyMouseDistortion(nx, ny);
          ctx.lineTo(x, y);
          px = nx; py = ny;
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  private renderFractalTree(ctx: CanvasRenderingContext2D): void {
    const { density, lineWidth, rotationSpeed, colorOffset } = this.params;
    const cx = this.width / 2;
    const cy = this.height * 0.9;
    const maxDepth = Math.floor(5 + density * 7);
    const branchLen = Math.min(this.width, this.height) * 0.12;
    const baseAngle = -Math.PI / 2 + rotationSpeed * this.time * 0.01;
    let seed = this.treeSeed;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };

    const drawBranch = (x: number, y: number, angle: number, depth: number, len: number) => {
      if (depth <= 0 || len < 2) return;
      const ex = x + Math.cos(angle) * len;
      const ey = y + Math.sin(angle) * len;
      const { x: x0, y: y0 } = this.applyMouseDistortion(x, y);
      const { x: x1, y: y1 } = this.applyMouseDistortion(ex, ey);

      ctx.beginPath();
      const hue = (depth * 30 + colorOffset) % 360;
      ctx.strokeStyle = `hsl(${hue}, 70%, ${40 + depth * 4}%)`;
      ctx.lineWidth = Math.max(0.5, lineWidth * (depth / maxDepth) * 1.5);
      ctx.lineCap = 'round';
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();

      const spread = 0.3 + density * 0.5;
      const leftAng = angle - spread - rand() * 0.2;
      const rightAng = angle + spread + rand() * 0.2;
      const shrink = 0.65 + rand() * 0.15;
      drawBranch(ex, ey, leftAng, depth - 1, len * shrink);
      drawBranch(ex, ey, rightAng, depth - 1, len * shrink);
    };
    drawBranch(cx, cy, baseAngle, maxDepth, branchLen);
  }

  private renderRingArray(ctx: CanvasRenderingContext2D): void {
    const { density, lineWidth, rotationSpeed, colorOffset } = this.params;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const count = Math.floor(8 + density * 25);
    const maxR = Math.min(this.width, this.height) * 0.45;

    for (let i = 0; i < count; i++) {
      const t = i / count;
      const r = maxR * (0.1 + t * 0.9);
      const rot = rotationSpeed * this.time * 0.005 * (i % 2 === 0 ? 1 : -1);
      const ecc = 0.1 + density * 0.4 * Math.sin(t * Math.PI);
      const segments = Math.floor(60 + density * 60);

      ctx.beginPath();
      const hue = (t * 240 + colorOffset) % 360;
      ctx.strokeStyle = `hsl(${hue}, 80%, 55%)`;
      ctx.lineWidth = lineWidth * (0.5 + t * 0.8);
      ctx.globalAlpha = 0.85;

      for (let j = 0; j <= segments; j++) {
        const a = (j / segments) * Math.PI * 2 + rot;
        const px = cx + Math.cos(a) * r * (1 - ecc);
        const py = cy + Math.sin(a) * r * (1 + ecc);
        const { x, y } = this.applyMouseDistortion(px, py);
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private renderRandomScatter(ctx: CanvasRenderingContext2D): void {
    const { density, lineWidth, rotationSpeed, colorOffset } = this.params;
    const count = Math.floor(200 + density * 1200);
    const allColors = [...this.currentTheme.primary, ...this.currentTheme.accents];
    const t = this.time * 0.01;

    for (let i = 0; i < count; i++) {
      const seedX = ((i * 9301 + 49297) % 233280) / 233280;
      const seedY = ((i * 7919 + 12345) % 233280) / 233280;
      const jitter = 20 + density * 60;
      let px = seedX * this.width + Math.sin(t + i * 0.3) * jitter;
      let py = seedY * this.height + Math.cos(t * 1.3 + i * 0.5) * jitter;
      if (rotationSpeed > 0) {
        const cx = this.width / 2, cy = this.height / 2;
        const dx = px - cx, dy = py - cy;
        const a = rotationSpeed * this.time * 0.002;
        px = cx + dx * Math.cos(a) - dy * Math.sin(a);
        py = cy + dx * Math.sin(a) + dy * Math.cos(a);
      }
      const { x, y } = this.applyMouseDistortion(px, py);
      const size = lineWidth * (0.5 + Math.random() * 1.5);
      const colorIdx = i % allColors.length;
      const base = allColors[colorIdx];
      ctx.fillStyle = offsetColor(base, colorOffset + i * 0.5);
      ctx.globalAlpha = 0.5 + Math.random() * 0.5;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private renderWaveLines(ctx: CanvasRenderingContext2D): void {
    const { density, lineWidth, rotationSpeed, colorOffset } = this.params;
    const count = Math.floor(10 + density * 40);
    const t = this.time * 0.02;

    for (let i = 0; i < count; i++) {
      const baseY = (i / count) * this.height;
      ctx.beginPath();
      ctx.strokeStyle = this.getColor(i, count);
      ctx.lineWidth = lineWidth * (0.6 + Math.random() * 0.8);
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.75;

      const amp = 20 + density * 80;
      const freq = 0.005 + density * 0.02;
      const phase = rotationSpeed * this.time * 0.02 + i * 0.4;
      const segments = Math.floor(this.width / 3);

      for (let j = 0; j <= segments; j++) {
        const px = (j / segments) * this.width;
        let py = baseY
          + Math.sin(px * freq + phase) * amp
          + Math.sin(px * freq * 2.3 + t + i) * amp * 0.4
          + Math.cos(px * freq * 0.7 + phase * 1.5) * amp * 0.3;
        const { x, y } = this.applyMouseDistortion(px, py);
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private renderMoirePattern(ctx: CanvasRenderingContext2D): void {
    const { density, lineWidth, rotationSpeed, colorOffset } = this.params;
    const spacing = Math.max(3, 20 - density * 15);
    const cx = this.width / 2, cy = this.height / 2;
    const t = rotationSpeed * this.time * 0.003;
    const allColors = [...this.currentTheme.primary, ...this.currentTheme.accents];

    for (let layer = 0; layer < 2; layer++) {
      const angle = layer === 0 ? t : -t + Math.PI / 6;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      ctx.beginPath();
      const hue = (layer * 120 + colorOffset) % 360;
      ctx.strokeStyle = `hsl(${hue}, 75%, 60%)`;
      ctx.lineWidth = lineWidth * 0.8;
      ctx.globalAlpha = 0.6;

      const diag = Math.sqrt(this.width * this.width + this.height * this.height);
      for (let d = -diag; d < diag; d += spacing) {
        for (let side = -1; side <= 1; side += 2) {
          const x1 = cx + cos * d - sin * diag * side;
          const y1 = cy + sin * d + cos * diag * side;
          const x2 = cx + cos * d + sin * diag * side;
          const y2 = cy + sin * d - cos * diag * side;
          const { x: sx, y: sy } = this.applyMouseDistortion(x1, y1);
          const { x: ex, y: ey } = this.applyMouseDistortion(x2, y2);
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
        }
      }
      ctx.stroke();
    }

    ctx.globalAlpha = 0.8;
    for (let i = 0; i < 3; i++) {
      const r = 50 + i * 100 + Math.sin(t + i) * 30;
      ctx.beginPath();
      ctx.strokeStyle = allColors[i % allColors.length];
      ctx.lineWidth = lineWidth;
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private renderToBuffer(ctx: CanvasRenderingContext2D, algo: AlgorithmType): void {
    this.clearBackground(ctx);
    switch (algo) {
      case 'flowCurves': this.renderFlowCurves(ctx); break;
      case 'fractalTree': this.renderFractalTree(ctx); break;
      case 'ringArray': this.renderRingArray(ctx); break;
      case 'randomScatter': this.renderRandomScatter(ctx); break;
      case 'waveLines': this.renderWaveLines(ctx); break;
      case 'moirePattern': this.renderMoirePattern(ctx); break;
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life--;
      if (p.life <= 0) {
        this.particlePool.push(this.particles.splice(i, 1)[0]);
        continue;
      }
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  renderFrame(): void {
    this.time++;
    this.lerpTheme();

    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + 1 / (60 * 1.5));
      this.renderToBuffer(this.currCtx, this.algorithm);
      const t = this.transitionProgress;
      const fadeAlpha = t < 0.5 ? 1 - 2 * t : 2 * t - 1;
      const currAlpha = t < 0.5 ? 2 * t : 1;
      const prevAlpha = t < 0.5 ? 1 : 1 - (t - 0.5) * 2;

      this.clearBackground(this.ctx);
      this.ctx.globalAlpha = Math.max(0, prevAlpha);
      this.ctx.drawImage(this.prevBuffer, 0, 0, this.width, this.height);
      this.ctx.globalAlpha = Math.max(0, currAlpha);
      this.ctx.drawImage(this.currBuffer, 0, 0, this.width, this.height);
      this.ctx.globalAlpha = 1;
    } else {
      this.renderToBuffer(this.ctx, this.algorithm);
    }

    this.renderParticles(this.ctx);
  }

  private recordSVGCommand(cmd: string): void {
    this.svgCommands.push(cmd);
  }

  exportPNG(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        this.canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject(new Error('PNG export failed'));
        }, 'image/png');
      } catch (e) {
        reject(e);
      }
    });
  }

  exportSVG(): Promise<string> {
    return new Promise((resolve) => {
      this.svgCommands = [];
      const w = this.width, h = this.height;
      const bg = this.currentTheme.background;
      this.recordSVGCommand(`<rect width="${w}" height="${h}" fill="${bg}"/>`);

      const fakeCtx: any = new Proxy({}, {
        get: (_, prop) => {
          if (prop === 'beginPath') return () => { this.svgCommands.push('<path d="'); };
          if (prop === 'moveTo') return (x: number, y: number) => { this.svgCommands.push(`M ${x.toFixed(2)} ${y.toFixed(2)} `); };
          if (prop === 'lineTo') return (x: number, y: number) => { this.svgCommands.push(`L ${x.toFixed(2)} ${y.toFixed(2)} `); };
          if (prop === 'arc') return (x: number, y: number, r: number, s: number, e: number) => {
            this.recordSVGCommand(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}" fill="currentColor"/>`);
          };
          if (prop === 'stroke') return () => {
            const last = this.svgCommands.pop() || '';
            if (last.startsWith('<path d="')) {
              this.svgCommands.push(last + `" stroke="currentColor" fill="none" stroke-linecap="round"/>`);
            } else {
              this.svgCommands.push(last);
            }
          };
          if (prop === 'fill') return () => {};
          if (prop === 'strokeStyle' || prop === 'fillStyle') return '';
          return () => {};
        },
        set: () => true
      });

      try {
        this.renderToBuffer(fakeCtx, this.algorithm);
      } catch (e) {}

      let colorIdx = 0;
      const allColors = [...this.currentTheme.primary, ...this.currentTheme.accents];
      const processed = this.svgCommands.map(cmd => {
        if (cmd.includes('currentColor')) {
          const c = offsetColor(allColors[colorIdx % allColors.length], this.params.colorOffset);
          colorIdx++;
          return cmd.replace(/currentColor/g, c);
        }
        return cmd;
      }).join('\n');

      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
${processed}
</svg>`;
      resolve(svg);
    });
  }

  getAlgorithm(): AlgorithmType {
    return this.algorithm;
  }
}
