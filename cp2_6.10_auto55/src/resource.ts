export type ResourceType = 'energy' | 'alloy' | 'food';

export interface ResourceConfig {
  name: ResourceType;
  supplementAmount: number;
  cooldownMs: number;
}

export interface ResourceState {
  energy: number;
  alloy: number;
  food: number;
}

export interface SupplementStats {
  energy: number;
  alloy: number;
  food: number;
}

export interface ResourceUpdatePayload {
  type: ResourceType;
  oldValue: number;
  newValue: number;
}

export interface ProgressUpdatePayload {
  oldValue: number;
  newValue: number;
}

export interface CountdownUpdatePayload {
  totalSeconds: number;
  isWarning: boolean;
}

export const RESOURCE_CONFIGS: Record<ResourceType, ResourceConfig> = {
  energy: { name: 'energy', supplementAmount: 15, cooldownMs: 3000 },
  alloy: { name: 'alloy', supplementAmount: 10, cooldownMs: 2000 },
  food: { name: 'food', supplementAmount: 8, cooldownMs: 1500 },
};

const INITIAL_RESOURCE = 100;
const INITIAL_COUNTDOWN = 10 * 60;
const CONSUMPTION_INTERVAL_MS = 5000;
const CONSUMPTION_AMOUNT = 1;
const SUPPLEMENTS_PER_PROGRESS = 5;
const PROGRESS_INCREMENT = 5;
const WARNING_THRESHOLD_SECONDS = 60;

export class ResourceManager {
  private state: ResourceState;
  private countdownSeconds: number;
  private progress: number;
  private supplementStats: SupplementStats;
  private supplementsSinceProgress: number;
  private cooldowns: Record<ResourceType, number>;
  private doubleConsumptionResources: Set<ResourceType>;

  private consumptionTimerId: number | null = null;
  private countdownTimerId: number | null = null;
  private cooldownTimerId: number | null = null;

  private onResourceChange: ((payload: ResourceUpdatePayload) => void) | null = null;
  private onProgressChange: ((payload: ProgressUpdatePayload) => void) | null = null;
  private onCountdownChange: ((payload: CountdownUpdatePayload) => void) | null = null;
  private onSupplement: ((type: ResourceType) => void) | null = null;
  private onGameOver: (() => void) | null = null;
  private onVictory: (() => void) | null = null;
  private onCooldownChange: ((type: ResourceType, progress: number) => void) | null = null;

  private isRunning: boolean = false;

  constructor() {
    this.state = {
      energy: INITIAL_RESOURCE,
      alloy: INITIAL_RESOURCE,
      food: INITIAL_RESOURCE,
    };
    this.countdownSeconds = INITIAL_COUNTDOWN;
    this.progress = 0;
    this.supplementStats = { energy: 0, alloy: 0, food: 0 };
    this.supplementsSinceProgress = 0;
    this.cooldowns = { energy: 0, alloy: 0, food: 0 };
    this.doubleConsumptionResources = new Set();
  }

  setCallbacks(
    callbacks: {
      onResourceChange?: (payload: ResourceUpdatePayload) => void;
      onProgressChange?: (payload: ProgressUpdatePayload) => void;
      onCountdownChange?: (payload: CountdownUpdatePayload) => void;
      onSupplement?: (type: ResourceType) => void;
      onGameOver?: () => void;
      onVictory?: () => void;
      onCooldownChange?: (type: ResourceType, progress: number) => void;
    }
  ): void {
    this.onResourceChange = callbacks.onResourceChange ?? null;
    this.onProgressChange = callbacks.onProgressChange ?? null;
    this.onCountdownChange = callbacks.onCountdownChange ?? null;
    this.onSupplement = callbacks.onSupplement ?? null;
    this.onGameOver = callbacks.onGameOver ?? null;
    this.onVictory = callbacks.onVictory ?? null;
    this.onCooldownChange = callbacks.onCooldownChange ?? null;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.consumptionTimerId = window.setInterval(() => this.tickConsumption(), CONSUMPTION_INTERVAL_MS);
    this.countdownTimerId = window.setInterval(() => this.tickCountdown(), 1000);
    this.cooldownTimerId = window.setInterval(() => this.tickCooldowns(), 50);

    this.emitCountdown();
  }

  stop(): void {
    this.isRunning = false;
    if (this.consumptionTimerId !== null) {
      window.clearInterval(this.consumptionTimerId);
      this.consumptionTimerId = null;
    }
    if (this.countdownTimerId !== null) {
      window.clearInterval(this.countdownTimerId);
      this.countdownTimerId = null;
    }
    if (this.cooldownTimerId !== null) {
      window.clearInterval(this.cooldownTimerId);
      this.cooldownTimerId = null;
    }
  }

