export interface TrackNode {
  x: number;
  y: number;
  opacity: number;
  createdAt: number;
}

const NODE_SPACING = 20;
const NODE_RADIUS = 3;
const TRACK_DURATION = 5000;
const FADE_OUT_DURATION = 2000;
const RETAIN_AFTER_RELEASE = 1000;
const MAX_NODES = 300;

export class Track {
  nodes: TrackNode[] = [];
  private isDrawing: boolean = false;
  private releasedAt: number = 0;
  private isReleased: boolean = false;
  private fadeStartTime: number = 0;
  isFullyFaded: boolean = false;
  pathLength: number = 0;

  startDrawing(): void {
    this.isDrawing = true;
    this.isReleased = false;
    this.isFullyFaded = false;
    this.fadeStartTime = 0;
  }

  stopDrawing(): void {
    this.isDrawing = false;
    this.isReleased = true;
    this.releasedAt = performance.now();
  }

  get drawing(): boolean {
    return this.isDrawing;
  }

  addNode(x: number, y: number, now: number): void {
    if (!this.isDrawing) return;
    if (this.nodes.length >= MAX_NODES) return;

    if (this.nodes.length > 0) {
      const last = this.nodes[this.nodes.length - 1];
      const dx = x - last.x;
      const dy = y - last.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < NODE_SPACING) return;
      this.pathLength += dist;
    }

    this.nodes.push({
      x,
      y,
      opacity: 1,
      createdAt: now,
    });
  }

  update(now: number, _dt: number): void {
    if (this.nodes.length === 0) {
      this.isFullyFaded = true;
      return;
    }

    if (this.isReleased) {
      if (this.fadeStartTime === 0 && now - this.releasedAt >= RETAIN_AFTER_RELEASE) {
        this.fadeStartTime = now;
      }
    } else {
      const oldestTime = this.nodes[0].createdAt;
      if (now - oldestTime > TRACK_DURATION) {
        this.fadeStartTime = now - (now - oldestTime - TRACK_DURATION);
      }
    }

    if (this.fadeStartTime > 0) {
      const elapsed = now - this.fadeStartTime;
      for (let i = 0; i < this.nodes.length; i++) {
        const nodeAge = (elapsed / FADE_OUT_DURATION) - (i / this.nodes.length) * FADE_OUT_DURATION;
        if (nodeAge > 0) {
          this.nodes[i].opacity = Math.max(0, 1 - nodeAge);
        }
      }
    }

    while (this.nodes.length > 0 && this.nodes[0].opacity <= 0) {
      this.nodes.shift();
      if (this.fadeStartTime > 0) {
        this.fadeStartTime += 0;
      }
    }

    this.isFullyFaded = this.nodes.length === 0 && (this.isReleased || this.fadeStartTime > 0);
  }

  getNodeColor(index: number): string {
    if (this.nodes.length <= 1) return '#ff9ff3';
    const t = index / (this.nodes.length - 1);
    const r = Math.round(255 * (1 - t) + 72 * t);
    const g = Math.round(159 * (1 - t) + 219 * t);
    const b = Math.round(243 * (1 - t) + 251 * t);
    return `rgb(${r},${g},${b})`;
  }

  render(ctx: CanvasRenderingContext2D, now: number): void {
    if (this.nodes.length === 0) return;

    ctx.save();
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      if (node.opacity <= 0) continue;

      const color = this.getNodeColor(i);
      ctx.globalAlpha = node.opacity;

      ctx.shadowColor = color;
      ctx.shadowBlur = 6;

      ctx.beginPath();
      ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }

    if (this.nodes.length > 1) {
      ctx.shadowBlur = 0;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 1; i < this.nodes.length; i++) {
        const prev = this.nodes[i - 1];
        const curr = this.nodes[i];
        if (prev.opacity <= 0 || curr.opacity <= 0) continue;

        const color = this.getNodeColor(i);
        ctx.globalAlpha = Math.min(prev.opacity, curr.opacity) * 0.6;
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  reset(): void {
    this.nodes = [];
    this.isDrawing = false;
    this.isReleased = false;
    this.isFullyFaded = false;
    this.fadeStartTime = 0;
    this.pathLength = 0;
  }
}
