import {
  PlayerCell,
  SmallCell,
  BigCell,
  EnergyGem,
  Plankton,
  ParticlePool
} from './entities';
import { UIRenderer, UIState } from './ui';

export class GameController {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;

  player: PlayerCell;
  smallCells: SmallCell[];
  bigCells: BigCell[];
  gems: EnergyGem[];
  plankton: Plankton[];
  particles: ParticlePool;

  ui: UIRenderer;

  mouseX: number;
  mouseY: number;
  isMouseDown: boolean;
  isRightClick: boolean;

  energy: number;
  maxEnergy: number;
  level: number;
  consumeCount: number;

  isPaused: boolean;
  isGameOver: boolean;
  isMobile: boolean;

  lastTime: number;
  animationId: number | null;
  running: boolean;

  private boundResize: () => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseDown: (e: MouseEvent) => void;
  private boundContextMenu: (e: MouseEvent) => void;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundTouchMove: (e: TouchEvent) => void;
  private boundTouchStart: (e: TouchEvent) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;

    this.width = 0;
    this.height = 0;

    this.mouseX = 0;
    this.mouseY = 0;
    this.isMouseDown = false;
    this.isRightClick = false;

    this.energy = 0;
    this.maxEnergy = 250;
    this.level = 1;
    this.consumeCount = 0;

    this.isPaused = false;
    this.isGameOver = false;
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    this.player = new PlayerCell(800, 600);
    this.smallCells = [];
    this.bigCells = [];
    this.gems = [];
    this.plankton = [];
    this.particles = new ParticlePool(500);

    this.ui = new UIRenderer(canvas, this.ctx);

    this.lastTime = 0;
    this.animationId = null;
    this.running = false;

    this.boundResize = this.handleResize.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseDown = this.handleMouseDown.bind(this);
    this.boundContextMenu = this.handleContextMenu.bind(this);
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundTouchMove = this.handleTouchMove.bind(this);
    this.boundTouchStart = this.handleTouchStart.bind(this);

