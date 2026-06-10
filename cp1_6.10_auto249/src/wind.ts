export interface LightTarget {
  x: number;
  y: number;
  radius: number;
  phase: number;
  active: boolean;
}

export interface WindParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface WindBand {
  particles: WindParticle[];
  centerX: number;
  centerY: number;
  dirX: number;
  dirY: number;
  strength: number;
  life: number;
  maxLife: number;
  active: boolean;
}

export interface DangerZone {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  phase: number;
  active: boolean;
}

const LIGHT_RADIUS = 15;
const DANGER_RADIUS = 30;
const WIND_BAND_LIFE = 180;
const DANGER_LIFE = 600;
const WIND_INFLUENCE_RADIUS = 30;

export class WindSystem {
  lightTargets: LightTarget[] = [];
  windBands: WindBand[] = [];
  dangerZones: DangerZone[] = [];
  lightTimer = 0;
  dangerTimer = 0;
  windTimer = 0;
  canvasWidth = 0;
  canvasHeight = 0;
  totalLightsSpawned = 0;

  constructor(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  spawnLightTarget(): void {
    const margin = 60;
    const x = margin + Math.random() * (this.canvasWidth - margin * 2);
    const y = margin + Math.random() * (this.canvasHeight - margin * 2);
    this.lightTargets.push({
      x, y,
      radius: LIGHT_RADIUS,
      phase: 0,
      active: true
    });
    this.totalLightsSpawned++;
  }

  spawnWindBand(): void {
    const edge = Math.floor(Math.random() * 4);
    let startX = 0, startY = 0, dirX = 0, dirY = 0;
    const speed = 2 + Math.random() * 1.5;

    switch (edge) {
      case 0:
        startX = Math.random() * this.canvasWidth;
        startY = -20;
        dirX = (Math.random() - 0.5) * 0.3;
        dirY = 1;
        break;
      case 1:
        startX = this.canvasWidth + 20;
        startY = Math.random() * this.canvasHeight;
        dirX = -1;
        dirY = (Math.random() - 0.5) * 0.3;
        break;
      case 2:
        startX = Math.random() * this.canvasWidth;
        startY = this.canvasHeight + 20;
        dirX = (Math.random() - 0.5) * 0.3;
        dirY = -1;
        break;
      default:
        startX = -20;
        startY = Math.random() * this.canvasHeight;
        dirX = 1;
        dirY = (Math.random() - 0.5) * 0.3;
    }

    const mag = Math.sqrt(dirX * dirX + dirY * dirY);
    dirX /= mag;
    dirY /= mag;

    const particleCount = 10 + Math.floor(Math.random() * 6);
    const particles: WindParticle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: startX - dirX * i * 8 + (Math.random() - 0.5) * 15,
        y: startY - dirY * i * 8 + (Math.random() - 0.5) * 15,
        vx: dirX * speed,
        vy: dirY * speed
      });
    }

    this.windBands.push({
      particles,
      centerX: startX,
      centerY: startY,
      dirX, dirY,
      strength: 0.5 + Math.random() * 1.0,
      life: WIND_BAND_LIFE,
      maxLife: WIND_BAND_LIFE,
      active: true
    });
  }

  spawnDangerZone(): void {
    const margin = 80;
    const x = margin + Math.random() * (this.canvasWidth - margin * 2);
    const y = margin + Math.random() * (this.canvasHeight - margin * 2);
    this.dangerZones.push({
      x, y,
      radius: DANGER_RADIUS,
      life: DANGER_LIFE,
      maxLife: DANGER_LIFE,
      phase: 0,
      active: true
    });
  }

  update(frame: number): void {
    this.lightTimer++;
    this.dangerTimer++;
    this.windTimer++;

    if (this.lightTimer >= 300) {
      this.spawnLightTarget();
      this.lightTimer = 0;
    }
    if (frame === 1) this.spawnLightTarget();

    if (this.dangerTimer >= 1800) {
      this.spawnDangerZone();
      this.dangerTimer = 0;
    }

    if (this.windTimer >= 180 + Math.random() * 120) {
      this.spawnWindBand();
      this.windTimer = 0;
    }

    for (const lt of this.lightTargets) {
      if (!lt.active) continue;
      lt.phase += 0.05;
    }

    for (const wb of this.windBands) {
      if (!wb.active) continue;
      wb.life--;
      let avgX = 0, avgY = 0;
      for (const p of wb.particles) {
        p.x += p.vx;
        p.y += p.vy;
        avgX += p.x;
        avgY += p.y;
      }
      wb.centerX = avgX / wb.particles.length;
      wb.centerY = avgY / wb.particles.length;
      if (wb.life <= 0) wb.active = false;
    }
    this.windBands = this.windBands.filter(w => w.active);

    for (const dz of this.dangerZones) {
      if (!dz.active) continue;
      dz.life--;
      dz.phase += 0.1;
      if (dz.life <= 0) dz.active = false;
    }
    this.dangerZones = this.dangerZones.filter(d => d.active);
  }

  getWindInfluence(x: number, y: number): { vx: number; vy: number } {
    let vx = 0, vy = 0;
    for (const wb of this.windBands) {
      if (!wb.active) continue;
      const dx = x - wb.centerX;
      const dy = y - wb.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < WIND_INFLUENCE_RADIUS) {
        const falloff = 1 - dist / WIND_INFLUENCE_RADIUS;
        vx += wb.dirX * wb.strength * falloff;
        vy += wb.dirY * wb.strength * falloff;
      }
    }
    return { vx, vy };
  }

  checkLightHit(x: number, y: number): LightTarget | null {
    for (const lt of this.lightTargets) {
      if (!lt.active) continue;
      const dx = x - lt.x;
      const dy = y - lt.y;
      if (Math.sqrt(dx * dx + dy * dy) < 20) {
        lt.active = false;
        return lt;
      }
    }
    return null;
  }

  checkDangerHit(x: number, y: number): DangerZone | null {
    for (const dz of this.dangerZones) {
      if (!dz.active) continue;
      const dx = x - dz.x;
      const dy = y - dz.y;
      if (Math.sqrt(dx * dx + dy * dy) < dz.radius) {
        dz.active = false;
        return dz;
      }
    }
    return null;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    for (const lt of this.lightTargets) {
      if (!lt.active) continue;
      const breath = 0.5 + (Math.sin(lt.phase) + 1) * 0.25;
      ctx.globalAlpha = breath;
      const gradient = ctx.createRadialGradient(lt.x, lt.y, 0, lt.x, lt.y, lt.radius * 2);
      gradient.addColorStop(0, '#ffd700');
      gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.6)');
      gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(lt.x, lt.y, lt.radius * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = breath;
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(lt.x, lt.y, lt.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const wb of this.windBands) {
      if (!wb.active) continue;
      const alpha = Math.min(1, wb.life / 60);
      ctx.globalAlpha = alpha * 0.7;
      ctx.fillStyle = '#a0c4ff';
      for (const p of wb.particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const dz of this.dangerZones) {
      if (!dz.active) continue;
      const flash = (Math.sin(dz.phase) + 1) * 0.5;
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(dz.x, dz.y, dz.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.6 + flash * 0.4;
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(dz.x, dz.y, dz.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
