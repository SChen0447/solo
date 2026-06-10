export interface CharacterData {
  char: string;
  positions: Float32Array;
  centerX: number;
  width: number;
}

export interface PoemData {
  text: string;
  characters: CharacterData[];
}

export class PoemManager {
  private poems: string[] = [
    '月光在湖面上行走',
    '繁星落入梦境深处',
    '风吹动时间的琴弦'
  ];

  private currentIndex: number = 0;
  private particlesPerChar: number = 250;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private fontSize: number = 120;
  private charSpacing: number = 140;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 2048;
    this.canvas.height = 512;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取Canvas 2D上下文');
    }
    this.ctx = ctx;
  }

  setPoems(poems: string[]): void {
    this.poems = poems;
  }

  getCurrentPoem(): string {
    return this.poems[this.currentIndex];
  }

  getPoemCount(): number {
    return this.poems.length;
  }

  switchPoem(index: number): PoemData {
    this.currentIndex = ((index % this.poems.length) + this.poems.length) % this.poems.length;
    return this.generatePoemData();
  }

  generatePoemData(): PoemData {
    const text = this.poems[this.currentIndex];
    const characters: CharacterData[] = [];

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.font = `bold ${this.fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = 'center';

    const totalWidth = text.length * this.charSpacing;
    const startX = (this.canvas.width - totalWidth) / 2 + this.charSpacing / 2;
    const centerY = this.canvas.height / 2;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const centerX = startX + i * this.charSpacing;

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillText(char, centerX, centerY);

      const positions = this.samplePositionsFromCanvas(centerX, centerY);

      characters.push({
        char,
        positions,
        centerX: (centerX - this.canvas.width / 2) * 0.015,
        width: this.charSpacing * 0.015
      });
    }

    return {
      text,
      characters
    };
  }

  private samplePositionsFromCanvas(centerX: number, centerY: number): Float32Array {
    const imageData = this.ctx.getImageData(
      Math.floor(centerX - this.fontSize / 2),
      Math.floor(centerY - this.fontSize / 2),
      this.fontSize,
      this.fontSize
    );

    const positions = new Float32Array(this.particlesPerChar * 3);
    let count = 0;
    const data = imageData.data;
    const w = imageData.width;
    const h = imageData.height;

    const sampledPoints: { x: number; y: number }[] = [];
    const step = 2;

    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const idx = (y * w + x) * 4;
        if (data[idx + 3] > 128) {
          sampledPoints.push({ x, y });
        }
      }
    }

    for (let i = 0; i < this.particlesPerChar; i++) {
      if (sampledPoints.length > 0) {
        const idx = Math.floor(Math.random() * sampledPoints.length);
        const point = sampledPoints[idx];
        positions[count * 3] = (point.x - w / 2) * 0.015;
        positions[count * 3 + 1] = -(point.y - h / 2) * 0.015;
        positions[count * 3 + 2] = (Math.random() - 0.5) * 0.3;
        count++;
      } else {
        positions[count * 3] = (Math.random() - 0.5) * 0.5;
        positions[count * 3 + 1] = (Math.random() - 0.5) * 0.5;
        positions[count * 3 + 2] = (Math.random() - 0.5) * 0.3;
        count++;
      }
    }

    return positions;
  }

  getParticlesPerChar(): number {
    return this.particlesPerChar;
  }
}
