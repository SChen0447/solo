import {
  GRID_SIZE,
  CELL_SIZE,
  BOARD_PIXEL,
  MERGE_PULSE_DURATION,
  type Stone
} from './board';

const ATTRACTION_THRESHOLD = 120;
const GLOW_BORDER_THICKNESS = 8;

interface Star {
  x: number;
  y: number;
  baseRadius: number;
  phase: number;
  period: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private dpr: number = 1;
  private stars: Star[] = [];
  private boardX: number = 0;
  private boardY: number = 0;
  private fading: boolean = false;
  private fadeAlpha: number = 1;
  private fadeStartTime: number = 0;
  private fadeDirection: 'out' | 'in' = 'out';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
    this.resize();
    this.generateStars();
  }

  resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.calculateBoardPosition(rect.width, rect.height);
    this.generateStars();
  }

  private calculateBoardPosition(viewW: number, viewH: number): void {
    const boardAreaRatio = 0.7;
    const maxSize = Math.min(viewW, viewH - 60) * boardAreaRatio;
    const size = Math.max(BOARD_PIXEL, maxSize);
    this.boardX = (viewW - size) / 2;
    this.boardY = (viewH - 60 - size) / 2;
  }

  getBoardPosition(): { x: number; y: number; size: number } {
    const rect = this.canvas.getBoundingClientRect();
    const boardAreaRatio = 0.7;
    const maxSize = Math.min(rect.width, rect.height - 60) * boardAreaRatio;
    const size = Math.max(BOARD_PIXEL, maxSize);
    return { x: this.boardX, y: this.boardY, size };
  }

  private generateStars(): void {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height - 60;
    const starCount = Math.floor((w * h) / 4000);
    this.stars = [];
    for (let i = 0; i < starCount; i++) {
      this.stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        baseRadius: Math.random() * 1.2 + 0.3,
        phase: Math.random() * Math.PI * 2,
        period: 2000 + Math.random() * 2000
      });
    }
  }

  triggerResetFade(): void {
    this.fading = true;
    this.fadeStartTime = performance.now();
    this.fadeDirection = 'out';
    this.fadeAlpha = 1;
  }

  private updateFade(now: number): boolean {
    if (!this.fading) return false;
    const elapsed = now - this.fadeStartTime;
    const duration = 300;
    if (this.fadeDirection === 'out') {
      this.fadeAlpha = Math.max(0, 1 - elapsed / duration);
      if (elapsed >= duration) {
        this.fadeDirection = 'in';
        this.fadeStartTime = now;
        this.fadeAlpha = 0;
        return true;
      }
    } else {
      this.fadeAlpha = Math.min(1, elapsed / duration);
      if (elapsed >= duration) {
        this.fading = false;
        this.fadeAlpha = 1;
      }
    }
    return false;
  }

  render(
    stones: Stone[],
    now: number
  ): { shouldClear: boolean } {
    const shouldClearMidFade = this.updateFade(now);
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height - 60;
    const ctx = this.ctx;

    ctx.save();
    ctx.globalAlpha = this.fadeAlpha;

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, w, h);

    this.renderStars(now, w, h);

    const { x: bx, y: by, size } = this.getBoardPosition();
    const scale = size / BOARD_PIXEL;

    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(scale, scale);

    this.renderBoardBase();
    this.renderBoardGlowBorder();
    this.renderGrid();
    this.renderConnections(stones);
    this.renderStones(stones, now);

    ctx.restore();
    ctx.restore();

    return { shouldClear: shouldClearMidFade };
  }

  private renderStars(now: number, w: number, h: number): void {
    const ctx = this.ctx;
    for (const star of this.stars) {
      if (star.x < 0 || star.x > w || star.y < 0 || star.y > h) continue;
      const t = (now / star.period + star.phase) * Math.PI * 2;
      const brightness = 0.3 + (Math.sin(t) + 1) * 0.35;
      const alpha = Math.max(0.15, Math.min(0.9, brightness));
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.baseRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 210, 255, ${alpha})`;
      ctx.fill();
    }
  }

  private renderBoardBase(): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#0B0E14';
    ctx.fillRect(0, 0, BOARD_PIXEL, BOARD_PIXEL);
  }

  private renderBoardGlowBorder(): void {
    const ctx = this.ctx;
    const t = GLOW_BORDER_THICKNESS;

    const gradTop = ctx.createLinearGradient(0, 0, 0, t);
    gradTop.addColorStop(0, 'rgba(30, 58, 95, 0.9)');
    gradTop.addColorStop(1, 'rgba(30, 58, 95, 0)');
    ctx.fillStyle = gradTop;
    ctx.fillRect(0, 0, BOARD_PIXEL, t);

    const gradBottom = ctx.createLinearGradient(0, BOARD_PIXEL - t, 0, BOARD_PIXEL);
    gradBottom.addColorStop(0, 'rgba(30, 58, 95, 0)');
    gradBottom.addColorStop(1, 'rgba(30, 58, 95, 0.9)');
    ctx.fillStyle = gradBottom;
    ctx.fillRect(0, BOARD_PIXEL - t, BOARD_PIXEL, t);

    const gradLeft = ctx.createLinearGradient(0, 0, t, 0);
    gradLeft.addColorStop(0, 'rgba(30, 58, 95, 0.9)');
    gradLeft.addColorStop(1, 'rgba(30, 58, 95, 0)');
    ctx.fillStyle = gradLeft;
    ctx.fillRect(0, 0, t, BOARD_PIXEL);

    const gradRight = ctx.createLinearGradient(BOARD_PIXEL - t, 0, BOARD_PIXEL, 0);
    gradRight.addColorStop(0, 'rgba(30, 58, 95, 0)');
    gradRight.addColorStop(1, 'rgba(30, 58, 95, 0.9)');
    ctx.fillStyle = gradRight;
    ctx.fillRect(BOARD_PIXEL - t, 0, t, BOARD_PIXEL);
  }

  private renderGrid(): void {
    const ctx = this.ctx;
    ctx.strokeStyle = '#2A3A5C';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= GRID_SIZE; i++) {
      const p = i * CELL_SIZE + 0.5;
      ctx.moveTo(p, 0);
      ctx.lineTo(p, BOARD_PIXEL);
      ctx.moveTo(0, p);
      ctx.lineTo(BOARD_PIXEL, p);
    }
    ctx.stroke();
  }

  private renderConnections(stones: Stone[]): void {
    const ctx = this.ctx;
    const n = stones.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = stones[i];
        const b = stones[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist >= ATTRACTION_THRESHOLD) continue;

        const distRatio = dist / ATTRACTION_THRESHOLD;
        const width = Math.max(0.5, 2.5 * (1 - distRatio));
        const alpha = 0.1 + 0.3 * (1 - distRatio);

        const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        grad.addColorStop(0, `rgba(99, 102, 241, ${alpha})`);
        grad.addColorStop(1, `rgba(139, 92, 246, ${alpha})`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = width;
        ctx.shadowColor = `rgba(99, 102, 241, ${alpha * 0.6})`;
        ctx.shadowBlur = 8 * (1 - distRatio);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
  }

  private renderStones(stones: Stone[], now: number): void {
    const ctx = this.ctx;
    for (const s of stones) {
      let radius = s.radius;
      let pulseScale = 1;

      if (s.merged) {
        const elapsed = now - s.mergeTime;
        const t = Math.min(1, elapsed / MERGE_PULSE_DURATION);
        const easeT = 1 - Math.pow(1 - t, 3);
        pulseScale = 1 + Math.sin(easeT * Math.PI) * 0.35;
        radius = s.radius * pulseScale;
      }

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.375)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;

      const grad = ctx.createRadialGradient(
        s.x - radius * 0.3, s.y - radius * 0.3, radius * 0.1,
        s.x, s.y, radius
      );

      if (s.merged) {
        grad.addColorStop(0, '#F59E0B');
        grad.addColorStop(1, '#EF4444');
      } else {
        grad.addColorStop(0, '#E0E7FF');
        grad.addColorStop(1, '#6B7280');
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
      ctx.fill();

      if (s.merged) {
        ctx.shadowBlur = 0;
        const glow = ctx.createRadialGradient(s.x, s.y, radius * 0.6, s.x, s.y, radius * 1.8);
        glow.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
        glow.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(s.x, s.y, radius * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}
