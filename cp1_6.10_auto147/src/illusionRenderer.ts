export type IllusionType = 'herrmann' | 'kanizsa' | 'snakes';

export interface HerrmannParams {
  lineWidth: number;
  gridSpacing: number;
  cornerRadius: number;
  gridColor: string;
  bgColor: string;
}

export interface KanizsaParams {
  pacmanRadius: number;
  triangleSize: number;
  pacmanRotation: number;
  showTriangle: boolean;
  outlineOpacity: number;
}

export interface SnakesParams {
  rotationSpeed: number;
  ringCount: number;
  segmentCount: number;
  scale: number;
  contrast: number;
}

export type IllusionParams = HerrmannParams | KanizsaParams | SnakesParams;

export const DEFAULT_PARAMS: Record<IllusionType, IllusionParams> = {
  herrmann: {
    lineWidth: 6,
    gridSpacing: 60,
    cornerRadius: 0,
    gridColor: '#ffffff',
    bgColor: '#1a1a2e'
  } as HerrmannParams,
  kanizsa: {
    pacmanRadius: 55,
    triangleSize: 200,
    pacmanRotation: 0,
    showTriangle: true,
    outlineOpacity: 0.0
  } as KanizsaParams,
  snakes: {
    rotationSpeed: 1.0,
    ringCount: 4,
    segmentCount: 12,
    scale: 1.0,
    contrast: 1.0
  } as SnakesParams
};

