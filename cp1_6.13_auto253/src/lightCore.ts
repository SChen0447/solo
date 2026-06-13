import gsap from 'gsap';

const SPOT_COLORS = ['#ff6b6b', '#48dbfb', '#feca57', '#ff9ff3', '#54a0ff', '#a29bfe'];

const PHASE_HUES = [15, 255, 185, 15];

interface Spot {
  orbitRadius: number;
  orbitAngle: number;
  orbitSpeed: number;
  size: number;
  colorIndex: number;
  alpha: number;
  burstOffsetX: number;
  burstOffsetY: number;
  scale: number;
  x: number;
  y: number;
}

interface Connection {
  from: number;
  to: number;
  alpha: number;
  targetAlpha: number;
}

export class LightCore {
  private spots: Spot[] = [];
  private connections: Connection[] = [];
  private tempSpots: Spot[] = [];
  private ballRadius = 300;
  private dominantHue = 15;
  private connectionDist = 0;
  private doubleBurstTimeline: gsap.core.Timeline | null = null;

  constructor(ballRadius: number) {
    this.ballRadius = ballRadius;
    this.connectionDist = ballRadius * 0.5;
    this.initSpots();
  }

  private initSpots(): void {
    this.spots = [];
    for (let i = 0; i < 30; i++) {
      this.spots.push(this.createSpot());
    }
    this.buildConnections();
  }

  private createSpot(): Spot {
    const orbitRadius = (0.1 + Math.random() * 0.55) * this.ballRadius;
    return {
      orbitRadius,
      orbitAngle: Math.random() * Math.PI * 2,
      orbitSpeed: (0.15 + Math.random() * 0.35) * (Math.random() > 0.5 ? 1 : -1),
      size: 8 + Math.random() * 8,
      colorIndex: Math.floor(Math.random() * 6),
      alpha: 0.6 + Math.random() * 0.3,
      burstOffsetX: 0,
      burstOffsetY: 0,
      scale: 1,
      x: 0,
      y: 0,
    };
  }

  private buildConnections(): void {
    this.connections = [];
    for (let i = 0; i < this.spots.length; i++) {
      for (let j = i + 1; j < this.spots.length; j++) {
        const dx = this.spots[i].x - this.spots[j].x;
        const dy = this.spots[i].y - this.spots[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this.connectionDist) {
          this.connections.push({
            from: i,
            to: j,
            alpha: 0.4,
            targetAlpha: 0.4,
          });
        }
      }
    }
  }

  resize(newBallRadius: number): void {
    const scale = newBallRadius / this.ballRadius;
    this.ballRadius = newBallRadius;
    this.connectionDist = newBallRadius * 0.5;
    this.spots.forEach((s) => {
      s.orbitRadius *= scale;
      s.size *= scale;
    });
  }

  update(dt: number): void {
    const dtSec = dt / 1000;
    this.spots.forEach((s) => {
      s.orbitAngle += s.orbitSpeed * dtSec;
      const baseX = Math.cos(s.orbitAngle) * s.orbitRadius;
      const baseY = Math.sin(s.orbitAngle) * s.orbitRadius;
      s.x = baseX + s.burstOffsetX;
      s.y = baseY + s.burstOffsetY;
    });

    this.tempSpots.forEach((s) => {
      s.orbitAngle += s.orbitSpeed * dtSec;
      const baseX = Math.cos(s.orbitAngle) * s.orbitRadius;
      const baseY = Math.sin(s.orbitAngle) * s.orbitRadius;
      s.x = baseX + s.burstOffsetX;
      s.y = baseY + s.burstOffsetY;
    });

    this.connections.forEach((c) => {
      const diff = c.targetAlpha - c.alpha;
      c.alpha += diff * Math.min(1, dtSec * 3);
    });
  }

  updateDominantHue(elapsedMs: number): void {
    const cycleMs = 60000;
    const t = (elapsedMs % cycleMs) / cycleMs;
    const phaseCount = 3;
    const phaseT = t * phaseCount;
    const phaseIndex = Math.floor(phaseT) % phaseCount;
    const phaseFrac = phaseT - Math.floor(phaseT);

    const fromHue = PHASE_HUES[phaseIndex];
    const toHue = PHASE_HUES[phaseIndex + 1];
    this.dominantHue = this.lerpHue(fromHue, toHue, this.smoothStep(phaseFrac));
  }

  private smoothStep(t: number): number {
    return t * t * (3 - 2 * t);
  }

  private lerpHue(a: number, b: number, t: number): number {
    let diff = b - a;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return (a + diff * t + 360) % 360;
  }

  getDominantColor(): string {
    return `hsl(${this.dominantHue}, 80%, 60%)`;
  }

  getDominantColorRGBA(alpha: number): string {
    return `hsla(${this.dominantHue}, 80%, 60%, ${alpha})`;
  }

