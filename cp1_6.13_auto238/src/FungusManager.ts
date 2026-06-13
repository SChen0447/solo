import gsap from 'gsap';

export interface FungusRenderData {
  id: number;
  baseX: number;
  baseY: number;
  stemLength: number;
  stemWidth: number;
  currentAngle: number;
  capScale: number;
  baseColor: string;
  brightness: number;
  spots: { offsetX: number; offsetY: number; radius: number }[];
  highlight: boolean;
}

export interface BloomEvent {
  x: number;
  y: number;
  color: string;
  audioX: number;
}

interface Fungus {
  id: number;
  relX: number;
  relY: number;
  baseX: number;
  baseY: number;
  baseStemLength: number;
  stemLength: number;
  stemWidth: number;
  baseAngle: number;
  currentAngle: number;
  targetAngle: number;
  baseCapScale: number;
  capScale: number;
  baseColor: string;
  brightness: number;
  spots: { offsetX: number; offsetY: number; radius: number }[];
  hoverStartTime: number;
  isHovered: boolean;
  bloomCooldownUntil: number;
  hasBloomTween: boolean;
}

const COLOR_LEFT = { r: 0x54, g: 0xa0, b: 0xff };
const COLOR_RIGHT = { r: 0xff, g: 0x9f, b: 0xf3 };
const MAX_BEND_DEG = 30;
const BEND_DURATION = 0.5;
const HOVER_THRESHOLD_MS = 1000;
const BLOOM_COOLDOWN_MS = 2000;
const NEIGHBOR_RADIUS = 80;
const BEND_REACT_DISTANCE = 15;
const CAP_HIT_RADIUS = 18;
const STEM_EXTRA = 10;

