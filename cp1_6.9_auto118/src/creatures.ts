import p5 from 'p5';
import { SoundWave, SoundManager } from './sound';

export type CreatureType = 'jellyfish' | 'fish' | 'turtle';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: p5.Color;
  size: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  size: number;
}

export abstract class Creature {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public baseSpeed: number;
  public radius: number;
  public color: p5.Color;
  public alpha: number;
  public type: CreatureType;
  public active: boolean;
  public lifeTime: number;
  public maxLifeTime: number;
  public isTemporary: boolean;
  public sinPhase: number;
  public sinAmplitude: number;
  public sinSpeed: number;
  public originalX: number;

  protected p: p5;
  protected collidedWaves: Set<number>;
  protected waveIdCounter: number;

  constructor(p: p5, x: number, y: number, type: CreatureType) {
    this.p = p;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.baseSpeed = 0;
    this.radius = 0;
    this.color = p.color(255);
    this.alpha = 0.6;
    this.type = type;
    this.active = true;
    this.lifeTime = 0;
    this.maxLifeTime = Infinity;
    this.isTemporary = false;
    this.sinPhase = Math.random() * Math.PI * 2;
    this.sinAmplitude = 0.1;
    this.sinSpeed = 1;
    this.originalX = x;
    this.collidedWaves = new Set();
    this.waveIdCounter = 0;
  }

  abstract draw(unitScale: number): void;

  update(dt: number, width: number, height: number, unitScale: number): void {
    if (!this.active) return;
    this.lifeTime += dt;
    if (this.isTemporary && this.lifeTime >= this.maxLifeTime) {
      this.active = false;
      return;
    }

    this.sinPhase += this.sinSpeed * dt;
    const sinOffset = Math.sin(this.sinPhase) * this.sinAmplitude * unitScale;

    this.x += this.vx * dt * unitScale;
    this.y += this.vy * dt * unitScale + sinOffset * 0.1;

    const margin = this.radius * unitScale;
    if (this.x < margin) {
      this.x = margin;
      this.vx = Math.abs(this.vx);
    } else if (this.x > width - margin) {
      this.x = width - margin;
      this.vx = -Math.abs(this.vx);
    }
    if (this.y < margin) {
      this.y = margin;
      this.vy = Math.abs(this.vy);
    } else if (this.y > height - margin) {
      this.y = height - margin;
      this.vy = -Math.abs(this.vy);
    }
  }

  checkCollision(wave: SoundWave, unitScale: number): boolean {
    const dist = Math.sqrt((this.x - wave.x) ** 2 + (this.y - wave.y) ** 2);
    return dist < this.radius * unitScale + wave.radius;
  }

  abstract onWaveHit(wave: SoundWave, soundManager: SoundManager, particles: Particle[], unitScale: number): Jellyfish | null;

  moveToward(targetX: number, targetY: number, speedMultiplier: number = 1): void {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      const speed = this.baseSpeed * speedMultiplier;
      this.vx = (dx / dist) * speed;
      this.vy = (dy / dist) * speed;
    }
  }

  scatter(centerX: number, centerY: number, speedMultiplier: number = 1): void {
    const dx = this.x - centerX;
    const dy = this.y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = this.baseSpeed * speedMultiplier * 2;
    this.vx = (dx / dist) * speed;
    this.vy = (dy / dist) * speed;
  }
}

export class Jellyfish extends Creature {
  public tentaclePhase: number;
  public pulsePhase: number;
  public flashTimer: number;
  public parentColor: p5.Color | null;

  constructor(p: p5, x: number, y: number, color?: p5.Color, scale: number = 1) {
    super(p, x, y, 'jellyfish');
    this.radius = (0.3 + Math.random() * 0.2) * scale;
    this.baseSpeed = 0.3 + Math.random() * 0.4;
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * this.baseSpeed;
    this.vy = Math.sin(angle) * this.baseSpeed;
    this.alpha = 0.5;
    this.sinAmplitude = 0.1 + Math.random() * 0.2;
    this.sinSpeed = 1 + Math.random() * 0.5;
    this.tentaclePhase = Math.random() * Math.PI * 2;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.flashTimer = 0;
    this.parentColor = null;

    if (color) {
      this.color = color;
    } else {
      const colors = ['#88ddff', '#ff88dd', '#ddff88'];
      this.color = p.color(colors[Math.floor(Math.random() * colors.length)]);
    }
  }

