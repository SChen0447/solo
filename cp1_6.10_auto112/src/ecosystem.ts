import { Creature, Animal, Herbivore, Carnivore, Plant } from './creature';

const GRID_CELL_SIZE = 20;
const HERBIVORE_EAT_DISTANCE = 5;
const CARNIVORE_EAT_DISTANCE = 8;
const MIN_PLACEMENT_DISTANCE = 10;

const INITIAL_HERBIVORES = 30;
const INITIAL_CARNIVORES = 15;
const INITIAL_PLANTS = 50;

interface PopulationData {
  herbivores: number;
  carnivores: number;
  plants: number;
}

class SpatialHashGrid {
  private cells: Map<string, Creature[]> = new Map();
  private cellSize: number;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  private getKey(x: number, y: number): string {
    const gx = Math.floor(x / this.cellSize);
    const gy = Math.floor(y / this.cellSize);
    return `${gx},${gy}`;
  }

  public clear(): void {
    this.cells.clear();
  }

  public insert(creature: Creature): void {
    const key = this.getKey(creature.x, creature.y);
    if (!this.cells.has(key)) {
      this.cells.set(key, []);
    }
    this.cells.get(key)!.push(creature);
  }

  public build(creatures: Creature[]): void {
    this.clear();
    for (const c of creatures) {
      this.insert(c);
    }
  }

  public query(x: number, y: number, radius: number): Creature[] {
    const results: Creature[] = [];
    const minGX = Math.floor((x - radius) / this.cellSize);
    const maxGX = Math.floor((x + radius) / this.cellSize);
    const minGY = Math.floor((y - radius) / this.cellSize);
    const maxGY = Math.floor((y + radius) / this.cellSize);

    for (let gx = minGX; gx <= maxGX; gx++) {
      for (let gy = minGY; gy <= maxGY; gy++) {
        const key = `${gx},${gy}`;
        const cell = this.cells.get(key);
        if (cell) {
          for (const c of cell) {
            const dx = c.x - x;
            const dy = c.y - y;
            if (dx * dx + dy * dy <= radius * radius) {
              results.push(c);
            }
          }
        }
      }
    }
    return results;
  }
}

