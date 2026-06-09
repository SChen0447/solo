import { Element, ElementType, ELEMENT_CONFIGS, createElement } from './elements';

export const GRID_WIDTH = 80;
export const GRID_HEIGHT = 60;

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export class PhysicsEngine {
  grid: Element[][];
  particles: Particle[] = [];
  stepCount: number = 0;

  constructor() {
    this.grid = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      this.grid[y] = [];
      for (let x = 0; x < GRID_WIDTH; x++) {
        this.grid[y][x] = createElement(ElementType.EMPTY);
      }
    }
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT;
  }

  getElement(x: number, y: number): Element {
    if (!this.inBounds(x, y)) {
      return createElement(ElementType.WOOD);
    }
    return this.grid[y][x];
  }

  setElement(x: number, y: number, element: Element): void {
    if (!this.inBounds(x, y)) return;
    this.grid[y][x] = element;
    element.updated = true;
  }

  swapElements(x1: number, y1: number, x2: number, y2: number): void {
    if (!this.inBounds(x1, y1) || !this.inBounds(x2, y2)) return;
    const temp = this.grid[y1][x1];
    this.grid[y1][x1] = this.grid[y2][x2];
    this.grid[y2][x2] = temp;
    this.grid[y1][x1].updated = true;
    this.grid[y2][x2].updated = true;
  }

  addParticle(x: number, y: number, color: string, vy: number = -1, size: number = 2): void {
    if (this.particles.length > 300) return;
    this.particles.push({
      x: x + Math.random() - 0.5,
      y: y + Math.random() - 0.5,
      vx: (Math.random() - 0.5) * 2,
      vy: vy + (Math.random() - 0.5) * 0.5,
      life: 60 + Math.random() * 30,
      maxLife: 90,
      color,
      size,
    });
  }

  addSplashParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: x + Math.random(),
        y: y + Math.random(),
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 2 - 1,
        life: 20 + Math.random() * 15,
        maxLife: 35,
        color,
        size: 1 + Math.random() * 1.5,
      });
    }
  }

  updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life--;
      if (p.life <= 0 || p.y > GRID_HEIGHT + 5 || p.y < -5) {
        this.particles.splice(i, 1);
      }
    }
  }

  isEmpty(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return false;
    return this.grid[y][x].type === ElementType.EMPTY;
  }

  isGas(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return false;
    return ELEMENT_CONFIGS[this.grid[y][x].type].isGas;
  }

  isLiquid(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return false;
    return ELEMENT_CONFIGS[this.grid[y][x].type].isLiquid;
  }

  isSolid(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return true;
    return ELEMENT_CONFIGS[this.grid[y][x].type].isSolid;
  }

  getDensity(x: number, y: number): number {
    if (!this.inBounds(x, y)) return 999;
    return ELEMENT_CONFIGS[this.grid[y][x].type].density;
  }

  explode(x: number, y: number): void {
    const radius = 1;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (!this.inBounds(nx, ny)) continue;
        const el = this.grid[ny][nx];
        if (el.type === ElementType.WOOD || el.type === ElementType.SAND ||
            el.type === ElementType.GUNPOWDER || el.type === ElementType.WATER) {
          this.grid[ny][nx] = createElement(ElementType.EMPTY);
          if (el.type === ElementType.GUNPOWDER && !(dx === 0 && dy === 0)) {
            this.grid[ny][nx].explodeTimer = Math.random() * 10 + 5;
          }
        }
        if (Math.random() < 0.6 && this.isEmpty(nx, ny)) {
          this.addParticle(nx, ny, '#FF6600', (Math.random() - 0.5) * 2, 3);
          this.addParticle(nx, ny, '#FFD700', (Math.random() - 0.5) * 3, 2);
        }
      }
    }
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 40 + Math.random() * 20,
        maxLife: 60,
        color: Math.random() < 0.5 ? '#555555' : '#777777',
        size: 2,
      });
    }
  }

  updateSandPowder(x: number, y: number): void {
    const el = this.grid[y][x];
    if (el.explodeTimer > 0) {
      el.explodeTimer--;
      if (el.explodeTimer <= 0) {
        this.explode(x, y);
        return;
      }
    }

    const belowY = y + 1;

    if (this.isEmpty(x, belowY) || this.isGas(x, belowY)) {
      this.swapElements(x, y, x, belowY);
      return;
    }

    if (this.isLiquid(x, belowY) && this.getDensity(x, belowY) < this.getDensity(x, y)) {
      this.swapElements(x, y, x, belowY);
      return;
    }

    const dir = Math.random() < 0.5 ? -1 : 1;
    if (this.isEmpty(x + dir, belowY) || this.isGas(x + dir, belowY)) {
      this.swapElements(x, y, x + dir, belowY);
      return;
    }
    if (this.isEmpty(x - dir, belowY) || this.isGas(x - dir, belowY)) {
      this.swapElements(x, y, x - dir, belowY);
      return;
    }
    if (this.isLiquid(x + dir, belowY) && this.getDensity(x + dir, belowY) < this.getDensity(x, y)) {
      this.swapElements(x, y, x + dir, belowY);
      return;
    }
    if (this.isLiquid(x - dir, belowY) && this.getDensity(x - dir, belowY) < this.getDensity(x, y)) {
      this.swapElements(x, y, x - dir, belowY);
      return;
    }
  }

  updateWater(x: number, y: number): void {
    const belowY = y + 1;

    if (this.isEmpty(x, belowY) || this.isGas(x, belowY)) {
      this.swapElements(x, y, x, belowY);
      return;
    }

    for (const [dx, dy] of [[-1, 1], [1, 1], [-2, 1], [2, 1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (this.isEmpty(nx, ny) || this.isGas(nx, ny)) {
        this.swapElements(x, y, nx, ny);
        return;
      }
    }

    const dir = Math.random() < 0.5 ? -1 : 1;
    const scanRange = 5;
    for (let i = 1; i <= scanRange; i++) {
      if (this.isEmpty(x + dir * i, y) || this.isGas(x + dir * i, y)) {
        this.swapElements(x, y, x + dir * i, y);
        return;
      }
      if (this.isEmpty(x - dir * i, y) || this.isGas(x - dir * i, y)) {
        this.swapElements(x, y, x - dir * i, y);
        return;
      }
    }
  }

  updateLava(x: number, y: number): void {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (!this.inBounds(nx, ny)) continue;
        const neighbor = this.grid[ny][nx];
        if (neighbor.type === ElementType.WATER) {
          this.grid[y][x] = createElement(ElementType.ROCK);
          this.grid[ny][nx] = createElement(ElementType.STEAM);
          for (let i = 0; i < 5; i++) {
            this.addParticle(x, y, '#E0E0E0', -1.5 - Math.random(), 2);
          }
          return;
        }
        if (neighbor.type === ElementType.WOOD && neighbor.burnTimer < 0 && Math.random() < 0.3) {
          this.grid[ny][nx].burnTimer = 60 + Math.random() * 60;
        }
        if (neighbor.type === ElementType.GUNPOWDER && neighbor.explodeTimer < 0 && Math.random() < 0.8) {
          this.grid[ny][nx].explodeTimer = 30;
        }
      }
    }

    if (Math.random() < 0.1) {
      for (let i = 0; i < 2; i++) {
        this.addParticle(x, y, '#FF8800', -0.5, 1.5);
      }
    }

    const belowY = y + 1;

    if (this.isEmpty(x, belowY) || this.isGas(x, belowY)) {
      this.swapElements(x, y, x, belowY);
      return;
    }

    for (const [dx, dy] of [[-1, 1], [1, 1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (this.isEmpty(nx, ny) || this.isGas(nx, ny)) {
        this.swapElements(x, y, nx, ny);
        return;
      }
    }

    const dir = Math.random() < 0.5 ? -1 : 1;
    for (let i = 1; i <= 3; i++) {
      if (this.isEmpty(x + dir * i, y) || this.isGas(x + dir * i, y)) {
        this.swapElements(x, y, x + dir * i, y);
        return;
      }
      if (this.isEmpty(x - dir * i, y) || this.isGas(x - dir * i, y)) {
        this.swapElements(x, y, x - dir * i, y);
        return;
      }
    }
  }

  updateWood(x: number, y: number): void {
    const el = this.grid[y][x];
    if (el.burnTimer > 0) {
      el.burnTimer--;
      if (Math.random() < 0.3) {
        for (let dy = -1; dy <= 0; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (this.inBounds(nx, ny) && this.isEmpty(nx, ny) && Math.random() < 0.3) {
              const fire = createElement(ElementType.FIRE);
              this.grid[ny][nx] = fire;
            }
          }
        }
      }
      if (el.burnTimer <= 0) {
        this.grid[y][x] = createElement(ElementType.ASH);
        for (let i = 0; i < 3; i++) {
          this.particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 1,
            vy: -Math.random() * 0.5,
            life: 30,
            maxLife: 30,
            color: '#555555',
            size: 1.5,
          });
        }
      }
    }

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (!this.inBounds(nx, ny)) continue;
        const neighbor = this.grid[ny][nx];
        if (neighbor.type === ElementType.FIRE && el.burnTimer < 0 && Math.random() < 0.2) {
          el.burnTimer = 60 + Math.random() * 60;
        }
      }
    }
  }

  updateFire(x: number, y: number): void {
    const el = this.grid[y][x];
    el.life--;

    if (Math.random() < 0.5) {
      this.addParticle(x, y, Math.random() < 0.5 ? '#FF6600' : '#FFD700', -0.8, 1.5);
    }

    for (let dy = -1; dy <= 0; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (!this.inBounds(nx, ny)) continue;
        const neighbor = this.grid[ny][nx];
        if (neighbor.type === ElementType.WOOD && neighbor.burnTimer < 0 && Math.random() < 0.4) {
          this.grid[ny][nx].burnTimer = 60 + Math.random() * 60;
        }
        if (neighbor.type === ElementType.GUNPOWDER && neighbor.explodeTimer < 0 && Math.random() < 0.9) {
          this.grid[ny][nx].explodeTimer = 30;
        }
      }
    }

    if (el.life <= 0) {
      this.grid[y][x] = createElement(ElementType.EMPTY);
      return;
    }

    if (Math.random() < 0.5) {
      if (this.isEmpty(x, y - 1) || this.isGas(x, y - 1)) {
        this.swapElements(x, y, x, y - 1);
      }
    }
  }

  updateSteam(x: number, y: number): void {
    const el = this.grid[y][x];
    el.life--;
    if (el.life <= 0) {
      if (Math.random() < 0.3) {
        this.grid[y][x] = createElement(ElementType.WATER);
      } else {
        this.grid[y][x] = createElement(ElementType.EMPTY);
      }
      return;
    }

    const dir = Math.random() < 0.5 ? -1 : 1;
    if (this.isEmpty(x, y - 1) || this.isGas(x, y - 1)) {
      this.swapElements(x, y, x, y - 1);
    } else if (this.isEmpty(x + dir, y - 1) || this.isGas(x + dir, y - 1)) {
      this.swapElements(x, y, x + dir, y - 1);
    } else if (this.isEmpty(x - dir, y - 1) || this.isGas(x - dir, y - 1)) {
      this.swapElements(x, y, x - dir, y - 1);
    } else if (this.isEmpty(x + dir, y) || this.isGas(x + dir, y)) {
      this.swapElements(x, y, x + dir, y);
    }
  }

  updateAsh(x: number, y: number): void {
    const belowY = y + 1;

    if (this.isEmpty(x, belowY) || this.isGas(x, belowY)) {
      this.swapElements(x, y, x, belowY);
      return;
    }

    const dir = Math.random() < 0.5 ? -1 : 1;
    if (this.isEmpty(x + dir, belowY) || this.isGas(x + dir, belowY)) {
      this.swapElements(x, y, x + dir, belowY);
      return;
    }
    if (this.isEmpty(x - dir, belowY) || this.isGas(x - dir, belowY)) {
      this.swapElements(x, y, x - dir, belowY);
      return;
    }
  }

  updateCell(x: number, y: number): void {
    const el = this.grid[y][x];
    if (el.updated) return;
    if (el.type === ElementType.EMPTY) return;

    switch (el.type) {
      case ElementType.SAND:
      case ElementType.GUNPOWDER:
        this.updateSandPowder(x, y);
        break;
      case ElementType.WATER:
        this.updateWater(x, y);
        break;
      case ElementType.LAVA:
        this.updateLava(x, y);
        break;
      case ElementType.WOOD:
        this.updateWood(x, y);
        break;
      case ElementType.FIRE:
        this.updateFire(x, y);
        break;
      case ElementType.STEAM:
        this.updateSteam(x, y);
        break;
      case ElementType.ASH:
        this.updateAsh(x, y);
        break;
    }
  }

  step(): void {
    this.stepCount++;

    const leftToRight = Math.random() < 0.5;
    for (let y = GRID_HEIGHT - 1; y >= 0; y--) {
      if (leftToRight) {
        for (let x = 0; x < GRID_WIDTH; x++) {
          this.grid[y][x].updated = false;
        }
      } else {
        for (let x = GRID_WIDTH - 1; x >= 0; x--) {
          this.grid[y][x].updated = false;
        }
      }
    }

    for (let y = GRID_HEIGHT - 1; y >= 0; y--) {
      if (leftToRight) {
        for (let x = 0; x < GRID_WIDTH; x++) {
          this.updateCell(x, y);
        }
      } else {
        for (let x = GRID_WIDTH - 1; x >= 0; x--) {
          this.updateCell(x, y);
        }
      }
    }

    this.updateParticles();
  }

  getSeedCount(): number {
    let count = 0;
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (this.grid[y][x].type !== ElementType.EMPTY) count++;
      }
    }
    return count;
  }

  cloneState(): Element[][] {
    const copy: Element[][] = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      copy[y] = [];
      for (let x = 0; x < GRID_WIDTH; x++) {
        copy[y][x] = { ...this.grid[y][x] };
      }
    }
    return copy;
  }

  restoreState(state: Element[][]): void {
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        this.grid[y][x] = { ...state[y][x] };
      }
    }
  }

  clearWithAnimation(onRowCleared: (row: number) => void, onComplete: () => void): void {
    let currentRow = GRID_HEIGHT - 1;
    const clearNext = () => {
      if (currentRow >= 0) {
        for (let x = 0; x < GRID_WIDTH; x++) {
          this.grid[currentRow][x] = createElement(ElementType.EMPTY);
        }
        onRowCleared(currentRow);
        currentRow--;
        setTimeout(clearNext, 20);
      } else {
        onComplete();
      }
    };
    clearNext();
  }
}
