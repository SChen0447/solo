export type Side = 'red' | 'blue';
export type DamageLevel = 'none' | 'light' | 'medium' | 'heavy';

export interface ShipState {
  id: number;
  side: Side;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  ammo: number;
  maxAmmo: number;
  ammoTimer: number;
  consecutiveHits: number;
  isBurning: boolean;
  burnTimer: number;
  burnDamageTimer: number;
  damageLevel: DamageLevel;
  rippleTimer: number;
  rippleRadius: number;
}

export class Ship {
  state: ShipState;

  constructor(id: number, side: Side, x: number, y: number, name: string) {
    this.state = {
      id,
      side,
      name,
      x,
      y,
      width: 120,
      height: 50,
      hp: 100,
      maxHp: 100,
      ammo: 10,
      maxAmmo: 10,
      ammoTimer: 0,
      consecutiveHits: 0,
      isBurning: false,
      burnTimer: 0,
      burnDamageTimer: 0,
      damageLevel: 'none',
      rippleTimer: 0,
      rippleRadius: 0,
    };
  }

  update(deltaTime: number, canvasWidth: number, canvasHeight: number): void {
    const s = this.state;

    s.ammoTimer += deltaTime;
    if (s.ammoTimer >= 5000 && s.ammo < s.maxAmmo) {
      s.ammo++;
      s.ammoTimer = 0;
    }

    if (s.isBurning) {
      s.burnTimer -= deltaTime;
      s.burnDamageTimer += deltaTime;
      if (s.burnDamageTimer >= 1000) {
        s.hp = Math.max(0, s.hp - 2);
        s.burnDamageTimer = 0;
        this.updateDamageLevel();
      }
      if (s.burnTimer <= 0) {
        s.isBurning = false;
        s.consecutiveHits = 0;
      }
    }

    if (s.rippleTimer > 0) {
      s.rippleTimer -= deltaTime;
      s.rippleRadius = (1 - s.rippleTimer / 500) * 40;
    }
  }

  takeDamage(amount: number): void {
    const s = this.state;
    s.hp = Math.max(0, s.hp - amount);
    s.consecutiveHits++;
    if (s.consecutiveHits >= 3) {
      s.isBurning = true;
      s.burnTimer = 5000;
      s.burnDamageTimer = 0;
    } else if (s.isBurning) {
      s.burnTimer = 5000;
    }
    this.updateDamageLevel();
  }

  updateDamageLevel(): void {
    const ratio = this.state.hp / this.state.maxHp;
    if (ratio > 0.66) {
      this.state.damageLevel = 'light';
    } else if (ratio > 0.33) {
      this.state.damageLevel = 'medium';
    } else {
      this.state.damageLevel = 'heavy';
    }
  }

  triggerRipple(): void {
    this.state.rippleTimer = 500;
    this.state.rippleRadius = 0;
  }

  move(dx: number, minX: number, maxX: number): void {
    const newX = this.state.x + dx;
    const halfW = this.state.width / 2;
    if (newX - halfW >= minX && newX + halfW <= maxX) {
      this.state.x = newX;
      this.triggerRipple();
    }
  }

  canFire(): boolean {
    return this.state.ammo > 0 && this.state.hp > 0;
  }

  fire(): void {
    if (this.canFire()) {
      this.state.ammo--;
    }
  }

  containsPoint(px: number, py: number): boolean {
    const s = this.state;
    return (
      px >= s.x - s.width / 2 &&
      px <= s.x + s.width / 2 &&
      py >= s.y - s.height / 2 &&
      py <= s.y + s.height / 2
    );
  }

  getBarrelTip(): { x: number; y: number } {
    const s = this.state;
    return {
      x: s.side === 'red' ? s.x + s.width / 2 - 5 : s.x - s.width / 2 + 5,
      y: s.y - s.height / 2 + 5,
    };
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.drawRipple(ctx);
    this.drawHull(ctx);
    this.drawSuperstructure(ctx);
    this.drawDamageOverlay(ctx);
    if (this.state.isBurning) {
      this.drawFire(ctx);
    }
    this.drawHealthBar(ctx);
  }

