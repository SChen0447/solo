export type StepType = 'tear' | 'stain' | 'character';

export interface DamageRegion {
  id: string;
  type: StepType;
  pixels: Set<string>;
  repairedPixels: Set<string>;
  bounds: { x: number; y: number; w: number; h: number };
  repaired: boolean;
  points: { x: number; y: number }[];
}

export interface ScrollState {
  currentStep: StepType;
  stepIndex: number;
  totalProgress: number;
  stepProgress: number;
  damageRegions: DamageRegion[];
}

const SCALE = 2;

function pixelKey(x: number, y: number): string {
  return `${x},${y}`;
}

function parsePixelKey(key: string): { x: number; y: number } {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export class AncientScroll {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private displayWidth: number = 0;
  private displayHeight: number = 0;
  private bufferWidth: number = 0;
  private bufferHeight: number = 0;

  private baseCanvas: HTMLCanvasElement;
  private baseCtx: CanvasRenderingContext2D;

  private repairCanvas: HTMLCanvasElement;
  private repairCtx: CanvasRenderingContext2D;

  private stainCanvas: HTMLCanvasElement;
  private stainCtx: CanvasRenderingContext2D;

  private tearCanvas: HTMLCanvasElement;
  private tearCtx: CanvasRenderingContext2D;

  private charCanvas: HTMLCanvasElement;
  private charCtx: CanvasRenderingContext2D;

  private isDrawing: boolean = false;
  private lastX: number = 0;
  private lastY: number = 0;

  private state: ScrollState;
  private onProgressChange?: (state: ScrollState) => void;
  private onStepComplete?: (stepIndex: number) => void;
  private onRepairSpark?: (x: number, y: number) => void;

  private rafId: number = 0;
  private needsRender: boolean = true;

  private random: () => number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not supported');
    this.ctx = ctx;

    this.baseCanvas = document.createElement('canvas');
    this.baseCtx = this.baseCanvas.getContext('2d')!;

    this.repairCanvas = document.createElement('canvas');
    this.repairCtx = this.repairCanvas.getContext('2d')!;

    this.stainCanvas = document.createElement('canvas');
    this.stainCtx = this.stainCanvas.getContext('2d')!;

    this.tearCanvas = document.createElement('canvas');
    this.tearCtx = this.tearCanvas.getContext('2d')!;

    this.charCanvas = document.createElement('canvas');
    this.charCtx = this.charCanvas.getContext('2d')!;

    this.random = seededRandom(42);

    this.state = {
      currentStep: 'tear',
      stepIndex: 0,
      totalProgress: 0,
      stepProgress: 0,
      damageRegions: []
    };
  }

  setOnProgressChange(callback: (state: ScrollState) => void): void {
    this.onProgressChange = callback;
  }

  setOnStepComplete(callback: (stepIndex: number) => void): void {
    this.onStepComplete = callback;
  }

  setOnRepairSpark(callback: (x: number, y: number) => void): void {
    this.onRepairSpark = callback;
  }

  getState(): ScrollState {
    return { ...this.state };
  }

  init(): void {
    this.resize();
    this.generateBaseTexture();
    this.generateDamageRegions();
    this.renderDamageLayers();
    this.bindEvents();
    this.startRenderLoop();
  }

  setStep(stepIndex: number): void {
    const steps: StepType[] = ['tear', 'stain', 'character'];
    if (stepIndex < 0 || stepIndex >= steps.length) return;
    this.state.stepIndex = stepIndex;
    this.state.currentStep = steps[stepIndex];
    this.updateStepProgress();
    this.needsRender = true;
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.displayWidth = rect.width;
    this.displayHeight = rect.height;

    this.bufferWidth = Math.floor(rect.width * SCALE);
    this.bufferHeight = Math.floor(rect.height * SCALE);

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.ctx.scale(dpr, dpr);

    [this.baseCanvas, this.repairCanvas, this.stainCanvas, this.tearCanvas, this.charCanvas].forEach(c => {
      c.width = this.bufferWidth;
      c.height = this.bufferHeight;
    });

    this.needsRender = true;
  }

  private generateBaseTexture(): void {
    const ctx = this.baseCtx;
    const w = this.bufferWidth;
    const h = this.bufferHeight;

    ctx.fillStyle = '#E8D5B7';
    ctx.fillRect(0, 0, w, h);

    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 20;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 0.9));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.7));
    }

    ctx.putImageData(imageData, 0, 0);

    for (let i = 0; i < 500; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const len = 20 + Math.random() * 80;
      const angle = Math.random() * Math.PI;
      const alpha = 0.05 + Math.random() * 0.1;

      ctx.strokeStyle = `rgba(180, 150, 100, ${alpha})`;
      ctx.lineWidth = 0.5 + Math.random() * 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }

    for (let i = 0; i < 8; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const radius = 30 + Math.random() * 100;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(200, 170, 120, 0.08)');
      gradient.addColorStop(1, 'rgba(200, 170, 120, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
  }

  private generateDamageRegions(): void {
    const regions: DamageRegion[] = [];
    const w = this.bufferWidth;
    const h = this.bufferHeight;

    const tearCount = 3 + Math.floor(this.random() * 3);
    for (let i = 0; i < tearCount; i++) {
      const region = this.generateTearRegion(i, w, h);
      regions.push(region);
    }

    const stainCount = 6 + Math.floor(this.random() * 5);
    for (let i = 0; i < stainCount; i++) {
      const region = this.generateStainRegion(i, w, h);
      regions.push(region);
    }

    const charCount = 5 + Math.floor(this.random() * 4);
    for (let i = 0; i < charCount; i++) {
      const region = this.generateCharacterRegion(i, w, h);
      regions.push(region);
    }

    this.state.damageRegions = regions;
  }

  private generateTearRegion(id: number, w: number, h: number): DamageRegion {
    const pixels = new Set<string>();
    const points: { x: number; y: number }[] = [];

    const startX = 0.1 + this.random() * 0.8;
    const startY = 0.05 + this.random() * 0.3;
    const endX = 0.1 + this.random() * 0.8;
    const endY = 0.7 + this.random() * 0.25;

    const x1 = startX * w;
    const y1 = startY * h;
    const x2 = endX * w;
    const y2 = endY * h;

    const segments = 20 + Math.floor(this.random() * 15);
    let prevX = x1;
    let prevY = y1;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const baseX = x1 + (x2 - x1) * t;
      const baseY = y1 + (y2 - y1) * t;
      const offset = (this.random() - 0.5) * 30;
      const angle = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;

      const px = baseX + Math.cos(angle) * offset;
      const py = baseY + Math.sin(angle) * offset;
      points.push({ x: px, y: py });

      if (i > 0) {
        this.drawThickLine(prevX, prevY, px, py, 14 + this.random() * 10, pixels);
      }
      prevX = px;
      prevY = py;
    }

    const bounds = this.computeBounds(pixels);

    return {
      id: `tear-${id}`,
      type: 'tear',
      pixels,
      repairedPixels: new Set<string>(),
      bounds,
      repaired: false,
      points
    };
  }

  private generateStainRegion(id: number, w: number, h: number): DamageRegion {
    const pixels = new Set<string>();

    const cx = (0.1 + this.random() * 0.8) * w;
    const cy = (0.1 + this.random() * 0.8) * h;
    const radius = 15 + this.random() * 40;

    for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
      const r = radius * (0.6 + this.random() * 0.8);

      for (let dx = -r; dx <= r; dx += 1) {
        for (let dy = -r; dy <= r; dy += 1) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= r * (0.5 + this.random() * 0.5)) {
            const px = Math.floor(cx + dx);
            const py = Math.floor(cy + dy);
            if (px >= 0 && px < w && py >= 0 && py < h) {
              pixels.add(pixelKey(px, py));
            }
          }
        }
      }
    }

    const bounds = this.computeBounds(pixels);
    const points: { x: number; y: number }[] = [{ x: cx, y: cy }];

    return {
      id: `stain-${id}`,
      type: 'stain',
      pixels,
      repairedPixels: new Set<string>(),
      bounds,
      repaired: false,
      points
    };
  }

  private generateCharacterRegion(id: number, w: number, h: number): DamageRegion {
    const pixels = new Set<string>();

    const cx = (0.15 + this.random() * 0.7) * w;
    const cy = (0.15 + this.random() * 0.7) * h;
    const charSize = 40 + this.random() * 30;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCanvas.width = charSize * 1.5;
    tempCanvas.height = charSize * 1.5;

    const chars = ['文', '澜', '古', '籍', '修', '复', '珍', '藏', '墨', '韵'];
    const char = chars[Math.floor(this.random() * chars.length)];

    tempCtx.fillStyle = '#000';
    tempCtx.font = `${charSize}px "KaiTi", "楷体", serif`;
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'middle';
    tempCtx.fillText(char, tempCanvas.width / 2, tempCanvas.height / 2);

    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;

    for (let py = 0; py < tempCanvas.height; py++) {
      for (let px = 0; px < tempCanvas.width; px++) {
        const idx = (py * tempCanvas.width + px) * 4;
        if (data[idx + 3] > 50) {
          const destX = Math.floor(cx - tempCanvas.width / 2 + px);
          const destY = Math.floor(cy - tempCanvas.height / 2 + py);
          if (destX >= 0 && destX < w && destY >= 0 && destY < h) {
            pixels.add(pixelKey(destX, destY));
          }
        }
      }
    }

    const bounds = this.computeBounds(pixels);
    const points: { x: number; y: number }[] = [{ x: cx, y: cy }];

    return {
      id: `char-${id}`,
      type: 'character',
      pixels,
      repairedPixels: new Set<string>(),
      bounds,
      repaired: false,
      points
    };
  }

  private drawThickLine(x1: number, y1: number, x2: number, y2: number, thickness: number, pixels: Set<string>): void {
    const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const steps = Math.max(1, Math.ceil(dist));

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const cx = x1 + (x2 - x1) * t;
      const cy = y1 + (y2 - y1) * t;

      for (let dx = -thickness; dx <= thickness; dx++) {
        for (let dy = -thickness; dy <= thickness; dy++) {
          if (dx * dx + dy * dy <= thickness * thickness) {
            const px = Math.floor(cx + dx);
            const py = Math.floor(cy + dy);
            pixels.add(pixelKey(px, py));
          }
        }
      }
    }
  }

  private computeBounds(pixels: Set<string>): { x: number; y: number; w: number; h: number } {
    if (pixels.size === 0) return { x: 0, y: 0, w: 0, h: 0 };

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    pixels.forEach(key => {
      const { x, y } = parsePixelKey(key);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });

    return {
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY
    };
  }

  private renderDamageLayers(): void {
    this.renderTearLayer();
    this.renderStainLayer();
    this.renderCharacterLayer();
  }

  private renderTearLayer(): void {
    const ctx = this.tearCtx;
    const w = this.bufferWidth;
    const h = this.bufferHeight;

    ctx.clearRect(0, 0, w, h);

    const tearRegions = this.state.damageRegions.filter(r => r.type === 'tear' && !r.repaired);

    tearRegions.forEach(region => {
      if (region.points.length < 2) return;

      ctx.save();
      ctx.strokeStyle = '#5D4037';
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      ctx.beginPath();
      ctx.moveTo(region.points[0].x, region.points[0].y);
      for (let i = 1; i < region.points.length; i++) {
        ctx.lineTo(region.points[i].x, region.points[i].y);
      }
      ctx.stroke();

      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#3E2723';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(region.points[0].x, region.points[0].y);
      for (let i = 1; i < region.points.length; i++) {
        ctx.lineTo(region.points[i].x, region.points[i].y);
      }
      ctx.stroke();

      ctx.restore();
    });
  }

  private renderStainLayer(): void {
    const ctx = this.stainCtx;
    const w = this.bufferWidth;
    const h = this.bufferHeight;

    ctx.clearRect(0, 0, w, h);

    const stainRegions = this.state.damageRegions.filter(r => r.type === 'stain' && !r.repaired);

    stainRegions.forEach(region => {
      const cx = region.bounds.x + region.bounds.w / 2;
      const cy = region.bounds.y + region.bounds.h / 2;
      const radius = Math.max(region.bounds.w, region.bounds.h) / 2;

      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      gradient.addColorStop(0, 'rgba(101, 67, 33, 0.55)');
      gradient.addColorStop(0.5, 'rgba(120, 80, 40, 0.35)');
      gradient.addColorStop(1, 'rgba(139, 90, 43, 0.1)');

      ctx.fillStyle = gradient;
      ctx.beginPath();

      const points = 30;
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const r = radius * (0.7 + Math.sin(angle * 3) * 0.15 + Math.cos(angle * 5) * 0.1);
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();
    });
  }

  private renderCharacterLayer(): void {
    const ctx = this.charCtx;
    const w = this.bufferWidth;
    const h = this.bufferHeight;

    ctx.clearRect(0, 0, w, h);

    const charRegions = this.state.damageRegions.filter(r => r.type === 'character' && !r.repaired);

    charRegions.forEach(region => {
      ctx.fillStyle = 'rgba(139, 90, 43, 0.6)';
      region.pixels.forEach(key => {
        const { x, y } = parsePixelKey(key);
        ctx.fillRect(x, y, 1, 1);
      });
    });
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));

    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  private getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;
    return {
      x: (clientX - rect.left) * (this.bufferWidth / this.displayWidth),
      y: (clientY - rect.top) * (this.bufferHeight / this.displayHeight)
    };
  }

  private handleMouseDown(e: MouseEvent): void {
    this.isDrawing = true;
    const { x, y } = this.getCanvasCoords(e);
    this.lastX = x;
    this.lastY = y;
    this.applyRepairAt(x, y);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDrawing) return;
    const { x, y } = this.getCanvasCoords(e);
    this.applyRepairLine(this.lastX, this.lastY, x, y);
    this.lastX = x;
    this.lastY = y;
  }

  private handleMouseUp(): void {
    this.isDrawing = false;
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 0) return;
    this.isDrawing = true;
    const { x, y } = this.getCanvasCoords(e.touches[0]);
    this.lastX = x;
    this.lastY = y;
    this.applyRepairAt(x, y);
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.isDrawing || e.touches.length === 0) return;
    const { x, y } = this.getCanvasCoords(e.touches[0]);
    this.applyRepairLine(this.lastX, this.lastY, x, y);
    this.lastX = x;
    this.lastY = y;
  }

  private handleTouchEnd(): void {
    this.isDrawing = false;
  }

  private applyRepairAt(x: number, y: number): void {
    const brushRadius = 12 * SCALE;
    this.applyRepairBrush(x, y, brushRadius);
  }

  private applyRepairLine(x1: number, y1: number, x2: number, y2: number): void {
    const brushRadius = 12 * SCALE;
    const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const steps = Math.max(1, Math.ceil(dist / 4));

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const cx = x1 + (x2 - x1) * t;
      const cy = y1 + (y2 - y1) * t;
      this.applyRepairBrush(cx, cy, brushRadius);
    }

    this.drawBrushStroke(x1, y1, x2, y2);
  }

  private drawBrushStroke(x1: number, y1: number, x2: number, y2: number): void {
    const ctx = this.repairCtx;
    ctx.save();
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.lineWidth = 12 * SCALE;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(212, 175, 55, 0.6)';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
    this.needsRender = true;
  }

  private applyRepairBrush(cx: number, cy: number, radius: number): void {
    const currentType = this.state.currentStep;
    let progressed = false;

    this.state.damageRegions.forEach(region => {
      if (region.type !== currentType || region.repaired) return;

      const bx = region.bounds.x;
      const by = region.bounds.y;
      const bw = region.bounds.w;
      const bh = region.bounds.h;

      if (cx + radius < bx || cx - radius > bx + bw || cy + radius < by || cy - radius > by + bh) {
        return;
      }

      const r2 = radius * radius;
      let repaired = false;

      region.pixels.forEach(key => {
        if (region.repairedPixels.has(key)) return;
        const { x, y } = parsePixelKey(key);
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r2) {
          region.repairedPixels.add(key);
          repaired = true;
        }
      });

      if (repaired) {
        progressed = true;
        const ratio = region.repairedPixels.size / region.pixels.size;
        if (ratio >= 0.8 && !region.repaired) {
          region.repaired = true;
          this.triggerRepairSpark(region);
          this.updateDamageLayer(region.type);
        }
      }
    });

    if (progressed) {
      this.updateStepProgress();
    }
  }

  private triggerRepairSpark(region: DamageRegion): void {
    if (!this.onRepairSpark) return;

    const sparkCount = 8;
    for (let i = 0; i < sparkCount; i++) {
      setTimeout(() => {
        const cx = region.bounds.x + region.bounds.w / 2;
        const cy = region.bounds.y + region.bounds.h / 2;
        const offsetX = (Math.random() - 0.5) * region.bounds.w * 0.8;
        const offsetY = (Math.random() - 0.5) * region.bounds.h * 0.8;

        const displayX = (cx + offsetX) / SCALE;
        const displayY = (cy + offsetY) / SCALE;

        this.onRepairSpark?.(displayX, displayY);
      }, i * 50);
    }
  }

  private updateDamageLayer(type: StepType): void {
    switch (type) {
      case 'tear':
        this.renderTearLayer();
        break;
      case 'stain':
        this.renderStainLayer();
        break;
      case 'character':
        this.renderCharacterLayer();
        break;
    }
    this.needsRender = true;
  }

  private updateStepProgress(): void {
    const currentType = this.state.currentStep;
    const typeRegions = this.state.damageRegions.filter(r => r.type === currentType);

    if (typeRegions.length === 0) return;

    let totalPixels = 0;
    let repairedPixels = 0;

    typeRegions.forEach(region => {
      totalPixels += region.pixels.size;
      repairedPixels += region.repairedPixels.size;
    });

    const stepProgress = totalPixels > 0 ? Math.min(1, repairedPixels / totalPixels) : 0;
    this.state.stepProgress = stepProgress;
    this.state.totalProgress = (this.state.stepIndex + stepProgress) / 3;

    this.onProgressChange?.(this.getState());

    const allRepaired = typeRegions.every(r => r.repaired);
    if (allRepaired && this.state.stepIndex < 2) {
      this.onStepComplete?.(this.state.stepIndex);
    }
  }

  private startRenderLoop(): void {
    const loop = () => {
      if (this.needsRender) {
        this.render();
        this.needsRender = false;
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private render(): void {
    const ctx = this.ctx;
    const w = this.displayWidth;
    const h = this.displayHeight;

    ctx.clearRect(0, 0, w, h);

    ctx.drawImage(this.baseCanvas, 0, 0, this.bufferWidth, this.bufferHeight, 0, 0, w, h);

    if (this.state.currentStep === 'stain') {
      ctx.drawImage(this.stainCanvas, 0, 0, this.bufferWidth, this.bufferHeight, 0, 0, w, h);
    }
    if (this.state.currentStep === 'tear') {
      ctx.drawImage(this.tearCanvas, 0, 0, this.bufferWidth, this.bufferHeight, 0, 0, w, h);
    }
    if (this.state.currentStep === 'character') {
      ctx.drawImage(this.charCanvas, 0, 0, this.bufferWidth, this.bufferHeight, 0, 0, w, h);
    }

    ctx.drawImage(this.repairCanvas, 0, 0, this.bufferWidth, this.bufferHeight, 0, 0, w, h);
  }

  clearRepairLayer(): void {
    this.repairCtx.clearRect(0, 0, this.bufferWidth, this.bufferHeight);
    this.needsRender = true;
  }

  destroy(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }
}
