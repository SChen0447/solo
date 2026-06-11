import type { Phenotype } from './Genome';

export type Emotion = 'happy' | 'hungry' | 'tired' | 'neutral';
export type PetState = 'egg' | 'hatched';

export interface RenderParams {
  phenotype: Phenotype;
  emotion: Emotion;
  state: PetState;
  temperature: number;
  humidity: number;
  bounceOffset: number;
  breathScale: number;
}

export class PetRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  render(params: RenderParams): void {
    const { ctx, canvas } = this;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (params.state === 'egg') {
      this.renderEgg(centerX, centerY + params.bounceOffset, params);
    } else {
      this.renderPet(centerX, centerY + params.bounceOffset, params);
    }
  }

  private renderEgg(x: number, y: number, params: RenderParams): void {
    const { ctx } = this;
    const baseSize = 75 * params.breathScale;

    const eggWidth = baseSize;
    const eggHeight = baseSize * 1.3;

    const tempFactor = (params.temperature - 22) / 20;
    const coldColor = { r: 168, g: 216, b: 234 };
    const warmColor = { r: 255, g: 204, b: 128 };
    const baseColor = { r: 245, g: 230, b: 200 };
    const goldColor = { r: 212, g: 175, b: 55 };

    let finalR = baseColor.r;
    let finalG = baseColor.g;
    let finalB = baseColor.b;

    if (tempFactor < 0) {
      const t = Math.abs(tempFactor);
      finalR = baseColor.r + (coldColor.r - baseColor.r) * t;
      finalG = baseColor.g + (coldColor.g - baseColor.g) * t;
      finalB = baseColor.b + (coldColor.b - baseColor.b) * t;
    } else {
      const t = Math.min(tempFactor, 1);
      finalR = baseColor.r + (warmColor.r - baseColor.r) * t;
      finalG = baseColor.g + (warmColor.g - baseColor.g) * t;
      finalB = baseColor.b + (warmColor.b - baseColor.b) * t;
    }

    ctx.save();
    ctx.translate(x, y);

    const gradient = ctx.createRadialGradient(-eggWidth * 0.3, -eggHeight * 0.3, 5, 0, 0, eggWidth);
    gradient.addColorStop(0, `rgb(${finalR + 20}, ${finalG + 20}, ${finalB + 20})`);
    gradient.addColorStop(0.7, `rgb(${finalR}, ${finalG}, ${finalB})`);
    gradient.addColorStop(1, `rgb(${goldColor.r * 0.6}, ${goldColor.g * 0.6}, ${goldColor.b * 0.6})`);

    ctx.beginPath();
    ctx.ellipse(0, 0, eggWidth, eggHeight, 0, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = `rgba(${goldColor.r}, ${goldColor.g}, ${goldColor.b}, 0.4)`;
    ctx.lineWidth = 2;

    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      const spiralY = -eggHeight * 0.3 + i * eggHeight * 0.3;
      const spiralWidth = eggWidth * (0.6 - i * 0.15);
      ctx.ellipse(0, spiralY, spiralWidth, spiralWidth * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 5;

    ctx.beginPath();
    ctx.ellipse(0, 0, eggWidth, eggHeight, 0, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.restore();
  }

  private renderPet(x: number, y: number, params: RenderParams): void {
    const { ctx } = this;
    const { phenotype, emotion } = params;
    const sizeScale = this.getBodyScale(phenotype.bodyType);
    const baseSize = 60 * sizeScale * params.breathScale;

    ctx.save();
    ctx.translate(x, y);

    if (phenotype.glow) {
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 30;
    }

    if (phenotype.rainbow) {
      const rainbowGradient = ctx.createLinearGradient(-baseSize, -baseSize, baseSize, baseSize);
      rainbowGradient.addColorStop(0, '#ff6b6b');
      rainbowGradient.addColorStop(0.2, '#ffd93d');
      rainbowGradient.addColorStop(0.4, '#6bcf7f');
      rainbowGradient.addColorStop(0.6, '#4ecdc4');
      rainbowGradient.addColorStop(0.8, '#a855f7');
      rainbowGradient.addColorStop(1, '#ff6b6b');
    }

    this.renderTail(baseSize, phenotype);
    this.renderBody(baseSize, phenotype);
    this.renderPattern(baseSize, phenotype);
    this.renderEars(baseSize, phenotype);
    this.renderFace(baseSize, phenotype, emotion);
    this.renderBelly(baseSize, phenotype);

    if (phenotype.glow) {
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  private getBodyScale(bodyType: string): number {
    switch (bodyType) {
      case 'slim': return 0.85;
      case 'sturdy': return 1.2;
      default: return 1.0;
    }
  }

  private renderBody(size: number, phenotype: Phenotype): void {
    const { ctx } = this;
    const bodyWidth = size;
    const bodyHeight = size * 0.9;

    ctx.beginPath();
    ctx.ellipse(0, size * 0.2, bodyWidth, bodyHeight, 0, 0, Math.PI * 2);
    ctx.fillStyle = phenotype.furColor;
    ctx.fill();

    const headSize = size * 0.75;
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.4, headSize, headSize * 0.9, 0, 0, Math.PI * 2);
    ctx.fillStyle = phenotype.furColor;
    ctx.fill();
  }

  private renderBelly(size: number, phenotype: Phenotype): void {
    const { ctx } = this;
    const bellyWidth = size * 0.5;
    const bellyHeight = size * 0.6;

    ctx.beginPath();
    ctx.ellipse(0, size * 0.35, bellyWidth, bellyHeight, 0, 0, Math.PI * 2);
    ctx.fillStyle = phenotype.secondaryColor;
    ctx.fill();
  }

  private renderEars(size: number, phenotype: Phenotype): void {
    const { ctx } = this;
    const headSize = size * 0.75;
    const earY = -size * 0.4 - headSize * 0.6;

    switch (phenotype.earShape) {
      case 'round':
        this.drawRoundEar(-headSize * 0.5, earY, size * 0.3, phenotype);
        this.drawRoundEar(headSize * 0.5, earY, size * 0.3, phenotype);
        break;
      case 'pointed':
        this.drawPointedEar(-headSize * 0.5, earY, size * 0.35, phenotype);
        this.drawPointedEar(headSize * 0.5, earY, size * 0.35, phenotype);
        break;
      case 'floppy':
        this.drawFloppyEar(-headSize * 0.5, earY - size * 0.1, size * 0.35, phenotype);
        this.drawFloppyEar(headSize * 0.5, earY - size * 0.1, size * 0.35, phenotype);
        break;
    }
  }

  private drawRoundEar(x: number, y: number, size: number, phenotype: Phenotype): void {
    const { ctx } = this;
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 1.1, 0, 0, Math.PI * 2);
    ctx.fillStyle = phenotype.furColor;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(x, y + size * 0.1, size * 0.6, size * 0.7, 0, 0, Math.PI * 2);
    ctx.fillStyle = phenotype.secondaryColor;
    ctx.fill();
  }

  private drawPointedEar(x: number, y: number, size: number, phenotype: Phenotype): void {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x - size * 0.6, y + size * 0.3);
    ctx.lineTo(x + size * 0.6, y + size * 0.3);
    ctx.closePath();
    ctx.fillStyle = phenotype.furColor;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.6);
    ctx.lineTo(x - size * 0.35, y + size * 0.2);
    ctx.lineTo(x + size * 0.35, y + size * 0.2);
    ctx.closePath();
    ctx.fillStyle = phenotype.secondaryColor;
    ctx.fill();
  }

  private drawFloppyEar(x: number, y: number, size: number, phenotype: Phenotype): void {
    const { ctx } = this;
    ctx.beginPath();
    ctx.ellipse(x, y + size * 0.5, size * 0.6, size * 1.2, x > 0 ? 0.3 : -0.3, 0, Math.PI * 2);
    ctx.fillStyle = phenotype.furColor;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(x, y + size * 0.6, size * 0.35, size * 0.9, x > 0 ? 0.3 : -0.3, 0, Math.PI * 2);
    ctx.fillStyle = phenotype.secondaryColor;
    ctx.fill();
  }

  private renderFace(size: number, phenotype: Phenotype, emotion: Emotion): void {
    const { ctx } = this;
    const eyeY = -size * 0.45;
    const eyeSpacing = size * 0.35;
    const eyeSize = size * 0.12;

    if (emotion === 'tired') {
      ctx.beginPath();
      ctx.ellipse(-eyeSpacing, eyeY, eyeSize, eyeSize * 0.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#333';
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(eyeSpacing, eyeY, eyeSize, eyeSize * 0.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#333';
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(-eyeSpacing, eyeY, eyeSize, eyeSize * 1.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = phenotype.eyeColor;
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(eyeSpacing, eyeY, eyeSize, eyeSize * 1.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = phenotype.eyeColor;
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(-eyeSpacing - eyeSize * 0.3, eyeY - eyeSize * 0.4, eyeSize * 0.35, eyeSize * 0.4, -0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(eyeSpacing - eyeSize * 0.3, eyeY - eyeSize * 0.4, eyeSize * 0.35, eyeSize * 0.4, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const noseY = -size * 0.25;
    ctx.beginPath();
    ctx.moveTo(0, noseY);
    ctx.lineTo(-size * 0.08, noseY + size * 0.06);
    ctx.lineTo(size * 0.08, noseY + size * 0.06);
    ctx.closePath();
    ctx.fillStyle = '#4a4a4a';
    ctx.fill();

    const mouthY = -size * 0.15;
    if (emotion === 'happy') {
      ctx.beginPath();
      ctx.arc(0, mouthY, size * 0.15, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.strokeStyle = '#4a4a4a';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (emotion === 'hungry') {
      ctx.beginPath();
      ctx.ellipse(0, mouthY + size * 0.05, size * 0.1, size * 0.08, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#4a4a4a';
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(-size * 0.08, mouthY);
      ctx.lineTo(0, mouthY + size * 0.05);
      ctx.lineTo(size * 0.08, mouthY);
      ctx.strokeStyle = '#4a4a4a';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (emotion === 'happy') {
      ctx.fillStyle = 'rgba(255, 150, 150, 0.5)';
      ctx.beginPath();
      ctx.ellipse(-eyeSpacing - size * 0.1, eyeY + size * 0.2, size * 0.12, size * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(eyeSpacing + size * 0.1, eyeY + size * 0.2, size * 0.12, size * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderTail(size: number, phenotype: Phenotype): void {
    const { ctx } = this;
    let tailLength = size * 0.8;
    let tailWidth = size * 0.25;

    switch (phenotype.tailLength) {
      case 'short':
        tailLength = size * 0.4;
        tailWidth = size * 0.2;
        break;
      case 'long':
        tailLength = size * 1.3;
        tailWidth = size * 0.3;
        break;
    }

    ctx.save();
    ctx.translate(size * 0.7, size * 0.2);
    ctx.rotate(0.5);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(tailLength * 0.5, -tailLength * 0.3, tailLength, -tailLength * 0.1);
    ctx.quadraticCurveTo(tailLength * 0.5, tailLength * 0.1, 0, tailWidth);
    ctx.closePath();
    ctx.fillStyle = phenotype.furColor;
    ctx.fill();

    ctx.restore();
  }

  private renderPattern(size: number, phenotype: Phenotype): void {
    if (phenotype.pattern === 'none') return;

    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = 0.7;

    switch (phenotype.pattern) {
      case 'stripes':
        this.renderStripes(size, phenotype);
        break;
      case 'spots':
        this.renderSpots(size, phenotype);
        break;
      case 'flames':
        this.renderFlames(size, phenotype);
        break;
    }

    ctx.restore();
  }

  private renderStripes(size: number, phenotype: Phenotype): void {
    const { ctx } = this;
    ctx.fillStyle = phenotype.spotColor;

    for (let i = 0; i < 5; i++) {
      const y = -size * 0.1 + i * size * 0.15;
      const width = size * 0.8 - Math.abs(i - 2) * size * 0.15;
      const height = size * 0.06;

      ctx.beginPath();
      ctx.ellipse(0, y, width, height, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderSpots(size: number, phenotype: Phenotype): void {
    const { ctx } = this;
    ctx.fillStyle = phenotype.spotColor;

    const spots = [
      [-size * 0.4, -size * 0.1, size * 0.12],
      [size * 0.35, size * 0.05, size * 0.1],
      [-size * 0.2, size * 0.2, size * 0.14],
      [size * 0.45, size * 0.3, size * 0.11],
      [0, size * 0.4, size * 0.09]
    ];

    for (const [x, y, r] of spots) {
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderFlames(size: number, phenotype: Phenotype): void {
    const { ctx } = this;
    ctx.fillStyle = phenotype.spotColor;

    const flames = [
      [-size * 0.3, size * 0.1, size * 0.15],
      [size * 0.25, size * 0.2, size * 0.12],
      [0, size * 0.35, size * 0.18]
    ];

    for (const [x, y, h] of flames) {
      ctx.beginPath();
      ctx.moveTo(x, y + h * 0.3);
      ctx.quadraticCurveTo(x - h * 0.4, y, x, y - h);
      ctx.quadraticCurveTo(x + h * 0.4, y, x, y + h * 0.3);
      ctx.fill();
    }
  }
}
