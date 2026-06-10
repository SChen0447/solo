import { v4 as uuidv4 } from 'uuid';

export type ElementType = 'box' | 'pressurePlate' | 'laserEmitter' | 'laserReceiver' | 'door' | 'wall';
export type Direction = 'up' | 'down' | 'left' | 'right';
export type TriggerType = 'manual' | 'touched' | 'laserHit';

export const GRID_SIZE = 32;
export const CANVAS_SIZE = 400;
export const GRID_COLS = CANVAS_SIZE / GRID_SIZE;
export const GRID_ROWS = CANVAS_SIZE / GRID_SIZE;

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  gridX: number;
  gridY: number;
  direction?: Direction;
  triggerType?: TriggerType;
  isActive: boolean;
  isOpen?: boolean;
  initialState: {
    x: number;
    y: number;
    isActive: boolean;
    direction?: Direction;
    isOpen?: boolean;
  };
}

export interface LaserConnection {
  id: string;
  emitterId: string;
  receiverId: string;
}

export interface LaserBeam {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  hitReceiverId?: string;
}

export const ELEMENT_CONFIGS: Record<ElementType, { name: string; color: string; shape: string }> = {
  box: { name: '箱子', color: '#f39c12', shape: 'square' },
  pressurePlate: { name: '压力板', color: '#555591', shape: 'rect' },
  laserEmitter: { name: '激光发射器', color: '#e74c3c', shape: 'triangle' },
  laserReceiver: { name: '激光接收器', color: '#8b0000', shape: 'circle' },
  door: { name: '门', color: '#8b5a2b', shape: 'door' },
  wall: { name: '墙壁', color: '#555555', shape: 'square' },
};

export function createElement(type: ElementType, gridX: number, gridY: number): BaseElement {
  const x = gridX * GRID_SIZE;
  const y = gridY * GRID_SIZE;
  const base: BaseElement = {
    id: uuidv4(),
    type,
    x,
    y,
    gridX,
    gridY,
    isActive: false,
    initialState: { x, y, isActive: false },
  };

  if (type === 'laserEmitter') {
    base.direction = 'right';
    base.initialState.direction = 'right';
  }
  if (type === 'door') {
    base.isOpen = false;
    base.initialState.isOpen = false;
  }
  if (type === 'pressurePlate' || type === 'laserReceiver') {
    base.triggerType = 'laserHit';
  }

  return base;
}

export function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export function updateGridPosition(el: BaseElement): void {
  el.gridX = Math.floor(el.x / GRID_SIZE);
  el.gridY = Math.floor(el.y / GRID_SIZE);
}

export function resetElement(el: BaseElement): void {
  el.x = el.initialState.x;
  el.y = el.initialState.y;
  el.isActive = el.initialState.isActive;
  el.direction = el.initialState.direction;
  el.isOpen = el.initialState.isOpen;
  updateGridPosition(el);
}

export function renderElement(ctx: CanvasRenderingContext2D, el: BaseElement, isSelected: boolean, time: number): void {
  ctx.save();
  const cx = el.x + GRID_SIZE / 2;
  const cy = el.y + GRID_SIZE / 2;

  if (isSelected) {
    ctx.shadowColor = '#00d2ff';
    ctx.shadowBlur = 12;
  }

  switch (el.type) {
    case 'box':
      renderBox(ctx, el.x, el.y);
      break;
    case 'pressurePlate':
      renderPressurePlate(ctx, el.x, el.y, el.isActive);
      break;
    case 'laserEmitter':
      renderLaserEmitter(ctx, cx, cy, el.direction || 'right');
      break;
    case 'laserReceiver':
      renderLaserReceiver(ctx, cx, cy, el.isActive, time);
      break;
    case 'door':
      renderDoor(ctx, el.x, el.y, el.isOpen || false, time);
      break;
    case 'wall':
      renderWall(ctx, el.x, el.y);
      break;
  }

  ctx.restore();
}

