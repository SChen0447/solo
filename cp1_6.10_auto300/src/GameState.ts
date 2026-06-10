export type CropType = 'wheat' | 'carrot' | 'sunflower' | 'strawberry' | 'magicCorn';
export type CropStage = 'seed' | 'sprout' | 'mature';
export type TileState = 'locked' | 'unlocked';
export type AnimalType = 'chicken' | 'sheep';
export type FacilityType = 'sprinkler' | 'fertilizer' | 'broadcastTower' | 'waterTrough';
export type DecorationType = 'windmill' | 'fence' | 'scarecrow';
export type ShopTab = 'seed' | 'facility' | 'decoration';

export interface Crop {
  type: CropType;
  stage: CropStage;
  growthProgress: number;
  mature: boolean;
  doubleYield: boolean;
}

export interface Animal {
  id: string;
  type: AnimalType;
  tileX: number;
  tileY: number;
  subX: number;
  subY: number;
  targetSubX: number;
  targetSubY: number;
  mood: number;
  productionTimer: number;
  moveTimer: number;
  isGray: boolean;
  recoveryFeedCount: number;
  pendingProduct: boolean;
}

export interface Facility {
  type: FacilityType;
  tileX: number;
  tileY: number;
  cooldownTimer: number;
  effectTimer: number;
}

export interface Decoration {
  type: DecorationType;
  tileX: number;
  tileY: number;
}

export interface Tile {
  x: number;
  y: number;
  state: TileState;
  unlockCost: number;
  crop: Crop | null;
  facility: Facility | null;
  decoration: Decoration | null;
}

export interface ClickEffect {
  x: number;
  y: number;
  timer: number;
}

export interface ToastMessage {
  text: string;
  timer: number;
}

export interface CropConfig {
  name: string;
  emoji: string;
  growTime: number;
  sellPrice: number;
  seedPrice: number;
  doubleChance?: number;
}

export const GRID_COLS = 6;
export const GRID_ROWS = 5;
export const TILE_SIZE = 64;
export const UNLOCK_COST = 50;
export const DAY_DURATION = 10;
export const WATER_COOLDOWN = 30;
export const WATER_MOOD_BOOST = 10;
export const MOOD_DECAY_PER_SEC = 0.2;
export const MOOD_LOW_THRESHOLD = 30;
export const RECOVERY_FEEDS_NEEDED = 3;

export const CROP_CONFIGS: Record<CropType, CropConfig> = {
  wheat: { name: '小麦', emoji: '🌾', growTime: 15, sellPrice: 10, seedPrice: 6 },
  carrot: { name: '胡萝卜', emoji: '🥕', growTime: 25, sellPrice: 20, seedPrice: 12 },
  sunflower: { name: '向日葵', emoji: '🌻', growTime: 35, sellPrice: 30, seedPrice: 18 },
  strawberry: { name: '草莓', emoji: '🍓', growTime: 50, sellPrice: 45, seedPrice: 27 },
  magicCorn: { name: '魔法玉米', emoji: '🌽', growTime: 70, sellPrice: 80, seedPrice: 48, doubleChance: 0.1 },
};

export const ANIMAL_CONFIGS = {
  chicken: { emoji: '🐔', productEmoji: '🥚', productPrice: 5, productionInterval: 10, name: '鸡' },
  sheep: { emoji: '🐑', productEmoji: '🧶', productPrice: 12, productionInterval: 20, name: '羊' },
};

export const FACILITY_CONFIGS = {
  sprinkler: { name: '自动洒水器', emoji: '💧', price: 300, desc: '相邻4格作物生长+30%' },
  fertilizer: { name: '肥料桶', emoji: '🧪', price: 150, desc: '10秒内所有作物+20%进度' },
  broadcastTower: { name: '广播塔', emoji: '📡', price: 500, desc: '每60秒所有动物心情+20' },
  waterTrough: { name: '水槽', emoji: '💦', price: 0, desc: '喂水提升动物心情' },
};

export const DECORATION_CONFIGS = {
  windmill: { name: '风车', emoji: '🌀', price: 80 },
  fence: { name: '栅栏', emoji: '🚧', price: 50 },
  scarecrow: { name: '稻草人', emoji: '🎃', price: 100 },
};

export class GameState {
  tiles: Tile[][] = [];
  animals: Animal[] = [];
  gold: number = 100;
  day: number = 1;
  timeAccumulator: number = 0;
  selectedTile: { x: number; y: number } | null = null;
  shopOpen: boolean = false;
  activeShopTab: ShopTab = 'seed';
  toast: ToastMessage | null = null;
  clickEffects: ClickEffect[] = [];
  waterTroughFacility: Facility | null = null;
  fertilizerActive: boolean = false;
  fertilizerTimer: number = 0;
  broadcastTowerCooldown: number = 0;
  hasBroadcastTower: boolean = false;
  sprinklerPositions: { x: number; y: number }[] = [];

