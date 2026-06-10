import Matter from 'matter-js';
import { PhysicsEngine, CollisionEvent } from './physics';
import {
  Projectile,
  ProjectileType,
  Block,
  BlockFragment,
  Terrain,
  Cloud,
  Mountain,
  PROJECTILE_CONFIGS
} from './entities';
import { UIManager, AudioManager } from './ui';

type Turn = 'player' | 'ai';

const MAX_OBJECTS = 200;

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;

  private physics: PhysicsEngine;
  private ui: UIManager;
  private audio: AudioManager;

  private terrain!: Terrain;
  private clouds: Cloud[] = [];
  private mountains: Mountain[] = [];

  private playerBlocks: Block[] = [];
  private aiBlocks: Block[] = [];
  private projectiles: Projectile[] = [];
  private fragments: BlockFragment[] = [];

  private currentTurn: Turn = 'player';
  private playerScore: number = 0;
  private aiScore: number = 0;

  private playerAmmo: Record<ProjectileType, number> = {
    stone: 2,
    sticky: 2,
    bouncy: 1
  };
  private aiAmmo: Record<ProjectileType, number> = {
    stone: 2,
    sticky: 2,
    bouncy: 1
  };

  private slingshotAnchor: { x: number; y: number } = { x: 0, y: 0 };
  private currentProjectile: Projectile | null = null;
  private isDragging: boolean = false;
  private dragStart: { x: number; y: number } | null = null;
  private dragCurrent: { x: number; y: number } | null = null;
  private turnInProgress: boolean = false;
  private waitingForSettle: boolean = false;
  private settleTimer: number = 0;

  private gameOver: boolean = false;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.physics = new PhysicsEngine();
    this.audio = new AudioManager();

    this.ui = new UIManager({
      onAmmoSelect: (type) => this.handleAmmoSelect(type),
      onRestart: () => this.restart()
    });

    this.resize();
    this.initGame();
    this.bindInput();
    this.physics.onCollision((e) => this.handleCollision(e));
    this.physics.onUpdate((delta) => this.update(delta));

    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || window.innerWidth;
    const h = rect.height || (window.innerHeight - 60);

    this.width = w;
    this.height = h;

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private initGame(): void {
    this.playerScore = 0;
    this.aiScore = 0;
    this.playerAmmo = { stone: 2, sticky: 2, bouncy: 1 };
    this.aiAmmo = { stone: 2, sticky: 2, bouncy: 1 };
    this.currentTurn = 'player';
    this.gameOver = false;
    this.turnInProgress = false;
    this.waitingForSettle = false;

    this.projectiles = [];
    this.fragments = [];
    this.playerBlocks = [];
    this.aiBlocks = [];
    this.currentProjectile = null;
    this.isDragging = false;

    this.physics.clearAll();

    this.terrain = new Terrain(this.width, this.height - 30);
    this.physics.addBodies(this.terrain.getBodies());

    this.clouds = [];
    for (let i = 0; i < 5; i++) {
      this.clouds.push(new Cloud(this.width, this.height));
    }

    this.mountains = [];
    const baseY = this.height - 50;
    this.mountains.push(new Mountain(this.width, baseY, -50, 5, '#1e3d2a'));
    this.mountains.push(new Mountain(this.width, baseY - 10, -80, 4, '#2a4d38'));

    this.buildBlocks();

    this.slingshotAnchor = {
      x: 80,
      y: this.height - 100
    };

    this.updateUI();
    this.ui.hideGameOver();
    this.ui.setTurn('player');
    this.ui.setAmmoButtonsEnabled(true);
    this.ui.selectAmmo('stone');

    this.renderLoop();
    this.physics.start();
  }

  private buildBlocks(): void {
    const cols = 6;
    const rows = 4;
    const blockW = 40;
    const blockH = 30;
    const gap = 2;

    const totalW = cols * blockW + (cols - 1) * gap;
    const totalH = rows * blockH + (rows - 1) * gap;

    const aiStartX = this.width * 0.6 + (this.width * 0.4 - totalW) / 2 + blockW / 2;
    const playerStartX = this.width * 0.1 + (this.width * 0.3 - totalW) / 2 + blockW / 2;
    const groundY = this.height - 30;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = aiStartX + c * (blockW + gap);
        const y = groundY - blockH / 2 - r * (blockH + gap);
        const block = new Block(x, y, blockW, blockH, 'ai');
        this.aiBlocks.push(block);
        this.physics.addBody(block.body);
      }
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = playerStartX + c * (blockW + gap);
        const y = groundY - blockH / 2 - r * (blockH + gap);
        const block = new Block(x, y, blockW, blockH, 'player');
        this.playerBlocks.push(block);
        this.physics.addBody(block.body);
      }
    }
  }

  private bindInput(): void {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.onMouseDown({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
    }, { passive: false });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.onMouseMove({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
    }, { passive: false });
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.onMouseUp({} as MouseEvent);
    }, { passive: false });
  }

  private getCanvasPos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private onMouseDown(e: MouseEvent): void {
    if (this.currentTurn !== 'player' || this.turnInProgress || this.gameOver) return;

    const pos = this.getCanvasPos(e);
    const selectedType = this.ui.getSelectedAmmo();

    if (this.playerAmmo[selectedType] <= 0) return;

    const dx = pos.x - this.slingshotAnchor.x;
    const dy = pos.y - this.slingshotAnchor.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 100) {
      this.isDragging = true;
      this.dragStart = { ...this.slingshotAnchor };
      this.dragCurrent = pos;

      this.currentProjectile = new Projectile(selectedType, this.slingshotAnchor.x, this.slingshotAnchor.y);
      this.physics.addBody(this.currentProjectile.body);
      this.projectiles.push(this.currentProjectile);
      this.enforceObjectLimit();

      this.ui.setShowTrajectory(true);
      this.updateTrajectoryPreview();
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const pos = this.getCanvasPos(e);
    this.dragCurrent = pos;

    if (this.currentProjectile) {
      const dx = pos.x - this.slingshotAnchor.x;
      const dy = pos.y - this.slingshotAnchor.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = 120;

      let px = pos.x;
      let py = pos.y;

      if (dist > maxDist) {
        const scale = maxDist / dist;
        px = this.slingshotAnchor.x + dx * scale;
        py = this.slingshotAnchor.y + dy * scale;
      }

      Matter.Body.setPosition(this.currentProjectile.body, { x: px, y: py });
      this.updateTrajectoryPreview();
    }
  }

  private onMouseUp(_e: MouseEvent): void {
    if (!this.isDragging || !this.currentProjectile) {
      this.isDragging = false;
      this.ui.setShowTrajectory(false);
      return;
    }

    this.isDragging = false;
    this.ui.setShowTrajectory(false);

    if (this.currentProjectile && this.dragCurrent) {
      const dx = this.slingshotAnchor.x - this.currentProjectile.body.position.x;
      const dy = this.slingshotAnchor.y - this.currentProjectile.body.position.y;
      const power = 0.08;

      const vx = dx * power;
      const vy = dy * power;

      if (Math.abs(vx) > 0.5 || Math.abs(vy) > 0.5) {
        this.currentProjectile.launch({ x: vx, y: vy });
        this.audio.playLaunchSound(this.currentProjectile.type);

        const type = this.currentProjectile.type;
        this.playerAmmo[type]--;
        this.turnInProgress = true;
        this.waitingForSettle = true;
        this.settleTimer = 4000;

        this.ui.setAmmoButtonsEnabled(false);
      } else {
        this.physics.removeBody(this.currentProjectile.body);
        const idx = this.projectiles.indexOf(this.currentProjectile);
        if (idx >= 0) this.projectiles.splice(idx, 1);
        this.currentProjectile = null;
      }
    }

    this.updateUI();
    this.currentProjectile = null;
  }

  private updateTrajectoryPreview(): void {
    if (!this.currentProjectile || !this.dragCurrent) return;

    const pos = this.currentProjectile.body.position;
    const dx = this.slingshotAnchor.x - pos.x;
    const dy = this.slingshotAnchor.y - pos.y;
    const power = 0.08;

    const vx = dx * power;
    const vy = dy * power;

    const trajectory = this.physics.predictTrajectory(pos.x, pos.y, vx, vy, 100, 16);
    this.ui.setTrajectory(trajectory);
  }

  private handleAmmoSelect(type: ProjectileType): void {
    if (this.playerAmmo[type] <= 0) {
      const available = (Object.keys(this.playerAmmo) as ProjectileType[])
        .find((t) => this.playerAmmo[t] > 0);
      if (available) {
        this.ui.selectAmmo(available);
      }
    }
  }

  private handleCollision(event: CollisionEvent): void {
    const { bodyA, bodyB, velocity } = event;

    const projectile = this.getProjectileFromBody(bodyA, bodyB);
    const block = this.getBlockFromBody(bodyA, bodyB);

    if (projectile && block) {
      this.onProjectileHitBlock(projectile, block, velocity);
    }

    if (projectile) {
      if (projectile.config.isSticky) {
        if (block) {
          projectile.isStuck = true;
          projectile.stuckTo = block.body;
          projectile.stickyPullTimer = projectile.config.stickyDuration ?? 5000;
        }
      }

      if (projectile.type === 'bouncy') {
        projectile.bouncesLeft--;
        if (projectile.bouncesLeft <= 0) {
          projectile.body.restitution = 0.1;
        }
      }
    }
  }

  private getProjectileFromBody(a: Matter.Body, b: Matter.Body): Projectile | null {
    const refA = (a as any).projectileRef as Projectile | undefined;
    const refB = (b as any).projectileRef as Projectile | undefined;
    return refA ?? refB ?? null;
  }

  private getBlockFromBody(a: Matter.Body, b: Matter.Body): Block | null {
    const refA = (a as any).blockRef as Block | undefined;
    const refB = (b as any).blockRef as Block | undefined;
    return refA ?? refB ?? null;
  }

  private onProjectileHitBlock(projectile: Projectile, block: Block, velocity: number): void {
    if (block.isDestroyed) return;

    const damage = projectile.config.damage + velocity * 2;
    block.takeDamage(damage);
    this.audio.playImpactSound(velocity);

    if (block.isDestroyed) {
      this.destroyBlock(block);
      if (block.owner === 'ai') {
        this.playerScore += 10;
      } else {
        this.aiScore += 10;
      }
      this.audio.playBreakSound();
    }
  }

  private destroyBlock(block: Block): void {
    const pos = block.body.position;
    const fragSize = Math.min(block.width, block.height) / 2.2;

    for (let i = 0; i < 4; i++) {
      const offsetX = (Math.random() - 0.5) * block.width * 0.5;
      const offsetY = (Math.random() - 0.5) * block.height * 0.5;
      const frag = new BlockFragment(
        pos.x + offsetX,
        pos.y + offsetY,
        fragSize,
        block.baseColor
      );
      this.fragments.push(frag);
      this.physics.addBody(frag.body);

      Matter.Body.applyForce(frag.body, frag.body.position, {
        x: (Math.random() - 0.5) * 0.02,
        y: -0.01 - Math.random() * 0.02
      });
    }

    this.physics.removeBody(block.body);

    if (block.owner === 'player') {
      const idx = this.playerBlocks.indexOf(block);
      if (idx >= 0) this.playerBlocks.splice(idx, 1);
    } else {
      const idx = this.aiBlocks.indexOf(block);
      if (idx >= 0) this.aiBlocks.splice(idx, 1);
    }

    this.enforceObjectLimit();
  }

  private enforceObjectLimit(): void {
    const total = this.projectiles.length + this.fragments.length;
    if (total > MAX_OBJECTS) {
      const toRemove = total - MAX_OBJECTS;

      for (let i = 0; i < toRemove && this.fragments.length > 0; i++) {
        const frag = this.fragments.shift()!;
        this.physics.removeBody(frag.body);
      }

      for (let i = 0; i < toRemove && this.projectiles.length > 0; i++) {
        const proj = this.projectiles.shift()!;
        this.physics.removeBody(proj.body);
      }
    }
  }

  private update(delta: number): void {
    if (this.gameOver) return;

    for (const cloud of this.clouds) {
      cloud.update();
    }

    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const frag = this.fragments[i];
      frag.update(delta);
      if (!frag.isActive) {
        this.physics.removeBody(frag.body);
        this.fragments.splice(i, 1);
      }
    }

    for (const proj of this.projectiles) {
      if (proj.isStuck && proj.stuckTo && proj.stickyPullTimer > 0) {
        proj.stickyPullTimer -= delta;
        Matter.Body.applyForce(proj.stuckTo, proj.stuckTo.position, {
          x: -0.0003 * (delta / 16),
          y: 0
        });
        Matter.Body.setPosition(proj.body, {
          x: proj.stuckTo.position.x,
          y: proj.stuckTo.position.y
        });
      }

      if (proj.isLaunched) {
        const pos = proj.body.position;
        if (pos.y > this.height + 100 || pos.x < -200 || pos.x > this.width + 200) {
          proj.isActive = false;
        }
      }
    }

    this.projectiles = this.projectiles.filter((p) => {
      if (!p.isActive) {
        this.physics.removeBody(p.body);
        return false;
      }
      return true;
    });

    if (this.waitingForSettle) {
      this.settleTimer -= delta;

      const allStopped = this.projectiles.every((p) => {
        if (!p.isLaunched) return true;
        const speed = Math.sqrt(p.body.velocity.x ** 2 + p.body.velocity.y ** 2);
        return speed < 0.3;
      });

      if ((allStopped && this.settleTimer < 2000) || this.settleTimer <= 0) {
        this.waitingForSettle = false;
        this.turnInProgress = false;
        this.endTurn();
      }
    }
  }

  private endTurn(): void {
    if (this.checkGameOver()) return;

    if (this.currentTurn === 'player') {
      this.currentTurn = 'ai';
      this.ui.setTurn('ai');
      this.ui.setAmmoButtonsEnabled(false);
      this.audio.playTurnSound();
      setTimeout(() => this.aiTakeTurn(), 1000);
    } else {
      this.currentTurn = 'player';
      this.ui.setTurn('player');
      this.ui.setAmmoButtonsEnabled(true);
      this.audio.playTurnSound();
      this.updateUI();
    }
  }

  private aiTakeTurn(): void {
    if (this.gameOver) return;

    const availableType = (Object.keys(this.aiAmmo) as ProjectileType[])
      .find((t) => this.aiAmmo[t] > 0);

    if (!availableType) {
      this.endTurn();
      return;
    }

    let targetBlock: Block | null = null;
    let maxY = Infinity;
    for (const block of this.playerBlocks) {
      if (block.body.position.y < maxY) {
        maxY = block.body.position.y;
        targetBlock = block;
      }
    }

    if (!targetBlock) {
      this.endTurn();
      return;
    }

    const targetX = targetBlock.body.position.x - 10;
    const targetY = targetBlock.body.position.y;

    const startX = this.width - 80;
    const startY = this.height - 100;

    const projectile = new Projectile(availableType, startX, startY);
    this.physics.addBody(projectile.body);
    this.projectiles.push(projectile);
    this.enforceObjectLimit();

    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const power = Math.min(25, dist * 0.05 + 8);
    const angle = Math.atan2(dy, dx);
    const angleVariance = (Math.random() - 0.5) * 0.15;
    const finalAngle = angle + angleVariance - 0.2;

    const vx = Math.cos(finalAngle) * power;
    const vy = Math.sin(finalAngle) * power;

    projectile.launch({ x: vx, y: vy });
    this.audio.playLaunchSound(projectile.type);

    this.aiAmmo[availableType]--;
    this.turnInProgress = true;
    this.waitingForSettle = true;
    this.settleTimer = 4000;

    this.updateUI();
  }

  private checkGameOver(): boolean {
    const playerAmmoTotal = Object.values(this.playerAmmo).reduce((a, b) => a + b, 0);
    const aiAmmoTotal = Object.values(this.aiAmmo).reduce((a, b) => a + b, 0);

    if (this.aiBlocks.length === 0) {
      this.finishGame(true);
      return true;
    }
    if (this.playerBlocks.length === 0) {
      this.finishGame(false);
      return true;
    }
    if (playerAmmoTotal === 0 && aiAmmoTotal === 0 && !this.turnInProgress) {
      this.finishGame(this.playerScore >= this.aiScore);
      return true;
    }

    return false;
  }

  private finishGame(playerWon: boolean): void {
    this.gameOver = true;

    const playerAmmoTotal = Object.values(this.playerAmmo).reduce((a, b) => a + b, 0);
    const aiAmmoTotal = Object.values(this.aiAmmo).reduce((a, b) => a + b, 0);

    this.playerScore += playerAmmoTotal * 5;
    this.aiScore += aiAmmoTotal * 5;

    this.updateUI();
    this.ui.showGameOver(playerWon, this.playerScore, this.aiScore);
  }

  private restart(): void {
    this.initGame();
  }

  private updateUI(): void {
    this.ui.updateScore(this.playerScore, this.aiScore);

    const playerAmmoTotal = Object.values(this.playerAmmo).reduce((a, b) => a + b, 0);
    const aiAmmoTotal = Object.values(this.aiAmmo).reduce((a, b) => a + b, 0);

    this.ui.updateAmmo(playerAmmoTotal, aiAmmoTotal);
    this.ui.updateAmmoCounts(this.playerAmmo);
  }

  private renderLoop(): void {
    const render = () => {
      this.render();
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  private render(): void {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.width, this.height);

    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    skyGrad.addColorStop(0, '#87ceeb');
    skyGrad.addColorStop(0.6, '#b0dceb');
    skyGrad.addColorStop(1, '#d4e8c4');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    for (const mountain of this.mountains) {
      mountain.render(ctx, this.height - 50);
    }

    for (const cloud of this.clouds) {
      cloud.render(ctx);
    }

    this.terrain.render(ctx, this.width, this.height);

    for (const block of this.playerBlocks) {
      block.render(ctx);
    }
    for (const block of this.aiBlocks) {
      block.render(ctx);
    }

    for (const frag of this.fragments) {
      frag.render(ctx);
    }

    this.drawSlingshot(ctx);

    for (const proj of this.projectiles) {
      proj.render(ctx);
    }

    this.ui.renderOverlay(ctx);

    if (this.isDragging && this.currentProjectile && this.dragCurrent) {
      this.drawSlingshotBand(ctx);
    }
  }

  private drawSlingshot(ctx: CanvasRenderingContext2D): void {
    const anchor = this.slingshotAnchor;

    ctx.strokeStyle = '#5d3a1a';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(anchor.x - 18, anchor.y + 50);
    ctx.lineTo(anchor.x - 18, anchor.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(anchor.x + 18, anchor.y + 50);
    ctx.lineTo(anchor.x + 18, anchor.y);
    ctx.stroke();

    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(anchor.x, anchor.y + 60);
    ctx.lineTo(anchor.x, anchor.y + 10);
    ctx.stroke();

    const aiAnchorX = this.width - 80;
    const aiAnchorY = this.height - 100;

    ctx.strokeStyle = '#5d3a1a';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(aiAnchorX - 18, aiAnchorY + 50);
    ctx.lineTo(aiAnchorX - 18, aiAnchorY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(aiAnchorX + 18, aiAnchorY + 50);
    ctx.lineTo(aiAnchorX + 18, aiAnchorY);
    ctx.stroke();

    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(aiAnchorX, aiAnchorY + 60);
    ctx.lineTo(aiAnchorX, aiAnchorY + 10);
    ctx.stroke();
  }

  private drawSlingshotBand(ctx: CanvasRenderingContext2D): void {
    if (!this.currentProjectile) return;

    const anchor = this.slingshotAnchor;
    const projPos = this.currentProjectile.body.position;

    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(anchor.x - 18, anchor.y);
    ctx.lineTo(projPos.x, projPos.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(anchor.x + 18, anchor.y);
    ctx.lineTo(projPos.x, projPos.y);
    ctx.stroke();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
