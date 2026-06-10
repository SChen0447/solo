import { Palette, Bucket, RGB } from './palette';
import {
  getMixPairs,
  generateGradientPixels,
  generateMixParticles,
  checkFusionTrigger,
  getSecondaryColor,
  MixedPixel,
  MixPair,
} from './mixer';
import { AnimationEngine } from './animation';
import { UIManager } from './ui';

class App {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private palette: Palette;
  private animation: AnimationEngine;
  private ui: UIManager;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;
  private smallScreen: boolean = false;
  private animFrameId: number = 0;
  private lastTime: number = 0;
  private frameCount: number = 0;
  private lastFpsPrint: number = 0;
  private draggedBucket: Bucket | null = null;
  private dragTrail: { x: number; y: number }[] = [];
  private fusionLock: Set<string> = new Set();

  constructor() {
    this.canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
    if (!this.canvas) throw new Error('Canvas #main-canvas not found');
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.palette = new Palette();
    this.animation = new AnimationEngine();
    this.ui = new UIManager('ui-bar');
  }

  init(): void {
    this.resize();
    this.smallScreen = window.innerWidth < 600;
    this.palette.init(this.width, this.height, this.smallScreen);
    this.animation = new AnimationEngine();
    this.ui.init(this.smallScreen);
    this.ui.setOnReset(() => this.handleReset());
    this.updateUI();
    this.bindEvents();
    this.lastTime = performance.now();
    this.loop();
  }

  private resize(): void {
    const container = this.canvas.parentElement as HTMLElement;
    this.dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const small = window.innerWidth < 600;
    if (small !== this.smallScreen) {
      this.smallScreen = small;
      this.ui.updateForResize(small);
    }
    this.palette.setCanvasSize(this.width, this.height, this.smallScreen);
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resize());

    const getPos = (e: MouseEvent): { x: number; y: number } => {
      const rect = this.canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    this.canvas.addEventListener('pointerdown', (e) => {
      const pos = getPos(e);
      const bucket = this.palette.hitTest(pos.x, pos.y);
      if (bucket) {
        this.draggedBucket = bucket;
        this.palette.selectBucket(bucket);
        this.palette.startDrag(bucket, pos.x, pos.y);
        this.dragTrail = [{ x: bucket.x, y: bucket.y }];
        this.canvas.setPointerCapture(e.pointerId);
      } else {
        this.palette.selectBucket(null);
      }
    });

    this.canvas.addEventListener('pointermove', (e) => {
      const pos = getPos(e);
      if (this.draggedBucket) {
        this.palette.drag(this.draggedBucket, pos.x, pos.y);
        this.dragTrail.push({ x: this.draggedBucket.x, y: this.draggedBucket.y });
        if (this.dragTrail.length > 20) this.dragTrail.shift();
        this.checkFusion();
      }
    });

    const endDrag = (e: PointerEvent) => {
      if (this.draggedBucket) {
        this.palette.endDrag(this.draggedBucket);
        this.draggedBucket = null;
        this.dragTrail = [];
        try { this.canvas.releasePointerCapture(e.pointerId); } catch {}
      }
    };
    this.canvas.addEventListener('pointerup', endDrag);
    this.canvas.addEventListener('pointercancel', endDrag);
    this.canvas.addEventListener('pointerleave', endDrag);

    this.canvas.addEventListener('dblclick', (e) => {
      const pos = getPos(e);
      if (!this.palette.hitTest(pos.x, pos.y)) {
        const added = this.palette.addRandomBucket(pos.x, pos.y);
        if (added) {
          this.updateUI();
        } else {
          this.ui.updateResultText('最多只能有8个颜料桶哦~');
        }
      }
    });
  }

  private checkFusion(): void {
    if (this.animation.hasActiveFusion()) return;
    const buckets = this.palette.getBuckets();
    for (let i = 0; i < buckets.length; i++) {
      for (let j = i + 1; j < buckets.length; j++) {
        const a = buckets[i];
        const b = buckets[j];
        const key = [a.id, b.id].sort().join('|');
        if (this.fusionLock.has(key)) continue;
        if (checkFusionTrigger(a, b)) {
          const newColor = getSecondaryColor(a.colorHex, b.colorHex);
          if (newColor) {
            this.fusionLock.add(key);
            this.animation.startFusion(a, b, 40);
            this.ui.updateResultText(`融合中... ${this.getColorName(a.colorHex)} + ${this.getColorName(b.colorHex)} = ?`);
            setTimeout(() => {
              const newBucket = this.palette.mergeBuckets(a, b, newColor);
              this.animation.startGlow(newBucket.id);
              this.fusionLock.delete(key);
              this.updateUI();
              this.ui.updateResultText(`太棒了！${this.getColorName(a.colorHex)} + ${this.getColorName(b.colorHex)} = ${this.getColorName(newColor)}`);
              setTimeout(() => this.ui.updateResultText('拖动颜色桶混合色彩'), 2500);
            }, 650);
            return;
          }
        }
      }
    }
  }

