import p5 from 'p5';
import { COLORS } from './effects';
import { EffectSystem } from './effects';

export const CANVAS_SIZE = 800;
export const CENTER_X = CANVAS_SIZE / 2;
export const CENTER_Y = CANVAS_SIZE / 2;
export const ORBIT_INNER_RADIUS = 200;
export const ORBIT_OUTER_RADIUS = 240;
export const ORBIT_MID_RADIUS = (ORBIT_INNER_RADIUS + ORBIT_OUTER_RADIUS) / 2;
export const SLOT_COUNT = 36;
export const STAR_RADIUS = 14;
export const NUCLEUS_RADIUS = 18;
export const COLLISION_DISTANCE = 25;

export interface StarCluster {
  slotIndex: number;
  angle: number;
  color: string;
  alive: boolean;
  pulsePhase: number;
}

export interface StarNucleus {
  angle: number;
  angularSpeed: number;
  color: string;
  active: boolean;
  trailTimer: number;
  lastColor: string;
  consecutiveHits: number;
  lastHitColor: string | null;
}

export class StarSystem {
  private sketch: p5;
  private effects: EffectSystem;
  private stars: (StarCluster | null)[] = [];
  private nucleus: StarNucleus;
  private availableColors: string[] = [...COLORS];
  public score = 0;
  public shotsLeft = 10;
  public gameOver = false;
  public regroupMessageTime = 0;

  constructor(sketch: p5, effects: EffectSystem) {
    this.sketch = sketch;
    this.effects = effects;
    this.nucleus = this.createIdleNucleus();
    this.initStars();
  }

  private createIdleNucleus(): StarNucleus {
    return {
      angle: 0,
      angularSpeed: 0,
      color: COLORS[0],
      active: false,
      trailTimer: 0,
      lastColor: COLORS[0],
      consecutiveHits: 0,
      lastHitColor: null
    };
  }

  private initStars(): void {
    this.stars = [];
    for (let i = 0; i < SLOT_COUNT; i++) {
      this.stars.push(this.createStar(i));
    }
  }

  private createStar(slotIndex: number): StarCluster {
    const angle = (slotIndex / SLOT_COUNT) * this.sketch.TWO_PI - this.sketch.HALF_PI;
    const color = this.availableColors[Math.floor(this.sketch.random(this.availableColors.length))];
    return {
      slotIndex,
      angle,
      color,
      alive: true,
      pulsePhase: this.sketch.random(this.sketch.TWO_PI)
    };
  }

  getSlotPosition(slotIndex: number): { x: number; y: number } {
    const angle = (slotIndex / SLOT_COUNT) * this.sketch.TWO_PI - this.sketch.HALF_PI;
    return {
      x: CENTER_X + this.sketch.cos(angle) * ORBIT_MID_RADIUS,
      y: CENTER_Y + this.sketch.sin(angle) * ORBIT_MID_RADIUS
    };
  }

  getNucleusPosition(): { x: number; y: number } {
    if (!this.nucleus.active) {
      return { x: CENTER_X, y: CENTER_Y };
    }
    return {
      x: CENTER_X + this.sketch.cos(this.nucleus.angle) * ORBIT_MID_RADIUS,
      y: CENTER_Y + this.sketch.sin(this.nucleus.angle) * ORBIT_MID_RADIUS
    };
  }

  updateNucleusColor(mouseX: number, mouseY: number): void {
    if (this.nucleus.active) return;
    const dx = mouseX - CENTER_X;
    const dy = mouseY - CENTER_Y;
    const dist = this.sketch.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;
    const angle = this.sketch.atan2(dy, dx);
    const normalizedAngle = (angle + this.sketch.PI) / this.sketch.TWO_PI;
    const colorIndex = Math.floor(normalizedAngle * COLORS.length) % COLORS.length;
    this.nucleus.color = COLORS[colorIndex];
  }

