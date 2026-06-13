import gsap from 'gsap';

export type PieceColor = 'black' | 'white';

export type DistortionFn = (x: number, y: number) => { dx: number; dy: number };

export interface Piece {
  x: number;
  y: number;
  color: PieceColor;
  gridX: number;
  gridY: number;
  scale: number;
  alpha: number;
  haloPhase: number;
}

export interface Meteor {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
  color: PieceColor;
  progress: number;
  speed: number;
  trailPoints: { x: number; y: number; alpha: number; birth: number }[];
  parabolicHeight: number;
}

export interface StarDustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hue: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface RippleEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  hue: number;
  particles: StarDustParticle[];
  life: number;
  maxLife: number;
}

export class PieceManager {
  private pieces: Piece[] = [];
  private meteors: Meteor[] = [];
  private ripples: RippleEffect[] = [];
  private currentTurn: PieceColor = 'black';
  private time: number = 0;

  constructor() {}

  public getCurrentTurn(): PieceColor {
    return this.currentTurn;
  }

  public getPieces(): Piece[] {
    return this.pieces;
  }

  public isPositionOccupied(gridX: number, gridY: number): boolean {
    return this.pieces.some(p => p.gridX === gridX && p.gridY === gridY);
  }

  public dropPiece(
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    gridX: number,
    gridY: number,
    color: PieceColor,
    mouseHue: number
  ): void {
    if (this.isPositionOccupied(gridX, gridY)) {
      return;
    }

    const meteor: Meteor = {
      startX,
      startY,
      targetX,
      targetY,
      currentX: startX,
      currentY: startY,
      color,
      progress: 0,
      speed: 800,
      trailPoints: [],
      parabolicHeight: 80 + Math.random() * 60
    };

    this.meteors.push(meteor);

    const dist = Math.sqrt(
      Math.pow(targetX - startX, 2) + Math.pow(targetY - startY, 2)
    );
    const duration = dist / meteor.speed;

    gsap.to(meteor, {
      progress: 1,
      duration: duration,
      ease: 'power2.out',
      onComplete: () => {
        this.onMeteorLand(meteor, gridX, gridY, color, mouseHue);
      }
    });

    this.currentTurn = color === 'black' ? 'white' : 'black';
  }

  private onMeteorLand(
    meteor: Meteor,
    gridX: number,
    gridY: number,
    color: PieceColor,
    mouseHue: number
  ): void {
    const piece: Piece = {
      x: meteor.targetX,
      y: meteor.targetY,
      color,
      gridX,
      gridY,
      scale: 0,
      alpha: 0,
      haloPhase: Math.random() * Math.PI * 2
    };

    this.pieces.push(piece);

    gsap.to(piece, {
      scale: 1,
      alpha: 1,
      duration: 0.4,
      ease: 'back.out(2)'
    });

    this.createRipple(meteor.targetX, meteor.targetY, mouseHue);

    const index = this.meteors.indexOf(meteor);
    if (index > -1) {
      this.meteors.splice(index, 1);
    }
  }

