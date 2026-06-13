import { ParticleManager } from './ParticleManager';

export interface UnitData {
  id: number;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  attack: number;
  speed: number;
  side: 'player' | 'enemy';
  state: 'idle' | 'moving' | 'attacking' | 'dying';
  targetX: number;
  targetY: number;
  targetUnit: UnitData | null;
  lastAttackTime: number;
  selected: boolean;
  dyingTimer: number;
}

export interface AttackTrail {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
  life: number;
  maxLife: number;
}

let nextId = 0;

export class UnitManager {
  units: UnitData[] = [];
  trails: AttackTrail[] = [];
  private particleManager: ParticleManager;

  constructor(particleManager: ParticleManager) {
    this.particleManager = particleManager;
  }

  spawn(x: number, y: number, side: 'player' | 'enemy', hp: number, attack: number): UnitData | null {
    const playerCount = this.units.filter(u => u.side === 'player' && u.state !== 'dying').length;
    const enemyCount = this.units.filter(u => u.side === 'enemy' && u.state !== 'dying').length;
    if (side === 'player' && playerCount >= 15) return null;
    if (side === 'enemy' && enemyCount >= 15) return null;

    const strokeRatio = Math.min(1, Math.max(0, (hp - 50) / 100));
    const radius = 8 + strokeRatio * 12;

    const unit: UnitData = {
      id: nextId++,
      x,
      y,
      radius,
      hp,
      maxHp: hp,
      attack,
      speed: 150,
      side,
      state: 'idle',
      targetX: x,
      targetY: y,
      targetUnit: null,
      lastAttackTime: 0,
      selected: false,
      dyingTimer: 0,
    };
    this.units.push(unit);
    this.particleManager.spawnSplash(x, y, 3);
    return unit;
  }

  update(dt: number, now: number): void {
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];

      if (u.state === 'dying') {
        u.dyingTimer -= dt;
        if (u.dyingTimer <= 0) {
          this.units.splice(i, 1);
        }
        continue;
      }

