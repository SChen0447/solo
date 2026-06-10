import { v4 as uuidv4 } from 'uuid';
import {
  GhostConfig,
  GHOSTS,
  RARITY_CONFIG,
  Rarity,
  BaitType,
  RoomType,
  ROOM_CONFIG,
  BAIT_CONFIG,
  getGhostById
} from './ghostData';

export interface GhostInstance {
  instanceId: string;
  ghostId: string;
  x: number;
  y: number;
  baseY: number;
  spawnTime: number;
  forcedExpireAt?: number;
  phase: number;
  visible: boolean;
}

export interface PlacedBait {
  instanceId: string;
  type: Exclude<BaitType, 'none'>;
  x: number;
  y: number;
  placedAt: number;
  duration: number;
}

export interface BaitState {
  type: Exclude<BaitType, 'none'>;
  lastUsedAt: number;
  cooldown: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface CatchRing {
  x: number;
  y: number;
  startTime: number;
  duration: number;
  maxRadius: number;
}

export interface PulseWave {
  x: number;
  y: number;
  startTime: number;
  duration: number;
  maxRadius: number;
}

export interface MergeEffect {
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

export interface ComposeResultPopup {
  ghost: GhostConfig;
  startTime: number;
  duration: number;
}

export interface OfflineRewardPopup {
  count: number;
  startTime: number;
  duration: number;
}

export type GameEventType =
  | 'stateChanged'
  | 'ghostCaught'
  | 'ghostMissed'
  | 'soulsChanged'
  | 'composeSuccess'
  | 'roomUnlocked'
  | 'roomChanged'
  | 'resonanceUsed'
  | 'saveLoaded';

export interface SaveData {
  unlockedRooms: RoomType[];
  currentRoom: RoomType;
  capturedGhosts: Record<string, number>;
  soulShards: number;
  baitStates: Record<string, number>;
  lastSaveTime: number;
}

const MAX_GHOSTS = 30;
const SPAWN_INTERVAL = 5000;
const BAIT_DURATION = 15000;
const FORCED_GHOST_DURATION = 15000;
const RESONANCE_COST = 10;
const SAVE_KEY = 'ghost_collector_save_v1';

export class GameManager {
  private listeners: Map<GameEventType, Set<() => void>> = new Map();
  private unlockedRooms: RoomType[] = ['attic'];
  private currentRoom: RoomType = 'attic';
  private activeGhosts: GhostInstance[] = [];
  private capturedGhosts: Record<string, number> = {};
  private soulShards: number = 0;
  private placedBaits: PlacedBait[] = [];
  private baitStates: BaitState[];
  private particles: Particle[] = [];
  private catchRings: CatchRing[] = [];
  private pulseWaves: PulseWave[] = [];
  private mergeEffects: MergeEffect[] = [];
  private composeResultPopup: ComposeResultPopup | null = null;
  private offlineRewardPopup: OfflineRewardPopup | null = null;
  private lastSpawnTime: number = 0;
  private gameStartTime: number = 0;

  constructor() {
    this.baitStates = (['pumpkin', 'book', 'crystal'] as const).map(type => ({
      type,
      lastUsedAt: 0,
      cooldown: BAIT_CONFIG[type].cooldown
    }));
    this.gameStartTime = performance.now();
  }

  on(event: GameEventType, callback: () => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  private emit(event: GameEventType): void {
    this.listeners.get(event)?.forEach(cb => cb());
  }

  getState() {
    return {
      unlockedRooms: [...this.unlockedRooms],
      currentRoom: this.currentRoom,
      activeGhosts: [...this.activeGhosts],
      capturedGhosts: { ...this.capturedGhosts },
      soulShards: this.soulShards,
      placedBaits: [...this.placedBaits],
      baitStates: this.baitStates.map(b => ({ ...b })),
      particles: [...this.particles],
      catchRings: [...this.catchRings],
      pulseWaves: [...this.pulseWaves],
      mergeEffects: [...this.mergeEffects],
      composeResultPopup: this.composeResultPopup,
      offlineRewardPopup: this.offlineRewardPopup,
      allGhosts: GHOSTS
    };
  }

  loadSave(): void {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const data: SaveData = JSON.parse(raw);
        this.unlockedRooms = data.unlockedRooms || ['attic'];
        this.currentRoom = data.currentRoom || 'attic';
        this.capturedGhosts = data.capturedGhosts || {};
        this.soulShards = data.soulShards || 0;
        if (data.baitStates) {
          this.baitStates.forEach(b => {
            const saved = data.baitStates![b.type];
            if (saved !== undefined) b.lastUsedAt = saved;
          });
        }

        const now = Date.now();
        const offlineMs = now - (data.lastSaveTime || now);
        if (offlineMs > 60000) {
          const minutes = Math.floor(offlineMs / 60000);
          const rewardCount = Math.min(minutes, 30);
          if (rewardCount > 0) {
            for (let i = 0; i < rewardCount; i++) {
              this.addRandomCapturedGhost();
            }
            this.offlineRewardPopup = {
              count: rewardCount,
              startTime: performance.now(),
              duration: 2000
            };
          }
        }
        this.emit('saveLoaded');
        this.emit('stateChanged');
      }
    } catch (e) {
      console.warn('Failed to load save:', e);
    }
  }

