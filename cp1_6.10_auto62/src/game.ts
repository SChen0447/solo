import { Ship, Fleet, Side } from './ships';
import {
  Cannonball,
  Explosion,
  ParticlePool,
  WaveRenderer,
  VictoryFlag,
} from './effects';

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number = 0;
  height: number = 0;

  redFleet!: Fleet;
  blueFleet!: Fleet;
  selectedShip: Ship | null = null;

  cannonballs: Cannonball[] = [];
  explosions: Explosion[] = [];
  explosionPool: ParticlePool;

  waveRenderer: WaveRenderer;
  victoryFlag: VictoryFlag | null = null;
  winner: Side | null = null;

  isPaused: boolean = false;
  isGameOver: boolean = false;

  restartButtonRect = { x: 0, y: 0, w: 180, h: 50 };
  mouseX: number = 0;
  mouseY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.explosionPool = new ParticlePool(50);
    this.waveRenderer = new WaveRenderer();
    this.resize();
    this.initFleets();
    this.bindEvents();
  }

  resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
  }

  initFleets(): void {
    this.redFleet = new Fleet('red', this.width, this.height);
    this.blueFleet = new Fleet('blue', this.width, this.height);
    this.cannonballs = [];
    this.explosions = [];
    this.explosionPool.clear();
    this.selectedShip = null;
    this.winner = null;
    this.victoryFlag = null;
    this.isGameOver = false;
  }

  bindEvents(): void {
    window.addEventListener('resize', () => {
      this.resize();
      this.redFleet.reset(this.width, this.height);
      this.blueFleet.reset(this.width, this.height);
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (this.isGameOver) {
        if (
          x >= this.restartButtonRect.x &&
          x <= this.restartButtonRect.x + this.restartButtonRect.w &&
          y >= this.restartButtonRect.y &&
          y <= this.restartButtonRect.y + this.restartButtonRect.h
        ) {
          this.restart();
        }
        return;
      }

      this.handleClick(x, y);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!this.isGameOver) {
          this.isPaused = !this.isPaused;
        }
      }
      if (this.selectedShip && !this.isPaused && !this.isGameOver) {
        if (e.code === 'ArrowLeft') {
          const minX = 8 + this.selectedShip.state.width / 2;
          const maxX =
            this.selectedShip.state.side === 'red'
              ? this.width / 2 - 60
              : this.width - 8 - this.selectedShip.state.width / 2;
          this.selectedShip.move(-8, minX, maxX);
        } else if (e.code === 'ArrowRight') {
          const minX = 8 + this.selectedShip.state.width / 2;
          const maxX =
            this.selectedShip.state.side === 'red'
              ? this.width / 2 - 60
              : this.width - 8 - this.selectedShip.state.width / 2;
          this.selectedShip.move(8, minX, maxX);
        }
      }
    });
  }

  handleClick(x: number, y: number): void {
    if (this.isPaused) return;

    const redShip = this.redFleet.findShipAt(x, y);
    const blueShip = this.blueFleet.findShipAt(x, y);

    if (this.selectedShip) {
      const target = this.selectedShip.state.side === 'red' ? blueShip : redShip;
      if (target || this.isInSea(x, y)) {
        if (this.selectedShip.canFire()) {
          this.fireCannonball(this.selectedShip, x, y);
        }
      } else if (redShip || blueShip) {
        this.selectedShip = redShip || blueShip;
      } else {
        this.selectedShip = null;
      }
    } else {
      if (redShip) {
        this.selectedShip = redShip;
      } else if (blueShip) {
        this.selectedShip = blueShip;
      }
    }
  }

  isInSea(x: number, y: number): boolean {
    return x > 8 && x < this.width - 8 && y > 8 && y < this.height - 8;
  }

  fireCannonball(ship: Ship, targetX: number, targetY: number): void {
    const tip = ship.getBarrelTip();
    const ball = new Cannonball(tip.x, tip.y, targetX, targetY);
    this.cannonballs.push(ball);
    ship.fire();
  }

  checkCollision(ball: Cannonball): Ship | null {
    const s = ball.state;
    const allShips = [...this.redFleet.ships, ...this.blueFleet.ships];
    for (const ship of allShips) {
      if (ship.state.hp <= 0) continue;
      if (ship.containsPoint(s.x, s.y)) {
        return ship;
      }
    }
    return null;
  }

  checkVictory(): void {
    if (this.isGameOver) return;
    if (this.redFleet.isDefeated()) {
      this.winner = 'blue';
      this.isGameOver = true;
      this.victoryFlag = new VictoryFlag('blue', this.width, this.height);
    } else if (this.blueFleet.isDefeated()) {
      this.winner = 'red';
      this.isGameOver = true;
      this.victoryFlag = new VictoryFlag('red', this.width, this.height);
    }
  }

  restart(): void {
    this.initFleets();
  }

  update(deltaTime: number): void {
    if (this.isPaused) return;

    this.waveRenderer.update();

    if (!this.isGameOver) {
      this.redFleet.update(deltaTime, this.width, this.height);
      this.blueFleet.update(deltaTime, this.width, this.height);

      for (let i = this.cannonballs.length - 1; i >= 0; i--) {
        const ball = this.cannonballs[i];
        const alive = ball.update(this.width, this.height);
        if (!alive) {
          this.cannonballs.splice(i, 1);
          continue;
        }
        const hitShip = this.checkCollision(ball);
        if (hitShip) {
          hitShip.takeDamage(10);
          const exp = new Explosion(ball.state.x, ball.state.y, this.explosionPool);
          this.explosions.push(exp);
          ball.state.active = false;
          this.cannonballs.splice(i, 1);
        }
      }

      for (let i = this.explosions.length - 1; i >= 0; i--) {
        this.explosions[i].update(deltaTime);
        if (!this.explosions[i].active) {
          this.explosions.splice(i, 1);
        }
      }

      this.checkVictory();
    }

    if (this.victoryFlag) {
      this.victoryFlag.update(deltaTime);
    }
  }

  render(): void {
    const ctx = this.ctx;
    this.waveRenderer.renderBackground(ctx, this.width, this.height);

    this.redFleet.render(ctx);
    this.blueFleet.render(ctx);

    for (const ball of this.cannonballs) {
      ball.render(ctx);
    }

    for (const exp of this.explosions) {
      exp.render(ctx);
    }

    this.renderSelectedOutline(ctx);
    this.renderUI(ctx);

    if (this.isPaused) {
      ctx.save();
      ctx.fillStyle = 'rgba(128, 128, 128, 0.6)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('游戏暂停', this.width / 2, this.height / 2);
      ctx.font = '20px sans-serif';
      ctx.fillText('按空格键继续', this.width / 2, this.height / 2 + 40);
      ctx.restore();
    }

    if (this.isGameOver) {
      this.renderVictory(ctx);
    }

    this.waveRenderer.renderBorder(ctx, this.width, this.height);
  }

  renderSelectedOutline(ctx: CanvasRenderingContext2D): void {
    if (!this.selectedShip) return;
    const s = this.selectedShip.state;
    ctx.save();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(
      s.x - s.width / 2 - 6,
      s.y - s.height / 2 - 6,
      s.width + 12,
      s.height + 12
    );
    ctx.restore();
  }

  renderUI(ctx: CanvasRenderingContext2D): void {
    this.renderTimePanel(ctx);
    this.renderShipInfo(ctx);
  }

  renderTimePanel(ctx: CanvasRenderingContext2D): void {
    const panelX = 20;
    const panelY = 20;
    const panelW = 180;
    const panelH = 50;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.filter = 'blur(10px)';
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.filter = 'none';

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false });
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(timeStr, panelX + panelW / 2, panelY + 33);
    ctx.restore();
  }

  renderShipInfo(ctx: CanvasRenderingContext2D): void {
    const panelX = 20;
    const panelH = 130;
    const panelW = 220;
    const panelY = this.height - panelH - 20;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    if (this.selectedShip) {
      const s = this.selectedShip.state;
      ctx.fillStyle = s.side === 'red' ? '#FF6B6B' : '#6B9FFF';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(s.name, panelX + 15, panelY + 30);

      ctx.fillStyle = '#ccc';
      ctx.font = '14px sans-serif';
      ctx.fillText(`血量: ${s.hp}/${s.maxHp}`, panelX + 15, panelY + 55);

      const barX = panelX + 75;
      const barY = panelY + 45;
      const barW = 130;
      const barH = 12;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(barX, barY, barW, barH);
      const ratio = s.hp / s.maxHp;
      const hpGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
      if (ratio > 0.5) {
        hpGrad.addColorStop(0, '#00FF00');
        hpGrad.addColorStop(1, '#7CFC00');
      } else if (ratio > 0.25) {
        hpGrad.addColorStop(0, '#FFD700');
        hpGrad.addColorStop(1, '#FFA500');
      } else {
        hpGrad.addColorStop(0, '#FF4500');
        hpGrad.addColorStop(1, '#DC143C');
      }
      ctx.fillStyle = hpGrad;
      ctx.fillRect(barX, barY, barW * ratio, barH);

      ctx.fillStyle = '#ccc';
      ctx.fillText(`弹药: ${s.ammo}/${s.maxAmmo}`, panelX + 15, panelY + 80);

      const ammoBarX = panelX + 75;
      const ammoBarY = panelY + 70;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(ammoBarX, ammoBarY, barW, barH);
      const ammoGrad = ctx.createLinearGradient(ammoBarX, ammoBarY, ammoBarX + barW, ammoBarY);
      ammoGrad.addColorStop(0, '#FFD700');
      ammoGrad.addColorStop(1, '#FFA500');
      ctx.fillStyle = ammoGrad;
      ctx.fillRect(ammoBarX, ammoBarY, barW * (s.ammo / s.maxAmmo), barH);

      let status = '正常';
      if (s.isBurning) status = '燃烧中!';
      else if (s.damageLevel === 'heavy') status = '严重受损';
      else if (s.damageLevel === 'medium') status = '中度受损';
      else if (s.damageLevel === 'light') status = '轻微受损';

      ctx.fillStyle = s.isBurning ? '#FF6B6B' : '#aaa';
      ctx.fillText(`状态: ${status}`, panelX + 15, panelY + 108);
    } else {
      ctx.fillStyle = '#888';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('点击舰船进行选择', panelX + panelW / 2, panelY + panelH / 2);
    }
    ctx.restore();
  }

  renderVictory(ctx: CanvasRenderingContext2D): void {
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    if (this.winner === 'red') {
      grad.addColorStop(0, 'rgba(139, 0, 0, 0.7)');
      grad.addColorStop(1, 'rgba(220, 20, 60, 0.7)');
    } else {
      grad.addColorStop(0, 'rgba(0, 0, 139, 0.7)');
      grad.addColorStop(1, 'rgba(65, 105, 225, 0.7)');
    }
    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();

    if (this.victoryFlag) {
      this.victoryFlag.render(ctx);
    }

    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 10;
    const winText = this.winner === 'red' ? '红色阵营胜利!' : '蓝色阵营胜利!';
    ctx.fillText(winText, this.width / 2, this.height * 0.2);

    this.restartButtonRect.x = this.width / 2 - this.restartButtonRect.w / 2;
    this.restartButtonRect.y = this.height * 0.75;

    const hover =
      this.mouseX >= this.restartButtonRect.x &&
      this.mouseX <= this.restartButtonRect.x + this.restartButtonRect.w &&
      this.mouseY >= this.restartButtonRect.y &&
      this.mouseY <= this.restartButtonRect.y + this.restartButtonRect.h;

    ctx.fillStyle = hover ? '#FFD700' : '#FFA500';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;
    this.roundRect(
      ctx,
      this.restartButtonRect.x,
      this.restartButtonRect.y,
      this.restartButtonRect.w,
      this.restartButtonRect.h,
      8
    );
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#000';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(
      '重新开始',
      this.restartButtonRect.x + this.restartButtonRect.w / 2,
      this.restartButtonRect.y + this.restartButtonRect.h / 2 + 8
    );
    ctx.restore();
  }

  roundRect(
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
}
