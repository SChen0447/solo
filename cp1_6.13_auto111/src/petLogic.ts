export type EmotionLevel = 'quiet' | 'happy' | 'excited' | 'sad' | 'tired';
export type LifeStage = 'egg' | 'baby' | 'adult' | 'evolved';

export interface PetState {
  stage: LifeStage;
  eggClicks: number;
  emotion: number;
  emotionLevel: EmotionLevel;
  energy: number;
  maxEnergy: number;
  size: number;
  antennaCount: number;
  isSleeping: boolean;
  lastInteractionTime: number;
  pulseScale: number;
  glowIntensity: number;
  antennaBendAngles: number[];
  floatingOffset: number;
  glowing: boolean;
  glowingPhase: number;
  evolved: boolean;
}

export interface InteractionResult {
  type: 'feed' | 'pet' | 'resonate' | 'wake' | 'hatch' | 'none';
  energyDelta: number;
  emotionDelta: number;
}

const BASE_SIZE_BABY = 60;
const MAX_SIZE = 150;
const BASE_ANTENNA_COUNT = 6;
const MAX_ANTENNA_COUNT = 12;
const EGG_HATCH_CLICKS = 3;
const IDLE_EMOTION_DECAY_THRESHOLD = 30000;
const IDLE_EMOTION_DECAY_RATE = 1;
const SLEEP_THRESHOLD = 60000;
const EVOLUTION_ENERGY_THRESHOLD = 100;
const EVOLVED_MAX_ENERGY = 200;
const DEFAULT_MAX_ENERGY = 100;

export class PetLogic {
  private state: PetState;
  private lastDecayTime: number;

  constructor() {
    this.state = this.createInitialState();
    this.lastDecayTime = Date.now();
  }

  private createInitialState(): PetState {
    return {
      stage: 'egg',
      eggClicks: 0,
      emotion: 50,
      emotionLevel: 'quiet',
      energy: 20,
      maxEnergy: DEFAULT_MAX_ENERGY,
      size: 120,
      antennaCount: 0,
      isSleeping: false,
      lastInteractionTime: Date.now(),
      pulseScale: 1,
      glowIntensity: 1,
      antennaBendAngles: [],
      floatingOffset: 0,
      glowing: false,
      glowingPhase: 0,
      evolved: false
    };
  }

  getState(): PetState {
    return { ...this.state };
  }

  update(deltaTime: number, currentTime: number): void {
    if (this.state.stage === 'egg') {
      return;
    }

    this.updateEmotionDecay(currentTime);
    this.updateSleepState(currentTime);
    this.updateEmotionLevel();
    this.updateSizeAndAntennae();
    this.updateIdleAnimations(deltaTime, currentTime);
  }

  private updateEmotionDecay(currentTime: number): void {
    const timeSinceInteraction = currentTime - this.state.lastInteractionTime;
    if (timeSinceInteraction > IDLE_EMOTION_DECAY_THRESHOLD) {
      const elapsed = (currentTime - this.lastDecayTime) / 1000;
      if (elapsed >= 1) {
        this.state.emotion = Math.max(0, this.state.emotion - IDLE_EMOTION_DECAY_RATE * Math.floor(elapsed));
        this.lastDecayTime = currentTime;
      }
    }
  }

  private updateSleepState(currentTime: number): void {
    const timeSinceInteraction = currentTime - this.state.lastInteractionTime;
    if (timeSinceInteraction > SLEEP_THRESHOLD && !this.state.isSleeping) {
      this.state.isSleeping = true;
    }
  }

  private updateEmotionLevel(): void {
    const { emotion, energy, isSleeping } = this.state;

    if (isSleeping) {
      this.state.emotionLevel = 'tired';
      return;
    }

    if (emotion >= 80 && energy >= 60) {
      this.state.emotionLevel = 'excited';
    } else if (emotion >= 50) {
      this.state.emotionLevel = 'happy';
    } else if (emotion <= 20) {
      this.state.emotionLevel = 'sad';
    } else if (energy <= 15) {
      this.state.emotionLevel = 'tired';
    } else {
      this.state.emotionLevel = 'quiet';
    }
  }

  private updateSizeAndAntennae(): void {
    if (this.state.stage === 'egg') return;

    const energyRatio = this.state.energy / this.state.maxEnergy;
    this.state.size = BASE_SIZE_BABY + (MAX_SIZE - BASE_SIZE_BABY) * energyRatio;

    const targetAntennaCount = Math.floor(
      BASE_ANTENNA_COUNT + (MAX_ANTENNA_COUNT - BASE_ANTENNA_COUNT) * energyRatio
    );

    if (targetAntennaCount !== this.state.antennaCount) {
      this.state.antennaCount = targetAntennaCount;
      this.state.antennaBendAngles = new Array(targetAntennaCount).fill(0);
    }

    if (this.state.energy >= EVOLUTION_ENERGY_THRESHOLD && !this.state.evolved) {
      this.state.evolved = true;
      this.state.maxEnergy = EVOLVED_MAX_ENERGY;
      this.state.stage = 'evolved';
    }

    if (this.state.evolved) {
      this.state.stage = 'evolved';
    } else if (this.state.energy >= 50) {
      this.state.stage = 'adult';
    } else {
      this.state.stage = 'baby';
    }
  }