  save(): void {
    const data: SaveData = {
      unlockedRooms: this.unlockedRooms,
      currentRoom: this.currentRoom,
      capturedGhosts: this.capturedGhosts,
      soulShards: this.soulShards,
      baitStates: Object.fromEntries(this.baitStates.map(b => [b.type, b.lastUsedAt])),
      lastSaveTime: Date.now()
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }

  setCurrentRoom(room: RoomType): boolean {
    if (!this.unlockedRooms.includes(room)) return false;
    this.currentRoom = room;
    this.activeGhosts = [];
    this.placedBaits = [];
    this.lastSpawnTime = 0;
    this.emit('roomChanged');
    this.emit('stateChanged');
    return true;
  }

  unlockRoom(room: RoomType): boolean {
    if (this.unlockedRooms.includes(room)) return false;
    const cost = ROOM_CONFIG[room].unlockCost;
    if (this.soulShards < cost) return false;
    this.soulShards -= cost;
    this.unlockedRooms.push(room);
    this.emit('roomUnlocked');
    this.emit('soulsChanged');
    this.emit('stateChanged');
    return true;
  }

  update(now: number, dt: number): void {
    this.updateGhosts(now, dt);
    this.updateSpawning(now);
    this.updateBaits(now);
    this.updateParticles(now, dt);
    this.updateCatchRings(now);
    this.updatePulseWaves(now);
    this.updateMergeEffects(now);
    this.updatePopups(now);
  }

  private updateGhosts(now: number, dt: number): void {
    const toRemove: string[] = [];
    this.activeGhosts.forEach(g => {
      g.phase += dt;
      if (g.forcedExpireAt && now >= g.forcedExpireAt) {
        toRemove.push(g.instanceId);
      }
    });
    if (toRemove.length > 0) {
      this.activeGhosts = this.activeGhosts.filter(g => !toRemove.includes(g.instanceId));
      this.emit('stateChanged');
    }
  }

  private updateSpawning(now: number): void {
    if (this.lastSpawnTime === 0) this.lastSpawnTime = now;
    if (now - this.lastSpawnTime >= SPAWN_INTERVAL) {
      this.lastSpawnTime = now;
      this.spawnGhost();
    }
  }

  private updateBaits(now: number): void {
    const before = this.placedBaits.length;
    this.placedBaits = this.placedBaits.filter(b => now - b.placedAt < b.duration);
    if (this.placedBaits.length !== before) {
      this.emit('stateChanged');
    }
  }

  private updateParticles(now: number, dt: number): void {
    const before = this.particles.length;
    this.particles = this.particles.filter(p => {
      p.life -= dt;
      p.x += p.vx * dt / 16;
      p.y += p.vy * dt / 16;
      return p.life > 0;
    });
    if (this.particles.length !== before) {
      this.emit('stateChanged');
    }
  }

  private updateCatchRings(now: number): void {
    const before = this.catchRings.length;
    this.catchRings = this.catchRings.filter(r => now - r.startTime < r.duration);
    if (this.catchRings.length !== before) {
      this.emit('stateChanged');
    }
  }

  private updatePulseWaves(now: number): void {
    const before = this.pulseWaves.length;
    this.pulseWaves = this.pulseWaves.filter(w => now - w.startTime < w.duration);
    if (this.pulseWaves.length !== before) {
      this.emit('stateChanged');
    }
  }

  private updateMergeEffects(now: number): void {
    const before = this.mergeEffects.length;
    this.mergeEffects = this.mergeEffects.filter(e => now - e.startTime < e.duration);
    if (this.mergeEffects.length !== before) {
      this.emit('stateChanged');
    }
  }

  private updatePopups(now: number): void {
    if (this.composeResultPopup && now - this.composeResultPopup.startTime >= this.composeResultPopup.duration) {
      this.composeResultPopup = null;
      this.emit('stateChanged');
    }
    if (this.offlineRewardPopup && now - this.offlineRewardPopup.startTime >= this.offlineRewardPopup.duration) {
      this.offlineRewardPopup = null;
      this.emit('stateChanged');
    }
  }

  spawnGhost(forceRarity?: Rarity, forced?: boolean): GhostInstance | null {
    if (this.activeGhosts.length >= MAX_GHOSTS) {
      this.activeGhosts.shift();
    }

    let pool: GhostConfig[];
    if (forceRarity) {
      pool = GHOSTS.filter(g => g.rarity === forceRarity && g.spawnRooms.includes(this.currentRoom));
      if (pool.length === 0) {
        pool = GHOSTS.filter(g => g.rarity === forceRarity);
      }
    } else {
      const rarity = this.rollRarity();
      pool = GHOSTS.filter(g => g.rarity === rarity && g.spawnRooms.includes(this.currentRoom));
      if (pool.length === 0) {
        pool = GHOSTS.filter(g => g.rarity === rarity);
      }
    }

    if (pool.length === 0) return null;
    const config = pool[Math.floor(Math.random() * pool.length)];

    const x = 50 + Math.random() * 700;
    const y = 50 + Math.random() * 500;
    const instance: GhostInstance = {
      instanceId: uuidv4(),
      ghostId: config.id,
      x,
      y,
      baseY: y,
      spawnTime: performance.now(),
      phase: Math.random() * Math.PI * 2,
      visible: true
    };

    if (forced) {
      instance.forcedExpireAt = performance.now() + FORCED_GHOST_DURATION;
    }

    this.activeGhosts.push(instance);
    this.emit('stateChanged');
    return instance;
  }

  private rollRarity(): Rarity {
    const total = Object.values(RARITY_CONFIG).reduce((s, r) => s + r.spawnWeight, 0);
    let roll = Math.random() * total;
    for (const [rarity, cfg] of Object.entries(RARITY_CONFIG)) {
      roll -= cfg.spawnWeight;
      if (roll <= 0) return rarity as Rarity;
    }
    return 'common';
  }

  private addRandomCapturedGhost(): void {
    const rarity = this.rollRarity();
    const pool = GHOSTS.filter(g => g.rarity === rarity);
    if (pool.length === 0) return;
    const cfg = pool[Math.floor(Math.random() * pool.length)];
    this.capturedGhosts[cfg.id] = (this.capturedGhosts[cfg.id] || 0) + 1;
  }

  tryCatchGhost(instanceId: string, clickX: number, clickY: number): boolean {
    const idx = this.activeGhosts.findIndex(g => g.instanceId === instanceId);
    if (idx === -1) return false;

    const ghost = this.activeGhosts[idx];
    const cfg = getGhostById(ghost.ghostId);
    if (!cfg) return false;

    this.catchRings.push({
      x: clickX,
      y: clickY,
      startTime: performance.now(),
      duration: 300,
      maxRadius: 80
    });

    const success = this.rollCatch(cfg);
    if (success) {
      this.activeGhosts.splice(idx, 1);
      this.capturedGhosts[cfg.id] = (this.capturedGhosts[cfg.id] || 0) + 1;
      this.soulShards += 1;
      this.spawnCatchParticles(ghost.x, ghost.y, cfg.glowColor);
      this.emit('ghostCaught');
      this.emit('soulsChanged');
    } else {
      this.emit('ghostMissed');
    }
    this.emit('stateChanged');
    return success;
  }

  private rollCatch(cfg: GhostConfig): boolean {
    let rate = cfg.baseCatchRate;
    const rarityMul = RARITY_CONFIG[cfg.rarity].catchMultiplier;
    rate *= rarityMul;

    if (cfg.rarity !== 'common' && cfg.preferredBait !== 'none') {
      const hasBait = this.placedBaits.some(b => b.type === cfg.preferredBait);
      if (hasBait) {
        rate = 0.8;
      }
    } else if (cfg.rarity === 'common') {
      rate = 0.8;
    }

    return Math.random() < rate;
  }

  private spawnCatchParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const speed = 1 + Math.random() * 2;
      this.particles.push({
        id: uuidv4(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 600,
        maxLife: 600,
        color,
        size: 2 + Math.random() * 3
      });
    }
  }