  private createRipple(x: number, y: number, baseHue: number): void {
    const particles: StarDustParticle[] = [];
    const particleCount = 30;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 30 + Math.random() * 40;
      const hue = (baseHue + Math.random() * 60 - 30 + 360) % 360;

      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        hue,
        size: 2 + Math.random() * 3,
        alpha: 1,
        life: 0,
        maxLife: 1500
      });
    }

    const ripple: RippleEffect = {
      x,
      y,
      radius: 0,
      maxRadius: 80,
      alpha: 0.6,
      hue: baseHue,
      particles,
      life: 0,
      maxLife: 1500
    };

    this.ripples.push(ripple);
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    for (const meteor of this.meteors) {
      const t = meteor.progress;
      const x = meteor.startX + (meteor.targetX - meteor.startX) * t;
      const y =
        meteor.startY +
        (meteor.targetY - meteor.startY) * t -
        Math.sin(t * Math.PI) * meteor.parabolicHeight;

      meteor.currentX = x;
      meteor.currentY = y;

      if (Math.random() < 0.8) {
        meteor.trailPoints.push({
          x: meteor.currentX,
          y: meteor.currentY,
          alpha: 1,
          birth: this.time
        });
      }

      meteor.trailPoints = meteor.trailPoints.filter(p => {
        const age = this.time - p.birth;
        p.alpha = Math.max(0, 1 - age / 600);
        return age < 600;
      });

      if (meteor.trailPoints.length > 10) {
        meteor.trailPoints.splice(0, meteor.trailPoints.length - 10);
      }
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      ripple.life += deltaTime;

      const progress = ripple.life / ripple.maxLife;
      ripple.radius = ripple.maxRadius * progress;
      ripple.alpha = 0.6 * (1 - progress);

      for (const particle of ripple.particles) {
        particle.life += deltaTime;
        particle.x += particle.vx * (deltaTime / 1000);
        particle.y += particle.vy * (deltaTime / 1000);
        particle.vx *= 0.98;
        particle.vy *= 0.98;
        particle.alpha = Math.max(0, 1 - particle.life / particle.maxLife);
        particle.size *= 0.995;
      }

      if (ripple.life >= ripple.maxLife) {
        this.ripples.splice(i, 1);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D, distortionFn?: DistortionFn): void {
    for (const ripple of this.ripples) {
      this.renderRipple(ctx, ripple, distortionFn);
    }

    for (const meteor of this.meteors) {
      this.renderMeteor(ctx, meteor, distortionFn);
    }

    for (const piece of this.pieces) {
      this.renderPiece(ctx, piece, distortionFn);
    }
  }

  private applyDistortion(
    x: number,
    y: number,
    distortionFn?: DistortionFn
  ): { x: number; y: number } {
    if (!distortionFn) {
      return { x, y };
    }
    const offset = distortionFn(x, y);
    return { x: x + offset.dx, y: y + offset.dy };
  }

  private renderRipple(
    ctx: CanvasRenderingContext2D,
    ripple: RippleEffect,
    distortionFn?: DistortionFn
  ): void {
    if (ripple.alpha > 0) {
      if (!distortionFn) {
        const gradient = ctx.createRadialGradient(
          ripple.x, ripple.y, 0,
          ripple.x, ripple.y, ripple.radius
        );
        gradient.addColorStop(0, `hsla(${ripple.hue}, 100%, 70%, 0)`);
        gradient.addColorStop(0.7, `hsla(${ripple.hue}, 100%, 60%, ${ripple.alpha * 0.3})`);
        gradient.addColorStop(1, `hsla(${ripple.hue}, 100%, 60%, 0)`);

        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      } else {
        const pos = this.applyDistortion(ripple.x, ripple.y, distortionFn);
        const gradient = ctx.createRadialGradient(
          pos.x, pos.y, 0,
          pos.x, pos.y, ripple.radius
        );
        gradient.addColorStop(0, `hsla(${ripple.hue}, 100%, 70%, 0)`);
        gradient.addColorStop(0.7, `hsla(${ripple.hue}, 100%, 60%, ${ripple.alpha * 0.3})`);
        gradient.addColorStop(1, `hsla(${ripple.hue}, 100%, 60%, 0)`);

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, ripple.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    }

    for (const particle of ripple.particles) {
      if (particle.alpha <= 0) continue;

      let pos = { x: particle.x, y: particle.y };
      if (distortionFn) {
        pos = this.applyDistortion(particle.x, particle.y, distortionFn);
      }

      const gradient = ctx.createRadialGradient(
        pos.x, pos.y, 0,
        pos.x, pos.y, particle.size * 2
      );
      gradient.addColorStop(0, `hsla(${particle.hue}, 100%, 70%, ${particle.alpha})`);
      gradient.addColorStop(1, `hsla(${particle.hue}, 100%, 70%, 0)`);

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, particle.size * 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }

  private renderMeteor(
    ctx: CanvasRenderingContext2D,
    meteor: Meteor,
    distortionFn?: DistortionFn
  ): void {
    for (const point of meteor.trailPoints) {
      let pos = { x: point.x, y: point.y };
      if (distortionFn) {
        pos = this.applyDistortion(point.x, point.y, distortionFn);
      }

      const gradient = ctx.createRadialGradient(
        pos.x, pos.y, 0,
        pos.x, pos.y, 4
      );
      gradient.addColorStop(0, `rgba(255, 255, 255, ${point.alpha})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    let meteorPos = { x: meteor.currentX, y: meteor.currentY };
    if (distortionFn) {
      meteorPos = this.applyDistortion(meteor.currentX, meteor.currentY, distortionFn);
    }

    const coreGradient = ctx.createRadialGradient(
      meteorPos.x, meteorPos.y, 0,
      meteorPos.x, meteorPos.y, 8
    );
    coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    coreGradient.addColorStop(0.4, 'rgba(200, 220, 255, 0.8)');
    coreGradient.addColorStop(1, 'rgba(150, 180, 255, 0)');

    ctx.beginPath();
    ctx.arc(meteorPos.x, meteorPos.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = coreGradient;
    ctx.fill();
  }

  private renderPiece(
    ctx: CanvasRenderingContext2D,
    piece: Piece,
    distortionFn?: DistortionFn
  ): void {
    const radius = 12 * piece.scale;
    const haloWobble = Math.sin(this.time * 0.003 + piece.haloPhase) * 2;

    let pos = { x: piece.x, y: piece.y };
    if (distortionFn) {
      pos = this.applyDistortion(piece.x, piece.y, distortionFn);
    }

    ctx.save();
    ctx.translate(pos.x, pos.y + haloWobble);
    ctx.globalAlpha = piece.alpha;

    if (piece.color === 'black') {
      const haloGradient = ctx.createRadialGradient(0, 0, radius * 0.8, 0, 0, radius * 2);
      haloGradient.addColorStop(0, 'rgba(212, 175, 55, 0)');
      haloGradient.addColorStop(0.6, 'rgba(212, 175, 55, 0.3)');
      haloGradient.addColorStop(1, 'rgba(212, 175, 55, 0)');

      ctx.beginPath();
      ctx.arc(0, 0, radius * 2, 0, Math.PI * 2);
      ctx.fillStyle = haloGradient;
      ctx.fill();

      const bodyGradient = ctx.createRadialGradient(-3, -3, 0, 0, 0, radius);
      bodyGradient.addColorStop(0, '#2a2a3a');
      bodyGradient.addColorStop(1, '#0a0a15');

      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = bodyGradient;
      ctx.fill();
    } else {
      const haloGradient = ctx.createRadialGradient(0, 0, radius * 0.8, 0, 0, radius * 2);
      haloGradient.addColorStop(0, 'rgba(135, 206, 250, 0)');
      haloGradient.addColorStop(0.6, 'rgba(135, 206, 250, 0.4)');
      haloGradient.addColorStop(1, 'rgba(135, 206, 250, 0)');

      ctx.beginPath();
      ctx.arc(0, 0, radius * 2, 0, Math.PI * 2);
      ctx.fillStyle = haloGradient;
      ctx.fill();

      const bodyGradient = ctx.createRadialGradient(-3, -3, 0, 0, 0, radius);
      bodyGradient.addColorStop(0, '#ffffff');
      bodyGradient.addColorStop(1, '#c8d8e8');

      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = bodyGradient;
      ctx.fill();
    }

    ctx.restore();
  }

  public getTotalParticles(): number {
    let count = 0;
    for (const ripple of this.ripples) {
      count += ripple.particles.length;
    }
    return count;
  }
}