  reset(): void {
    this.stop();
    this.state = {
      energy: INITIAL_RESOURCE,
      alloy: INITIAL_RESOURCE,
      food: INITIAL_RESOURCE,
    };
    this.countdownSeconds = INITIAL_COUNTDOWN;
    this.progress = 0;
    this.supplementStats = { energy: 0, alloy: 0, food: 0 };
    this.supplementsSinceProgress = 0;
    this.cooldowns = { energy: 0, alloy: 0, food: 0 };
    this.doubleConsumptionResources.clear();
  }

  getResource(type: ResourceType): number {
    return this.state[type];
  }

  getCountdownSeconds(): number {
    return this.countdownSeconds;
  }

  getProgress(): number {
    return this.progress;
  }

  getSupplementStats(): SupplementStats {
    return { ...this.supplementStats };
  }

  isOnCooldown(type: ResourceType): boolean {
    return this.cooldowns[type] > 0;
  }

  setDoubleConsumption(type: ResourceType, enabled: boolean): void {
    if (enabled) {
      this.doubleConsumptionResources.add(type);
    } else {
      this.doubleConsumptionResources.delete(type);
    }
  }

  supplementResource(type: ResourceType): boolean {
    if (!this.isRunning || this.isOnCooldown(type)) {
      return false;
    }

    const config = RESOURCE_CONFIGS[type];
    const oldValue = this.state[type];
    const newValue = Math.min(oldValue + config.supplementAmount, 999);

    this.state[type] = newValue;
    this.supplementStats[type]++;
    this.supplementsSinceProgress++;
    this.cooldowns[type] = config.cooldownMs;

    this.emitResourceChange(type, oldValue, newValue);

    if (this.onSupplement) {
      this.onSupplement(type);
    }

    if (this.supplementsSinceProgress >= SUPPLEMENTS_PER_PROGRESS) {
      this.supplementsSinceProgress = 0;
      this.incrementProgress();
    }

    return true;
  }

  applyPenalty(type: ResourceType, amount: number): void {
    const oldValue = this.state[type];
    const newValue = Math.max(oldValue - amount, 0);
    this.state[type] = newValue;
    this.emitResourceChange(type, oldValue, newValue);

    if (newValue <= 0) {
      this.checkGameOver();
    }
  }

  private tickConsumption(): void {
    if (!this.isRunning) return;

    const types: ResourceType[] = ['energy', 'alloy', 'food'];
    for (const type of types) {
      const consumption = this.doubleConsumptionResources.has(type)
        ? CONSUMPTION_AMOUNT * 2
        : CONSUMPTION_AMOUNT;

      const oldValue = this.state[type];
      const newValue = Math.max(oldValue - consumption, 0);
      this.state[type] = newValue;
      this.emitResourceChange(type, oldValue, newValue);
    }

    this.checkGameOver();
  }

  private tickCountdown(): void {
    if (!this.isRunning) return;

    this.countdownSeconds--;
    this.emitCountdown();

    if (this.countdownSeconds <= 0) {
      this.countdownSeconds = 0;
      this.gameOver();
    }
  }

  private tickCooldowns(): void {
    if (!this.isRunning) return;

    const types: ResourceType[] = ['energy', 'alloy', 'food'];
    for (const type of types) {
      if (this.cooldowns[type] > 0) {
        this.cooldowns[type] = Math.max(0, this.cooldowns[type] - 50);
        if (this.onCooldownChange) {
          const config = RESOURCE_CONFIGS[type];
          const progress = 1 - (this.cooldowns[type] / config.cooldownMs);
          this.onCooldownChange(type, progress);
        }
      }
    }
  }

  private incrementProgress(): void {
    const oldValue = this.progress;
    const newValue = Math.min(oldValue + PROGRESS_INCREMENT, 100);
    this.progress = newValue;

    if (this.onProgressChange) {
      this.onProgressChange({ oldValue, newValue });
    }

    if (newValue >= 100) {
      this.victory();
    }
  }

  private emitResourceChange(type: ResourceType, oldValue: number, newValue: number): void {
    if (this.onResourceChange && oldValue !== newValue) {
      this.onResourceChange({ type, oldValue, newValue });
    }
  }

  private emitCountdown(): void {
    if (this.onCountdownChange) {
      this.onCountdownChange({
        totalSeconds: this.countdownSeconds,
        isWarning: this.countdownSeconds <= WARNING_THRESHOLD_SECONDS,
      });
    }
  }

  private checkGameOver(): void {
    if (this.state.energy <= 0 || this.state.alloy <= 0 || this.state.food <= 0) {
      this.gameOver();
    }
  }

  private gameOver(): void {
    if (!this.isRunning) return;
    this.stop();
    if (this.onGameOver) {
      this.onGameOver();
    }
  }

  private victory(): void {
    if (!this.isRunning) return;
    this.stop();
    if (this.onVictory) {
      this.onVictory();
    }
  }
}
