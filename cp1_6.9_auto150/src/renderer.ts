import type p5 from 'p5';
import type { Stroke, Point, StrokeManager } from './stroke';

interface PulseAnimation {
  x: number;
  y: number;
  color: string;
  startTime: number;
  duration: number;
  maxRadius: number;
}

export class Renderer {
  private p: p5;
  private manager: StrokeManager;
  private isDrawing: boolean = false;
  private pulses: PulseAnimation[] = [];

  constructor(p: p5, manager: StrokeManager) {
    this.p = p;
    this.manager = manager;
  }

  setDrawing(d: boolean) {
    this.isDrawing = d;
  }

  addPulse(x: number, y: number, color: string) {
    this.pulses.push({
      x,
      y,
      color,
      startTime: performance.now(),
      duration: 600,
      maxRadius: 50
    });
  }

  drawBackground() {
    const p = this.p;
    const w = p.width;
    const h = p.height;
    const cx = w / 2;
    const cy = h / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);
    p.loadPixels();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxDist;
        const t = p.constrain(d, 0, 1);
        const r = p.lerp(15, 5, t);
        const g = p.lerp(17, 6, t);
        const b = p.lerp(26, 11, t);
        const idx = (y * w + x) * 4;
        p.pixels[idx] = r;
        p.pixels[idx + 1] = g;
        p.pixels[idx + 2] = b;
        p.pixels[idx + 3] = 255;
      }
    }
    p.updatePixels();

    const gridAlpha = this.isDrawing || this.manager.getStrokeCount() > 0 ? 0.05 : 0.1;
    p.stroke(26, 28, 46, Math.floor(gridAlpha * 255));
    p.strokeWeight(1);
    const gridSize = 30;
    for (let x = 0; x < w; x += gridSize) {
      p.line(x, 0, x, h);
    }
    for (let y = 0; y < h; y += gridSize) {
      p.line(0, y, w, y);
    }
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16)
    };
  }

  private drawStrokePath(stroke: Stroke, glow: boolean) {
    const p = this.p;
    const pts = stroke.points;
    if (pts.length < 2) return;

    const rgb = this.hexToRgb(stroke.color);

    if (glow) {
      p.drawingContext.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.9)`;
      p.drawingContext.shadowBlur = stroke.blurRadius;
    } else {
      p.drawingContext.shadowBlur = 0;
    }

    p.stroke(rgb.r, rgb.g, rgb.b, 255);
    p.strokeWeight(stroke.width);
    p.strokeCap(p.ROUND);
    p.strokeJoin(p.ROUND);
    p.noFill();

    p.beginShape();
    for (let i = 0; i < pts.length; i++) {
      p.vertex(pts[i].x, pts[i].y);
    }
    p.endShape();

    p.drawingContext.shadowBlur = 0;
  }

  drawStroke(stroke: Stroke) {
    this.drawStrokePath(stroke, true);
  }

  drawAllStrokes() {
    const strokes = this.manager.getStrokes();
    for (const s of strokes) {
      this.drawStroke(s);
    }
    const current = this.manager.getCurrentStroke();
    if (current) {
      this.drawStroke(current);
    }
  }

  drawSelectedHelpers() {
    const p = this.p;
    const strokes = this.manager.getStrokes();
    for (const s of strokes) {
      if (!s.selected) continue;
      const pts = s.points;
      if (pts.length < 2) continue;

      p.stroke(255, 255, 255, 102);
      p.strokeWeight(1);
      p.noFill();
      p.beginShape();
      for (let i = 0; i < pts.length; i++) {
        p.vertex(pts[i].x, pts[i].y);
      }
      p.endShape();

      p.noStroke();
      p.fill(255, 255, 255, 255);
      for (let i = 0; i < pts.length; i++) {
        p.ellipse(pts[i].x, pts[i].y, 8, 8);
      }
    }
  }

  drawPulses() {
    const p = this.p;
    const now = performance.now();
    this.pulses = this.pulses.filter(pulse => {
      const elapsed = now - pulse.startTime;
      if (elapsed > pulse.duration) return false;

      const t = elapsed / pulse.duration;
      const radius = pulse.maxRadius * t;
      const alpha = 0.5 * (1 - t);
      const rgb = this.hexToRgb(pulse.color);

      p.noStroke();
      for (let r = radius; r > 0; r -= 2) {
        const a = alpha * (r / radius);
        p.fill(rgb.r, rgb.g, rgb.b, Math.floor(a * 255));
        p.ellipse(pulse.x, pulse.y, r * 2, r * 2);
      }
      return true;
    });
  }

  render() {
    this.drawBackground();
    this.drawAllStrokes();
    this.drawSelectedHelpers();
    this.drawPulses();
  }

  captureFrame(): ImageData {
    const p = this.p;
    return p.drawingContext.getImageData(0, 0, p.width, p.height);
  }
}
