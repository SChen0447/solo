import Phaser from 'phaser';

export enum TimelineState {
  PRESENT = 'present',
  PAST = 'past'
}

export interface TimelinePlatform {
  id: string;
  gridX: number;
  gridY: number;
  visibleInPresent: boolean;
  visibleInPast: boolean;
  phaserObject?: Phaser.Physics.Arcade.StaticBody | Phaser.GameObjects.Rectangle;
  body?: Phaser.Physics.Arcade.StaticBody;
}

export interface TimelineSpike {
  id: string;
  gridX: number;
  gridY: number;
  movesInPast: boolean;
  baseY: number;
  phaserObject?: Phaser.GameObjects.Polygon;
  collider?: Phaser.Physics.Arcade.Sprite;
}

export class TimeLineManager {
  public currentState: TimelineState = TimelineState.PRESENT;
  public isTransitioning: boolean = false;

  private platforms: TimelinePlatform[] = [];
  private spikes: TimelineSpike[] = [];
  private goalObject?: Phaser.GameObjects.Container;
  private scene!: Phaser.Scene;
  private switchParticles?: Phaser.GameObjects.Particles.ParticleEmitter;
  private tKeyHeldTime: number = 0;
  private readonly HOLD_DURATION: number = 2000;
  private readonly TRANSITION_DURATION: number = 500;

  constructor() {}

  public setScene(scene: Phaser.Scene): void {
    this.scene = scene;
  }

  public registerPlatform(platform: TimelinePlatform): void {
    this.platforms.push(platform);
  }

  public registerSpike(spike: TimelineSpike): void {
    this.spikes.push(spike);
  }

  public setGoal(goal: Phaser.GameObjects.Container): void {
    this.goalObject = goal;
  }

  public update(time: number, delta: number, isHoldingT: boolean): void {
    if (this.currentState === TimelineState.PAST) {
      this.spikes.forEach((spike) => {
        if (spike.movesInPast && spike.phaserObject) {
          const offset = Math.sin(time / 500) * 20;
          const y = spike.baseY + offset;
          spike.phaserObject.setY(y);
          if (spike.collider) {
            spike.collider.setY(y);
          }
        }
      });
    }

    if (this.currentState === TimelineState.PAST && isHoldingT && !this.isTransitioning) {
      this.tKeyHeldTime += delta;
      if (this.tKeyHeldTime >= this.HOLD_DURATION) {
        this.tKeyHeldTime = 0;
        this.switchToPresent();
      }
    } else if (!isHoldingT) {
      this.tKeyHeldTime = 0;
    }
  }

  public getHoldProgress(): number {
    return Math.min(1, this.tKeyHeldTime / this.HOLD_DURATION);
  }

  public trySwitchToPast(): void {
    if (this.isTransitioning || this.currentState !== TimelineState.PRESENT) return;
    this.switchToPast();
  }

  private switchToPast(): void {
    this.beginTransition(() => {
      this.currentState = TimelineState.PAST;
      this.applyTimelineState();
    });
  }

  private switchToPresent(): void {
    this.beginTransition(() => {
      this.currentState = TimelineState.PRESENT;
      this.applyTimelineState();
    });
  }

  private beginTransition(onComplete: () => void): void {
    this.isTransitioning = true;
    this.triggerScreenGlow();
    this.playTransitionParticles(() => {
      onComplete();
      this.isTransitioning = false;
    });
  }

  private triggerScreenGlow(): void {
    const container = document.getElementById('game-container');
    if (container) {
      container.classList.remove('glow-active');
      void container.offsetWidth;
      container.classList.add('glow-active');
      setTimeout(() => {
        container.classList.remove('glow-active');
      }, this.TRANSITION_DURATION);
    }
  }

  private playTransitionParticles(onComplete: () => void): void {
    if (!this.scene) {
      onComplete();
      return;
    }

    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height / 2;

    const particles = this.scene.add.particles(0, 0, 'particle', {
      x: { min: centerX - 100, max: centerX + 100 },
      y: { min: centerY - 100, max: centerY + 100 },
      speed: { min: 50, max: 150 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      lifespan: this.TRANSITION_DURATION,
      quantity: 40,
      tint: [0x4169e1, 0x8a2be2, 0x9370db, 0x6a5acd],
      blendMode: 'ADD'
    });

    this.scene.tweens.add({
      targets: particles,
      scale: 1.5,
      duration: this.TRANSITION_DURATION,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        particles.destroy();
        onComplete();
      }
    });
  }

  private applyTimelineState(): void {
    const isPast = this.currentState === TimelineState.PAST;

    this.platforms.forEach((platform) => {
      const visible = isPast ? platform.visibleInPast : platform.visibleInPresent;
      const obj = platform.phaserObject as Phaser.GameObjects.Rectangle;
      const body = platform.body;

      if (obj) {
        if (visible) {
          if (!isPast) {
            obj.setAlpha(1);
            this.scene.tweens.add({
              targets: obj,
              y: platform.gridY * 32 + 16,
              alpha: 1,
              duration: 500,
              ease: 'Cubic.easeOut'
            });
          } else {
            this.scene.tweens.add({
              targets: obj,
              y: platform.gridY * 32 + 16,
              alpha: 1,
              duration: 500,
              ease: 'Cubic.easeOut'
            });
          }
          if (body) {
            body.enable = true;
            body.updateFromGameObject();
          }
        } else {
          this.scene.tweens.add({
            targets: obj,
            alpha: 0.3,
            y: platform.gridY * 32 + 16 + 100,
            duration: 500,
            ease: 'Cubic.easeIn'
          });
          if (body) {
            body.enable = false;
          }
        }
      }
    });

    this.updateGoalState();
  }

  private updateGoalState(): void {
    if (!this.goalObject) return;
    const isPast = this.currentState === TimelineState.PAST;
    const inner = this.goalObject.getAt(0) as Phaser.GameObjects.Arc;

    if (isPast) {
      inner.setFillStyle(0xffd700);
      inner.setAlpha(1);
      this.goalObject.setData('active', true);
      if (!this.goalObject.getData('glowTween')) {
        const glowTween = this.scene.tweens.add({
          targets: inner,
          scale: { from: 1, to: 1.2 },
          alpha: { from: 0.7, to: 1 },
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        this.goalObject.setData('glowTween', glowTween);
      }
    } else {
      inner.setFillStyle(0x808080);
      inner.setAlpha(0.6);
      this.goalObject.setData('active', false);
      const glowTween = this.goalObject.getData('glowTween');
      if (glowTween) {
        glowTween.stop();
        this.goalObject.setData('glowTween', null);
      }
    }
  }

  public isPlatformActive(platform: TimelinePlatform): boolean {
    if (this.currentState === TimelineState.PRESENT) {
      return platform.visibleInPresent;
    }
    return platform.visibleInPast;
  }

  public reset(): void {
    this.platforms = [];
    this.spikes = [];
    this.goalObject = undefined;
    this.currentState = TimelineState.PRESENT;
    this.isTransitioning = false;
    this.tKeyHeldTime = 0;
  }
}
