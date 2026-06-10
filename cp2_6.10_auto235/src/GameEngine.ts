import { v4 as uuidv4 } from 'uuid';
import {
  WaterType,
  Rarity,
  FishSpecies,
  CaughtFish,
  FishEntry,
  FISH_SPECIES,
  RARITY_CONFIG,
  getFishByWater,
  getFishById,
} from './FishData';

export type GamePhase =
  | 'idle'
  | 'charging'
  | 'casting'
  | 'waiting'
  | 'biting'
  | 'reeling'
  | 'success'
  | 'escaped';

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface GameState {
  phase: GamePhase;
  water: WaterType;
  playerLevel: number;
  playerXP: number;
  xpToNext: number;
  chargePower: number;
  floatX: number;
  floatY: number;
  targetFloatX: number;
  castingProgress: number;
  biteTimer: number;
  biteDuration: number;
  exclamationBlinkTimer: number;
  reelingProgress: number;
  reelingDecayTimer: number;
  caughtFish: CaughtFish | null;
  ripples: Ripple[];
  collection: Map<string, FishEntry>;
  floatBobPhase: number;
  shakeAmount: number;
  shakePhase: number;
}

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const FLOAT_BASE_Y = 280;
const MAX_CHARGE_TIME = 1500;
const CAST_DURATION = 400;
const MIN_BITE_WAIT = 3000;
const MAX_BITE_WAIT = 10000;
const BITE_WINDOW = 2500;
const REELING_DECAY_INTERVAL = 200;
const REELING_DECAY_AMOUNT = 3;
const REELING_INCREMENT = 12;
const REQUIRED_LEVEL_FOR_OCEAN = 5;

export class GameEngine {
  public state: GameState;
  public onStateChange?: () => void;
  public onFishCaught?: (fish: CaughtFish) => void;
  public onFishEscaped?: () => void;
  public onLevelUp?: (newLevel: number) => void;

  constructor() {
    this.state = {
      phase: 'idle',
      water: 'river',
      playerLevel: 1,
      playerXP: 0,
      xpToNext: 50,
      chargePower: 0,
      floatX: CANVAS_WIDTH / 2,
      floatY: FLOAT_BASE_Y,
      targetFloatX: CANVAS_WIDTH / 2,
      castingProgress: 0,
      biteTimer: 0,
      biteDuration: 0,
      exclamationBlinkTimer: 0,
      reelingProgress: 0,
      reelingDecayTimer: 0,
      caughtFish: null,
      ripples: [],
      collection: new Map(),
      floatBobPhase: 0,
      shakeAmount: 0,
      shakePhase: 0,
    };
  }

  public setWater(water: WaterType): boolean {
    if (water === 'ocean' && this.state.playerLevel < REQUIRED_LEVEL_FOR_OCEAN) {
      return false;
    }
    if (this.state.phase !== 'idle' && this.state.phase !== 'charging') {
      return false;
    }
    this.state.water = water;
    this.state.phase = 'idle';
    this.notifyChange();
    return true;
  }

  public canUseOcean(): boolean {
    return this.state.playerLevel >= REQUIRED_LEVEL_FOR_OCEAN;
  }

  public startCharging(mouseX: number): void {
    if (this.state.phase !== 'idle') return;
    this.state.phase = 'charging';
    this.state.chargePower = 0;
    const clampedX = Math.max(80, Math.min(CANVAS_WIDTH - 80, mouseX));
    this.state.targetFloatX = clampedX;
    this.notifyChange();
  }

  public updateCharge(deltaTime: number): void {
    if (this.state.phase !== 'charging') return;
    this.state.chargePower = Math.min(1, this.state.chargePower + deltaTime / MAX_CHARGE_TIME);
    this.notifyChange();
  }

  public cast(): void {
    if (this.state.phase !== 'charging') return;
    this.state.phase = 'casting';
    this.state.castingProgress = 0;
    this.state.ripples = [];
    this.notifyChange();
  }

  public reel(): void {
    if (this.state.phase !== 'reeling') return;
    this.state.reelingProgress = Math.min(100, this.state.reelingProgress + REELING_INCREMENT);
    if (this.state.reelingProgress >= 100) {
      this.catchFish();
    }
    this.notifyChange();
  }

  private catchFish(): void {
    const waterFish = getFishByWater(this.state.water);
    const weightedFish: FishSpecies[] = [];
    for (const fish of waterFish) {
      const weight = fish.rarity === 'common' ? 10 : fish.rarity === 'rare' ? 3 : 1;
      for (let i = 0; i < weight; i++) {
        weightedFish.push(fish);
      }
    }
    const selectedSpecies = weightedFish[Math.floor(Math.random() * weightedFish.length)];
    const weightRange = selectedSpecies.maxWeight - selectedSpecies.minWeight;
    const randomWeight = selectedSpecies.minWeight + Math.random() * weightRange;
    const roundedWeight = Math.round(randomWeight * 10) / 10;

    const caught: CaughtFish = {
      id: uuidv4(),
      speciesId: selectedSpecies.id,
      weight: roundedWeight,
      caughtAt: new Date(),
      water: this.state.water,
    };

    this.state.caughtFish = caught;
    this.state.phase = 'success';
    this.addToCollection(caught);
    this.addExperience(selectedSpecies.rarity);

    if (this.onFishCaught) {
      this.onFishCaught(caught);
    }
    this.notifyChange();
  }

  private addToCollection(caught: CaughtFish): void {
    const existing = this.state.collection.get(caught.speciesId);
    if (existing) {
      existing.count += 1;
    } else {
      this.state.collection.set(caught.speciesId, {
        speciesId: caught.speciesId,
        count: 1,
        firstCaughtAt: caught.caughtAt,
      });
    }
  }

