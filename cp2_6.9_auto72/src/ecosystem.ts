import { Creature, Fish, Jellyfish, Turtle, Vec2 } from './creature';

class SpatialHash {
  cellSize: number;
  cells: Map<string, Creature[]>;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  clear(): void {
    this.cells.clear();
  }

  private getKey(x: number, y: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }

  insert(creature: Creature): void {
    const key = this.getKey(creature.pos.x, creature.pos.y);
    let cell = this.cells.get(key);
    if (!cell) {
      cell = [];
      this.cells.set(key, cell);
    }
    cell.push(creature);
  }

  query(pos: Vec2, radius: number): Creature[] {
    const result: Creature[] = [];
    const minCX = Math.floor((pos.x - radius) / this.cellSize);
    const maxCX = Math.floor((pos.x + radius) / this.cellSize);
    const minCY = Math.floor((pos.y - radius) / this.cellSize);
    const maxCY = Math.floor((pos.y + radius) / this.cellSize);

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const cell = this.cells.get(`${cx},${cy}`);
        if (cell) {
          for (const c of cell) {
            const dx = c.pos.x - pos.x;
            const dy = c.pos.y - pos.y;
            if (dx * dx + dy * dy <= radius * radius) {
              result.push(c);
            }
          }
        }
      }
    }
    return result;
  }
}

export interface EcosystemStats {
  fish: number;
  jellyfish: number;
  turtle: number;
}

