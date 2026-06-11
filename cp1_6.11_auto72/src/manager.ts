import {
  Bubble,
  MergeEffect,
  createMergeEffect,
  updateMergeEffect,
  drawMergeEffect,
  mergeBubbles
} from './bubble';

interface DragState {
  isDragging: boolean;
  bubble: Bubble | null;
  startX: number;
  startY: number;
  startR: number;
}

export class BubbleManager {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  bubbles: Bubble[];
  effects: MergeEffect[];
  drag: DragState;
  lastTime: number;
  frameCount: number;
  fps: number;
  lowFpsMode: boolean;
  maxBubbles: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.bubbles = [];
    this.effects = [];
    this.drag = {
      isDragging: false,
      bubble: null,
      startX: 0,
      startY: 0,
      startR: 0
    };
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.fps = 60;
    this.lowFpsMode = false;
    this.maxBubbles = 200;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  width(): number {
    return this.canvas.getBoundingClientRect().width;
  }

  height(): number {
    return this.canvas.getBoundingClientRect().height;
  }

  getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  addBubble(b: Bubble) {
    this.bubbles.push(b);
    this.enforceBubbleLimit();
  }

  enforceBubbleLimit() {
    while (this.bubbles.length > this.maxBubbles) {
      let smallestOldIdx = -1;
      let smallestOldTime = Infinity;
      for (let i = 0; i < this.bubbles.length; i++) {
        const b = this.bubbles[i];
        if (b.r < 15 && b.bornAt < smallestOldTime && !b.isDying) {
          smallestOldTime = b.bornAt;
          smallestOldIdx = i;
        }
      }
      if (smallestOldIdx === -1) {
        for (let i = 0; i < this.bubbles.length; i++) {
          if (!this.bubbles[i].isDying) {
            smallestOldIdx = i;
            break;
          }
        }
      }
      if (smallestOldIdx !== -1) {
        this.bubbles.splice(smallestOldIdx, 1);
      } else {
        break;
      }
    }
  }

  onPointerDown(clientX: number, clientY: number) {
    const pos = this.getCanvasPos(clientX, clientY);

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      if (this.bubbles[i].containsPoint(pos.x, pos.y) && !this.bubbles[i].isDying) {
        this.drag.isDragging = true;
        this.drag.bubble = this.bubbles[i];
        this.drag.bubble.vx = 0;
        this.drag.bubble.vy = 0;
        return;
      }
    }

