import { v4 as uuidv4 } from 'uuid';
import {
  GRID_SIZE,
  OXYGEN_DRAIN_PER_SEC,
  BATTERY_DRAIN_PER_SEC,
  DEFAULT_MINING_TIME,
  STUN_DURATION,
  OXYGEN_LOSS_ON_HIT,
  BATTERY_COST_SONAR,
  DEPTH_PER_LEVEL,
  MIN_DEPTH,
  MAX_DEPTH,
  type MineralType,
  type DroneState,
  type Creature,
  type CreatureType,
  type FloatingText,
  type UpgradeState
} from './types';

export class DroneManager {
  private state: DroneState;
  private creatures: Creature[] = [];
  private floatingTexts: FloatingText[] = [];
  private upgradeState: UpgradeState = { thrusterLevel: 0, armLevel: 0, oxygenTankLevel: 0 };
  private lastCreatureSpawn: number = 0;
  private nextCreatureSpawn: number = 0;
  private onStunCallback: (() => void) | null = null;
  private onGameOverCallback: (() => void) | null = null;
  private gameStartTime: number = Date.now();
  private maxDepthReached: number = MIN_DEPTH;

  constructor() {
    this.state = this.createInitialState();
    this.scheduleNextCreatureSpawn();
  }

  private createInitialState(): DroneState {
    return {
      gridX: Math.floor(GRID_SIZE / 2),
      gridY: Math.floor(GRID_SIZE / 2),
      depthLevel: 0,
      depth: MIN_DEPTH,
      oxygen: 100,
      battery: 100,
      maxOxygen: 100,
      maxBattery: 100,
      baseSpeed: 1,
      miningTime: DEFAULT_MINING_TIME,
      stunnedUntil: 0,
      isMining: false,
      miningProgress: 0,
      miningTarget: null,
      inventory: { iron: 0, copper: 0, cobalt: 0 },
      lastSonarTime: 0
    };
  }

  public getState(): Readonly<DroneState> {
    return this.state;
  }

  public getCreatures(): Readonly<Creature[]> {
    return this.creatures;
  }

  public getFloatingTexts(): Readonly<FloatingText[]> {
    return this.floatingTexts;
  }

  public getUpgradeState(): Readonly<UpgradeState> {
    return this.upgradeState;
  }

  public getElapsedTime(): number {
    return (Date.now() - this.gameStartTime) / 1000;
  }

  public getMaxDepth(): number {
    return this.maxDepthReached;
  }

  public isStunned(): boolean {
    return Date.now() < this.state.stunnedUntil;
  }

  public isAtSurface(): boolean {
    return this.state.depthLevel === 0;
  }

  public move(dx: number, dy: number): boolean {
    if (this.isStunned() || this.state.isMining) return false;
    const newX = this.state.gridX + dx;
    const newY = this.state.gridY + dy;
    if (newX < 0 || newX >= GRID_SIZE || newY < 0 || newY >= GRID_SIZE) return false;
    this.state.gridX = newX;
    this.state.gridY = newY;
    return true;
  }

  public dive(): boolean {
    if (this.isStunned() || this.state.isMining) return false;
    const newDepthLevel = this.state.depthLevel + 1;
    const newDepth = MIN_DEPTH - newDepthLevel * DEPTH_PER_LEVEL;
    if (newDepth < MAX_DEPTH) return false;
    this.state.depthLevel = newDepthLevel;
    this.state.depth = newDepth;
    if (newDepth < this.maxDepthReached) this.maxDepthReached = newDepth;
    return true;
  }

  public ascend(): boolean {
    if (this.isStunned() || this.state.isMining) return false;
    if (this.state.depthLevel <= 0) return false;
    this.state.depthLevel -= 1;
    this.state.depth = MIN_DEPTH - this.state.depthLevel * DEPTH_PER_LEVEL;
    return true;
  }

