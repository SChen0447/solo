import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GRID_SIZE,
  GRID_COLS,
  GRID_ROWS,
  COLORS,
  INITIAL_POPULATION,
  MAX_POPULATION,
  ENV_DEFAULTS,
  ENV_EFFECTS,
  EVENTS,
  STATS,
  TERRAIN_RATIOS,
  type TerrainType
} from './config';
import { Plant, Herbivore, Carnivore } from './entities';

interface BurntArea {
  x: number;
  y: number;
  radius: number;
  age: number;
  maxAge: number;
}

interface TerrainCell {
  type: TerrainType;
}

export type DisasterType = 'fire' | 'drought' | 'plague';

export interface ActiveEvent {
  type: DisasterType;
  framesRemaining: number;
  name: string;
}

export interface PopulationStats {
  herbivores: number;
  carnivores: number;
  plants: number;
  total: number;
  extinctSpecies: string[];
  lastExtinct: string | null;
}

export class Ecosystem {
  ctx: CanvasRenderingContext2D;
  terrainGrid: TerrainCell[][] = [];
  plants: Plant[] = [];
  herbivores: Herbivore[] = [];
  carnivores: Carnivore[] = [];

  temperature: number = ENV_DEFAULTS.temperature;
  humidity: number = ENV_DEFAULTS.humidity;
  resourceRichness: number = ENV_DEFAULTS.resourceRichness;

  pendingTemperature: number = ENV_DEFAULTS.temperature;
  pendingHumidity: number = ENV_DEFAULTS.humidity;
  pendingResourceRichness: number = ENV_DEFAULTS.resourceRichness;
  paramApplyTimer: number = 0;
  paramsDirty: boolean = false;

  frameCount: number = 0;
  generation: number = 0;
  populationHistory: { herbivores: number; carnivores: number; plants: number }[] = [];
  extinctSpecies: string[] = [];
  lastExtinct: string | null = null;
  herbivoreZeroStreak: number = 0;
  carnivoreZeroStreak: number = 0;
  plantZeroStreak: number = 0;

  activeEvent: ActiveEvent | null = null;
  burntAreas: BurntArea[] = [];

  maxPopulation: number = MAX_POPULATION;

