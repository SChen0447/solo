import p5 from 'p5';
import {
  TotemSymbol,
  EvolutionStats,
  FUSION_DISTANCE,
  MUTATION_RADIUS,
  MAX_DISTANCE_CHECKS,
  MIN_SYMBOLS,
  MAX_SYMBOLS,
  SpeedLevel
} from './types';
import { SymbolGenerator } from './SymbolGenerator';

export class EvolutionEngine {
  private p: p5;
  private symbols: TotemSymbol[] = [];
  private stats: EvolutionStats;
  private generator: SymbolGenerator;
  private speed: SpeedLevel = 1;
  private centerX: number;
  private centerY: number;
  private minSymbols: number = MIN_SYMBOLS;
  private maxSymbols: number = MAX_SYMBOLS;

  constructor(p: p5, centerX: number, centerY: number, initialSymbols: TotemSymbol[], generator: SymbolGenerator, isMobile: boolean) {
    this.p = p;
    this.centerX = centerX;
    this.centerY = centerY;
    this.symbols = initialSymbols;
    this.generator = generator;
    this.stats = {
      symbolCount: initialSymbols.length,
      mutationCount: 0,
      fusionCount: 0,
      generation: 1,
      eventCounter: 0
    };
    if (isMobile) {
      this.minSymbols = 30;
      this.maxSymbols = 50;
    }
  }

  public update(dt: number): void {
    const adjustedDt = dt * this.speed;

    this.updateSymbolAnimations(adjustedDt);
    this.processFusions(adjustedDt);
    this.checkSymbolCount();
    this.stats.symbolCount = this.symbols.length;
  }

  private updateSymbolAnimations(dt: number): void {
    for (const s of this.symbols) {
      s.x = this.easeOut(s.x, s.targetX, 0.08 * dt);
      s.y = this.easeOut(s.y, s.targetY, 0.08 * dt);
      s.rotation = this.easeOut(s.rotation, s.targetRotation, 0.05 * dt);
      s.scale = this.easeOut(s.scale, s.targetScale, 0.1 * dt);

      if (s.isMutating) {
        s.mutationProgress += dt / 12;
        if (s.mutationProgress < 0.5) {
          s.scale = this.easeOut(s.scale, 0.7, 0.2 * dt);
        } else {
          s.scale = this.easeOut(s.scale, 1, 0.2 * dt);
        }
        if (s.mutationProgress >= 1) {
          s.isMutating = false;
          s.mutationProgress = 0;
          s.scale = 1;
        }
      }

      if (s.isNewBorn) {
        s.bornProgress += dt / 120;
        if (s.bornProgress >= 1) {
          s.isNewBorn = false;
          s.bornProgress = 1;
        }
      }
    }
  }

  private processFusions(dt: number): void {
    const fusingSymbols = this.symbols.filter(s => s.isFusing);
    for (const s of fusingSymbols) {
      const partner = this.symbols.find(p => p.id === s.fusePartnerId);
      if (partner && partner.isFusing) {
        s.fuseProgress += dt / 180;
        partner.fuseProgress = s.fuseProgress;
        s.x = this.easeOut(s.x, partner.x, 0.05 * dt);
        s.y = this.easeOut(s.y, partner.y, 0.05 * dt);
        s.scale = this.easeOut(s.scale, 0.3, 0.05 * dt);
        partner.scale = this.easeOut(partner.scale, 0.3, 0.05 * dt);

        if (s.fuseProgress >= 1) {
          this.completeFusion(s, partner);
        }
      } else {
        s.isFusing = false;
        s.fuseProgress = 0;
        s.fusePartnerId = null;
        s.scale = 1;
      }
    }

    const available = this.symbols.filter(s => !s.isFusing && !s.isMutating);
    if (available.length >= 2) {
      this.checkProximityFusions(available);
    }
  }

  private checkProximityFusions(available: TotemSymbol[]): void {
    const pairs: { s1: TotemSymbol; s2: TotemSymbol; dist: number }[] = [];

    for (let i = 0; i < available.length; i++) {
      for (let j = i + 1; j < available.length; j++) {
        const s1 = available[i];
        const s2 = available[j];
        const dist = this.p.dist(s1.x, s1.y, s2.x, s2.y);
        if (dist < FUSION_DISTANCE) {
          pairs.push({ s1, s2, dist });
        }
      }
    }

    pairs.sort((a, b) => a.dist - b.dist);
    const toProcess = pairs.slice(0, MAX_DISTANCE_CHECKS);

    const usedIds = new Set<number>();
    for (const pair of toProcess) {
      if (!usedIds.has(pair.s1.id) && !usedIds.has(pair.s2.id)) {
        usedIds.add(pair.s1.id);
        usedIds.add(pair.s2.id);
        pair.s1.isFusing = true;
        pair.s2.isFusing = true;
        pair.s1.fusePartnerId = pair.s2.id;
        pair.s2.fusePartnerId = pair.s1.id;
        pair.s1.fuseProgress = 0;
        pair.s2.fuseProgress = 0;
      }
    }
  }

  private completeFusion(s1: TotemSymbol, s2: TotemSymbol): void {
    const newSymbol = this.generator.fuseSymbols(s1, s2, this.centerX, this.centerY);
    this.symbols = this.symbols.filter(s => s.id !== s1.id && s.id !== s2.id);
    this.symbols.push(newSymbol);
    this.registerEvent();
    this.stats.fusionCount++;
  }

  public triggerMutation(x: number, y: number): void {
    let mutated = false;
    for (const s of this.symbols) {
      if (!s.isFusing && !s.isMutating) {
        const dist = this.p.dist(s.x, s.y, x, y);
        if (dist < MUTATION_RADIUS) {
          this.generator.mutateSymbol(s);
          mutated = true;
          this.stats.mutationCount++;
          this.registerEvent();
        }
      }
    }
  }

  private registerEvent(): void {
    this.stats.eventCounter++;
    if (this.stats.eventCounter >= 20) {
      this.stats.eventCounter = 0;
      this.stats.generation++;
    }
  }

  private checkSymbolCount(): void {
    while (this.symbols.length > this.maxSymbols) {
      this.symbols.sort((a, b) => a.createdAt - b.createdAt);
      this.symbols.shift();
    }
    while (this.symbols.length < this.minSymbols) {
      this.symbols.push(this.generator.createSymbol(this.centerX, this.centerY));
    }
  }

  public reset(newSymbols: TotemSymbol[]): void {
    this.symbols = newSymbols;
    this.stats = {
      symbolCount: newSymbols.length,
      mutationCount: 0,
      fusionCount: 0,
      generation: 1,
      eventCounter: 0
    };
  }

  public getSymbols(): TotemSymbol[] {
    return this.symbols;
  }

  public getStats(): EvolutionStats {
    return { ...this.stats };
  }

  public setSpeed(speed: SpeedLevel): void {
    this.speed = speed;
  }

  public getSpeed(): SpeedLevel {
    return this.speed;
  }

  private easeOut(current: number, target: number, factor: number): number {
    return current + (target - current) * Math.min(factor, 1);
  }
}