  drawHull(ctx: CanvasRenderingContext2D): void {
    const s = this.state;
    const grad = ctx.createLinearGradient(
      s.x - s.width / 2, s.y,
      s.x + s.width / 2, s.y
    );
    if (s.side === 'red') {
      grad.addColorStop(0, '#8B0000');
      grad.addColorStop(1, '#DC143C');
    } else {
      grad.addColorStop(0, '#00008B');
      grad.addColorStop(1, '#4169E1');
    }

    ctx.save();
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s.x - s.width / 2, s.y + s.height / 4);
    ctx.lineTo(s.x - s.width / 2 + 10, s.y + s.height / 2);
    ctx.lineTo(s.x + s.width / 2 - 10, s.y + s.height / 2);
    ctx.lineTo(s.x + s.width / 2, s.y + s.height / 4);
    ctx.lineTo(s.x + s.width / 2, s.y - s.height / 4);
    ctx.lineTo(s.x - s.width / 2, s.y - s.height / 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawSuperstructure(ctx: CanvasRenderingContext2D): void {
    const s = this.state;
    const topW = s.width * 0.4;
    const topH = s.height * 0.5;

    ctx.save();
    ctx.fillStyle = s.side === 'red' ? '#B22222' : '#1E3A8A';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(s.x - topW / 2, s.y - s.height / 4);
    ctx.lineTo(s.x - topW / 2 + 8, s.y - s.height / 4 - topH);
    ctx.lineTo(s.x + topW / 2 - 8, s.y - s.height / 4 - topH);
    ctx.lineTo(s.x + topW / 2, s.y - s.height / 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const barrelX = s.side === 'red' ? s.x + s.width / 2 - 15 : s.x - s.width / 2 + 15;
    const barrelY = s.y - s.height / 4 - topH / 2;
    const barrelLen = 30;
    ctx.fillStyle = '#333';
    ctx.fillRect(
      s.side === 'red' ? barrelX : barrelX - barrelLen,
      barrelY - 3,
      barrelLen,
      6
    );
    ctx.restore();
  }

  drawDamageOverlay(ctx: CanvasRenderingContext2D): void {
    const s = this.state;
    if (s.damageLevel === 'none') return;
    let alpha = 0;
    if (s.damageLevel === 'light') alpha = 0.15;
    else if (s.damageLevel === 'medium') alpha = 0.3;
    else if (s.damageLevel === 'heavy') alpha = 0.5;

    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fillRect(
      s.x - s.width / 2,
      s.y - s.height / 2,
      s.width,
      s.height
    );
    ctx.restore();
  }

  drawFire(ctx: CanvasRenderingContext2D): void {
    const s = this.state;
    const baseX = s.x;
    const baseY = s.y - s.height / 4 - s.height * 0.5;
    const time = Date.now() / 1000;

    const layers = [
      { color: 'rgba(255, 100, 0, 0.6)', freq: 3, scale: 1.0 },
      { color: 'rgba(255, 140, 0, 0.5)', freq: 5, scale: 0.8 },
      { color: 'rgba(255, 180, 0, 0.4)', freq: 7, scale: 0.6 },
      { color: 'rgba(255, 220, 50, 0.3)', freq: 9, scale: 0.4 },
    ];

    ctx.save();
    for (const layer of layers) {
      const shakeX = Math.sin(time * layer.freq) * 4 * layer.scale;
      const shakeY = Math.cos(time * layer.freq * 1.3) * 3 * layer.scale;
      const h = 30 * layer.scale;
      const w = 18 * layer.scale;

      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.moveTo(baseX - w / 2 + shakeX, baseY + shakeY);
      ctx.quadraticCurveTo(
        baseX - w / 2 + shakeX, baseY - h / 2 + shakeY,
        baseX + shakeX, baseY - h + shakeY
      );
      ctx.quadraticCurveTo(
        baseX + w / 2 + shakeX, baseY - h / 2 + shakeY,
        baseX + w / 2 + shakeX, baseY + shakeY
      );
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  drawHealthBar(ctx: CanvasRenderingContext2D): void {
    const s = this.state;
    const barW = s.width;
    const barH = 6;
    const barX = s.x - barW / 2;
    const barY = s.y - s.height / 2 - 16;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

    const ratio = s.hp / s.maxHp;
    const grad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    if (ratio > 0.5) {
      grad.addColorStop(0, '#00FF00');
      grad.addColorStop(1, '#7CFC00');
    } else if (ratio > 0.25) {
      grad.addColorStop(0, '#FFD700');
      grad.addColorStop(1, '#FFA500');
    } else {
      grad.addColorStop(0, '#FF4500');
      grad.addColorStop(1, '#DC143C');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, barW * ratio, barH);
    ctx.restore();
  }

  drawRipple(ctx: CanvasRenderingContext2D): void {
    const s = this.state;
    if (s.rippleTimer <= 0) return;
    const alpha = (s.rippleTimer / 500) * 0.8;

    ctx.save();
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y + s.height / 2, s.rippleRadius, 0, Math.PI * 2);
    ctx.stroke();

    if (s.rippleRadius > 15) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
      ctx.arc(s.x, s.y + s.height / 2, s.rippleRadius - 15, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export class Fleet {
  ships: Ship[] = [];
  side: Side;

  constructor(side: Side, canvasWidth: number, canvasHeight: number) {
    this.side = side;
    this.createShips(canvasWidth, canvasHeight);
  }

  createShips(canvasWidth: number, canvasHeight: number): void {
    const startX = this.side === 'red' ? canvasWidth * 0.2 : canvasWidth * 0.8;
    const spacing = 100;
    const baseY = canvasHeight * 0.65;
    const names = this.side === 'red'
      ? ['赤龙号', '烈焰号', '朱雀号']
      : ['蓝鲨号', '碧波号', '玄武号'];

    for (let i = 0; i < 3; i++) {
      const offsetY = (i - 1) * spacing;
      this.ships.push(new Ship(i, this.side, startX, baseY + offsetY, names[i]));
    }
  }

  update(deltaTime: number, canvasWidth: number, canvasHeight: number): void {
    for (const ship of this.ships) {
      ship.update(deltaTime, canvasWidth, canvasHeight);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const ship of this.ships) {
      ship.render(ctx);
    }
  }

  findShipAt(x: number, y: number): Ship | null {
    for (const ship of this.ships) {
      if (ship.state.hp > 0 && ship.containsPoint(x, y)) {
        return ship;
      }
    }
    return null;
  }

  isDefeated(): boolean {
    return this.ships.every(s => s.state.hp <= 0);
  }

  reset(canvasWidth: number, canvasHeight: number): void {
    this.ships = [];
    this.createShips(canvasWidth, canvasHeight);
  }
}