  public startMining(): boolean {
    if (this.isStunned() || this.state.isMining) return false;
    this.state.isMining = true;
    this.state.miningProgress = 0;
    this.state.miningTarget = { x: this.state.gridX, y: this.state.gridY };
    return true;
  }

  public cancelMining(): void {
    this.state.isMining = false;
    this.state.miningProgress = 0;
    this.state.miningTarget = null;
  }

  public fireSonar(): boolean {
    if (this.isStunned()) return false;
    const now = Date.now();
    if (now - this.state.lastSonarTime < 5000) return false;
    if (this.state.battery < BATTERY_COST_SONAR) return false;
    this.state.battery -= BATTERY_COST_SONAR;
    this.state.lastSonarTime = now;
    this.creatures = [];
    return true;
  }

  public addMineral(type: MineralType, amount: number): void {
    this.state.inventory[type] += amount;
    this.addFloatingText(
      `+${this.getMineralName(type)}${amount}`,
      this.getMineralColor(type)
    );
  }

  private getMineralName(type: MineralType): string {
    const names: Record<MineralType, string> = { iron: '铁', copper: '铜', cobalt: '钴' };
    return names[type];
  }

  private getMineralColor(type: MineralType): string {
    const colors: Record<MineralType, string> = { iron: '#b5651d', copper: '#cd7f32', cobalt: '#008080' };
    return colors[type];
  }

  public addFloatingText(text: string, color: string): void {
    this.floatingTexts.push({
      id: uuidv4(),
      x: this.state.gridX,
      y: this.state.gridY,
      text,
      color,
      startTime: Date.now(),
      duration: 1500
    });
  }

  public refillAtBase(): void {
    this.state.oxygen = this.state.maxOxygen;
    this.state.battery = this.state.maxBattery;
  }

  public applyUpgrade(
    type: 'thruster' | 'arm' | 'oxygenTank',
    cost: { iron: number; copper: number; cobalt: number }
  ): boolean {
    if (
      this.state.inventory.iron < cost.iron ||
      this.state.inventory.copper < cost.copper ||
      this.state.inventory.cobalt < cost.cobalt
    ) {
      return false;
    }

    this.state.inventory.iron -= cost.iron;
    this.state.inventory.copper -= cost.copper;
    this.state.inventory.cobalt -= cost.cobalt;

    switch (type) {
      case 'thruster':
        this.upgradeState.thrusterLevel++;
        this.state.baseSpeed *= 1.15;
        break;
      case 'arm':
        this.upgradeState.armLevel++;
        this.state.miningTime = Math.max(500, this.state.miningTime - 500);
        break;
      case 'oxygenTank':
        this.upgradeState.oxygenTankLevel++;
        this.state.maxOxygen += 30;
        this.state.oxygen = Math.min(this.state.oxygen + 30, this.state.maxOxygen);
        break;
    }
    return true;
  }

  public getEffectiveSpeed(): number {
    const depthFactor = 1 - (Math.abs(this.state.depth) - 50) / 1000 * 0.3;
    return this.state.baseSpeed * Math.max(0.5, depthFactor);
  }

  public setOnStunCallback(callback: () => void): void {
    this.onStunCallback = callback;
  }

  public setOnGameOverCallback(callback: () => void): void {
    this.onGameOverCallback = callback;
  }

  private scheduleNextCreatureSpawn(): void {
    this.nextCreatureSpawn = Date.now() + this.randomRange(30000, 60000);
  }

  private randomRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private spawnCreature(): void {
    const types: CreatureType[] = ['eel', 'jellyfish'];
    const type = types[Math.floor(Math.random() * types.length)];
    let x: number, y: number;
    do {
      x = Math.floor(Math.random() * GRID_SIZE);
      y = Math.floor(Math.random() * GRID_SIZE);
    } while (x === this.state.gridX && y === this.state.gridY);

    this.creatures.push({
      id: uuidv4(),
      type,
      gridX: x,
      gridY: y,
      targetX: this.state.gridX,
      targetY: this.state.gridY,
      speed: 0.05,
      trail: []
    });
    this.scheduleNextCreatureSpawn();
  }

