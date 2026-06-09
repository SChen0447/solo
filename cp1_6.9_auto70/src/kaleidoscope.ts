export type ShapeType = 'triangle' | 'ellipse' | 'arc';

export interface Palette {
  name: string;
  colors: string[];
}

export const PALETTES: Palette[] = [
  {
    name: '霓虹炫彩',
    colors: ['#ff006e', '#8338ec', '#3a86ff', '#06ffa5', '#ffbe0b', '#fb5607']
  },
  {
    name: '极光梦幻',
    colors: ['#00d9ff', '#00ff9f', '#9d4edd', '#7209b7', '#00b4d8', '#0096c7']
  },
  {
    name: '复古暖色',
    colors: ['#e63946', '#f4a261', '#e9c46a', '#f1faee', '#a8dadc', '#457b9d']
  },
  {
    name: '冷峻蓝绿',
    colors: ['#03045e', '#023e8a', '#0077b6', '#0096c7', '#00b4d8', '#48cae4']
  },
  {
    name: '黑白灰阶',
    colors: ['#ffffff', '#d9d9d9', '#a6a6a6', '#737373', '#404040', '#0d0d0d']
  }
];

interface Fragment {
  r: number;
  a: number;
  size: number;
  type: ShapeType;
  colorIdx: number;
  rot: number;
  rotSpd: number;
  rSpd: number;
  aSpd: number;
  alpha: number;
}

const SIN_60 = 0.8660254037844386;
const COS_60 = 0.5;

export class Kaleidoscope {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private frags: Fragment[] = [];
  private mirrors: number = 6;
  private rotSpd: number = 0.5;
  private gRot: number = 0;
  private curPal: Palette = PALETTES[0];
  private tgtPal: Palette = PALETTES[0];
  private tProg: number = 1;
  private running: boolean = false;
  private rafId: number | null = null;
  private lastT: number = 0;
  private fpsCb: ((fps: number) => void) | null = null;
  private fc: number = 0;
  private fpsT: number = 0;
  private cc: string[] = [];
  private cx: number = 0;
  private cy: number = 0;
  private mR: number = 0;
  private cosCache: number[] = [];
  private sinCache: number[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('无法获取 Canvas 2D 上下文');
    this.ctx = ctx;
    this.cx = canvas.width / 2;
    this.cy = canvas.height / 2;
    this.mR = Math.min(this.cx, this.cy) - 20;
    this.rebuildCache();
    this.updColors();
    this.genFrags();
  }

  setMirrorCount(n: number): void {
    this.mirrors = Math.max(3, Math.min(12, Math.round(n)));
    this.rebuildCache();
    this.genFrags();
  }

  setRotationSpeed(s: number): void {
    this.rotSpd = Math.max(0, Math.min(3, s));
  }

  setPalette(p: Palette): void {
    if (this.tgtPal.name === p.name) return;
    this.tgtPal = p;
    this.tProg = 0;
  }

  getPalette(): Palette { return this.curPal; }
  getTargetPalette(): Palette { return this.tgtPal; }
  setFpsCallback(cb: (fps: number) => void): void { this.fpsCb = cb; }

  private rebuildCache(): void {
    this.cosCache = new Array(this.mirrors);
    this.sinCache = new Array(this.mirrors);
    const sa = (Math.PI * 2) / this.mirrors;
    for (let i = 0; i < this.mirrors; i++) {
      this.cosCache[i] = Math.cos(sa * i);
      this.sinCache[i] = Math.sin(sa * i);
    }
  }

  private genFrags(): void {
    this.frags = [];
    const count = 150;
    const sa = (Math.PI * 2) / this.mirrors;
    const types: ShapeType[] = ['triangle', 'ellipse', 'arc'];
    for (let i = 0; i < count; i++) {
      this.frags.push({
        r: 30 + Math.random() * (this.mR - 30),
        a: Math.random() * sa,
        size: 10 + Math.random() * 40,
        type: types[(Math.random() * 3) | 0],
        colorIdx: (Math.random() * 6) | 0,
        rot: Math.random() * Math.PI * 2,
        rotSpd: (Math.random() - 0.5) * 0.02,
        rSpd: (Math.random() - 0.5) * 0.5,
        aSpd: (Math.random() - 0.5) * 0.003,
        alpha: 0.5 + Math.random() * 0.5
      });
    }
  }

