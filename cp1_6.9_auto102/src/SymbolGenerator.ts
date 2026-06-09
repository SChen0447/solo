import p5 from 'p5';
import {
  TotemSymbol,
  Primitive,
  PrimitiveType,
  TRIBAL_COLORS,
  ARENA_RADIUS
} from './types';

export class SymbolGenerator {
  private p: p5;
  private nextId: number = 0;

  constructor(p: p5) {
    this.p = p;
  }

  public generateInitialSymbols(count: number, centerX: number, centerY: number): TotemSymbol[] {
    const symbols: TotemSymbol[] = [];
    for (let i = 0; i < count; i++) {
      symbols.push(this.createSymbol(centerX, centerY));
    }
    return symbols;
  }

  public createSymbol(centerX: number, centerY: number): TotemSymbol {
    const angle = this.p.random(this.p.TWO_PI);
    const radius = this.p.random(0, ARENA_RADIUS * 0.9);
    const x = centerX + this.p.cos(angle) * radius;
    const y = centerY + this.p.sin(angle) * radius;

    const primitiveCount = Math.floor(this.p.random(3, 6));
    const primitives: Primitive[] = [];
    for (let i = 0; i < primitiveCount; i++) {
      primitives.push(this.createPrimitive());
    }

    return {
      id: this.nextId++,
      x,
      y,
      targetX: x,
      targetY: y,
      rotation: this.p.random(this.p.TWO_PI),
      targetRotation: this.p.random(this.p.TWO_PI),
      primitives,
      createdAt: Date.now(),
      isMutating: false,
      mutationProgress: 0,
      isFusing: false,
      fuseProgress: 0,
      fusePartnerId: null,
      isNewBorn: false,
      bornProgress: 0,
      scale: 1,
      targetScale: 1
    };
  }

  public createPrimitive(): Primitive {
    const types: PrimitiveType[] = ['circle', 'triangle', 'diamond', 'spiral'];
    const type = types[Math.floor(this.p.random(types.length))];
    const color = TRIBAL_COLORS[Math.floor(this.p.random(TRIBAL_COLORS.length))];

    let size: number;
    switch (type) {
      case 'circle':
        size = this.p.random(8, 15);
        break;
      case 'triangle':
        size = this.p.random(12, 25);
        break;
      case 'diamond':
        size = this.p.random(12, 20);
        break;
      case 'spiral':
        size = this.p.random(10, 20);
        break;
      default:
        size = 10;
    }

    return {
      type,
      size,
      color,
      offsetX: this.p.random(-15, 15),
      offsetY: this.p.random(-15, 15),
      rotation: this.p.random(this.p.TWO_PI)
    };
  }

  public mutateSymbol(symbol: TotemSymbol): void {
    symbol.isMutating = true;
    symbol.mutationProgress = 0;

    const newPrimitiveCount = Math.floor(this.p.random(2, 5));
    const newPrimitives: Primitive[] = [];
    for (let i = 0; i < newPrimitiveCount; i++) {
      const basePrimitive = this.createPrimitive();
      const oldPrimitive = symbol.primitives[i % symbol.primitives.length];
      if (oldPrimitive) {
        basePrimitive.size = oldPrimitive.size * this.p.random(0.7, 1.3);
      }
      newPrimitives.push(basePrimitive);
    }

    symbol.primitives = newPrimitives;
    symbol.targetX = symbol.x + this.p.random(-15, 15);
    symbol.targetY = symbol.y + this.p.random(-15, 15);

    let newColor = TRIBAL_COLORS[Math.floor(this.p.random(TRIBAL_COLORS.length))];
    while (symbol.primitives.length > 0 && newColor === symbol.primitives[0].color) {
      newColor = TRIBAL_COLORS[Math.floor(this.p.random(TRIBAL_COLORS.length))];
    }
    symbol.primitives.forEach(p => {
      p.color = newColor;
    });
  }

  public fuseSymbols(s1: TotemSymbol, s2: TotemSymbol, centerX: number, centerY: number): TotemSymbol {
    const midX = (s1.x + s2.x) / 2;
    const midY = (s1.y + s2.y) / 2;

    const fusedCount = Math.ceil((s1.primitives.length + s2.primitives.length) * 0.5);
    const allPrimitives = [...s1.primitives, ...s2.primitives];
    this.p.shuffle(allPrimitives, true);
    const fusedPrimitives = allPrimitives.slice(0, fusedCount).map(p => ({
      ...p,
      color: this.blendColors(s1.primitives[0]?.color || TRIBAL_COLORS[0], s2.primitives[0]?.color || TRIBAL_COLORS[0])
    }));

    const newSymbol: TotemSymbol = {
      id: this.nextId++,
      x: midX,
      y: midY,
      targetX: this.clampToArena(midX, midY, centerX, centerY).x,
      targetY: this.clampToArena(midX, midY, centerX, centerY).y,
      rotation: (s1.rotation + s2.rotation) / 2,
      targetRotation: (s1.rotation + s2.rotation) / 2 + this.p.TWO_PI,
      primitives: fusedPrimitives,
      createdAt: Date.now(),
      isMutating: false,
      mutationProgress: 0,
      isFusing: false,
      fuseProgress: 0,
      fusePartnerId: null,
      isNewBorn: true,
      bornProgress: 0,
      scale: 0.5,
      targetScale: 1
    };

    return newSymbol;
  }

  private blendColors(color1: string, color2: string): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    if (!c1 || !c2) return color1;

    const r = Math.round((c1.r + c2.r) / 2);
    const g = Math.round((c1.g + c2.g) / 2);
    const b = Math.round((c1.b + c2.b) / 2);

    return `rgb(${r}, ${g}, ${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    if (hex.startsWith('rgb')) {
      const match = hex.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
      }
    }
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private clampToArena(x: number, y: number, centerX: number, centerY: number): { x: number; y: number } {
    const dx = x - centerX;
    const dy = y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > ARENA_RADIUS * 0.95) {
      const ratio = (ARENA_RADIUS * 0.95) / dist;
      return { x: centerX + dx * ratio, y: centerY + dy * ratio };
    }
    return { x, y };
  }
}