export class Ecosystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  private herbivores: Herbivore[] = [];
  private carnivores: Carnivore[] = [];
  private plants: Plant[] = [];
  private allCreatures: Creature[] = [];

  private grid: SpatialHashGrid;
  private grassBlades: { x: number; y: number; h: number }[] = [];

  public hoveredCreature: Creature | null = null;
  public highlightedCreature: Creature | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.grid = new SpatialHashGrid(GRID_CELL_SIZE);
    this.generateGrass();
    this.initialize();
  }

  private generateGrass(): void {
    this.grassBlades = [];
    const count = 800;
    for (let i = 0; i < count; i++) {
      this.grassBlades.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        h: Math.random() * 5
      });
    }
  }

  private randomPosition(minDist: number, existing: Creature[]): { x: number; y: number } {
    for (let attempt = 0; attempt < 1000; attempt++) {
      const x = 20 + Math.random() * (this.width - 40);
      const y = 20 + Math.random() * (this.height - 40);
      let valid = true;
      for (const c of existing) {
        const dx = c.x - x;
        const dy = c.y - y;
        if (dx * dx + dy * dy < minDist * minDist) {
          valid = false;
          break;
        }
      }
      if (valid) return { x, y };
    }
    return {
      x: 20 + Math.random() * (this.width - 40),
      y: 20 + Math.random() * (this.height - 40)
    };
  }

  public initialize(): void {
    this.herbivores = [];
    this.carnivores = [];
    this.plants = [];
    this.allCreatures = [];
    this.hoveredCreature = null;
    this.highlightedCreature = null;

    for (let i = 0; i < INITIAL_PLANTS; i++) {
      const pos = this.randomPosition(MIN_PLACEMENT_DISTANCE, this.allCreatures);
      const plant = new Plant(pos.x, pos.y);
      this.plants.push(plant);
      this.allCreatures.push(plant);
    }

    for (let i = 0; i < INITIAL_HERBIVORES; i++) {
      const pos = this.randomPosition(MIN_PLACEMENT_DISTANCE, this.allCreatures);
      const herb = new Herbivore(pos.x, pos.y, 50);
      this.herbivores.push(herb);
      this.allCreatures.push(herb);
    }

    for (let i = 0; i < INITIAL_CARNIVORES; i++) {
      const pos = this.randomPosition(MIN_PLACEMENT_DISTANCE, this.allCreatures);
      const carn = new Carnivore(pos.x, pos.y, 50);
      this.carnivores.push(carn);
      this.allCreatures.push(carn);
    }
  }

  private findNearest(animal: Animal, candidates: Creature[]): Creature | null {
    let nearest: Creature | null = null;
    let minDist = Infinity;
    const near = this.grid.query(animal.x, animal.y, animal.visionRadius);
    for (const c of near) {
      if (candidates.includes(c as any)) {
        const dx = c.x - animal.x;
        const dy = c.y - animal.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          nearest = c;
        }
      }
    }
    return nearest;
  }

  public update(elapsedMs: number): PopulationData {
    this.grid.build(this.allCreatures);

    for (const herb of this.herbivores) {
      const nearestPlant = this.findNearest(herb, this.plants as any);
      if (nearestPlant) {
        herb.move(nearestPlant.x, nearestPlant.y, this.width, this.height);
      } else {
        herb.move(null, null, this.width, this.height);
      }
    }

    for (const carn of this.carnivores) {
      const nearestHerb = this.findNearest(carn, this.herbivores as any);
      if (nearestHerb) {
        carn.move(nearestHerb.x, nearestHerb.y, this.width, this.height);
      } else {
        carn.move(null, null, this.width, this.height);
      }
    }

    const deadHerbivores: Set<Herbivore> = new Set();
    const deadPlants: Set<Plant> = new Set();
    const deadCarnivores: Set<Carnivore> = new Set();

    const newHerbivores: Herbivore[] = [];
    const newCarnivores: Carnivore[] = [];

    for (const herb of this.herbivores) {
      for (const plant of this.plants) {
        if (deadPlants.has(plant)) continue;
        const dx = herb.x - plant.x;
        const dy = herb.y - plant.y;
        if (dx * dx + dy * dy < HERBIVORE_EAT_DISTANCE * HERBIVORE_EAT_DISTANCE) {
          herb.eat();
          deadPlants.add(plant);
          break;
        }
      }
      if (herb.updateEnergy(elapsedMs)) {
        deadHerbivores.add(herb);
      } else if (herb.canReproduce()) {
        newHerbivores.push(herb.reproduce() as Herbivore);
      }
    }

    for (const carn of this.carnivores) {
      for (const herb of this.herbivores) {
        if (deadHerbivores.has(herb)) continue;
        const dx = carn.x - herb.x;
        const dy = carn.y - herb.y;
        if (dx * dx + dy * dy < CARNIVORE_EAT_DISTANCE * CARNIVORE_EAT_DISTANCE) {
          carn.eat();
          deadHerbivores.add(herb);
          break;
        }
      }
      if (carn.updateEnergy(elapsedMs)) {
        deadCarnivores.add(carn);
      } else if (carn.canReproduce()) {
        newCarnivores.push(carn.reproduce() as Carnivore);
      }
    }

    this.herbivores = this.herbivores.filter(h => !deadHerbivores.has(h));
    this.carnivores = this.carnivores.filter(c => !deadCarnivores.has(c));
    this.plants = this.plants.filter(p => !deadPlants.has(p));

    this.herbivores.push(...newHerbivores);
    this.carnivores.push(...newCarnivores);

    if (this.hoveredCreature && !this.allCreatures.includes(this.hoveredCreature)) {
      this.hoveredCreature = null;
    }
    if (this.highlightedCreature && !this.allCreatures.includes(this.highlightedCreature)) {
      this.highlightedCreature = null;
    }

    this.allCreatures = [...this.plants, ...this.herbivores, ...this.carnivores];

    for (const c of this.allCreatures) {
      c.isHighlighted = (c === this.highlightedCreature);
    }

    return {
      herbivores: this.herbivores.length,
      carnivores: this.carnivores.length,
      plants: this.plants.length
    };
  }

  public render(time: number, isPaused: boolean): void {
    this.ctx.fillStyle = '#2d5a27';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.strokeStyle = 'rgba(60, 120, 50, 0.6)';
    this.ctx.lineWidth = 1;
    for (const blade of this.grassBlades) {
      this.ctx.beginPath();
      this.ctx.moveTo(blade.x, blade.y);
      this.ctx.lineTo(blade.x, blade.y - blade.h);
      this.ctx.stroke();
    }

    for (const c of this.allCreatures) {
      c.render(this.ctx, time);
    }

    if (this.hoveredCreature && this.hoveredCreature.type !== 'plant') {
      const c = this.hoveredCreature;
      const text = `能量: ${Math.floor(c.energy)}`;
      this.ctx.font = '12px "Courier New"';
      const textWidth = this.ctx.measureText(text).width;
      const padding = 6;
      const bgX = c.x - textWidth / 2 - padding;
      const bgY = c.y - c.radius - 24;
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.beginPath();
      this.roundRect(bgX, bgY, textWidth + padding * 2, 20, 4);
      this.ctx.fill();
      this.ctx.fillStyle = '#ffffff';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(text, c.x, bgY + 10);
    }

    if (isPaused) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      const cx = this.width / 2;
      const cy = this.height / 2;
      const barWidth = 14;
      const barHeight = 40;
      const gap = 12;
      this.ctx.fillRect(cx - gap / 2 - barWidth, cy - barHeight / 2, barWidth, barHeight);
      this.ctx.fillRect(cx + gap / 2, cy - barHeight / 2, barWidth, barHeight);
    }
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  public getCreatureAt(mx: number, my: number): Creature | null {
    const r = 15;
    const near = this.grid.query(mx, my, r);
    let best: Creature | null = null;
    let bestDist = Infinity;
    for (const c of near) {
      const dx = c.x - mx;
      const dy = c.y - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitR = Math.max(c.radius, 8);
      if (dist < hitR && dist < bestDist) {
        bestDist = dist;
        best = c;
      }
    }
    return best;
  }
}
