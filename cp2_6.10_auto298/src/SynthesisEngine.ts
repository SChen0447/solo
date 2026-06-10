import {
  Rune,
  RuneElement,
  SynthesisResult,
  Recipe,
  RECIPES,
  GRID_SIZE,
  Particle,
  ELEMENT_COLORS,
} from './types';
import { Grid } from './Grid';

const LINE_PATTERNS = [
  [
    { dx: 0, dy: 0 },
    { dx: 1, dy: 0 },
    { dx: 2, dy: 0 },
  ],
  [
    { dx: 0, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: 2 },
  ],
];

const TRIANGLE_PATTERNS = [
  [
    { dx: 0, dy: 0 },
    { dx: 2, dy: 0 },
    { dx: 1, dy: 1 },
  ],
  [
    { dx: 0, dy: 1 },
    { dx: 2, dy: 1 },
    { dx: 1, dy: 0 },
  ],
  [
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 2, dy: 1 },
  ],
];

const LSHAPE_PATTERNS = [
  [
    { dx: 0, dy: 0 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
  ],
  [
    { dx: 1, dy: 0 },
    { dx: 0, dy: 0 },
    { dx: 1, dy: 1 },
  ],
  [
    { dx: 0, dy: 1 },
    { dx: 0, dy: 0 },
    { dx: 1, dy: 1 },
  ],
  [
    { dx: 1, dy: 1 },
    { dx: 0, dy: 1 },
    { dx: 1, dy: 0 },
  ],
];

const HEXAGON_PATTERN = [
  { dx: 1, dy: 0 },
  { dx: 2, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 3, dy: 1 },
  { dx: 1, dy: 2 },
  { dx: 2, dy: 2 },
  { dx: 0, dy: 0 },
  { dx: 3, dy: 0 },
];

export class SynthesisEngine {
  private grid: Grid;
  private energy: number = 100;
  private score: number = 0;
  public particles: Particle[] = [];
  public lightBeam: { active: boolean; x: number; y: number; color: string; progress: number } = {
    active: false,
    x: 0,
    y: 0,
    color: '#ffffff',
    progress: 0,
  };
  public lastSynthesis: SynthesisResult | null = null;
  public onSynthesis?: (result: SynthesisResult) => void;
  public onEnergyChange?: (energy: number) => void;
  public onScoreChange?: (score: number) => void;
  public efficiencyBonus: number = 0;

  constructor(grid: Grid, initialEnergy: number = 100) {
    this.grid = grid;
    this.energy = initialEnergy;
  }

  getEnergy(): number {
    return this.energy;
  }

  setEnergy(e: number): void {
    this.energy = Math.max(0, Math.min(100, e));
    if (this.onEnergyChange) this.onEnergyChange(this.energy);
  }

  addEnergy(amount: number): void {
    this.setEnergy(this.energy + amount);
  }

  getScore(): number {
    return this.score;
  }

  addScore(amount: number): void {
    this.score += amount;
    if (this.onScoreChange) this.onScoreChange(this.score);
  }

  checkAndSynthesize(): SynthesisResult | null {
    const result = this.checkPatterns();
    if (result) {
      this.executeSynthesis(result);
      return result;
    }
    return null;
  }

  private checkPatterns(): SynthesisResult | null {
    const hexResult = this.checkHexagon();
    if (hexResult) return hexResult;

    const lineResult = this.checkLine3();
    if (lineResult) return lineResult;

    const triResult = this.checkTriangle();
    if (triResult) return triResult;

    const lResult = this.checkLShape();
    if (lResult) return lResult;

    return null;
  }

  private checkLine3(): SynthesisResult | null {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE - 2; x++) {
        for (const pattern of LINE_PATTERNS) {
          const runes = this.grid.checkPattern(pattern, x, y);
          if (runes.every(r => r !== null)) {
            const first = runes[0]!;
            if (runes.every(r => r!.element === first.element)) {
              return {
                success: true,
                recipe: RECIPES[0],
                positions: pattern.map(p => ({ x: x + p.dx, y: y + p.dy })),
              };
            }
          }
        }
      }
    }
    return null;
  }

  private checkTriangle(): SynthesisResult | null {
    for (let y = 0; y < GRID_SIZE - 1; y++) {
      for (let x = 0; x < GRID_SIZE - 2; x++) {
        for (const pattern of TRIANGLE_PATTERNS) {
          const runes = this.grid.checkPattern(pattern, x, y);
          if (runes.every(r => r !== null)) {
            const elements = new Set(runes.map(r => r!.element));
            if (elements.size === 3) {
              return {
                success: true,
                recipe: RECIPES[1],
                positions: pattern.map(p => ({ x: x + p.dx, y: y + p.dy })),
              };
            }
          }
        }
      }
    }
    return null;
  }

  private checkLShape(): SynthesisResult | null {
    for (let y = 0; y < GRID_SIZE - 1; y++) {
      for (let x = 0; x < GRID_SIZE - 1; x++) {
        for (const pattern of LSHAPE_PATTERNS) {
          const runes = this.grid.checkPattern(pattern, x, y);
          if (runes.every(r => r !== null)) {
            const elementCounts: Record<string, number> = {};
            runes.forEach(r => {
              elementCounts[r!.element] = (elementCounts[r!.element] || 0) + 1;
            });
            const counts = Object.values(elementCounts).sort((a, b) => b - a);
            if (counts.length === 2 && counts[0] === 2 && counts[1] === 1) {
              return {
                success: true,
                recipe: RECIPES[2],
                positions: pattern.map(p => ({ x: x + p.dx, y: y + p.dy })),
              };
            }
          }
        }
      }
    }
    return null;
  }

  private checkHexagon(): SynthesisResult | null {
    for (let y = 0; y < GRID_SIZE - 2; y++) {
      for (let x = 0; x < GRID_SIZE - 3; x++) {
        const runes = this.grid.checkPattern(HEXAGON_PATTERN, x, y);
        if (runes.every(r => r !== null)) {
          const elementCounts: Record<string, number> = {};
          runes.forEach(r => {
            elementCounts[r!.element] = (elementCounts[r!.element] || 0) + 1;
          });
          const hasAllFour =
            elementCounts['fire'] === 2 &&
            elementCounts['water'] === 2 &&
            elementCounts['thunder'] === 2 &&
            elementCounts['earth'] === 2;
          if (hasAllFour) {
            return {
              success: true,
              recipe: RECIPES[3],
              positions: HEXAGON_PATTERN.map(p => ({ x: x + p.dx, y: y + p.dy })),
            };
          }
        }
      }
    }
    return null;
  }

  private executeSynthesis(result: SynthesisResult): void {
    if (!result.success || !result.recipe || !result.positions) return;

    const recipe = result.recipe;
    const effectiveCost = Math.max(1, Math.floor(recipe.energyCost * (1 - this.efficiencyBonus)));

    if (this.energy < effectiveCost) {
      this.failSynthesis(result);
      return;
    }

    this.energy -= effectiveCost;
    if (this.onEnergyChange) this.onEnergyChange(this.energy);

    const centerPos = this.getCenterPosition(result.positions);
    const world = this.grid.gridToWorld(centerPos.x, centerPos.y);
    this.lightBeam = {
      active: true,
      x: world.x,
      y: world.y,
      color: this.getMixedColor(result.positions),
      progress: 0,
    };

    this.spawnSuccessParticles(world.x, world.y, result.positions);

    for (const pos of result.positions) {
      this.grid.removeRune(pos.x, pos.y);
    }

    this.score += recipe.scoreBonus;
    if (this.onScoreChange) this.onScoreChange(this.score);

    if (recipe.id === 'line3') {
      this.efficiencyBonus = Math.min(0.5, this.efficiencyBonus + 0.1);
    } else if (recipe.id === 'triangle') {
      this.addEnergy(25);
    } else if (recipe.id === 'lshape') {
      this.addEnergy(5);
    }

    this.lastSynthesis = result;
    if (this.onSynthesis) this.onSynthesis(result);
  }

  private failSynthesis(result: SynthesisResult): void {
    if (!result.positions) return;

    for (const pos of result.positions) {
      const rune = this.grid.getRune(pos.x, pos.y);
      if (rune) {
        const world = this.grid.gridToWorld(pos.x, pos.y);
        this.spawnFailParticles(world.x, world.y, rune.element);
        this.grid.removeRune(pos.x, pos.y);
      }
    }

    this.energy = Math.max(0, this.energy - 5);
    if (this.onEnergyChange) this.onEnergyChange(this.energy);

    this.lastSynthesis = { success: false, message: '合成失败！' };
    if (this.onSynthesis) this.onSynthesis(this.lastSynthesis);
  }

  private getCenterPosition(positions: { x: number; y: number }[]): { x: number; y: number } {
    let sumX = 0,
      sumY = 0;
    for (const p of positions) {
      sumX += p.x;
      sumY += p.y;
    }
    return {
      x: Math.floor(sumX / positions.length),
      y: Math.floor(sumY / positions.length),
    };
  }

  private getMixedColor(positions: { x: number; y: number }[]): string {
    let r = 0,
      g = 0,
      b = 0;
    for (const pos of positions) {
      const rune = this.grid.getRune(pos.x, pos.y);
      if (rune) {
        const color = ELEMENT_COLORS[rune.element];
        r += parseInt(color.slice(1, 3), 16);
        g += parseInt(color.slice(3, 5), 16);
        b += parseInt(color.slice(5, 7), 16);
      }
    }
    r = Math.floor(r / positions.length);
    g = Math.floor(g / positions.length);
    b = Math.floor(b / positions.length);
    return `rgb(${r},${g},${b})`;
  }

  private spawnSuccessParticles(x: number, y: number, positions: { x: number; y: number }[]): void {
    for (const pos of positions) {
      const world = this.grid.gridToWorld(pos.x, pos.y);
      const rune = this.grid.getRune(pos.x, pos.y);
      const color = rune ? ELEMENT_COLORS[rune.element] : '#ffffff';
      for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        this.particles.push({
          x: world.x,
          y: world.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          life: 1,
          maxLife: 1,
          color,
          size: 3 + Math.random() * 4,
        });
      }
    }

    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        color: '#ffffff',
        size: 4 + Math.random() * 5,
      });
    }
  }

  private spawnFailParticles(x: number, y: number, element: RuneElement): void {
    const color = ELEMENT_COLORS[element];
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        color,
        size: 2 + Math.random() * 4,
      });
    }
  }

  update(deltaTime: number): void {
    if (this.lightBeam.active) {
      this.lightBeam.progress += deltaTime / 1000;
      if (this.lightBeam.progress >= 1) {
        this.lightBeam.active = false;
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life -= deltaTime / 1200;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  checkFailCondition(positions: { x: number; y: number }[]): void {
    this.failSynthesis({ success: false, positions });
  }
}
