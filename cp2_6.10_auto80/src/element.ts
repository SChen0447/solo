export enum ElementType {
  ENEMY = 'enemy',
  OBSTACLE = 'obstacle',
  ITEM = 'item',
  PLAYER = 'player'
}

export enum EnemyPath {
  HORIZONTAL = 'horizontal',
  SINE = 'sine',
  STRAIGHT = 'straight'
}

export interface ElementProperties {
  hp?: number;
  path?: EnemyPath;
  durability?: number;
  score?: number;
}

export interface SerializedElement {
  id: string;
  type: ElementType;
  gridX: number;
  gridY: number;
  rotation: number;
  properties: ElementProperties;
}

let _idCounter = 0;
function genId(): string {
  _idCounter++;
  return `el_${Date.now()}_${_idCounter}`;
}

export class LevelElement {
  id: string;
  type: ElementType;
  gridX: number;
  gridY: number;
  rotation: number;
  properties: ElementProperties;
  flashTimer: number = 0;

  constructor(
    type: ElementType,
    gridX: number,
    gridY: number,
    rotation: number = 0,
    properties?: ElementProperties,
    id?: string
  ) {
    this.id = id || genId();
    this.type = type;
    this.gridX = gridX;
    this.gridY = gridY;
    this.rotation = rotation;
    this.properties = properties || this.getDefaultProperties(type);
  }

  getDefaultProperties(type: ElementType): ElementProperties {
    switch (type) {
      case ElementType.ENEMY:
        return { hp: 1, path: EnemyPath.HORIZONTAL };
      case ElementType.OBSTACLE:
        return { durability: 1 };
      case ElementType.ITEM:
        return { score: 100 };
      case ElementType.PLAYER:
      default:
        return {};
    }
  }

  clone(): LevelElement {
    return new LevelElement(
      this.type,
      this.gridX,
      this.gridY,
      this.rotation,
      { ...this.properties },
      this.id
    );
  }

  serialize(): SerializedElement {
    return {
      id: this.id,
      type: this.type,
      gridX: this.gridX,
      gridY: this.gridY,
      rotation: this.rotation,
      properties: { ...this.properties }
    };
  }

  static deserialize(data: SerializedElement): LevelElement {
    return new LevelElement(
      data.type,
      data.gridX,
      data.gridY,
      data.rotation,
      { ...data.properties },
      data.id
    );
  }
}

export const GRID_COLS = 60;
export const GRID_ROWS = 40;
export const CELL_SIZE = 20;
export const ELEMENT_SIZE = 16;

export function getElementColor(type: ElementType): string {
  switch (type) {
    case ElementType.ENEMY: return '#e94560';
    case ElementType.OBSTACLE: return '#4a6fff';
    case ElementType.ITEM: return '#ffd700';
    case ElementType.PLAYER: return '#52b788';
    default: return '#ffffff';
  }
}

export function getElementName(type: ElementType): string {
  switch (type) {
    case ElementType.ENEMY: return '红色敌机';
    case ElementType.OBSTACLE: return '蓝色障碍';
    case ElementType.ITEM: return '金色道具';
    case ElementType.PLAYER: return '玩家起点';
    default: return '未知';
  }
}

export function drawPixelElement(
  ctx: CanvasRenderingContext2D,
  type: ElementType,
  x: number,
  y: number,
  size: number,
  properties?: ElementProperties,
  alpha: number = 1
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;

  const color = getElementColor(type);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  switch (type) {
    case ElementType.ENEMY:
      drawEnemy(ctx, x, y, size, color, properties?.hp || 1);
      break;
    case ElementType.OBSTACLE:
      drawObstacle(ctx, x, y, size, color, properties?.durability || 1);
      break;
    case ElementType.ITEM:
      drawItem(ctx, x, y, size, color);
      break;
    case ElementType.PLAYER:
      drawPlayer(ctx, x, y, size, color);
      break;
  }

  ctx.restore();
}

function drawEnemy(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  hp: number
) {
  const px = size / 16;
  const cx = x + size / 2;
  const cy = y + size / 2;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, y + 2 * px);
  ctx.lineTo(x + size - 2 * px, cy);
  ctx.lineTo(cx + 2 * px, y + size - 2 * px);
  ctx.lineTo(cx - 2 * px, y + size - 2 * px);
  ctx.lineTo(x + 2 * px, cy);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - 3 * px, cy - 1 * px, 2 * px, 2 * px);
  ctx.fillRect(cx + 1 * px, cy - 1 * px, 2 * px, 2 * px);

  if (hp > 1) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.max(6, size / 3)}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(hp), cx, y - 4 * px);
  }
}

function drawObstacle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  durability: number
) {
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, size - 2, size - 2);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, size / 16);
  ctx.strokeRect(x + 3, y + 3, size - 6, size - 6);

  if (durability > 1) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.max(6, size / 3)}px 'Press Start 2P', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(durability), x + size / 2, y + size / 2);
  }
}

function drawItem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const outerR = size / 2 - 1;
  const innerR = outerR * 0.4;
  const spikes = 5;

  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / spikes) * i - Math.PI / 2;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - 1, cy - 1, 2, 2);
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const px = size / 16;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, y + 1 * px);
  ctx.lineTo(cx + 5 * px, cy + 5 * px);
  ctx.lineTo(cx + 2 * px, cy + 3 * px);
  ctx.lineTo(cx + 2 * px, y + size - 1 * px);
  ctx.lineTo(cx - 2 * px, y + size - 1 * px);
  ctx.lineTo(cx - 2 * px, cy + 3 * px);
  ctx.lineTo(cx - 5 * px, cy + 5 * px);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#00ffff';
  ctx.fillRect(cx - 1 * px, cy, 2 * px, 2 * px);
}

export function drawElementIconOnCanvas(canvas: HTMLCanvasElement, type: ElementType) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  drawPixelElement(ctx, type, 2, 2, 16);
}