      if (u.state === 'moving' || u.state === 'attacking') {
        const nearestEnemy = this.findNearestEnemy(u);
        if (nearestEnemy) {
          const dx = nearestEnemy.x - u.x;
          const dy = nearestEnemy.y - u.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist <= u.radius + nearestEnemy.radius + 5) {
            u.state = 'attacking';
            u.targetUnit = nearestEnemy;
            if (now - u.lastAttackTime >= 1) {
              u.lastAttackTime = now;
              nearestEnemy.hp -= u.attack;
              this.trails.push({
                x1: u.x,
                y1: u.y,
                x2: nearestEnemy.x,
                y2: nearestEnemy.y,
                alpha: 0.6,
                life: 0.3,
                maxLife: 0.3,
              });
              this.particleManager.spawnHit(u.x, u.y, nearestEnemy.x, nearestEnemy.y);

              if (nearestEnemy.hp <= 0) {
                this.killUnit(nearestEnemy);
                u.state = 'idle';
                u.targetUnit = null;
              }
            }
          } else {
            u.state = 'moving';
            u.targetUnit = null;
            const nx = dx / dist;
            const ny = dy / dist;
            u.x += nx * u.speed * dt;
            u.y += ny * u.speed * dt;
          }
        } else {
          const dx = u.targetX - u.x;
          const dy = u.targetY - u.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 5) {
            u.state = 'idle';
            u.x = u.targetX;
            u.y = u.targetY;
          } else {
            const nx = dx / dist;
            const ny = dy / dist;
            u.x += nx * u.speed * dt;
            u.y += ny * u.speed * dt;
          }
        }
      }
    }

    for (let i = this.trails.length - 1; i >= 0; i--) {
      const t = this.trails[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.trails.splice(i, 1);
        continue;
      }
      t.alpha = 0.6 * (t.life / t.maxLife);
    }
  }

  private findNearestEnemy(u: UnitData): UnitData | null {
    let nearest: UnitData | null = null;
    let minDist = Infinity;
    for (const other of this.units) {
      if (other.side === u.side || other.state === 'dying') continue;
      const dx = other.x - u.x;
      const dy = other.y - u.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        nearest = other;
      }
    }
    return nearest;
  }

  killUnit(u: UnitData): void {
    if (u.state === 'dying') return;
    u.state = 'dying';
    u.dyingTimer = 0.8;
    u.selected = false;
    this.particleManager.spawnDissolve(u.x, u.y);
  }

  getUnitAt(x: number, y: number, side?: 'player' | 'enemy'): UnitData | null {
    for (const u of this.units) {
      if (u.state === 'dying') continue;
      if (side && u.side !== side) continue;
      const dx = x - u.x;
      const dy = y - u.y;
      if (dx * dx + dy * dy <= (u.radius + 5) * (u.radius + 5)) {
        return u;
      }
    }
    return null;
  }

  getUnitsInRect(x1: number, y1: number, x2: number, y2: number, side: 'player' | 'enemy'): UnitData[] {
    const left = Math.min(x1, x2);
    const right = Math.max(x1, x2);
    const top = Math.min(y1, y2);
    const bottom = Math.max(y1, y2);
    return this.units.filter(u => {
      if (u.state === 'dying' || u.side !== side) return false;
      return u.x >= left && u.x <= right && u.y >= top && u.y <= bottom;
    });
  }

  getPlayerCount(): number {
    return this.units.filter(u => u.side === 'player' && u.state !== 'dying').length;
  }

  getEnemyCount(): number {
    return this.units.filter(u => u.side === 'enemy' && u.state !== 'dying').length;
  }

  drawUnits(ctx: CanvasRenderingContext2D, now: number): void {
    for (const u of this.units) {
      if (u.state === 'dying') continue;
      ctx.save();

      if (u.side === 'player') {
        const gradient = ctx.createRadialGradient(u.x, u.y, 0, u.x, u.y, u.radius * 1.5);
        gradient.addColorStop(0, 'rgba(30, 30, 30, 0.7)');
        gradient.addColorStop(0.5, 'rgba(44, 44, 44, 0.5)');
        gradient.addColorStop(1, 'rgba(44, 44, 44, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(u.x, u.y, u.radius * 1.5, 0, Math.PI * 2);
        ctx.fill();

        const innerGrad = ctx.createRadialGradient(u.x, u.y, 0, u.x, u.y, u.radius);
        innerGrad.addColorStop(0, 'rgba(20, 20, 20, 0.85)');
        innerGrad.addColorStop(0.7, 'rgba(40, 40, 40, 0.7)');
        innerGrad.addColorStop(1, 'rgba(50, 50, 50, 0.5)');
        ctx.fillStyle = innerGrad;
        ctx.beginPath();
        ctx.arc(u.x, u.y, u.radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const gradient = ctx.createRadialGradient(u.x, u.y, 0, u.x, u.y, u.radius);
        gradient.addColorStop(0, 'rgba(80, 80, 80, 0.9)');
        gradient.addColorStop(0.5, 'rgba(60, 60, 60, 0.7)');
        gradient.addColorStop(0.8, 'rgba(50, 50, 50, 0.5)');
        gradient.addColorStop(1, 'rgba(40, 40, 40, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(u.x, u.y, u.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(u.x, u.y, u.radius * 0.6, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(30, 30, 30, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(u.x, u.y, u.radius * 0.3, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(20, 20, 20, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (u.selected) {
        const pulsePhase = (now % 1.5) / 1.5;
        const pulseScale = 1 + 0.1 * Math.sin(pulsePhase * Math.PI * 2);
        const haloRadius = u.radius * 1.3 * pulseScale;
        ctx.beginPath();
        ctx.arc(u.x, u.y, haloRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(196, 163, 90, ${0.4 + 0.2 * Math.sin(pulsePhase * Math.PI * 2)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (u.hp < u.maxHp) {
        const barWidth = u.radius * 2;
        const barHeight = 3;
        const barX = u.x - barWidth / 2;
        const barY = u.y - u.radius - 8;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        const hpRatio = u.hp / u.maxHp;
        ctx.fillStyle = u.side === 'player' ? 'rgba(44, 44, 44, 0.6)' : 'rgba(100, 40, 40, 0.6)';
        ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
      }

      ctx.restore();
    }
  }

  drawTrails(ctx: CanvasRenderingContext2D): void {
    for (const t of this.trails) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(t.x1, t.y1);
      ctx.lineTo(t.x2, t.y2);
      ctx.strokeStyle = `rgba(44, 44, 44, ${t.alpha})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
  }
}
