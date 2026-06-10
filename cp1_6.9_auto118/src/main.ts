import p5 from 'p5';
import { Creature, Jellyfish, Fish, Turtle, Particle, SpatialGrid, TrailPoint } from './creatures';
import { SoundManager, SoundWave } from './sound';
import { UIManager, FullscreenPulse } from './ui';

interface FloatingParticle {
  x: number;
  y: number;
  size: number;
  alpha: number;
  vy: number;
  phase: number;
  phaseSpeed: number;
}

interface ScatterTrail {
  points: { x: number; y: number; life: number; maxLife: number }[];
}

class OceanBiosphere {
  private p: p5;
  private canvas: p5.Renderer | null = null;
  private container: HTMLElement | null = null;
  private unitScale: number = 100;

  private soundManager: SoundManager;
  private uiManager: UIManager;
  private spatialGrid: SpatialGrid;

  private creatures: Creature[] = [];
  private floatingParticles: FloatingParticle[] = [];
  private hitParticles: Particle[] = [];
  private scatterTrails: ScatterTrail[] = [];
  private fullscreenPulses: FullscreenPulse[] = [];

  private energy: number = 0;
  private energyFull: boolean = false;
  private gatherPhase: 'idle' | 'paused' | 'gathering' | 'scattering' = 'idle';
  private gatherTimer: number = 0;
  private savedVelocities: { vx: number; vy: number }[] = [];

  private lastTime: number = 0;
  private readonly MAX_HIT_PARTICLES = 500;

  constructor(p: p5) {
    this.p = p;
    this.soundManager = new SoundManager(p);
    this.uiManager = new UIManager(p);
    this.spatialGrid = new SpatialGrid(800, 600, 10, 10);
  }

  setup(): void {
    this.container = document.getElementById('canvas-container');
    this.resizeCanvas();

    this.soundManager = new SoundManager(this.p);
    this.uiManager = new UIManager(this.p);
    this.spatialGrid = new SpatialGrid(this.p.width, this.p.height, 10, 10);

    this.initCreatures();
    this.initFloatingParticles();

    this.uiManager.setupKeyListener();
    this.uiManager.onKeyPress = (key: string) => this.handleKeyPress(key);

    const defaultConfig = this.soundManager.getConfigForKey('A');
    this.uiManager.updateCurrentSound(defaultConfig);

    window.addEventListener('resize', () => this.resizeCanvas());

    this.lastTime = performance.now();
    this.p.frameRate(60);
  }

  private resizeCanvas(): void {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (this.canvas) {
      this.p.remove();
    }
    this.canvas = this.p.createCanvas(width, height);
    this.canvas.parent(this.container);
    this.unitScale = Math.min(width, height) / 8;
    this.spatialGrid.resize(width, height);
    if (this.creatures.length > 0) {
      this.repositionCreatures();
    }
  }

  private repositionCreatures(): void {
    for (const c of this.creatures) {
      c.x = Math.min(Math.max(c.x, 50), this.p.width - 50);
      c.y = Math.min(Math.max(c.y, 50), this.p.height - 50);
    }
  }

  private initCreatures(): void {
    this.creatures = [];
    const w = this.p.width;
    const h = this.p.height;
    const margin = 100;

    for (let i = 0; i < 4; i++) {
      this.creatures.push(new Jellyfish(
        this.p,
        margin + Math.random() * (w - margin * 2),
        margin + Math.random() * (h - margin * 2)
      ));
    }

    for (let i = 0; i < 3; i++) {
      this.creatures.push(new Fish(
        this.p,
        margin + Math.random() * (w - margin * 2),
        margin + Math.random() * (h - margin * 2)
      ));
    }

    this.creatures.push(new Turtle(
      this.p,
      margin + Math.random() * (w - margin * 2),
      margin + Math.random() * (h - margin * 2)
    ));
  }

  private initFloatingParticles(): void {
    this.floatingParticles = [];
    const count = 300;
    for (let i = 0; i < count; i++) {
      this.floatingParticles.push({
        x: Math.random() * this.p.width,
        y: Math.random() * this.p.height,
        size: 1 + Math.random() * 2,
        alpha: 0.2 + Math.random() * 0.4,
        vy: -0.3 - Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.5 + Math.random() * 1
      });
    }
  }

