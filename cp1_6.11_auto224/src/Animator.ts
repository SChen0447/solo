import { AnimationControls, animate } from 'framer-motion';

export type ComboType = 'fire' | 'water' | 'wind' | 'earth' | 'major';

export interface AnimationState {
  flippingCards: Set<string>;
  pulsingCards: Set<string>;
  isBurstActive: boolean;
  isComboActive: boolean;
  energyGlowIntensity: number;
}

export class Animator {
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private fps: number = 60;
  private frameInterval: number = 1000 / 60;

  private state: AnimationState = {
    flippingCards: new Set(),
    pulsingCards: new Set(),
    isBurstActive: false,
    isComboActive: false,
    energyGlowIntensity: 0,
  };

  private energyValue: number = 0;
  private targetEnergyValue: number = 0;
  private maxEnergy: number = 50;

  private onEnergyUpdate?: (value: number) => void;
  private onBurstComplete?: () => void;
  private onComboComplete?: () => void;

  constructor() {
    this.frameInterval = 1000 / this.fps;
  }

  public setEnergyCallback(callback: (value: number) => void): void {
    this.onEnergyUpdate = callback;
  }

  public setBurstCompleteCallback(callback: () => void): void {
    this.onBurstComplete = callback;
  }

  public setComboCompleteCallback(callback: () => void): void {
    this.onComboComplete = callback;
  }

  public setMaxEnergy(max: number): void {
    this.maxEnergy = max;
  }

  public setTargetEnergy(target: number): void {
    this.targetEnergyValue = Math.min(Math.max(target, 0), this.maxEnergy);
  }

  public start(): void {
    if (this.animationFrameId === null) {
      this.lastTime = performance.now();
      this.animate();
    }
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private animate = (): void => {
    const now = performance.now();
    const deltaTime = now - this.lastTime;

    if (deltaTime >= this.frameInterval) {
      this.lastTime = now - (deltaTime % this.frameInterval);

      this.updateEnergyAnimation();
      this.updateGlowIntensity();
    }

    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  private updateEnergyAnimation(): void {
    if (this.energyValue !== this.targetEnergyValue) {
      const diff = this.targetEnergyValue - this.energyValue;
      const step = diff * 0.1;

      if (Math.abs(diff) < 0.1) {
        this.energyValue = this.targetEnergyValue;
      } else {
        this.energyValue += step;
      }

      if (this.onEnergyUpdate) {
        this.onEnergyUpdate(this.energyValue);
      }
    }
  }

  private updateGlowIntensity(): void {
    if (this.energyValue >= this.maxEnergy * 0.9) {
      const pulse = Math.sin(performance.now() / 200) * 0.3 + 0.7;
      this.state.energyGlowIntensity = pulse;
    } else {
      this.state.energyGlowIntensity = this.energyValue / this.maxEnergy * 0.5;
    }
  }

  public playCardFlip(cardId: string, duration: number = 0.4): void {
    this.state.flippingCards.add(cardId);

    setTimeout(() => {
      this.state.flippingCards.delete(cardId);
    }, duration * 1000);
  }

  public playCardPlace(cardId: string): void {
    this.playCardFlip(cardId, 0.4);
  }

  public triggerComboEffect(comboType: ComboType): void {
    this.state.isComboActive = true;

    setTimeout(() => {
      this.state.isComboActive = false;
      if (this.onComboComplete) {
        this.onComboComplete();
      }
    }, 1200);
  }

  public triggerCardPulse(cardIds: string[]): void {
    for (const id of cardIds) {
      this.state.pulsingCards.add(id);
    }

    setTimeout(() => {
      for (const id of cardIds) {
        this.state.pulsingCards.delete(id);
      }
    }, 1000);
  }

  public triggerBurstEffect(): void {
    this.state.isBurstActive = true;

    setTimeout(() => {
      this.state.isBurstActive = false;
      if (this.onBurstComplete) {
        this.onBurstComplete();
      }
    }, 1200);
  }

  public getState(): AnimationState {
    return { ...this.state };
  }

  public getEnergyValue(): number {
    return this.energyValue;
  }

  public getEnergyPercentage(): number {
    return (this.energyValue / this.maxEnergy) * 100;
  }

  public isCardFlipping(cardId: string): boolean {
    return this.state.flippingCards.has(cardId);
  }

  public isCardPulsing(cardId: string): boolean {
    return this.state.pulsingCards.has(cardId);
  }

  public getGlowIntensity(): number {
    return this.state.energyGlowIntensity;
  }
}

export function useAnimator(): Animator {
  return new Animator();
}

export const cardVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 },
  hover: {
    y: -8,
    boxShadow: '0 12px 24px rgba(212, 175, 55, 0.4)',
    transition: { duration: 0.2 },
  },
  tap: { scale: 0.95 },
};

export const cardFlipVariants = {
  back: { rotateY: 0 },
  front: { rotateY: 180 },
};

export const comboPulseVariants = {
  pulse: {
    boxShadow: [
      '0 0 0 0 rgba(255, 215, 0, 0)',
      '0 0 20px 10px rgba(255, 215, 0, 0.6)',
      '0 0 0 0 rgba(255, 215, 0, 0)',
    ],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const burstStarVariants = {
  initial: { scale: 0, rotate: 0, opacity: 0 },
  animate: {
    scale: [0, 1.5, 1],
    rotate: 360,
    opacity: [0, 1, 1],
    transition: {
      duration: 1.2,
      ease: 'easeOut',
    },
  },
  exit: {
    scale: 2,
    opacity: 0,
    transition: { duration: 0.5 },
  },
};

export const victoryParticleVariants = {
  initial: { x: 0, y: 0, opacity: 0, scale: 0 },
  animate: (custom: { angle: number; distance: number; delay: number }) => ({
    x: Math.cos(custom.angle) * custom.distance,
    y: Math.sin(custom.angle) * custom.distance,
    opacity: [0, 1, 0],
    scale: [0, 1, 0],
    transition: {
      duration: 2,
      delay: custom.delay,
      ease: 'easeOut',
    },
  }),
};
