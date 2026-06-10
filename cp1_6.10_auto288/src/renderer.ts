import { Board, HexCoord, HexCell, TerrainType, TERRAIN_COLORS } from './board';
import { Card, CardIcon } from './cards';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface RenderState {
  selectedHex: HexCoord | null;
  hoveredCard: Card | null;
  selectedCard: Card | null;
  player1Position: HexCoord;
  player2Position: HexCoord;
  player1AP: number;
  player2AP: number;
  maxAP: number;
  currentPlayer: number;
  turn: number;
  player1Hand: Card[];
  player2Hand: Card[];
  winner: number | null;
  winAnimationStart: number;
  validTargets: HexCoord[];
  baseStayedTurns: { player1: number; player2: number };
}

const PLAYER1_COLOR = '#4d96ff';
const PLAYER2_COLOR = '#ff6b6b';
const HIGHLIGHT_COLOR = '#ffd93d';
const HEX_BORDER_COLOR = '#e0e0e0';
const BG_COLOR = '#1a1a2e';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private board: Board;
  private hexSize: number = 45;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private width: number = 0;
  private height: number = 0;
  private particles: Particle[] = [];

  constructor(canvas: HTMLCanvasElement, board: Board) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.board = board;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  public resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(dpr, dpr);

    const gridSize = this.board.getGridSize();
    const maxHexW = (this.width * 0.7) / (1.5 * (gridSize - 1) + 1);
    const maxHexH = (this.height * 0.55) / (Math.sqrt(3) * (gridSize - 1 + (gridSize - 1) / 2) + 2);
    this.hexSize = Math.min(maxHexW, maxHexH, 50);

    this.offsetX = this.width / 2;
    this.offsetY = this.height * 0.42;
  }

  public getHexSize(): number {
    return this.hexSize;
  }

  public getOffsetX(): number {
    return this.offsetX;
  }

  public getOffsetY(): number {
    return this.offsetY;
  }

  public addParticle(x: number, y: number, color: string): void {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
      const speed = 1 + Math.random() * 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 0,
        maxLife: 60 + Math.random() * 30,
        color,
        size: 2 + Math.random() * 4,
      });
    }
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public screenToHex(screenX: number, screenY: number): HexCoord | null {
    const coord = this.board.pixelToHex(screenX, screenY, this.hexSize, this.offsetX, this.offsetY);
    if (this.board.isValidCoord(coord)) {
      return coord;
    }
    return null;
  }

  public getCardAtPosition(x: number, y: number, hand: Card[]): Card | null {
    const cardWidth = 120;
    const cardHeight = 170;
    const spacing = 25;
    const totalWidth = cardWidth + (hand.length - 1) * spacing;
    const startX = this.width / 2 - totalWidth / 2;
    const cardY = this.height - cardHeight - 30;

    for (let i = 0; i < hand.length; i++) {
      const cardX = startX + i * spacing;
      if (x >= cardX && x <= cardX + cardWidth && y >= cardY && y <= cardY + cardHeight) {
        return hand[i];
      }
    }
    return null;
  }

  private drawHexPath(cx: number, cy: number, size: number): void {
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const x = cx + size * Math.cos(angle);
      const y = cy + size * Math.sin(angle);
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.closePath();
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private getAnimationColor(cell: HexCell, now: number): string {
    const anim = this.board.animations.find(a => a.coord.q === cell.coord.q && a.coord.r === cell.coord.r);
    if (!anim) return TERRAIN_COLORS[cell.terrain];

    const elapsed = now - anim.startTime;
    const t = Math.min(elapsed / anim.duration, 1);
    return this.lerpColor(TERRAIN_COLORS[anim.fromTerrain], TERRAIN_COLORS[anim.toTerrain], t);
  }

  public render(state: RenderState, now: number): void {
    this.ctx.fillStyle = BG_COLOR;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.drawBoard(state, now);
    this.drawBases(state);
    this.drawParticles(now);

    if (state.selectedCard) {
      this.drawCardDetail(state.selectedCard);
    }

    if (state.currentPlayer === 1) {
      this.drawHand(state.player1Hand, state.hoveredCard, state.selectedCard, PLAYER1_COLOR, now);
    } else {
      this.drawHiddenHand(state.player2Hand.length, PLAYER2_COLOR);
    }

    this.drawActionPoints(state);

    if (state.winner !== null) {
      this.drawWinPopup(state, now);
    }
  }

  private drawBoard(state: RenderState, now: number): void {
    const cells = this.board.getAllCells();
    const validTargetsSet = new Set(state.validTargets.map(c => `${c.q},${c.r}`));

    for (const cell of cells) {
      const { x, y } = this.board.hexToPixel(cell.coord, this.hexSize, this.offsetX, this.offsetY);
      const isSelected = state.selectedHex && state.selectedHex.q === cell.coord.q && state.selectedHex.r === cell.coord.r;
      const isValidTarget = validTargetsSet.has(`${cell.coord.q},${cell.coord.r}`);

      const fillColor = this.getAnimationColor(cell, now);
      this.drawHexPath(x, y, this.hexSize - 2);
      this.ctx.fillStyle = fillColor;
      this.ctx.fill();

      this.ctx.strokeStyle = HEX_BORDER_COLOR;
      this.ctx.lineWidth = isSelected ? 3 : 1.5;
      if (isSelected) {
        this.ctx.shadowColor = HIGHLIGHT_COLOR;
        this.ctx.shadowBlur = 20;
      }
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;

      if (isSelected) {
        this.drawHexPath(x, y, this.hexSize - 2);
        this.ctx.strokeStyle = HIGHLIGHT_COLOR;
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
      }

      if (isValidTarget) {
        this.drawHexPath(x, y, this.hexSize - 8);
        this.ctx.strokeStyle = 'rgba(255, 217, 61, 0.6)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }

      this.drawTerrainIcon(cell, x, y);

      const anim = this.board.animations.find(a => a.coord.q === cell.coord.q && a.coord.r === cell.coord.r);
      if (anim) {
        const elapsed = now - anim.startTime;
        const pulseT = Math.min(elapsed / (anim.duration + 500), 1);
        const pulseSize = this.hexSize - 2 + pulseT * 15;
        const pulseAlpha = (1 - pulseT) * 0.5;
        this.drawHexPath(x, y, pulseSize);
        this.ctx.strokeStyle = `rgba(255, 217, 61, ${pulseAlpha})`;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      }
    }
  }

  private drawTerrainIcon(cell: HexCell, x: number, y: number): void {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.font = `${this.hexSize * 0.4}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    switch (cell.terrain) {
      case TerrainType.FOREST:
        this.ctx.fillText('🌲', 0, 0);
        break;
      case TerrainType.MOUNTAIN:
        this.ctx.fillText('⛰️', 0, 0);
        break;
      case TerrainType.WATER:
        this.ctx.fillText('💧', 0, 0);
        break;
    }
    this.ctx.restore();
  }

  private drawBases(state: RenderState): void {
    const p1 = this.board.hexToPixel(state.player1Position, this.hexSize, this.offsetX, this.offsetY);
    this.drawBase(p1.x, p1.y, PLAYER1_COLOR);

    const p2 = this.board.hexToPixel(state.player2Position, this.hexSize, this.offsetX, this.offsetY);
    this.drawBase(p2.x, p2.y, PLAYER2_COLOR);

    const p1Base = this.board.hexToPixel(this.board.getPlayer1Base(), this.hexSize, this.offsetX, this.offsetY);
    this.drawBaseMarker(p1Base.x, p1Base.y, PLAYER1_COLOR, true);

    const p2Base = this.board.hexToPixel(this.board.getPlayer2Base(), this.hexSize, this.offsetX, this.offsetY);
    this.drawBaseMarker(p2Base.x, p2Base.y, PLAYER2_COLOR, true);
  }

  private drawBase(x: number, y: number, color: string): void {
    this.ctx.save();
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 20;
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.hexSize * 0.35, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawBaseMarker(x: number, y: number, color: string, isInitial: boolean): void {
    this.ctx.save();
    this.ctx.setLineDash([4, 4]);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.globalAlpha = 0.6;
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.hexSize * 0.5, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawHand(hand: Card[], hovered: Card | null, selected: Card | null, color: string, now: number): void {
    const cardWidth = 120;
    const cardHeight = 170;
    const spacing = 25;
    const totalWidth = cardWidth + (hand.length - 1) * spacing;
    const startX = this.width / 2 - totalWidth / 2;
    const baseCardY = this.height - cardHeight - 30;

    for (let i = 0; i < hand.length; i++) {
      const card = hand[i];
      const cardX = startX + i * spacing;
      let scale = 1;
      let drawY = baseCardY;

      const isHovered = hovered?.id === card.id;
      const isSelected = selected?.id === card.id;

      if (isHovered) {
        drawY -= 30;
        scale = 1.1;
      }
      if (isSelected) {
        scale = 1;
      }

      this.drawCard(card, cardX + cardWidth / 2, drawY + cardHeight / 2, scale, color, false, now);
    }
  }

  private drawHiddenHand(count: number, color: string): void {
    const cardWidth = 120;
    const cardHeight = 170;
    const spacing = 25;
    const totalWidth = cardWidth + (count - 1) * spacing;
    const startX = this.width / 2 - totalWidth / 2;
    const cardY = this.height - cardHeight - 30;

    for (let i = 0; i < count; i++) {
      const x = startX + i * spacing;
      this.ctx.save();
      this.ctx.fillStyle = color;
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 10;
      this.roundRect(x, cardY, cardWidth, cardHeight, 10);
      this.ctx.fill();

      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      this.ctx.font = '30px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('?', x + cardWidth / 2, cardY + cardHeight / 2);
      this.ctx.restore();
    }
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }

  private drawCard(card: Card, cx: number, cy: number, scale: number, color: string, isDetail: boolean, now: number): void {
    const cardWidth = 120 * scale;
    const cardHeight = 170 * scale;
    const x = cx - cardWidth / 2;
    const y = cy - cardHeight / 2;

    this.ctx.save();

    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = isDetail ? 25 : 10;

    this.ctx.fillStyle = '#2a2a4a';
    this.roundRect(x, y, cardWidth, cardHeight, 10);
    this.ctx.fill();

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.roundRect(x, y, cardWidth, cardHeight, 10);
    this.ctx.stroke();

    this.ctx.shadowBlur = 0;

    const iconSize = 40 * scale;
    const iconY = y + 35 * scale;
    this.drawCardIcon(card.icon, cx, iconY, iconSize, color);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `bold ${14 * scale}px 'Microsoft YaHei', Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(card.name, cx, y + 75 * scale);

    this.ctx.fillStyle = '#aaaaaa';
    this.ctx.font = `${10 * scale}px 'Microsoft YaHei', Arial`;
    const descLines = this.wrapText(card.description, 20);
    for (let i = 0; i < descLines.length; i++) {
      this.ctx.fillText(descLines[i], cx, y + 100 * scale + i * 15 * scale);
    }

    this.ctx.beginPath();
    this.ctx.arc(x + 20 * scale, y + 20 * scale, 15 * scale, 0, Math.PI * 2);
    this.ctx.fillStyle = HIGHLIGHT_COLOR;
    this.ctx.fill();
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.font = `bold ${16 * scale}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(card.cost.toString(), x + 20 * scale, y + 20 * scale);

    this.ctx.restore();
  }

  private wrapText(text: string, maxChars: number): string[] {
    const lines: string[] = [];
    for (let i = 0; i < text.length; i += maxChars) {
      lines.push(text.slice(i, i + maxChars));
    }
    return lines;
  }

  private drawCardIcon(icon: CardIcon, cx: number, cy: number, size: number, color: string): void {
    this.ctx.save();
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.font = `${size}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    switch (icon) {
      case CardIcon.MOUNTAIN:
        this.ctx.fillText('⛰️', cx, cy);
        break;
      case CardIcon.WATER:
        this.ctx.fillText('💧', cx, cy);
        break;
      case CardIcon.LIGHTNING:
        this.ctx.fillText('🌲', cx, cy);
        break;
      case CardIcon.STAR:
        this.ctx.fillText('⭐', cx, cy);
        break;
    }
    this.ctx.restore();
  }

  private drawCardDetail(card: Card): void {
    this.drawCard(card, this.width / 2, this.height / 2 - 50, 1.8, PLAYER1_COLOR, true, performance.now());

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.font = '14px Microsoft YaHei';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('点击棋盘选择目标格子，或点击空白处取消', this.width / 2, this.height / 2 + 160);
  }

  private drawActionPoints(state: RenderState): void {
    this.drawAPIndicator(80, 110, state.player1AP, state.maxAP, PLAYER1_COLOR);
    this.drawAPIndicator(this.width - 80, 110, state.player2AP, state.maxAP, PLAYER2_COLOR);

    this.ctx.fillStyle = PLAYER1_COLOR;
    this.ctx.font = 'bold 14px Microsoft YaHei';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`AP ${state.player1AP}/${state.maxAP}`, 80, 155);

    this.ctx.fillStyle = PLAYER2_COLOR;
    this.ctx.fillText(`AP ${state.player2AP}/${state.maxAP}`, this.width - 80, 155);
  }

  private drawAPIndicator(cx: number, cy: number, current: number, max: number, color: string): void {
    const radius = 25;

    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 6;
    this.ctx.stroke();

    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (current / max) * Math.PI * 2;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, startAngle, endAngle);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 6;
    this.ctx.lineCap = 'round';
    this.ctx.stroke();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(current.toString(), cx, cy);
  }

  private drawParticles(now: number): void {
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life++;

      const alpha = 1 - p.life / p.maxLife;
      if (alpha <= 0) return false;

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
      this.ctx.fill();

      return true;
    });
  }

  private drawWinPopup(state: RenderState, now: number): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    const elapsed = now - state.winAnimationStart;
    const t = Math.min(elapsed / 1000, 1);

    const popupX = this.width / 2;
    const popupY = this.height / 2;
    const scale = 0.8 + t * 0.2;

    this.ctx.save();
    this.ctx.translate(popupX, popupY);
    this.ctx.scale(scale, scale);

    const winnerColor = state.winner === 1 ? PLAYER1_COLOR : PLAYER2_COLOR;
    const winnerName = state.winner === 1 ? '玩家 1' : '玩家 2 (AI)';

    this.ctx.shadowColor = winnerColor;
    this.ctx.shadowBlur = 40;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 60, 0, Math.PI * 2);
    this.ctx.fillStyle = winnerColor;
    this.ctx.fill();
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 4;
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    const rayCount = 12;
    const rayLength = 80 + Math.sin(now / 200) * 20;
    this.ctx.strokeStyle = HIGHLIGHT_COLOR;
    this.ctx.lineWidth = 3;
    for (let i = 0; i < rayCount; i++) {
      const angle = (Math.PI * 2 * i) / rayCount + now / 500;
      this.ctx.beginPath();
      this.ctx.moveTo(Math.cos(angle) * 65, Math.sin(angle) * 65);
      this.ctx.lineTo(Math.cos(angle) * (65 + rayLength), Math.sin(angle) * (65 + rayLength));
      this.ctx.stroke();
    }

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 32px Microsoft YaHei';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`${winnerName} 获胜！`, 0, 110);

    const btnY = 170;
    const btnWidth = 180;
    const btnHeight = 50;
    this.roundRect(-btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 10);
    this.ctx.fillStyle = HIGHLIGHT_COLOR;
    this.ctx.fill();
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.font = 'bold 20px Microsoft YaHei';
    this.ctx.fillText('再来一局', 0, btnY);

    this.ctx.restore();
  }

  public isClickOnRestartButton(x: number, y: number): boolean {
    const popupX = this.width / 2;
    const popupY = this.height / 2 + 170;
    const btnWidth = 180;
    const btnHeight = 50;
    return x >= popupX - btnWidth / 2 && x <= popupX + btnWidth / 2 &&
           y >= popupY - btnHeight / 2 && y <= popupY + btnHeight / 2;
  }
}
