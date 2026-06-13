export interface MoonDisc {
  id: number;
  x: number;
  y: number;
  baseY: number;
  diameter: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  floatPhase: number;
  floatSpeed: number;
  floatRange: number;
  active: boolean;
  respawnTimer: number;
  noRespawnTimer: number;
}

const MOON_COLORS = ['#fbbf24', '#f472b6', '#a78bfa', '#34d399'];
const TOTAL_DISCS = 20;

export class MoonDiscSystem {
  private discs: MoonDisc[] = [];
  private nextId = 0;
  private centerX = 0;
  private centerY = 0;
  private arenaRadius = 0;
  private minDiameter = 25;
  private maxDiameter = 40;

  public init(centerX: number, centerY: number, arenaRadius: number, viewportW: number): void {
    this.centerX = centerX;
    this.centerY = centerY;
    this.arenaRadius = arenaRadius;
    this.updateSizes(viewportW);
    this.discs = [];
    this.spawnAllDiscs();
  }

  public updateSizes(viewportW: number): void {
    if (viewportW <= 480) {
      this.minDiameter = 18;
      this.maxDiameter = 28;
    } else {
      this.minDiameter = 25;
      this.maxDiameter = 40;
    }
  }

  private spawnAllDiscs(): void {
    for (let i = 0; i < TOTAL_DISCS; i++) {
      this.spawnSingleDisc();
    }
  }

