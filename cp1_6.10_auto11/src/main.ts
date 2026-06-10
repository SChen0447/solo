import { InputManager } from './input';
import { Player } from './player';
import { Guard, PatrolPoint } from './guard';
import { LightingSystem } from './lighting';
import { AudioManager } from './audio';

const VIEW_WIDTH = 1280;
const VIEW_HEIGHT = 720;
const ASPECT_RATIO = 16 / 9;

type GameState = 'menu' | 'playing' | 'gameover' | 'victory';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreen: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;

  private state: GameState = 'menu';
  private lastTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 60;

  private input!: InputManager;
  private player!: Player;
  private guards: Guard[] = [];
  private lighting!: LightingSystem;
  private audio!: AudioManager;

  private menuFloat = 0;
  private menuGlow = 0;

  constructor() {
    this.canvas = document.getElementById('game') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.offscreen = document.createElement('canvas');
    this.offscreen.width = VIEW_WIDTH;
    this.offscreen.height = VIEW_HEIGHT;
    this.offCtx = this.offscreen.getContext('2d')!;

    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.init();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    let width = window.innerWidth;
    let height = window.innerHeight;

    if (width / height > ASPECT_RATIO) {
      width = height * ASPECT_RATIO;
    } else {
      height = width / ASPECT_RATIO;
    }

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = ((window.innerWidth - width) / 2) + 'px';
    this.canvas.style.top = ((window.innerHeight - height) / 2) + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  private init(): void {
    this.input = new InputManager();
    this.audio = new AudioManager();
    this.lighting = new LightingSystem(VIEW_WIDTH, VIEW_HEIGHT);

    const bounds = { minX: 40, maxX: VIEW_WIDTH - 40, minY: 100, maxY: VIEW_HEIGHT - 40 };
    this.player = new Player(100, VIEW_HEIGHT - 80, bounds);

    this.guards = [
      new Guard([
        { x: 300, y: VIEW_HEIGHT - 80 } as PatrolPoint,
        { x: 500, y: VIEW_HEIGHT - 80 } as PatrolPoint,
      ]),
      new Guard([
        { x: 750, y: VIEW_HEIGHT - 80 } as PatrolPoint,
        { x: 950, y: VIEW_HEIGHT - 80 } as PatrolPoint,
        { x: 850, y: 350 } as PatrolPoint,
      ]),
      new Guard([
        { x: 1100, y: VIEW_HEIGHT - 80 } as PatrolPoint,
        { x: 1100, y: 350 } as PatrolPoint,
      ]),
    ];
  }

  private resetGame(): void {
    const bounds = { minX: 40, maxX: VIEW_WIDTH - 40, minY: 100, maxY: VIEW_HEIGHT - 40 };
    this.player = new Player(100, VIEW_HEIGHT - 80, bounds);
    this.lighting = new LightingSystem(VIEW_WIDTH, VIEW_HEIGHT);

    this.guards = [
      new Guard([
        { x: 300, y: VIEW_HEIGHT - 80 } as PatrolPoint,
        { x: 500, y: VIEW_HEIGHT - 80 } as PatrolPoint,
      ]),
      new Guard([
        { x: 750, y: VIEW_HEIGHT - 80 } as PatrolPoint,
        { x: 950, y: VIEW_HEIGHT - 80 } as PatrolPoint,
        { x: 850, y: 350 } as PatrolPoint,
      ]),
      new Guard([
        { x: 1100, y: VIEW_HEIGHT - 80 } as PatrolPoint,
        { x: 1100, y: 350 } as PatrolPoint,
      ]),
    ];
  }

  private loop(timestamp: number): void {
    let dt = (timestamp - this.lastTime) / 1000;
    if (dt > 0.05) dt = 0.05;
    this.lastTime = timestamp;

    this.frameCount++;
    if (this.frameCount % 30 === 0) {
      this.fps = Math.round(1 / Math.max(dt, 0.001));
    }

    this.update(dt);
    this.render();
    this.input.clearFrame();

    requestAnimationFrame(this.loop);
  }

  private update(dt: number): void {
    this.menuFloat += dt * 0.8;
    this.menuGlow += dt * 2;

    if (this.state === 'menu') {
      if (this.input.wasPressed('enter') || this.input.wasPressed(' ')) {
        this.state = 'playing';
        this.resetGame();
      }
      return;
    }

    if (this.state === 'gameover' || this.state === 'victory') {
      if (this.input.wasPressed('enter') || this.input.wasPressed(' ')) {
        this.state = 'menu';
      }
      return;
    }

    this.lighting.update(dt);
    this.player.update(dt, this.input, this.guards, this.lighting, this.audio);

    for (const guard of this.guards) {
      guard.update(dt, this.player.x, this.player.y - this.player.height / 2, this.player.inShadow, this.lighting);
    }

    if (this.player.isCaught() || this.player.isDead()) {
      this.audio.playAlarm();
      this.state = 'gameover';
    }

    if (this.player.allChestsOpened()) {
      this.state = 'victory';
    }
  }

  private render(): void {
    const scale = Math.min(this.canvas.width / (window.devicePixelRatio || 1) / VIEW_WIDTH,
                          this.canvas.height / (window.devicePixelRatio || 1) / VIEW_HEIGHT);

    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    const offsetX = (this.canvas.width / (window.devicePixelRatio || 1) - VIEW_WIDTH * scale) / 2;
    const offsetY = (this.canvas.height / (window.devicePixelRatio || 1) - VIEW_HEIGHT * scale) / 2;
    this.ctx.translate(offsetX, offsetY);
    this.ctx.scale(scale, scale);

    if (this.state === 'menu') {
      this.renderMenu();
    } else {
      this.renderGame();
    }

    this.ctx.restore();
  }

  private renderMenu(): void {
    const ctx = this.offCtx;
    ctx.fillStyle = '#0A0A1A';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    const floatY = Math.sin(this.menuFloat) * 15;

    ctx.save();
    ctx.translate(0, floatY);

    ctx.fillStyle = '#1A1A2A';
    ctx.beginPath();
    ctx.moveTo(0, VIEW_HEIGHT);
    ctx.lineTo(0, 500);
    ctx.lineTo(100, 480);
    ctx.lineTo(100, 420);
    ctx.lineTo(160, 420);
    ctx.lineTo(160, 380);
    ctx.lineTo(220, 380);
    ctx.lineTo(220, 450);
    ctx.lineTo(300, 440);
    ctx.lineTo(300, 350);
    ctx.lineTo(380, 350);
    ctx.lineTo(380, 300);
    ctx.lineTo(450, 260);
    ctx.lineTo(450, 340);
    ctx.lineTo(520, 340);
    ctx.lineTo(520, 430);
    ctx.lineTo(600, 420);
    ctx.lineTo(600, 320);
    ctx.lineTo(680, 320);
    ctx.lineTo(680, 280);
    ctx.lineTo(760, 280);
    ctx.lineTo(760, 380);
    ctx.lineTo(840, 370);
    ctx.lineTo(840, 440);
    ctx.lineTo(920, 430);
    ctx.lineTo(920, 360);
    ctx.lineTo(1000, 360);
    ctx.lineTo(1000, 400);
    ctx.lineTo(1080, 390);
    ctx.lineTo(1080, 460);
    ctx.lineTo(1160, 450);
    ctx.lineTo(1160, 490);
    ctx.lineTo(1280, 480);
    ctx.lineTo(1280, VIEW_HEIGHT);
    ctx.closePath();
    ctx.fill();

    for (let i = 0; i < 20; i++) {
      const wx = 150 + (i * 60) % 1100;
      const wy = 400 + ((i * 37) % 60);
      const glow = 0.5 + Math.sin(this.menuGlow + i) * 0.3;
      ctx.fillStyle = `rgba(255, 180, 80, ${glow * 0.4})`;
      ctx.beginPath();
      ctx.arc(wx, wy, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 220, 120, ${glow})`;
      ctx.fillRect(wx - 3, wy - 5, 6, 8);
    }

    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';

    const titleGlow = 0.7 + Math.sin(this.menuGlow) * 0.3;
    ctx.shadowColor = `rgba(180, 100, 200, ${titleGlow})`;
    ctx.shadowBlur = 30;
    ctx.font = 'bold 96px "Georgia", "Times New Roman", serif';
    ctx.fillStyle = '#D4A0FF';
    ctx.fillText('暗夜潜行', VIEW_WIDTH / 2, 220 + Math.sin(this.menuFloat) * 8);

    ctx.shadowBlur = 0;
    ctx.font = '28px "Georgia", serif';
    ctx.fillStyle = '#8A8AAA';
    ctx.fillText('─ Shadow Stealth ─', VIEW_WIDTH / 2, 280);

    const startGlow = 0.6 + Math.sin(this.menuGlow * 1.5) * 0.4;
    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = `rgba(255, 208, 128, ${startGlow})`;
    ctx.fillText('按 ENTER 或 空格 开始游戏', VIEW_WIDTH / 2, 600);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#6A6A8A';
    ctx.fillText('WASD / 方向键 移动  |  Q 投石  |  E 开箱', VIEW_WIDTH / 2, 660);
    ctx.fillText('利用阴影躲避守卫，偷取所有宝箱中的宝藏', VIEW_WIDTH / 2, 685);

    ctx.restore();

    this.ctx.drawImage(this.offscreen, 0, 0);
  }

  private renderGame(): void {
    const ctx = this.offCtx;

    this.renderRoomBackground(ctx);

    this.lighting.render(ctx);

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    for (const guard of this.guards) {
      guard.render(ctx);
    }

    this.player.render(ctx);

    ctx.restore();

    this.renderHUD(ctx);
    this.renderMinimap(ctx);

    if (this.state === 'gameover') {
      this.renderGameOver(ctx);
    } else if (this.state === 'victory') {
      this.renderVictory(ctx);
    }

    this.ctx.drawImage(this.offscreen, 0, 0);
  }

  private renderRoomBackground(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    gradient.addColorStop(0, '#2B1B3A');
    gradient.addColorStop(0.5, '#1A3A2A');
    gradient.addColorStop(1, '#0A1A1A');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    ctx.strokeStyle = 'rgba(80, 60, 100, 0.3)';
    ctx.lineWidth = 1;
    for (let y = 80; y < VIEW_HEIGHT - 40; y += 40) {
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(VIEW_WIDTH - 40, y);
      ctx.stroke();
    }
    for (let x = 40; x < VIEW_WIDTH; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 80);
      ctx.lineTo(x, VIEW_HEIGHT - 40);
      ctx.stroke();
    }

    ctx.fillStyle = '#1A1A2A';
    ctx.fillRect(0, 0, VIEW_WIDTH, 80);

    ctx.fillStyle = '#2A2A3A';
    for (let x = 60; x < VIEW_WIDTH - 60; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, 80);
      ctx.lineTo(x + 30, 40);
      ctx.lineTo(x + 60, 80);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#0A0A1A';
    ctx.fillRect(0, VIEW_HEIGHT - 40, VIEW_WIDTH, 40);

    ctx.fillStyle = '#1A1A2A';
    for (let x = 0; x < VIEW_WIDTH; x += 40) {
      ctx.fillRect(x, VIEW_HEIGHT - 40, 38, 10);
    }
  }

  private renderHUD(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(15, 15, 220, 55);
    ctx.strokeStyle = 'rgba(180, 140, 200, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(15, 15, 220, 55);

    for (let i = 0; i < 3; i++) {
      const filled = i < this.player.lives;
      ctx.fillStyle = filled ? '#FF4466' : '#333344';
      this.drawHeart(ctx, 40 + i * 35, 42, 12);
    }

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    this.drawCoin(ctx, 155, 42, 10);
    ctx.fillStyle = '#FFD080';
    ctx.fillText(`${this.player.coins}`, 175, 49);

    if (this.player.exposedTime > 0 && !this.player.inShadow) {
      const pct = Math.min(this.player.exposedTime / 3, 1);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(VIEW_WIDTH / 2 - 120, 20, 240, 30);
      ctx.strokeStyle = pct > 0.7 ? '#FF4444' : '#FFAA00';
      ctx.lineWidth = 2;
      ctx.strokeRect(VIEW_WIDTH / 2 - 120, 20, 240, 30);
      ctx.fillStyle = pct > 0.7 ? 'rgba(255, 68, 68, 0.8)' : 'rgba(255, 170, 0, 0.8)';
      ctx.fillRect(VIEW_WIDTH / 2 - 118, 22, 236 * pct, 26);
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`⚠ 暴露中 ${(3 - this.player.exposedTime).toFixed(1)}s`, VIEW_WIDTH / 2, 41);
    }

    const anyAlert = this.guards.some(g => g.isAlert);
    if (anyAlert) {
      ctx.fillStyle = `rgba(255, 80, 80, ${0.3 + Math.sin(performance.now() / 150) * 0.2})`;
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ 警戒状态 ⚡', VIEW_WIDTH / 2, 85);
    }

    ctx.restore();
  }

  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.3);
    ctx.bezierCurveTo(x, y, x - size, y, x - size, y + size * 0.3);
    ctx.bezierCurveTo(x - size, y + size * 0.6, x, y + size * 0.8, x, y + size);
    ctx.bezierCurveTo(x, y + size * 0.8, x + size, y + size * 0.6, x + size, y + size * 0.3);
    ctx.bezierCurveTo(x + size, y, x, y, x, y + size * 0.3);
    ctx.closePath();
    ctx.fill();
  }

  private drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#B8860B';
    ctx.font = `bold ${r * 1.2}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', x, y + 1);
  }

  private renderMinimap(ctx: CanvasRenderingContext2D): void {
    const mapX = VIEW_WIDTH - 200;
    const mapY = 15;
    const mapW = 180;
    const mapH = 105;
    const scaleX = mapW / VIEW_WIDTH;
    const scaleY = mapH / VIEW_HEIGHT;

    ctx.save();

    ctx.fillStyle = 'rgba(10, 10, 26, 0.9)';
    ctx.fillRect(mapX, mapY, mapW, mapH);
    ctx.strokeStyle = 'rgba(180, 140, 200, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mapX, mapY, mapW, mapH);

    ctx.fillStyle = 'rgba(100, 80, 40, 0.6)';
    for (const chest of this.player.chests) {
      if (!chest.opened) {
        ctx.fillRect(mapX + chest.x * scaleX - 3, mapY + chest.y * scaleY - 3, 6, 6);
      }
    }

    for (const guard of this.guards) {
      const cone = guard.getViewCone();
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(mapX + cone.x * scaleX, mapY + cone.y * scaleY);
      ctx.arc(
        mapX + cone.x * scaleX,
        mapY + cone.y * scaleY,
        cone.range * scaleX,
        cone.angle - cone.spread / 2,
        cone.angle + cone.spread / 2
      );
      ctx.closePath();
      ctx.fillStyle = guard.state === 'chase' ? 'rgba(255, 80, 80, 0.4)' :
                      guard.isAlert ? 'rgba(255, 140, 80, 0.35)' :
                      'rgba(255, 255, 100, 0.25)';
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = guard.state === 'chase' ? '#FF4444' : guard.isAlert ? '#FF8844' : '#AAAAAA';
      ctx.beginPath();
      ctx.arc(mapX + guard.x * scaleX, mapY + guard.y * scaleY, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = this.player.inShadow ? '#66AACC' : '#88DDFF';
    ctx.beginPath();
    ctx.arc(mapX + this.player.x * scaleX, mapY + this.player.y * scaleY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#8A8AAA';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('小地图', mapX + 5, mapY + 14);

    ctx.restore();
  }

  private renderGameOver(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    ctx.textAlign = 'center';
    ctx.font = 'bold 72px "Georgia", serif';
    ctx.fillStyle = '#FF4466';
    ctx.shadowColor = 'rgba(255, 68, 102, 0.6)';
    ctx.shadowBlur = 20;
    ctx.fillText('被抓住了', VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 40);

    ctx.shadowBlur = 0;
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(`获得金币: ${this.player.coins}`, VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 20);

    const glow = 0.6 + Math.sin(this.menuGlow * 1.5) * 0.4;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = `rgba(255, 208, 128, ${glow})`;
    ctx.fillText('按 ENTER 返回菜单', VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 80);

    ctx.restore();
  }

  private renderVictory(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    ctx.textAlign = 'center';
    ctx.font = 'bold 72px "Georgia", serif';
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
    ctx.shadowBlur = 30;
    ctx.fillText('潜行成功!', VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 40);

    ctx.shadowBlur = 0;
    ctx.font = '28px sans-serif';
    ctx.fillStyle = '#FFD080';
    ctx.fillText(`✦ 获得金币: ${this.player.coins} ✦`, VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 20);
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '20px sans-serif';
    ctx.fillText(`剩余生命: ${this.player.lives}`, VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 55);

    const glow = 0.6 + Math.sin(this.menuGlow * 1.5) * 0.4;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = `rgba(255, 208, 128, ${glow})`;
    ctx.fillText('按 ENTER 返回菜单', VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 110);

    ctx.restore();
  }
}

new Game();