    this.init();
  }

  init(): void {
    this.handleResize();
    window.addEventListener('resize', this.boundResize);

    this.canvas.addEventListener('mousemove', this.boundMouseMove);
    this.canvas.addEventListener('mousedown', this.boundMouseDown);
    this.canvas.addEventListener('contextmenu', this.boundContextMenu);
    window.addEventListener('keydown', this.boundKeyDown);
    this.canvas.addEventListener('touchmove', this.boundTouchMove, { passive: false });
    this.canvas.addEventListener('touchstart', this.boundTouchStart, { passive: false });

    this.resetGame();
  }

  resetGame(): void {
    this.player = new PlayerCell(this.width, this.height);
    this.smallCells = [];
    this.bigCells = [];
    this.gems = [];
    this.plankton = [];
    this.particles = new ParticlePool(500);

    this.energy = 0;
    this.level = 1;
    this.consumeCount = 0;
    this.isGameOver = false;
    this.isPaused = false;
    this.ui.resetGameOver();
    this.ui.updateConsumeCount(0);

    for (let i = 0; i < 30; i++) {
      this.smallCells.push(new SmallCell(this.width, this.height));
    }
    for (let i = 0; i < 10; i++) {
      this.bigCells.push(new BigCell(this.width, this.height));
    }
    for (let i = 0; i < 5; i++) {
      this.gems.push(new EnergyGem(this.width, this.height));
    }
    const planktonCount = Math.min(80, Math.floor((this.width * this.height) / 15000));
    for (let i = 0; i < planktonCount; i++) {
      this.plankton.push(new Plankton(this.width, this.height));
    }

    this.mouseX = this.width / 2;
    this.mouseY = this.height / 2;
    this.player.setTarget(this.mouseX, this.mouseY);
  }

  destroy(): void {
    this.running = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.boundResize);
    this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    this.canvas.removeEventListener('mousedown', this.boundMouseDown);
    this.canvas.removeEventListener('contextmenu', this.boundContextMenu);
    window.removeEventListener('keydown', this.boundKeyDown);
    this.canvas.removeEventListener('touchmove', this.boundTouchMove);
    this.canvas.removeEventListener('touchstart', this.boundTouchStart);
  }

  handleResize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.width = Math.max(800, window.innerWidth);
    this.height = Math.max(600, window.innerHeight);

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || this.width < 900;

    this.ui.updateButtonPositions(this.width, this.height, this.isMobile);
  }

  handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
    this.ui.updateButtonHover(this.mouseX, this.mouseY);
  }

  handleMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.isMouseDown = true;

    if (e.button === 2) {
      this.isRightClick = true;
      this.tryDash();
      return;
    }

    const action = this.ui.checkButtonClick(x, y);
    if (action === 'dash') {
      this.tryDash();
    } else if (action === 'pause') {
      this.togglePause();
    }
  }

  handleContextMenu(e: MouseEvent): void {
    e.preventDefault();
  }

  handleKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      e.preventDefault();
      this.togglePause();
    } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.tryDash();
    }
  }

  handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.touches[0].clientX - rect.left;
      this.mouseY = e.touches[0].clientY - rect.top;
      this.ui.updateButtonHover(this.mouseX, this.mouseY);
    }
  }

  handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      this.mouseX = x;
      this.mouseY = y;

      const action = this.ui.checkButtonClick(x, y);
      if (action === 'dash') {
        this.tryDash();
      } else if (action === 'pause') {
        this.togglePause();
      }
    }
  }

  tryDash(): void {
    if (this.isPaused || this.isGameOver) return;
    const dx = this.mouseX - this.player.x;
    const dy = this.mouseY - this.player.y;
    this.player.dash(dx, dy);
  }

  togglePause(): void {
    if (this.isGameOver) return;
    this.isPaused = !this.isPaused;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private loop(currentTime: number): void {
    if (!this.running) return;
    this.animationId = requestAnimationFrame((t) => this.loop(t));

    const dt = Math.min(50, currentTime - this.lastTime);
    this.lastTime = currentTime;

    this.update(dt, currentTime);
    this.render(currentTime);
  }

  update(dt: number, time: number): void {
    if (this.isGameOver) {
      this.ui.update(dt);
      const shouldReset = this.ui.drawGameOver(time);
      if (shouldReset) {
        this.resetGame();
      }
      return;
    }

    if (this.isPaused) {
      this.ui.update(dt);
      return;
    }

    this.ui.update(dt);

    this.player.setTarget(this.mouseX, this.mouseY);
    this.player.update(this.width, this.height, dt);

    for (const cell of this.smallCells) {
      cell.update(this.width, this.height, this.player, dt);
    }
    this.smallCells = this.smallCells.filter((c) => c.active);
    while (this.smallCells.length < 30) {
      this.smallCells.push(new SmallCell(this.width, this.height));
    }

    for (const cell of this.bigCells) {
      cell.update(this.width, this.height, this.player, dt);
    }

    for (const gem of this.gems) {
      gem.update(this.width, this.height, dt);
    }

    for (const p of this.plankton) {
      p.update(this.width, this.height, time);
    }

    this.particles.update(dt);

    this.checkCollisions();

    const newLevel = Math.min(5, Math.floor(this.energy / 50) + 1);
    if (newLevel > this.level) {
      this.level = newLevel;
      this.ui.triggerLevelUp(this.level);
    }
  }

  checkCollisions(): void {
    if (this.player.invincibleTimer > 0) return;

    for (const cell of this.smallCells) {
      if (!cell.active || cell.beingConsumed) continue;
      const dx = this.player.x - cell.x;
      const dy = this.player.y - cell.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.player.radius + cell.radius * 0.6) {
        this.consumeSmallCell(cell);
      }
    }

    for (const gem of this.gems) {
      if (!gem.active) continue;
      const dx = this.player.x - gem.x;
      const dy = this.player.y - gem.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.player.radius + gem.radius) {
        this.consumeGem(gem);
      }
    }

    for (const cell of this.bigCells) {
      if (!cell.active) continue;
      const dx = this.player.x - cell.x;
      const dy = this.player.y - cell.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.player.radius + cell.radius * 0.7) {
        this.hitByBigCell(cell);
        break;
      }
    }
  }

  consumeSmallCell(cell: SmallCell): void {
    cell.startConsume(this.player.x, this.player.y);
    this.player.grow(2);
    this.energy = Math.min(this.maxEnergy, this.energy + 10);
    this.consumeCount++;
    this.ui.updateConsumeCount(this.consumeCount);

    const color = `hsl(${cell.hue}, 70%, 60%)`;
    this.particles.emit(cell.x, cell.y, 8 + Math.floor(Math.random() * 5), color);
  }

  consumeGem(gem: EnergyGem): void {
    gem.active = false;
    gem.respawnTimer = 0;
    this.player.grow(2);
    this.energy = Math.min(this.maxEnergy, this.energy + 10);
    this.consumeCount++;
    this.ui.updateConsumeCount(this.consumeCount);

    this.particles.emit(gem.x, gem.y, 10 + Math.floor(Math.random() * 5), '#FFD700');
  }

  hitByBigCell(cell: BigCell): void {
    this.player.applyKnockback(cell.x, cell.y, 8);
    this.energy = Math.max(0, this.energy - 20);

    if (this.energy <= 0) {
      this.isGameOver = true;
      this.ui.triggerGameOver();
      this.particles.emit(this.player.x, this.player.y, 30, '#ff4444');
    } else {
      this.particles.emit(this.player.x, this.player.y, 15, '#ff6666');
    }
  }

  render(time: number): void {
    const { ctx } = this;

    this.ui.drawBackground(this.width, this.height, time);

    for (const p of this.plankton) {
      p.draw(ctx, time);
    }

    for (const gem of this.gems) {
      gem.draw(ctx, time);
    }

    for (const cell of this.smallCells) {
      cell.draw(ctx, time);
    }

    for (const cell of this.bigCells) {
      cell.draw(ctx, time, this.player);
    }

    if (!this.isGameOver) {
      this.player.draw(ctx, time);
    }

    this.particles.draw(ctx);

    const uiState: UIState = {
      energy: this.energy,
      maxEnergy: this.maxEnergy,
      level: this.level,
      consumeCount: this.consumeCount,
      isPaused: this.isPaused,
      isGameOver: this.isGameOver,
      dashCooldown: this.player.dashCooldown,
      isMobile: this.isMobile,
      mouseX: this.mouseX,
      mouseY: this.mouseY
    };

    this.ui.drawEnergyBar(uiState, time);
    this.ui.drawMinimap(uiState, this.player, this.smallCells, this.bigCells, this.gems, this.width, this.height);
    this.ui.drawButtons(uiState, time);
    this.ui.drawLevelUp(time);

    if (this.isGameOver) {
      this.ui.drawGameOver(time);
    } else if (this.isPaused) {
      this.ui.drawPaused();
    }

    if (!this.isMobile && !this.isGameOver && !this.isPaused) {
      this.drawCursor();
    }
  }

  drawCursor(): void {
    const { ctx } = this;
    ctx.save();
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.mouseX, this.mouseY, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.mouseX - 15, this.mouseY);
    ctx.lineTo(this.mouseX - 5, this.mouseY);
    ctx.moveTo(this.mouseX + 5, this.mouseY);
    ctx.lineTo(this.mouseX + 15, this.mouseY);
    ctx.moveTo(this.mouseX, this.mouseY - 15);
    ctx.lineTo(this.mouseX, this.mouseY - 5);
    ctx.moveTo(this.mouseX, this.mouseY + 5);
    ctx.lineTo(this.mouseX, this.mouseY + 15);
    ctx.stroke();
    ctx.restore();
  }
}