  public update(deltaTime: number): void {
    const now = Date.now();

    if (!this.isStunned() && !this.state.isMining) {
      this.state.oxygen -= OXYGEN_DRAIN_PER_SEC * deltaTime;
      this.state.battery -= BATTERY_DRAIN_PER_SEC * deltaTime;
    }

    if (this.state.isAtSurface === undefined || this.isAtSurface()) {
      if (this.state.isMining) {
        this.state.miningProgress += deltaTime * 1000;
        if (this.state.miningProgress >= this.state.miningTime) {
          this.state.miningProgress = this.state.miningTime;
        }
      }
    }

    if (this.state.oxygen <= 0 || this.state.battery <= 0) {
      this.state.oxygen = Math.max(0, this.state.oxygen);
      this.state.battery = Math.max(0, this.state.battery);
      if (this.onGameOverCallback) this.onGameOverCallback();
      return;
    }

    if (now >= this.nextCreatureSpawn && this.creatures.length < 3) {
      this.spawnCreature();
    }

    this.updateCreatures(deltaTime);

    this.floatingTexts = this.floatingTexts.filter(
      (t) => now - t.startTime < t.duration
    );
  }

  private updateCreatures(deltaTime: number): void {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const creature of this.creatures) {
      creature.targetX = this.state.gridX;
      creature.targetY = this.state.gridY;

      const dx = creature.targetX - creature.gridX;
      const dy = creature.targetY - creature.gridY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < CREATURE_ALERT_DISTANCE) {
        creature.speed = 0.1;
      } else {
        creature.speed = 0.05;
      }

      if (dist > 0.1) {
        const move = creature.speed * deltaTime * 60;
        creature.gridX += (dx / dist) * move;
        creature.gridY += (dy / dist) * move;

        creature.trail.push({ x: creature.gridX, y: creature.gridY, time: now });
        if (creature.trail.length > 10) creature.trail.shift();
      }

      if (dist < 0.5 && !this.isStunned()) {
        this.state.stunnedUntil = now + STUN_DURATION;
        this.state.oxygen = Math.max(0, this.state.oxygen - OXYGEN_LOSS_ON_HIT);
        this.cancelMining();
        if (this.onStunCallback) this.onStunCallback();
        toRemove.push(creature.id);
      }
    }

    this.creatures = this.creatures.filter((c) => !toRemove.includes(c.id));
  }

  public hasCreaturesNearby(): boolean {
    for (const creature of this.creatures) {
      const dx = creature.gridX - this.state.gridX;
      const dy = creature.gridY - this.state.gridY;
      if (Math.sqrt(dx * dx + dy * dy) < CREATURE_ALERT_DISTANCE) {
        return true;
      }
    }
    return false;
  }

  public getTotalUpgrades(): number {
    return this.upgradeState.thrusterLevel + this.upgradeState.armLevel + this.upgradeState.oxygenTankLevel;
  }

  public resetForNewGame(): void {
    this.state = this.createInitialState();
    this.creatures = [];
    this.floatingTexts = [];
    this.upgradeState = { thrusterLevel: 0, armLevel: 0, oxygenTankLevel: 0 };
    this.gameStartTime = Date.now();
    this.maxDepthReached = MIN_DEPTH;
    this.scheduleNextCreatureSpawn();
  }

  public resetToBase(): void {
    this.state.gridX = Math.floor(GRID_SIZE / 2);
    this.state.gridY = Math.floor(GRID_SIZE / 2);
    this.state.depthLevel = 0;
    this.state.depth = MIN_DEPTH;
    this.state.oxygen = this.state.maxOxygen;
    this.state.battery = this.state.maxBattery;
    this.state.stunnedUntil = 0;
    this.state.isMining = false;
    this.state.miningProgress = 0;
    this.state.miningTarget = null;
    this.creatures = [];
    this.gameStartTime = Date.now();
  }
}
