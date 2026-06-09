import { Player, PlayerState, TILE_SIZE, Platform } from './player';
import { Level, CANVAS_WIDTH, CANVAS_HEIGHT, MovingBlockState, CrystalState } from './level';
import { RewindSystem, FrameState } from './rewind';

class InputManager {
  keys: Record<string, boolean> = {};

  constructor() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  isPressed(code: string): boolean {
    return !!this.keys[code];
  }
}

class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  input: InputManager;
  player: Player;
  level: Level;
  rewind: RewindSystem;
  currentRoom: number;
  lastTime: number;
  spaceWasPressed: boolean;
  rWasPressed: boolean;
  qWasPressed: boolean;
  deathFadeTime: number;
  isDeathFading: boolean;
  bgColor: { r: number; g: number; b: number };
  bgTarget: { r: number; g: number; b: number };
  gameWon: boolean;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;

    this.input = new InputManager();
    this.level = new Level();

    const room = this.level.getRoom(0);
    this.player = new Player(room.spawnX, room.spawnY);

    this.rewind = new RewindSystem();
    this.currentRoom = 0;
    this.lastTime = 0;
    this.spaceWasPressed = false;
    this.rWasPressed = false;
    this.qWasPressed = false;
    this.deathFadeTime = 0;
    this.isDeathFading = false;
    this.bgColor = { r: 44, g: 44, b: 44 };
    this.bgTarget = { r: 44, g: 44, b: 44 };
    this.gameWon = false;

    this.rewind.saveCheckpoint(0, room.spawnX, room.spawnY);
  }

  start(): void {
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private gameLoop(): void {
    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, 1 / 30);
    this.lastTime = now;

    this.update(delta);
    this.render();

    requestAnimationFrame(() => this.gameLoop());
  }

  private update(delta: number): void {
    if (this.gameWon) return;

    if (this.isDeathFading) {
      this.deathFadeTime += delta;
      const t = Math.min(1, this.deathFadeTime / 2);
      this.bgColor.r = Math.round(139 + (44 - 139) * t);
      this.bgColor.g = Math.round(0 + (44 - 0) * t);
      this.bgColor.b = Math.round(0 + (44 - 0) * t);

      if (this.deathFadeTime >= 2) {
        this.isDeathFading = false;
        this.deathFadeTime = 0;
      }
    } else if (this.rewind.isActive()) {
      const frame = this.rewind.update();
      if (frame) {
        this.restoreFrameState(frame);
      }
    } else {
      if (this.input.isPressed('KeyR') && !this.rWasPressed) {
        if (this.rewind.canRewind()) {
          this.rewind.startRewind(false);
        }
      }
      this.rWasPressed = this.input.isPressed('KeyR');

      if (this.input.isPressed('KeyQ') && !this.qWasPressed) {
        this.rewind.cycleSpeed();
      }
      this.qWasPressed = this.input.isPressed('KeyQ');

      if (this.input.isPressed('Space') && !this.spaceWasPressed) {
        this.player.jump();
      }
      this.spaceWasPressed = this.input.isPressed('Space');

      const room = this.level.getRoom(this.currentRoom);
      const allPlatforms: Platform[] = [...room.platforms, ...room.movingBlocks];
      this.player.update(this.input.keys, allPlatforms);

      const playerCenterX = this.player.x + this.player.width / 2;
      const playerCenterY = this.player.y + this.player.height / 2;
      this.level.update(playerCenterX, playerCenterY, this.currentRoom);

      if (this.level.checkSpikeCollision(this.player.getBounds(), this.currentRoom) ||
          this.level.checkMovingBlockCollision(this.player.getBounds(), this.currentRoom)) {
        this.player.die();
        this.triggerDeathRewind();
      }

      if (this.level.checkCrystalCollection(this.player.getBounds(), this.currentRoom)) {
        this.rewind.addPoint();
      }

      if (this.level.checkNextRoomDoor(this.player.getBounds(), this.currentRoom)) {
        this.currentRoom++;
        const newRoom = this.level.getRoom(this.currentRoom);
        this.player.x = newRoom.spawnX;
        this.player.y = newRoom.spawnY;
        this.player.roomIndex = this.currentRoom;
        this.player.vx = 0;
        this.player.vy = 0;
        this.rewind.saveCheckpoint(this.currentRoom, newRoom.spawnX, newRoom.spawnY);
      }

      if (this.level.checkExitDoor(this.player.getBounds(), this.currentRoom)) {
        this.gameWon = true;
      }

      this.recordFrame();
    }
  }

  private triggerDeathRewind(): void {
    if (this.rewind.startRewind(true)) {
      this.isDeathFading = true;
      this.deathFadeTime = 0;
      this.bgColor = { r: 139, g: 0, b: 0 };
    }
  }

  private recordFrame(): void {
    const room = this.level.getRoom(this.currentRoom);
    const movingBlocks: MovingBlockState[] = room.movingBlocks.map(b => b.saveState());

    const crystals: CrystalState[][] = [];
    for (let i = 0; i < this.level.rooms.length; i++) {
      crystals.push(this.level.rooms[i].crystals.map(c => c.saveState()));
    }

    const frame: FrameState = {
      player: this.player.saveState(),
      movingBlocks,
      crystals,
      timestamp: performance.now()
    };
    this.rewind.recordFrame(frame);
  }

  private restoreFrameState(frame: FrameState): void {
    this.player.restoreState(frame.player);
    this.currentRoom = frame.player.roomIndex;

    const room = this.level.getRoom(this.currentRoom);
    for (let i = 0; i < room.movingBlocks.length; i++) {
      if (frame.movingBlocks[i]) {
        room.movingBlocks[i].restoreState(frame.movingBlocks[i]);
      }
    }

    for (let ri = 0; ri < this.level.rooms.length; ri++) {
      const r = this.level.rooms[ri];
      const crystalStates = frame.crystals[ri];
      if (crystalStates) {
        for (let ci = 0; ci < r.crystals.length; ci++) {
          if (crystalStates[ci]) {
            r.crystals[ci].restoreState(crystalStates[ci]);
          }
        }
      }
    }
  }

  private render(): void {
    const ctx = this.ctx;

    ctx.fillStyle = `rgb(${this.bgColor.r}, ${this.bgColor.g}, ${this.bgColor.b})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.drawGridBackground();

    const playerCenterX = this.player.x + this.player.width / 2;
    const playerCenterY = this.player.y + this.player.height / 2;
    this.level.render(ctx, this.currentRoom, playerCenterX, playerCenterY);

    if (this.rewind.isActive()) {
      this.rewind.renderGhostTrail(ctx, this.renderPlayerGhost.bind(this));
    }

    this.player.render(ctx);

    this.renderHUD();

    if (this.gameWon) {
      this.renderWinScreen();
    }
  }

  private drawGridBackground(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(55, 65, 81, 0.3)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= CANVAS_WIDTH; x += TILE_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += TILE_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderPlayerGhost(ctx: CanvasRenderingContext2D, state: PlayerState, alpha: number): void {
    ctx.save();
    ctx.globalAlpha = alpha;

    const w = TILE_SIZE * 0.7;
    const h = TILE_SIZE * 0.9;

    const gradient = ctx.createLinearGradient(state.x, state.y, state.x, state.y + h);
    gradient.addColorStop(0, '#A78BFA');
    gradient.addColorStop(1, '#7C3AED');

    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#C4B5FD';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#8B5CF6';
    ctx.shadowBlur = 15;

    const bodyX = state.x + w * 0.1;
    const bodyY = state.y + h * 0.15;
    const bodyW = w * 0.8;
    const bodyH = h * 0.7;
    const r = 6;

    ctx.beginPath();
    ctx.moveTo(bodyX + r, bodyY);
    ctx.lineTo(bodyX + bodyW - r, bodyY);
    ctx.quadraticCurveTo(bodyX + bodyW, bodyY, bodyX + bodyW, bodyY + r);
    ctx.lineTo(bodyX + bodyW, bodyY + bodyH - r);
    ctx.quadraticCurveTo(bodyX + bodyW, bodyY + bodyH, bodyX + bodyW - r, bodyY + bodyH);
    ctx.lineTo(bodyX + r, bodyY + bodyH);
    ctx.quadraticCurveTo(bodyX, bodyY + bodyH, bodyX, bodyY + bodyH - r);
    ctx.lineTo(bodyX, bodyY + r);
    ctx.quadraticCurveTo(bodyX, bodyY, bodyX + r, bodyY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  private renderHUD(): void {
    const ctx = this.ctx;
    ctx.save();

    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#34D399';
    ctx.shadowColor = '#34D399';
    ctx.shadowBlur = 8;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const pointsText = `◈ 回溯点数: ${this.rewind.getPoints()}`;
    ctx.fillText(pointsText, 20, 20);

    const collected = this.level.getTotalCrystalsCollected();
    const total = this.level.totalCrystals;
    const crystalText = `◆ 水晶: ${collected}/${total}`;
    ctx.fillText(crystalText, 20, 50);

    const roomText = `▣ 房间 ${this.currentRoom + 1}/${this.level.rooms.length}`;
    ctx.fillText(roomText, 20, 80);

    const indicatorX = CANVAS_WIDTH - 40;
    const indicatorY = CANVAS_HEIGHT - 40;
    const indicatorRadius = 12;

    const canRewind = this.rewind.canRewind() && !this.rewind.isActive();
    ctx.beginPath();
    ctx.arc(indicatorX, indicatorY, indicatorRadius, 0, Math.PI * 2);
    ctx.fillStyle = canRewind ? '#22C55E' : '#6B7280';
    ctx.shadowColor = canRewind ? '#22C55E' : '#6B7280';
    ctx.shadowBlur = canRewind ? 15 : 5;
    ctx.fill();
    ctx.strokeStyle = canRewind ? '#86EFAC' : '#9CA3AF';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.font = '11px monospace';
    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'right';
    ctx.fillText('[R] 回溯 [Q] 切换速度', CANVAS_WIDTH - 20, CANVAS_HEIGHT - 70);

    ctx.restore();

    this.rewind.renderHUD(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  private renderWinScreen(): void {
    const ctx = this.ctx;
    ctx.save();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.font = 'bold 48px monospace';
    ctx.fillStyle = '#34D399';
    ctx.shadowColor = '#34D399';
    ctx.shadowBlur = 20;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('时间征服完成!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);

    ctx.font = '20px monospace';
    ctx.fillStyle = '#FDE047';
    ctx.shadowColor = '#FDE047';
    ctx.fillText('所有能量水晶已收集', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#94A3B8';
    ctx.shadowBlur = 0;
    ctx.fillText('刷新页面重新开始', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);

    ctx.restore();
  }
}

window.addEventListener('load', () => {
  const game = new Game();
  game.start();
});
