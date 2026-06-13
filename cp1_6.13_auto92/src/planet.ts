export type TextureType = 'spiral' | 'grid' | 'crack';

export interface OrbitState {
  active: boolean;
  phaseAngle: number;
  phaseIndex: number;
  a: number;
  b: number;
  speed: number;
  cx: number;
  cy: number;
}

export class Planet {
  id: number;
  x: number = 0;
  y: number = 0;
  baseX: number = 0;
  baseY: number = 0;
  radius: number = 0;
  baseRadius: number = 0;
  color1: string = '';
  color2: string = '';
  mainColorRgb: { r: number; g: number; b: number };
  textureType: TextureType;
  rotation: number = 0;
  rotationSpeed: number = 0;
  floatPhase: number = 0;
  floatSpeed: number = 0;
  floatAmp: number = 5;
  isDragging: boolean = false;
  dragScale: number = 1;
  targetScale: number = 1;
  haloRadius: number = 0;
  targetHaloRadius: number = 0;
  isPulling: boolean = false;
  pullProgress: number = 0;
  pullStartX: number = 0;
  pullStartY: number = 0;
  justPlaced: boolean = false;
  placeFlash: number = 0;

  orbit: OrbitState = {
    active: false,
    phaseAngle: 0,
    phaseIndex: -1,
    a: 200,
    b: 150,
    speed: 0.005,
    cx: 0,
    cy: 0
  };

  private textureCanvas: HTMLCanvasElement;
  private textureCtx: CanvasRenderingContext2D;
  private patternSeed: number;

  constructor(id: number, cx: number, cy: number, canvasW: number, canvasH: number) {
    this.id = id;
    this.mainColorRgb = { r: 150, g: 120, b: 255 };
    this.patternSeed = Math.random() * 1000;
    this.textureType = (['spiral', 'grid', 'crack'] as TextureType[])[Math.floor(Math.random() * 3)];

    this.textureCanvas = document.createElement('canvas');
    this.textureCtx = this.textureCanvas.getContext('2d')!;

    this.init(cx, cy, canvasW, canvasH);
  }

  private init(cx: number, cy: number, canvasW: number, canvasH: number) {
    this.baseRadius = 20 + Math.random() * 30;
    this.radius = this.baseRadius;
    this.haloRadius = this.baseRadius * 1.0;

    const edge = Math.floor(Math.random() * 4);
    const margin = this.baseRadius + 30;
    switch (edge) {
      case 0:
        this.x = margin + Math.random() * (canvasW - margin * 2);
        this.y = margin;
        break;
      case 1:
        this.x = canvasW - margin;
        this.y = margin + Math.random() * (canvasH - margin * 2);
        break;
      case 2:
        this.x = margin + Math.random() * (canvasW - margin * 2);
        this.y = canvasH - margin;
        break;
      default:
        this.x = margin;
        this.y = margin + Math.random() * (canvasH - margin * 2);
    }
    this.baseX = this.x;
    this.baseY = this.y;
    this.floatPhase = Math.random() * Math.PI * 2;
    this.floatSpeed = 0.012 + Math.random() * 0.01;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (0.002 + Math.random() * 0.002) * (Math.random() > 0.5 ? 1 : -1);

    const hue = 220 + Math.random() * 120;
    const sat = 55 + Math.random() * 25;
    const light1 = 55 + Math.random() * 15;
    const light2 = 70 + Math.random() * 15;
    this.color1 = `hsl(${hue}, ${sat}%, ${light1}%)`;
    this.color2 = `hsl(${hue + 40 + Math.random() * 30}, ${sat}%, ${light2}%)`;
    this.mainColorRgb = this.hslToRgb(hue, sat, light1);

    this.generateTexture();
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    s /= 100; l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return {
      r: Math.round(255 * f(0)),
      g: Math.round(255 * f(8)),
      b: Math.round(255 * f(4))
    };
  }

