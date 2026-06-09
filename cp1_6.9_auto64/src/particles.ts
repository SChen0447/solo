import p5 from 'p5';
import {
  ColorRGB,
  PARTICLE_COLOR_DEFAULT,
  PARTICLE_SIZE_START_MIN,
  PARTICLE_SIZE_START_MAX,
  PARTICLE_SIZE_MIN,
  PARTICLE_LIFETIME,
  TRAIL_LENGTH_MIN,
  TRAIL_LENGTH_MAX,
  ANGLE_OFFSET_MAX,
  SETTLE_DURATION,
  SETTLE_FALL_SPEED_MIN,
  SETTLE_FALL_SPEED_MAX,
  SPOT_RADIUS_MIN,
  SPOT_RADIUS_MAX,
  SPOT_OPACITY,
  SPOT_MERGE_RADIUS_INCREMENT,
  SPOT_MERGE_DURATION,
  STAMP_RADIUS_MIN,
  STAMP_RADIUS_MAX,
  STAMP_DURATION,
  STAMP_ATTRACTION_DURATION,
  STAMP_ATTRACTION_COUNT,
  EXPLOSION_PARTICLE_MIN,
  EXPLOSION_PARTICLE_MAX,
  EXPLOSION_DURATION,
  SPOT_FLASH_DURATION,
  SPOT_FLASH_BRIGHTNESS,
  MAX_PARTICLES,
  lerpColor,
  colorToP5Color,
  easeOut,
  easeOutQuad
} from './style';

export enum ParticleState {
  TRAIL,
  SETTLING,
  FALLING,
  MERGED
}

export class TrailParticle {
  pos: p5.Vector;
  vel: p5.Vector;
  color: ColorRGB;
  targetColor: ColorRGB;
  size: number;
  startSize: number;
  birthTime: number;
  lifetime: number;
  trailLength: number;
  trail: p5.Vector[];
  state: ParticleState;
  settleStartTime: number;
  fallSpeed: number;
  settled: boolean;

  constructor(
    p: p5,
    x: number,
    y: number,
    directionAngle: number,
    speed: number,
    color: ColorRGB
  ) {
    const angleOffset = p.radians(p.random(-ANGLE_OFFSET_MAX, ANGLE_OFFSET_MAX));
    const finalAngle = directionAngle + angleOffset;
    const particleSpeed = speed * p.random(0.3, 0.8);

    this.pos = p.createVector(x, y);
    this.vel = p.createVector(
      Math.cos(finalAngle) * particleSpeed,
      Math.sin(finalAngle) * particleSpeed
    );
    this.color = { ...PARTICLE_COLOR_DEFAULT };
    this.targetColor = { ...color };
    this.startSize = p.random(PARTICLE_SIZE_START_MIN, PARTICLE_SIZE_START_MAX);
    this.size = this.startSize;
    this.birthTime = p.millis();
    this.lifetime = PARTICLE_LIFETIME;
    this.trailLength = Math.floor(p.random(TRAIL_LENGTH_MIN, TRAIL_LENGTH_MAX));
    this.trail = [];
    this.state = ParticleState.TRAIL;
    this.settleStartTime = 0;
    this.fallSpeed = p.random(SETTLE_FALL_SPEED_MIN, SETTLE_FALL_SPEED_MAX);
    this.settled = false;
  }

  update(p: p5, currentTime: number): boolean {
    this.trail.push(this.pos.copy());
    if (this.trail.length > this.trailLength) {
      this.trail.shift();
    }

    if (this.state === ParticleState.TRAIL) {
      this.pos.add(this.vel);
      this.vel.mult(0.95);

      const age = currentTime - this.birthTime;
      const lifeRatio = age / this.lifetime;
      this.size = this.startSize * (1 - lifeRatio) + PARTICLE_SIZE_MIN * lifeRatio;

      if (age >= this.lifetime) {
        return false;
      }
    } else if (this.state === ParticleState.SETTLING) {
      const settleAge = currentTime - this.settleStartTime;
      const settleRatio = Math.min(settleAge / SETTLE_DURATION, 1);
      const easedRatio = easeOut(settleRatio);

      this.vel.mult(1 - easedRatio * 0.05);
      this.pos.add(this.vel);

      this.color = lerpColor(PARTICLE_COLOR_DEFAULT, this.targetColor, easedRatio);
      this.size = this.startSize * (1 - easedRatio * 0.5);

      if (settleRatio >= 1) {
        this.state = ParticleState.FALLING;
      }
    } else if (this.state === ParticleState.FALLING) {
      this.pos.y += this.fallSpeed;
      this.size = Math.max(this.size * 0.995, PARTICLE_SIZE_MIN);
    }

    return true;
  }

