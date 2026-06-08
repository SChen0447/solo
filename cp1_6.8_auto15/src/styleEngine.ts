import type { CharSample, Stroke, Point } from './input';

export interface StyleParams {
  strokeWidth: number;
  slantAngle: number;
  connectivity: number;
  roundness: number;
  color: string;
}

export interface GeneratedChar {
  char: string;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export type ProgressCallback = (progress: number, currentChar: string, total: number) => void;
export type CompleteCallback = (chars: Map<string, GeneratedChar>) => void;

const BASE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CHAR_SIZE = 64;
const PADDING = 8;

export class StyleEngine {
  private samples: CharSample[] = [];
  private styleParams: StyleParams = {
    strokeWidth: 3,
    slantAngle: 0,
    connectivity: 0.3,
    roundness: 0.5,
    color: '#3B4D8F',
  };
  private generatedChars: Map<string, GeneratedChar> = new Map();
  private isGenerating: boolean = false;
  private cancelRequested: boolean = false;

  public addSample(sample: CharSample): void {
    this.samples = this.samples.filter(s => s.char !== sample.char);
    this.samples.push(sample);
    this.updateStyleParams();
  }

  public removeSample(char: string): void {
    this.samples = this.samples.filter(s => s.char !== char);
    this.updateStyleParams();
  }

  public getSamples(): CharSample[] {
    return [...this.samples];
  }

  public getSampleCount(): number {
    return this.samples.length;
  }

  public getStyleParams(): StyleParams {
    return { ...this.styleParams };
  }

  public setColor(color: string): void {
    this.styleParams.color = color;
  }

  private updateStyleParams(): void {
    if (this.samples.length === 0) return;

    let totalWidth = 0;
    let totalSlant = 0;
    let totalConnectivity = 0;
    let totalRoundness = 0;
    let count = 0;

    for (const sample of this.samples) {
      const params = this.extractParamsFromSample(sample);
      totalWidth += params.strokeWidth;
      totalSlant += params.slantAngle;
      totalConnectivity += params.connectivity;
      totalRoundness += params.roundness;
      count++;
    }

    if (count > 0) {
      this.styleParams.strokeWidth = Math.max(1.5, Math.min(8, totalWidth / count));
      this.styleParams.slantAngle = Math.max(-20, Math.min(20, totalSlant / count));
      this.styleParams.connectivity = Math.max(0, Math.min(1, totalConnectivity / count));
      this.styleParams.roundness = Math.max(0, Math.min(1, totalRoundness / count));
      this.styleParams.color = this.samples[0].strokes[0]?.color || '#3B4D8F';
    }
  }

  private extractParamsFromSample(sample: CharSample): StyleParams {
    let totalWidth = 0;
    let widthCount = 0;
    let totalSlant = 0;
    let slantCount = 0;
    let totalRoundness = 0;

    for (const stroke of sample.strokes) {
      if (stroke.points.length < 2) continue;

      for (let i = 1; i < stroke.points.length; i++) {
        const p1 = stroke.points[i - 1];
        const p2 = stroke.points[i];
        if (p2.pressure) {
          totalWidth += p2.pressure;
          widthCount++;
        }

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        if (Math.abs(dx) > 5) {
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;
          if (Math.abs(angle) > 10 && Math.abs(angle) < 80) {
            totalSlant += angle > 0 ? angle - 90 : angle + 90;
            slantCount++;
          }
        }
      }

      if (stroke.points.length >= 3) {
        for (let i = 1; i < stroke.points.length - 1; i++) {
          const p1 = stroke.points[i - 1];
          const p2 = stroke.points[i];
          const p3 = stroke.points[i + 1];

          const v1x = p2.x - p1.x;
          const v1y = p2.y - p1.y;
          const v2x = p3.x - p2.x;
          const v2y = p3.y - p2.y;

          const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
          const len2 = Math.sqrt(v2x * v2x + v2y * v2y);

          if (len1 > 5 && len2 > 5) {
            const dot = (v1x * v2x + v1y * v2y) / (len1 * len2);
            const angleDiff = Math.acos(Math.max(-1, Math.min(1, dot)));
            totalRoundness += 1 - angleDiff / Math.PI;
          }
        }
      }
    }

    const charWidth = sample.bounds.maxX - sample.bounds.minX;
    const charHeight = sample.bounds.maxY - sample.bounds.minY;
    const connectivity = charHeight > 0 ? Math.min(1, sample.strokes.length / 4) : 0.3;

    return {
      strokeWidth: widthCount > 0 ? totalWidth / widthCount : 3,
      slantAngle: slantCount > 0 ? totalSlant / slantCount : 0,
      connectivity,
      roundness: totalRoundness > 0 ? Math.min(1, totalRoundness / Math.max(1, widthCount - 1)) : 0.5,
      color: sample.strokes[0]?.color || '#3B4D8F',
    };
  }

