import { Plant, PlantStage, PlantMorph, Petal } from './plant';

export interface Microbe {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
}

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface EcosystemState {
  light: number;
  water: number;
  time: number;
  plantStage: PlantStage;
  plantProgress: number;
  plantMorph: PlantMorph;
  growthTime: number;
  speedMultiplier: number;
}

const STORAGE_KEY = 'terrarium_ecosystem_v1';
const DAY_CYCLE_DURATION = 30;
const TOTAL_GROWTH_DURATION = 300;
const STAGE_DURATIONS: Record<PlantStage, number> = {
  seed: 30,
  sprout: 60,
  growing: 90,
  branching: 60,
  flowering: 60
};
const STAGE_ORDER: PlantStage[] = ['seed', 'sprout', 'growing', 'branching', 'flowering'];

export class Ecosystem {
  plant: Plant;
  microbes: Microbe[] = [];
  ripples: Ripple[] = [];
  light: number = 50;
  water: number = 50;
  time: number = 0;
  growthTime: number = 0;
  speedMultiplier: number = 1;
  dayTime: number = 0;
  jarAlpha: number = 0;
  jarAppearTime: number = 0;
  stageTransitionProgress: number = 1;
  private lastStage: PlantStage = 'seed';

  constructor() {
    this.plant = new Plant();
    this.initMicrobes();
    this.loadState();
  }