    const r = 8 + Math.random() * 4;
    const b = new Bubble(pos.x, pos.y, r);
    b.scale = 0.6;
    b.targetScale = 1;
    this.addBubble(b);
    this.drag.isDragging = true;
    this.drag.bubble = b;
    this.drag.startX = pos.x;
    this.drag.startY = pos.y;
    this.drag.startR = r;
  }

  onPointerMove(clientX: number, clientY: number) {
    if (!this.drag.isDragging || !this.drag.bubble) return;

    const pos = this.getCanvasPos(clientX, clientY);
    const b = this.drag.bubble;
    b.x = pos.x;
    b.y = pos.y;

    if (b.bornAt === this.drag.bubble.bornAt) {
      const dist = Math.hypot(pos.x - this.drag.startX, pos.y - this.drag.startY);
      const growth = Math.min(dist * 0.15, 80 - this.drag.startR);
      b.r = Math.min(this.drag.startR + growth, 80);
    }
  }

  onPointerUp() {
    if (this.drag.isDragging && this.drag.bubble) {
      const b = this.drag.bubble;
      const speed = 0.2 + Math.random() * 0.3;
      const angle = Math.random() * Math.PI * 2;
      b.vx = Math.cos(angle) * speed;
      b.vy = Math.sin(angle) * speed;
    }
    this.drag.isDragging = false;
    this.drag.bubble = null;
  }

  onDoubleClick(clientX: number, clientY: number) {
    const pos = this.getCanvasPos(clientX, clientY);

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      if (b.containsPoint(pos.x, pos.y) && !b.isDying) {
        const children = b.split();
        this.bubbles.splice(i, 1);
        for (const c of children) {
          this.addBubble(c);
        }
        return;
      }
    }
  }

  checkMerges() {
    if (this.lowFpsMode && this.frameCount % 2 !== 0) return;

    const toRemove = new Set<number>();
    const toAdd: Bubble[] = [];
    const newEffects: MergeEffect[] = [];

    for (let i = 0; i < this.bubbles.length; i++) {
      if (toRemove.has(i)) continue;
      const a = this.bubbles[i];
      if (a.isDying) continue;

      for (let j = i + 1; j < this.bubbles.length; j++) {
        if (toRemove.has(j)) continue;
        const b = this.bubbles[j];
        if (b.isDying) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const minDist = a.r * a.scale + b.r * b.scale;

        if (dist < minDist) {
          const collisionX = a.x + (b.x - a.x) * (a.r / (a.r + b.r));
          const collisionY = a.y + (b.y - a.y) * (a.r / (a.r + b.r));

          toRemove.add(i);
          toRemove.add(j);

          const merged = mergeBubbles(a, b);
          toAdd.push(merged);

          newEffects.push(createMergeEffect(collisionX, collisionY, Math.max(a.r, b.r)));
          break;
        }
      }
    }

    if (toRemove.size > 0) {
      const sorted = [...toRemove].sort((a, b) => b - a);
      for (const idx of sorted) {
        this.bubbles.splice(idx, 1);
      }
      for (const b of toAdd) {
        this.addBubble(b);
      }
      for (const e of newEffects) {
        this.effects.push(e);
      }
    }
  }

  clearAll() {
    for (const b of this.bubbles) {
      b.startFadeOut();
    }
  }

  generateRandom(count: number = 15) {
    const w = this.width();
    const h = this.height();

    for (let i = 0; i < count; i++) {
      const r = 15 + Math.random() * 45;
      const x = r + Math.random() * (w - 2 * r);
      const y = r + Math.random() * (h - 2 * r);
      const b = new Bubble(x, y, r);
      b.scale = 0;
      b.targetScale = 1;
      const speed = 0.2 + Math.random() * 0.3;
      const angle = Math.random() * Math.PI * 2;
      b.vx = Math.cos(angle) * speed;
      b.vy = Math.sin(angle) * speed;
      this.addBubble(b);
    }
  }

  saveImage() {
    const w = this.width();
    const h = this.height();
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tctx = tempCanvas.getContext('2d')!;

    const bg = tctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
    bg.addColorStop(0, '#1a1a2e');
    bg.addColorStop(1, '#16213e');
    tctx.fillStyle = bg;
    tctx.fillRect(0, 0, w, h);

    for (const b of this.bubbles) {
      b.draw(tctx);
    }
    for (const e of this.effects) {
      drawMergeEffect(tctx, e);
    }

    tctx.strokeStyle = 'rgba(180, 180, 200, 0.6)';
    tctx.lineWidth = 4;
    tctx.strokeRect(2, 2, w - 4, h - 4);

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    tctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
    tctx.textAlign = 'right';
    tctx.textBaseline = 'bottom';

    const textMetrics = tctx.measureText(timestamp);
    const padding = 12;
    const boxW = textMetrics.width + padding * 2;
    const boxH = 28;

    tctx.fillStyle = 'rgba(20, 25, 45, 0.7)';
    tctx.fillRect(w - boxW - 8, h - boxH - 8, boxW, boxH);
    tctx.strokeStyle = 'rgba(120, 140, 200, 0.3)';
    tctx.lineWidth = 1;
    tctx.strokeRect(w - boxW - 8, h - boxH - 8, boxW, boxH);

    tctx.fillStyle = 'rgba(220, 230, 255, 0.9)';
    tctx.fillText(timestamp, w - padding - 8, h - padding - 8 + 2);

    const link = document.createElement('a');
    link.download = `bubble-art-${Date.now()}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  }

  update(dt: number) {
    this.frameCount++;

    this.fps = this.fps * 0.9 + (1000 / Math.max(dt, 1)) * 0.1;
    this.lowFpsMode = this.fps < 28;

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      if (this.drag.bubble === this.bubbles[i]) continue;
      this.bubbles[i].update(dt, this.width(), this.height());

      if (this.bubbles[i].isDead()) {
        this.bubbles.splice(i, 1);
      }
    }

    this.checkMerges();

    for (let i = this.effects.length - 1; i >= 0; i--) {
      const alive = updateMergeEffect(this.effects[i], dt);
      if (!alive) {
        this.effects.splice(i, 1);
      }
    }
  }

  draw() {
    const w = this.width();
    const h = this.height();

    const bg = this.ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
    bg.addColorStop(0, '#1a1a2e');
    bg.addColorStop(1, '#16213e');
    this.ctx.fillStyle = bg;
    this.ctx.fillRect(0, 0, w, h);

    for (const b of this.bubbles) {
      b.draw(this.ctx);
    }

    for (const e of this.effects) {
      drawMergeEffect(this.ctx, e);
    }
  }

  frame(now: number) {
    const dt = now - this.lastTime;
    this.lastTime = now;
    this.update(dt);
    this.draw();
  }
}
