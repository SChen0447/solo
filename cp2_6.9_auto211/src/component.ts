import type { GridPoint } from './maze';

export type ComponentType = 'resistor' | 'capacitor' | 'led' | 'switch' | 'wire';
export type Rotation = 0 | 90 | 180 | 270;

export interface ComponentParams {
  label: string;
  value: string;
}

const COMPONENT_DEFAULTS: Record<ComponentType, { params: ComponentParams; width: number; height: number }> = {
  resistor: { params: { label: 'R', value: '100Ω' }, width: 70, height: 24 },
  capacitor: { params: { label: 'C', value: '10μF' }, width: 50, height: 36 },
  led: { params: { label: 'LED', value: '2.2V' }, width: 44, height: 44 },
  switch: { params: { label: 'SW', value: 'OFF' }, width: 60, height: 30 },
  wire: { params: { label: '', value: '' }, width: 40, height: 40 },
};

function generateId(): string {
  return `comp_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export class CircuitComponent {
  id: string;
  type: ComponentType;
  gridPos: GridPoint;
  rotation: Rotation;
  targetRotation: Rotation;
  rotationProgress: number;
  params: ComponentParams;
  isHovered: boolean;
  isOn: boolean;
  width: number;
  height: number;

  constructor(type: ComponentType, gridPos: GridPoint) {
    this.id = generateId();
    this.type = type;
    this.gridPos = gridPos;
    this.rotation = 0;
    this.targetRotation = 0;
    this.rotationProgress = 1;
    this.params = { ...COMPONENT_DEFAULTS[type].params };
    this.isHovered = false;
    this.isOn = type === 'switch' ? false : true;
    this.width = COMPONENT_DEFAULTS[type].width;
    this.height = COMPONENT_DEFAULTS[type].height;
  }

  rotate(): void {
    this.rotation = this.targetRotation;
    this.targetRotation = ((this.targetRotation + 90) % 360) as Rotation;
    this.rotationProgress = 0;
  }

  updateAnimation(deltaTime: number): void {
    if (this.rotationProgress < 1) {
      this.rotationProgress = Math.min(1, this.rotationProgress + deltaTime * 5);
    }
  }

  getCurrentRotation(): number {
    const t = easeOut(this.rotationProgress);
    let diff = this.targetRotation - this.rotation;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return this.rotation + diff * t;
  }

  toggleSwitch(): void {
    if (this.type === 'switch') {
      this.isOn = !this.isOn;
      this.params.value = this.isOn ? 'ON' : 'OFF';
    }
  }

  containsPoint(px: number, py: number): boolean {
    const dx = px - this.gridPos.x;
    const dy = py - this.gridPos.y;
    const angle = -this.getCurrentRotation() * Math.PI / 180;
    const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
    const ry = dx * Math.sin(angle) + dy * Math.cos(angle);
    const hw = Math.max(this.width, this.height) / 2 + 4;
    const hh = Math.max(this.width, this.height) / 2 + 4;
    return rx >= -hw && rx <= hw && ry >= -hh && ry <= hh;
  }

  getConnectionPoints(): { x: number; y: number }[] {
    const angle = this.getCurrentRotation() * Math.PI / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const pts: { x: number; y: number }[] = [];
    const { x, y } = this.gridPos;

    if (this.type === 'wire') {
      const offsets = [
        { dx: -20, dy: 0 },
        { dx: 20, dy: 0 },
      ];
      for (const o of offsets) {
        pts.push({
          x: x + o.dx * cos - o.dy * sin,
          y: y + o.dx * sin + o.dy * cos,
        });
      }
    } else {
      const halfW = this.width / 2;
      const offsets = [
        { dx: -halfW, dy: 0 },
        { dx: halfW, dy: 0 },
      ];
      for (const o of offsets) {
        pts.push({
          x: x + o.dx * cos - o.dy * sin,
          y: y + o.dx * sin + o.dy * cos,
        });
      }
    }
    return pts;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.gridPos;
    const rotation = this.getCurrentRotation();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation * Math.PI / 180);

    switch (this.type) {
      case 'wire':
        this.renderWire(ctx);
        break;
      case 'resistor':
        this.renderResistor(ctx);
        break;
      case 'capacitor':
        this.renderCapacitor(ctx);
        break;
      case 'led':
        this.renderLED(ctx);
        break;
      case 'switch':
        this.renderSwitch(ctx);
        break;
    }

    ctx.restore();

    if (this.isHovered) {
      this.renderHoverBorder(ctx);
      this.renderParamTooltip(ctx);
    }
  }

  private renderHoverBorder(ctx: CanvasRenderingContext2D): void {
    const size = Math.max(this.width, this.height) / 2 + 8;
    ctx.save();
    ctx.translate(this.gridPos.x, this.gridPos.y);
    ctx.rotate(this.getCurrentRotation() * Math.PI / 180);
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(-size, -size, size * 2, size * 2);
    ctx.restore();
  }

  private renderParamTooltip(ctx: CanvasRenderingContext2D): void {
    if (this.type === 'wire') return;
    const { x, y } = this.gridPos;
    const text = `${this.params.label}: ${this.params.value}`;
    const fontSize = 12;
    const paddingX = 10;
    const paddingY = 6;

    ctx.save();
    ctx.font = `${fontSize}px 'Consolas', 'Monaco', monospace`;
    const textWidth = ctx.measureText(text).width;
    const boxWidth = textWidth + paddingX * 2;
    const boxHeight = fontSize + paddingY * 2;
    const boxX = x - boxWidth / 2;
    const boxY = y - Math.max(this.width, this.height) / 2 - boxHeight - 14;

    ctx.fillStyle = 'rgba(31, 41, 55, 0.92)';
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, boxY + boxHeight / 2 + 1);
    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private renderWire(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.strokeStyle = '#B0B0B0';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.lineTo(20, 0);
    ctx.stroke();

    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.lineTo(20, 0);
    ctx.stroke();
    ctx.restore();
  }

  private renderResistor(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const w = this.width;
    const h = 10;

    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(-w / 2 + 10, 0);
    ctx.moveTo(w / 2 - 10, 0);
    ctx.lineTo(w / 2, 0);
    ctx.stroke();

    const bodyW = w - 20;
    ctx.fillStyle = '#D4A574';
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, -bodyW / 2, -h / 2, bodyW, h, 3);
    ctx.fill();
    ctx.stroke();

    const bands = ['#000000', '#8B4513', '#228B22'];
    const bandSpacing = bodyW / (bands.length + 1);
    bands.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(-bodyW / 2 + bandSpacing * (i + 1) - 2, -h / 2, 4, h);
    });
    ctx.restore();
  }

  private renderCapacitor(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const plateW = 10;
    const plateH = this.height;
    const gap = 8;

    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-this.width / 2, 0);
    ctx.lineTo(-gap / 2 - plateW / 2, 0);
    ctx.moveTo(gap / 2 + plateW / 2, 0);
    ctx.lineTo(this.width / 2, 0);
    ctx.stroke();

    ctx.fillStyle = '#4A90D9';
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-gap / 2 - plateW, -plateH / 2, plateW, plateH);
    ctx.strokeRect(-gap / 2 - plateW, -plateH / 2, plateW, plateH);
    ctx.fillRect(gap / 2, -plateH / 2, plateW, plateH);
    ctx.strokeRect(gap / 2, -plateH / 2, plateW, plateH);
    ctx.restore();
  }

  private renderLED(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const size = 28;

    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-this.width / 2, 0);
    ctx.lineTo(-size / 2 + 2, 0);
    ctx.moveTo(size / 2 - 2, 0);
    ctx.lineTo(this.width / 2, 0);
    ctx.stroke();

    ctx.fillStyle = '#E53E3E';
    ctx.strokeStyle = '#C53030';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-size / 2, -size / 2);
    ctx.lineTo(size / 2 - 4, 0);
    ctx.lineTo(-size / 2, size / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-size / 2, -size / 2 + 5);
    ctx.lineTo(-size / 2, size / 2 - 5);
    ctx.stroke();

    ctx.strokeStyle = '#81E6D9';
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.7;
    const arrows = [
      { x: 6, y: -16, dx: 6, dy: -6 },
      { x: 12, y: -8, dx: 5, dy: -5 },
    ];
    arrows.forEach(a => {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(a.x + a.dx, a.y + a.dy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(a.x + a.dx, a.y + a.dy);
      ctx.lineTo(a.x + a.dx - 3, a.y + a.dy + 1);
      ctx.moveTo(a.x + a.dx, a.y + a.dy);
      ctx.lineTo(a.x + a.dx + 1, a.y + a.dy - 3);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private renderSwitch(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const w = this.width;
    const contactR = 5;

    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(-w / 2 + 14, 0);
    ctx.moveTo(w / 2 - 14, 0);
    ctx.lineTo(w / 2, 0);
    ctx.stroke();

    ctx.fillStyle = '#374151';
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-w / 2 + 14, 0, contactR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w / 2 - 14, 0, contactR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (this.isOn) {
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 14, 0);
      ctx.lineTo(w / 2 - 14, 0);
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 14, 0);
      ctx.lineTo(w / 2 - 20, -16);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function renderComponentIcon(container: HTMLElement, type: ComponentType): void {
  const canvas = document.createElement('canvas');
  const size = 44;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.translate(size / 2, size / 2);
  void COMPONENT_DEFAULTS[type];

  ctx.save();
  ctx.scale(0.6, 0.6);

  switch (type) {
    case 'wire':
      ctx.strokeStyle = '#B0B0B0';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-30, 0);
      ctx.lineTo(30, 0);
      ctx.stroke();
      break;
    case 'resistor':
      const rw = 50;
      ctx.strokeStyle = '#6B7280';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-rw / 2, 0);
      ctx.lineTo(-rw / 2 + 8, 0);
      ctx.moveTo(rw / 2 - 8, 0);
      ctx.lineTo(rw / 2, 0);
      ctx.stroke();
      ctx.fillStyle = '#D4A574';
      ctx.strokeStyle = '#8B6914';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-(rw - 16) / 2, -7, rw - 16, 14, 3);
      ctx.fill();
      ctx.stroke();
      break;
    case 'capacitor':
      const cw = 8;
      const ch = 24;
      ctx.strokeStyle = '#6B7280';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-28, 0);
      ctx.lineTo(-10, 0);
      ctx.moveTo(10, 0);
      ctx.lineTo(28, 0);
      ctx.stroke();
      ctx.fillStyle = '#4A90D9';
      ctx.fillRect(-10 - cw, -ch / 2, cw, ch);
      ctx.fillRect(2, -ch / 2, cw, ch);
      break;
    case 'led':
      ctx.fillStyle = '#E53E3E';
      ctx.strokeStyle = '#C53030';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-14, -14);
      ctx.lineTo(14, 0);
      ctx.lineTo(-14, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-14, -9);
      ctx.lineTo(-14, 9);
      ctx.stroke();
      break;
    case 'switch':
      const sw = 40;
      ctx.strokeStyle = '#6B7280';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-sw / 2, 0);
      ctx.lineTo(-sw / 2 + 10, 0);
      ctx.moveTo(sw / 2 - 10, 0);
      ctx.lineTo(sw / 2, 0);
      ctx.stroke();
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-sw / 2 + 10, 0);
      ctx.lineTo(sw / 2 - 14, -12);
      ctx.stroke();
      break;
  }
  ctx.restore();

  container.innerHTML = '';
  container.appendChild(canvas);
}

export { lerp };