function renderBox(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const grad = ctx.createLinearGradient(x, y, x + GRID_SIZE, y + GRID_SIZE);
  grad.addColorStop(0, '#f5b041');
  grad.addColorStop(1, '#d68910');
  ctx.fillStyle = grad;
  ctx.fillRect(x + 2, y + 2, GRID_SIZE - 4, GRID_SIZE - 4);
  ctx.strokeStyle = '#a04000';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 2, y + 2, GRID_SIZE - 4, GRID_SIZE - 4);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x + 6, y + 6, GRID_SIZE - 12, 3);
  ctx.fillRect(x + 6, y + GRID_SIZE - 9, GRID_SIZE - 12, 3);
}

function renderPressurePlate(ctx: CanvasRenderingContext2D, x: number, y: number, isActive: boolean): void {
  const color = isActive ? '#27ae60' : '#555591';
  const glow = isActive ? '#2ecc71' : '#6666aa';
  const grad = ctx.createLinearGradient(x, y, x, y + GRID_SIZE);
  grad.addColorStop(0, glow);
  grad.addColorStop(1, color);
  ctx.fillStyle = grad;
  const h = 10;
  ctx.fillRect(x + 2, y + GRID_SIZE - h - 2, GRID_SIZE - 4, h);
  ctx.strokeStyle = isActive ? '#1e8449' : '#444477';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 2, y + GRID_SIZE - h - 2, GRID_SIZE - 4, h);
}

