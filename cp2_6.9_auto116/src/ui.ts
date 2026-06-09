import { Maze, MAZE_SIZE, Position } from './maze';
import { Player, Item } from './player';
import { Enemy } from './enemy';

const CELL_SIZE = 50;
const MAZE_PIXEL = CELL_SIZE * MAZE_SIZE;
const TOP_BAR_HEIGHT = 60;
const BOTTOM_BAR_HEIGHT = 50;

const COLORS = {
  bgStart: '#1A1A2E',
  bgEnd: '#16213E',
  wall: '#0F3460',
  corridor: '#E2E2E2',
  player: '#00F5D4',
  enemy: '#FF4C4C',
  exit: '#FFD700',
  text: '#FFFFFF',
  health: '#FF4C4C',
  itemHealth: '#FF6B6B',
  itemAttack: '#FFA500',
  itemShield: '#4ECDC4',
  buttonHover: '#FFD700'
};

export interface Message {
  text: string;
  timer: number;
  opacity: number;
}

export interface InventoryItemClick {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class UI {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  private offsetX: number;
  private offsetY: number;
  private cellSize: number;
  inventorySlots: InventoryItemClick[];
  private restartButtonRect: { x: number; y: number; width: number; height: number } | null;
  isButtonHovered: boolean;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.offsetX = 0;
    this.offsetY = TOP_BAR_HEIGHT;
    this.cellSize = CELL_SIZE;
    this.inventorySlots = [];
    this.restartButtonRect = null;
    this.isButtonHovered = false;
    this.resize();
  }

  resize(): void {
    const minWidth = 800;
    const w = Math.max(window.innerWidth, minWidth);
    const h = window.innerHeight;
    this.canvas.width = w;
    this.canvas.height = h;

    const mazeMaxSize = Math.min(w, h - TOP_BAR_HEIGHT - BOTTOM_BAR_HEIGHT);
    this.cellSize = Math.floor(mazeMaxSize / MAZE_SIZE);
    const mazePixel = this.cellSize * MAZE_SIZE;
    this.offsetX = (w - mazePixel) / 2;
    this.offsetY = TOP_BAR_HEIGHT + ((h - TOP_BAR_HEIGHT - BOTTOM_BAR_HEIGHT - mazePixel) / 2);
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, COLORS.bgStart);
    gradient.addColorStop(1, COLORS.bgEnd);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
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

  private drawTopBar(cycle: number, player: Player): void {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.bgStart;
    ctx.fillRect(0, 0, this.canvas.width, TOP_BAR_HEIGHT);

    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = COLORS.text;
    ctx.font = '16px sans-serif';
    ctx.textBaseline = 'middle';

    let x = 20;
    ctx.fillText(`周期 ${cycle}/10`, x, TOP_BAR_HEIGHT / 2);
    x += 120;

    this.drawHeartIcon(x + 12, TOP_BAR_HEIGHT / 2, 10);
    ctx.fillText(`${player.hp}/${player.maxHp}`, x + 30, TOP_BAR_HEIGHT / 2);
    x += 90;

    this.drawStarIcon(x + 12, TOP_BAR_HEIGHT / 2, 10);
    ctx.fillText(`${player.level}`, x + 30, TOP_BAR_HEIGHT / 2);
    x += 60;

    if (player.hasShield) {
      this.drawShieldIcon(x + 12, TOP_BAR_HEIGHT / 2, 10);
      ctx.fillText('护盾', x + 30, TOP_BAR_HEIGHT / 2);
      x += 80;
    }

    this.inventorySlots = [];
    ctx.fillText('道具栏:', x, TOP_BAR_HEIGHT / 2);
    x += 70;

    for (let i = 0; i < 3; i++) {
      const slotX = x;
      const slotY = 15;
      const slotW = 30;
      const slotH = 30;
      this.roundRect(slotX, slotY, slotW, slotH, 6);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      this.inventorySlots.push({
        index: i,
        x: slotX,
        y: slotY,
        width: slotW,
        height: slotH
      });

      if (player.inventory[i]) {
        this.drawItemIcon(player.inventory[i], slotX + slotW / 2, slotY + slotH / 2, 10);
      }

      x += slotW + 8;
    }

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  private drawHeartIcon(cx: number, cy: number, size: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.health;
    ctx.beginPath();
    ctx.moveTo(cx, cy + size * 0.5);
    ctx.bezierCurveTo(cx - size, cy, cx - size, cy - size * 0.8, cx, cy - size * 0.3);
    ctx.bezierCurveTo(cx + size, cy - size * 0.8, cx + size, cy, cx, cy + size * 0.5);
    ctx.fill();
  }

  private drawStarIcon(cx: number, cy: number, size: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.buttonHover;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const outerAngle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const innerAngle = outerAngle + Math.PI / 5;
      const ox = cx + size * Math.cos(outerAngle);
      const oy = cy + size * Math.sin(outerAngle);
      const ix = cx + size * 0.5 * Math.cos(innerAngle);
      const iy = cy + size * 0.5 * Math.sin(innerAngle);
      if (i === 0) ctx.moveTo(ox, oy);
      else ctx.lineTo(ox, oy);
      ctx.lineTo(ix, iy);
    }
    ctx.closePath();
    ctx.fill();
  }

