import { ParticleSystem, Particle, TrailPoint } from './particleSystem';

interface Projected {
  x: number;
  y: number;
  z: number;
  scale: number;
  alpha: number;
  size: number;
  color: [number, number, number];
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private previewCtx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private cx: number = 0;
  private cy: number = 0;

  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;

  private cameraZ: number = 650;
  private fov: number = 520;

  private projected: Projected[] = [];
  private sortBuffer: number[] = [];

  private previewTimer: number = 0;
  private previewParticles: { x: number; y: number; z: number; colorT: number; size: number }[] = [];

  constructor(
    private mainCanvas: HTMLCanvasElement,
    private previewCanvas: HTMLCanvasElement,
    private system: ParticleSystem
  ) {
    this.ctx = mainCanvas.getContext('2d', { alpha: true })!;
    this.previewCtx = previewCanvas.getContext('2d', { alpha: true })!;

    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: true })!;

    this.resize();
    this.initPreviewParticles();
  }

  private initPreviewParticles(): void {
    this.previewParticles = [];
    const count = 100;
    const R = this.system.radius;
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = R * Math.pow(Math.random(), 0.6);
      this.previewParticles.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
        colorT: Math.pow(r / R, 0.7),
        size: 2 + Math.random() * 3,
      });
    }
  }

  public resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.mainCanvas.style.width = this.width + 'px';
    this.mainCanvas.style.height = this.height + 'px';
    this.mainCanvas.width = Math.floor(this.width * dpr);
    this.mainCanvas.height = Math.floor(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.cx = this.width / 2;
    this.cy = this.height / 2;

    this.offscreenCanvas.width = Math.floor(this.width * dpr);
    this.offscreenCanvas.height = Math.floor(this.height * dpr);
    this.offscreenCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pdpr = Math.min(window.devicePixelRatio || 1, 2);
    this.previewCanvas.width = 120 * pdpr;
    this.previewCanvas.height = 120 * pdpr;
    this.previewCtx.setTransform(pdpr, 0, 0, pdpr, 0, 0);
  }

  public getCenter() {
    return { cx: this.cx, cy: this.cy };
  }

  public getCameraParams() {
    return { cameraZ: this.cameraZ, fov: this.fov };
  }

  private project(p: Particle): Projected | null {
    const z = p.z + this.cameraZ;
    if (z <= 10) return null;
    const scale = this.fov / z;
    return {
      x: this.cx + p.x * scale,
      y: this.cy + p.y * scale,
      z: p.z,
      scale,
      alpha: this.system.getTwinkleAlpha(p),
      size: p.size * scale,
      color: this.system.getParticleColor(p),
    };
  }

  private depthSort(): void {
    const n = this.projected.length;
    if (this.sortBuffer.length !== n) this.sortBuffer = new Array(n);
    for (let i = 0; i < n; i++) this.sortBuffer[i] = i;

    this.sortBuffer.sort((a, b) => {
      return this.projected[b].z - this.projected[a].z;
    });
  }

  public render(dt: number, isDragging: boolean): void {
    const octx = this.offscreenCtx;
    const W = this.width;
    const H = this.height;

    octx.globalCompositeOperation = 'source-over';
    octx.fillStyle = 'rgba(5, 5, 16, 0.35)';
    octx.fillRect(0, 0, W, H);

    this.projected.length = 0;
    for (const p of this.system.particles) {
      const proj = this.project(p);
      if (proj) this.projected.push(proj);
    }
    this.depthSort();

    octx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.projected.length; i++) {
      const idx = this.sortBuffer[i];
      const pr = this.projected[idx];
      if (pr.size < 0.2) continue;

      const depthAlpha = Math.max(0.15, Math.min(1, (pr.z + this.system.radius * 1.2) / (this.system.radius * 2.4)));
      const alpha = pr.alpha * depthAlpha * 0.85;
      const c = pr.color;

      if (pr.size > 1.6) {
        const glowR = pr.size * 3.2;
        const grad = octx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, glowR);
        grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${alpha * 0.55})`);
        grad.addColorStop(0.4, `rgba(${c[0]},${c[1]},${c[2]},${alpha * 0.18})`);
        grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
        octx.fillStyle = grad;
        octx.beginPath();
        octx.arc(pr.x, pr.y, glowR, 0, Math.PI * 2);
        octx.fill();
      }

      octx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
      octx.beginPath();
      octx.arc(pr.x, pr.y, Math.max(0.3, pr.size * 0.55), 0, Math.PI * 2);
      octx.fill();
    }

    this.renderTrail(octx);
    this.renderNebulaGlow(octx);

    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.drawImage(this.offscreenCanvas, 0, 0, W, H, 0, 0, W, H);

    this.previewTimer += dt;
    if (this.previewTimer >= 0.5) {
      this.previewTimer = 0;
      this.updatePreviewParticles();
    }
    this.renderPreview();
  }

  private renderTrail(octx: CanvasRenderingContext2D): void {
    const trail = this.system.trail;
    if (trail.length < 2) return;

    const sorted = trail.slice().sort((a, b) => a.z - b.z);

    octx.lineCap = 'round';
    octx.lineJoin = 'round';
    octx.globalCompositeOperation = 'lighter';

    for (let pass = 0; pass < 2; pass++) {
      octx.beginPath();
      let started = false;
      for (let i = 0; i < sorted.length; i++) {
        const tp = sorted[i];
        const z = tp.z + this.cameraZ;
        if (z <= 10) continue;
        const scale = this.fov / z;
        const sx = this.cx + tp.x * scale;
        const sy = this.cy + tp.y * scale;
        const lifeT = tp.life / tp.maxLife;
        const fadeAlpha = lifeT < 0.25 ? lifeT / 0.25 : 1;

        if (!started) {
          octx.moveTo(sx, sy);
          started = true;
        } else {
          octx.lineTo(sx, sy);
        }

        if (i < sorted.length - 1) {
          const nextTp = sorted[i + 1];
          const nz = nextTp.z + this.cameraZ;
          if (nz > 10) {
            const nscale = this.fov / nz;
            const nsx = this.cx + nextTp.x * nscale;
            const nsy = this.cy + nextTp.y * nscale;
            const width = (tp.width * scale + nextTp.width * nscale) * 0.5 * (pass === 0 ? 3.5 : 1);
            octx.lineWidth = Math.max(1, width);
            const alpha = fadeAlpha * (pass === 0 ? 0.15 : 0.75);
            octx.strokeStyle = this.colorWithAlpha(tp.color, alpha);
            octx.stroke();
            octx.beginPath();
            octx.moveTo(nsx, nsy);
          }
        }
      }
    }
  }

  private colorWithAlpha(css: string, alpha: number): string {
    if (css.startsWith('rgba')) {
      return css.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, `rgba($1,$2,$3,${alpha})`);
    }
    if (css.startsWith('rgb')) {
      return css.replace(/rgb\(([^,]+),([^,]+),([^)]+)\)/, `rgba($1,$2,$3,${alpha})`);
    }
    return css;
  }

  private renderNebulaGlow(octx: CanvasRenderingContext2D): void {
    octx.globalCompositeOperation = 'lighter';

    const R = this.system.radius;
    const scale = this.fov / (this.cameraZ);
    const visualR = R * scale * 1.15;

    const avgColor = this.getAverageAccentColor();
    const [r, g, b] = avgColor;

    const glow = octx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, visualR);
    glow.addColorStop(0, `rgba(${r},${g},${b},0.06)`);
    glow.addColorStop(0.5, `rgba(${r},${g},${b},0.025)`);
    glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
    octx.fillStyle = glow;
    octx.beginPath();
    octx.arc(this.cx, this.cy, visualR, 0, Math.PI * 2);
    octx.fill();
  }

  private getAverageAccentColor(): [number, number, number] {
    const stops = [
      this.system.getParticleColor({ colorT: 0 } as Particle),
      this.system.getParticleColor({ colorT: 0.5 } as Particle),
      this.system.getParticleColor({ colorT: 1 } as Particle),
    ];
    return [
      Math.round((stops[0][0] + stops[1][0] + stops[2][0]) / 3),
      Math.round((stops[0][1] + stops[1][1] + stops[2][1]) / 3),
      Math.round((stops[0][2] + stops[1][2] + stops[2][2]) / 3),
    ];
  }

  private updatePreviewParticles(): void {
    const R = this.system.radius;
    const swirl = this.system.params.swirl;
    const diverge = this.system.params.diverge;
    const t = this.system.time;

    for (const p of this.previewParticles) {
      const baseR = Math.sqrt(p.x * p.x + p.y * p.y);
      const angle = Math.atan2(p.y, p.x) + t * swirl * 0.15;
      const r = baseR + diverge * 30 * p.colorT;
      p.x = r * Math.cos(angle);
      p.y = r * Math.sin(angle);
      p.z = p.z + Math.sin(t * 0.4) * 2 * diverge;
    }
  }

  private renderPreview(): void {
    const ctx = this.previewCtx;
    const W = 120;
    const H = 120;
    const cx = W / 2;
    const cy = H / 2;
    const R = this.system.radius;
    const scale = 50 / R;

    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);

    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
    bg.addColorStop(0, 'rgba(26, 10, 46, 0.9)');
    bg.addColorStop(1, 'rgba(5, 5, 16, 0.98)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(cx, cy, 60, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 58, 0, Math.PI * 2);
    ctx.clip();

    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.previewParticles) {
      const px = cx + p.x * scale;
      const py = cy + p.y * scale;
      const fake = { colorT: p.colorT } as Particle;
      const c = this.system.getParticleColor(fake);
      const s = p.size;

      if (s > 2.5) {
        const grd = ctx.createRadialGradient(px, py, 0, px, py, s * 3);
        grd.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},0.5)`);
        grd.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(px, py, s * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},0.9)`;
      ctx.beginPath();
      ctx.arc(px, py, s * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 50, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(126, 200, 227, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 58, 0, Math.PI * 2);
    ctx.stroke();
  }
}