  private handleKeyPress(key: string): void {
    const config = this.soundManager.getConfigForKey(key);
    this.uiManager.updateCurrentSound(config);

    const emitX = this.p.width / 2;
    const emitY = this.p.height - 40;
    this.soundManager.emitWave(emitX, emitY, key, this.unitScale * 0.01);

    if (!this.energyFull) {
      this.energy = Math.min(100, this.energy + 5);
      this.uiManager.updateEnergy(this.energy);
      if (this.energy >= 100) {
        this.triggerEnergyFull(config);
      }
    }
  }

  private triggerEnergyFull(config: { frequency: number; color: p5.Color; key: string }): void {
    this.energyFull = true;
    this.gatherPhase = 'paused';
    this.gatherTimer = 0.5;

    const keyCode = config.key.charCodeAt(0) - 65;
    const hue = (keyCode / 25) * 360;
    this.fullscreenPulses.push(new FullscreenPulse(this.p, this.p.width / 2, this.p.height / 2, hue));

    this.savedVelocities = [];
    for (const c of this.creatures) {
      this.savedVelocities.push({ vx: c.vx, vy: c.vy });
    }
  }

  private updateGatherPhase(dt: number): void {
    if (this.gatherPhase === 'idle') return;

    this.gatherTimer -= dt;

    if (this.gatherPhase === 'paused') {
      for (const c of this.creatures) {
        c.vx *= 0.9;
        c.vy *= 0.9;
      }
      if (this.gatherTimer <= 0) {
        this.gatherPhase = 'gathering';
        this.gatherTimer = 2;
      }
    } else if (this.gatherPhase === 'gathering') {
      const cx = this.p.width / 2;
      const cy = this.p.height / 2;
      for (const c of this.creatures) {
        c.moveToward(cx, cy, 2);
      }
      if (this.gatherTimer <= 0) {
        this.gatherPhase = 'scattering';
        this.gatherTimer = 2;
        const cx = this.p.width / 2;
        const cy = this.p.height / 2;
        for (let i = 0; i < this.creatures.length; i++) {
          const c = this.creatures[i];
          c.scatter(cx, cy, 2);
          this.scatterTrails.push({
            points: [{ x: c.x, y: c.y, life: 0.8, maxLife: 0.8 }]
          });
        }
      }
    } else if (this.gatherPhase === 'scattering') {
      for (let i = 0; i < this.creatures.length; i++) {
        const c = this.creatures[i];
        if (this.scatterTrails[i]) {
          this.scatterTrails[i].points.push({ x: c.x, y: c.y, life: 0.8, maxLife: 0.8 });
          if (this.scatterTrails[i].points.length > 50) {
            this.scatterTrails[i].points.shift();
          }
        }
      }
      if (this.gatherTimer <= 0) {
        this.gatherPhase = 'idle';
        this.energyFull = false;
        this.energy = 0;
        this.uiManager.updateEnergy(0);
        for (let i = 0; i < this.creatures.length && i < this.savedVelocities.length; i++) {
          if (!this.creatures[i].isTemporary) {
            this.creatures[i].vx = this.savedVelocities[i].vx;
            this.creatures[i].vy = this.savedVelocities[i].vy;
          }
        }
        this.scatterTrails = [];
      }
    }
  }

  private updateFloatingParticles(dt: number): void {
    for (const p of this.floatingParticles) {
      p.phase += p.phaseSpeed * dt;
      p.y += p.vy;
      p.x += Math.sin(p.phase) * 0.3;
      if (p.y < -10) {
        p.y = this.p.height + 10;
        p.x = Math.random() * this.p.width;
      }
      if (p.x < -10) p.x = this.p.width + 10;
      if (p.x > this.p.width + 10) p.x = -10;
    }
  }

