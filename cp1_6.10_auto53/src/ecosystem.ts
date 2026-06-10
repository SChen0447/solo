export enum CellType {
  EMPTY = 0,
  PLANT = 1,
  ANIMAL_A = 2,
  ANIMAL_B = 3,
  CORPSE = 4,
}

export interface PlantData {
  age: number;
}

export interface AnimalData {
  id: number;
  x: number;
  y: number;
  energy: number;
  species: 'A' | 'B';
  hueShift: number;
  invincible: number;
  trail: { x: number; y: number; alpha: number }[];
}

export interface EcosystemParams {
  growthRate: number;
  moveSpeed: number;
  reproductionThreshold: number;
  fightEnergyLoss: number;
}

export interface EcosystemState {
  grid: Uint8Array;
  plants: Map<number, PlantData>;
  animals: AnimalData[];
  populationA: number;
  populationB: number;
  plantCount: number;
  avgEnergy: number;
  generation: number;
  frame: number;
  effects: VisualEffect[];
}

export interface VisualEffect {
  type: 'sparkle' | 'shockwave' | 'birth';
  x: number;
  y: number;
  age: number;
  duration: number;
  color?: string;
}

const GRID_W = 200;
const GRID_H = 150;

let animalIdCounter = 0;

export class Ecosystem {
  private grid: Uint8Array;
  private plants: Map<number, PlantData>;
  private animals: AnimalData[];
  private params: EcosystemParams;
  private frame = 0;
  private generation = 0;
  private effects: VisualEffect[] = [];

  constructor() {
    this.grid = new Uint8Array(GRID_W * GRID_H);
    this.plants = new Map();
    this.animals = [];
    this.params = {
      growthRate: 1.0,
      moveSpeed: 1.0,
      reproductionThreshold: 80,
      fightEnergyLoss: 30,
    };
    this.reset();
  }

  reset(): void {
    this.grid.fill(CellType.EMPTY);
    this.plants.clear();
    this.animals = [];
    this.frame = 0;
    this.generation = 0;
    this.effects = [];
    animalIdCounter = 0;

    for (let i = 0; i < 30; i++) {
      this.spawnAnimal('A');
      this.spawnAnimal('B');
    }
  }

  setParams(params: Partial<EcosystemParams>): void {
    Object.assign(this.params, params);
  }

  getParams(): EcosystemParams {
    return { ...this.params };
  }

  private spawnAnimal(species: 'A' | 'B', x?: number, y?: number, energy?: number, hueShift?: number): void {
    let px = x ?? Math.floor(Math.random() * GRID_W);
    let py = y ?? Math.floor(Math.random() * GRID_H);
    let tries = 0;

    while (tries < 100 && this.grid[py * GRID_W + px] !== CellType.EMPTY) {
      px = Math.floor(Math.random() * GRID_W);
      py = Math.floor(Math.random() * GRID_H);
      tries++;
    }

    if (tries >= 100) return;

    const baseHue = species === 'A' ? 0 : 180;
    const hueRange = species === 'A' ? 30 : 30;
    const animal: AnimalData = {
      id: animalIdCounter++,
      x: px,
      y: py,
      energy: energy ?? 50 + Math.random() * 30,
      species,
      hueShift: hueShift ?? (Math.random() * hueRange + baseHue),
      invincible: x !== undefined && y !== undefined ? 30 : 0,
      trail: [],
    };

    this.animals.push(animal);
    this.grid[py * GRID_W + px] = species === 'A' ? CellType.ANIMAL_A : CellType.ANIMAL_B;

    if (x !== undefined && y !== undefined) {
      this.effects.push({
        type: 'birth',
        x: px,
        y: py,
        age: 0,
        duration: 30,
      });
    }
  }

  step(): void {
    this.frame++;
    if (this.frame % 100 === 0) {
      this.generation++;
    }

    this.updatePlants();
    this.updateAnimals();
    this.updateEffects();
  }