  launchNucleus(mouseX: number, mouseY: number, mouseSpeed: number): void {
    if (this.nucleus.active || this.gameOver || this.shotsLeft <= 0) return;

    this.shotsLeft--;
    const dx = mouseX - CENTER_X;
    const dy = mouseY - CENTER_Y;
    const mouseAngle = this.sketch.atan2(dy, dx);

    const speed = this.sketch.constrain(mouseSpeed, 2, 8);
    const angularSpeed = speed / ORBIT_MID_RADIUS;

    const perpX = -this.sketch.sin(mouseAngle);
    const perpY = this.sketch.cos(mouseAngle);
    const direction = perpX * dx + perpY * dy > 0 ? 1 : -1;

    this.nucleus.angle = mouseAngle;
    this.nucleus.angularSpeed = angularSpeed * direction;
    this.nucleus.active = true;
    this.nucleus.trailTimer = 0;
    this.nucleus.lastColor = this.nucleus.color;
    this.nucleus.consecutiveHits = 0;
    this.nucleus.lastHitColor = null;
  }

  update(deltaTime: number): void {
    if (!this.nucleus.active) return;

    this.nucleus.angle += this.nucleus.angularSpeed;
    if (this.nucleus.angle > this.sketch.PI) this.nucleus.angle -= this.sketch.TWO_PI;
    if (this.nucleus.angle < -this.sketch.PI) this.nucleus.angle += this.sketch.TWO_PI;

    this.nucleus.trailTimer += deltaTime;
    if (this.nucleus.trailTimer > 16) {
      this.nucleus.trailTimer = 0;
      const pos = this.getNucleusPosition();
      this.effects.addTrailParticle(pos.x, pos.y, this.nucleus.color);
    }

    this.checkCollisions();
    this.checkNucleusStop();

    if (this.regroupMessageTime > 0) {
      this.regroupMessageTime -= deltaTime / 1000;
    }
  }