  private generateTexture() {
    const size = Math.ceil(this.baseRadius * 2) + 4;
    this.textureCanvas.width = size;
    this.textureCanvas.height = size;
    const ctx = this.textureCtx;
    const r = size / 2 - 2;
    const cx = size / 2;
    const cy = size / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
    grad.addColorStop(0, this.color2);
    grad.addColorStop(0.5, this.color1);
    grad.addColorStop(1, `hsl(${240 + this.patternSeed % 40}, 40%, 25%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    ctx.globalAlpha = 0.35;
    const seed = this.patternSeed;
    switch (this.textureType) {
      case 'spiral':
        this.drawSpiral(ctx, cx, cy, r, seed);
        break;
      case 'grid':
        this.drawGrid(ctx, cx, cy, r, seed);
        break;
      case 'crack':
        this.drawCrack(ctx, cx, cy, r, seed);
        break;
    }

    ctx.globalAlpha = 1;
    const rimGrad = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r);
    rimGrad.addColorStop(0, 'rgba(0,0,0,0)');
    rimGrad.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = rimGrad;
    ctx.fillRect(0, 0, size, size);

    ctx.restore();
  }

  private drawSpiral(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, seed: number) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.2;
    for (let s = 0; s < 3; s++) {
      ctx.beginPath();
      const offset = (s / 3) * Math.PI * 2 + seed;
      for (let t = 0; t < Math.PI * 6; t += 0.05) {
        const radius = (t / (Math.PI * 6)) * r * 0.95;
        const x = cx + Math.cos(t + offset) * radius;
        const y = cy + Math.sin(t + offset) * radius;
        if (t === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  private drawGrid(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, seed: number) {
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    const lines = 8;
    for (let i = -lines; i <= lines; i++) {
      const off = i * (r * 0.22);
      ctx.beginPath();
      ctx.moveTo(cx - r, cy + off);
      ctx.lineTo(cx + r, cy + off);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + off, cy - r);
      ctx.lineTo(cx + off, cy + r);
      ctx.stroke();
    }
  }

  private drawCrack(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, seed: number) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    const cracks = 14;
    for (let i = 0; i < cracks; i++) {
      const angle = (i / cracks) * Math.PI * 2 + seed * 0.01;
      const len = r * (0.3 + Math.random() * 0.6);
      ctx.beginPath();
      let px = cx;
      let py = cy;
      ctx.moveTo(px, py);
      const steps = 5;
      for (let s = 1; s <= steps; s++) {
        const curLen = (len * s) / steps;
        const wobble = (Math.random() - 0.5) * r * 0.15;
        px = cx + Math.cos(angle + wobble * 0.03) * curLen;
        py = cy + Math.sin(angle + wobble * 0.03) * curLen;
        ctx.lineTo(px, py);
        if (s === steps && Math.random() > 0.5) {
          ctx.moveTo(px, py);
          const branchAngle = angle + (Math.random() - 0.5) * Math.PI * 0.6;
          ctx.lineTo(
            px + Math.cos(branchAngle) * r * 0.2,
            py + Math.sin(branchAngle) * r * 0.2
          );
        }
      }
      ctx.stroke();
    }
  }

  startDrag() {
    if (this.orbit.active) {
      this.orbit.active = false;
      this.orbit.phaseIndex = -1;
      this.targetScale = 1.3;
    } else {
      this.targetScale = 1.2;
    }
    this.targetHaloRadius = this.baseRadius * 1.5;
    this.isDragging = true;
    this.isPulling = false;
  }

  endDrag() {
    this.isDragging = false;
    this.targetScale = 1;
    this.targetHaloRadius = this.baseRadius * 1.0;
  }

  update(dt: number, mouseX: number | null, mouseY: number | null, centerX: number, centerY: number) {
    const timeScale = dt / 16.67;

    if (this.isDragging && mouseX !== null && mouseY !== null) {
      this.x = mouseX;
      this.y = mouseY;
      this.baseX = this.x;
      this.baseY = this.y;
    } else if (this.orbit.active) {
      const distRatio = 0.5 + 0.5 * (this.orbit.a / 250);
      const baseSpeed = 0.004 / distRatio;
      this.orbit.phaseAngle += baseSpeed * timeScale;
      this.orbit.phaseAngle = this.orbit.phaseAngle % (Math.PI * 2);
      if (this.orbit.phaseAngle < 0) this.orbit.phaseAngle += Math.PI * 2;
      this.x = this.orbit.cx + Math.cos(this.orbit.phaseAngle) * this.orbit.a;
      this.y = this.orbit.cy + Math.sin(this.orbit.phaseAngle) * this.orbit.b;
      this.baseX = this.x;
      this.baseY = this.y;
    } else if (this.isPulling) {
      this.pullProgress += 0.06 * timeScale;
      if (this.pullProgress >= 1) {
        this.pullProgress = 1;
        this.isPulling = false;
        this.orbit.active = true;
        this.justPlaced = true;
        this.placeFlash = 1;
      }
      const tx = this.orbit.cx + Math.cos(this.orbit.phaseAngle) * this.orbit.a;
      const ty = this.orbit.cy + Math.sin(this.orbit.phaseAngle) * this.orbit.b;
      const t = this.easeInOutCubic(this.pullProgress);
      this.x = this.pullStartX + (tx - this.pullStartX) * t;
      this.y = this.pullStartY + (ty - this.pullStartY) * t;
      this.baseX = this.x;
      this.baseY = this.y;
    } else {
      this.floatPhase += this.floatSpeed * timeScale;
      this.y = this.baseY + Math.sin(this.floatPhase) * this.floatAmp;
    }

    this.rotation += this.rotationSpeed * timeScale;

    this.dragScale += (this.targetScale - this.dragScale) * 0.15 * timeScale;
    this.haloRadius += (this.targetHaloRadius - this.haloRadius) * 0.12 * timeScale;
    this.radius = this.baseRadius * this.dragScale;

    if (this.placeFlash > 0) {
      this.placeFlash -= dt * 0.001;
      if (this.placeFlash <= 0) this.placeFlash = 0;
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  distanceTo(px: number, py: number): number {
    const dx = this.x - px;
    const dy = this.y - py;
    return Math.sqrt(dx * dx + dy * dy);
  }

  containsPoint(px: number, py: number): boolean {
    return this.distanceTo(px, py) <= this.radius + 4;
  }

  pullToOrbit(cx: number, cy: number, a: number, b: number, phaseAngle: number, phaseIndex: number) {
    this.isPulling = true;
    this.pullProgress = 0;
    this.pullStartX = this.x;
    this.pullStartY = this.y;
    this.targetScale = 1;
    this.targetHaloRadius = this.baseRadius * 1.0;
    this.orbit = {
      active: false,
      phaseAngle,
      phaseIndex,
      a,
      b,
      speed: 0.005,
      cx,
      cy
    };
  }

  draw(ctx: CanvasRenderingContext2D, mouseX: number | null, mouseY: number | null) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const haloAlpha = 0.2 + this.placeFlash * 0.3;
    const haloGrad = ctx.createRadialGradient(0, 0, this.radius * 0.6, 0, 0, this.haloRadius * 1.8);
    haloGrad.addColorStop(0, `rgba(${this.mainColorRgb.r},${this.mainColorRgb.g},${this.mainColorRgb.b},${0.35 * haloAlpha + 0.15})`);
    haloGrad.addColorStop(0.5, `rgba(${this.mainColorRgb.r},${this.mainColorRgb.g},${this.mainColorRgb.b},${0.15 * haloAlpha})`);
    haloGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(0, 0, this.haloRadius * 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.rotate(this.rotation);
    const texSize = this.textureCanvas.width;
    const drawR = this.radius * 1.02;
    ctx.drawImage(
      this.textureCanvas,
      0, 0, texSize, texSize,
      -drawR, -drawR, drawR * 2, drawR * 2
    );
    ctx.restore();

    if (this.isDragging && mouseX !== null && mouseY !== null) {
      const dx = mouseX - this.x;
      const dy = mouseY - this.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const hx = (dx / len) * this.radius * 0.45;
      const hy = (dy / len) * this.radius * 0.45;
      const highlightGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, this.radius);
      highlightGrad.addColorStop(0, 'rgba(255,255,255,0.55)');
      highlightGrad.addColorStop(0.25, 'rgba(255,255,255,0.25)');
      highlightGrad.addColorStop(0.6, 'rgba(255,255,255,0.05)');
      highlightGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = highlightGrad;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const hx = -this.radius * 0.32;
      const hy = -this.radius * 0.32;
      const highlightGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, this.radius * 1.1);
      highlightGrad.addColorStop(0, 'rgba(255,255,255,0.35)');
      highlightGrad.addColorStop(0.3, 'rgba(255,255,255,0.12)');
      highlightGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = highlightGrad;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  getPhaseIndex(): number {
    return this.orbit.phaseIndex;
  }

  isInOrbit(): boolean {
    return this.orbit.active;
  }
}
