import { GameState, PlayerState } from './gameEngine';
import { MAZE_SIZE, CELL_WALL, CELL_PATH, CELL_ROOM } from './mazeGenerator';

export const CANVAS_SIZE = 640;
export const CELL_SIZE = 32;
export const GRID_PIXEL_SIZE = CELL_SIZE;

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private backBuffer: HTMLCanvasElement;
  private backCtx: CanvasRenderingContext2D;
  private time: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;

    this.backBuffer = document.createElement('canvas');
    this.backBuffer.width = CANVAS_SIZE;
    this.backBuffer.height = CANVAS_SIZE;
    this.backCtx = this.backBuffer.getContext('2d')!;
    this.backCtx.imageSmoothingEnabled = false;
  }

  render(state: GameState, now: number): void {
    this.time = now;
    const ctx = this.backCtx;

    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    this.drawMaze(ctx, state);
    this.drawItems(ctx, state);
    this.drawMonsters(ctx, state);
    this.drawChests(ctx, state);
    this.drawExit(ctx, state);
    this.drawPlayer(ctx, state);
    this.drawParticles(ctx, state);
    this.drawFlyingCoins(ctx, state, now);

    this.drawBorder(ctx);

    this.drawUI(ctx, state, now);

    if (state.combat.active) {
      this.drawCombatPanel(ctx, state, now);
    }

    if (state.gameOver) {
      this.drawGameOver(ctx, state, now);
    }

    this.ctx.drawImage(this.backBuffer, 0, 0);
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private getPlayerRenderPos(player: PlayerState): { x: number; y: number } {
    if (!player.isMoving) {
      return { x: player.x, y: player.y };
    }
    const t = this.easeOut(player.moveProgress);
    return {
      x: player.prevX + (player.x - player.prevX) * t,
      y: player.prevY + (player.y - player.prevY) * t
    };
  }

  private getCameraOffset(state: GameState): { offX: number; offY: number } {
    const pos = this.getPlayerRenderPos(state.player);
    const viewCenterX = CANVAS_SIZE / 2;
    const viewCenterY = CANVAS_SIZE / 2;
    return {
      offX: viewCenterX - (pos.x + 0.5) * CELL_SIZE,
      offY: viewCenterY - (pos.y + 0.5) * CELL_SIZE
    };
  }

  private drawMaze(ctx: CanvasRenderingContext2D, state: GameState): void {
    const { offX, offY } = this.getCameraOffset(state);
    const grid = state.maze.grid;

    const startX = Math.max(0, Math.floor(-offX / CELL_SIZE) - 1);
    const endX = Math.min(MAZE_SIZE, Math.ceil((CANVAS_SIZE - offX) / CELL_SIZE) + 1);
    const startY = Math.max(0, Math.floor(-offY / CELL_SIZE) - 1);
    const endY = Math.min(MAZE_SIZE, Math.ceil((CANVAS_SIZE - offY) / CELL_SIZE) + 1);

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const cell = grid[y][x];
        const px = x * CELL_SIZE + offX;
        const py = y * CELL_SIZE + offY;

        if (cell === CELL_WALL) {
          this.drawWallTexture(ctx, px, py);
        } else if (cell === CELL_PATH) {
          this.drawFloor(ctx, px, py, '#3E2723');
        } else if (cell === CELL_ROOM) {
          this.drawFloor(ctx, px, py, '#4E342E');
        }
      }
    }
  }

  private drawFloor(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(x, y + CELL_SIZE - 2, CELL_SIZE, 2);
    ctx.fillRect(x + CELL_SIZE - 2, y, 2, CELL_SIZE);
  }

  private drawWallTexture(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = '#4A4A4A';
    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

    ctx.fillStyle = '#6B6B6B';
    ctx.fillRect(x, y, CELL_SIZE, 4);
    ctx.fillRect(x, y, 4, CELL_SIZE);

    ctx.fillStyle = '#3A3A3A';
    ctx.fillRect(x + CELL_SIZE - 4, y, 4, CELL_SIZE);
    ctx.fillRect(x, y + CELL_SIZE - 4, CELL_SIZE, 4);

    ctx.fillStyle = '#5A5A5A';
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const bx = x + 2 + i * 10;
        const by = y + 6 + j * 10;
        ctx.fillRect(bx, by, 6, 6);
      }
    }
  }

  private drawItems(ctx: CanvasRenderingContext2D, state: GameState): void {
    const { offX, offY } = this.getCameraOffset(state);

    for (const coin of state.coins) {
      if (coin.collected) continue;
      const px = coin.x * CELL_SIZE + offX;
      const py = coin.y * CELL_SIZE + offY;
      this.drawCoin(ctx, px + CELL_SIZE / 2, py + CELL_SIZE / 2, this.time);
    }

    for (const coin of state.collectedCoinsAnim) {
      const px = coin.x * CELL_SIZE + offX;
      const py = coin.y * CELL_SIZE + offY;
      const scale = 1 + coin.animProgress * 0.2;
      const alpha = 1 - coin.animProgress;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(px + CELL_SIZE / 2, py + CELL_SIZE / 2);
      ctx.scale(scale, scale);
      ctx.translate(-(px + CELL_SIZE / 2), -(py + CELL_SIZE / 2));
      this.drawCoin(ctx, px + CELL_SIZE / 2, py + CELL_SIZE / 2, this.time);
      ctx.restore();
    }

    for (const key of state.keys) {
      if (key.collected) continue;
      const px = key.x * CELL_SIZE + offX;
      const py = key.y * CELL_SIZE + offY;
      this.drawKey(ctx, px + CELL_SIZE / 2, py + CELL_SIZE / 2);
    }
  }

  private drawCoin(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number): void {
    const bounce = Math.sin(time / 200) * 2;
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(cx, cy + bounce, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.arc(cx, cy + bounce, 6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#FFEC8B';
    ctx.beginPath();
    ctx.arc(cx - 2, cy + bounce - 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawKey(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(cx - 4, cy, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3E2723';
    ctx.beginPath();
    ctx.arc(cx - 4, cy, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFD700';
    ctx.fillRect(cx, cy - 2, 10, 4);
    ctx.fillRect(cx + 6, cy + 2, 2, 4);
    ctx.fillRect(cx + 10, cy + 2, 2, 3);
  }

  private drawMonsters(ctx: CanvasRenderingContext2D, state: GameState): void {
    const { offX, offY } = this.getCameraOffset(state);
    for (const monster of state.monsters) {
      if (!monster.alive) continue;
      const px = monster.x * CELL_SIZE + offX;
      const py = monster.y * CELL_SIZE + offY;
      this.drawSkull(ctx, px + CELL_SIZE / 2, py + CELL_SIZE / 2);
    }
  }

  private drawSkull(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    ctx.fillStyle = '#FF2222';
    ctx.fillRect(cx - 8, cy - 8, 16, 14);

    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(cx - 5, cy - 4, 3, 4);
    ctx.fillRect(cx + 2, cy - 4, 3, 4);
    ctx.fillRect(cx - 2, cy + 1, 4, 3);

    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(cx - 7, cy + 6, 3, 2);
    ctx.fillRect(cx - 2, cy + 6, 3, 2);
    ctx.fillRect(cx + 3, cy + 6, 3, 2);
  }

  private drawChests(ctx: CanvasRenderingContext2D, state: GameState): void {
    const { offX, offY } = this.getCameraOffset(state);
    for (const chest of state.chests) {
      const px = chest.x * CELL_SIZE + offX;
      const py = chest.y * CELL_SIZE + offY;
      this.drawChest(ctx, px + CELL_SIZE / 2, py + CELL_SIZE / 2, chest.opened);
    }
  }

  private drawChest(ctx: CanvasRenderingContext2D, cx: number, cy: number, opened: boolean): void {
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(cx - 10, cy - 4, 20, 12);

    if (opened) {
      ctx.fillStyle = '#A0522D';
      ctx.fillRect(cx - 10, cy - 12, 20, 8);
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(cx - 8, cy - 2, 16, 4);
    } else {
      ctx.fillStyle = '#A0522D';
      ctx.fillRect(cx - 10, cy - 10, 20, 8);
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(cx - 2, cy - 6, 4, 6);
    }

    ctx.fillStyle = '#DAA520';
    ctx.fillRect(cx - 10, cy - 10, 20, 2);
    ctx.fillRect(cx - 10, cy - 4, 20, 2);
  }

  private drawExit(ctx: CanvasRenderingContext2D, state: GameState): void {
    const { offX, offY } = this.getCameraOffset(state);
    const exit = state.maze.exit;
    const px = exit.x * CELL_SIZE + offX;
    const py = exit.y * CELL_SIZE + offY;

    const pulse = 0.5 + Math.sin(this.time / 300) * 0.3;
    ctx.fillStyle = `rgba(0, 255, 136, ${pulse})`;
    ctx.fillRect(px + 4, py + 4, CELL_SIZE - 8, CELL_SIZE - 8);

    ctx.fillStyle = '#00FF88';
    ctx.font = '16px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('出', px + CELL_SIZE / 2, py + CELL_SIZE / 2 + 2);
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, state: GameState): void {
    const { offX, offY } = this.getCameraOffset(state);
    const pos = this.getPlayerRenderPos(state.player);
    const px = pos.x * CELL_SIZE + offX + CELL_SIZE / 2;
    const py = pos.y * CELL_SIZE + offY + CELL_SIZE / 2;
    this.drawHero(ctx, px, py);
  }

  private drawHero(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    const px = cx - 6;
    const py = cy - 10;

    ctx.fillStyle = '#FFD700';
    ctx.fillRect(px + 2, py, 8, 6);

    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(px + 3, py + 2, 2, 2);
    ctx.fillRect(px + 7, py + 2, 2, 2);

    ctx.fillStyle = '#FFD700';
    ctx.fillRect(px + 1, py + 6, 10, 6);

    ctx.fillStyle = '#B8860B';
    ctx.fillRect(px, py + 7, 2, 4);
    ctx.fillRect(px + 10, py + 7, 2, 4);

    ctx.fillStyle = '#DAA520';
    ctx.fillRect(px + 2, py + 12, 3, 4);
    ctx.fillRect(px + 7, py + 12, 3, 4);
  }

  private drawParticles(ctx: CanvasRenderingContext2D, state: GameState): void {
    const { offX, offY } = this.getCameraOffset(state);
    for (const p of state.particles) {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      const px = p.x * CELL_SIZE + offX + CELL_SIZE / 2;
      const py = p.y * CELL_SIZE + offY + CELL_SIZE / 2;
      ctx.fillRect(px - p.size / 2, py - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  private drawFlyingCoins(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
    const { offX, offY } = this.getCameraOffset(state);
    for (const fc of state.flyingCoins) {
      if (now < fc.startTime) continue;
      const t = fc.progress;
      const eased = t;
      const startX = fc.startX * CELL_SIZE + offX + CELL_SIZE / 2;
      const startY = fc.startY * CELL_SIZE + offY + CELL_SIZE / 2;
      const endX = CANVAS_SIZE - 60;
      const endY = 40;

      const arcHeight = -80;
      const x = startX + (endX - startX) * eased;
      const y = startY + (endY - startY) * eased + arcHeight * 4 * eased * (1 - eased);

      ctx.fillStyle = '#FFD700';
      ctx.globalAlpha = 1 - t * 0.3;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawBorder(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createRadialGradient(
      CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 3,
      CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2
    );
    gradient.addColorStop(0, 'rgba(128, 0, 255, 0)');
    gradient.addColorStop(1, 'rgba(128, 0, 255, 0.15)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.strokeStyle = 'rgba(128, 0, 255, 0.4)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, CANVAS_SIZE - 4, CANVAS_SIZE - 4);
  }

  private drawUI(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
    this.drawInfoPanel(ctx, state);
    this.drawMinimap(ctx, state);
    this.drawInventory(ctx, state, now);
  }

  private drawInfoPanel(ctx: CanvasRenderingContext2D, state: GameState): void {
    const panelX = 120;
    const panelY = 10;
    const panelW = 400;
    const panelH = 50;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.roundRect(ctx, panelX, panelY, panelW, panelH, 4);
    ctx.fill();

    ctx.font = '18px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const infoY = panelY + panelH / 2;

    this.drawTextWithStroke(ctx, 'HP:', panelX + 20, infoY, '#00FF88', '#FFFFFF');
    this.drawTextWithStroke(ctx, `${state.player.hp}/${state.player.maxHp}`, panelX + 70, infoY, '#FFFFFF', '#1A1A1A');

    this.drawTextWithStroke(ctx, '金:', panelX + 170, infoY, '#00FF88', '#FFFFFF');
    this.drawTextWithStroke(ctx, `${state.player.coins}`, panelX + 210, infoY, '#FFD700', '#1A1A1A');

    this.drawTextWithStroke(ctx, '层:', panelX + 280, infoY, '#00FF88', '#FFFFFF');
    this.drawTextWithStroke(ctx, `${state.floor}`, panelX + 320, infoY, '#FFFFFF', '#1A1A1A');

    this.drawTextWithStroke(ctx, '体:', panelX + 360, infoY, '#00FF88', '#FFFFFF');
    this.drawTextWithStroke(ctx, `${state.player.stamina}`, panelX + 400, infoY, '#00BFFF', '#1A1A1A');
  }

  private drawTextWithStroke(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    fillColor: string,
    strokeColor: string
  ): void {
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
  }

  private drawMinimap(ctx: CanvasRenderingContext2D, state: GameState): void {
    const mapSize = 120;
    const mapX = CANVAS_SIZE - mapSize - 10;
    const mapY = CANVAS_SIZE - mapSize - 10;
    const cellSize = mapSize / MAZE_SIZE;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(mapX - 2, mapY - 2, mapSize + 4, mapSize + 4);

    ctx.strokeStyle = '#00FF88';
    ctx.lineWidth = 2;
    this.roundRect(ctx, mapX - 2, mapY - 2, mapSize + 4, mapSize + 4, 2);
    ctx.stroke();

    const grid = state.maze.grid;
    for (let y = 0; y < MAZE_SIZE; y++) {
      for (let x = 0; x < MAZE_SIZE; x++) {
        if (grid[y][x] === CELL_WALL) {
          ctx.fillStyle = '#333';
        } else if (grid[y][x] === CELL_ROOM) {
          ctx.fillStyle = '#5A4A3A';
        } else {
          ctx.fillStyle = '#444';
        }
        ctx.fillRect(mapX + x * cellSize, mapY + y * cellSize, cellSize, cellSize);
      }
    }

    for (const chest of state.chests) {
      if (chest.opened) continue;
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(mapX + chest.x * cellSize, mapY + chest.y * cellSize, cellSize, cellSize);
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(
      mapX + state.maze.exit.x * cellSize,
      mapY + state.maze.exit.y * cellSize,
      cellSize, cellSize
    );

    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.arc(
      mapX + state.player.x * cellSize + cellSize / 2,
      mapY + state.player.y * cellSize + cellSize / 2,
      cellSize, 0, Math.PI * 2
    );
    ctx.fill();
  }

  private drawInventory(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
    const invX = 10;
    const invY = CANVAS_SIZE - 80;
    const slotSize = 32;
    const gap = 4;

    const items = [
      { type: 'key', count: state.player.keys, label: `钥匙 x${state.player.keys}` },
      { type: 'potion', count: state.player.potions, label: `药水 x${state.player.potions} (+5HP)` }
    ];

    for (let i = 0; i < items.length; i++) {
      const sx = invX;
      const sy = invY + i * (slotSize + gap);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 2;
      this.roundRect(ctx, sx, sy, slotSize, slotSize, 2);
      ctx.fill();
      ctx.stroke();

      if (items[i].type === 'key' && items[i].count > 0) {
        this.drawKey(ctx, sx + slotSize / 2, sy + slotSize / 2);
      } else if (items[i].type === 'potion' && items[i].count > 0) {
        this.drawPotion(ctx, sx + slotSize / 2, sy + slotSize / 2);
      }

      if (items[i].count > 0) {
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${items[i].count}`, sx + slotSize - 2, sy + slotSize - 2);
      }

      const mx = state.mouseX;
      const my = state.mouseY;
      if (mx >= sx && mx <= sx + slotSize && my >= sy && my <= sy + slotSize) {
        this.drawTooltip(ctx, mx, my, items[i].label);
      }
    }
  }

  private drawPotion(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    ctx.fillStyle = '#8B0000';
    ctx.fillRect(cx - 4, cy - 8, 8, 4);

    ctx.fillStyle = '#FF3333';
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 100, 100, 0.6)';
    ctx.beginPath();
    ctx.arc(cx - 2, cy, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawTooltip(ctx: CanvasRenderingContext2D, x: number, y: number, text: string): void {
    ctx.font = '10px "Press Start 2P", monospace';
    const metrics = ctx.measureText(text);
    const padding = 8;
    let tw = metrics.width + padding * 2;
    let th = 20;
    let tx = x + 12;
    let ty = y - 30;

    if (tx + tw > CANVAS_SIZE) tx = x - tw - 12;
    if (ty < 0) ty = y + 12;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    this.roundRect(ctx, tx, ty, tw, th, 4);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, tx + padding, ty + th / 2);
  }

  private drawCombatPanel(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
    const pw = 300;
    const ph = 200;
    const px = (CANVAS_SIZE - pw) / 2;
    const py = (CANVAS_SIZE - ph) / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.fillStyle = 'rgba(30, 30, 30, 0.95)';
    this.roundRect(ctx, px, py, pw, ph, 8);
    ctx.fill();

    ctx.strokeStyle = '#FF4444';
    ctx.lineWidth = 3;
    this.roundRect(ctx, px, py, pw, ph, 8);
    ctx.stroke();

    const shakeOffset = state.combat.monsterShake > 0 ?
      (Math.sin(now / 20) * 3) : 0;

    this.drawSkull(ctx, px + pw / 2 + shakeOffset, py + 60);

    if (state.combat.monster) {
      const hpRatio = state.combat.monster.hp / 4;
      const barW = 200;
      const barH = 16;
      const barX = px + (pw - barW) / 2;
      const barY = py + 100;

      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barW, barH);

      const hpColor = hpRatio > 0.5 ? '#00FF00' : hpRatio > 0.25 ? '#FFFF00' : '#FF0000';
      ctx.fillStyle = hpColor;
      ctx.fillRect(barX, barY + shakeOffset, barW * Math.max(0, hpRatio), barH);

      ctx.strokeStyle = '#FFF';
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, barW, barH);

      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillStyle = '#FFF';
      ctx.textAlign = 'center';
      ctx.fillText(
        `HP: ${Math.max(0, state.combat.monster.hp)}/4`,
        px + pw / 2,
        barY + barH / 2
      );
    }

    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.fillText(state.combat.message, px + pw / 2, py + 150);
    ctx.fillText('按 空格键 攻击', px + pw / 2, py + 175);
  }

  private drawGameOver(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const blink = Math.sin(now / 500) > 0 ? 1 : 0.3;
    ctx.globalAlpha = blink;

    ctx.font = '28px "Press Start 2P", monospace';
    ctx.fillStyle = '#FF5555';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const message = state.gameOverType === 'hp' ? '你死了！' : '体力耗尽！';
    ctx.fillText(message, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 60);

    ctx.globalAlpha = 1;
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`到达楼层: ${state.floor}`, CANVAS_SIZE / 2, CANVAS_SIZE / 2);
    ctx.fillText(`获得金币: ${state.player.coins}`, CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 30);

    const btnW = 180;
    const btnH = 50;
    const btnX = (CANVAS_SIZE - btnW) / 2;
    const btnY = CANVAS_SIZE / 2 + 80;

    const mx = state.mouseX;
    const my = state.mouseY;
    const hovered = mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH;

    ctx.save();
    if (hovered) {
      ctx.translate(btnX + btnW / 2, btnY + btnH / 2);
      ctx.scale(1.05, 1.05);
      ctx.translate(-(btnX + btnW / 2), -(btnY + btnH / 2));
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 20;
    }

    ctx.fillStyle = '#FFD700';
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 6);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillStyle = '#1A1A1A';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('重试', btnX + btnW / 2, btnY + btnH / 2 + 2);
    ctx.restore();

    (this.canvas as any)._retryBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
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

  isRetryButtonClicked(x: number, y: number): boolean {
    const btn = (this.canvas as any)._retryBtn;
    if (!btn) return false;
    return x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h;
  }
}