  private spawnSingleDisc(): MoonDisc {
    let attempts = 0;
    let x = 0, y = 0;
    while (attempts < 100) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (this.arenaRadius - this.maxDiameter);
      x = this.centerX + Math.cos(angle) * dist;
      y = this.centerY + Math.sin(angle) * dist;
      let overlaps = false;
      for (const d of this.discs) {
        if (!d.active) continue;
        const dx = d.x - x;
        const dy = d.y - y;
        const minDist = (d.diameter + this.maxDiameter) / 2 + 5;
        if (dx * dx + dy * dy < minDist * minDist) {
          overlaps = true;
          break;
        }
      }
      if (!overlaps) break;
      attempts++;
    }
    const diameter = this.minDiameter + Math.random() * (this.maxDiameter - this.minDiameter);
    const color = MOON_COLORS[Math.floor(Math.random() * MOON_COLORS.length)];
    const disc: MoonDisc = {
      id: this.nextId++,
      x,
      y,
      baseY: y,
      diameter,
      color,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.5,
      floatPhase: Math.random() * Math.PI * 2,
      floatSpeed: Math.PI * 2 / (2 + Math.random() * 2),
      floatRange: 15,
      active: true,
      respawnTimer: 0,
      noRespawnTimer: 0
    };
    this.discs.push(disc);
    return disc;
  }

  public update(dt: number): void {
    this.discs.forEach(disc => {
      if (disc.active) {
        disc.floatPhase += disc.floatSpeed * dt;
        disc.y = disc.baseY + Math.sin(disc.floatPhase) * disc.floatRange;
        disc.rotation += disc.rotationSpeed * dt;
      } else {
        if (disc.noRespawnTimer > 0) {
          disc.noRespawnTimer -= dt;
        } else {
          disc.respawnTimer -= dt;
          if (disc.respawnTimer <= 0) {
            this.respawnDisc(disc);
          }
        }
      }
    });
  }

  private respawnDisc(disc: MoonDisc): void {
    let attempts = 0;
    let x = 0, y = 0;
    while (attempts < 100) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (this.arenaRadius - this.maxDiameter);
      x = this.centerX + Math.cos(angle) * dist;
      y = this.centerY + Math.sin(angle) * dist;
      let overlaps = false;
      for (const d of this.discs) {
        if (!d.active || d.id === disc.id) continue;
        const dx = d.x - x;
        const dy = d.y - y;
        const minDist = (d.diameter + this.maxDiameter) / 2 + 5;
        if (dx * dx + dy * dy < minDist * minDist) {
          overlaps = true;
          break;
        }
      }
      if (!overlaps) break;
      attempts++;
    }
    disc.x = x;
    disc.baseY = y;
    disc.y = y;
    disc.diameter = this.minDiameter + Math.random() * (this.maxDiameter - this.minDiameter);
    disc.color = MOON_COLORS[Math.floor(Math.random() * MOON_COLORS.length)];
    disc.rotation = Math.random() * Math.PI * 2;
    disc.floatPhase = Math.random() * Math.PI * 2;
    disc.active = true;
  }

  public shatterDisc(id: number): MoonDisc | null {
    const disc = this.discs.find(d => d.id === id && d.active);
    if (!disc) return null;
    disc.active = false;
    disc.respawnTimer = 2;
    return disc;
  }

  public shatterAllDiscs(noRespawnSeconds: number = 5): MoonDisc[] {
    const shattered: MoonDisc[] = [];
    this.discs.forEach(disc => {
      if (disc.active) {
        disc.active = false;
        disc.respawnTimer = noRespawnSeconds;
        disc.noRespawnTimer = noRespawnSeconds;
        shattered.push(disc);
      }
    });
    return shattered;
  }

  public getDiscs(): MoonDisc[] {
    return this.discs;
  }

  public getActiveDiscs(): MoonDisc[] {
    return this.discs.filter(d => d.active);
  }

  public render(ctx: CanvasRenderingContext2D): void {
    this.discs.forEach(disc => {
      if (!disc.active) return;
      const r = disc.diameter / 2;

      ctx.save();
      const haloGradient = ctx.createRadialGradient(disc.x, disc.y, r, disc.x, disc.y, r + 20);
      haloGradient.addColorStop(0, `${disc.color}33`);
      haloGradient.addColorStop(1, `${disc.color}00`);
      ctx.fillStyle = haloGradient;
      ctx.beginPath();
      ctx.arc(disc.x, disc.y, r + 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(disc.x, disc.y);
      ctx.rotate(disc.rotation);
      const bodyGradient = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
      bodyGradient.addColorStop(0, this.lightenColor(disc.color, 0.3));
      bodyGradient.addColorStop(0.7, disc.color);
      bodyGradient.addColorStop(1, this.darkenColor(disc.color, 0.2));
      ctx.fillStyle = bodyGradient;
      ctx.shadowColor = disc.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  public renderArenaFence(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number): void {
    const pillarCount = 12;
    const pillarHeight = 60;
    const pillarWidth = 4;
    ctx.save();
    for (let i = 0; i < pillarCount; i++) {
      const angle = (i / pillarCount) * Math.PI * 2 - Math.PI / 2;
      const px = centerX + Math.cos(angle) * radius;
      const py = centerY + Math.sin(angle) * radius;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle + Math.PI / 2);
      const gradient = ctx.createLinearGradient(0, -pillarHeight / 2, 0, pillarHeight / 2);
      gradient.addColorStop(0, 'rgba(125, 211, 252, 0)');
      gradient.addColorStop(0.5, 'rgba(125, 211, 252, 0.6)');
      gradient.addColorStop(1, 'rgba(125, 211, 252, 0)');
      ctx.fillStyle = gradient;
      ctx.shadowColor = '#7dd3fc';
      ctx.shadowBlur = 8;
      ctx.fillRect(-pillarWidth / 2, -pillarHeight / 2, pillarWidth, pillarHeight);
      ctx.restore();
    }
    ctx.restore();
  }

  private lightenColor(hex: string, amount: number): string {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (num >> 16) + Math.round(255 * amount));
    const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(255 * amount));
    const b = Math.min(255, (num & 0x0000FF) + Math.round(255 * amount));
    return `rgb(${r}, ${g}, ${b})`;
  }

  private darkenColor(hex: string, amount: number): string {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.max(0, (num >> 16) - Math.round(255 * amount));
    const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * amount));
    const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * amount));
    return `rgb(${r}, ${g}, ${b})`;
  }
}
