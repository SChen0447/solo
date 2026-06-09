export enum MaterialType {
  SULFUR = 'sulfur',
  MERCURY = 'mercury',
  SALT = 'salt',
  HERB = 'herb',
  METAL = 'metal'
}

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface MaterialConfig {
  type: MaterialType;
  name: string;
  color: string;
}

export interface Recipe {
  id: string;
  name: string;
  rarity: Rarity;
  materials: MaterialType[];
  heatRange: [number, number];
  stirRange: [number, number];
  description: string;
  discovered: boolean;
  unlocked: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  material: MaterialType;
  explosive?: boolean;
}

export interface CraftedProduct {
  id: string;
  recipeId: string;
  name: string;
  rarity: Rarity;
  materials: MaterialType[];
  timestamp: number;
}

export const MATERIALS: Record<MaterialType, MaterialConfig> = {
  [MaterialType.SULFUR]: { type: MaterialType.SULFUR, name: '硫磺', color: '#FFD700' },
  [MaterialType.MERCURY]: { type: MaterialType.MERCURY, name: '水银', color: '#C0C0C0' },
  [MaterialType.SALT]: { type: MaterialType.SALT, name: '盐', color: '#F5F5F5' },
  [MaterialType.HERB]: { type: MaterialType.HERB, name: '草药', color: '#228B22' },
  [MaterialType.METAL]: { type: MaterialType.METAL, name: '金属', color: '#808080' }
};

const RARITY_ORDER: Record<Rarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  legendary: 3
};

export class AlchemySystem {
  private heat: number = 0;
  private stirCount: number = 0;
  private currentMaterials: MaterialType[] = [];
  private particles: Particle[] = [];
  private recipes: Recipe[] = [];
  private craftedProducts: CraftedProduct[] = [];
  private maxParticles: number = 300;
  private crucibleCenterX: number = 0;
  private crucibleCenterY: number = 0;
  private crucibleRadius: number = 0;

  constructor() {
    this.initRecipes();
  }

  private initRecipes(): void {
    this.recipes = [
      {
        id: 'r1',
        name: '朱红药剂',
        rarity: 'common',
        materials: [MaterialType.SULFUR, MaterialType.MERCURY],
        heatRange: [50, 70],
        stirRange: [5, 10],
        description: '基础的炼金药剂，硫磺与水银的融合',
        discovered: false,
        unlocked: true
      },
      {
        id: 'r2',
        name: '净化盐晶',
        rarity: 'common',
        materials: [MaterialType.SALT, MaterialType.HERB],
        heatRange: [20, 40],
        stirRange: [3, 6],
        description: '草药提纯的盐晶，可净化杂质',
        discovered: false,
        unlocked: true
      },
      {
        id: 'r3',
        name: '青铜熔液',
        rarity: 'common',
        materials: [MaterialType.METAL, MaterialType.SULFUR],
        heatRange: [60, 85],
        stirRange: [2, 5],
        description: '金属在硫磺中熔融',
        discovered: false,
        unlocked: true
      },
      {
        id: 'r4',
        name: '生命精华',
        rarity: 'uncommon',
        materials: [MaterialType.HERB, MaterialType.MERCURY, MaterialType.SALT],
        heatRange: [30, 50],
        stirRange: [8, 15],
        description: '蕴含生命力的银色精华',
        discovered: false,
        unlocked: true
      },
      {
        id: 'r5',
        name: '腐蚀液',
        rarity: 'uncommon',
        materials: [MaterialType.SULFUR, MaterialType.SALT, MaterialType.MERCURY],
        heatRange: [40, 65],
        stirRange: [10, 18],
        description: '能溶解多数物质的液体',
        discovered: false,
        unlocked: true
      },
      {
        id: 'r6',
        name: '星辰之尘',
        rarity: 'rare',
        materials: [MaterialType.METAL, MaterialType.HERB, MaterialType.SULFUR],
        heatRange: [70, 90],
        stirRange: [12, 20],
        description: '闪烁微光的神秘粉末',
        discovered: false,
        unlocked: false
      },
      {
        id: 'r7',
        name: '银色月光',
        rarity: 'rare',
        materials: [MaterialType.MERCURY, MaterialType.METAL, MaterialType.HERB],
        heatRange: [15, 35],
        stirRange: [6, 12],
        description: '在黑暗中散发月光的液体',
        discovered: false,
        unlocked: false
      },
      {
        id: 'r8',
        name: '万能溶剂',
        rarity: 'rare',
        materials: [MaterialType.MERCURY, MaterialType.SALT, MaterialType.SULFUR],
        heatRange: [55, 80],
        stirRange: [15, 20],
        description: '传说中能溶解万物的溶剂',
        discovered: false,
        unlocked: false
      },
      {
        id: 'r9',
        name: '点金石',
        rarity: 'legendary',
        materials: [MaterialType.METAL, MaterialType.SULFUR, MaterialType.MERCURY],
        heatRange: [80, 100],
        stirRange: [15, 20],
        description: '能将普通金属变为黄金的圣石',
        discovered: false,
        unlocked: false
      },
      {
        id: 'r10',
        name: '贤者之石',
        rarity: 'legendary',
        materials: [MaterialType.SULFUR, MaterialType.MERCURY, MaterialType.SALT, MaterialType.HERB, MaterialType.METAL],
        heatRange: [90, 100],
        stirRange: [18, 20],
        description: '炼金术的终极产物，蕴含无尽力量',
        discovered: false,
        unlocked: false
      }
    ];
  }