  private getColorName(hex: string): string {
    const map: Record<string, string> = {
      '#FF0000': '红色',
      '#FFFF00': '黄色',
      '#0000FF': '蓝色',
      '#FF8000': '橙色',
      '#00FF80': '绿色',
      '#8000FF': '紫色',
    };
    return map[hex.toUpperCase()] || hex;
  }

  private handleReset(): void {
    this.palette.reset();
    this.animation.clear();
    this.draggedBucket = null;
    this.dragTrail = [];
    this.fusionLock.clear();
    this.updateUI();
    this.ui.updateResultText('画布已清理，重新开始吧！');
    setTimeout(() => this.ui.updateResultText('拖动颜色桶混合色彩'), 1500);
  }

  private updateUI(): void {
    this.ui.updateBucketCount(this.palette.getBucketCount());
    this.ui.updatePreviewColor(this.palette.getAverageColor());
  }

  private clearCanvas(): void {
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawDragTrail(): void {
    if (this.dragTrail.length < 2 || !this.draggedBucket) return;
    this.ctx.save();
    this.ctx.strokeStyle = this.draggedBucket.colorHex;
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([6, 4]);
    this.ctx.globalAlpha = 0.5;
    this.ctx.beginPath();
    this.ctx.moveTo(this.dragTrail[0].x, this.dragTrail[0].y);
    for (let i = 1; i < this.dragTrail.length; i++) {
      this.ctx.lineTo(this.dragTrail[i].x, this.dragTrail[i].y);
    }
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawMixRegions(pairs: MixPair[]): void {
    for (const pair of pairs) {
      const { bucketA, bucketB, intensity } = pair;
      const steps = 40;
      this.ctx.save();
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = bucketA.x + (bucketB.x - bucketA.x) * t;
        const y = bucketA.y + (bucketB.y - bucketA.y) * t;
        const rA = Math.round(bucketA.color.r + (bucketB.color.r - bucketA.color.r) * t);
        const gA = Math.round(bucketA.color.g + (bucketB.color.g - bucketA.color.g) * t);
        const bA = Math.round(bucketA.color.b + (bucketB.color.b - bucketA.color.b) * t);
        const alpha = 0.25 + 0.3 * intensity * (1 - Math.abs(t - 0.5) * 2);
        const r = 18 + 8 * intensity;
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, r);
        gradient.addColorStop(0, `rgba(${rA},${gA},${bA},${alpha})`);
        gradient.addColorStop(1, `rgba(${rA},${gA},${bA},0)`);
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    }
  }

  private drawBuckets(): void {
    const buckets = this.palette.getBuckets();
    for (const b of buckets) {
      const r = (b.diameter * b.scale) / 2;
      const glowAlpha = this.animation.getGlowAlpha(b.id);

      if (glowAlpha > 0) {
        this.ctx.save();
        this.ctx.shadowColor = '#FFD700';
        this.ctx.shadowBlur = 20 * glowAlpha;
        this.ctx.fillStyle = `rgba(255,215,0,${glowAlpha * 0.4})`;
        this.ctx.beginPath();
        this.ctx.arc(b.x, b.y, r + 8, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      }

      this.ctx.save();
      if (!b.isDragging) {
        this.ctx.shadowColor = 'rgba(0,0,0,0.3)';
        this.ctx.shadowOffsetY = 2;
        this.ctx.shadowBlur = 4;
      }
      this.ctx.fillStyle = b.colorHex;
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();

      this.ctx.save();
      if (b.isSelected) {
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 4;
      } else if (b.isSecondary) {
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 3;
      } else {
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
      }
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  private render(): void {
    this.clearCanvas();

    const buckets = this.palette.getBuckets();
    const pairs = getMixPairs(buckets);

    this.drawMixRegions(pairs);
    this.animation.renderParticles(this.ctx);
    this.drawDragTrail();
    this.drawBuckets();
    this.animation.renderFusionParticles(this.ctx);
  }

  private loop = (): void => {
    const start = performance.now();

    for (const pair of getMixPairs(this.palette.getBuckets())) {
      if (pair.intensity > 0.3 && Math.random() < 0.25) {
        const pixels = generateMixParticles(pair, 3);
        this.animation.addMixParticles(pixels);
      }
    }

    this.animation.update();
    this.render();

    this.animFrameId = requestAnimationFrame(this.loop);

    const elapsed = performance.now() - start;
    if (elapsed > 16) {
      console.warn(`[Perf] 帧耗时 ${elapsed.toFixed(1)}ms 超过 16ms`);
    }

    this.frameCount++;
    if (start - this.lastFpsPrint > 2000) {
      const fps = (this.frameCount * 1000) / (start - this.lastFpsPrint);
      if (fps < 50) {
        console.warn(`[Perf] 帧率 ${fps.toFixed(1)}fps 低于 50fps`);
      }
      this.frameCount = 0;
      this.lastFpsPrint = start;
    }
  };

  destroy(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
