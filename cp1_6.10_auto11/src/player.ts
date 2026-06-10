import { InputManager } from './input';
import { Guard } from './guard';
import { LightingSystem } from './lighting';
import { AudioManager } from './audio';

export interface Stone {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  landed: boolean;
  landTimer: number;
}

export interface Chest {
  x: number;
  y: number;
  opened: boolean;
  opening: boolean;
  openProgress: number;
  hasTrap: boolean;
  swayProgress: number;
  coins: number;
}

export class Player {
  x: number;
  y: number;
  width: number = 24;
  height: number = 38;
  vx: number = 0;
  vy: number = 0;
  speed: number = 140;
  facing: number = 1;

  lives: number = 3;
  coins: number = 0;

  inShadow: boolean = false;
  exposedTime: number = 0;

  stones: Stone[] = [];
  chests: Chest[] = [];
  activeChest: Chest | null = null;

  stepTimer: number = 0;
  invincible: number = 0;
  hurtFlash: number = 0;

  roomBounds: { minX: number; maxX: number; minY: number; maxY: number };

  constructor(startX: number, startY: number, bounds: { minX: number; maxX: number; minY: number; maxY: number }) {
    this.x = startX;
    this.y = startY;
    this.roomBounds = bounds;
    this.initChests();
  }

  private initChests(): void {
    this.chests = [
      { x: 80, y: 440, opened: false, opening: false, openProgress: 0, hasTrap: Math.random() < 0.2, swayProgress: 0, coins: 50 },
      { x: 560, y: 440, opened: false, opening: false, openProgress: 0, hasTrap: Math.random() < 0.2, swayProgress: 0, coins: 75 },
      { x: 1200, y: 440, opened: false, opening: false, openProgress: 0, hasTrap: Math.random() < 0.2, swayProgress: 0, coins: 100 },
    ];
  }

  update(dt: number, input: InputManager, guards: Guard[], lighting: LightingSystem, audio: AudioManager): void {
    this.inShadow = lighting.isInShadow(this.x, this.y - this.height / 2);

    if (this.invincible > 0) this.invincible -= dt;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;

    let moveX = 0;
    let moveY = 0;
    if (input.isDown('arrowleft') || input.isDown('a')) moveX -= 1;
    if (input.isDown('arrowright') || input.isDown('d')) moveX += 1;
    if (input.isDown('arrowup') || input.isDown('w')) moveY -= 1;
    if (input.isDown('arrowdown') || input.isDown('s')) moveY += 1;

    if (moveX !== 0 && moveY !== 0) {
      const len = Math.sqrt(2);
      moveX /= len;
      moveY /= len;
    }

    const activeChest = this.activeChest;
    if (activeChest && activeChest.opening) {
      this.vx = 0;
      this.vy = 0;
      if (moveX !== 0) {
        activeChest.swayProgress += Math.abs(moveX) * dt * 3;
      }
    } else {
      this.vx = moveX * this.speed;
      this.vy = moveY * this.speed;

      if (moveX !== 0) {
        this.facing = moveX > 0 ? 1 : -1;
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.x = Math.max(this.roomBounds.minX + this.width / 2, Math.min(this.roomBounds.maxX - this.width / 2, this.x));
    this.y = Math.max(this.roomBounds.minY + this.height, Math.min(this.roomBounds.maxY, this.y));

    if ((this.vx !== 0 || this.vy !== 0) && !activeChest?.opening) {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        if (this.inShadow) audio.playStep();
        this.stepTimer = this.inShadow ? 0.5 : 0.35;
      }
    }

    if (input.wasPressed('q') && this.stones.length < 3) {
      this.throwStone(input, audio);
    }

    this.updateStones(dt, guards, audio);
    this.updateChests(dt, input, guards, audio);

    if (!this.inShadow) {
      this.exposedTime += dt;
    } else {
      this.exposedTime = 0;
    }

    this.checkGuardCollision(guards, audio);
  }

  private throwStone(input: InputManager, audio: AudioManager): void {
    const aim = input.getMouseAim(this.x, this.y);
    const dx = aim.dx;
    const angle = dx > 0 ? -Math.PI / 5 : Math.PI + Math.PI / 5;
    const speed = 350;

    this.stones.push({
      x: this.x,
      y: this.y - this.height / 2,
      vx: Math.cos(angle) * speed * (dx > 0 ? 1 : -1),
      vy: Math.sin(angle) * speed - 100,
      active: true,
      landed: false,
      landTimer: 0
    });

    audio.playStone();
  }

  private updateStones(dt: number, guards: Guard[], audio: AudioManager): void {
    const gravity = 500;

    for (const stone of this.stones) {
      if (!stone.active) continue;

      if (!stone.landed) {
        stone.vy += gravity * dt;
        stone.x += stone.vx * dt;
        stone.y += stone.vy * dt;

        if (stone.y >= this.roomBounds.maxY - 5) {
          stone.y = this.roomBounds.maxY - 5;
          stone.landed = true;
          stone.landTimer = 0.5;

          for (const guard of guards) {
            const dx = stone.x - guard.x;
            const dy = stone.y - guard.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 350) {
              guard.goInvestigate(stone.x, stone.y);
            }
          }
        }

        if (stone.x < this.roomBounds.minX || stone.x > this.roomBounds.maxX) {
          stone.active = false;
        }
      } else {
        stone.landTimer -= dt;
        if (stone.landTimer <= 0) {
          stone.active = false;
        }
      }
    }

    this.stones = this.stones.filter(s => s.active);
  }