export class EcosystemManager {
  fish: Fish[];
  jellyfish: Jellyfish[];
  turtles: Turtle[];
  width: number;
  height: number;
  private spatialHash: SpatialHash;
  private nextId: number;
  mousePos: Vec2;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.fish = [];
    this.jellyfish = [];
    this.turtles = [];
    this.spatialHash = new SpatialHash(50);
    this.nextId = 1;
    this.mousePos = { x: width / 2, y: height / 2 };
    this.initialize();
  }

  private initialize(): void {
    for (let i = 0; i < 30; i++) {
      this.fish.push(
        new Fish(this.nextId++, {
          x: Math.random() * this.width,
          y: Math.random() * (this.height * 0.7) + this.height * 0.1
        })
      );
    }

    for (let i = 0; i < 5; i++) {
      this.jellyfish.push(
        new Jellyfish(this.nextId++, {
          x: 100 + Math.random() * (this.width - 200),
          y: this.height * 0.2 + Math.random() * (this.height * 0.4)
        })
      );
    }

    for (let i = 0; i < 2; i++) {
      this.turtles.push(
        new Turtle(this.nextId++, {
          x: Math.random() * this.width,
          y: this.height - 80 - Math.random() * 60
        })
      );
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  setMousePos(x: number, y: number): void {
    this.mousePos.x = x;
    this.mousePos.y = y;
  }

  handleClick(x: number, y: number): boolean {
    for (const j of this.jellyfish) {
      const dx = j.pos.x - x;
      const dy = j.pos.y - y;
      if (dx * dx + dy * dy <= j.size * j.size) {
        j.triggerFlash();
        return true;
      }
    }
    return false;
  }

  getStats(): EcosystemStats {
    return {
      fish: this.fish.length,
      jellyfish: this.jellyfish.length,
      turtle: this.turtles.length
    };
  }

  getCreaturePositions(): { type: string; x: number; y: number }[] {
    const result: { type: string; x: number; y: number }[] = [];
    for (const f of this.fish) result.push({ type: 'fish', x: f.pos.x, y: f.pos.y });
    for (const j of this.jellyfish) result.push({ type: 'jellyfish', x: j.pos.x, y: j.pos.y });
    for (const t of this.turtles) result.push({ type: 'turtle', x: t.pos.x, y: t.pos.y });
    return result;
  }

  private wrapPosition(c: Creature): void {
    const margin = 50;
    if (c.pos.x < -margin) c.pos.x = this.width + margin;
    if (c.pos.x > this.width + margin) c.pos.x = -margin;
    if (c.pos.y < -margin) c.pos.y = this.height + margin;
    if (c.pos.y > this.height + margin) c.pos.y = -margin;
  }

  private clampY(creature: Creature, minY: number, maxY: number): void {
    if (creature.pos.y < minY) creature.pos.y = minY;
    if (creature.pos.y > maxY) creature.pos.y = maxY;
  }

  private computeBoidsForce(fish: Fish, neighbors: Fish[]): Vec2 {
    let separationX = 0, separationY = 0, separationCount = 0;
    let alignmentX = 0, alignmentY = 0, alignmentCount = 0;
    let cohesionX = 0, cohesionY = 0, cohesionCount = 0;

    const separationDist = 25;
    const alignmentDist = 60;
    const cohesionDist = 80;

    for (const other of neighbors) {
      if (other.id === fish.id) continue;
      const dx = other.pos.x - fish.pos.x;
      const dy = other.pos.y - fish.pos.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);

      if (dist < separationDist && dist > 0) {
        separationX -= dx / dist;
        separationY -= dy / dist;
        separationCount++;
      }
      if (dist < alignmentDist) {
        alignmentX += other.vel.x;
        alignmentY += other.vel.y;
        alignmentCount++;
      }
      if (dist < cohesionDist) {
        cohesionX += other.pos.x;
        cohesionY += other.pos.y;
        cohesionCount++;
      }
    }

    let forceX = 0, forceY = 0;

    if (separationCount > 0) {
      forceX += separationX * 0.5;
      forceY += separationY * 0.5;
    }
    if (alignmentCount > 0) {
      alignmentX /= alignmentCount;
      alignmentY /= alignmentCount;
      forceX += (alignmentX - fish.vel.x) * 0.05;
      forceY += (alignmentY - fish.vel.y) * 0.05;
    }
    if (cohesionCount > 0) {
      cohesionX /= cohesionCount;
      cohesionY /= cohesionCount;
      forceX += (cohesionX - fish.pos.x) * 0.003;
      forceY += (cohesionY - fish.pos.y) * 0.003;
    }

    return { x: forceX, y: forceY };
  }

  private computeMouseScareForce(fish: Fish): Vec2 {
    const dx = fish.pos.x - this.mousePos.x;
    const dy = fish.pos.y - this.mousePos.y;
    const distSq = dx * dx + dy * dy;
    const scareDist = 100;

    if (distSq < scareDist * scareDist && distSq > 0) {
      const dist = Math.sqrt(distSq);
      if (!fish.scared) {
        fish.scare();
      }
      const strength = fish.scareForceMultiplier;
      return {
        x: (dx / dist) * strength,
        y: (dy / dist) * strength
      };
    }
    return { x: 0, y: 0 };
  }

  private rebuildSpatialHash(): void {
    this.spatialHash.clear();
    for (const f of this.fish) this.spatialHash.insert(f);
    for (const j of this.jellyfish) this.spatialHash.insert(j);
    for (const t of this.turtles) this.spatialHash.insert(t);
  }

  private handleTurtleEating(dt: number): void {
    for (const turtle of this.turtles) {
      const eatRadius = 50;
      const nearbyFish = this.spatialHash.query(turtle.pos, eatRadius).filter(
        (c): c is Fish => c.type === 'fish'
      );

      if (nearbyFish.length > 0) {
        turtle.openMouth();

        if (Math.random() < dt * 0.8) {
          const eatCount = 1 + Math.floor(Math.random() * 2);
          let eaten = 0;

          for (let i = nearbyFish.length - 1; i >= 0 && eaten < eatCount; i--) {
            const target = nearbyFish[i];
            const idx = this.fish.findIndex(f => f.id === target.id);
            if (idx >= 0) {
              this.fish.splice(idx, 1);
              eaten++;
            }
          }

          if (eaten > 0) {
            turtle.triggerBoost();
          }
        }
      } else {
        turtle.closeMouth();
      }
    }
  }

  update(dt: number): void {
    this.rebuildSpatialHash();
    this.handleTurtleEating(dt);

    for (const fish of this.fish) {
      const neighbors = this.spatialHash
        .query(fish.pos, 80)
        .filter((c): c is Fish => c.type === 'fish');

      const boidsForce = this.computeBoidsForce(fish, neighbors);
      const scareForce = this.computeMouseScareForce(fish);

      const totalForce: Vec2 = {
        x: boidsForce.x + scareForce.x,
        y: boidsForce.y + scareForce.y
      };

      fish.update(dt, totalForce);
      this.wrapPosition(fish);
    }

    for (const jelly of this.jellyfish) {
      jelly.update(dt);
      this.clampY(jelly, 50, this.height * 0.7);
    }

    for (const turtle of this.turtles) {
      turtle.update(dt);
      this.wrapPosition(turtle);
      this.clampY(turtle, this.height - 200, this.height - 50);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const f of this.fish) f.render(ctx);
    for (const j of this.jellyfish) j.render(ctx);
    for (const t of this.turtles) t.render(ctx);
  }
}
