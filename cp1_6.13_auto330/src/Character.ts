export enum Command {
  NONE = 'NONE',
  ATTACK = 'ATTACK',
  DEFEND = 'DEFEND',
  CHARGE = 'CHARGE',
  DODGE = 'DODGE',
}

export class Character {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  color: string;
  name: string;
  hp: number;
  maxHp: number;
  chargeCount: number;
  command: Command;
  facingRight: boolean;
  breathPhase: number;
  shieldTimer: number;
  isDefending: boolean;
  isDead: boolean;
  dodgeFromX: number;
  dodgeFromY: number;
  dodgeTimer: number;
  attackTimer: number;
  hitFlashTimer: number;

  constructor(x: number, y: number, color: string, name: string, facingRight: boolean) {
    this.x = x;
    this.y = y;
    this.baseX = x;
    this.baseY = y;
    this.color = color;
    this.name = name;
    this.hp = 100;
    this.maxHp = 100;
    this.chargeCount = 0;
    this.command = Command.NONE;
    this.facingRight = facingRight;
    this.breathPhase = 0;
    this.shieldTimer = 0;
    this.isDefending = false;
    this.isDead = false;
    this.dodgeFromX = x;
    this.dodgeFromY = y;
    this.dodgeTimer = 0;
    this.attackTimer = 0;
    this.hitFlashTimer = 0;
  }

  reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.baseX = x;
    this.baseY = y;
    this.hp = 100;
    this.chargeCount = 0;
    this.command = Command.NONE;
    this.isDefending = false;
    this.isDead = false;
    this.shieldTimer = 0;
    this.dodgeTimer = 0;
    this.attackTimer = 0;
    this.hitFlashTimer = 0;
    this.breathPhase = 0;
  }

  update(dt: number): void {
    this.breathPhase += dt * (Math.PI * 2 / 1.2);
    if (this.shieldTimer > 0) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) {
        this.shieldTimer = 0;
        this.isDefending = false;
      }
    }
    if (this.dodgeTimer > 0) {
      this.dodgeTimer -= dt;
      if (this.dodgeTimer <= 0) this.dodgeTimer = 0;
    }
    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) this.attackTimer = 0;
    }
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
      if (this.hitFlashTimer <= 0) this.hitFlashTimer = 0;
    }
  }

  getBreathOffset(): number {
    return Math.sin(this.breathPhase) * 4;
  }

  getBodySegments(): number[][] {
    const breath = this.getBreathOffset();
    const dir = this.facingRight ? 1 : -1;
    const segments: number[][] = [];

    const headX = 0;
    const headY = -24 + breath;

    segments.push([headX, headY - 6, headX - 6 * dir, headY + 4]);
    segments.push([headX, headY - 6, headX + 6 * dir, headY + 4]);
    segments.push([headX - 6 * dir, headY + 4, headX, headY + 10]);
    segments.push([headX + 6 * dir, headY + 4, headX, headY + 10]);

    const neckY = headY + 10;
    const shoulderY = neckY + 6;
    segments.push([headX, neckY, headX, shoulderY]);

    const armExtend = 10;
    segments.push([headX, shoulderY, headX - armExtend * dir, shoulderY + 8]);
    segments.push([headX, shoulderY, headX + armExtend * dir * 0.6, shoulderY + 8]);

    const waistY = shoulderY + 14;
    segments.push([headX, shoulderY, headX, waistY]);

    segments.push([headX, waistY, headX - 8 * dir, waistY + 12]);
    segments.push([headX, waistY, headX + 8 * dir, waistY + 12]);

    return segments;
  }

  draw(ctx: CanvasRenderingContext2D, _time: number): void {
    if (this.isDead) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    const flash = this.hitFlashTimer > 0 && Math.sin(this.hitFlashTimer * 40) > 0;
    const drawColor = flash ? '#ffffff' : this.color;

    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;

    const segments = this.getBodySegments();
    for (const seg of segments) {
      ctx.beginPath();
      ctx.moveTo(seg[0], seg[1]);
      ctx.lineTo(seg[2], seg[3]);
      ctx.stroke();
    }

    const breath = this.getBreathOffset();
    ctx.fillStyle = drawColor;
    ctx.beginPath();
    ctx.arc(0, -24 + breath - 6, 6, 0, Math.PI * 2);
    ctx.fill();

    if (this.isDefending && this.shieldTimer > 0) {
      const shieldAlpha = Math.min(1, this.shieldTimer / 0.5);
      ctx.globalAlpha = 0.4 * shieldAlpha;
      ctx.strokeStyle = '#48dbfb';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#48dbfb';
      ctx.shadowBlur = 15;
      const shieldDir = this.facingRight ? 1 : -1;
      ctx.beginPath();
      ctx.ellipse(16 * shieldDir, -10, 18, 28, 0, -Math.PI / 2, Math.PI / 2, !this.facingRight);
      ctx.stroke();
      ctx.globalAlpha = 0.15 * shieldAlpha;
      ctx.fillStyle = '#48dbfb';
      ctx.fill();
    }

    if (this.chargeCount > 0) {
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 12;
      const auraPhase = _time * 2;
      for (let i = 0; i < this.chargeCount; i++) {
        ctx.beginPath();
        ctx.arc(0, breath / 2, 22 + i * 6, auraPhase + i * 0.8, auraPhase + i * 0.8 + Math.PI * 1.5);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  drawHealthBar(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const barWidth = 200;
    const barHeight = 16;
    const particleCount = 40;
    const particleW = barWidth / particleCount;

    const hpRatio = this.hp / this.maxHp;
    const filledCount = Math.floor(hpRatio * particleCount);
    const isLowHp = this.hp / this.maxHp < 0.3;

    for (let i = 0; i < particleCount; i++) {
      const px = x + i * particleW;
      const brightness = 0.3 + 0.7 * (i / particleCount);

      if (i < filledCount) {
        let color: string;
        if (isLowHp) {
          const flashVal = Math.sin(performance.now() / 1000 * Math.PI * 8);
          const r = 255;
          const g = Math.floor(50 + flashVal * 30);
          const b = Math.floor(50 + flashVal * 20);
          color = `rgba(${r},${g},${b},${brightness})`;
        } else {
          color = this.color;
        }
        ctx.fillStyle = color;
        ctx.globalAlpha = brightness;
        ctx.shadowColor = color;
        ctx.shadowBlur = 4;
        ctx.fillRect(px, y, particleW - 1, barHeight);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.globalAlpha = 0.3;
        ctx.shadowBlur = 0;
        ctx.fillRect(px, y, particleW - 1, barHeight);
      }
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Georgia';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.8;
    ctx.fillText(`${this.name}  ${this.hp}/${this.maxHp}`, x + barWidth / 2, y + barHeight + 14);
    ctx.globalAlpha = 1;
  }
}