  startSettling(currentTime: number): void {
    if (this.state === ParticleState.TRAIL) {
      this.state = ParticleState.SETTLING;
      this.settleStartTime = currentTime;
    }
  }

  draw(p: p5, currentTime: number): void {
    const age = currentTime - this.birthTime;
    let alpha: number;

    if (this.state === ParticleState.TRAIL) {
      alpha = Math.max(0, 1 - age / this.lifetime);
    } else if (this.state === ParticleState.SETTLING) {
      const settleAge = currentTime - this.settleStartTime;
      const settleRatio = Math.min(settleAge / SETTLE_DURATION, 1);
      alpha = 0.5 + settleRatio * 0.5;
    } else {
      alpha = 0.8;
    }

    if (this.trail.length > 1) {
      p.noFill();
      for (let i = 1; i < this.trail.length; i++) {
        const trailAlpha = (i / this.trail.length) * alpha * 0.6;
        const trailSize = (i / this.trail.length) * this.size * 0.5;
        p.stroke(colorToP5Color(p, this.color, trailAlpha * 255));
        p.strokeWeight(trailSize);
        p.line(
          this.trail[i - 1].x, this.trail[i - 1].y,
          this.trail[i].x, this.trail[i].y
        );
      }
    }

    p.noStroke();
    p.fill(colorToP5Color(p, this.color, alpha * 255));
    p.ellipse(this.pos.x, this.pos.y, this.size, this.size);

    p.fill(colorToP5Color(p, this.color, alpha * 100));
    p.ellipse(this.pos.x, this.pos.y, this.size * 2, this.size * 2);
  }
}

export class LightSpot {
  pos: p5.Vector;
  targetPos: p5.Vector;
  radius: number;
  targetRadius: number;
  color: ColorRGB;
  opacity: number;
  flashTime: number;
  mergeStartTime: number;
  isMerging: boolean;
  attractedBy: Stamp | null;
  attractStartTime: number;

  constructor(p: p5, x: number, y: number, color: ColorRGB) {
    this.pos = p.createVector(x, y);
    this.targetPos = p.createVector(x, y);
    this.radius = p.random(SPOT_RADIUS_MIN, SPOT_RADIUS_MAX);
    this.targetRadius = this.radius;
    this.color = { ...color };
    this.opacity = SPOT_OPACITY;
    this.flashTime = 0;
    this.mergeStartTime = 0;
    this.isMerging = false;
    this.attractedBy = null;
    this.attractStartTime = 0;
  }

  triggerFlash(currentTime: number): void {
    this.flashTime = currentTime;
  }

  startMerge(targetX: number, targetY: number, newRadius: number, currentTime: number): void {
    this.targetPos.set(targetX, targetY);
    this.targetRadius = newRadius;
    this.mergeStartTime = currentTime;
    this.isMerging = true;
  }

  startAttraction(stamp: Stamp, currentTime: number): void {
    this.attractedBy = stamp;
    this.attractStartTime = currentTime;
    this.targetPos.set(stamp.pos.x, stamp.pos.y);
    this.mergeStartTime = currentTime;
    this.isMerging = true;
  }

  update(p: p5, currentTime: number): boolean {
    if (this.isMerging) {
      const mergeAge = currentTime - this.mergeStartTime;
      const mergeRatio = Math.min(mergeAge / SPOT_MERGE_DURATION, 1);
      const easedRatio = easeOut(mergeRatio);

      this.pos.lerp(this.targetPos, easedRatio * 0.1);
      this.radius = this.radius + (this.targetRadius - this.radius) * easedRatio * 0.1;

      const dist = p.dist(this.pos.x, this.pos.y, this.targetPos.x, this.targetPos.y);
      if (dist < 2 || mergeRatio >= 1) {
        this.pos.set(this.targetPos.x, this.targetPos.y);
        this.radius = this.targetRadius;
        this.isMerging = false;
        if (this.attractedBy) {
          return false;
        }
      }
    }
    return true;
  }