  draw(unitScale: number): void {
    if (!this.active) return;
    const p = this.p;
    const r = this.radius * unitScale;
    this.tentaclePhase += 0.1;
    this.pulsePhase += 0.05;

    let currentAlpha = this.alpha;
    if (this.flashTimer > 0) {
      currentAlpha = 1.0;
    }
    if (this.isTemporary) {
      const lifeProgress = this.lifeTime / this.maxLifeTime;
      currentAlpha *= (1 - lifeProgress * 0.5);
    }

    p.push();
    p.translate(this.x, this.y);

    const pulse = 1 + Math.sin(this.pulsePhase) * 0.08;
    const bodyR = r * pulse;

    for (let i = 3; i >= 0; i--) {
      const glowR = bodyR + i * 4;
      const glowAlpha = (currentAlpha * 0.15) * (4 - i);
      p.noStroke();
      p.fill(p.red(this.color), p.green(this.color), p.blue(this.color), glowAlpha * 255);
      p.ellipse(0, -bodyR * 0.3, glowR * 2, glowR * 1.2);
    }

    p.noStroke();
    p.fill(p.red(this.color), p.green(this.color), p.blue(this.color), currentAlpha * 255);
    p.ellipse(0, -bodyR * 0.3, bodyR * 2, bodyR * 1.3);

    p.fill(p.red(this.color), p.green(this.color), p.blue(this.color), currentAlpha * 200);
    for (let i = 0; i < 4; i++) {
      const ox = (i - 1.5) * bodyR * 0.4;
      p.ellipse(ox, -bodyR * 0.1, bodyR * 0.3, bodyR * 0.2);
    }

    p.noFill();
    p.stroke(p.red(this.color), p.green(this.color), p.blue(this.color), currentAlpha * 180);
    p.strokeWeight(2);
    for (let i = 0; i < 6; i++) {
      const baseAngle = ((i - 2.5) / 5) * Math.PI * 0.8;
      const baseX = Math.sin(baseAngle) * bodyR * 0.9;
      const baseY = bodyR * 0.2;
      p.beginShape();
      p.vertex(baseX, baseY);
      for (let j = 1; j <= 5; j++) {
        const t = j / 5;
        const wobble = Math.sin(this.tentaclePhase + i * 0.5 + j * 0.3) * r * 0.15;
        const tx = baseX + wobble;
        const ty = baseY + t * bodyR * 2;
        p.vertex(tx, ty);
      }
      p.endShape();
    }

    p.pop();

    if (this.flashTimer > 0) {
      this.flashTimer -= 0.016;
    }
  }

  onWaveHit(wave: SoundWave, _soundManager: SoundManager, _particles: Particle[], _unitScale: number): Jellyfish | null {
    if (this.isTemporary) return null;
    const waveId = (wave as unknown as { __id?: number }).__id ?? this.waveIdCounter++;
    (wave as unknown as { __id: number }).__id = waveId;
    if (this.collidedWaves.has(waveId)) return null;
    this.collidedWaves.add(waveId);

    this.flashTimer = 0.3;
    this.color = wave.color;
    this.parentColor = wave.color;

    const childColor = this.p.color(
      p_red(this.p, wave.color) * 0.8 + p_red(this.p, this.color) * 0.2,
      p_green(this.p, wave.color) * 0.8 + p_green(this.p, this.color) * 0.2,
      p_blue(this.p, wave.color) * 0.8 + p_blue(this.p, this.color) * 0.2,
      200
    );

    const child = new Jellyfish(this.p, this.x, this.y, childColor, 0.5);
    child.vx = this.vx * 0.5;
    child.vy = this.vy * 0.5;
    child.baseSpeed = this.baseSpeed * 0.5;
    child.isTemporary = true;
    child.maxLifeTime = 5;
    child.parentColor = childColor;

    const angle = Math.random() * Math.PI * 2;
    child.vx += Math.cos(angle) * 0.3;
    child.vy += Math.sin(angle) * 0.3;

    return child;
  }
}

