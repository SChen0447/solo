import type {
  Star,
  StarColor,
  HaloEffect,
  Particle,
  Fragment,
  VortexEffect,
  SupernovaEffect
} from './simulation';

interface BgStar {
  x: number;
  y: number;
  size: number;
  phase: number;
  period: number;
}

export class Renderer {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  width: number = 0;
  height: number = 0;
  private bgStars: BgStar[] = [];
  private time: number = 0;
  private noiseCanvas: HTMLCanvasElement | null = null;
  private noiseCtx: CanvasRenderingContext2D | null = null;
  draggingStar: Star | null = null;
  dragMouseX: number = 0;
  dragMouseY: number = 0;
  zoom: number = 1;
  offsetX: number = 0;
  offsetY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.initNoise();
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.canvas.width = width * window.devicePixelRatio;
    this.canvas.height = height * window.devicePixelRatio;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.generateBgStars();
  }

  private initNoise() {
    this.noiseCanvas = document.createElement('canvas');
    this.noiseCanvas.width = 256;
    this.noiseCanvas.height = 256;
    this.noiseCtx = this.noiseCanvas.getContext('2d')!;
    const imgData = this.noiseCtx.createImageData(256, 256);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const v = Math.floor(Math.random() * 255);
      imgData.data[i] = v;
      imgData.data[i + 1] = v;
      imgData.data[i + 2] = v;
      imgData.data[i + 3] = 255;
    }
    this.noiseCtx.putImageData(imgData, 0, 0);
  }

  private generateBgStars() {
    this.bgStars = [];
    const count = 150;
    for (let i = 0; i < count; i++) {
      this.bgStars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 0.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
        period: 1.5 + Math.random() * 1.5
      });
    }
  }

  private valueNoise(x: number, y: number, t: number): number {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const a = Math.sin(xi * 12.9898 + yi * 78.233 + t * 0.5) * 0.5 + 0.5;
    const b = Math.sin((xi + 1) * 12.9898 + yi * 78.233 + t * 0.5) * 0.5 + 0.5;
    const c = Math.sin(xi * 12.9898 + (yi + 1) * 78.233 + t * 0.5) * 0.5 + 0.5;
    const d = Math.sin((xi + 1) * 12.9898 + (yi + 1) * 78.233 + t * 0.5) * 0.5 + 0.5;
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
  }

  private fbm(x: number, y: number, t: number): number {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;
    for (let i = 0; i < 4; i++) {
      value += amplitude * this.valueNoise(x * frequency, y * frequency, t + i * 100);
      amplitude *= 0.5;
      frequency *= 2;
    }
    return value;
  }

  private drawBackground() {
    const ctx = this.ctx;
    const grad = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.7
    );
    grad.addColorStop(0, '#1a0a3e');
    grad.addColorStop(0.5, '#0e1440');
    grad.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    if (this.noiseCanvas) {
      ctx.globalAlpha = 0.03;
      const pattern = ctx.createPattern(this.noiseCanvas, 'repeat');
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, this.width, this.height);
      }
      ctx.globalAlpha = 1;
    }

    for (const s of this.bgStars) {
      const brightness = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(this.time * (Math.PI * 2 / s.period) + s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.8})`;
      ctx.fill();
    }
  }

  private drawTrail(star: Star) {
    if (star.trail.length < 2) return;
    const ctx = this.ctx;
    const trail = star.trail;
    const c = star.color;

    for (let i = 1; i < trail.length; i++) {
      const alpha = (i / trail.length) * 0.6;
      const p0 = trail[i - 1];
      const p1 = trail[i];
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
      ctx.lineWidth = 2 * (i / trail.length);
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  private drawStar(star: Star) {
    const ctx = this.ctx;
    const r = star.diameter * 0.5;
    const c = star.color;
    const t = this.time;

    const glowGrad = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, r * 2.5);
    glowGrad.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, 0.4)`);
    glowGrad.addColorStop(0.4, `rgba(${c.r}, ${c.g}, ${c.b}, 0.15)`);
    glowGrad.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(star.x, star.y, r * 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(star.x, star.y, r, 0, Math.PI * 2);
    ctx.clip();

    const bodyGrad = ctx.createRadialGradient(
      star.x - r * 0.3, star.y - r * 0.3, 0,
      star.x, star.y, r
    );
    bodyGrad.addColorStop(0, `rgba(255, 255, 255, 1)`);
    bodyGrad.addColorStop(0.3, `rgba(${c.r}, ${c.g}, ${c.b}, 1)`);
    bodyGrad.addColorStop(1, `rgba(${Math.max(c.r - 80, 0)}, ${Math.max(c.g - 80, 0)}, ${Math.max(c.b - 80, 0)}, 1)`);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(star.x, star.y, r, 0, Math.PI * 2);
    ctx.fill();

    const flameLayers = 3;
    for (let layer = 0; layer < flameLayers; layer++) {
      const phase = star.flamePhase + layer * 2.1;
      ctx.globalCompositeOperation = 'lighter';
      for (let a = 0; a < 8; a++) {
        const angle = (a / 8) * Math.PI * 2 + phase * 0.1;
        const nx = star.x + Math.cos(angle) * r * 0.5;
        const ny = star.y + Math.sin(angle) * r * 0.5;
        const n = this.fbm(nx * 0.02 + layer * 5.5, ny * 0.02, t + phase);
        const flameR = r * (0.3 + n * 0.5);
        const intensity = (0.2 + n * 0.4) / flameLayers;
        const flameGrad = ctx.createRadialGradient(nx, ny, 0, nx, ny, flameR);
        flameGrad.addColorStop(0, `rgba(255, 255, 200, ${intensity})`);
        flameGrad.addColorStop(0.5, `rgba(${c.r}, ${c.g}, ${Math.min(c.b + 50, 255)}, ${intensity * 0.6})`);
        flameGrad.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.arc(nx, ny, flameR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();
  }

  private drawHalo(h: HaloEffect) {
    const ctx = this.ctx;
    const alpha = h.life / h.maxLife;
    const c = h.color;
    const grad = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.radius);
    grad.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);
    grad.addColorStop(0.6, `rgba(${c.r}, ${c.g}, ${c.b}, ${0.3 * alpha})`);
    grad.addColorStop(0.85, `rgba(255, 255, 255, ${0.5 * alpha})`);
    grad.addColorStop(1, `rgba(255, 255, 255, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawParticle(p: Particle) {
    const ctx = this.ctx;
    const alpha = p.life / p.maxLife;
    const c = p.color;
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
    grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    grad.addColorStop(0.3, `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha * 0.8})`);
    grad.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawFragment(f: Fragment) {
    const ctx = this.ctx;
    const alpha = f.life / f.maxLife;
    const c = f.color;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rotation);
    ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(-f.size * 0.5, -f.size * 0.3);
    ctx.lineTo(f.size * 0.6, -f.size * 0.1);
    ctx.lineTo(f.size * 0.3, f.size * 0.5);
    ctx.lineTo(-f.size * 0.4, f.size * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  private drawVortex(v: VortexEffect) {
    const ctx = this.ctx;
    const alpha = v.life / v.maxLife;
    const t = 1 - alpha;
    const cx = v.x;
    const cy = v.y;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.time * 3);
    for (let i = 0; i < 3; i++) {
      ctx.rotate((Math.PI * 2) / 3);
      const grad = ctx.createRadialGradient(0, 0, v.radius * 0.2, 0, 0, v.radius);
      grad.addColorStop(0, `rgba(60, 40, 80, 0)`);
      grad.addColorStop(0.5, `rgba(30, 20, 50, ${0.6 * alpha})`);
      grad.addColorStop(0.8, `rgba(10, 5, 20, ${0.85 * alpha})`);
      grad.addColorStop(1, `rgba(0, 0, 0, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 1.3; a += 0.05) {
        const r = v.radius * (0.3 + a / (Math.PI * 1.3) * 0.7) * (1 - i * 0.15);
        const x = Math.cos(a + i * 0.5) * r;
        const y = Math.sin(a + i * 0.5) * r * 0.5;
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let a = Math.PI * 1.3; a >= 0; a -= 0.05) {
        const r = v.radius * (0.1 + a / (Math.PI * 1.3) * 0.5) * (1 - i * 0.15);
        const x = Math.cos(a + i * 0.5 + 0.3) * r;
        const y = Math.sin(a + i * 0.5 + 0.3) * r * 0.5;
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private drawSupernova(sn: SupernovaEffect) {
    const ctx = this.ctx;
    const t = 1 - sn.life / sn.maxLife;
    const cx = sn.x;
    const cy = sn.y;
    const maxR = Math.max(this.width, this.height) * 0.8;

    for (let layer = 0; layer < 3; layer++) {
      const layerT = Math.max(0, t - layer * 0.15) / (1 - layer * 0.15);
      if (layerT <= 0) continue;
      const r = maxR * layerT * (0.4 + layer * 0.2);
      const alpha = (1 - layerT) * (0.3 - layer * 0.08);
      const colors = [
        [255, 255, 255],
        [200, 200, 255],
        [255, 200, 230]
      ];
      const col = colors[layer];
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${alpha * 2})`);
      grad.addColorStop(0.3, `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${alpha})`);
      grad.addColorStop(0.7, `rgba(${col[0] * 0.6}, ${col[1] * 0.6}, ${col[2]}, ${alpha * 0.5})`);
      grad.addColorStop(1, `rgba(100, 50, 150, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.time * 1.5);
    const petalCount = 8;
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2;
      const petalR = maxR * 0.6 * Math.min(1, t * 2);
      const alpha = (1 - t) * 0.25;
      ctx.save();
      ctx.rotate(angle);
      const petalGrad = ctx.createRadialGradient(0, -petalR * 0.3, 0, 0, -petalR * 0.3, petalR * 0.6);
      petalGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      petalGrad.addColorStop(0.5, `rgba(220, 200, 255, ${alpha * 0.7})`);
      petalGrad.addColorStop(1, `rgba(180, 150, 255, 0)`);
      ctx.fillStyle = petalGrad;
      ctx.beginPath();
      ctx.ellipse(0, -petalR * 0.4, petalR * 0.25, petalR * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    for (const p of sn.particles) {
      const alpha = p.life / p.maxLife;
      const c = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
      ctx.fill();
    }

    const coreAlpha = (1 - t) * 0.8 + 0.2;
    const coreR = Math.max(this.width, this.height) * 0.15 * (1 - t * 0.5);
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
    coreGrad.addColorStop(0, `rgba(255, 255, 255, ${coreAlpha})`);
    coreGrad.addColorStop(0.2, `rgba(255, 255, 240, ${coreAlpha * 0.8})`);
    coreGrad.addColorStop(1, `rgba(255, 255, 255, 0)`);
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawDragLine() {
    if (!this.draggingStar) return;
    const ctx = this.ctx;
    const s = this.draggingStar;
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -this.time * 20;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(this.dragMouseX, this.dragMouseY);
    ctx.stroke();
    ctx.restore();
  }

  draw(
    dt: number,
    stars: Star[],
    halos: HaloEffect[],
    particles: Particle[],
    fragments: Fragment[],
    vortex: VortexEffect | null,
    supernova: SupernovaEffect | null,
    paused: boolean
  ) {
    this.time += dt;
    const ctx = this.ctx;

    ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    this.drawBackground();

    ctx.save();
    const cx = this.width / 2;
    const cy = this.height / 2;
    ctx.translate(cx, cy);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-cx + this.offsetX, -cy + this.offsetY);

    for (const s of stars) {
      this.drawTrail(s);
    }
    for (const h of halos) {
      this.drawHalo(h);
    }
    for (const p of particles) {
      this.drawParticle(p);
    }
    for (const f of fragments) {
      this.drawFragment(f);
    }
    for (const s of stars) {
      this.drawStar(s);
    }
    this.drawDragLine();
    if (vortex) {
      this.drawVortex(vortex);
    }
    if (supernova) {
      this.drawSupernova(supernova);
    }

    ctx.restore();

    if (paused) {
      ctx.fillStyle = 'rgba(120, 180, 255, 0.15)';
      ctx.fillRect(0, 0, this.width, this.height);
    }
  }
}
