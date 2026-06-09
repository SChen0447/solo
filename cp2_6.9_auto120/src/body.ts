import { BODY_WIDTH, BODY_HEIGHT, MERIDIANS, FlowParams, getWaveOffset, getGlowStyle, lerpColor } from './meridians.js';

export interface AcuPoint {
  id: string;
  name: string;
  x: number;
  y: number;
  meridianId: string;
  energy: number;
}

interface PulseAnimation {
  acuPoint: AcuPoint;
  startTime: number;
  duration: number;
}

export const ACU_POINTS: AcuPoint[] = [
  { id: 'hegu', name: '合谷', x: 162, y: 320, meridianId: 'large_intestine', energy: 75 },
  { id: 'zusanli', name: '足三里', x: 145, y: 460, meridianId: 'stomach', energy: 82 },
  { id: 'baihui', name: '百会', x: 100, y: 50, meridianId: 'gallbladder', energy: 90 },
  { id: 'neiguan', name: '内关', x: 52, y: 310, meridianId: 'pericardium', energy: 70 },
  { id: 'shenmen', name: '神门', x: 38, y: 330, meridianId: 'heart', energy: 68 }
];

export const BODY_PATH = `
M 100 20
C 85 20 75 30 75 45
C 75 60 85 70 100 75
C 75 80 65 95 62 120
L 55 160
C 45 170 30 190 25 210
C 20 230 22 260 28 280
L 35 300
L 40 340
C 50 350 55 360 55 370
L 58 390
L 55 410
C 50 430 48 460 50 490
C 52 520 55 550 52 580
L 50 595
L 62 595
L 65 580
C 68 560 70 530 72 500
C 75 470 78 440 82 420
L 85 400
L 88 400
C 90 440 92 480 90 520
C 88 550 85 575 82 595
L 80 595
L 120 595
C 118 575 115 550 113 520
C 111 480 113 440 115 400
L 118 400
L 121 420
C 125 440 128 470 131 500
C 133 530 135 560 138 580
L 140 595
L 152 595
L 150 580
C 147 550 150 520 152 490
C 154 460 152 430 147 410
L 144 390
L 147 370
C 147 360 152 350 162 340
L 167 300
L 174 280
C 180 260 182 230 177 210
C 172 190 157 170 147 160
L 140 120
C 137 95 127 80 102 75
C 117 70 127 60 127 45
C 127 30 117 20 100 20 Z
`;