  triggerClick(): void {
    this.spots.forEach((s) => {
      gsap.to(s, {
        scale: 1.5,
        duration: 0.25,
        ease: 'power2.out',
        onComplete: () => {
          gsap.to(s, {
            scale: 1,
            duration: 0.25,
            ease: 'power2.in',
          });
        },
      });
    });
  }

  triggerDoubleClick(onComplete?: () => void): void {
    if (this.doubleBurstTimeline) {
      this.doubleBurstTimeline.kill();
    }

    this.tempSpots = [];
    for (let i = 0; i < 30; i++) {
      const newSpot = this.createSpot();
      newSpot.orbitRadius = this.spots[i % this.spots.length].orbitRadius;
      newSpot.orbitAngle = this.spots[i % this.spots.length].orbitAngle;
      newSpot.x = this.spots[i % this.spots.length].x;
      newSpot.y = this.spots[i % this.spots.length].y;
      this.tempSpots.push(newSpot);
    }

    const allSpots = [...this.spots, ...this.tempSpots];

    allSpots.forEach((s) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 150 + Math.random() * 150;
      gsap.to(s, {
        burstOffsetX: Math.cos(angle) * dist,
        burstOffsetY: Math.sin(angle) * dist,
        duration: 2,
        ease: 'power2.out',
      });
    });

    const tl = gsap.timeline({
      onComplete: () => {
        this.tempSpots = [];
        this.spots.forEach((s) => {
          s.orbitRadius = (0.1 + Math.random() * 0.55) * this.ballRadius;
          s.orbitAngle = Math.random() * Math.PI * 2;
          s.orbitSpeed = (0.15 + Math.random() * 0.35) * (Math.random() > 0.5 ? 1 : -1);
          s.colorIndex = Math.floor(Math.random() * 6);
          s.alpha = 0.6 + Math.random() * 0.3;
        });
        this.buildConnections();
        if (onComplete) onComplete();
      },
    });

    tl.to({}, { duration: 2.2 });

    this.spots.forEach((s) => {
      tl.to(s, {
        burstOffsetX: 0,
        burstOffsetY: 0,
        scale: 1,
        duration: 0.8,
        ease: 'power3.out',
      }, '-=0.5');
    });

    this.tempSpots.forEach((s) => {
      tl.to(s, {
        alpha: 0,
        burstOffsetX: 0,
        burstOffsetY: 0,
        duration: 0.8,
        ease: 'power3.out',
      }, '-=0.8');
    });

    this.doubleBurstTimeline = tl;
  }

  evolveConnections(): void {
    this.connections.forEach((c) => {
      if (Math.random() < 0.3) {
        c.targetAlpha = 0;
      }
    });

    for (let i = 0; i < this.spots.length; i++) {
      for (let j = i + 1; j < this.spots.length; j++) {
        const exists = this.connections.some(
          (c) => (c.from === i && c.to === j)
        );
        if (!exists && Math.random() < 0.15) {
          this.connections.push({
            from: i,
            to: j,
            alpha: 0,
            targetAlpha: 0.4,
          });
        }
      }
    }

    this.connections = this.connections.filter(
      (c) => !(c.targetAlpha === 0 && c.alpha < 0.01)
    );
  }

  draw(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    ballRadius: number,
    rotationAngle: number
  ): void {
    ctx.save();
    ctx.translate(centerX, centerY);

    ctx.beginPath();
    ctx.arc(0, 0, ballRadius - 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.rotate(-rotationAngle * 0.6);

    this.connections.forEach((c) => {
      if (c.alpha < 0.01) return;
      const fromSpot = this.spots[c.from];
      const toSpot = this.spots[c.to];
      if (!fromSpot || !toSpot) return;

      const fromColor = SPOT_COLORS[fromSpot.colorIndex];
      ctx.beginPath();
      ctx.moveTo(fromSpot.x, fromSpot.y);
      ctx.lineTo(toSpot.x, toSpot.y);
      ctx.strokeStyle = this.hexToRGBA(fromColor, c.alpha * 0.5);
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    const allDrawableSpots = [...this.spots, ...this.tempSpots];
    allDrawableSpots.forEach((s) => {
      if (s.alpha < 0.01) return;
      const color = SPOT_COLORS[s.colorIndex];
      const size = s.size * s.scale;

      const gradient = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, size * 1.5);
      gradient.addColorStop(0, this.hexToRGBA(color, s.alpha));
      gradient.addColorStop(0.5, this.hexToRGBA(color, s.alpha * 0.5));
      gradient.addColorStop(1, this.hexToRGBA(color, 0));

      ctx.beginPath();
      ctx.arc(s.x, s.y, size * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(s.x, s.y, size * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = this.hexToRGBA(color, Math.min(1, s.alpha + 0.2));
      ctx.fill();
    });

    ctx.restore();
  }

  private hexToRGBA(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
}