  private _offscreenTerrain: HTMLCanvasElement | null = null;
  private _offscreenCtx: CanvasRenderingContext2D | null = null;
  private _terrainDirty: boolean = true;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.initTerrain();
    this.initPopulation();
    this._initOffscreen();
  }

  private _initOffscreen(): void {
    this._offscreenTerrain = document.createElement('canvas');
    this._offscreenTerrain.width = CANVAS_WIDTH;
    this._offscreenTerrain.height = CANVAS_HEIGHT;
    this._offscreenCtx = this._offscreenTerrain.getContext('2d');
  }

  initTerrain(): void {
    this.terrainGrid = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      const row: TerrainCell[] = [];
      for (let c = 0; c < GRID_COLS; c++) {
        const rand = Math.random();
        let type: TerrainType = 'grass';
        let cum = TERRAIN_RATIOS.grass;
        if (rand < cum) type = 'grass';
        else {
          cum += TERRAIN_RATIOS.tree;
          if (rand < cum) type = 'tree';
          else {
            cum += TERRAIN_RATIOS.water;
            if (rand < cum) type = 'water';
            else type = 'rock';
          }
        }
        row.push({ type });
      }
      this.terrainGrid.push(row);
    }
    this._terrainDirty = true;
  }

  initPopulation(): void {
    this.plants = [];
    this.herbivores = [];
    this.carnivores = [];
    const initialPlants = Math.floor(INITIAL_POPULATION.plants * this.resourceRichness);
    for (let i = 0; i < initialPlants; i++) {
      const p = new Plant();
      if (this.isValidPlantPosition(p.x, p.y)) this.plants.push(p);
    }
    for (let i = 0; i < INITIAL_POPULATION.herbivores; i++) {
      this.herbivores.push(new Herbivore());
    }
    for (let i = 0; i < INITIAL_POPULATION.carnivores; i++) {
      this.carnivores.push(new Carnivore());
    }
  }

  isValidPlantPosition(x: number, y: number): boolean {
    const col = Math.floor(x / GRID_SIZE);
    const row = Math.floor(y / GRID_SIZE);
    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return false;
    const t = this.terrainGrid[row][col].type;
    return t === 'grass';
  }

  totalPopulation(): number {
    return this.plants.length + this.herbivores.length + this.carnivores.length;
  }

  isDroughtActive(): boolean {
    return this.activeEvent !== null && this.activeEvent.type === 'drought';
  }

  setTemperature(value: number): void {
    this.pendingTemperature = value;
    this.paramsDirty = true;
    this.paramApplyTimer = ENV_EFFECTS.paramApplyDelayFrames;
  }

  setHumidity(value: number): void {
    this.pendingHumidity = value;
    this.paramsDirty = true;
    this.paramApplyTimer = ENV_EFFECTS.paramApplyDelayFrames;
  }

  setResourceRichness(value: number): void {
    this.pendingResourceRichness = value;
    this.paramsDirty = true;
    this.paramApplyTimer = ENV_EFFECTS.paramApplyDelayFrames;
  }

  applyPendingParams(): void {
    if (this.paramsDirty && this.paramApplyTimer > 0) {
      this.paramApplyTimer--;
      if (this.paramApplyTimer <= 0) {
        this.temperature = this.pendingTemperature;
        this.humidity = this.pendingHumidity;
        this.resourceRichness = this.pendingResourceRichness;
        this.paramsDirty = false;
      }
    }
  }

  triggerDisaster(): void {
    if (this.activeEvent) return;
    const r = Math.random();
    let type: DisasterType;
    let name: string;
    let duration: number;
    if (r < EVENTS.fire.probability) {
      type = 'fire';
      name = EVENTS.fire.name;
      duration = 1;
      this._applyFire();
    } else if (r < EVENTS.fire.probability + EVENTS.drought.probability) {
      type = 'drought';
      name = EVENTS.drought.name;
      duration = EVENTS.drought.durationFrames;
    } else {
      type = 'plague';
      name = EVENTS.plague.name;
      duration = EVENTS.plague.durationFrames;
      this._applyPlague();
    }
    this.activeEvent = { type, framesRemaining: duration, name };
  }

  private _applyFire(): void {
    const cx = Math.random() * CANVAS_WIDTH;
    const cy = Math.random() * CANVAS_HEIGHT;
    const r = EVENTS.fire.radius;
    this.burntAreas.push({ x: cx, y: cy, radius: r, age: 0, maxAge: EVENTS.fire.recoveryFrames });
    this._terrainDirty = true;
    this.plants = this.plants.filter(p => {
      const dx = p.x - cx, dy = p.y - cy;
      return dx * dx + dy * dy > r * r;
    });
    this.herbivores = this.herbivores.filter(h => {
      const dx = h.x - cx, dy = h.y - cy;
      return dx * dx + dy * dy > r * r;
    });
  }

  private _applyPlague(): void {
    const speciesRoll = Math.random();
    if (speciesRoll < 0.33) {
      const kill = Math.floor(this.herbivores.length * EVENTS.plague.killRatio);
      for (let i = 0; i < kill; i++) {
        const idx = Math.floor(Math.random() * this.herbivores.length);
        this.herbivores.splice(idx, 1);
      }
    } else if (speciesRoll < 0.66) {
      const kill = Math.floor(this.carnivores.length * EVENTS.plague.killRatio);
      for (let i = 0; i < kill; i++) {
        const idx = Math.floor(Math.random() * this.carnivores.length);
        this.carnivores.splice(idx, 1);
      }
    } else {
      const kill = Math.floor(this.plants.length * EVENTS.plague.killRatio);
      for (let i = 0; i < kill; i++) {
        const idx = Math.floor(Math.random() * this.plants.length);
        this.plants.splice(idx, 1);
      }
    }
  }

  update(): void {
    this.frameCount++;
    this.applyPendingParams();

    if (this.activeEvent) {
      this.activeEvent.framesRemaining--;
      if (this.activeEvent.framesRemaining <= 0) {
        this.activeEvent = null;
      }
    }

    for (let i = this.burntAreas.length - 1; i >= 0; i--) {
      this.burntAreas[i].age++;
      if (this.burntAreas[i].age >= this.burntAreas[i].maxAge) {
        this.burntAreas.splice(i, 1);
        this._terrainDirty = true;
      }
    }
    if (this.burntAreas.length > 0 && this.frameCount % 30 === 0) {
      this._terrainDirty = true;
    }

    for (const p of this.plants) {
      if (p.alive) p.grow(this);
    }
    for (const h of this.herbivores) {
      if (h.alive) h.update(this);
    }
    for (const c of this.carnivores) {
      if (c.alive) c.update(this);
    }
    this.cleanupDestroyed();

    if (this.frameCount % STATS.populationCheckFrames === 0) {
      this.generation++;
      this._checkExtinction();
    }
  }

  private _checkExtinction(): void {
    if (this.herbivores.length === 0) this.herbivoreZeroStreak++;
    else this.herbivoreZeroStreak = 0;
    if (this.carnivores.length === 0) this.carnivoreZeroStreak++;
    else this.carnivoreZeroStreak = 0;
    if (this.plants.length === 0) this.plantZeroStreak++;
    else this.plantZeroStreak = 0;

    if (this.herbivoreZeroStreak >= STATS.extinctionThreshold && !this.extinctSpecies.includes('草食动物')) {
      this.extinctSpecies.push('草食动物');
      this.lastExtinct = '草食动物';
    }
    if (this.carnivoreZeroStreak >= STATS.extinctionThreshold && !this.extinctSpecies.includes('肉食动物')) {
      this.extinctSpecies.push('肉食动物');
      this.lastExtinct = '肉食动物';
    }
    if (this.plantZeroStreak >= STATS.extinctionThreshold && !this.extinctSpecies.includes('植物')) {
      this.extinctSpecies.push('植物');
      this.lastExtinct = '植物';
    }
  }

  cleanupDestroyed(): void {
    this.plants = this.plants.filter(p => p.alive);
    this.herbivores = this.herbivores.filter(h => h.alive);
    this.carnivores = this.carnivores.filter(c => c.alive);
  }

  getPopulationStats(): PopulationStats {
    return {
      herbivores: this.herbivores.length,
      carnivores: this.carnivores.length,
      plants: this.plants.length,
      total: this.totalPopulation(),
      extinctSpecies: [...this.extinctSpecies],
      lastExtinct: this.lastExtinct
    };
  }

  private _renderTerrainToOffscreen(): void {
    if (!this._offscreenCtx) return;
    const ctx = this._offscreenCtx;
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, COLORS.bgStart);
    grad.addColorStop(1, COLORS.bgEnd);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const cell = this.terrainGrid[r][c];
        const x = c * GRID_SIZE;
        const y = r * GRID_SIZE;
        let color = COLORS.grass;
        if (cell.type === 'tree') color = COLORS.tree;
        else if (cell.type === 'water') color = COLORS.water;
        else if (cell.type === 'rock') color = COLORS.rock;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, GRID_SIZE, GRID_SIZE);
      }
    }

    for (const burn of this.burntAreas) {
      const alpha = Math.max(0, 1 - burn.age / burn.maxAge) * 0.8;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = COLORS.burnt;
      ctx.beginPath();
      ctx.arc(burn.x, burn.y, burn.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    this._terrainDirty = false;
  }

  render(): void {
    if (this._terrainDirty) this._renderTerrainToOffscreen();
    if (this._offscreenTerrain) {
      this.ctx.drawImage(this._offscreenTerrain, 0, 0);
    }

    for (const p of this.plants) p.render(this.ctx);
    for (const h of this.herbivores) h.render(this.ctx);
    for (const c of this.carnivores) c.render(this.ctx);
  }

  getEventPulseAlpha(): number {
    if (!this.activeEvent) return 0;
    return 0.35 + Math.sin(this.frameCount * 0.2) * 0.15;
  }
}