export class Fish extends Creature {
  public scareTimer: number;
  public scareVX: number;
  public scareVY: number;
  public tailPhase: number;
  public lightTrail: TrailPoint[];

  constructor(p: p5, x: number, y: number) {
    super(p, x, y, 'fish');
    this.radius = 0.3;
    this.baseSpeed = 0.5 + Math.random() * 0.5;
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * this.baseSpeed;
    this.vy = Math.sin(angle) * this.baseSpeed;
    this.alpha = 0.8;
    this.sinAmplitude = 0.1 + Math.random() * 0.2;
    this.sinSpeed = 2 + Math.random();
    this.scareTimer = 0;
    this.scareVX = 0;
    this.scareVY = 0;
    this.tailPhase = Math.random() * Math.PI * 2;
    this.lightTrail = [];

    const colors = ['#ffaa66', '#66ffaa', '#aa66ff'];
    this.color = p.color(colors[Math.floor(Math.random() * colors.length)]);
  }

  draw(unitScale: number): void {
    if (!this.active) return;
    const p = this.p;
    const w = this.radius * unitScale * 0.8;
    const h = this.radius * unitScale * 0.4;
    this.tailPhase += 0.3;

    const angle = Math.atan2(this.scareTimer > 0 ? this.scareVY : this.vy, this.scareTimer > 0 ? this.scareVX : this.vx);

    p.push();
    p.translate(this.x, this.y);
    p.rotate(angle);

    for (let i = this.lightTrail.length - 1; i >= 0; i--) {
      const t = this.lightTrail[i];
      const alpha = (t.life / t.maxLife) * 0.5;
      p.noStroke();
      p.fill(p.red(this.color), p.green(this.color), p.blue(this.color), alpha * 255);
      p.ellipse(-(this.lightTrail.length - i) * 4, 0, t.size * 2, t.size * 2);
    }

    const tailWag = Math.sin(this.tailPhase) * 0.3;
    p.noStroke();
    p.fill(p.red(this.color), p.green(this.color), p.blue(this.color), this.alpha * 200);
    p.triangle(-w, 0, -w * 1.6, -h + tailWag * h, -w * 1.6, h + tailWag * h);

    p.fill(p.red(this.color), p.green(this.color), p.blue(this.color), this.alpha * 255);
    p.ellipse(0, 0, w * 2, h * 2);

    p.triangle(0, -h * 0.5, w * 0.3, -h * 1.5, w * 0.5, -h * 0.5);

    p.fill(255);
    p.ellipse(w * 0.5, -h * 0.2, h * 0.5, h * 0.5);
    p.fill(0);
    p.ellipse(w * 0.6, -h * 0.2, h * 0.25, h * 0.25);

    if (this.scareTimer > 0) {
      p.fill(255, 255, 0, 150);
      p.ellipse(0, 0, w * 2.5, h * 2.5);
    }

    p.pop();
  }

  override update(dt: number, width: number, height: number, unitScale: number): void {
    if (!this.active) return;

    for (let i = this.lightTrail.length - 1; i >= 0; i--) {
      this.lightTrail[i].life -= dt;
      if (this.lightTrail[i].life <= 0) {
        this.lightTrail.splice(i, 1);
      }
    }

    if (this.scareTimer > 0) {
      this.scareTimer -= dt;
      const oldVx = this.vx;
      const oldVy = this.vy;
      this.vx = this.scareVX;
      this.vy = this.scareVY;
      super.update(dt, width, height, unitScale);
      if (this.scareTimer <= 0) {
        this.vx = oldVx;
        this.vy = oldVy;
      }
    } else {
      super.update(dt, width, height, unitScale);
    }
  }