  private updateHitParticles(dt: number): void {
    for (let i = this.hitParticles.length - 1; i >= 0; i--) {
      const hp = this.hitParticles[i];
      hp.x += hp.vx;
      hp.y += hp.vy;
      hp.life -= dt;
      if (hp.life <= 0) {
        this.hitParticles.splice(i, 1);
      }
    }
    while (this.hitParticles.length > this.MAX_HIT_PARTICLES) {
      this.hitParticles.splice(0, 1);
    }
  }

  private checkCollisions(): void {
    this.spatialGrid.clear();
    for (const c of this.creatures) {
      if (c.active) {
        this.spatialGrid.insert(c);
      }
    }

    const newCreatures: Creature[] = [];
    for (const wave of this.soundManager.waves) {
      if (!wave.active) continue;
      const nearby = this.spatialGrid.getNearby(wave.x, wave.y);
      for (const creature of nearby) {
        if (!creature.active) continue;
        if (creature.checkCollision(wave, this.unitScale * 0.01)) {
          const result = creature.onWaveHit(wave, this.soundManager, this.hitParticles, this.unitScale * 0.01);
          if (result) {
            newCreatures.push(result);
          }
        }
      }
    }

    for (const nc of newCreatures) {
      this.creatures.push(nc);
    }
  }

  draw(): void {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.drawBackground();
    this.drawFloatingParticles();

    this.updateFloatingParticles(dt);
    this.updateHitParticles(dt);
    this.updateGatherPhase(dt);

    this.soundManager.update(dt, this.unitScale * 0.01);
    this.checkCollisions();

    for (let i = this.creatures.length - 1; i >= 0; i--) {
      const c = this.creatures[i];
      c.update(dt, this.p.width, this.p.height, this.unitScale * 0.01);
      if (!c.active) {
        this.creatures.splice(i, 1);
      }
    }

    this.drawScatterTrails();

    for (const c of this.creatures) {
      c.draw(this.unitScale * 0.01);
    }

    this.soundManager.draw(this.unitScale * 0.01);

    this.drawHitParticles();

    for (let i = this.fullscreenPulses.length - 1; i >= 0; i--) {
      this.fullscreenPulses[i].update(dt);
      this.fullscreenPulses[i].draw();
      if (!this.fullscreenPulses[i].active) {
        this.fullscreenPulses.splice(i, 1);
      }
    }
  }

  private drawBackground(): void {
    const p = this.p;
    const gradient = p.drawingContext.createLinearGradient(0, 0, 0, p.height);
    gradient.addColorStop(0, '#0a1a2a');
    gradient.addColorStop(1, '#1a0a2a');
    p.drawingContext.fillStyle = gradient;
    p.rect(0, 0, p.width, p.height);
  }

  private drawFloatingParticles(): void {
    const p = this.p;
    p.noStroke();
    for (const fp of this.floatingParticles) {
      p.fill(255, 255, 255, fp.alpha * 255);
      p.ellipse(fp.x, fp.y, fp.size, fp.size);
    }
  }

  private drawHitParticles(): void {
    const p = this.p;
    p.noStroke();
    for (const hp of this.hitParticles) {
      const alpha = hp.life / hp.maxLife;
      p.fill(p.red(hp.color), p.green(hp.color), p.blue(hp.color), alpha * 255);
      p.ellipse(hp.x, hp.y, hp.size, hp.size);
    }
  }

  private drawScatterTrails(): void {
    const p = this.p;
    p.noFill();
    for (const trail of this.scatterTrails) {
      for (let i = 0; i < trail.points.length; i++) {
        const pt = trail.points[i];
        pt.life -= 0.016;
      }
      trail.points = trail.points.filter(pt => pt.life > 0);

      if (trail.points.length >= 2) {
        for (let i = 1; i < trail.points.length; i++) {
          const prev = trail.points[i - 1];
          const curr = trail.points[i];
          const alpha = (curr.life / curr.maxLife) * 0.6;
          p.stroke(255, 255, 255, alpha * 255);
          p.strokeWeight(1);
          p.line(prev.x, prev.y, curr.x, curr.y);
        }
      }
    }
  }
}

const sketch = (p: p5) => {
  const app = new OceanBiosphere(p);

  p.setup = () => {
    app.setup();
  };

  p.draw = () => {
    app.draw();
  };
};

new p5(sketch);