  private updateIdleAnimations(deltaTime: number, currentTime: number): void {
    const t = currentTime / 1000;

    this.state.pulseScale = 1 + 0.03 * Math.sin(t * 2);

    if (this.state.isSleeping) {
      this.state.glowIntensity = 0.3;
      this.state.floatingOffset = 15 * Math.sin(t * Math.PI / 2);
    } else {
      this.state.glowIntensity = 1;
      this.state.floatingOffset = 5 * Math.sin(t * 1.5);
    }

    if (this.state.glowing) {
      this.state.glowingPhase += deltaTime * 5;
      if (this.state.glowingPhase > Math.PI * 3) {
        this.state.glowing = false;
        this.state.glowingPhase = 0;
      }
    }

    this.state.antennaBendAngles = this.state.antennaBendAngles.map((_, i) => {
      return Math.sin(t * 1.5 + i * 0.8) * 0.2;
    });
  }

  handleEggClick(): InteractionResult {
    if (this.state.stage !== 'egg') {
      return { type: 'none', energyDelta: 0, emotionDelta: 0 };
    }

    this.state.eggClicks++;
    this.state.lastInteractionTime = Date.now();

    if (this.state.eggClicks >= EGG_HATCH_CLICKS) {
      this.state.stage = 'baby';
      this.state.size = BASE_SIZE_BABY;
      this.state.antennaCount = BASE_ANTENNA_COUNT;
      this.state.antennaBendAngles = new Array(BASE_ANTENNA_COUNT).fill(0);
      this.state.emotion = 60;
      this.state.energy = 30;
      return { type: 'hatch', energyDelta: 0, emotionDelta: 10 };
    }

    return { type: 'hatch', energyDelta: 0, emotionDelta: 0 };
  }

  handleFeed(): InteractionResult {
    if (this.state.stage === 'egg' || this.state.isSleeping) {
      return { type: 'none', energyDelta: 0, emotionDelta: 0 };
    }

    const energyGain = 10;
    const emotionGain = 5;
    this.state.energy = Math.min(this.state.maxEnergy, this.state.energy + energyGain);
    this.state.emotion = Math.min(100, this.state.emotion + emotionGain);
    this.state.lastInteractionTime = Date.now();
    this.state.pulseScale = 1.2;
    this.lastDecayTime = Date.now();

    return { type: 'feed', energyDelta: energyGain, emotionDelta: emotionGain };
  }

  handlePet(antennaIndex: number): InteractionResult {
    if (this.state.stage === 'egg' || this.state.isSleeping) {
      return { type: 'none', energyDelta: 0, emotionDelta: 0 };
    }

    const emotionGain = 8;
    this.state.emotion = Math.min(100, this.state.emotion + emotionGain);
    this.state.lastInteractionTime = Date.now();
    this.lastDecayTime = Date.now();

    if (antennaIndex >= 0 && antennaIndex < this.state.antennaBendAngles.length) {
      this.state.antennaBendAngles[antennaIndex] = 0.5;
    }

    return { type: 'pet', energyDelta: 0, emotionDelta: emotionGain };
  }

  handleResonate(): InteractionResult {
    if (this.state.stage === 'egg' || this.state.isSleeping) {
      return { type: 'none', energyDelta: 0, emotionDelta: 0 };
    }

    const emotionGain = 3;
    const energyGain = 3;
    this.state.emotion = Math.min(100, this.state.emotion + emotionGain);
    this.state.energy = Math.min(this.state.maxEnergy, this.state.energy + energyGain);
    this.state.lastInteractionTime = Date.now();
    this.state.glowing = true;
    this.state.glowingPhase = 0;
    this.lastDecayTime = Date.now();

    return { type: 'resonate', energyDelta: energyGain, emotionDelta: emotionGain };
  }

  handleWakeUp(): InteractionResult {
    if (!this.state.isSleeping) {
      return this.handleResonate();
    }

    this.state.isSleeping = false;
    this.state.lastInteractionTime = Date.now();
    this.state.emotion = Math.min(100, this.state.emotion + 10);
    this.lastDecayTime = Date.now();

    return { type: 'wake', energyDelta: 5, emotionDelta: 10 };
  }

  setAntennaBend(index: number, angle: number): void {
    if (index >= 0 && index < this.state.antennaBendAngles.length) {
      this.state.antennaBendAngles[index] = angle;
    }
  }

  getMusicParams(): { frequency: number; bpm: number } {
    switch (this.state.emotionLevel) {
      case 'excited':
        return { frequency: 660, bpm: 140 };
      case 'happy':
        return { frequency: 440, bpm: 120 };
      case 'sad':
        return { frequency: 220, bpm: 60 };
      case 'tired':
        return { frequency: 260, bpm: 70 };
      case 'quiet':
      default:
        return { frequency: 330, bpm: 90 };
    }
  }

  getEmotionColor(): { primary: string; secondary: string } {
    switch (this.state.emotionLevel) {
      case 'excited':
        return { primary: '#ff6b35', secondary: '#f5a623' };
      case 'happy':
        return { primary: '#f5a623', secondary: '#ffd93d' };
      case 'sad':
        return { primary: '#6c5ce7', secondary: '#9b59b6' };
      case 'tired':
        return { primary: '#95a5a6', secondary: '#bdc3c7' };
      case 'quiet':
      default:
        return { primary: '#fdf4e3', secondary: '#ffeaa7' };
    }
  }
}