function lerpColor(t: number): string {
  const tt = Math.max(0, Math.min(1, t));
  const r = Math.round(COLOR_LEFT.r + (COLOR_RIGHT.r - COLOR_LEFT.r) * tt);
  const g = Math.round(COLOR_LEFT.g + (COLOR_RIGHT.g - COLOR_LEFT.g) * tt);
  const b = Math.round(COLOR_LEFT.b + (COLOR_RIGHT.b - COLOR_LEFT.b) * tt);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export { hexToRgba };

export class FungusManager {
  private canvasWidth: number;
  private canvasHeight: number;
  private pool: Fungus[];
  private bloomCallbacks: ((event: BloomEvent) => void)[] = [];
  private hoveredFungusId: number | null = null;
  private renderResult: FungusRenderData[];

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.pool = [];
    this.renderResult = [];
    this.initializePool(50);
    for (let i = 0; i < 50; i++) {
      this.renderResult.push({
        id: 0, baseX: 0, baseY: 0, stemLength: 0, stemWidth: 0,
        currentAngle: 0, capScale: 1, baseColor: '#ffffff', brightness: 1,
        spots: [], highlight: false
      });
    }
  }

  private initializePool(count: number): void {
    for (let i = 0; i < count; i++) {
      const relX = Math.random();
      const relY = 0.3 + Math.random() * 0.65;
      const baseX = relX * this.canvasWidth;
      const baseY = relY * this.canvasHeight;
      const baseStemLength = 30 + Math.random() * 30;
      const stemWidth = 3 + Math.random() * 2;
      const spots: { offsetX: number; offsetY: number; radius: number }[] = [];
      const spotCount = 2 + Math.floor(Math.random() * 3);
      for (let s = 0; s < spotCount; s++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 2 + Math.random() * 5;
        spots.push({
          offsetX: Math.cos(angle) * dist,
          offsetY: Math.sin(angle) * dist * 0.6,
          radius: 1.5 + Math.random() * 2
        });
      }
      const fungus: Fungus = {
        id: i,
        relX, relY,
        baseX, baseY,
        baseStemLength,
        stemLength: baseStemLength,
        stemWidth,
        baseAngle: 0,
        currentAngle: 0,
        targetAngle: 0,
        baseCapScale: 1,
        capScale: 1,
        baseColor: lerpColor(relX),
        brightness: 1,
        spots,
        hoverStartTime: -1,
        isHovered: false,
        bloomCooldownUntil: 0,
        hasBloomTween: false
      };
      this.pool.push(fungus);
    }
  }

  public handleMouseMove(x: number, y: number): { hoveredFungusId: number | null } {

    let nearest: Fungus | null = null;
    let nearestDist = Infinity;

    for (const f of this.pool) {
      if (f.baseX < x - 200 || f.baseX > x + 200) continue;
      const capCenter = this.getCapCenter(f);
      const dx = capCenter.x - x;
      const dy = capCenter.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < CAP_HIT_RADIUS && dist < nearestDist) {
        nearest = f;
        nearestDist = dist;
      }

      if (dist <= BEND_REACT_DISTANCE + 50) {
        const bendT = Math.max(0, 1 - dist / (BEND_REACT_DISTANCE + 50));
        const targetDeg = Math.atan2(x - capCenter.x, -(y - capCenter.y)) * 180 / Math.PI;
        const clampedDeg = Math.max(-MAX_BEND_DEG, Math.min(MAX_BEND_DEG, targetDeg * bendT));
        const newTarget = clampedDeg * Math.PI / 180;
        if (Math.abs(newTarget - f.targetAngle) > 0.01) {
          f.targetAngle = newTarget;
          this.animateBend(f);
        }
      } else if (Math.abs(f.targetAngle - f.baseAngle) > 0.001) {
        f.targetAngle = f.baseAngle;
        this.animateBend(f);
      }
    }

    if (nearest) {
      if (this.hoveredFungusId !== nearest.id) {
        if (this.hoveredFungusId !== null) {
          const prev = this.pool[this.hoveredFungusId];
          if (prev) {
            prev.isHovered = false;
            prev.hoverStartTime = -1;
          }
        }
        this.hoveredFungusId = nearest.id;
        nearest.isHovered = true;
        nearest.hoverStartTime = performance.now();
      }
    } else {
      if (this.hoveredFungusId !== null) {
        const prev = this.pool[this.hoveredFungusId];
        if (prev) {
          prev.isHovered = false;
          prev.hoverStartTime = -1;
        }
        this.hoveredFungusId = null;
      }
    }

    return { hoveredFungusId: this.hoveredFungusId };
  }

  private getCapCenter(f: Fungus): { x: number; y: number } {
    const angle = f.currentAngle;
    const tipX = f.baseX + Math.sin(angle) * f.stemLength;
    const tipY = f.baseY - Math.cos(angle) * f.stemLength;
    return { x: tipX, y: tipY };
  }

  private animateBend(f: Fungus): void {
    const targetAngle = f.targetAngle;
    const growing = Math.abs(targetAngle - f.baseAngle) > 0.001;
    const targetLength = growing ? f.baseStemLength + STEM_EXTRA : f.baseStemLength;
    const targetCapScale = growing ? f.baseCapScale * 1.15 : f.baseCapScale;

    gsap.killTweensOf(f, { currentAngle: true, stemLength: true, capScale: true });

    gsap.to(f, {
      currentAngle: targetAngle,
      stemLength: targetLength,
      capScale: targetCapScale,
      duration: BEND_DURATION,
      ease: 'power2.out',
      overwrite: true
    });
  }

  public onBloom(callback: (event: BloomEvent) => void): void {
    this.bloomCallbacks.push(callback);
  }

  private emitBloom(f: Fungus): void {
    const capCenter = this.getCapCenter(f);
    const event: BloomEvent = {
      x: capCenter.x,
      y: capCenter.y,
      color: f.baseColor,
      audioX: f.relX
    };
    for (const cb of this.bloomCallbacks) cb(event);

    f.brightness = 1.6;
    gsap.to(f, {
      brightness: 1,
      duration: 0.3,
      ease: 'power1.out',
      overwrite: true
    });

    const pulseScale = f.baseCapScale * 1.4;
    gsap.to(f, {
      capScale: pulseScale,
      duration: 0.1,
      ease: 'power2.out',
      yoyo: true,
      repeat: 1,
      overwrite: true,
      onComplete: () => {
        f.capScale = f.baseCapScale;
      }
    });

    for (const n of this.pool) {
      if (n.id === f.id) continue;
      const dx = n.baseX - f.baseX;
      const dy = n.baseY - f.baseY;
      if (dx * dx + dy * dy <= NEIGHBOR_RADIUS * NEIGHBOR_RADIUS) {
        n.brightness = 1.3;
        gsap.to(n, {
          brightness: 1,
          duration: 0.3,
          ease: 'power1.out',
          overwrite: true
        });
        const jitter = ((Math.random() - 0.5) * 10) * Math.PI / 180;
        const original = n.baseAngle;
        n.baseAngle = jitter;
        gsap.to(n, {
          currentAngle: jitter,
          duration: 0.15,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1,
          overwrite: true,
          onComplete: () => {
            n.baseAngle = original;
          }
        });
      }
    }
  }

  public update(_deltaTime: number): FungusRenderData[] {
    const now = performance.now();

    for (let i = 0; i < this.pool.length; i++) {
      const f = this.pool[i];
      const r = this.renderResult[i];

      if (f.isHovered && f.hoverStartTime > 0 && now >= f.bloomCooldownUntil) {
        if (now - f.hoverStartTime >= HOVER_THRESHOLD_MS) {
          this.emitBloom(f);
          f.hoverStartTime = now;
          f.bloomCooldownUntil = now + BLOOM_COOLDOWN_MS;
        }
      }

      f.baseColor = lerpColor(f.relX);

      r.id = f.id;
      r.baseX = f.baseX;
      r.baseY = f.baseY;
      r.stemLength = f.stemLength;
      r.stemWidth = f.stemWidth;
      r.currentAngle = f.currentAngle;
      r.capScale = f.capScale;
      r.baseColor = f.baseColor;
      r.brightness = f.brightness;
      r.spots = f.spots;
      r.highlight = f.isHovered;
    }

    return this.renderResult;
  }

  public resize(newWidth: number, newHeight: number): void {
    this.canvasWidth = newWidth;
    this.canvasHeight = newHeight;
    for (const f of this.pool) {
      f.baseX = f.relX * newWidth;
      f.baseY = f.relY * newHeight;
      f.baseColor = lerpColor(f.relX);
    }
  }

  public getHoveredColor(): string | null {
    if (this.hoveredFungusId === null) return null;
    return this.pool[this.hoveredFungusId]?.baseColor ?? null;
  }
}
