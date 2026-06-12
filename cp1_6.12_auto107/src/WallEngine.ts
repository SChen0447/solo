export interface BlessingData {
  type: string;
  name: string;
  text: string;
  emoji: string;
  time: string;
}

interface BlessingItem {
  text: string;
  emoji: string;
  name: string;
  x: number;
  y: number;
  emojiSize: number;
  baseOpacity: number;
  fadeInStart: number;
  column: number;
}

export class WallEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private blessings: BlessingItem[] = [];
  private animationId: number = 0;
  private lastFrameTime: number = 0;
  private readonly FRAME_INTERVAL: number = 1000 / 33;
  private readonly FADE_DURATION: number = 500;
  private readonly SCROLL_SPEED: number = 1;
  private readonly ROW_HEIGHT: number = 64;
  private columns: number = 4;
  private columnWidth: number = 0;
  private dpr: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.columns = Math.max(2, Math.floor(w / 320));
    this.columnWidth = w / this.columns;
  }

  addBlessing(msg: BlessingData): void {
    const col = Math.floor(Math.random() * this.columns);
    const x = col * this.columnWidth + 20;
    const canvasH = this.canvas.clientHeight;
    const maxExistingY = this.getMaxYInColumn(col);
    const y = Math.max(canvasH + 10, maxExistingY + this.ROW_HEIGHT);

    const item: BlessingItem = {
      text: msg.text,
      emoji: msg.emoji,
      name: msg.name,
      x,
      y,
      emojiSize: 16 + Math.random() * 16,
      baseOpacity: 0.7 + Math.random() * 0.3,
      fadeInStart: performance.now(),
      column: col,
    };

    this.blessings.push(item);
  }

  private getMaxYInColumn(col: number): number {
    let maxY = -Infinity;
    for (const b of this.blessings) {
      if (b.column === col && b.y > maxY) {
        maxY = b.y;
      }
    }
    return maxY === -Infinity ? 0 : maxY;
  }

  start(): void {
    this.lastFrameTime = performance.now();
    this.loop();
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  private loop(): void {
    const now = performance.now();
    const elapsed = now - this.lastFrameTime;

    if (elapsed >= this.FRAME_INTERVAL) {
      this.update(now);
      this.render(now);
      this.lastFrameTime = now - (elapsed % this.FRAME_INTERVAL);
    }

    this.animationId = requestAnimationFrame(() => this.loop());
  }

  private update(_now: number): void {
    for (let i = this.blessings.length - 1; i >= 0; i--) {
      this.blessings[i].y -= this.SCROLL_SPEED;
      if (this.blessings[i].y < -80) {
        this.blessings.splice(i, 1);
      }
    }
  }

  private render(now: number): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    this.ctx.clearRect(0, 0, w, h);

    for (const item of this.blessings) {
      const fadeElapsed = now - item.fadeInStart;
      const fadeAlpha = Math.min(1, fadeElapsed / this.FADE_DURATION);
      const alpha = item.baseOpacity * fadeAlpha;

      this.ctx.globalAlpha = alpha;

      this.ctx.font = `${item.emojiSize}px serif`;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(item.emoji, item.x, item.y);

      const textX = item.x + item.emojiSize + 8;
      const maxTextWidth = this.columnWidth - item.emojiSize - 48;

      this.ctx.font = '18px "SimSun", "Songti SC", serif';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.textBaseline = 'middle';

      const lines = this.wrapText(item.text, maxTextWidth);
      let textY = item.y - ((lines.length - 1) * 24) / 2;

      for (const line of lines) {
        this.ctx.fillText(line, textX, textY);
        textY += 24;
      }

      this.ctx.font = '12px "SimSun", "Songti SC", serif';
      this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
      this.ctx.fillText(
        `—— ${item.name}`,
        textX,
        textY + 2
      );
    }

    this.ctx.globalAlpha = 1;
  }

  private wrapText(text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    let current = '';

    for (const char of text) {
      const test = current + char;
      const measured = this.ctx.measureText(test).width;
      if (measured > maxWidth && current.length > 0) {
        lines.push(current);
        current = char;
      } else {
        current = test;
      }
    }

    if (current) {
      lines.push(current);
    }

    return lines.length > 0 ? lines : [text];
  }
}