  private h2r(hex: string): [number, number, number] {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  private updColors(): void {
    if (this.tProg >= 1) {
      this.cc = this.curPal.colors.slice();
      return;
    }
    this.cc = new Array(6);
    for (let i = 0; i < 6; i++) {
      const [r1, g1, b1] = this.h2r(this.curPal.colors[i]);
      const [r2, g2, b2] = this.h2r(this.tgtPal.colors[i]);
      const t = this.tProg;
      this.cc[i] = `rgb(${(r1 + (r2 - r1) * t) | 0},${(g1 + (g2 - g1) * t) | 0},${(b1 + (b2 - b1) * t) | 0})`;
    }
  }

  private updFrags(): void {
    const sa = (Math.PI * 2) / this.mirrors;
    for (let i = 0; i < this.frags.length; i++) {
      const f = this.frags[i];
      f.r += f.rSpd;
      f.a += f.aSpd;
      f.rot += f.rotSpd;
      if (f.r > this.mR || f.r < 30) {
        f.rSpd = -f.rSpd + (Math.random() - 0.5) * 0.1;
        if (f.rSpd > 1) f.rSpd = 1;
        if (f.rSpd < -1) f.rSpd = -1;
        if (f.r > this.mR) f.r = this.mR;
        if (f.r < 30) f.r = 30;
      }
      if (f.a < 0) f.a += sa;
      else if (f.a > sa) f.a -= sa;
    }
  }

  private drawFrag(f: Fragment, color: string, px: number, py: number, rot: number, flip: boolean): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(px, py);
    if (flip) ctx.scale(1, -1);
    ctx.rotate(rot);
    ctx.globalAlpha = f.alpha;
    ctx.shadowColor = color;
    ctx.shadowBlur = 5;

    switch (f.type) {
      case 'triangle': {
        ctx.fillStyle = color;
        const hs = f.size * 0.5;
        ctx.beginPath();
        ctx.moveTo(0, -hs);
        ctx.lineTo(hs * SIN_60, hs * COS_60);
        ctx.lineTo(-hs * SIN_60, hs * COS_60);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'ellipse': {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, 0, f.size * 0.5, f.size * 0.333, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'arc': {
        ctx.strokeStyle = color;
        ctx.lineWidth = f.size > 16 ? f.size * 0.125 : 2;
        ctx.beginPath();
        ctx.arc(0, 0, f.size * 0.5, 0, Math.PI * 1.2);
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }

  private render(): void {
    const ctx = this.ctx;
    const cx = this.cx, cy = this.cy;
    const gr = (this.gRot * Math.PI) / 180;
    const cgr = Math.cos(gr), sgr = Math.sin(gr);
    const colors = this.cc;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const frags = this.frags;
    const fc = frags.length;

    for (let m = 0; m < this.mirrors; m++) {
      const cm = this.cosCache[m], sm = this.sinCache[m];
      const c1 = cm * cgr - sm * sgr;
      const s1 = cm * sgr + sm * cgr;

      for (let fi = 0; fi < fc; fi++) {
        const f = frags[fi];
        const color = colors[f.colorIdx];

        const ca = Math.cos(f.a), sa = Math.sin(f.a);
        const px1 = cx + (ca * c1 - sa * s1) * f.r;
        const py1 = cy + (ca * s1 + sa * c1) * f.r;
        this.drawFrag(f, color, px1, py1, Math.atan2(sa, ca) + gr + (Math.PI * 2 * m) / this.mirrors + f.rot, false);

        const px2 = cx + (ca * c1 + sa * s1) * f.r;
        const py2 = cy + (ca * s1 - sa * c1) * f.r;
        this.drawFrag(f, color, px2, py2, Math.atan2(-sa, ca) + gr + (Math.PI * 2 * m) / this.mirrors + f.rot, true);
      }
    }
  }

  private loop(t: number): void {
    if (!this.running) return;
    const dt = t - this.lastT;
    this.lastT = t;

    this.fc++;
    if (t - this.fpsT >= 1000) {
      if (this.fpsCb) this.fpsCb(this.fc);
      this.fc = 0;
      this.fpsT = t;
    }

    this.gRot += this.rotSpd;
    if (this.gRot >= 360) this.gRot -= 360;

    if (this.tProg < 1) {
      this.tProg = Math.min(1, this.tProg + dt / 500);
      if (this.tProg >= 1) this.curPal = this.tgtPal;
      this.updColors();
    }

    this.updFrags();
    this.render();

    this.rafId = requestAnimationFrame((tt) => this.loop(tt));
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastT = performance.now();
    this.fpsT = performance.now();
    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  regenerate(): void {
    this.genFrags();
  }
}