export class IllusionRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 0;
  private globalTime: number = 0;
  private pendingRender: boolean = false;
  private currentIllusion: IllusionType = 'herrmann';
  private currentParams: IllusionParams = { ...DEFAULT_PARAMS.herrmann };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;
  }

  getFps(): number {
    return this.fps;
  }

  private measureFps(timestamp: number): void {
    this.frameCount++;
    if (timestamp - this.lastFrameTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFrameTime = timestamp;
    }
  }

  private renderLoop = (timestamp: number): void => {
    this.measureFps(timestamp);
    this.globalTime = timestamp;

    if (this.pendingRender || this.currentIllusion === 'snakes') {
      this.pendingRender = false;
      this.doRender();
    }

    this.animationId = requestAnimationFrame(this.renderLoop);
  };

  start(): void {
    if (this.animationId === null) {
      this.lastFrameTime = performance.now();
      this.animationId = requestAnimationFrame(this.renderLoop);
    }
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  render(illusionType: IllusionType, params: IllusionParams): void {
    this.currentIllusion = illusionType;
    this.currentParams = { ...params };
    this.pendingRender = true;
  }

  private doRender(): void {
    const { width, height } = this.canvas;
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, width, height);

    switch (this.currentIllusion) {
      case 'herrmann':
        this.drawHerrmannGrid(this.currentParams as HerrmannParams);
        break;
      case 'kanizsa':
        this.drawKanizsaTriangle(this.currentParams as KanizsaParams);
        break;
      case 'snakes':
        this.drawRotatingSnakes(this.currentParams as SnakesParams);
        break;
    }
  }

  private drawHerrmannGrid(params: HerrmannParams): void {
    const { width, height } = this.canvas;
    const { lineWidth, gridSpacing, cornerRadius, gridColor, bgColor } = params;

    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(0, 0, width, height);

    const cellSize = gridSpacing;
    const totalWidth = Math.ceil(width / cellSize) * cellSize;
    const totalHeight = Math.ceil(height / cellSize) * cellSize;
    const offsetX = (width - totalWidth) / 2;
    const offsetY = (height - totalHeight) / 2;

    this.ctx.fillStyle = gridColor;

    for (let y = offsetY; y <= offsetY + totalHeight; y += cellSize) {
      this.ctx.fillRect(offsetX, y - lineWidth / 2, totalWidth, lineWidth);
    }

    for (let x = offsetX; x <= offsetX + totalWidth; x += cellSize) {
      this.ctx.fillRect(x - lineWidth / 2, offsetY, lineWidth, totalHeight);
    }

    if (cornerRadius > 0) {
      this.ctx.fillStyle = bgColor;
      for (let x = offsetX; x <= offsetX + totalWidth; x += cellSize) {
        for (let y = offsetY; y <= offsetY + totalHeight; y += cellSize) {
          this.ctx.beginPath();
          this.ctx.arc(x, y, cornerRadius, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }

      this.ctx.fillStyle = gridColor;
      for (let x = offsetX; x <= offsetX + totalWidth; x += cellSize) {
        for (let y = offsetY + cellSize; y < offsetY + totalHeight; y += cellSize) {
          this.ctx.fillRect(x - lineWidth / 2, y - lineWidth / 2 + cornerRadius, lineWidth, lineWidth - cornerRadius * 2);
        }
      }
      for (let y = offsetY; y <= offsetY + totalHeight; y += cellSize) {
        for (let x = offsetX + cellSize; x < offsetX + totalWidth; x += cellSize) {
          this.ctx.fillRect(x - lineWidth / 2 + cornerRadius, y - lineWidth / 2, lineWidth - cornerRadius * 2, lineWidth);
        }
      }
    }
  }

  private drawKanizsaTriangle(params: KanizsaParams): void {
    const { width, height } = this.canvas;
    const { pacmanRadius, triangleSize, pacmanRotation, showTriangle, outlineOpacity } = params;

    const centerX = width / 2;
    const centerY = height / 2;
    const h = (triangleSize * Math.sqrt(3)) / 2;

    const top = { x: centerX, y: centerY - (2 / 3) * h };
    const bottomLeft = { x: centerX - triangleSize / 2, y: centerY + (1 / 3) * h };
    const bottomRight = { x: centerX + triangleSize / 2, y: centerY + (1 / 3) * h };

    if (showTriangle) {
      this.ctx.save();
      this.ctx.fillStyle = `rgba(234, 234, 234, ${outlineOpacity})`;
      this.ctx.beginPath();
      this.ctx.moveTo(top.x, top.y);
      this.ctx.lineTo(bottomLeft.x, bottomLeft.y);
      this.ctx.lineTo(bottomRight.x, bottomRight.y);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
    }

    this.drawPacman(top.x, top.y, pacmanRadius, 180 + pacmanRotation, '#ffffff');
    this.drawPacman(bottomLeft.x, bottomLeft.y, pacmanRadius, 300 + pacmanRotation, '#ffffff');
    this.drawPacman(bottomRight.x, bottomRight.y, pacmanRadius, 60 + pacmanRotation, '#ffffff');

    this.ctx.strokeStyle = '#eaeaea';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(top.x, top.y);
    this.ctx.lineTo(bottomLeft.x, bottomLeft.y);
    this.ctx.lineTo(bottomRight.x, bottomRight.y);
    this.ctx.closePath();
    this.ctx.strokeStyle = `rgba(234, 234, 234, ${outlineOpacity})`;
    this.ctx.stroke();
  }

  private drawPacman(cx: number, cy: number, radius: number, angle: number, color: string): void {
    const startAngle = ((angle - 30) * Math.PI) / 180;
    const endAngle = ((angle + 30) * Math.PI) / 180;

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy);
    this.ctx.arc(cx, cy, radius, startAngle, endAngle);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawRotatingSnakes(params: SnakesParams): void {
    const { width, height } = this.canvas;
    const { rotationSpeed, ringCount, segmentCount, scale, contrast } = params;

    const centerX = width / 2;
    const centerY = height / 2;
    const baseRadius = 55 * scale;
    const time = this.globalTime * 0.001 * rotationSpeed;

    const palette = [
      this.adjustContrast('#000000', contrast),
      this.adjustContrast('#ffffff', contrast),
      this.adjustContrast('#e94560', contrast),
      this.adjustContrast('#533483', contrast)
    ];

    for (let ring = 0; ring < ringCount; ring++) {
      const ringRadius = baseRadius * (ring + 1);
      const rotationDir = ring % 2 === 0 ? 1 : -1;
      const ringRotation = time * rotationDir * (1 + ring * 0.15);

      for (let seg = 0; seg < segmentCount; seg++) {
        const segAngle = (seg / segmentCount) * Math.PI * 2 + ringRotation;
        const segWidth = (Math.PI * 2) / segmentCount;

        for (let layer = 0; layer < 2; layer++) {
          const layerRadius = ringRadius - layer * (baseRadius * 0.35);
          const colorIdx = (seg + layer + ring) % palette.length;

          this.ctx.fillStyle = palette[colorIdx];
          this.ctx.beginPath();
          this.ctx.arc(centerX, centerY, layerRadius, segAngle, segAngle + segWidth);
          this.ctx.arc(centerX, centerY, layerRadius - baseRadius * 0.3, segAngle + segWidth, segAngle, true);
          this.ctx.closePath();
          this.ctx.fill();
        }
      }
    }

    this.ctx.fillStyle = this.adjustContrast('#0f3460', contrast);
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, baseRadius * 0.45, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private adjustContrast(color: string, factor: number): string {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    const adjust = (c: number) => {
      const v = Math.round(128 + (c - 128) * factor);
      return Math.max(0, Math.min(255, v));
    };

    return `rgb(${adjust(r)}, ${adjust(g)}, ${adjust(b)})`;
  }
}