  draw(p: p5, currentTime: number): void {
    let brightness = 1;
    if (this.flashTime > 0) {
      const flashAge = currentTime - this.flashTime;
      if (flashAge < SPOT_FLASH_DURATION) {
        brightness = SPOT_FLASH_BRIGHTNESS;
      } else {
        this.flashTime = 0;
      }
    }

    const gradient = p.drawingContext.createRadialGradient(
      this.pos.x, this.pos.y, 0,
      this.pos.x, this.pos.y, this.radius
    );

    const centerAlpha = this.opacity * brightness;
    const drawColor = {
      r: Math.min(255, this.color.r * brightness),
      g: Math.min(255, this.color.g * brightness),
      b: Math.min(255, this.color.b * brightness)
    };

    gradient.addColorStop(0, colorToP5ColorString(drawColor, centerAlpha));
    gradient.addColorStop(0.5, colorToP5ColorString(drawColor, centerAlpha * 0.5));
    gradient.addColorStop(1, colorToP5ColorString(drawColor, 0));

    p.noStroke();
    p.drawingContext.fillStyle = gradient;
    p.ellipse(this.pos.x, this.pos.y, this.radius * 2, this.radius * 2);
  }
}

export class Stamp {
  pos: p5.Vector;
  radius: number;
  color: ColorRGB;
  birthTime: number;
  lifetime: number;
  attractDuration: number;
  attractedSpots: LightSpot[];
  mergedRadius: number;
  merged: boolean;

  constructor(p: p5, x: number, y: number, color: ColorRGB) {
    this.pos = p.createVector(x, y);
    this.radius = p.random(STAMP_RADIUS_MIN, STAMP_RADIUS_MAX);
    this.color = { ...color };
    this.birthTime = p.millis();
    this.lifetime = STAMP_DURATION;
    this.attractDuration = STAMP_ATTRACTION_DURATION;
    this.attractedSpots = [];
    this.mergedRadius = this.radius * 1.5;
    this.merged = false;
  }

  canAttract(currentTime: number): boolean {
    return !this.merged && (currentTime - this.birthTime) < this.attractDuration;
  }

  addAttractedSpot(spot: LightSpot): boolean {
    if (this.attractedSpots.length < STAMP_ATTRACTION_COUNT) {
      this.attractedSpots.push(spot);
      this.mergedRadius += SPOT_MERGE_RADIUS_INCREMENT;
      if (this.attractedSpots.length >= STAMP_ATTRACTION_COUNT) {
        this.merged = true;
      }
      return true;
    }
    return false;
  }

  update(currentTime: number): boolean {
    return (currentTime - this.birthTime) < (this.lifetime + this.attractDuration);
  }

  draw(p: p5, currentTime: number): void {
    const age = currentTime - this.birthTime;
    let alpha: number;

    if (age < this.lifetime) {
      alpha = 0.6 * (1 - age / this.lifetime) + 0.2;
    } else {
      alpha = 0.1;
    }

    p.push();
    p.translate(this.pos.x, this.pos.y);

    const gradient = p.drawingContext.createRadialGradient(0, 0, 0, 0, 0, this.mergedRadius);
    gradient.addColorStop(0, colorToP5ColorString(this.color, alpha * 0.8));
    gradient.addColorStop(0.6, colorToP5ColorString(this.color, alpha * 0.3));
    gradient.addColorStop(1, colorToP5ColorString(this.color, 0));

    p.noStroke();
    p.drawingContext.fillStyle = gradient;
    p.ellipse(0, 0, this.mergedRadius * 2, this.mergedRadius * 2);

    p.rotate(p.radians(currentTime * 0.05));
    p.noFill();
    p.stroke(colorToP5Color(p, this.color, alpha * 200));
    p.strokeWeight(1.5);
    p.ellipse(0, 0, this.radius * 2.2, this.radius * 0.7);
    p.stroke(colorToP5Color(p, this.color, alpha * 120));
    p.ellipse(0, 0, this.radius * 2.6, this.radius * 0.5);

    p.pop();
  }
}

export class ExplosionParticle {
  pos: p5.Vector;
  vel: p5.Vector;
  color: ColorRGB;
  size: number;
  birthTime: number;
  lifetime: number;

