export type SignShape = 'rect' | 'circle' | 'star' | 'text';
export type AnimationMode = 'static' | 'breathe' | 'chase';

interface HandleInfo {
  type: 'corner' | 'edge';
  index: number;
  x: number;
  y: number;
}

const HANDLE_SIZE = 8;
const MIN_SIZE = 40;
const SPRING_STIFFNESS = 0.15;
const SPRING_DAMPING = 0.7;

export class NeonSign {
  id: string;
  shape: SignShape;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number = 0;
  borderColor: string = '#00ffff';
  borderWidth: number = 3;
  fillColor: string = 'rgba(0, 20, 40, 0.6)';
  animationMode: AnimationMode = 'static';
  breathePeriod: number = 2;
  chaseSpeed: number = 1;
  text: string = 'NEON';
  fontFamily: string = 'futuristic';
  fontSize: number = 32;

  selected: boolean = false;
  editing: boolean = false;

  private dragOffsetX: number = 0;
  private dragOffsetY: number = 0;
  private isDragging: boolean = false;
  private isResizing: boolean = false;
  private isRotating: boolean = false;
  private activeHandle: HandleInfo | null = null;
  private resizeStartW: number = 0;
  private resizeStartH: number = 0;
  private resizeStartDist: number = 0;
  private rotateStartAngle: number = 0;
  private rotateStartRotation: number = 0;

  private springVx: number = 0;
  private springVy: number = 0;
  private targetX: number = 0;
  private targetY: number = 0;
  private springActive: boolean = false;

  private glowIntensity: number = 1.0;
  private animationTime: number = 0;
  private transitionPhase: 'none' | 'off' | 'on' = 'none';
  private transitionTimer: number = 0;
  private pendingMode: AnimationMode | null = null;

  private chaseProgress: number = 0;

  constructor(shape: SignShape, x: number, y: number) {
    this.id = `sign_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.shape = shape;
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;

    if (shape === 'circle') {
      this.width = 100;
      this.height = 100;
    } else if (shape === 'star') {
      this.width = 100;
      this.height = 100;
    } else if (shape === 'text') {
      this.width = 160;
      this.height = 60;
    } else {
      this.width = 120;
      this.height = 80;
    }
  }

  setAnimationMode(mode: AnimationMode): void {
    if (mode === this.animationMode && this.transitionPhase === 'none') return;
    this.pendingMode = mode;
    this.transitionPhase = 'off';
    this.transitionTimer = 0;
  }

  update(deltaTime: number, time: number): void {
    const dt = deltaTime / 1000;
    this.animationTime = time;

    if (this.springActive) {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      this.springVx = (this.springVx + dx * SPRING_STIFFNESS) * SPRING_DAMPING;
      this.springVy = (this.springVy + dy * SPRING_STIFFNESS) * SPRING_DAMPING;
      this.x += this.springVx;
      this.y += this.springVy;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(this.springVx) < 0.5 && Math.abs(this.springVy) < 0.5) {
        this.x = this.targetX;
        this.y = this.targetY;
        this.springActive = false;
      }
    }

    if (this.transitionPhase === 'off') {
      this.transitionTimer += dt;
      this.glowIntensity = Math.max(0, 1 - this.transitionTimer / 0.3);
      if (this.transitionTimer >= 0.3) {
        this.glowIntensity = 0;
        if (this.pendingMode !== null) {
          this.animationMode = this.pendingMode;
          this.pendingMode = null;
        }
        this.transitionPhase = 'on';
        this.transitionTimer = 0;
      }
    } else if (this.transitionPhase === 'on') {
      this.transitionTimer += dt;
      this.glowIntensity = Math.min(1, this.transitionTimer / 0.3);
      if (this.transitionTimer >= 0.3) {
        this.glowIntensity = 1;
        this.transitionPhase = 'none';
      }
    } else {
      switch (this.animationMode) {
        case 'static':
          this.glowIntensity = 1.0;
          break;
        case 'breathe':
          this.glowIntensity = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin((time * Math.PI * 2) / this.breathePeriod));
          break;
        case 'chase':
          this.glowIntensity = 1.0;
          this.chaseProgress += dt * this.chaseSpeed;
          if (this.chaseProgress > 1) this.chaseProgress -= 1;
          break;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
    ctx.rotate(this.rotation);
    ctx.translate(-this.width / 2, -this.height / 2);

    const intensity = this.glowIntensity;
    const glowColor = this.borderColor;
    const rgb = this.hexToRgb(glowColor);

    ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${intensity * 0.8})`;
    ctx.shadowBlur = 20 * intensity;

    this.drawShape(ctx, rgb, intensity);

    if (this.animationMode === 'chase' && this.transitionPhase === 'none') {
      this.drawChaseEffect(ctx, rgb);
    }

    if (this.shape === 'text') {
      this.drawText(ctx, rgb, intensity);
    }

    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    if (this.selected) {
      this.drawHandles(ctx);
    }

    ctx.restore();
  }