  placeBait(type: Exclude<BaitType, 'none'>, x: number, y: number): boolean {
    const baitState = this.baitStates.find(b => b.type === type);
    if (!baitState) return false;
    const now = performance.now();
    if (now - baitState.lastUsedAt < baitState.cooldown) return false;

    baitState.lastUsedAt = now;
    this.placedBaits.push({
      instanceId: uuidv4(),
      type,
      x,
      y,
      placedAt: now,
      duration: BAIT_DURATION
    });
    this.emit('stateChanged');
    return true;
  }

  getBaitCooldown(type: Exclude<BaitType, 'none'>, now: number): number {
    const s = this.baitStates.find(b => b.type === type);
    if (!s) return 0;
    const elapsed = now - s.lastUsedAt;
    return Math.max(0, s.cooldown - elapsed);
  }

  canCompose(ghostId: string): boolean {
    const cfg = getGhostById(ghostId);
    if (!cfg || !cfg.recipe) return false;
    const count = this.capturedGhosts[ghostId] || 0;
    return count >= 3;
  }

  compose(ghostId: string): GhostConfig | null {
    const cfg = getGhostById(ghostId);
    if (!cfg || !cfg.recipe) return null;

    const count = this.capturedGhosts[ghostId] || 0;
    if (count < 3) return null;

    const resultId = this.findCompositionResult(ghostId);
    if (!resultId) return null;
    const result = getGhostById(resultId);
    if (!result) return null;

    this.capturedGhosts[ghostId] = count - 3;
    this.capturedGhosts[resultId] = (this.capturedGhosts[resultId] || 0) + 1;
    this.soulShards += 3;

    this.mergeEffects.push({
      x: 400,
      y: 300,
      startTime: performance.now(),
      duration: 400
    });

    this.composeResultPopup = {
      ghost: result,
      startTime: performance.now() + 400,
      duration: 2500
    };

    this.emit('composeSuccess');
    this.emit('soulsChanged');
    this.emit('stateChanged');
    return result;
  }