  onWaveHit(wave: SoundWave, _soundManager: SoundManager, particles: Particle[], _unitScale: number): Jellyfish | null {
    const waveId = (wave as unknown as { __id?: number }).__id ?? this.waveIdCounter++;
    (wave as unknown as { __id: number }).__id = waveId;
    if (this.collidedWaves.has(waveId)) return null;
    this.collidedWaves.add(waveId);

    const dx = this.x - wave.x;
    const dy = this.y - wave.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    this.scareVX = (dx / dist) * this.baseSpeed * 2;
    this.scareVY = (dy / dist) * this.baseSpeed * 2;
    this.scareTimer = 1;

    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1;
      particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5,
        maxLife: 0.5,
        color: wave.color,
        size: 2 + Math.random() * 2
      });
    }

    return null;
  }
}

export class Turtle extends Creature {
  public brightnessTimer: number;
  public shellPattern: number[];
  public flipperPhase: number;

  constructor(p: p5, x: number, y: number) {
    super(p, x, y, 'turtle');
    this.radius = 0.6;
    this.baseSpeed = 0.3;
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * this.baseSpeed;
    this.vy = Math.sin(angle) * this.baseSpeed;
    this.alpha = 0.6;
    this.sinAmplitude = 0.1;
    this.sinSpeed = 0.8;
    this.brightnessTimer = 0;
    this.flipperPhase = Math.random() * Math.PI * 2;
    this.color = p.color('#66dd88');
    this.shellPattern = [];
    for (let i = 0; i < 13; i++) {
      this.shellPattern.push(Math.random());
    }
  }

  draw(unitScale: number): void {
    if (!this.active) return;
    const p = this.p;
    const r = this.radius * unitScale;
    this.flipperPhase += 0.08;

    let currentAlpha = this.alpha;
    if (this.brightnessTimer > 0) {
      currentAlpha = 0.9;
    }

    const angle = Math.atan2(this.vy, this.vx);

    p.push();
    p.translate(this.x, this.y);
    p.rotate(angle);

    const flipperFlap = Math.sin(this.flipperPhase) * 0.3;
    p.noStroke();
    p.fill(p.red(this.color) * 0.7, p.green(this.color) * 0.7, p.blue(this.color) * 0.7, currentAlpha * 200);
    p.ellipse(-r * 0.2, -r * 0.8 + flipperFlap * r * 0.3, r * 0.5, r * 0.25);
    p.ellipse(-r * 0.2, r * 0.8 - flipperFlap * r * 0.3, r * 0.5, r * 0.25);
    p.ellipse(-r * 0.8, -r * 0.5 + flipperFlap * r * 0.2, r * 0.4, r * 0.2);
    p.ellipse(-r * 0.8, r * 0.5 - flipperFlap * r * 0.2, r * 0.4, r * 0.2);

    p.fill(p.red(this.color) * 0.6, p.green(this.color) * 0.6, p.blue(this.color) * 0.6, currentAlpha * 200);
    p.ellipse(r * 0.9, 0, r * 0.5, r * 0.4);

    p.fill(p.red(this.color) * 0.5, p.green(this.color) * 0.5, p.blue(this.color) * 0.5, currentAlpha * 200);
    for (let i = 0; i < 4; i++) {
      const tailX = r * 1.05 + i * 4;
      const tailY = Math.sin(this.flipperPhase * 2 + i) * 2;
      p.ellipse(tailX, tailY, 6 - i, 4 - i * 0.5);
    }

    p.fill(255);
    p.ellipse(r * 1.05, -r * 0.12, r * 0.1, r * 0.1);
    p.ellipse(r * 1.05, r * 0.12, r * 0.1, r * 0.1);
    p.fill(0);
    p.ellipse(r * 1.1, -r * 0.12, r * 0.05, r * 0.05);
    p.ellipse(r * 1.1, r * 0.12, r * 0.05, r * 0.05);

    p.fill(p.red(this.color), p.green(this.color), p.blue(this.color), currentAlpha * 255);
    p.ellipse(0, 0, r * 1.8, r * 1.4);

    p.stroke(p.red(this.color) * 0.4, p.green(this.color) * 0.4, p.blue(this.color) * 0.4, currentAlpha * 200);
    p.strokeWeight(1.5);
    p.noFill();
    const hexPatterns = [
      { x: 0, y: 0, s: 0.35 },
      { x: -0.35, y: -0.2, s: 0.25 }, { x: 0.35, y: -0.2, s: 0.25 },
      { x: -0.35, y: 0.2, s: 0.25 }, { x: 0.35, y: 0.2, s: 0.25 },
      { x: 0, y: -0.45, s: 0.22 }, { x: 0, y: 0.45, s: 0.22 },
      { x: -0.6, y: 0, s: 0.22 }, { x: 0.6, y: 0, s: 0.22 },
    ];
    for (let i = 0; i < hexPatterns.length; i++) {
      const hp = hexPatterns[i];
      const pr = r * hp.s;
      const px = hp.x * r;
      const py = hp.y * r;
      p.push();
      p.translate(px, py);
      p.beginShape();
      for (let j = 0; j < 6; j++) {
        const a = (j / 6) * Math.PI * 2;
        p.vertex(Math.cos(a) * pr, Math.sin(a) * pr);
      }
      p.endShape(p.CLOSE);
      p.pop();
    }

    p.pop();

    if (this.brightnessTimer > 0) {
      this.brightnessTimer -= 0.016;
    }
  }

