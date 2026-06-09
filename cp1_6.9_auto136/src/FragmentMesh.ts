import type p5 from 'p5';
import { ParticleSystem } from './ParticleSystem';

export interface Fragment {
  id: number;
  shapeHash: string;
  color: string;
  points: { x: number; y: number }[];
  gridX: number;
  gridY: number;
  x: number;
  y: number;
  size: number;
  isSelected: boolean;
  isMatched: boolean;
  isHovered: boolean;
  breathPhase: number;
  bounceProgress: number;
  shakeProgress: number;
  flashProgress: number;
  mergeProgress: number;
}

const COLORS = ['#ff3366', '#33ff66', '#3366ff', '#ffcc33', '#aa66ff'];
const GRID_COLS = 6;
const GRID_ROWS = 4;
const TOTAL_FRAGMENTS = GRID_COLS * GRID_ROWS;
const TOTAL_PAIRS = TOTAL_FRAGMENTS / 2;
const FRAGMENT_SIZE = 30;
const CELL_PADDING = 50;

export class FragmentMesh {
  private p: p5;
  private particleSystem: ParticleSystem;
  private fragments: Fragment[] = [];
  private noiseCanvas: p5.Graphics | null = null;
  private debris: { x: number; y: number; size: number }[] = [];
  private columnOffsets: number[] = [];

  constructor(p: p5, particleSystem: ParticleSystem) {
    this.p = p;
    this.particleSystem = particleSystem;
  }

  init(canvasWidth: number, canvasHeight: number): void {
    this.generateNoise(canvasWidth, canvasHeight);
    this.generateDebris(canvasWidth, canvasHeight);
    this.generateFragments(canvasWidth, canvasHeight);
    this.columnOffsets = new Array(20).fill(0);
  }