export class BodyRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private pulses: PulseAnimation[] = [];
  private selectedAcuPoint: AcuPoint | null = null;
  private tooltipElement: HTMLElement | null = null;
  private container: HTMLElement;
  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block';
    this.canvas.style.cursor = 'pointer';
    container.appendChild(this.canvas);
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.setupCanvas();
    this.setupTooltip();
    this.setupEvents();
    this.updateAcuEnergyRandom();
  }

  private setupCanvas(): void {
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.calculateTransform(rect.width, rect.height);
  }

  private calculateTransform(width: number, height: number): void {
    const scaleX = (width - 240) / BODY_WIDTH;
    const scaleY = height / BODY_HEIGHT;
    this.scale = Math.min(scaleX, scaleY, 1.2);
    this.offsetX = (width - BODY_WIDTH * this.scale) / 2;
    this.offsetY = (height - BODY_HEIGHT * this.scale) / 2;
  }

  private setupTooltip(): void {
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.style.cssText = `
      position: absolute;
      display: none;
      padding: 10px 14px;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 8px;
      color: #ffffff;
      font-size: 14px;
      pointer-events: none;
      z-index: 100;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      white-space: nowrap;
    `;
    this.container.appendChild(this.tooltipElement);
  }

  private setupEvents(): void {
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => this.hideTooltip());
  }

  private getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;
    return {
      x: (canvasX - this.offsetX) / this.scale,
      y: (canvasY - this.offsetY) / this.scale
    };
  }

  private handleClick(e: MouseEvent): void {
    const coords = this.getCanvasCoords(e.clientX, e.clientY);
    for (const point of ACU_POINTS) {
      const dist = Math.hypot(coords.x - point.x, coords.y - point.y);
      if (dist < 12) {
        this.triggerPulse(point);
        this.showTooltip(point, e.clientX, e.clientY);
        return;
      }
    }
    this.hideTooltip();
  }

  private handleMouseMove(e: MouseEvent): void {
    const coords = this.getCanvasCoords(e.clientX, e.clientY);
    let hovered: AcuPoint | null = null;
    for (const point of ACU_POINTS) {
      const dist = Math.hypot(coords.x - point.x, coords.y - point.y);
      if (dist < 12) {
        hovered = point;
        break;
      }
    }
    if (hovered) {
      this.showTooltip(hovered, e.clientX, e.clientY);
    } else if (!this.selectedAcuPoint) {
      this.hideTooltip();
    }
  }

  private showTooltip(point: AcuPoint, clientX: number, clientY: number): void {
    if (!this.tooltipElement) return;
    this.selectedAcuPoint = point;
    this.tooltipElement.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px;">${point.name}</div>
      <div style="opacity: 0.9;">能量值: <span id="energy-value">${Math.round(point.energy)}</span></div>
    `;
    this.tooltipElement.style.display = 'block';
    const rect = this.container.getBoundingClientRect();
    const tooltipRect = this.tooltipElement.getBoundingClientRect();
    let left = clientX - rect.left + 15;
    let top = clientY - rect.top - tooltipRect.height - 10;
    if (left + tooltipRect.width > rect.width) {
      left = clientX - rect.left - tooltipRect.width - 15;
    }
    if (top < 0) {
      top = clientY - rect.top + 15;
    }
    this.tooltipElement.style.left = `${left}px`;
    this.tooltipElement.style.top = `${top}px`;
  }

  private hideTooltip(): void {
    if (this.tooltipElement) {
      this.tooltipElement.style.display = 'none';
    }
    this.selectedAcuPoint = null;
  }

  private triggerPulse(point: AcuPoint): void {
    this.pulses.push({
      acuPoint: point,
      startTime: performance.now(),
      duration: 1500
    });
  }

  private updateAcuEnergyRandom(): void {
    setInterval(() => {
      for (const point of ACU_POINTS) {
        const delta = (Math.random() - 0.5) * 2;
        point.energy = Math.max(0, Math.min(100, point.energy + delta));
      }
      if (this.selectedAcuPoint && this.tooltipElement) {
        const energyEl = this.tooltipElement.querySelector('#energy-value');
        if (energyEl) {
          energyEl.textContent = `${Math.round(this.selectedAcuPoint.energy)}`;
        }
      }
    }, 200);
  }

  public render(params: FlowParams): void {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);
    this.ctx.save();
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);
    this.drawBody(params);
    this.drawMeridians(params);
    this.drawPulses();
    this.drawAcuPoints(params);
    this.ctx.restore();
  }

  private drawBody(params: FlowParams): void {
    const path = new Path2D(BODY_PATH);
    this.ctx.save();
    this.ctx.strokeStyle = '#888888';
    this.ctx.lineWidth = 1.5;
    this.ctx.fillStyle = 'transparent';
    this.ctx.stroke(path);
    if (params.isNightMode) {
      this.ctx.shadowColor = 'rgba(255, 255, 255, 0.1)';
      this.ctx.shadowBlur = 5;
      this.ctx.stroke(path);
    }
    this.ctx.restore();
  }

  private drawMeridians(params: FlowParams): void {
    for (const meridian of MERIDIANS) {
      const waveOffset = getWaveOffset(meridian, params);
      const glow = getGlowStyle(meridian, params);
      const path = new Path2D(meridian.path);
      this.ctx.save();
      this.ctx.lineWidth = 2 + (params.intensity / 100) * 2;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      const gradient = this.ctx.createLinearGradient(0, 0, BODY_WIDTH, BODY_HEIGHT);
      const tempAdjustedStart = lerpColor(meridian.colorStart, '#4B9EFF', 1 - params.temperature);
      const tempAdjustedEnd = lerpColor(meridian.colorEnd, '#FF4B4B', params.temperature);
      gradient.addColorStop(0, tempAdjustedStart);
      gradient.addColorStop(1, tempAdjustedEnd);
      this.ctx.strokeStyle = gradient;
      this.ctx.globalAlpha = 0.4 + (params.intensity / 100) * 0.6;
      this.ctx.shadowColor = glow.color;
      this.ctx.shadowBlur = glow.blur;
      this.ctx.save();
      this.ctx.translate(0, waveOffset);
      this.ctx.stroke(path);
      this.ctx.restore();
      this.drawFlowParticles(meridian, params, waveOffset);
      this.ctx.restore();
    }
  }

  private drawFlowParticles(meridian: typeof MERIDIANS[0], params: FlowParams, waveOffset: number): void {
    const particleCount = Math.floor(3 + (params.intensity / 100) * 5);
    const speed = 0.5 * params.speedMultiplier * meridian.speed;
    for (let i = 0; i < particleCount; i++) {
      const t = ((params.time * speed + i / particleCount) % 1);
      const pos = this.getPointOnPath(meridian.path, t);
      if (pos) {
        const radius = 2 + (params.intensity / 100) * 2;
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y + waveOffset, radius, 0, Math.PI * 2);
        const color = lerpColor(meridian.colorStart, meridian.colorEnd, t);
        this.ctx.fillStyle = color;
        this.ctx.globalAlpha = 0.6 + Math.sin(params.time * 4 + i) * 0.3;
        this.ctx.fill();
      }
    }
  }

  private getPointOnPath(pathStr: string, t: number): { x: number; y: number } | null {
    const commands = this.parsePath(pathStr);
    if (commands.length === 0) return null;
    const totalLength = this.estimatePathLength(commands);
    const targetLength = totalLength * t;
    let accumulated = 0;
    let current = { x: 0, y: 0 };
    for (const cmd of commands) {
      if (cmd.type === 'M') {
        current = { x: cmd.x!, y: cmd.y! };
      } else if (cmd.type === 'L') {
        const dx = cmd.x! - current.x;
        const dy = cmd.y! - current.y;
        const len = Math.hypot(dx, dy);
        if (accumulated + len >= targetLength) {
          const ratio = (targetLength - accumulated) / len;
          return {
            x: current.x + dx * ratio,
            y: current.y + dy * ratio
          };
        }
        accumulated += len;
        current = { x: cmd.x!, y: cmd.y! };
      } else if (cmd.type === 'C') {
        const len = this.estimateBezierLength(current, { x: cmd.cp1x!, y: cmd.cp1y! }, { x: cmd.cp2x!, y: cmd.cp2y! }, { x: cmd.x!, y: cmd.y! });
        if (accumulated + len >= targetLength) {
          const ratio = (targetLength - accumulated) / len;
          return this.bezierPoint(current, { x: cmd.cp1x!, y: cmd.cp1y! }, { x: cmd.cp2x!, y: cmd.cp2y! }, { x: cmd.x!, y: cmd.y! }, ratio);
        }
        accumulated += len;
        current = { x: cmd.x!, y: cmd.y! };
      }
    }
    return current;
  }

  private parsePath(pathStr: string): Array<{ type: string; x?: number; y?: number; cp1x?: number; cp1y?: number; cp2x?: number; cp2y?: number }> {
    const commands: Array<{ type: string; x?: number; y?: number; cp1x?: number; cp1y?: number; cp2x?: number; cp2y?: number }> = [];
    const tokens = pathStr.trim().split(/[\s,]+/);
    let i = 0;
    while (i < tokens.length) {
      const cmd = tokens[i];
      i++;
      if (cmd === 'M' || cmd === 'L') {
        const x = parseFloat(tokens[i++]);
        const y = parseFloat(tokens[i++]);
        commands.push({ type: cmd, x, y });
      } else if (cmd === 'C') {
        const cp1x = parseFloat(tokens[i++]);
        const cp1y = parseFloat(tokens[i++]);
        const cp2x = parseFloat(tokens[i++]);
        const cp2y = parseFloat(tokens[i++]);
        const x = parseFloat(tokens[i++]);
        const y = parseFloat(tokens[i++]);
        commands.push({ type: cmd, cp1x, cp1y, cp2x, cp2y, x, y });
      }
    }
    return commands;
  }

  private estimatePathLength(commands: Array<{ type: string; x?: number; y?: number; cp1x?: number; cp1y?: number; cp2x?: number; cp2y?: number }>): number {
    let length = 0;
    let current = { x: 0, y: 0 };
    for (const cmd of commands) {
      if (cmd.type === 'M') {
        current = { x: cmd.x!, y: cmd.y! };
      } else if (cmd.type === 'L') {
        length += Math.hypot(cmd.x! - current.x, cmd.y! - current.y);
        current = { x: cmd.x!, y: cmd.y! };
      } else if (cmd.type === 'C') {
        length += this.estimateBezierLength(current, { x: cmd.cp1x!, y: cmd.cp1y! }, { x: cmd.cp2x!, y: cmd.cp2y! }, { x: cmd.x!, y: cmd.y! });
        current = { x: cmd.x!, y: cmd.y! };
      }
    }
    return length;
  }

  private estimateBezierLength(p0: { x: number; y: number }, p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }): number {
    let length = 0;
    let prev = p0;
    for (let i = 1; i <= 10; i++) {
      const t = i / 10;
      const curr = this.bezierPoint(p0, p1, p2, p3, t);
      length += Math.hypot(curr.x - prev.x, curr.y - prev.y);
      prev = curr;
    }
    return length;
  }

  private bezierPoint(p0: { x: number; y: number }, p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }, t: number): { x: number; y: number } {
    const mt = 1 - t;
    return {
      x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
      y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y
    };
  }

  private drawPulses(): void {
    const now = performance.now();
    this.pulses = this.pulses.filter(pulse => {
      const elapsed = now - pulse.startTime;
      if (elapsed > pulse.duration) return false;
      const progress = elapsed / pulse.duration;
      const radius = 10 + progress * 90;
      const alpha = 1 - progress;
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(pulse.acuPoint.x, pulse.acuPoint.y, radius, 0, Math.PI * 2);
      const gradient = this.ctx.createRadialGradient(
        pulse.acuPoint.x, pulse.acuPoint.y, 0,
        pulse.acuPoint.x, pulse.acuPoint.y, radius
      );
      const meridian = MERIDIANS.find(m => m.id === pulse.acuPoint.meridianId);
      const color = meridian ? lerpColor(meridian.colorStart, meridian.colorEnd, 0.5) : '#FFD700';
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'transparent');
      this.ctx.fillStyle = gradient;
      this.ctx.globalAlpha = alpha * 0.6;
      this.ctx.fill();
      this.ctx.restore();
      return true;
    });
  }

  private drawAcuPoints(params: FlowParams): void {
    for (const point of ACU_POINTS) {
      this.ctx.save();
      const isSelected = this.selectedAcuPoint?.id === point.id;
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, 12, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 236, 139, ${isSelected ? 0.4 : 0.2})`;
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
      this.ctx.fillStyle = '#FFEC8B';
      this.ctx.shadowColor = '#FFEC8B';
      this.ctx.shadowBlur = params.isNightMode ? 8 : 4;
      this.ctx.fill();
      this.ctx.restore();
    }
  }
}
