import { ParticleSystem, Particle } from './ParticleSystem';
import { Stage, StageMetrics } from './Stage';

export type DancerAction = 'idle' | 'moving' | 'kicking' | 'spinning' | 'blinking' | 'ultimate';
export type AttackType = 'kick' | 'spin' | 'blink';

export interface DancerState {
  x: number;
  y: number;
  rotation: number;
  action: DancerAction;
  energyLevel: number;
  attackType: AttackType;
}

interface Keys {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  space: boolean;
}

interface AnimationState {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  actionTime: number;
  actionDuration: number;
  afterimageTimer: number;
}

export class Dancer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: ParticleSystem;
  private stage: Stage;
  private keys: Keys = { up: false, down: false, left: false, right: false, space: false };

  x = 0;
  y = 0;
  rotation = 0;
  action: DancerAction = 'idle';
  energyLevel = 0;
  attackType: AttackType = 'kick';

  private anim: AnimationState = {
    startX: 0, startY: 0, targetX: 0, targetY: 0,
    actionTime: 0, actionDuration: 0,
    afterimageTimer: 0
  };
  private lastAttackTime = -10;
  private attackCooldown = 0;
  private facingRight = true;

  private onBeatHit?: () => void;
  private onUltimate?: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    particles: ParticleSystem,
    stage: Stage
  ) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.particles = particles;
    this.stage = stage;
    this.resetPosition();
  }

  resetPosition(): void {
    const m = this.stage.getMetrics();
    this.x = m.centerX;
    this.y = m.centerY + 50;
  }

  setCallbacks(onBeatHit: () => void, onUltimate: () => void): void {
    this.onBeatHit = onBeatHit;
    this.onUltimate = onUltimate;
  }

  setupInput(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  teardownInput(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    if (['arrowup', 'w'].includes(key)) this.keys.up = true;
    if (['arrowdown', 's'].includes(key)) this.keys.down = true;
    if (['arrowleft', 'a'].includes(key)) this.keys.left = true;
    if (['arrowright', 'd'].includes(key)) this.keys.right = true;
    if (e.code === 'Space') {
      e.preventDefault();
      this.keys.space = true;
    }
    this.processInput();
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    if (['arrowup', 'w'].includes(key)) this.keys.up = false;
    if (['arrowdown', 's'].includes(key)) this.keys.down = false;
    if (['arrowleft', 'a'].includes(key)) this.keys.left = false;
    if (['arrowright', 'd'].includes(key)) this.keys.right = false;
    if (e.code === 'Space') this.keys.space = false;
  };

  private processInput(): void {
    if (this.action !== 'idle') return;
    if (this.attackCooldown > 0) return;

    if (this.keys.space && this.keys.up && this.energyLevel >= 8) {
      this.triggerUltimate();
      return;
    }

    if (this.keys.space) {
      this.triggerAttack();
      return;
    }

    if (this.keys.left || this.keys.right || this.keys.up || this.keys.down) {
      this.triggerMove();
    }
  }

  private triggerMove(): void {
    const distance = 40;
    let dx = 0, dy = 0;
    if (this.keys.left) dx -= distance;
    if (this.keys.right) dx += distance;
    if (this.keys.up) dy -= distance;
    if (this.keys.down) dy += distance;

    if (dx !== 0 || dy !== 0) {
      if (dx !== 0) this.facingRight = dx > 0;
      this.anim.startX = this.x;
      this.anim.startY = this.y;
      const target = this.stage.clampToStage(this.x + dx, this.y + dy);
      this.anim.targetX = target.x;
      this.anim.targetY = target.y;
      this.action = 'moving';
      this.anim.actionTime = 0;
      this.anim.actionDuration = 0.5;
    }
  }

  private triggerAttack(): void {
    const type = this.attackType;
    this.lastAttackTime = performance.now() / 1000;

    if (type === 'kick') {
      this.action = 'kicking';
      this.anim.actionTime = 0;
      this.anim.actionDuration = 0.4;
      const footX = this.x + (this.facingRight ? 50 : -50);
      const footY = this.y + 20;
      this.particles.spawnSparks(footX, footY, 12, '#ffaa00');
    } else if (type === 'spin') {
      this.action = 'spinning';
      this.anim.actionTime = 0;
      this.anim.actionDuration = 0.6;
      this.particles.spawnSparks(this.x, this.y, 20, '#66ccff');
    } else if (type === 'blink') {
      this.action = 'blinking';
      this.anim.actionTime = 0;
      this.anim.actionDuration = 0.3;
      this.anim.startX = this.x;
      this.anim.startY = this.y;
      const m = this.stage.getMetrics();
      const dx = m.centerX - this.x;
      const dy = m.centerY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const targetDist = 120;
      const target = this.stage.clampToStage(
        this.x + (dx / dist) * targetDist,
        this.y + (dy / dist) * targetDist
      );
      this.anim.targetX = target.x;
      this.anim.targetY = target.y;
      this.particles.spawnTrail(this.x, this.y, target.x, target.y);
      this.x = target.x;
      this.y = target.y;
    }

    this.attackType = type === 'kick' ? 'spin' : type === 'spin' ? 'blink' : 'kick';

    if (this.onBeatHit) this.onBeatHit();
  }

  private triggerUltimate(): void {
    if (this.onUltimate) this.onUltimate();
    this.action = 'ultimate';
    this.anim.actionTime = 0;
    this.anim.actionDuration = 1.2;
    this.energyLevel = 0;
  }

  update(deltaTime: number): void {
    this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime);

    if (this.action === 'idle') {
      this.processInput();
      return;
    }

    this.anim.actionTime += deltaTime;

    if (this.action === 'moving') {
      this.updateMoving();
    } else if (this.action === 'kicking') {
      this.updateKicking();
    } else if (this.action === 'spinning') {
      this.updateSpinning();
    } else if (this.action === 'blinking') {
      this.updateBlinking();
    } else if (this.action === 'ultimate') {
      this.updateUltimate();
    }
  }

  private updateMoving(): void {
    const t = Math.min(1, this.anim.actionTime / this.anim.actionDuration);
    const eased = 1 - Math.pow(1 - t, 3);
    this.x = this.anim.startX + (this.anim.targetX - this.anim.startX) * eased;
    this.y = this.anim.startY + (this.anim.targetY - this.anim.startY) * eased;

    this.anim.afterimageTimer += 1 / 60;
    if (this.anim.afterimageTimer >= 0.06) {
      this.anim.afterimageTimer = 0;
      this.particles.spawnAfterimage(this.x, this.y, this.rotation, 0.6);
    }

    if (t >= 1) {
      this.action = 'idle';
      this.attackCooldown = 0.05;
    }
  }

  private updateKicking(): void {
    if (this.anim.actionTime >= this.anim.actionDuration) {
      this.action = 'idle';
      this.attackCooldown = 0.1;
    }
  }

  private updateSpinning(): void {
    const t = this.anim.actionTime / this.anim.actionDuration;
    this.rotation = t * Math.PI * 2;
    if (t >= 1) {
      this.rotation = 0;
      this.action = 'idle';
      this.attackCooldown = 0.1;
    }
  }

  private updateBlinking(): void {
    if (this.anim.actionTime >= this.anim.actionDuration) {
      this.action = 'idle';
      this.attackCooldown = 0.15;
    }
  }

  private updateUltimate(): void {
    if (this.anim.actionTime >= this.anim.actionDuration) {
      this.action = 'idle';
      this.attackCooldown = 0.3;
    }
  }

  addEnergy(): void {
    this.energyLevel = Math.min(8, this.energyLevel + 1);
  }

  render(): void {
    this.renderSelf(this.x, this.y, this.rotation, 1);
  }

  renderAfterimage = (ctx: CanvasRenderingContext2D, p: Particle): void => {
    const alpha = (p.alpha || 0.6) * (p.life / p.maxLife);
    this.renderSelf(p.x, p.y, p.rotation || 0, alpha, true);
  };

  private renderSelf(
    x: number, y: number, rotation: number, alpha: number = 1, isGhost: boolean = false
  ): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(rotation);
    if (!this.facingRight) ctx.scale(-1, 1);

    const bodyColor = isGhost ? '#8888ff' : '#66ccff';
    const accentColor = isGhost ? '#ff66ff' : '#ff3366';
    const glow = !isGhost;

    if (glow) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = bodyColor;
    }

    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.fillStyle = accentColor;

    if (this.energyLevel > 0 && !isGhost) {
      const ringWidth = this.energyLevel * 8;
      const gradient = ctx.createRadialGradient(0, 0, 25, 0, 0, 35 + ringWidth);
      gradient.addColorStop(0, 'rgba(255, 255, 153, 0)');
      gradient.addColorStop(0.5, `rgba(255, 200, 0, ${0.4 * (this.energyLevel / 8)})`);
      gradient.addColorStop(1, 'rgba(255, 136, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, 35 + ringWidth, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = accentColor;
    }

    ctx.beginPath();
    ctx.arc(0, -25, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(0, 15);
    ctx.stroke();

    if (this.action === 'spinning') {
      ctx.strokeStyle = '#66ccff';
      ctx.shadowBlur = 25;
      ctx.shadowColor = '#66ccff';
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = bodyColor;
      ctx.shadowBlur = glow ? 15 : 0;
      ctx.shadowColor = bodyColor;
    }

    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(-20, 10);
    ctx.moveTo(0, -5);
    ctx.lineTo(20, 10);
    ctx.stroke();

    const legKickT = this.action === 'kicking'
      ? Math.sin((this.anim.actionTime / this.anim.actionDuration) * Math.PI
      : 0;

    if (this.action === 'kicking') {
      ctx.beginPath();
      ctx.moveTo(0, 15);
      ctx.lineTo(
        Math.cos(-0.3) * 20,
        15 + 20 * Math.sin(-0.3)
      );
      ctx.stroke();

      const kickAngle = -0.3 + legKickT * 1.3;
      ctx.beginPath();
      ctx.moveTo(0, 15);
      ctx.lineTo(
        25 * Math.cos(kickAngle),
        15 + 25 * Math.sin(kickAngle)
      );
      ctx.stroke();

      const footX = 30 * Math.cos(kickAngle);
      const footY = 15 + 30 * Math.sin(kickAngle);
      ctx.fillStyle = '#ffaa00';
      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(footX, footY, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, 15);
      ctx.lineTo(-10, 35);
      ctx.moveTo(0, 15);
      ctx.lineTo(10, 35);
      ctx.stroke();
    }

    ctx.fillStyle = accentColor;
    ctx.shadowBlur = glow ? 10 : 0;
    ctx.shadowColor = accentColor;
    ctx.beginPath();
    ctx.arc(-4, -27, 2, 0, Math.PI * 2);
    ctx.arc(4, -27, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  getAttackWindow(): number {
    if (this.action === 'kicking' || this.action === 'spinning' || this.action === 'blinking') {
      return this.anim.actionTime / this.anim.actionDuration;
    }
    return -1;
  }

  getState(): DancerState {
    return {
      x: this.x,
      y: this.y,
      rotation: this.rotation,
      action: this.action,
      energyLevel: this.energyLevel,
      attackType: this.attackType
    };
  }
}