  private drawShieldIcon(cx: number, cy: number, size: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.itemShield;
    ctx.beginPath();
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + size * 0.8, cy - size * 0.5);
    ctx.lineTo(cx + size * 0.8, cy + size * 0.3);
    ctx.quadraticCurveTo(cx, cy + size, cx, cy + size);
    ctx.quadraticCurveTo(cx, cy + size, cx - size * 0.8, cy + size * 0.3);
    ctx.lineTo(cx - size * 0.8, cy - size * 0.5);
    ctx.closePath();
    ctx.fill();
  }

  private drawItemIcon(item: Item, cx: number, cy: number, size: number): void {
    const ctx = this.ctx;
    switch (item.type) {
      case 'health':
        ctx.fillStyle = COLORS.itemHealth;
        ctx.beginPath();
        ctx.arc(cx, cy, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(cx - size * 0.5, cy - size * 0.15, size, size * 0.3);
        ctx.fillRect(cx - size * 0.15, cy - size * 0.5, size * 0.3, size);
        break;
      case 'attack':
        ctx.fillStyle = COLORS.itemAttack;
        ctx.beginPath();
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx + size * 0.3, cy);
        ctx.lineTo(cx + size * 0.15, cy);
        ctx.lineTo(cx + size * 0.15, cy + size * 0.8);
        ctx.lineTo(cx - size * 0.15, cy + size * 0.8);
        ctx.lineTo(cx - size * 0.15, cy);
        ctx.lineTo(cx - size * 0.3, cy);
        ctx.closePath();
        ctx.fill();
        break;
      case 'shield':
        this.drawShieldIcon(cx, cy, size);
        break;
    }
  }

  private drawMaze(maze: Maze): void {
    const ctx = this.ctx;
    const cs = this.cellSize;

    for (let y = 0; y < MAZE_SIZE; y++) {
      for (let x = 0; x < MAZE_SIZE; x++) {
        const px = this.offsetX + x * cs;
        const py = this.offsetY + y * cs;
        ctx.fillStyle = maze.grid[y][x] === 'wall' ? COLORS.wall : COLORS.corridor;
        ctx.fillRect(px, py, cs, cs);
      }
    }

    const ex = this.offsetX + maze.exit.x * cs;
    const ey = this.offsetY + maze.exit.y * cs;
    ctx.fillStyle = COLORS.exit;
    ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 300) * 0.2;
    ctx.fillRect(ex + cs * 0.2, ey + cs * 0.2, cs * 0.6, cs * 0.6);
    ctx.globalAlpha = 1;
    ctx.fillStyle = COLORS.exit;
    ctx.font = `${Math.floor(cs * 0.4)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('出', ex + cs / 2, ey + cs / 2);
    ctx.textAlign = 'start';
  }

  private drawPlayer(player: Player): void {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const pos = player.getRenderPos();
    const cx = this.offsetX + pos.x * cs + cs / 2;
    const cy = this.offsetY + pos.y * cs + cs / 2;
    const radius = Math.min(cs * 0.35, 12);

    ctx.save();
    ctx.shadowColor = 'rgba(0, 245, 212, 0.6)';
    ctx.shadowBlur = 15;

    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    if (player.isAttacking) {
      const atkPos = player.getAttackPosition();
      const ax = this.offsetX + atkPos.x * cs + cs / 2;
      const ay = this.offsetY + atkPos.y * cs + cs / 2;
      let alpha = 0.3;
      if (player.attackPhase === 'swing') alpha = 0.8;
      else if (player.attackPhase === 'windup') alpha = 0.5;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(ax, ay, radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    if (player.hasShield) {
      ctx.strokeStyle = COLORS.itemShield;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  private drawEnemy(enemy: Enemy): void {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const pos = enemy.getRenderPos();
    const cx = this.offsetX + pos.x * cs + cs / 2;
    const cy = this.offsetY + pos.y * cs + cs / 2;
    const radius = Math.min(cs * 0.25, 8);

    ctx.fillStyle = COLORS.enemy;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx - radius * 0.3, cy - radius * 0.2, radius * 0.25, 0, Math.PI * 2);
    ctx.arc(cx + radius * 0.3, cy - radius * 0.2, radius * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawDroppedItems(items: { pos: Position; item: Item }[]): void {
    const ctx = this.ctx;
    const cs = this.cellSize;

    for (const drop of items) {
      const cx = this.offsetX + drop.pos.x * cs + cs / 2;
      const cy = this.offsetY + drop.pos.y * cs + cs / 2;
      const floatY = Math.sin(Date.now() / 400) * 3;
      this.drawItemIcon(drop.item, cx, cy + floatY, Math.min(cs * 0.25, 10));
    }
  }

  private drawMessages(messages: Message[]): void {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const centerX = this.canvas.width / 2;
    const startY = this.offsetY + MAZE_SIZE * cs + 40;

    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';

    messages.forEach((msg, i) => {
      ctx.globalAlpha = msg.opacity;
      ctx.fillStyle = COLORS.text;
      ctx.fillText(msg.text, centerX, startY + i * 24);
    });

    ctx.globalAlpha = 1;
    ctx.textAlign = 'start';
  }

  private drawBottomBar(): void {
    const ctx = this.ctx;
    const y = this.canvas.height - BOTTOM_BAR_HEIGHT;

    ctx.fillStyle = 'rgba(128, 128, 128, 0.3)';
    ctx.fillRect(0, y, this.canvas.width, BOTTOM_BAR_HEIGHT);

    ctx.fillStyle = COLORS.text;
    ctx.font = '14px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    const centerX = this.canvas.width / 2;
    ctx.fillText('WASD 移动    空格 攻击    点击道具栏使用道具', centerX, y + BOTTOM_BAR_HEIGHT / 2);

    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  drawResult(totalTime: number, cycle: number, kills: number, itemsPicked: number, isHovered: boolean): void {
    const ctx = this.ctx;
    this.isButtonHovered = isHovered;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const w = 380;
    const h = 340;
    const x = (this.canvas.width - w) / 2;
    const y = (this.canvas.height - h) / 2;

    ctx.save();
    ctx.filter = 'blur(12px)';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.roundRect(x, y, w, h, 16);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    this.roundRect(x, y, w, h, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cycle >= 10 ? '🏆 通关成功！' : '💀 游戏结束', x + w / 2, y + 50);

    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    const stats = [
      `总游戏时间: ${totalTime.toFixed(1)} 秒`,
      `通关周期数: ${cycle}`,
      `击杀敌人数: ${kills}`,
      `拾取道具数: ${itemsPicked}`
    ];
    stats.forEach((s, i) => {
      ctx.fillText(s, x + 50, y + 100 + i * 32);
    });

    const btnW = 160;
    const btnH = 44;
    const btnX = x + (w - btnW) / 2;
    const btnY = y + h - 70;

    this.restartButtonRect = { x: btnX, y: btnY, width: btnW, height: btnH };

    this.roundRect(btnX, btnY, btnW, btnH, 6);
    ctx.fillStyle = isHovered ? COLORS.buttonHover : '#FFFFFF';
    ctx.fill();

    ctx.fillStyle = isHovered ? '#000000' : '#1A1A2E';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('重新开始', btnX + btnW / 2, btnY + btnH / 2);

    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  isPointInRestartButton(mx: number, my: number): boolean {
    if (!this.restartButtonRect) return false;
    const r = this.restartButtonRect;
    return mx >= r.x && mx <= r.x + r.width && my >= r.y && my <= r.y + r.height;
  }

  getInventorySlotAt(mx: number, my: number): number {
    for (const slot of this.inventorySlots) {
      if (mx >= slot.x && mx <= slot.x + slot.width && my >= slot.y && my <= slot.y + slot.height) {
        return slot.index;
      }
    }
    return -1;
  }

  render(maze: Maze, player: Player, enemies: Enemy[], droppedItems: { pos: Position; item: Item }[], cycle: number, messages: Message[], showResult: boolean, totalTime: number, kills: number, itemsPicked: number): void {
    this.drawBackground();
    this.drawMaze(maze);
    this.drawDroppedItems(droppedItems);
    for (const e of enemies) {
      this.drawEnemy(e);
    }
    this.drawPlayer(player);
    this.drawTopBar(cycle, player);
    this.drawMessages(messages);
    this.drawBottomBar();
    if (showResult) {
      this.drawResult(totalTime, cycle, kills, itemsPicked, this.isButtonHovered);
    }
  }
}