  private drawShape(ctx: CanvasRenderingContext2D, rgb: { r: number; g: number; b: number }, intensity: number): void {
    const w = this.width;
    const h = this.height;
    const bw = this.borderWidth;

    ctx.fillStyle = `rgba(${Math.floor(rgb.r * 0.1)}, ${Math.floor(rgb.g * 0.1)}, ${Math.floor(rgb.b * 0.15)}, ${0.6 * intensity + 0.2})`;
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${intensity})`;
    ctx.lineWidth = bw;

    ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${intensity * 0.8})`;
    ctx.shadowBlur = 20 * intensity;

    switch (this.shape) {
      case 'rect':
        ctx.beginPath();
        ctx.rect(bw / 2, bw / 2, w - bw, h - bw);
        ctx.fill();
        ctx.stroke();
        break;
      case 'circle':
        ctx.beginPath();
        ctx.ellipse(w / 2, h / 2, Math.max(1, (w - bw) / 2), Math.max(1, (h - bw) / 2), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      case 'star':
        this.drawStar(ctx, w / 2, h / 2, 5, Math.max(1, (Math.min(w, h) - bw) / 2), Math.max(1, (Math.min(w, h) - bw) / 4));
        ctx.fill();
        ctx.stroke();
        break;
      case 'text':
        ctx.beginPath();
        ctx.rect(bw / 2, bw / 2, w - bw, h - bw);
        ctx.fill();
        ctx.stroke();
        break;
    }
  }

  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, points: number, outerR: number, innerR: number): void {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  private drawText(ctx: CanvasRenderingContext2D, rgb: { r: number; g: number; b: number }, intensity: number): void {
    const fontStr = this.getFontFamily();
    ctx.font = `${this.fontSize}px ${fontStr}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${intensity * 0.9})`;
    ctx.shadowBlur = 15 * intensity;
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${intensity})`;
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${intensity * 0.8})`;
    ctx.lineWidth = 1.5;
    ctx.strokeText(this.text, this.width / 2, this.height / 2);
    ctx.fillText(this.text, this.width / 2, this.height / 2);
  }

  private getFontFamily(): string {
    switch (this.fontFamily) {
      case 'futuristic': return "'Orbitron', 'Courier New', monospace";
      case 'pixel': return "'Press Start 2P', 'Courier New', monospace";
      case 'handwrite': return "'Pacifico', 'Segoe Script', cursive";
      default: return "'Courier New', monospace";
    }
  }

  private drawChaseEffect(ctx: CanvasRenderingContext2D, rgb: { r: number; g: number; b: number }): void {
    const perimeter = this.getPerimeter();
    const chasePos = this.chaseProgress;
    const dotCount = 3;
    const dotSpacing = 0.08;

    for (let i = 0; i < dotCount; i++) {
      const pos = (chasePos + i * dotSpacing) % 1;
      const point = this.getPointOnPerimeter(pos);
      ctx.save();
      ctx.shadowColor = `rgba(255, 255, 255, 0.9)`;
      ctx.shadowBlur = 25;
      ctx.fillStyle = `rgba(255, 255, 255, 0.9)`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, this.borderWidth + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`;
      ctx.shadowBlur = 35;
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, this.borderWidth + 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private getPerimeter(): number {
    switch (this.shape) {
      case 'circle':
        return Math.PI * (this.width + this.height);
      case 'rect':
      case 'text':
        return 2 * (this.width + this.height);
      case 'star':
        return 2 * Math.PI * this.width * 0.6;
      default:
        return 2 * (this.width + this.height);
    }
  }

  private getPointOnPerimeter(t: number): { x: number; y: number } {
    const w = this.width;
    const h = this.height;

    if (this.shape === 'circle') {
      const angle = t * Math.PI * 2;
      return {
        x: w / 2 + (w / 2) * Math.cos(angle),
        y: h / 2 + (h / 2) * Math.sin(angle),
      };
    }

    const perimeter = 2 * (w + h);
    let dist = t * perimeter;

    if (dist < w) return { x: dist, y: 0 };
    dist -= w;
    if (dist < h) return { x: w, y: dist };
    dist -= h;
    if (dist < w) return { x: w - dist, y: h };
    dist -= w;
    return { x: 0, y: h - dist };
  }

  private drawHandles(ctx: CanvasRenderingContext2D): void {
    const w = this.width;
    const h = this.height;
    const corners = [
      { x: 0, y: 0 }, { x: w, y: 0 },
      { x: w, y: h }, { x: 0, y: h },
    ];
    const edges = [
      { x: w / 2, y: 0 }, { x: w, y: h / 2 },
      { x: w / 2, y: h }, { x: 0, y: h / 2 },
    ];

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(0, 0, w, h);
    ctx.setLineDash([]);

    for (const c of corners) {
      ctx.fillStyle = '#00ffff';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 6;
      ctx.fillRect(c.x - HANDLE_SIZE / 2, c.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
    }

    for (const e of edges) {
      ctx.fillStyle = '#ff00ff';
      ctx.shadowColor = '#ff00ff';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(e.x, e.y, HANDLE_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }

  hitTest(mx: number, my: number): boolean {
    const local = this.globalToLocal(mx, my);
    const lx = local.x;
    const ly = local.y;
    if (this.shape === 'circle') {
      const cx = this.width / 2;
      const cy = this.height / 2;
      const rx = this.width / 2;
      const ry = this.height / 2;
      return ((lx - cx) / rx) ** 2 + ((ly - cy) / ry) ** 2 <= 1;
    }
    return lx >= 0 && lx <= this.width && ly >= 0 && ly <= this.height;
  }

  hitTestHandle(mx: number, my: number): HandleInfo | null {
    if (!this.selected) return null;
    const local = this.globalToLocal(mx, my);
    const w = this.width;
    const h = this.height;
    const threshold = HANDLE_SIZE + 4;

    const corners: HandleInfo[] = [
      { type: 'corner', index: 0, x: 0, y: 0 },
      { type: 'corner', index: 1, x: w, y: 0 },
      { type: 'corner', index: 2, x: w, y: h },
      { type: 'corner', index: 3, x: 0, y: h },
    ];
    const edges: HandleInfo[] = [
      { type: 'edge', index: 0, x: w / 2, y: 0 },
      { type: 'edge', index: 1, x: w, y: h / 2 },
      { type: 'edge', index: 2, x: w / 2, y: h },
      { type: 'edge', index: 3, x: 0, y: h / 2 },
    ];

    for (const e of edges) {
      if (Math.abs(local.x - e.x) < threshold && Math.abs(local.y - e.y) < threshold) {
        return e;
      }
    }
    for (const c of corners) {
      if (Math.abs(local.x - c.x) < threshold && Math.abs(local.y - c.y) < threshold) {
        return c;
      }
    }
    return null;
  }

  startDrag(mx: number, my: number): void {
    this.isDragging = true;
    this.dragOffsetX = mx - this.x;
    this.dragOffsetY = my - this.y;
    this.springActive = false;
  }

  drag(mx: number, my: number): void {
    if (!this.isDragging) return;
    this.x = mx - this.dragOffsetX;
    this.y = my - this.dragOffsetY;
  }

  endDrag(): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.targetX = this.x;
    this.targetY = this.y;
    this.springActive = false;
  }

  startResize(handle: HandleInfo, mx: number, my: number): void {
    this.isResizing = true;
    this.activeHandle = handle;
    this.resizeStartW = this.width;
    this.resizeStartH = this.height;
    const center = this.getCenter();
    this.resizeStartDist = Math.sqrt((mx - center.x) ** 2 + (my - center.y) ** 2);
  }

  doResize(mx: number, my: number): void {
    if (!this.isResizing || !this.activeHandle) return;
    const center = this.getCenter();
    const currentDist = Math.sqrt((mx - center.x) ** 2 + (my - center.y) ** 2);
    const scale = currentDist / Math.max(1, this.resizeStartDist);

    if (this.activeHandle.type === 'corner') {
      const newW = Math.max(MIN_SIZE, this.resizeStartW * scale);
      const newH = Math.max(MIN_SIZE, this.resizeStartH * scale);
      this.x = center.x - newW / 2;
      this.y = center.y - newH / 2;
      this.width = newW;
      this.height = newH;
    } else {
      const idx = this.activeHandle.index;
      if (idx === 0 || idx === 2) {
        const newH = Math.max(MIN_SIZE, this.resizeStartH * scale);
        this.y = center.y - newH / 2;
        this.height = newH;
      } else {
        const newW = Math.max(MIN_SIZE, this.resizeStartW * scale);
        this.x = center.x - newW / 2;
        this.width = newW;
      }
    }
  }

  endResize(): void {
    this.isResizing = false;
    this.activeHandle = null;
    this.targetX = this.x;
    this.targetY = this.y;
  }

  startRotate(handle: HandleInfo, mx: number, my: number): void {
    this.isRotating = true;
    this.activeHandle = handle;
    const center = this.getCenter();
    this.rotateStartAngle = Math.atan2(my - center.y, mx - center.x);
    this.rotateStartRotation = this.rotation;
  }

  doRotate(mx: number, my: number): void {
    if (!this.isRotating) return;
    const center = this.getCenter();
    const currentAngle = Math.atan2(my - center.y, mx - center.x);
    const targetRotation = this.rotateStartRotation + (currentAngle - this.rotateStartAngle);
    const diff = targetRotation - this.rotation;
    this.rotation += diff * 0.8;
  }

  endRotate(): void {
    this.isRotating = false;
    this.activeHandle = null;
  }

  getCenter(): { x: number; y: number } {
    return { x: this.x + this.width / 2, y: this.y + this.height / 2 };
  }

  private globalToLocal(gx: number, gy: number): { x: number; y: number } {
    const center = this.getCenter();
    const dx = gx - center.x;
    const dy = gy - center.y;
    const cos = Math.cos(-this.rotation);
    const sin = Math.sin(-this.rotation);
    return {
      x: dx * cos - dy * sin + this.width / 2,
      y: dx * sin + dy * cos + this.height / 2,
    };
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const shorthand = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthand, (_, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 0, g: 255, b: 255 };
  }

  isInteracting(): boolean {
    return this.isDragging || this.isResizing || this.isRotating;
  }
}