  constructor() {
    this.initTiles();
    this.initAnimals();
    this.placeWaterTrough();
  }

  private initTiles(): void {
    const initialUnlocked = new Set<string>(['1-1', '1-2', '2-1', '2-2']);
    this.tiles = [];
    for (let y = 0; y < GRID_ROWS; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < GRID_COLS; x++) {
        const key = `${x}-${y}`;
        row.push({
          x,
          y,
          state: initialUnlocked.has(key) ? 'unlocked' : 'locked',
          unlockCost: UNLOCK_COST,
          crop: null,
          facility: null,
          decoration: null,
        });
      }
      this.tiles.push(row);
    }
  }

  private initAnimals(): void {
    this.animals = [
      this.createAnimal('chicken', 1, 1),
      this.createAnimal('sheep', 2, 2),
    ];
  }

  private createAnimal(type: AnimalType, tx: number, ty: number): Animal {
    const centerX = tx * TILE_SIZE + TILE_SIZE / 2;
    const centerY = ty * TILE_SIZE + TILE_SIZE / 2;
    return {
      id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      tileX: tx,
      tileY: ty,
      subX: centerX,
      subY: centerY,
      targetSubX: centerX,
      targetSubY: centerY,
      mood: 80,
      productionTimer: 0,
      moveTimer: Math.random() * 3 + 2,
      isGray: false,
      recoveryFeedCount: 0,
      pendingProduct: false,
    };
  }

  private placeWaterTrough(): void {
    const cx = Math.floor(GRID_COLS / 2);
    const cy = Math.floor(GRID_ROWS / 2);
    const tile = this.tiles[cy][cx];
    if (tile.state === 'locked') {
      tile.state = 'unlocked';
    }
    tile.facility = {
      type: 'waterTrough',
      tileX: cx,
      tileY: cy,
      cooldownTimer: 0,
      effectTimer: 0,
    };
    this.waterTroughFacility = tile.facility;
  }

  isTileUnlocked(x: number, y: number): boolean {
    return x >= 0 && x < GRID_COLS && y >= 0 && y < GRID_ROWS && this.tiles[y][x].state === 'unlocked';
  }

  isTileEmpty(x: number, y: number): boolean {
    if (!this.isTileUnlocked(x, y)) return false;
    const t = this.tiles[y][x];
    return !t.crop && !t.facility && !t.decoration;
  }

  findFirstEmptyTile(): { x: number; y: number } | null {
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        if (this.isTileEmpty(x, y)) return { x, y };
      }
    }
    return null;
  }

  getAdjacentTiles(x: number, y: number): { x: number; y: number }[] {
    return [
      { x: x - 1, y },
      { x: x + 1, y },
      { x, y: y - 1 },
      { x, y: y + 1 },
    ].filter(p => p.x >= 0 && p.x < GRID_COLS && p.y >= 0 && p.y < GRID_ROWS);
  }

  showToast(text: string): void {
    this.toast = { text, timer: 2 };
  }

  addClickEffect(x: number, y: number): void {
    this.clickEffects.push({ x, y, timer: 0.25 });
  }

  unlockTile(x: number, y: number): boolean {
    if (x < 0 || x >= GRID_COLS || y < 0 || y >= GRID_ROWS) return false;
    const tile = this.tiles[y][x];
    if (tile.state === 'unlocked') {
      this.showToast('该土地已解锁');
      return false;
    }
    if (this.gold < tile.unlockCost) {
      this.showToast('金币不足！');
      return false;
    }
    this.gold -= tile.unlockCost;
    tile.state = 'unlocked';
    this.showToast(`土地已解锁 (-${tile.unlockCost}💰)`);
    return true;
  }

  selectTile(x: number, y: number): void {
    if (!this.isTileUnlocked(x, y)) {
      this.unlockTile(x, y);
      return;
    }
    this.selectedTile = { x, y };
  }

  deselectTile(): void {
    this.selectedTile = null;
  }

  plantCrop(cropType: CropType): boolean {
    if (!this.selectedTile) {
      this.showToast('请先选择一块土地');
      return false;
    }
    const { x, y } = this.selectedTile;
    const tile = this.tiles[y][x];
    if (tile.crop) {
      this.showToast('这块土地已经种了作物');
      return false;
    }
    if (tile.facility || tile.decoration) {
      this.showToast('这块土地被占用了');
      return false;
    }
    const cfg = CROP_CONFIGS[cropType];
    if (this.gold < cfg.seedPrice) {
      this.showToast('金币不足！');
      return false;
    }
    this.gold -= cfg.seedPrice;
    tile.crop = {
      type: cropType,
      stage: 'seed',
      growthProgress: 0,
      mature: false,
      doubleYield: cfg.doubleChance ? Math.random() < cfg.doubleChance : false,
    };
    this.showToast(`种植${cfg.name}成功 (-${cfg.seedPrice}💰)`);
    return true;
  }

  harvestCrop(x: number, y: number): boolean {
    const tile = this.tiles[y][x];
    if (!tile.crop || !tile.crop.mature) return false;
    const cfg = CROP_CONFIGS[tile.crop.type];
    let earnings = cfg.sellPrice;
    if (tile.crop.doubleYield) {
      earnings *= 2;
      this.showToast(`✨ 魔法玉米双倍产出！+${earnings}💰`);
    } else {
      this.showToast(`收获${cfg.name} +${earnings}💰`);
    }
    this.gold += earnings;
    tile.crop = null;
    return true;
  }

  collectAnimalProduct(animalId: string): boolean {
    const animal = this.animals.find(a => a.id === animalId);
    if (!animal || !animal.pendingProduct || animal.isGray) return false;
    const cfg = ANIMAL_CONFIGS[animal.type];
    let price = cfg.productPrice;
    if (animal.mood >= 100) price *= 2;
    this.gold += price;
    animal.pendingProduct = false;
    animal.productionTimer = 0;
    this.showToast(`收获${cfg.productEmoji} +${price}💰`);
    return true;
  }

  feedWater(): boolean {
    if (!this.waterTroughFacility) return false;
    if (this.waterTroughFacility.cooldownTimer > 0) {
      this.showToast('水槽冷却中...');
      return false;
    }
    this.waterTroughFacility.cooldownTimer = WATER_COOLDOWN;
    let boosted = 0;
    let recovered = 0;
    for (const animal of this.animals) {
      if (animal.isGray) {
        animal.recoveryFeedCount++;
        if (animal.recoveryFeedCount >= RECOVERY_FEEDS_NEEDED) {
          animal.isGray = false;
          animal.recoveryFeedCount = 0;
          animal.mood = MOOD_LOW_THRESHOLD + 1;
          recovered++;
        }
      } else {
        animal.mood = Math.min(100, animal.mood + WATER_MOOD_BOOST);
        boosted++;
      }
    }
    if (recovered > 0) {
      this.showToast(`💦 喂水成功！${recovered}只动物恢复生产`);
    } else {
      this.showToast(`💦 喂水成功！${boosted}只动物心情+${WATER_MOOD_BOOST}`);
    }
    return true;
  }

  buyShopItem(itemId: string): boolean {
    if (itemId in CROP_CONFIGS) {
      return this.plantCrop(itemId as CropType);
    }
    if (itemId in FACILITY_CONFIGS && itemId !== 'waterTrough') {
      const cfg = FACILITY_CONFIGS[itemId as Exclude<FacilityType, 'waterTrough'>];
      if (this.gold < cfg.price) {
        this.showToast('金币不足！');
        return false;
      }
      const empty = this.findFirstEmptyTile();
      if (!empty) {
        this.showToast('土地已满，请先解锁更多土地');
        return false;
      }
      if (itemId === 'fertilizer') {
        this.gold -= cfg.price;
        this.fertilizerActive = true;
        this.fertilizerTimer = 10;
        for (let y = 0; y < GRID_ROWS; y++) {
          for (let x = 0; x < GRID_COLS; x++) {
            const tile = this.tiles[y][x];
            if (tile.crop && !tile.crop.mature) {
              tile.crop.growthProgress = Math.min(1, tile.crop.growthProgress + 0.2);
              this.updateCropStage(tile.crop);
            }
          }
        }
        this.showToast(`🧪 肥料生效！所有作物+20%进度`);
        return true;
      }
      this.gold -= cfg.price;
      const tile = this.tiles[empty.y][empty.x];
      tile.facility = {
        type: itemId as FacilityType,
        tileX: empty.x,
        tileY: empty.y,
        cooldownTimer: 0,
        effectTimer: 0,
      };
      if (itemId === 'sprinkler') {
        this.sprinklerPositions.push({ x: empty.x, y: empty.y });
      }
      if (itemId === 'broadcastTower') {
        this.hasBroadcastTower = true;
        this.broadcastTowerCooldown = 60;
      }
      this.showToast(`购买${cfg.name}成功！`);
      return true;
    }
    if (itemId in DECORATION_CONFIGS) {
      const cfg = DECORATION_CONFIGS[itemId as DecorationType];
      if (this.gold < cfg.price) {
        this.showToast('金币不足！');
        return false;
      }
      const empty = this.findFirstEmptyTile();
      if (!empty) {
        this.showToast('土地已满，请先解锁更多土地');
        return false;
      }
      this.gold -= cfg.price;
      const tile = this.tiles[empty.y][empty.x];
      tile.decoration = {
        type: itemId as DecorationType,
        tileX: empty.x,
        tileY: empty.y,
      };
      this.showToast(`购买${cfg.name}成功！`);
      return true;
    }
    return false;
  }

  private updateCropStage(crop: Crop): void {
    if (crop.growthProgress >= 1) {
      crop.stage = 'mature';
      crop.mature = true;
    } else if (crop.growthProgress >= 0.5) {
      crop.stage = 'sprout';
    } else {
      crop.stage = 'seed';
    }
  }

  private isNearSprinkler(x: number, y: number): boolean {
    for (const sp of this.sprinklerPositions) {
      const adj = this.getAdjacentTiles(sp.x, sp.y);
      if (adj.some(p => p.x === x && p.y === y)) return true;
    }
    return false;
  }

  update(dt: number): void {
    this.timeAccumulator += dt;
    while (this.timeAccumulator >= DAY_DURATION) {
      this.timeAccumulator -= DAY_DURATION;
      this.day++;
    }

    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const tile = this.tiles[y][x];
        if (tile.crop && !tile.crop.mature) {
          const cfg = CROP_CONFIGS[tile.crop.type];
          let speed = 1 / cfg.growTime;
          if (this.isNearSprinkler(x, y)) speed *= 1.3;
          tile.crop.growthProgress = Math.min(1, tile.crop.growthProgress + speed * dt);
          this.updateCropStage(tile.crop);
        }
      }
    }

    if (this.fertilizerActive) {
      this.fertilizerTimer -= dt;
      if (this.fertilizerTimer <= 0) {
        this.fertilizerActive = false;
      }
    }

    for (const animal of this.animals) {
      if (!animal.isGray) {
        animal.mood = Math.max(0, animal.mood - MOOD_DECAY_PER_SEC * dt);
        if (animal.mood < MOOD_LOW_THRESHOLD) {
          animal.isGray = true;
          animal.recoveryFeedCount = 0;
          animal.pendingProduct = false;
        }
      }

      if (!animal.isGray && !animal.pendingProduct) {
        animal.productionTimer += dt;
        const interval = ANIMAL_CONFIGS[animal.type].productionInterval;
        if (animal.productionTimer >= interval) {
          animal.pendingProduct = true;
        }
      }

      animal.moveTimer -= dt;
      if (animal.moveTimer <= 0) {
        animal.moveTimer = 2 + Math.random() * 4;
        this.pickAnimalTarget(animal);
      }

      const dx = animal.targetSubX - animal.subX;
      const dy = animal.targetSubY - animal.subY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        const speed = 12;
        animal.subX += (dx / dist) * speed * dt;
        animal.subY += (dy / dist) * speed * dt;
      }
    }

    if (this.waterTroughFacility && this.waterTroughFacility.cooldownTimer > 0) {
      this.waterTroughFacility.cooldownTimer -= dt;
    }

    if (this.hasBroadcastTower) {
      this.broadcastTowerCooldown -= dt;
      if (this.broadcastTowerCooldown <= 0) {
        this.broadcastTowerCooldown = 60;
        for (const a of this.animals) {
          if (!a.isGray) {
            a.mood = Math.min(100, a.mood + 20);
          }
        }
        this.showToast('📡 广播塔：动物心情+20');
      }
    }

    for (let i = this.clickEffects.length - 1; i >= 0; i--) {
      this.clickEffects[i].timer -= dt;
      if (this.clickEffects[i].timer <= 0) {
        this.clickEffects.splice(i, 1);
      }
    }

    if (this.toast) {
      this.toast.timer -= dt;
      if (this.toast.timer <= 0) {
        this.toast = null;
      }
    }
  }

  private pickAnimalTarget(animal: Animal): void {
    const candidates: { x: number; y: number }[] = [];
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        if (this.tiles[y][x].state === 'unlocked') {
          candidates.push({ x, y });
        }
      }
    }
    if (candidates.length === 0) return;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    animal.targetSubX = pick.x * TILE_SIZE + 16 + Math.random() * (TILE_SIZE - 32);
    animal.targetSubY = pick.y * TILE_SIZE + 16 + Math.random() * (TILE_SIZE - 32);
  }
}