  private updateChests(dt: number, input: InputManager, guards: Guard[], audio: AudioManager): void {
    for (const chest of this.chests) {
      if (chest.opened) continue;

      const dx = this.x - chest.x;
      const dy = this.y - chest.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 45) {
        if (input.isDown('e')) {
          if (!chest.opening) {
            chest.opening = true;
            chest.openProgress = 0;
            chest.swayProgress = 0;
            this.activeChest = chest;
            audio.playChest();
          }

          chest.openProgress += dt;

          if (chest.openProgress >= 2) {
            chest.opened = true;
            chest.opening = false;
            this.coins += chest.coins;
            this.activeChest = null;

            if (chest.hasTrap && chest.swayProgress < 3) {
              this.takeDamage(audio);
            } else {
              audio.playCoin();
            }

            for (const guard of guards) {
              guard.triggerAlert();
            }
          }
        } else if (chest.opening && !chest.opened) {
          chest.opening = false;
          chest.openProgress = 0;
          chest.swayProgress = 0;
          this.activeChest = null;
        }
      } else if (chest.opening && !chest.opened) {
        chest.opening = false;
        chest.openProgress = 0;
        chest.swayProgress = 0;
        if (this.activeChest === chest) {
          this.activeChest = null;
        }
      }
    }
  }

  private takeDamage(audio: AudioManager): void {
    if (this.invincible > 0) return;
    this.lives--;
    this.invincible = 2;
    this.hurtFlash = 0.5;
    audio.playHit();
  }

  private checkGuardCollision(guards: Guard[], audio: AudioManager): void {
    if (this.invincible > 0) return;

    for (const guard of guards) {
      if (guard.state === 'chase' && guard.isCollidingWithPlayer(this.x, this.y, this.width, this.height)) {
        this.takeDamage(audio);
        audio.playAlarm();
        this.exposedTime = 0;
      }
    }
  }

  isCaught(): boolean {
    return this.exposedTime >= 3;
  }

  isDead(): boolean {
    return this.lives <= 0;
  }

  allChestsOpened(): boolean {
    return this.chests.every(c => c.opened);
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.renderChests(ctx);
    this.renderStones(ctx);
    this.renderPlayer(ctx);
  }

  private renderPlayer(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.facing, 1);

    const alpha = this.inShadow ? 0.5 : 1;
    ctx.globalAlpha = alpha;

    if (this.hurtFlash > 0 && Math.floor(this.hurtFlash * 10) % 2 === 0) {
      ctx.globalAlpha = 0.3;
    }

    const bodyColor = this.inShadow ? '#5A6A7A' : '#2A1A3A';
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-10, -36, 20, 26);

    ctx.fillStyle = this.inShadow ? '#4A5A6A' : '#1A2A1A';
    ctx.beginPath();
    ctx.arc(0, -40, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.inShadow ? '#6A7A8A' : '#3A2A4A';
    ctx.beginPath();
    ctx.moveTo(-12, -44);
    ctx.quadraticCurveTo(0, -56, 12, -44);
    ctx.lineTo(10, -38);
    ctx.lineTo(-10, -38);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFF';
    ctx.fillRect(2, -42, 5, 3);
    ctx.fillStyle = '#000';
    ctx.fillRect(4, -41, 2, 2);

    ctx.fillStyle = bodyColor;
    ctx.fillRect(-8, -10, 6, 10);
    ctx.fillRect(2, -10, 6, 10);

    ctx.fillStyle = '#1A1A1A';
    ctx.fillRect(-10, 0, 8, 3);
    ctx.fillRect(2, 0, 8, 3);

    ctx.restore();
  }

  private renderStones(ctx: CanvasRenderingContext2D): void {
    for (const stone of this.stones) {
      ctx.save();
      if (stone.landed) {
        const pulse = 1 - stone.landTimer / 0.5;
        ctx.strokeStyle = `rgba(255, 200, 100, ${0.6 * (1 - pulse)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(stone.x, stone.y, 8 + pulse * 30, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = stone.landed ? '#8A8A8A' : '#6A6A6A';
      ctx.beginPath();
      ctx.arc(stone.x, stone.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderChests(ctx: CanvasRenderingContext2D): void {
    for (const chest of this.chests) {
      ctx.save();
      ctx.translate(chest.x, chest.y);

      ctx.fillStyle = '#3A2A1A';
      ctx.fillRect(-25, -30, 50, 30);

      ctx.strokeStyle = '#C09030';
      ctx.lineWidth = 2;
      ctx.strokeRect(-25, -30, 50, 30);
      ctx.beginPath();
      ctx.moveTo(-25, -15);
      ctx.lineTo(25, -15);
      ctx.stroke();

      if (chest.opened) {
        ctx.fillStyle = '#1A1A1A';
        ctx.fillRect(-22, -28, 44, 12);
        ctx.fillStyle = '#FFD700';
        ctx.font = '12px serif';
        ctx.textAlign = 'center';
        ctx.fillText('✦', 0, -5);
      } else if (chest.opening) {
        const progress = chest.openProgress / 2;
        const lidAngle = -progress * Math.PI / 2;
        ctx.save();
        ctx.translate(0, -30);
        ctx.rotate(lidAngle);
        ctx.fillStyle = '#3A2A1A';
        ctx.fillRect(-25, -15, 50, 15);
        ctx.strokeStyle = '#C09030';
        ctx.strokeRect(-25, -15, 50, 15);
        ctx.restore();

        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(-40, -60, 80, 20);
        ctx.fillStyle = '#FFD080';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`开箱中 ${Math.floor(progress * 100)}%`, 0, -46);

        if (chest.hasTrap) {
          ctx.fillStyle = chest.swayProgress < 3 ? '#FF4444' : '#44FF44';
          ctx.font = '10px sans-serif';
          ctx.fillText(chest.swayProgress < 3 ? '⚠ 陷阱! 左右摇摆!' : '✓ 躲开了!', 0, -65);
        }
      } else {
        ctx.fillStyle = '#3A2A1A';
        ctx.fillRect(-25, -45, 50, 15);
        ctx.strokeStyle = '#C09030';
        ctx.strokeRect(-25, -45, 50, 15);

        ctx.fillStyle = '#C09030';
        ctx.fillRect(-4, -25, 8, 10);
        ctx.fillStyle = '#000';
        ctx.fillRect(-2, -22, 4, 4);

        const dx = this.x - chest.x;
        const dy = this.y - chest.y;
        if (Math.sqrt(dx * dx + dy * dy) < 55) {
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(-40, -70, 80, 18);
          ctx.fillStyle = '#FFD080';
          ctx.font = '11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('按住 E 开启', 0, -57);
        }
      }

      ctx.restore();
    }
  }
}
