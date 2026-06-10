import { Character, HexCoord, HighlightState } from './types';
import {
  HEX_SIZE,
  hexToPixel,
  hexCorners,
  hexEqual,
  hexKey
} from './hexUtils';

const GRID_SIZE = 8;
const HEX_FILL = '#e0e0e0';
const HEX_STROKE = '#999';
const RED_TEAM_COLOR = '#e74c3c';
const BLUE_TEAM_COLOR = '#3498db';
const SELECTED_BORDER_COLOR = '#f1c40f';
const CASTABLE_COLOR = 'rgba(0, 255, 0, 0.25)';
const DAMAGE_COLOR = 'rgba(255, 0, 0, 0.25)';
const MAP_BORDER_COLOR = '#f0f0f0';

export class MapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private characters: Character[] = [];
  private selectedCharacterId: string | null = null;
  private showOrderNumbers: boolean = false;
  private actionOrder: Map<string, number> = new Map();
  private highlight: HighlightState = {
    castableTiles: [],
    damageTiles: [],
    selectedTarget: null,
    estimatedDamage: 0
  };
  private offsetX: number = 0;
  private offsetY: number = 0;
  private animationFrame: number | null = null;
  private lastTime: number = 0;
  private selectionPulse: number = 0;
  private onHexClickCallback: ((coord: HexCoord) => void) | null = null;
  private dpr: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
    this.setupCanvas();
    this.bindEvents();
    this.startAnimationLoop();
  }

  private setupCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
    this.calculateOffsets(rect.width, rect.height);
  }

  private calculateOffsets(width: number, height: number): void {
    const gridPixelWidth = HEX_SIZE * Math.sqrt(3) * (GRID_SIZE + 0.5);
    const gridPixelHeight = HEX_SIZE * 1.5 * GRID_SIZE + HEX_SIZE * 0.5;
    this.offsetX = (width - gridPixelWidth) / 2 + HEX_SIZE * Math.sqrt(3) / 2;
    this.offsetY = (height - gridPixelHeight) / 2 + HEX_SIZE;
  }

  private bindEvents(): void {
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    window.addEventListener('resize', () => {
      this.setupCanvas();
      this.render();
    });
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - this.offsetX;
    const y = e.clientY - rect.top - this.offsetY;
    const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / HEX_SIZE;
    const r = ((2 / 3) * y) / HEX_SIZE;
    const s = -q - r;
    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(s);
    const qDiff = Math.abs(rq - q);
    const rDiff = Math.abs(rr - r);
    const sDiff = Math.abs(rs - s);
    if (qDiff > rDiff && qDiff > sDiff) rq = -rr - rs;
    else if (rDiff > sDiff) rr = -rq - rs;
    
    if (
      rq >= 0 && rq < GRID_SIZE &&
      rr >= 0 && rr < GRID_SIZE &&
      this.onHexClickCallback
    ) {
      this.onHexClickCallback({ q: rq, r: rr });
    } else if (this.onHexClickCallback) {
      this.onHexClickCallback({ q: -1, r: -1 });
    }
  }

  public setOnHexClick(callback: (coord: HexCoord) => void): void {
    this.onHexClickCallback = callback;
  }

  public setCharacters(characters: Character[]): void {
    this.characters = characters;
    this.render();
  }

  public setSelectedCharacter(id: string | null): void {
    this.selectedCharacterId = id;
    this.render();
  }

  public setShowOrderNumbers(show: boolean): void {
    this.showOrderNumbers = show;
    this.render();
  }

  public setActionOrder(order: Map<string, number>): void {
    this.actionOrder = order;
    this.render();
  }

  public setHighlight(highlight: HighlightState): void {
    this.highlight = highlight;
    this.render();
  }

  private startAnimationLoop(): void {
    const animate = (time: number) => {
      const delta = time - this.lastTime;
      this.lastTime = time;
      this.selectionPulse = (this.selectionPulse + delta * 0.003) % (Math.PI * 2);
      this.render();
      this.animationFrame = requestAnimationFrame(animate);
    };
    this.animationFrame = requestAnimationFrame(animate);
  }

  public destroy(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  public render(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);
    this.drawMapBorder();
    this.drawGrid();
    this.drawHighlights();
    this.drawCharacters();
  }

  private drawMapBorder(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.strokeStyle = MAP_BORDER_COLOR;
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(2, 2, rect.width - 4, rect.height - 4);
  }

  private drawGrid(): void {
    for (let q = 0; q < GRID_SIZE; q++) {
      for (let r = 0; r < GRID_SIZE; r++) {
        this.drawHex({ q, r });
      }
    }
  }

  private drawHex(coord: HexCoord): void {
    const pixel = hexToPixel(coord);
    const center = {
      x: pixel.x + this.offsetX,
      y: pixel.y + this.offsetY
    };
    const corners = hexCorners(center);

    this.ctx.beginPath();
    this.ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 6; i++) {
      this.ctx.lineTo(corners[i].x, corners[i].y);
    }
    this.ctx.closePath();
    this.ctx.fillStyle = HEX_FILL;
    this.ctx.fill();
    this.ctx.strokeStyle = HEX_STROKE;
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }

  private drawHighlights(): void {
    this.highlight.castableTiles.forEach((coord) => {
      this.drawHexHighlight(coord, CASTABLE_COLOR);
    });
    this.highlight.damageTiles.forEach((coord) => {
      this.drawHexHighlight(coord, DAMAGE_COLOR);
    });
    if (this.highlight.selectedTarget && this.highlight.estimatedDamage > 0) {
      this.drawDamageNumber(this.highlight.selectedTarget, this.highlight.estimatedDamage);
    }
  }

  private drawHexHighlight(coord: HexCoord, color: string): void {
    if (coord.q < 0 || coord.q >= GRID_SIZE || coord.r < 0 || coord.r >= GRID_SIZE) return;
    const pixel = hexToPixel(coord);
    const center = {
      x: pixel.x + this.offsetX,
      y: pixel.y + this.offsetY
    };
    const corners = hexCorners(center);

    this.ctx.beginPath();
    this.ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 6; i++) {
      this.ctx.lineTo(corners[i].x, corners[i].y);
    }
    this.ctx.closePath();
    this.ctx.fillStyle = color;
    this.ctx.fill();
  }

  private drawDamageNumber(coord: HexCoord, damage: number): void {
    const pixel = hexToPixel(coord);
    const center = {
      x: pixel.x + this.offsetX,
      y: pixel.y + this.offsetY
    };
    this.ctx.font = 'bold 24px sans-serif';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.shadowColor = 'rgba(0,0,0,0.8)';
    this.ctx.shadowBlur = 4;
    this.ctx.shadowOffsetX = 1;
    this.ctx.shadowOffsetY = 1;
    this.ctx.fillText(String(damage), center.x, center.y);
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
  }

  private drawCharacters(): void {
    this.characters.forEach((char) => {
      this.drawCharacter(char);
    });
  }

  private drawCharacter(char: Character): void {
    const pixel = hexToPixel(char.position);
    const center = {
      x: pixel.x + this.offsetX,
      y: pixel.y + this.offsetY
    };
    const avatarRadius = 25;
    const isSelected = char.id === this.selectedCharacterId;
    const pulseOffset = isSelected ? Math.sin(this.selectionPulse) * 2 : 0;

    if (isSelected) {
      this.ctx.beginPath();
      this.ctx.arc(center.x, center.y, avatarRadius + 4 + pulseOffset, 0, Math.PI * 2);
      this.ctx.strokeStyle = SELECTED_BORDER_COLOR;
      this.ctx.lineWidth = 3;
      this.ctx.stroke();
    }

    this.ctx.beginPath();
    this.ctx.arc(center.x, center.y, avatarRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = char.team === 'red' ? RED_TEAM_COLOR : BLUE_TEAM_COLOR;
    this.ctx.fill();
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.font = '28px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(char.avatar, center.x, center.y);

    this.ctx.font = '11px sans-serif';
    this.ctx.fillStyle = '#333333';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(char.name, center.x, center.y + avatarRadius + 12);

    this.ctx.font = '10px sans-serif';
    this.ctx.fillStyle = '#666666';
    this.ctx.fillText(`速度: ${char.speed}`, center.x, center.y + avatarRadius + 24);

    if (this.showOrderNumbers) {
      const order = this.actionOrder.get(char.id);
      if (order !== undefined) {
        const numY = center.y - avatarRadius - 12;
        this.ctx.beginPath();
        this.ctx.arc(center.x, numY, 10, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
        this.ctx.fill();
        this.ctx.font = 'bold 12px sans-serif';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(String(order), center.x, numY);
      }
    }
  }

  public getCanvasSize(): { width: number; height: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }
}