  onWaveHit(wave: SoundWave, soundManager: SoundManager, _particles: Particle[], unitScale: number): Jellyfish | null {
    const waveId = (wave as unknown as { __id?: number }).__id ?? this.waveIdCounter++;
    (wave as unknown as { __id: number }).__id = waveId;
    if (this.collidedWaves.has(waveId)) return null;
    this.collidedWaves.add(waveId);

    this.brightnessTimer = 0.3;

    const dx = wave.x - this.x;
    const dy = wave.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;
    const reflectAngle = Math.atan2(ny, nx) + Math.PI;

    soundManager.emitReflectedWave(
      this.x + nx * this.radius * unitScale,
      this.y + ny * this.radius * unitScale,
      wave,
      this.color,
      reflectAngle,
      unitScale
    );

    return null;
  }
}

export class SpatialGrid {
  private grid: (Creature | null)[][][];
  private cols: number;
  private rows: number;
  private cellWidth: number;
  private cellHeight: number;

  constructor(width: number, height: number, cols: number = 10, rows: number = 10) {
    this.cols = cols;
    this.rows = rows;
    this.cellWidth = width / cols;
    this.cellHeight = height / rows;
    this.grid = [];
    for (let i = 0; i < cols; i++) {
      this.grid[i] = [];
      for (let j = 0; j < rows; j++) {
        this.grid[i][j] = [];
      }
    }
  }

  resize(width: number, height: number): void {
    this.cellWidth = width / this.cols;
    this.cellHeight = height / this.rows;
  }

  clear(): void {
    for (let i = 0; i < this.cols; i++) {
      for (let j = 0; j < this.rows; j++) {
        this.grid[i][j] = [];
      }
    }
  }

  insert(creature: Creature): void {
    const col = Math.floor(Math.min(Math.max(creature.x / this.cellWidth, 0), this.cols - 1));
    const row = Math.floor(Math.min(Math.max(creature.y / this.cellHeight, 0), this.rows - 1));
    this.grid[col][row].push(creature);
  }

  getNearby(x: number, y: number): Creature[] {
    const col = Math.floor(Math.min(Math.max(x / this.cellWidth, 0), this.cols - 1));
    const row = Math.floor(Math.min(Math.max(y / this.cellHeight, 0), this.rows - 1));
    const result: Creature[] = [];
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        const nc = col + dc;
        const nr = row + dr;
        if (nc >= 0 && nc < this.cols && nr >= 0 && nr < this.rows) {
          for (const c of this.grid[nc][nr]) {
            if (c) result.push(c);
          }
        }
      }
    }
    return result;
  }
}

function p_red(p: p5, c: p5.Color): number {
  return p.red(c);
}
function p_green(p: p5, c: p5.Color): number {
  return p.green(c);
}
function p_blue(p: p5, c: p5.Color): number {
  return p.blue(c);
}