  private checkCollisions(): void {
    const nucleusPos = this.getNucleusPosition();

    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      if (!star || !star.alive) continue;

      const starPos = this.getSlotPosition(i);
      const dx = nucleusPos.x - starPos.x;
      const dy = nucleusPos.y - starPos.y;
      const dist = this.sketch.sqrt(dx * dx + dy * dy);

      if (dist <= COLLISION_DISTANCE) {
        if (star.color === this.nucleus.color) {
          this.destroyStar(i, star);
        }
      }
    }
  }

  private destroyStar(index: number, star: StarCluster): void {
    const pos = this.getSlotPosition(index);
    this.effects.addExplosionParticles(pos.x, pos.y, star.color);
    this.effects.addShockwave(pos.x, pos.y, star.color);

    if (this.nucleus.lastHitColor === star.color) {
      this.nucleus.consecutiveHits++;
    } else {
      this.nucleus.consecutiveHits = 1;
      this.nucleus.lastHitColor = star.color;
    }

    if (this.nucleus.consecutiveHits >= 3) {
      this.effects.triggerOrbitFlash();
      this.effects.addSpiralParticles(pos.x, pos.y);
      this.effects.triggerScreenShake();
      this.nucleus.consecutiveHits = 0;
    }

    this.score += 10;
    star.alive = false;

    this.checkColorDepletion();
  }

  private checkColorDepletion(): void {
    const colorCounts: Map<string, number> = new Map();
    for (const color of this.availableColors) {
      colorCounts.set(color, 0);
    }

    for (const star of this.stars) {
      if (star && star.alive) {
        const count = colorCounts.get(star.color) || 0;
        colorCounts.set(star.color, count + 1);
      }
    }

    let needsRegroup = false;
    for (const [color, count] of colorCounts) {
      if (count === 0) {
        const idx = this.availableColors.indexOf(color);
        if (idx !== -1) {
          this.availableColors.splice(idx, 1);
          needsRegroup = true;
        }
      }
    }

    if (needsRegroup) {
      if (this.availableColors.length === 0) {
        this.availableColors = [...COLORS];
      }
      this.regroupStars();
      this.regroupMessageTime = 1.5;
    }
  }

  private regroupStars(): void {
    const aliveStars: StarCluster[] = [];
    for (const star of this.stars) {
      if (star && star.alive) {
        aliveStars.push(star);
      }
    }

    this.stars = [];
    for (let i = 0; i < SLOT_COUNT; i++) {
      if (i < aliveStars.length) {
        const star = aliveStars[i];
        star.slotIndex = i;
        star.angle = (i / SLOT_COUNT) * this.sketch.TWO_PI - this.sketch.HALF_PI;
        this.stars.push(star);
      } else {
        this.stars.push(this.createStar(i));
      }
    }
  }

  private checkNucleusStop(): void {
    const aliveSameColor = this.stars.some(
      s => s && s.alive && s.color === this.nucleus.color
    );
    if (!aliveSameColor) {
      this.resetNucleus();
    }
  }

  private resetNucleus(): void {
    if (this.shotsLeft <= 0) {
      this.gameOver = true;
    }
    this.nucleus = this.createIdleNucleus();
  }

  isNucleusActive(): boolean {
    return this.nucleus.active;
  }

  getNucleusColor(): string {
    return this.nucleus.color;
  }

  draw(time: number): void {
    this.drawOrbit();
    this.drawStars(time);
    this.drawNucleus(time);
  }

  private drawOrbit(): void {
    const s = this.sketch;
    const flashAlpha = this.effects.getOrbitFlashAlpha();

    s.drawingContext.shadowBlur = 10 + flashAlpha * 50;
    s.drawingContext.shadowColor = '#4466aa';

    s.noFill();
    s.stroke(68, 102, 170, 150 + flashAlpha * 255);
    s.strokeWeight(ORBIT_OUTER_RADIUS - ORBIT_INNER_RADIUS);
    s.circle(CENTER_X, CENTER_Y, ORBIT_MID_RADIUS * 2);

    s.stroke(100, 140, 220, 200);
    s.strokeWeight(2);
    s.circle(CENTER_X, CENTER_Y, ORBIT_INNER_RADIUS * 2);
    s.circle(CENTER_X, CENTER_Y, ORBIT_OUTER_RADIUS * 2);

    s.drawingContext.shadowBlur = 0;
    s.strokeWeight(1);
  }

  private drawStars(time: number): void {
    const s = this.sketch;
    for (const star of this.stars) {
      if (!star || !star.alive) continue;
      const pos = this.getSlotPosition(star.slotIndex);
      const pulse = 1 + 0.1 * s.sin(time * 2 + star.pulsePhase);

      s.drawingContext.shadowBlur = 15;
      s.drawingContext.shadowColor = star.color;
      s.noStroke();
      s.fill(star.color);
      s.circle(pos.x, pos.y, STAR_RADIUS * 2 * pulse);

      s.drawingContext.shadowBlur = 0;
      s.fill(255, 255, 255, 150);
      s.circle(pos.x, pos.y, STAR_RADIUS * 0.5 * pulse);
    }
  }

  private drawNucleus(time: number): void {
    const s = this.sketch;
    const pos = this.getNucleusPosition();
    const pulse = 1 + 0.05 * s.sin(time * 3);

    s.drawingContext.shadowBlur = 20;
    s.drawingContext.shadowColor = '#ffffff';

    s.stroke(255, 255, 255, 255);
    s.strokeWeight(3);
    s.noFill();
    s.circle(pos.x, pos.y, (NUCLEUS_RADIUS + 3) * 2 * pulse);

    s.drawingContext.shadowColor = this.nucleus.color;
    s.noStroke();
    s.fill(this.nucleus.color);
    s.circle(pos.x, pos.y, NUCLEUS_RADIUS * 2 * pulse);

    s.drawingContext.shadowBlur = 0;
    s.fill(255, 255, 255, 200);
    s.circle(pos.x, pos.y, NUCLEUS_RADIUS * 0.6 * pulse);
  }

  drawAimLine(mouseX: number, mouseY: number): void {
    if (this.nucleus.active || this.gameOver) return;

    const s = this.sketch;
    const dx = mouseX - CENTER_X;
    const dy = mouseY - CENTER_Y;
    const dist = s.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;

    s.stroke(255, 255, 255, 100);
    s.strokeWeight(2);
    s.drawingContext.setLineDash([5, 5]);
    s.line(CENTER_X, CENTER_Y, mouseX, mouseY);
    s.drawingContext.setLineDash([]);
    s.strokeWeight(1);
  }
}