function renderLaserEmitter(ctx: CanvasRenderingContext2D, cx: number, cy: number, dir: Direction): void {
  ctx.save();
  ctx.translate(cx, cy);
  const angles: Record<Direction, number> = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
  ctx.rotate(angles[dir]);
  const grad = ctx.createLinearGradient(-12, -12, 12, 12);
  grad.addColorStop(0, '#e74c3c');
  grad.addColorStop(1, '#922b21');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(-10, -10);
  ctx.lineTo(-10, 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#641e16';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#ff6b6b';
  ctx.beginPath();
  ctx.arc(8, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderLaserReceiver(ctx: CanvasRenderingContext2D, cx: number, cy: number, isActive: boolean, time: number): void {
  const pulse = isActive ? 0.5 + 0.5 * Math.sin(time * 0.008) : 0;
  const color = isActive ? '#00ff00' : '#8b0000';
  const glow = isActive ? `rgba(0, 255, 0, ${0.3 + pulse * 0.4})` : 'rgba(139, 0, 0, 0.3)';
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, 16 + pulse * 3, 0, Math.PI * 2);
  ctx.fill();
  const grad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, 12);
  grad.addColorStop(0, isActive ? '#aaffaa' : '#cc4444');
  grad.addColorStop(1, color);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isActive ? '#00aa00' : '#5c0000';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function renderDoor(ctx: CanvasRenderingContext2D, x: number, y: number, isOpen: boolean, time: number): void {
  ctx.save();
  const pivotX = x + 2;
  const pivotY = y + 2;
  ctx.translate(pivotX, pivotY);
  const targetAngle = isOpen ? -Math.PI / 2.5 : 0;
  const angle = targetAngle;
  ctx.rotate(angle);
  const grad = ctx.createLinearGradient(0, 0, GRID_SIZE - 4, GRID_SIZE - 4);
  grad.addColorStop(0, '#a0522d');
  grad.addColorStop(1, '#5d3a1a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, GRID_SIZE - 4, GRID_SIZE - 4);
  ctx.strokeStyle = '#3e2723';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0, 0, GRID_SIZE - 4, GRID_SIZE - 4);
  ctx.fillStyle = '#f1c40f';
  ctx.beginPath();
  ctx.arc(GRID_SIZE - 10, GRID_SIZE / 2 - 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderWall(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const grad = ctx.createLinearGradient(x, y, x + GRID_SIZE, y + GRID_SIZE);
  grad.addColorStop(0, '#777777');
  grad.addColorStop(1, '#444444');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, GRID_SIZE, GRID_SIZE);
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, GRID_SIZE - 1, GRID_SIZE - 1);
  ctx.strokeStyle = '#222222';
  ctx.beginPath();
  ctx.moveTo(x, y + GRID_SIZE / 2);
  ctx.lineTo(x + GRID_SIZE, y + GRID_SIZE / 2);
  ctx.moveTo(x + GRID_SIZE / 2, y);
  ctx.lineTo(x + GRID_SIZE / 2, y + GRID_SIZE / 2);
  ctx.moveTo(x + GRID_SIZE / 4, y + GRID_SIZE / 2);
  ctx.lineTo(x + GRID_SIZE / 4, y + GRID_SIZE);
  ctx.moveTo(x + (GRID_SIZE * 3) / 4, y + GRID_SIZE / 2);
  ctx.lineTo(x + (GRID_SIZE * 3) / 4, y + GRID_SIZE);
  ctx.stroke();
}

export function renderLaserBeam(ctx: CanvasRenderingContext2D, beam: LaserBeam, time: number): void {
  const alpha = 0.5 + 0.5 * Math.sin(time * 0.008);
  ctx.save();
  ctx.strokeStyle = `rgba(255, 50, 50, ${alpha})`;
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);
  ctx.lineDashOffset = -time * 0.05;
  ctx.shadowColor = '#ff3333';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(beam.startX, beam.startY);
  ctx.lineTo(beam.endX, beam.endY);
  ctx.stroke();
  ctx.restore();
}

export function computeLaserBeams(elements: BaseElement[], connections: LaserConnection[]): LaserBeam[] {
  const beams: LaserBeam[] = [];
  const emitters = elements.filter((e) => e.type === 'laserEmitter');
  const blockers = elements.filter((e) => e.type === 'wall' || e.type === 'box' || (e.type === 'door' && !e.isOpen));
  const receivers = elements.filter((e) => e.type === 'laserReceiver');

  for (const emitter of emitters) {
    const cx = emitter.x + GRID_SIZE / 2;
    const cy = emitter.y + GRID_SIZE / 2;
    const dir = emitter.direction || 'right';
    let endX = cx;
    let endY = cy;
    let hitReceiverId: string | undefined;

    const dx = dir === 'right' ? 1 : dir === 'left' ? -1 : 0;
    const dy = dir === 'down' ? 1 : dir === 'up' ? -1 : 0;

    const maxDist = CANVAS_SIZE * 2;
    let t = 1;
    while (t < maxDist) {
      const px = cx + dx * t;
      const py = cy + dy * t;
      if (px < 0 || px > CANVAS_SIZE || py < 0 || py > CANVAS_SIZE) {
        endX = Math.max(0, Math.min(CANVAS_SIZE, px));
        endY = Math.max(0, Math.min(CANVAS_SIZE, py));
        break;
      }
      let blocked = false;
      for (const b of blockers) {
        if (px >= b.x && px <= b.x + GRID_SIZE && py >= b.y && py <= b.y + GRID_SIZE) {
          blocked = true;
          endX = px;
          endY = py;
          break;
        }
      }
      if (blocked) break;
      for (const r of receivers) {
        if (px >= r.x + 4 && px <= r.x + GRID_SIZE - 4 && py >= r.y + 4 && py <= r.y + GRID_SIZE - 4) {
          hitReceiverId = r.id;
          endX = px;
          endY = py;
          blocked = true;
          break;
        }
      }
      if (blocked) break;
      t += 2;
    }

    if (t >= maxDist) {
      endX = cx + dx * CANVAS_SIZE;
      endY = cy + dy * CANVAS_SIZE;
    }

    beams.push({ startX: cx, startY: cy, endX, endY, hitReceiverId });
  }

  return beams;
}

export function renderElementIcon(ctx: CanvasRenderingContext2D, type: ElementType, size: number): void {
  const oldEl = createElement(type, 0, 0);
  oldEl.x = 0;
  oldEl.y = 0;
  const scale = size / GRID_SIZE;
  ctx.save();
  ctx.scale(scale, scale);
  renderElement(ctx, oldEl, false, 0);
  ctx.restore();
}