  public async generateAll(
    onProgress?: ProgressCallback,
    onComplete?: CompleteCallback
  ): Promise<void> {
    if (this.isGenerating) return;
    this.isGenerating = true;
    this.cancelRequested = false;
    this.generatedChars.clear();

    const chars = BASE_CHARS.split('');
    const total = chars.length;
    const batchSize = 5;
    let processed = 0;

    const processBatch = async (): Promise<void> => {
      if (this.cancelRequested) {
        this.isGenerating = false;
        return;
      }

      const batch = chars.slice(processed, processed + batchSize);
      const startTime = performance.now();

      for (const char of batch) {
        if (this.cancelRequested) break;

        const sample = this.samples.find(s => s.char === char);
        let generated: GeneratedChar;

        if (sample) {
          generated = this.createFromSample(sample);
        } else {
          generated = this.generateChar(char);
        }

        this.generatedChars.set(char, generated);
        processed++;

        if (onProgress) {
          onProgress(processed / total, char, total);
        }
      }

      const elapsed = performance.now() - startTime;

      if (processed < total && !this.cancelRequested) {
        if (elapsed > 100 || batch.length >= batchSize) {
          await new Promise(resolve => setTimeout(resolve, 16));
        }
        await processBatch();
      } else {
        this.isGenerating = false;
        if (onComplete && !this.cancelRequested) {
          onComplete(this.generatedChars);
        }
      }
    };

    await processBatch();
  }

  public cancelGeneration(): void {
    this.cancelRequested = true;
  }

  public isBusy(): boolean {
    return this.isGenerating;
  }

  public getGeneratedChar(char: string): GeneratedChar | undefined {
    return this.generatedChars.get(char);
  }

  public getAllGenerated(): Map<string, GeneratedChar> {
    return new Map(this.generatedChars);
  }

  private createFromSample(sample: CharSample): GeneratedChar {
    const size = CHAR_SIZE + PADDING * 2;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    const charWidth = sample.bounds.maxX - sample.bounds.minX;
    const charHeight = sample.bounds.maxY - sample.bounds.minY;
    const scale = Math.min(
      (CHAR_SIZE - PADDING) / Math.max(charWidth, 1),
      (CHAR_SIZE - PADDING) / Math.max(charHeight, 1)
    );

    const offsetX = (size - charWidth * scale) / 2 - sample.bounds.minX * scale;
    const offsetY = (size - charHeight * scale) / 2 - sample.bounds.minY * scale;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of sample.strokes) {
      if (stroke.points.length < 2) continue;

      ctx.strokeStyle = stroke.color;

      for (let i = 1; i < stroke.points.length; i++) {
        const p1 = stroke.points[i - 1];
        const p2 = stroke.points[i];
        const width = (p2.pressure || 3) * scale;

        const x1 = p1.x * scale + offsetX;
        const y1 = p1.y * scale + offsetY;
        const x2 = p2.x * scale + offsetX;
        const y2 = p2.y * scale + offsetY;

        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        ctx.beginPath();
        ctx.lineWidth = width;
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(x1, y1, midX, midY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(midX, midY);
        ctx.quadraticCurveTo(x2, y2, x2, y2);
        ctx.stroke();
      }
    }

    return {
      char: sample.char,
      canvas,
      width: size,
      height: size,
    };
  }

  private generateChar(char: string): GeneratedChar {
    const size = CHAR_SIZE + PADDING * 2;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = this.styleParams.color;
    ctx.lineWidth = this.styleParams.strokeWidth;

    const centerX = size / 2;
    const centerY = size / 2;
    const charSize = CHAR_SIZE * 0.4;

    this.drawCharTemplate(ctx, char, centerX, centerY, charSize);

    return {
      char,
      canvas,
      width: size,
      height: size,
    };
  }