  private initMicrobes(): void {
    for (let i = 0; i < 25; i++) {
      this.microbes.push({
        x: 180 + Math.random() * 340,
        y: 200 + Math.random() * 280,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: 1.5 + Math.random() * 2.5,
        alpha: 0.2 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  setLight(v: number): void {
    this.light = Math.max(0, Math.min(100, v));
    this.updateMorph();
  }

  setWater(v: number): void {
    this.water = Math.max(0, Math.min(100, v));
    this.updateMorph();
  }

  toggleSpeed(): void {
    this.speedMultiplier = this.speedMultiplier === 1 ? 5 : 1;
  }

  updateMorph(): void {
    let morph: PlantMorph = 'normal';
    if (this.light > 70 && this.water < 40) {
      morph = 'cactus';
    } else if (this.light < 40 && this.water > 70) {
      morph = 'vine';
    }
    if (morph !== this.plant.state.morph) {
      this.plant.setMorph(morph);
    }
  }

  getCurrentMorph(): PlantMorph {
    return this.plant.state.morph;
  }

  triggerRipple(x: number, y: number): void {
    this.ripples.push({
      x,
      y,
      radius: 5,
      maxRadius: 180,
      alpha: 0.6,
      life: 0,
      maxLife: 2
    });
  }

  clickPlant(): void {
    if (this.plant.state.stage === 'flowering' || this.plant.state.stage === 'branching') {
      this.plant.triggerShake();
    } else if (this.plant.state.stage === 'growing' || this.plant.state.stage === 'sprout') {
      this.plant.triggerShake();
      for (let i = 0; i < 10; i++) {
        this.plant.petals.push({
          x: 350 + (Math.random() - 0.5) * 30,
          y: 400 + (Math.random() - 0.5) * 40,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -0.5 - Math.random() * 1,
          rotation: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.1,
          size: 3 + Math.random() * 3,
          color: '#9ed8a0',
          alpha: 1,
          life: 0,
          maxLife: 2.5 + Math.random() * 1.5
        });
      }
    }
  }

  update(dt: number): void {
    const scaledDt = dt * this.speedMultiplier;

    if (this.jarAppearTime < 1.5) {
      this.jarAppearTime += dt;
      this.jarAlpha = Math.min(1, this.jarAppearTime / 1.5);
    }

    this.dayTime += scaledDt;
    if (this.dayTime >= DAY_CYCLE_DURATION) {
      this.dayTime -= DAY_CYCLE_DURATION;
    }
    this.time += scaledDt;

    if (this.plant.state.stage !== 'flowering') {
      this.growthTime += scaledDt;
      this.updateGrowthStage();
    }

    this.updateMicrobes(dt);
    this.updateRipples(dt);
    this.plant.update(dt);
  }

  private updateGrowthStage(): void {
    const stage = this.plant.state.stage;
    const currentIndex = STAGE_ORDER.indexOf(stage);
    if (currentIndex >= STAGE_ORDER.length - 1) {
      this.plant.setProgress(1);
      return;
    }
    const stageDuration = STAGE_DURATIONS[stage];
    const stageProgress = this.getStageProgress();

    if (this.lastStage !== stage) {
      this.stageTransitionProgress = 0;
      this.lastStage = stage;
    }
    if (this.stageTransitionProgress < 1) {
      this.stageTransitionProgress = Math.min(1, this.stageTransitionProgress + 1 / 60 / 0.8);
    }

    this.plant.setProgress(stageProgress);

    if (stageProgress >= 1) {
      const nextStage = STAGE_ORDER[currentIndex + 1];
      this.plant.setStage(nextStage);
      this.plant.setProgress(0);
    }
  }

  getStageProgress(): number {
    const stage = this.plant.state.stage;
    const stageDuration = STAGE_DURATIONS[stage];
    let timeInStage = 0;
    for (let i = 0; i < STAGE_ORDER.indexOf(stage); i++) {
      timeInStage += STAGE_DURATIONS[STAGE_ORDER[i]];
    }
    return Math.min(1, (this.growthTime - timeInStage) / stageDuration);
  }

  private updateMicrobes(dt: number): void {
    for (const m of this.microbes) {
      m.phase += dt * 2;
      m.x += m.vx + Math.sin(m.phase) * 0.1;
      m.y += m.vy + Math.cos(m.phase * 0.7) * 0.08;
      if (m.x < 180 || m.x > 520) m.vx *= -1;
      if (m.y < 200 || m.y > 500) m.vy *= -1;
      m.x = Math.max(180, Math.min(520, m.x));
      m.y = Math.max(200, Math.min(500, m.y));
    }
  }

  private updateRipples(dt: number): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.life += dt;
      const t = r.life / r.maxLife;
      r.radius = 5 + (r.maxRadius - 5) * t;
      r.alpha = 0.6 * (1 - t);
      if (r.life >= r.maxLife) {
        this.ripples.splice(i, 1);
      }
    }
  }

  getAmbientLight(): { brightness: number; tint: { r: number; g: number; b: number } } {
    const t = this.dayTime / DAY_CYCLE_DURATION;
    const sunAngle = t * Math.PI * 2;
    const brightness = 0.55 + Math.sin(sunAngle) * 0.35;
    const lightBase = this.light / 100;
    const finalBrightness = 0.35 + brightness * 0.35 + lightBase * 0.3;

    let tintR = 255, tintG = 250, tintB = 235;
    if (t < 0.25) {
      const k = t / 0.25;
      tintR = 255;
      tintG = 200 + k * 55;
      tintB = 180 + k * 60;
    } else if (t < 0.5) {
      const k = (t - 0.25) / 0.25;
      tintR = 255;
      tintG = 255 - k * 8;
      tintB = 240 - k * 8;
    } else if (t < 0.75) {
      const k = (t - 0.5) / 0.25;
      tintR = 255 - k * 20;
      tintG = 247 - k * 40;
      tintB = 232 - k * 30;
    } else {
      const k = (t - 0.75) / 0.25;
      tintR = 235 + k * 20;
      tintG = 207 + k * 48;
      tintB = 202 - k * 22;
    }
    return { brightness: finalBrightness, tint: { r: tintR, g: tintG, b: tintB } };
  }

  getHumidity(): number {
    return this.water / 100;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const ambient = this.getAmbientLight();
    const humidity = this.getHumidity();

    ctx.save();
    ctx.globalAlpha = this.jarAlpha;

    this.drawBackground(ctx, ambient);
    this.drawJar(ctx, ambient);
    this.drawSoil(ctx);
    this.drawMoss(ctx);
    this.plant.draw(ctx);
    this.drawMicrobes(ctx, humidity);
    this.drawRipples(ctx);
    this.drawFog(ctx, humidity);
    this.drawJarHighlight(ctx);
    this.drawLightOverlay(ctx, ambient);

    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D, ambient: { brightness: number; tint: { r: number; g: number; b: number } }): void {
    const t = ambient.tint;
    const b = ambient.brightness;
    const grad = ctx.createRadialGradient(350, 250, 50, 350, 350, 500);
    grad.addColorStop(0, `rgba(${Math.round(t.r * b)}, ${Math.round(t.g * b)}, ${Math.round(t.b * b)}, 1)`);
    grad.addColorStop(1, `rgba(${Math.round((t.r - 40) * b)}, ${Math.round((t.g - 50) * b)}, ${Math.round((t.b - 60) * b)}, 1)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 700, 700);
  }

  private drawJar(ctx: CanvasRenderingContext2D, ambient: { brightness: number; tint: { r: number; g: number; b: number } }): void {
    ctx.save();
    const cx = 350, cy = 380;
    const w = 420, h = 480;
    ctx.beginPath();
    ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 80);
    const jarGrad = ctx.createLinearGradient(cx - w / 2, cy, cx + w / 2, cy);
    jarGrad.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
    jarGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.08)');
    jarGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.03)');
    jarGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.08)');
    jarGrad.addColorStop(1, 'rgba(255, 255, 255, 0.18)');
    ctx.fillStyle = jarGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(200, 220, 210, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(cx - w / 2 + 20, cy - h / 2 + 20, w - 40, h - 40, 65);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  private drawJarHighlight(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(160, 150, 35, 380, 30);
    const hg = ctx.createLinearGradient(160, 0, 195, 0);
    hg.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    hg.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = hg;
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(510, 220, 25, 260, 20);
    const hg2 = ctx.createLinearGradient(510, 0, 535, 0);
    hg2.addColorStop(0, 'rgba(255, 255, 255, 0)');
    hg2.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
    ctx.fillStyle = hg2;
    ctx.fill();
    ctx.restore();
  }

  private drawSoil(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(160, 520);
    ctx.quadraticCurveTo(350, 505, 540, 520);
    ctx.lineTo(540, 620);
    ctx.quadraticCurveTo(350, 630, 160, 620);
    ctx.closePath();
    const soilGrad = ctx.createLinearGradient(0, 510, 0, 620);
    soilGrad.addColorStop(0, '#5D4037');
    soilGrad.addColorStop(0.4, '#4E342E');
    soilGrad.addColorStop(1, '#3E2723');
    ctx.fillStyle = soilGrad;
    ctx.fill();
    for (let i = 0; i < 40; i++) {
      const x = 170 + (i * 9.5) + Math.sin(i * 1.7) * 4;
      const y = 525 + Math.random() * 60;
      const s = 1.5 + Math.random() * 2.5;
      ctx.fillStyle = `rgba(${60 + Math.random() * 30}, ${40 + Math.random() * 20}, ${30 + Math.random() * 15}, 0.7)`;
      ctx.beginPath();
      ctx.arc(x, y, s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawMoss(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (let i = 0; i < 80; i++) {
      const x = 170 + Math.random() * 360;
      const y = 515 + Math.random() * 12;
      const s = 2 + Math.random() * 3;
      const g = 140 + Math.random() * 60;
      ctx.fillStyle = `rgba(${60 + Math.random() * 30}, ${g}, ${70 + Math.random() * 30}, ${0.6 + Math.random() * 0.4})`;
      ctx.beginPath();
      ctx.arc(x, y, s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawMicrobes(ctx: CanvasRenderingContext2D, humidity: number): void {
    ctx.save();
    for (const m of this.microbes) {
      const a = m.alpha * (0.4 + humidity * 0.6);
      ctx.fillStyle = `rgba(180, 230, 200, ${a})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(220, 255, 230, ${a * 0.5})`;
      ctx.beginPath();
      ctx.arc(m.x - m.size * 0.3, m.y - m.size * 0.3, m.size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawRipples(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const r of this.ripples) {
      ctx.strokeStyle = `rgba(200, 240, 220, ${r.alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
      if (r.radius > 20) {
        ctx.strokeStyle = `rgba(180, 230, 210, ${r.alpha * 0.5})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private drawFog(ctx: CanvasRenderingContext2D, humidity: number): void {
    if (humidity <= 0.05) return;
    ctx.save();
    const fogAlpha = humidity * 0.22;
    for (let i = 0; i < 3; i++) {
      const offset = Math.sin(this.time * 0.3 + i) * 15;
      ctx.beginPath();
      ctx.roundRect(150 + offset, 380 + i * 30, 400, 80, 60);
      const fg = ctx.createRadialGradient(350 + offset, 420 + i * 30, 20, 350 + offset, 420 + i * 30, 250);
      fg.addColorStop(0, `rgba(220, 245, 235, ${fogAlpha})`);
      fg.addColorStop(1, `rgba(220, 245, 235, 0)`);
      ctx.fillStyle = fg;
      ctx.fill();
    }
    ctx.restore();
  }

  private drawLightOverlay(ctx: CanvasRenderingContext2D, ambient: { brightness: number; tint: { r: number; g: number; b: number } }): void {
    ctx.save();
    const t = ambient.tint;
    const b = ambient.brightness;
    ctx.beginPath();
    ctx.roundRect(140, 140, 420, 480, 80);
    ctx.clip();
    const lightGrad = ctx.createLinearGradient(200, 150, 500, 550);
    lightGrad.addColorStop(0, `rgba(${Math.round(t.r)}, ${Math.round(t.g)}, ${Math.round(t.b)}, ${0.15 * b})`);
    lightGrad.addColorStop(0.5, `rgba(${Math.round(t.r)}, ${Math.round(t.g)}, ${Math.round(t.b)}, 0)`);
    lightGrad.addColorStop(1, `rgba(${Math.round(t.r * 0.8)}, ${Math.round(t.g * 0.85)}, ${Math.round(t.b * 0.9)}, ${0.08 * b})`);
    ctx.fillStyle = lightGrad;
    ctx.fillRect(0, 0, 700, 700);
    ctx.restore();
  }

  saveState(): void {
    const state: EcosystemState = {
      light: this.light,
      water: this.water,
      time: this.time,
      plantStage: this.plant.state.stage,
      plantProgress: this.plant.state.progress,
      plantMorph: this.plant.state.morph,
      growthTime: this.growthTime,
      speedMultiplier: this.speedMultiplier
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save state:', e);
    }
  }

  loadState(): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const state = JSON.parse(raw) as EcosystemState;
      this.light = state.light ?? 50;
      this.water = state.water ?? 50;
      this.time = state.time ?? 0;
      this.growthTime = state.growthTime ?? 0;
      this.speedMultiplier = state.speedMultiplier ?? 1;
      this.plant.state.stage = state.plantStage ?? 'seed';
      this.plant.state.progress = state.plantProgress ?? 0;
      this.plant.state.morph = state.plantMorph ?? 'normal';
      this.lastStage = this.plant.state.stage;
      this.updateMorph();
      return true;
    } catch (e) {
      console.warn('Failed to load state:', e);
      return false;
    }
  }

  reset(): void {
    this.light = 50;
    this.water = 50;
    this.time = 0;
    this.growthTime = 0;
    this.speedMultiplier = 1;
    this.dayTime = 0;
    this.plant.state.stage = 'seed';
    this.plant.state.progress = 0;
    this.plant.state.morph = 'normal';
    this.plant.petals = [];
    this.ripples = [];
    this.lastStage = 'seed';
    this.stageTransitionProgress = 1;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear storage:', e);
    }
  }

  isPointInPlant(x: number, y: number): boolean {
    const stage = this.plant.state.stage;
    if (stage === 'seed') {
      return x > 330 && x < 370 && y > 500 && y < 530;
    }
    if (stage === 'sprout') {
      return x > 310 && x < 390 && y > 440 && y < 530;
    }
    if (stage === 'growing') {
      return x > 300 && x < 400 && y > 330 && y < 530;
    }
    return x > 250 && x < 450 && y > 200 && y < 540;
  }

  isPointInJar(x: number, y: number): boolean {
    return x >= 140 && x <= 560 && y >= 140 && y <= 620;
  }
}