  constructor(p: p5, x: number, y: number, angle: number, color: ColorRGB) {
    this.pos = p.createVector(x, y);
    const speed = p.random(2, 6);
    this.vel = p.createVector(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.color = { ...color };
    this.size = p.random(1, 3);
    this.birthTime = p.millis();
    this.lifetime = EXPLOSION_DURATION;
  }

  update(p: p5, currentTime: number): boolean {
    this.pos.add(this.vel);
    this.vel.mult(0.96);
    const age = currentTime - this.birthTime;
    return age < this.lifetime;
  }

  draw(p: p5, currentTime: number): void {
    const age = currentTime - this.birthTime;
    const alpha = Math.max(0, 1 - age / this.lifetime);
    p.noStroke();
    p.fill(colorToP5Color(p, this.color, alpha * 255));
    p.ellipse(this.pos.x, this.pos.y, this.size, this.size);
  }

  getPosition(): { x: number; y: number } {
    return { x: this.pos.x, y: this.pos.y };
  }
}

function colorToP5ColorString(c: ColorRGB, alpha: number): string {
  return `rgba(${Math.floor(c.r)},${Math.floor(c.g)},${Math.floor(c.b)},${alpha})`;
}

export class ParticleSystem {
  p: p5;
  particles: TrailParticle[];
  spots: LightSpot[];
  stamps: Stamp[];
  explosionParticles: ExplosionParticle[];
  pendingSettleParticles: TrailParticle[];
  settlingGroups: Map<string, { particles: TrailParticle[]; color: ColorRGB }>;
  lastMousePos: p5.Vector | null;
  currentColor: ColorRGB;

  constructor(p: p5) {
    this.p = p;
    this.particles = [];
    this.spots = [];
    this.stamps = [];
    this.explosionParticles = [];
    this.pendingSettleParticles = [];
    this.settlingGroups = new Map();
    this.lastMousePos = null;
    this.currentColor = { ...PARTICLE_COLOR_DEFAULT };
  }

  setColor(color: ColorRGB): void {
    this.currentColor = { ...color };
  }

  emit(x: number, y: number, velocityX: number, velocityY: number, count: number): void {
    const p = this.p;
    const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
    const angle = speed > 0 ? Math.atan2(velocityY, velocityX) : p.random(p.TWO_PI);

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) {
        this.particles.shift();
      }

      const offsetX = p.random(-3, 3);
      const offsetY = p.random(-3, 3);
      const particle = new TrailParticle(
        p,
        x + offsetX,
        y + offsetY,
        angle,
        speed,
        this.currentColor
      );
      this.particles.push(particle);
    }
  }

  startSettling(): void {
    const currentTime = this.p.millis();
    for (const particle of this.particles) {
      particle.startSettling(currentTime);
    }
  }

  addStamp(x: number, y: number, color: ColorRGB): void {
    const stamp = new Stamp(this.p, x, y, color);
    this.stamps.push(stamp);

    const currentTime = this.p.millis();
    const availableSpots = this.spots.filter(s => !s.attractedBy && !s.isMerging);
    availableSpots.sort((a, b) => {
      const distA = this.p.dist(a.pos.x, a.pos.y, x, y);
      const distB = this.p.dist(b.pos.x, b.pos.y, x, y);
      return distA - distB;
    });

    for (let i = 0; i < Math.min(STAMP_ATTRACTION_COUNT, availableSpots.length); i++) {
      const spot = availableSpots[i];
      if (stamp.addAttractedSpot(spot)) {
        spot.startAttraction(stamp, currentTime);
      }
    }
  }

  explodeSpot(spot: LightSpot): void {
    const p = this.p;
    const currentTime = p.millis();

    const count = Math.floor(p.random(EXPLOSION_PARTICLE_MIN, EXPLOSION_PARTICLE_MAX + 1));
    const angleStep = p.TWO_PI / count;

    for (let i = 0; i < count; i++) {
      const angle = i * angleStep + p.random(-0.2, 0.2);
      const explosionParticle = new ExplosionParticle(
        p,
        spot.pos.x,
        spot.pos.y,
        angle,
        spot.color
      );
      this.explosionParticles.push(explosionParticle);
    }

    const index = this.spots.indexOf(spot);
    if (index > -1) {
      this.spots.splice(index, 1);
    }

    this.playExplosionSound();
  }

  playExplosionSound(): void {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 440;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch {
    }
  }

  update(): void {
    const p = this.p;
    const currentTime = p.millis();

    this.particles = this.particles.filter(particle => {
      const alive = particle.update(p, currentTime);
      if (!alive && particle.state === ParticleState.FALLING) {
        this.pendingSettleParticles.push(particle);
        return false;
      }
      return alive;
    });

    this.checkSettleGroups();

    this.spots = this.spots.filter(spot => spot.update(p, currentTime));

    this.stamps = this.stamps.filter(stamp => stamp.update(currentTime));

    this.explosionParticles = this.explosionParticles.filter(particle => {
      const alive = particle.update(p, currentTime);
      if (alive) {
        const pos = particle.getPosition();
        for (const spot of this.spots) {
          const dist = p.dist(pos.x, pos.y, spot.pos.x, spot.pos.y);
          if (dist < spot.radius) {
            spot.triggerFlash(currentTime);
          }
        }
      }
      return alive;
    });
  }

  private checkSettleGroups(): void {
    const p = this.p;
    if (this.pendingSettleParticles.length < 30) return;

    const groups = new Map<string, { particles: TrailParticle[]; sumX: number; sumY: number; color: ColorRGB }>();
    const gridSize = 100;

    for (const particle of this.pendingSettleParticles) {
      const gridX = Math.floor(particle.pos.x / gridSize);
      const gridY = Math.floor(particle.pos.y / gridSize);
      const key = `${gridX},${gridY}`;

      if (!groups.has(key)) {
        groups.set(key, {
          particles: [],
          sumX: 0,
          sumY: 0,
          color: { ...particle.targetColor }
        });
      }

      const group = groups.get(key)!;
      group.particles.push(particle);
      group.sumX += particle.pos.x;
      group.sumY += particle.pos.y;
    }

    for (const group of groups.values()) {
      if (group.particles.length >= 10) {
        const avgX = group.sumX / group.particles.length;
        const avgY = group.sumY / group.particles.length;
        const spot = new LightSpot(p, avgX, avgY, group.color);
        this.spots.push(spot);
      }
    }

    this.pendingSettleParticles = [];
  }

  draw(): void {
    const p = this.p;
    const currentTime = p.millis();

    for (const stamp of this.stamps) {
      stamp.draw(p, currentTime);
    }

    for (const spot of this.spots) {
      spot.draw(p, currentTime);
    }

    p.push();
    p.blendMode(p.ADD);
    for (const particle of this.particles) {
      particle.draw(p, currentTime);
    }
    for (const particle of this.explosionParticles) {
      particle.draw(p, currentTime);
    }
    p.pop();
  }

  findSpotAt(x: number, y: number): LightSpot | null {
    for (const spot of this.spots) {
      const dist = this.p.dist(x, y, spot.pos.x, spot.pos.y);
      if (dist < spot.radius) {
        return spot;
      }
    }
    return null;
  }

  getActiveSettlingParticleCount(): number {
    return this.particles.filter(p => p.state !== ParticleState.TRAIL).length
      + this.pendingSettleParticles.length;
  }
}