  private findCompositionResult(ghostId: string): string | null {
    for (const g of GHOSTS) {
      if (g.recipe && g.recipe.every(r => r === ghostId) && g.recipe.length === 3) {
        return g.id;
      }
    }
    return null;
  }

  useResonance(): boolean {
    if (this.soulShards < RESONANCE_COST) return false;
    this.soulShards -= RESONANCE_COST;

    this.pulseWaves.push({
      x: 180,
      y: 30,
      startTime: performance.now(),
      duration: 600,
      maxRadius: 1500
    });

    setTimeout(() => {
      const forcedRarity: Rarity = Math.random() < 0.7 ? 'epic' : 'legendary';
      this.spawnGhost(forcedRarity, true);
    }, 600);

    this.emit('resonanceUsed');
    this.emit('soulsChanged');
    this.emit('stateChanged');
    return true;
  }

  findGhostAt(x: number, y: number): GhostInstance | null {
    for (let i = this.activeGhosts.length - 1; i >= 0; i--) {
      const g = this.activeGhosts[i];
      const cfg = getGhostById(g.ghostId);
      if (!cfg) continue;
      const dy = Math.sin((g.phase / 1000) * (2 * Math.PI) / cfg.animation.floatPeriod) * cfg.animation.floatAmplitude;
      const gy = g.baseY + dy;
      const dx = x - g.x;
      const ddy = y - gy;
      const dist = Math.sqrt(dx * dx + ddy * ddy);
      if (dist <= cfg.animation.size) {
        return g;
      }
    }
    return null;
  }

  getCapturedCount(ghostId: string): number {
    return this.capturedGhosts[ghostId] || 0;
  }

  getTotalCaptured(): number {
    return Object.values(this.capturedGhosts).reduce((s, n) => s + n, 0);
  }

  getUniqueCaptured(): number {
    return Object.keys(this.capturedGhosts).filter(k => this.capturedGhosts[k] > 0).length;
  }
}