  private generateNoise(w: number, h: number): void {
    this.noiseCanvas = this.p.createGraphics(w, h);
    const nc = this.noiseCanvas;
    nc.pixelDensity(1);
    nc.loadPixels();
    const d = nc.pixelDensity();
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        if (Math.random() < 0.05) {
          const gray = Math.floor(Math.random() * 40 + 10);
          for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
              const idx = 4 * ((y + dy) * w * d + (x + dx) * d);
              nc.pixels[idx] = gray;
              nc.pixels[idx + 1] = gray;
              nc.pixels[idx + 2] = gray;
              nc.pixels[idx + 3] = 255;
            }
          }
        }
      }
    }
    nc.updatePixels();
  }

  private generateDebris(w: number, h: number): void {
    this.debris = [];
    for (let i = 0; i < 40; i++) {
      this.debris.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: 2 + Math.random() * 3,
      });
    }
  }

  private generateFragments(canvasWidth: number, canvasHeight: number): void {
    this.fragments = [];

    const shapes: { hash: string; points: { x: number; y: number }[] }[] = [];
    for (let i = 0; i < TOTAL_PAIRS; i++) {
      const shape = this.generateRandomShape();
      shapes.push(shape, shape);
    }

    for (let i = shapes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shapes[i], shapes[j]] = [shapes[j], shapes[i]];
    }

    const totalWidth = GRID_COLS * FRAGMENT_SIZE + (GRID_COLS - 1) * 20;
    const totalHeight = GRID_ROWS * FRAGMENT_SIZE + (GRID_ROWS - 1) * 20;
    const startX = (canvasWidth - totalWidth) / 2 + FRAGMENT_SIZE / 2;
    const startY = (canvasHeight - totalHeight) / 2 + FRAGMENT_SIZE / 2;
    const spacingX = FRAGMENT_SIZE + 20;
    const spacingY = FRAGMENT_SIZE + 20;

    for (let i = 0; i < TOTAL_FRAGMENTS; i++) {
      const gridX = i % GRID_COLS;
      const gridY = Math.floor(i / GRID_COLS);
      this.fragments.push({
        id: i,
        shapeHash: shapes[i].hash,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        points: shapes[i].points,
        gridX,
        gridY,
        x: startX + gridX * spacingX,
        y: startY + gridY * spacingY,
        size: FRAGMENT_SIZE,
        isSelected: false,
        isMatched: false,
        isHovered: false,
        breathPhase: Math.random() * Math.PI * 2,
        bounceProgress: 0,
        shakeProgress: 0,
        flashProgress: 0,
        mergeProgress: 0,
      });
    }
  }

  private generateRandomShape(): { hash: string; points: { x: number; y: number }[] } {
    const numPoints = 5 + Math.floor(Math.random() * 4);
    const points: { x: number; y: number }[] = [];
    const centerR = FRAGMENT_SIZE * 0.25;

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const r = centerR + (Math.random() - 0.3) * FRAGMENT_SIZE * 0.2;
      points.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
      });
    }

    const hash = points
      .map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
      .join('|');

    return { hash, points };
  }

  update(): void {
    for (const f of this.fragments) {
      f.breathPhase += 0.05;
      if (f.bounceProgress > 0) f.bounceProgress = Math.max(0, f.bounceProgress - 1 / 18);
      if (f.shakeProgress > 0) f.shakeProgress = Math.max(0, f.shakeProgress - 1 / 30);
      if (f.flashProgress > 0) f.flashProgress = Math.max(0, f.flashProgress - 1 / 12);
      if (f.mergeProgress > 0) f.mergeProgress = Math.min(1, f.mergeProgress + 1 / 180);
    }

    for (let i = 0; i < this.columnOffsets.length; i++) {
      this.columnOffsets[i] = Math.sin(this.p.frameCount * 0.002 + i * 0.5) * 5;
    }
  }

  renderBackground(): void {
    const p = this.p;

    if (this.noiseCanvas) {
      p.image(this.noiseCanvas, 0, 0);
    }

    p.push();
    p.stroke('#222222');
    p.noFill();
    for (const d of this.debris) {
      p.rect(d.x, d.y, d.size, d.size);
    }
    p.pop();

    p.push();
    p.stroke(51, 51, 51, 150);
    p.strokeWeight(1);
    const gridSize = 60;
    for (let col = 0; col < p.width / gridSize + 2; col++) {
      const offset = this.columnOffsets[col % this.columnOffsets.length] || 0;
      p.line(col * gridSize + offset, 0, col * gridSize + offset, p.height);
    }
    for (let row = 0; row < p.height / gridSize + 2; row++) {
      p.line(0, row * gridSize, p.width, row * gridSize);
    }
    p.pop();
  }

  render(): void {
    const p = this.p;

    for (const f of this.fragments) {
      if (f.mergeProgress >= 1) continue;

      let scale = 1;
      let offsetX = 0;
      let alpha = 0.6;
      let shadowBlur = 6;
      let fillColor = f.color;

      if (f.isHovered && !f.isMatched) {
        scale = 1.1;
        alpha = 1;
      }

      if (f.isSelected) {
        shadowBlur = 12;
        alpha = 1;
      }

      if (f.bounceProgress > 0) {
        const t = f.bounceProgress;
        if (t > 0.5) {
          scale *= 1 + (1 - t) * 0.1;
        } else {
          scale *= 0.9 + t * 0.2;
        }
      }

      if (f.shakeProgress > 0) {
        offsetX = Math.sin(this.p.frameCount * 10) * 3 * f.shakeProgress;
      }

      if (f.flashProgress > 0) {
        const flashPhase = Math.floor(f.flashProgress * 12) % 2;
        if (flashPhase === 0) {
          fillColor = '#ff3355';
          shadowBlur = 15;
        }
        alpha = 1;
      }

      if (f.mergeProgress > 0) {
        scale *= 1 - f.mergeProgress;
        alpha = 1 - f.mergeProgress;
        fillColor = this.interpolateColor(f.color, '#ffffff', f.mergeProgress);
      }

      const breathScale = 1 + Math.sin(f.breathPhase) * 0.03;
      scale *= breathScale;

      p.push();
      p.translate(f.x + offsetX, f.y);
      p.scale(scale);

      p.noStroke();
      p.drawingContext.shadowBlur = shadowBlur;
      p.drawingContext.shadowColor = fillColor;
      p.fill(this.hexToRgba(fillColor, alpha));

      p.beginShape();
      for (const pt of f.points) {
        p.vertex(pt.x, pt.y);
      }
      p.endShape(p.CLOSE);

      p.pop();
    }
  }

  handleClick(mx: number, my: number): Fragment | null {
    for (const f of this.fragments) {
      if (f.isMatched || f.mergeProgress > 0) continue;
      const dx = mx - f.x;
      const dy = my - f.y;
      const hitSize = f.size * 0.6;
      if (Math.abs(dx) < hitSize && Math.abs(dy) < hitSize) {
        f.bounceProgress = 1;
        return f;
      }
    }
    return null;
  }

  handleHover(mx: number, my: number): void {
    for (const f of this.fragments) {
      if (f.isMatched || f.mergeProgress > 0) {
        f.isHovered = false;
        continue;
      }
      const dx = mx - f.x;
      const dy = my - f.y;
      const hitSize = f.size * 0.6;
      f.isHovered = Math.abs(dx) < hitSize && Math.abs(dy) < hitSize;
    }
  }

  triggerMatch(f1: Fragment, f2: Fragment): void {
    f1.isMatched = true;
    f2.isMatched = true;
    f1.isSelected = false;
    f2.isSelected = false;
    f1.mergeProgress = 0.001;
    f2.mergeProgress = 0.001;

    const midX = (f1.x + f2.x) / 2;
    const midY = (f1.y + f2.y) / 2;
    const color = f1.color;

    this.particleSystem.emitBurst(midX, midY, color);
    this.particleSystem.spawnPillar(midX, midY, color);
  }

  triggerMismatch(f1: Fragment, f2: Fragment): void {
    f1.shakeProgress = 1;
    f2.shakeProgress = 1;
    f1.flashProgress = 1;
    f2.flashProgress = 1;
    f1.isSelected = false;
    f2.isSelected = false;
  }

  selectFragment(f: Fragment): void {
    f.isSelected = true;
  }

  deselectFragment(f: Fragment): void {
    f.isSelected = false;
  }

  getFragments(): Fragment[] {
    return this.fragments;
  }

  getMatchedCount(): number {
    return this.fragments.filter((f) => f.isMatched).length / 2;
  }

  clear(): void {
    this.fragments = [];
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private interpolateColor(c1: string, c2: string, t: number): string {
    const r1 = parseInt(c1.slice(1, 3), 16);
    const g1 = parseInt(c1.slice(3, 5), 16);
    const b1 = parseInt(c1.slice(5, 7), 16);
    const r2 = parseInt(c2.slice(1, 3), 16);
    const g2 = parseInt(c2.slice(3, 5), 16);
    const b2 = parseInt(c2.slice(5, 7), 16);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}