  private addExperience(rarity: Rarity): void {
    const xpGain = RARITY_CONFIG[rarity].xp;
    this.state.playerXP += xpGain;

    while (this.state.playerXP >= this.state.xpToNext) {
      this.state.playerXP -= this.state.xpToNext;
      this.state.playerLevel += 1;
      this.state.xpToNext = this.state.playerLevel * 50;
      if (this.onLevelUp) {
        this.onLevelUp(this.state.playerLevel);
      }
    }
  }

  public closePopup(): void {
    if (this.state.phase !== 'success') return;
    this.state.caughtFish = null;
    this.state.phase = 'idle';
    this.state.ripples = [];
    this.notifyChange();
  }

  public update(deltaTime: number): void {
    this.state.floatBobPhase += deltaTime * 0.003;

    if (this.state.phase === 'charging') {
      this.updateCharge(deltaTime);
    }

    if (this.state.phase === 'casting') {
      this.state.castingProgress += deltaTime / CAST_DURATION;
      if (this.state.castingProgress >= 1) {
        this.state.castingProgress = 1;
        this.state.phase = 'waiting';
        this.addRipple(this.state.targetFloatX, FLOAT_BASE_Y);
        this.state.biteTimer = 0;
        this.state.biteDuration = MIN_BITE_WAIT + Math.random() * (MAX_BITE_WAIT - MIN_BITE_WAIT);
      }
    }

    if (this.state.phase === 'waiting') {
      this.state.biteTimer += deltaTime;
      if (this.state.biteTimer >= this.state.biteDuration) {
        this.state.phase = 'biting';
        this.state.shakeAmount = 2;
        this.state.shakePhase = 0;
        this.state.exclamationBlinkTimer = 0;
        this.state.biteTimer = 0;
      }
    }

    if (this.state.phase === 'biting') {
      this.state.shakePhase += deltaTime * 0.03;
      this.state.exclamationBlinkTimer += deltaTime;
      this.state.biteTimer += deltaTime;
      if (this.state.biteTimer >= BITE_WINDOW) {
        this.state.phase = 'reeling';
        this.state.reelingProgress = 30;
        this.state.reelingDecayTimer = 0;
      }
    }

    if (this.state.phase === 'reeling') {
      this.state.shakePhase += deltaTime * 0.04;
      this.state.reelingDecayTimer += deltaTime;
      if (this.state.reelingDecayTimer >= REELING_DECAY_INTERVAL) {
        this.state.reelingDecayTimer = 0;
        this.state.reelingProgress -= REELING_DECAY_AMOUNT;
        if (this.state.reelingProgress <= 0) {
          this.state.reelingProgress = 0;
          this.state.phase = 'escaped';
          this.state.shakeAmount = 0;
          if (this.onFishEscaped) {
            this.onFishEscaped();
          }
          setTimeout(() => {
            this.state.phase = 'idle';
            this.notifyChange();
          }, 1500);
        }
      }
    }

    this.updateRipples(deltaTime);

    this.notifyChange();
  }

  private addRipple(x: number, y: number): void {
    this.state.ripples.push({
      x,
      y,
      radius: 5,
      maxRadius: 60,
      alpha: 0.8,
      life: 0,
      maxLife: 300,
    });
  }

  private updateRipples(deltaTime: number): void {
    for (let i = this.state.ripples.length - 1; i >= 0; i--) {
      const ripple = this.state.ripples[i];
      ripple.life += deltaTime;
      const t = ripple.life / ripple.maxLife;
      ripple.radius = 5 + t * (ripple.maxRadius - 5);
      ripple.alpha = 0.8 * (1 - t);
      if (ripple.life >= ripple.maxLife) {
        this.state.ripples.splice(i, 1);
      }
    }
  }

  public getCurrentFloatPosition(): { x: number; y: number } {
    if (this.state.phase === 'casting') {
      const t = this.state.castingProgress;
      const startX = 60;
      const startY = CANVAS_HEIGHT - 60;
      const arcHeight = 120 * (1 - Math.pow(2 * t - 1, 2));
      const x = startX + (this.state.targetFloatX - startX) * t;
      const y = startY + (FLOAT_BASE_Y - startY) * t - arcHeight;
      return { x, y };
    }
    if (this.state.phase === 'idle' || this.state.phase === 'charging') {
      return { x: 60, y: CANVAS_HEIGHT - 60 };
    }
    let bobY = this.state.floatY;
    if (this.state.phase === 'waiting') {
      bobY = FLOAT_BASE_Y + Math.sin(this.state.floatBobPhase) * 2;
    } else if (this.state.phase === 'biting' || this.state.phase === 'reeling') {
      bobY = FLOAT_BASE_Y + 6 + Math.sin(this.state.floatBobPhase * 2) * 1;
    } else {
      bobY = FLOAT_BASE_Y;
    }
    let shakeX = 0;
    if (this.state.phase === 'biting' || this.state.phase === 'reeling') {
      shakeX = Math.sin(this.state.shakePhase) * this.state.shakeAmount;
    }
    return { x: this.state.targetFloatX + shakeX, y: bobY };
  }

  public getSpeciesById(id: string): FishSpecies | undefined {
    return getFishById(id);
  }

  public getAllSpecies(): FishSpecies[] {
    return FISH_SPECIES;
  }

  private notifyChange(): void {
    if (this.onStateChange) {
      this.onStateChange();
    }
  }
}