  public setCruciblePosition(x: number, y: number, radius: number): void {
    this.crucibleCenterX = x;
    this.crucibleCenterY = y;
    this.crucibleRadius = radius;
  }

  public getHeat(): number {
    return this.heat;
  }

  public getStirCount(): number {
    return this.stirCount;
  }

  public addHeat(amount: number = 5): void {
    this.heat = Math.min(100, this.heat + amount);
  }

  public addStir(): void {
    this.stirCount = Math.min(20, this.stirCount + 1);
  }

  public getCurrentMaterials(): MaterialType[] {
    return [...this.currentMaterials];
  }

  public getRecipes(): Recipe[] {
    return [...this.recipes];
  }

  public getCraftedProducts(): CraftedProduct[] {
    return [...this.craftedProducts];
  }

  public addMaterial(material: MaterialType): boolean {
    if (this.currentMaterials.length >= 3) {
      return false;
    }
    this.currentMaterials.push(material);
    this.spawnMaterialParticles(material);
    return true;
  }

  public clearMaterials(): void {
    this.currentMaterials = [];
    this.heat = 0;
    this.stirCount = 0;
  }

  private spawnMaterialParticles(material: MaterialType): void {
    const config = MATERIALS[material];
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (this.crucibleRadius - 8);
      const particle: Particle = {
        x: this.crucibleCenterX + Math.cos(angle) * dist,
        y: this.crucibleCenterY + Math.sin(angle) * dist * 0.6,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        color: config.color,
        size: 2 + Math.random() * 1,
        life: 600,
        maxLife: 600,
        material
      };
      this.addParticle(particle);
    }
  }

  public addParticle(particle: Particle): void {
    if (this.particles.length >= this.maxParticles) {
      this.removeFarthestParticles(this.particles.length - this.maxParticles + 1);
    }
    this.particles.push(particle);
  }

  private removeFarthestParticles(count: number): void {
    this.particles.sort((a, b) => {
      const distA = this.distanceFromCrucible(a);
      const distB = this.distanceFromCrucible(b);
      return distB - distA;
    });
    this.particles.splice(0, count);
  }

  private distanceFromCrucible(p: Particle): number {
    const dx = p.x - this.crucibleCenterX;
    const dy = p.y - this.crucibleCenterY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public getParticles(): Particle[] {
    return this.particles;
  }

  public updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.explosive) {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
        }
        continue;
      }

      p.x += p.vx;
      p.y += p.vy;

      const dx = p.x - this.crucibleCenterX;
      const dy = p.y - this.crucibleCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxR = this.crucibleRadius - 6;

      if (dist > maxR) {
        const nx = dx / dist;
        const ny = dy / dist;
        p.x = this.crucibleCenterX + nx * maxR;
        p.y = this.crucibleCenterY + ny * maxR;
        const dot = p.vx * nx + p.vy * ny;
        p.vx -= 2 * dot * nx;
        p.vy -= 2 * dot * ny;
      }

      if (this.stirCount > 0) {
        const tangentX = -dy / (dist || 1);
        const tangentY = dx / (dist || 1);
        const stirForce = 0.05 * Math.min(this.stirCount, 10);
        p.vx += tangentX * stirForce;
        p.vy += tangentY * stirForce;
      }

      if (this.heat > 30) {
        p.vy -= 0.02 * (this.heat / 100);
      }

      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const maxSpeed = 1.5;
      if (speed > maxSpeed) {
        p.vx = (p.vx / speed) * maxSpeed;
        p.vy = (p.vy / speed) * maxSpeed;
      }

      p.vx *= 0.98;
      p.vy *= 0.98;

      if (Math.abs(p.vx) < 0.1) {
        p.vx += (Math.random() - 0.5) * 0.2;
      }
      if (Math.abs(p.vy) < 0.1) {
        p.vy += (Math.random() - 0.5) * 0.2;
      }
    }
  }

  public checkRecipes(): Recipe | null {
    if (this.currentMaterials.length === 0) return null;

    const sortedCurrent = [...this.currentMaterials].sort();
    let bestMatch: Recipe | null = null;

    for (const recipe of this.recipes) {
      if (!recipe.unlocked) continue;
      if (recipe.discovered && this.craftedProducts.some(p => p.recipeId === recipe.id)) {
        continue;
      }

      const sortedRecipe = [...recipe.materials].sort();
      if (sortedCurrent.length !== sortedRecipe.length) continue;

      const materialsMatch = sortedCurrent.every((m, i) => m === sortedRecipe[i]);
      if (!materialsMatch) continue;

      const heatOk = this.heat >= recipe.heatRange[0] && this.heat <= recipe.heatRange[1];
      const stirOk = this.stirCount >= recipe.stirRange[0] && this.stirCount <= recipe.stirRange[1];

      if (heatOk && stirOk) {
        if (!bestMatch || RARITY_ORDER[recipe.rarity] > RARITY_ORDER[bestMatch.rarity]) {
          bestMatch = recipe;
        }
      }
    }

    return bestMatch;
  }

  public performCraft(recipe: Recipe): CraftedProduct {
    recipe.discovered = true;
    this.triggerExplosion();
    this.playSound();

    const product: CraftedProduct = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      recipeId: recipe.id,
      name: recipe.name,
      rarity: recipe.rarity,
      materials: [...recipe.materials],
      timestamp: Date.now()
    };

    this.craftedProducts.push(product);
    setTimeout(() => this.clearMaterials(), 500);

    return product;
  }

  private triggerExplosion(): void {
    const explosiveParticles: Particle[] = [];
    for (const p of this.particles) {
      const dx = p.x - this.crucibleCenterX;
      const dy = p.y - this.crucibleCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      explosiveParticles.push({
        ...p,
        vx: (dx / dist) * (2 + Math.random() * 3),
        vy: (dy / dist) * (2 + Math.random() * 3),
        life: 12,
        maxLife: 12,
        explosive: true
      });
    }
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      explosiveParticles.push({
        x: this.crucibleCenterX,
        y: this.crucibleCenterY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: ['#FF4500', '#FFD700', '#FF6347'][Math.floor(Math.random() * 3)],
        size: 2 + Math.random() * 2,
        life: 12,
        maxLife: 12,
        material: MaterialType.SULFUR,
        explosive: true
      });
    }
    this.particles = explosiveParticles;
  }

  private playSound(): void {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(400, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (_e) {
      // Audio not supported
    }
  }

  public unlockRecipe(recipeId: string, productId: string): boolean {
    const recipe = this.recipes.find(r => r.id === recipeId);
    const productIndex = this.craftedProducts.findIndex(p => p.id === productId);

    if (!recipe || recipe.unlocked || productIndex === -1) {
      return false;
    }

    this.craftedProducts.splice(productIndex, 1);
    recipe.unlocked = true;
    return true;
  }

  public getLockedRecipes(): Recipe[] {
    return this.recipes.filter(r => !r.unlocked);
  }
}
