const BPM = 120;
const BEAT_INTERVAL = 60000 / BPM;
const MIN_AMPLITUDE = 3;
const MAX_AMPLITUDE = 12;
const SEGMENT_WIDTH = 40;

export class Terrain {
  private width: number;
  private height: number;
  private baseHeights: number[] = [];
  private beatPhase: number = 0;
  private startTime: number = 0;
  private baseTerrainY: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.width = canvasWidth;
    this.height = canvasHeight;
    this.baseTerrainY = canvasHeight * 0.65;
    this.generateHeights();
    this.startTime = performance.now();
  }

  private generateHeights(): void {
    const segmentCount = Math.ceil(this.width / SEGMENT_WIDTH) + 2;
    this.baseHeights = [];
    const minHeight = this.height * 0.08;
    const maxHeight = this.height * 0.25;

    for (let i = 0; i < segmentCount; i++) {
      const h = minHeight + Math.random() * (maxHeight - minHeight);
      this.baseHeights.push(h);
    }
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    this.width = canvasWidth;
    this.height = canvasHeight;
    this.baseTerrainY = canvasHeight * 0.65;
    this.generateHeights();
  }

  update(currentTime: number): void {
    const elapsed = currentTime - this.startTime;
    this.beatPhase = (elapsed % BEAT_INTERVAL) / BEAT_INTERVAL;
  }

  getBeatPhase(): number {
    return this.beatPhase;
  }

  private getWaveOffset(): number {
    const sine = Math.sin(this.beatPhase * Math.PI * 2);
    const normalized = (sine + 1) / 2;
    return MIN_AMPLITUDE + normalized * (MAX_AMPLITUDE - MIN_AMPLITUDE);
  }

  getHeightAt(x: number): number {
    const waveOffset = this.getWaveOffset();
    const segmentIndex = Math.floor(x / SEGMENT_WIDTH);
    const localX = (x % SEGMENT_WIDTH) / SEGMENT_WIDTH;

    const i1 = Math.max(0, Math.min(segmentIndex, this.baseHeights.length - 1));
    const i2 = Math.max(0, Math.min(segmentIndex + 1, this.baseHeights.length - 1));

    const h1 = this.baseHeights[i1];
    const h2 = this.baseHeights[i2];

    const triangleWave = 1 - Math.abs(localX * 2 - 1);
    const interpolated = h1 + (h2 - h1) * triangleWave;

    return this.baseTerrainY - interpolated - waveOffset;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const waveOffset = this.getWaveOffset();
    const color1 = this.parseColor('#556b2f');
    const color2 = this.parseColor('#8b4513');

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    ctx.beginPath();
    ctx.moveTo(0, this.height);

    for (let x = 0; x <= this.width; x += 2) {
      const y = this.getHeightAt(x);
      ctx.lineTo(x, y);
    }

    ctx.lineTo(this.width, this.height);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, this.baseTerrainY - this.height * 0.25 - waveOffset, 0, this.height);
    gradient.addColorStop(0, this.colorToString(color1));
    gradient.addColorStop(1, this.colorToString(color2));
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    for (let x = 0; x <= this.width; x += 2) {
      const y = this.getHeightAt(x);
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  private parseColor(hex: string): { r: number; g: number; b: number } {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16)
    };
  }

  private colorToString(c: { r: number; g: number; b: number }): string {
    return `rgb(${c.r},${c.g},${c.b})`;
  }
}