  private drawCharTemplate(
    ctx: CanvasRenderingContext2D,
    char: string,
    cx: number,
    cy: number,
    size: number
  ): void {
    const params = this.styleParams;
    const slantRad = (params.slantAngle * Math.PI) / 180;
    const r = params.roundness;

    const applySlant = (x: number, y: number): [number, number] => {
      const relY = y - cy;
      return [x + relY * Math.tan(slantRad) * 0.3, y];
    };

    const drawLine = (x1: number, y1: number, x2: number, y2: number): void => {
      const [sx1, sy1] = applySlant(x1, y1);
      const [sx2, sy2] = applySlant(x2, y2);

      if (r > 0.3) {
        const midX = (sx1 + sx2) / 2;
        const midY = (sy1 + sy2) / 2;
        const offset = r * 2;

        ctx.beginPath();
        ctx.moveTo(sx1, sy1);
        ctx.quadraticCurveTo(midX + offset, midY - offset, sx2, sy2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(sx1, sy1);
        ctx.lineTo(sx2, sy2);
        ctx.stroke();
      }
    };

    const drawArc = (
      x: number,
      y: number,
      radiusX: number,
      radiusY: number,
      startAngle: number,
      endAngle: number,
      anticlockwise?: boolean
    ): void => {
      const [sx, sy] = applySlant(x, y);
      const [srx, sry] = applySlant(x + radiusX, y + radiusY);
      const rx = Math.abs(srx - sx);
      const ry = Math.abs(sry - sy);

      ctx.beginPath();
      ctx.ellipse(sx, sy, rx, ry, slantRad * 0.5, startAngle, endAngle, anticlockwise);
      ctx.stroke();
    };

    const top = cy - size;
    const bottom = cy + size * 0.8;
    const left = cx - size * 0.8;
    const right = cx + size * 0.8;
    const midY = cy;
    const midX = cx;

    switch (char) {
      case 'A':
        drawLine(left, bottom, left + size * 0.4, top);
        drawLine(right, bottom, right - size * 0.4, top);
        drawLine(left + size * 0.25, midY - size * 0.1, right - size * 0.25, midY - size * 0.1);
        break;
      case 'B':
        drawLine(left, top, left, bottom);
        drawArc(left + size * 0.4, top + size * 0.4, size * 0.4, size * 0.4, -Math.PI / 2, Math.PI / 2);
        drawArc(left + size * 0.4, midY + size * 0.3, size * 0.4, size * 0.4, -Math.PI / 2, Math.PI / 2);
        drawLine(left, midY + size * 0.1, left + size * 0.4, midY + size * 0.1);
        break;
      case 'C':
        drawArc(midX, midY, size * 0.7, size * 0.8, Math.PI * 0.3, Math.PI * 1.7);
        break;
      case 'D':
        drawLine(left, top, left, bottom);
        drawArc(left + size * 0.5, midY, size * 0.5, size * 0.8, -Math.PI / 2, Math.PI / 2);
        break;
      case 'E':
        drawLine(left, top, left, bottom);
        drawLine(left, top, right, top);
        drawLine(left, midY, right - size * 0.15, midY);
        drawLine(left, bottom, right, bottom);
        break;
      case 'F':
        drawLine(left, top, left, bottom);
        drawLine(left, top, right, top);
        drawLine(left, midY, right - size * 0.15, midY);
        break;
      case 'G':
        drawArc(midX, midY, size * 0.7, size * 0.8, Math.PI * 0.3, Math.PI * 1.7);
        drawLine(midX + size * 0.3, midY + size * 0.1, right, midY + size * 0.1);
        drawLine(right, midY + size * 0.1, right, bottom - size * 0.1);
        break;
      case 'H':
        drawLine(left, top, left, bottom);
        drawLine(right, top, right, bottom);
        drawLine(left, midY, right, midY);
        break;
      case 'I':
        drawLine(midX, top, midX, bottom);
        break;
      case 'J':
        drawLine(right - size * 0.2, top, right - size * 0.2, bottom - size * 0.2);
        drawArc(midX, bottom - size * 0.2, size * 0.35, size * 0.2, 0, Math.PI);
        break;
      case 'K':
        drawLine(left, top, left, bottom);
        drawLine(left, midY, right, top);
        drawLine(left, midY, right, bottom);
        break;
      case 'L':
        drawLine(left, top, left, bottom);
        drawLine(left, bottom, right, bottom);
        break;
      case 'M':
        drawLine(left, bottom, left, top);
        drawLine(left, top, midX, bottom);
        drawLine(midX, bottom, right, top);
        drawLine(right, top, right, bottom);
        break;
      case 'N':
        drawLine(left, bottom, left, top);
        drawLine(left, top, right, bottom);
        drawLine(right, bottom, right, top);
        break;
      case 'O':
        drawArc(midX, midY, size * 0.65, size * 0.8, 0, Math.PI * 2);
        break;
      case 'P':
        drawLine(left, top, left, bottom);
        drawArc(left + size * 0.4, top + size * 0.35, size * 0.4, size * 0.35, -Math.PI / 2, Math.PI / 2);
        drawLine(left, top + size * 0.7, left + size * 0.4, top + size * 0.7);
        break;
      case 'Q':
        drawArc(midX, midY - size * 0.1, size * 0.65, size * 0.7, 0, Math.PI * 2);
        drawLine(midX + size * 0.2, midY + size * 0.4, right, bottom - size * 0.1);
        break;
      case 'R':
        drawLine(left, top, left, bottom);
        drawArc(left + size * 0.4, top + size * 0.35, size * 0.4, size * 0.35, -Math.PI / 2, Math.PI / 2);
        drawLine(left, top + size * 0.7, left + size * 0.4, top + size * 0.7);
        drawLine(midX, midY, right, bottom);
        break;
      case 'S':
        drawArc(midX, top + size * 0.3, size * 0.5, size * 0.3, Math.PI * 0.2, Math.PI * 1.3);
        drawArc(midX, midY + size * 0.1, size * 0.5, size * 0.35, Math.PI * 1.7, Math.PI * 0.8);
        break;
      case 'T':
        drawLine(left, top, right, top);
        drawLine(midX, top, midX, bottom);
        break;
      case 'U':
        drawLine(left, top, left, midY + size * 0.2);
        drawArc(midX, midY + size * 0.2, size * 0.6, size * 0.5, Math.PI, 0);
        drawLine(right, midY + size * 0.2, right, top);
        break;
      case 'V':
        drawLine(left, top, midX, bottom);
        drawLine(midX, bottom, right, top);
        break;
      case 'W':
        drawLine(left, top, left + size * 0.25, bottom);
        drawLine(left + size * 0.25, bottom, midX, midY);
        drawLine(midX, midY, right - size * 0.25, bottom);
        drawLine(right - size * 0.25, bottom, right, top);
        break;
      case 'X':
        drawLine(left, top, right, bottom);
        drawLine(right, top, left, bottom);
        break;
      case 'Y':
        drawLine(left, top, midX, midY);
        drawLine(right, top, midX, midY);
        drawLine(midX, midY, midX, bottom);
        break;
      case 'Z':
        drawLine(left, top, right, top);
        drawLine(right, top, left, bottom);
        drawLine(left, bottom, right, bottom);
        break;

      case 'a':
        drawArc(midX + size * 0.1, midY + size * 0.1, size * 0.45, size * 0.5, Math.PI * 0.2, Math.PI * 1.8);
        drawLine(right - size * 0.05, top + size * 0.3, right - size * 0.05, bottom);
        break;
      case 'b':
        drawLine(left + size * 0.1, top - size * 0.2, left + size * 0.1, bottom);
        drawArc(midX + size * 0.1, midY + size * 0.1, size * 0.45, size * 0.5, Math.PI * 0.2, Math.PI * 1.8);
        break;
      case 'c':
        drawArc(midX, midY + size * 0.1, size * 0.45, size * 0.5, Math.PI * 0.3, Math.PI * 1.7);
        break;
      case 'd':
        drawArc(midX - size * 0.1, midY + size * 0.1, size * 0.45, size * 0.5, Math.PI * 0.2, Math.PI * 1.8);
        drawLine(right - size * 0.1, top - size * 0.2, right - size * 0.1, bottom);
        break;
      case 'e':
        drawArc(midX, midY + size * 0.1, size * 0.45, size * 0.5, Math.PI * 0.3, Math.PI * 1.7);
        drawLine(left + size * 0.1, midY + size * 0.1, right - size * 0.1, midY + size * 0.1);
        break;
      case 'f':
        drawArc(midX, top + size * 0.3, size * 0.35, size * 0.3, Math.PI * 0.3, Math.PI * 1.5);
        drawLine(midX - size * 0.1, top + size * 0.3, midX - size * 0.1, bottom);
        drawLine(left + size * 0.1, midY, right - size * 0.2, midY);
        break;
      case 'g':
        drawArc(midX + size * 0.05, midY - size * 0.1, size * 0.45, size * 0.5, Math.PI * 0.2, Math.PI * 1.8);
        drawLine(right - size * 0.05, top + size * 0.4, right - size * 0.05, bottom - size * 0.2);
        drawArc(midX, bottom - size * 0.2, size * 0.35, size * 0.25, 0, Math.PI * 1.2);
        break;
      case 'h':
        drawLine(left + size * 0.1, top - size * 0.2, left + size * 0.1, bottom);
        drawLine(left + size * 0.1, midY - size * 0.1, right - size * 0.1, bottom);
        break;
      case 'i':
        drawLine(midX, top + size * 0.1, midX, bottom);
        ctx.beginPath();
        const [dotX, dotY] = applySlant(midX, top - size * 0.05);
        ctx.arc(dotX, dotY, params.strokeWidth * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = params.color;
        ctx.fill();
        break;
      case 'j':
        drawLine(right - size * 0.2, top + size * 0.1, right - size * 0.2, bottom - size * 0.3);
        drawArc(midX - size * 0.05, bottom - size * 0.3, size * 0.25, size * 0.2, 0, Math.PI);
        ctx.beginPath();
        const [jDotX, jDotY] = applySlant(right - size * 0.2, top - size * 0.05);
        ctx.arc(jDotX, jDotY, params.strokeWidth * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = params.color;
        ctx.fill();
        break;
      case 'k':
        drawLine(left + size * 0.15, top - size * 0.2, left + size * 0.15, bottom);
        drawLine(left + size * 0.15, midY - size * 0.1, right - size * 0.1, top + size * 0.3);
        drawLine(left + size * 0.15, midY, right - size * 0.1, bottom);
        break;
      case 'l':
        drawLine(midX - size * 0.1, top - size * 0.2, midX - size * 0.1, bottom);
        break;
      case 'm':
        drawLine(left, top, left, bottom);
        drawLine(left, top, midX - size * 0.15, bottom);
        drawLine(midX - size * 0.15, bottom, midX + size * 0.15, top);
        drawLine(midX + size * 0.15, top, right, bottom);
        break;
      case 'n':
        drawLine(left, top, left, bottom);
        drawLine(left, top, right, bottom);
        drawLine(right, top, right, bottom);
        break;
      case 'o':
        drawArc(midX, midY + size * 0.1, size * 0.45, size * 0.5, 0, Math.PI * 2);
        break;
      case 'p':
        drawLine(left + size * 0.1, top, left + size * 0.1, bottom + size * 0.2);
        drawArc(midX + size * 0.05, midY - size * 0.05, size * 0.45, size * 0.5, Math.PI * 0.2, Math.PI * 1.8);
        break;
      case 'q':
        drawArc(midX - size * 0.05, midY - size * 0.05, size * 0.45, size * 0.5, Math.PI * 0.2, Math.PI * 1.8);
        drawLine(right - size * 0.1, top, right - size * 0.1, bottom + size * 0.2);
        break;
      case 'r':
        drawLine(left + size * 0.1, top, left + size * 0.1, bottom);
        drawArc(left + size * 0.2, top + size * 0.2, size * 0.3, size * 0.25, Math.PI, Math.PI * 1.6);
        break;
      case 's':
        drawArc(midX, top + size * 0.35, size * 0.4, size * 0.2, Math.PI * 0.2, Math.PI * 1.3);
        drawArc(midX, midY + size * 0.1, size * 0.4, size * 0.25, Math.PI * 1.7, Math.PI * 0.8);
        break;
      case 't':
        drawLine(left + size * 0.15, top, right - size * 0.15, top);
        drawLine(midX, top, midX, bottom);
        break;
      case 'u':
        drawLine(left, top, left, midY + size * 0.3);
        drawArc(midX, midY + size * 0.3, size * 0.45, size * 0.35, Math.PI, 0);
        drawLine(right, midY + size * 0.3, right, top);
        break;
      case 'v':
        drawLine(left, top, midX, bottom);
        drawLine(midX, bottom, right, top);
        break;
      case 'w':
        drawLine(left, top, left + size * 0.2, bottom);
        drawLine(left + size * 0.2, bottom, midX, midY + size * 0.1);
        drawLine(midX, midY + size * 0.1, right - size * 0.2, bottom);
        drawLine(right - size * 0.2, bottom, right, top);
        break;
      case 'x':
        drawLine(left, top, right, bottom);
        drawLine(right, top, left, bottom);
        break;
      case 'y':
        drawLine(left, top, midX, midY + size * 0.1);
        drawLine(right, top, midX, midY + size * 0.1);
        drawLine(midX, midY + size * 0.1, midX - size * 0.2, bottom);
        drawLine(midX, midY + size * 0.1, right - size * 0.1, bottom + size * 0.15);
        break;
      case 'z':
        drawLine(left, top, right, top);
        drawLine(right, top, left, bottom);
        drawLine(left, bottom, right, bottom);
        break;

      case '0':
        drawArc(midX, midY, size * 0.5, size * 0.7, 0, Math.PI * 2);
        drawLine(midX - size * 0.2, top + size * 0.2, midX + size * 0.2, bottom - size * 0.2);
        break;
      case '1':
        drawLine(midX - size * 0.2, top + size * 0.1, midX, top);
        drawLine(midX, top, midX, bottom);
        break;
      case '2':
        drawArc(midX, top + size * 0.3, size * 0.4, size * 0.3, Math.PI * 0.3, Math.PI * 1.5);
        drawLine(right - size * 0.1, midY - size * 0.1, left + size * 0.1, bottom - size * 0.1);
        drawLine(left + size * 0.1, bottom - size * 0.1, right - size * 0.1, bottom - size * 0.1);
        break;
      case '3':
        drawArc(midX, top + size * 0.25, size * 0.4, size * 0.25, -Math.PI / 2, Math.PI / 2);
        drawArc(midX, midY + size * 0.15, size * 0.45, size * 0.35, Math.PI * 1.5, Math.PI * 0.5);
        break;
      case '4':
        drawLine(right - size * 0.2, top, right - size * 0.2, bottom);
        drawLine(left + size * 0.1, midY, right - size * 0.2, top);
        drawLine(left + size * 0.1, midY, right, midY);
        break;
      case '5':
        drawLine(left + size * 0.1, top, right - size * 0.1, top);
        drawLine(left + size * 0.1, top, left + size * 0.1, midY - size * 0.1);
        drawArc(midX + size * 0.05, midY + size * 0.1, size * 0.4, size * 0.4, Math.PI * 0.8, Math.PI * 1.9);
        break;
      case '6':
        drawArc(midX, top + size * 0.2, size * 0.35, size * 0.2, Math.PI * 0.5, Math.PI * 1.8);
        drawArc(midX, midY + size * 0.1, size * 0.45, size * 0.5, 0, Math.PI * 2);
        break;
      case '7':
        drawLine(left, top, right, top);
        drawLine(right, top, left + size * 0.2, bottom);
        break;
      case '8':
        drawArc(midX, top + size * 0.25, size * 0.4, size * 0.25, 0, Math.PI * 2);
        drawArc(midX, midY + size * 0.15, size * 0.5, size * 0.4, 0, Math.PI * 2);
        break;
      case '9':
        drawArc(midX, midY - size * 0.1, size * 0.45, size * 0.5, 0, Math.PI * 2);
        drawArc(midX, bottom - size * 0.2, size * 0.35, size * 0.2, Math.PI * 1.2, Math.PI * 0.5);
        break;

      default:
        drawArc(midX, midY, size * 0.3, size * 0.4, 0, Math.PI * 2);
    }
  }

  public getBaseChars(): string {
    return BASE_CHARS;
  }
}