  private updatePlants(): void {
    const totalCreatures = this.animals.length + this.plants.size;
    const baseGrowthProb = totalCreatures > 2000 ? 0.001 : 0.005;
    const boostedGrowthProb = totalCreatures > 2000 ? 0.002 : 0.02;

    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const idx = y * GRID_W + x;
        if (this.grid[idx] === CellType.EMPTY) {
          const neighborPlants = this.countNeighbors(x, y, 1, CellType.PLANT);
          const prob = neighborPlants > 3
            ? boostedGrowthProb * this.params.growthRate
            : baseGrowthProb * this.params.growthRate;

          if (Math.random() < prob) {
            this.grid[idx] = CellType.PLANT;
            this.plants.set(idx, { age: 0 });
          }
        } else if (this.grid[idx] === CellType.PLANT) {
          const plant = this.plants.get(idx);
          if (plant) {
            plant.age++;

            if (plant.age > 30 && Math.random() < 0.02 * this.params.growthRate) {
              this.spreadSeed(x, y);
            }
          }
        } else if (this.grid[idx] === CellType.CORPSE) {
          const age = (this.plants.get(idx)?.age ?? 0) + 1;
          if (age >= 2) {
            this.grid[idx] = CellType.EMPTY;
            this.plants.delete(idx);
          } else {
            this.plants.set(idx, { age });
          }
        }
      }
    }
  }

  private spreadSeed(cx: number, cy: number): void {
    const offsets = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        offsets.push({ dx, dy });
      }
    }

    for (let i = offsets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [offsets[i], offsets[j]] = [offsets[j], offsets[i]];
    }

    for (const { dx, dy } of offsets) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) continue;

      const idx = ny * GRID_W + nx;
      if (this.grid[idx] === CellType.EMPTY) {
        this.grid[idx] = CellType.PLANT;
        this.plants.set(idx, { age: 0 });
        return;
      }
    }
  }

  private countNeighbors(x: number, y: number, radius: number, type?: CellType): number {
    let count = 0;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) continue;
        const idx = ny * GRID_W + nx;
        if (type === undefined || this.grid[idx] === type) {
          count++;
        }
      }
    }
    return count;
  }

  private findNearestPlant(x: number, y: number, radius: number): { x: number; y: number } | null {
    let nearest: { x: number; y: number; dist: number } | null = null;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) continue;
        const idx = ny * GRID_W + nx;
        if (this.grid[idx] === CellType.PLANT) {
          const dist = Math.abs(dx) + Math.abs(dy);
          if (!nearest || dist < nearest.dist) {
            nearest = { x: nx, y: ny, dist };
          }
        }
      }
    }

    return nearest ? { x: nearest.x, y: nearest.y } : null;
  }

  private findNearestEnemy(x: number, y: number, species: 'A' | 'B', radius: number): AnimalData | null {
    let nearest: AnimalData | null = null;
    let nearestDist = Infinity;

    for (const animal of this.animals) {
      if (animal.species === species) continue;
      const dist = Math.abs(animal.x - x) + Math.abs(animal.y - y);
      if (dist <= radius && dist < nearestDist) {
        nearest = animal;
        nearestDist = dist;
      }
    }

    return nearest;
  }

  private updateAnimals(): void {
    const moveSteps = Math.max(1, Math.round(this.params.moveSpeed));
    const survivingAnimals: AnimalData[] = [];

    for (const animal of this.animals) {
      if (animal.invincible > 0) animal.invincible--;

      let alive = true;

      for (let step = 0; step < moveSteps && alive; step++) {
        const trail = animal.trail;
        trail.push({ x: animal.x, y: animal.y, alpha: 0.5 });
        if (trail.length > 5) trail.shift();
        for (const t of trail) t.alpha *= 0.8;

        const oldIdx = animal.y * GRID_W + animal.x;
        if (this.grid[oldIdx] === (animal.species === 'A' ? CellType.ANIMAL_A : CellType.ANIMAL_B)) {
          this.grid[oldIdx] = CellType.EMPTY;
        }

        let moved = false;
        const plant = this.findNearestPlant(animal.x, animal.y, 5);
        const enemy = animal.invincible <= 0 ? this.findNearestEnemy(animal.x, animal.y, animal.species, 3) : null;

        let targetX = animal.x;
        let targetY = animal.y;

        if (enemy) {
          targetX = enemy.x;
          targetY = enemy.y;
        } else if (plant) {
          targetX = plant.x;
          targetY = plant.y;
        } else {
          const dirs = [
            { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
            { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
            { dx: 0, dy: 0 },
          ];
          const dir = dirs[Math.floor(Math.random() * dirs.length)];
          targetX = animal.x + dir.dx;
          targetY = animal.y + dir.dy;
        }

        let dx = Math.sign(targetX - animal.x);
        let dy = Math.sign(targetY - animal.y);

        if (Math.random() < 0.5 && dx !== 0 && dy !== 0) {
          if (Math.random() < 0.5) dx = 0;
          else dy = 0;
        }

        const nx = animal.x + dx;
        const ny = animal.y + dy;

        if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H) {
          const nIdx = ny * GRID_W + nx;

          if (enemy && Math.abs(nx - enemy.x) <= 1 && Math.abs(ny - enemy.y) <= 1 && animal.invincible <= 0) {
            this.fight(animal, enemy);
          }

          if (this.grid[nIdx] === CellType.EMPTY || this.grid[nIdx] === CellType.PLANT) {
            if (this.grid[nIdx] === CellType.PLANT) {
              animal.energy = Math.min(100, animal.energy + 15);
              this.plants.delete(nIdx);
              this.effects.push({
                type: 'sparkle',
                x: nx,
                y: ny,
                age: 0,
                duration: 15,
                color: '#69f0ae',
              });
            }
            animal.x = nx;
            animal.y = ny;
            moved = true;
          } else {
            this.grid[oldIdx] = animal.species === 'A' ? CellType.ANIMAL_A : CellType.ANIMAL_B;
          }
        } else {
          this.grid[oldIdx] = animal.species === 'A' ? CellType.ANIMAL_A : CellType.ANIMAL_B;
        }

        if (moved) {
          animal.energy -= 1;
          const newIdx = animal.y * GRID_W + animal.x;
          this.grid[newIdx] = animal.species === 'A' ? CellType.ANIMAL_A : CellType.ANIMAL_B;
        }

        if (animal.energy < 0) {
          const deathIdx = animal.y * GRID_W + animal.x;
          this.grid[deathIdx] = CellType.CORPSE;
          this.plants.set(deathIdx, { age: 0 });
          alive = false;
          break;
        }

        if (animal.energy >= this.params.reproductionThreshold) {
          this.reproduce(animal);
          animal.energy = 50;
        }
      }

      if (alive) {
        survivingAnimals.push(animal);
      }
    }

    this.animals = survivingAnimals;
  }

  private fight(a: AnimalData, b: AnimalData): void {
    const winner = a.energy >= b.energy ? a : b;
    const loser = winner === a ? b : a;

    loser.energy -= this.params.fightEnergyLoss;
    winner.energy = Math.min(100, winner.energy + 10);

    this.effects.push({
      type: 'shockwave',
      x: Math.round((a.x + b.x) / 2),
      y: Math.round((a.y + b.y) / 2),
      age: 0,
      duration: 12,
      color: '#ff5252',
    });
  }

  private reproduce(parent: AnimalData): void {
    const offsets = [
      { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
      { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
    ];

    for (let i = offsets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [offsets[i], offsets[j]] = [offsets[j], offsets[i]];
    }

    for (const { dx, dy } of offsets) {
      const nx = parent.x + dx;
      const ny = parent.y + dy;
      if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) continue;

      const idx = ny * GRID_W + nx;
      if (this.grid[idx] === CellType.EMPTY) {
        const baseHue = parent.species === 'A' ? 0 : 180;
        const hueRange = parent.species === 'A' ? 30 : 30;
        const childHue = baseHue + Math.random() * hueRange;
        const hueShift = Math.max(0, Math.min(360, parent.hueShift + (Math.random() * 20 - 10)));

        this.spawnAnimal(
          parent.species,
          nx,
          ny,
          parent.energy * 0.5,
          hueShift
        );
        return;
      }
    }
  }

  private updateEffects(): void {
    this.effects = this.effects.filter(e => {
      e.age++;
      return e.age < e.duration;
    });
  }

  getState(): EcosystemState {
    const populationA = this.animals.filter(a => a.species === 'A').length;
    const populationB = this.animals.filter(a => a.species === 'B').length;
    const totalEnergy = this.animals.reduce((sum, a) => sum + a.energy, 0);
    const avgEnergy = this.animals.length > 0 ? totalEnergy / this.animals.length : 0;

    return {
      grid: this.grid,
      plants: this.plants,
      animals: this.animals,
      populationA,
      populationB,
      plantCount: this.plants.size,
      avgEnergy,
      generation: this.generation,
      frame: this.frame,
      effects: this.effects,
    };
  }

  getGridSize(): { width: number; height: number } {
    return { width: GRID_W, height: GRID_H };
  }
}
