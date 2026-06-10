import { TransformParams } from './TransformController';

export interface RendererElements {
  card: HTMLElement;
  perspectiveContainer: HTMLElement;
  canvas: HTMLCanvasElement;
}

export class Renderer {
  private elements: RendererElements;
  private ctx: CanvasRenderingContext2D;

  constructor(elements: RendererElements) {
    this.elements = elements;
    const ctx = elements.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.setupCanvas();
  }

  private setupCanvas(): void {
    const { canvas } = this.elements;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  update(params: TransformParams): void {
    this.updateCSS(params);
    this.drawCanvas(params);
  }

  private updateCSS(params: TransformParams): void {
    const { card, perspectiveContainer } = this.elements;

    perspectiveContainer.style.perspective = `${params.perspective}px`;
    perspectiveContainer.style.perspectiveOrigin = `${params.perspectiveOriginX}% ${params.perspectiveOriginY}%`;

    card.style.transformOrigin = `${params.transformOriginX}% 50%`;
    card.style.transform = `translateZ(${params.translateZ}px) rotateX(${params.rotateX}deg) rotateY(${params.rotateY}deg)`;
  }

  private drawCanvas(params: TransformParams): void {
    const { canvas } = this.elements;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    this.ctx.clearRect(0, 0, width, height);

    const centerX = width * (params.perspectiveOriginX / 100);
    const centerY = height * (params.perspectiveOriginY / 100);

    this.drawPerspectiveGrid(centerX, centerY, width, height, params.perspective);
    this.drawAxes(centerX, centerY, params);
    this.drawOriginMarker(centerX, centerY);
  }

  private drawPerspectiveGrid(
    cx: number,
    cy: number,
    width: number,
    height: number,
    perspective: number
  ): void {
    const ctx = this.ctx;
    const gridSpacing = 50;
    const maxLines = 20;
    const opacity = Math.min(0.4, perspective / 1000);

    ctx.save();
    ctx.strokeStyle = `rgba(189, 195, 199, ${opacity})`;
    ctx.lineWidth = 0.5;

    for (let i = -maxLines; i <= maxLines; i++) {
      const offset = i * gridSpacing;
      if (offset === 0) continue;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const angle = (offset / perspective) * Math.PI / 4;
      const endX = cx + Math.cos(angle - Math.PI / 2) * Math.max(width, height) * 2;
      const endY = cy + Math.sin(angle - Math.PI / 2) * Math.max(width, height) * 2;
      ctx.lineTo(endX, endY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const angle2 = (offset / perspective) * Math.PI / 4 + Math.PI / 2;
      const endX2 = cx + Math.cos(angle2 - Math.PI / 2) * Math.max(width, height) * 2;
      const endY2 = cy + Math.sin(angle2 - Math.PI / 2) * Math.max(width, height) * 2;
      ctx.lineTo(endX2, endY2);
      ctx.stroke();
    }

    ctx.strokeStyle = `rgba(189, 195, 199, ${opacity * 0.6})`;
    for (let i = 1; i <= 10; i++) {
      const radius = i * (perspective / 10);
      ctx.beginPath();
      ctx.ellipse(cx, cy, radius, radius * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawAxes(cx: number, cy: number, params: TransformParams): void {
    const ctx = this.ctx;
    const axisLength = 120;

    const radX = (params.rotateX * Math.PI) / 180;
    const radY = (params.rotateY * Math.PI) / 180;

    const project3D = (x: number, y: number, z: number): { x: number; y: number; scale: number } => {
      const cosX = Math.cos(radX);
      const sinX = Math.sin(radX);
      const cosY = Math.cos(radY);
      const sinY = Math.sin(radY);

      const x1 = x * cosY + z * sinY;
      const z1 = -x * sinY + z * cosY;
      const y1 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;

      const perspective = params.perspective;
      const scale = perspective / (perspective + z2 + params.translateZ);

      return {
        x: cx + x1 * scale,
        y: cy + y1 * scale,
        scale
      };
    };

    ctx.save();
    ctx.lineWidth = 2.5;

    ctx.strokeStyle = '#e74c3c';
    ctx.beginPath();
    const xStart = project3D(-axisLength / 2, 0, 0);
    const xEnd = project3D(axisLength / 2, 0, 0);
    ctx.moveTo(xStart.x, xStart.y);
    ctx.lineTo(xEnd.x, xEnd.y);
    ctx.stroke();

    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('X', xEnd.x + 5, xEnd.y);

    ctx.strokeStyle = '#2ecc71';
    ctx.beginPath();
    const yStart = project3D(0, -axisLength / 2, 0);
    const yEnd = project3D(0, axisLength / 2, 0);
    ctx.moveTo(yStart.x, yStart.y);
    ctx.lineTo(yEnd.x, yEnd.y);
    ctx.stroke();

    ctx.fillStyle = '#2ecc71';
    ctx.fillText('Y', yEnd.x + 5, yEnd.y);

    ctx.strokeStyle = '#3498db';
    ctx.beginPath();
    const zStart = project3D(0, 0, -axisLength / 2);
    const zEnd = project3D(0, 0, axisLength / 2);
    ctx.moveTo(zStart.x, zStart.y);
    ctx.lineTo(zEnd.x, zEnd.y);
    ctx.stroke();

    ctx.fillStyle = '#3498db';
    ctx.fillText('Z', zEnd.x + 5, zEnd.y);

    ctx.restore();
  }

  private drawOriginMarker(cx: number, cy: number): void {
    const ctx = this.ctx;

    ctx.save();

    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.fillText('O', cx + 12, cy - 8);

    ctx.restore();
  }

  resize(): void {
    this.setupCanvas();
  }
}