export class GalaxyBand {
  p: p5;
  particles: { x: number; y: number; size: number; speed: number; alpha: number }[];
  yBase: number;

  constructor(p: p5) {
    this.p = p;
    this.particles = [];
    this.yBase = 0;
    this.initParticles();
  }

  initParticles(): void {
    const p = this.p;
    for (let i = 0; i < 200; i++) {
      this.particles.push({
        x: p.random(p.width),
        y: p.random(0, p.height * 0.15),
        size: p.random(0.5, 2),
        speed: p.random(0.1, 0.5),
        alpha: p.random(0.05, 0.2)
      });
    }
  }

  resize(): void {
    this.yBase = this.p.height * 0.85;
  }

  update(): void {
    const p = this.p;
    for (const particle of this.particles) {
      particle.x += particle.speed;
      if (particle.x > p.width) {
        particle.x = -10;
        particle.y = p.random(0, p.height * 0.15);
      }
    }
  }

  draw(): void {
    const p = this.p;
    p.push();
    p.noStroke();

    const gradient = p.drawingContext.createLinearGradient(0, this.yBase - p.height * 0.1, 0, p.height);
    gradient.addColorStop(0, 'rgba(100, 100, 180, 0)');
    gradient.addColorStop(0.3, 'rgba(150, 120, 200, 0.08)');
    gradient.addColorStop(0.6, 'rgba(180, 140, 220, 0.05)');
    gradient.addColorStop(1, 'rgba(100, 80, 160, 0)');

    p.drawingContext.fillStyle = gradient;
    p.rect(0, this.yBase - p.height * 0.1, p.width, p.height * 0.2);

    for (const particle of this.particles) {
      const py = this.yBase - p.height * 0.08 + particle.y;
      p.fill(255, 255, 255, particle.alpha * 255);
      p.ellipse(particle.x, py, particle.size, particle.size);
    }

    p.pop();
  }
}
