import Phaser from 'phaser';

export type WeatherType = 'clear' | 'storm' | 'sunny' | 'damp';

export interface WeatherEvent {
  type: WeatherType;
  name: string;
  description: string;
  duration: number;
}

export class EventManager {
  public scene: Phaser.Scene;
  public currentWeather: WeatherType = 'clear';
  public eventTimer: number = 0;
  public weatherDuration: number = 0;
  public isTransitioning: boolean = false;
  public transitionProgress: number = 0;
  public eventInterval: number = 30000;
  public weatherEventDuration: number = 10000;

  public stormParticles?: Phaser.GameObjects.Particles.ParticleEmitter;
  public sunnyOverlay?: Phaser.GameObjects.Graphics;
  public dampMask?: Phaser.GameObjects.Graphics;
  public transitionMask?: Phaser.GameObjects.Graphics;
  public warningText?: Phaser.GameObjects.Text;
  public waveFrequency: number = 1;

  public eventEmitter: Phaser.Events.EventEmitter;

  private weatherTypes: WeatherType[] = ['storm', 'sunny', 'damp'];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.eventEmitter = new Phaser.Events.EventEmitter();
    this.createVisualEffects();
    this.createWarningText();
  }

  private createVisualEffects(): void {
    this.stormParticles = this.scene.add.particles(0, 0, undefined, {
      x: { min: -100, max: -50 },
      y: { min: 0, max: 200 },
      lifespan: 3000,
      speedX: { min: 150, max: 300 },
      speedY: { min: -10, max: 10 },
      scale: { min: 0.4, max: 0.8 },
      alpha: { start: 0.8, end: 0.4 },
      tint: [0x333333, 0x444444, 0x555555],
      quantity: 2,
      frequency: 50,
      emitting: false
    });

    this.sunnyOverlay = this.scene.add.graphics();
    this.sunnyOverlay.fillStyle(0xffff00, 0.2);
    this.sunnyOverlay.fillRect(0, 0, 800, 600);
    this.sunnyOverlay.setAlpha(0);
    this.sunnyOverlay.setDepth(100);

    this.dampMask = this.scene.add.graphics();
    this.dampMask.fillStyle(0x222222, 0.1);
    this.dampMask.fillRect(0, 0, 800, 600);
    this.dampMask.setAlpha(0);
    this.dampMask.setDepth(100);

    this.transitionMask = this.scene.add.graphics();
    this.transitionMask.fillStyle(0x000000, 1);
    this.transitionMask.fillRect(0, 0, 800, 600);
    this.transitionMask.setAlpha(0);
    this.transitionMask.setDepth(200);
  }

  private createWarningText(): void {
    this.warningText = this.scene.add.text(400, 50, '', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center'
    });
    this.warningText.setOrigin(0.5);
    this.warningText.setAlpha(0);
    this.warningText.setDepth(150);
  }

  public update(deltaTime: number, hasShelter: boolean): void {
    if (this.isTransitioning) {
      this.transitionProgress += deltaTime;
      const t = Math.min(1, this.transitionProgress / 500);
      if (this.transitionProgress < 250) {
        this.transitionMask?.setAlpha(t * 2);
      } else {
        this.transitionMask?.setAlpha((1 - t) * 2);
      }
      if (this.transitionProgress >= 500) {
        this.isTransitioning = false;
        this.transitionMask?.setAlpha(0);
      }
      return;
    }

    this.eventTimer += deltaTime;

    if (this.currentWeather === 'clear') {
      if (this.eventTimer >= this.eventInterval) {
        this.triggerRandomWeatherEvent();
      }
    } else {
      this.weatherDuration += deltaTime;
      if (this.weatherDuration >= this.weatherEventDuration) {
        this.endWeatherEvent();
      }
    }

    this.updateWeatherEffects(deltaTime, hasShelter);
  }

  private triggerRandomWeatherEvent(): void {
    const weatherIndex = Math.floor(Math.random() * this.weatherTypes.length);
    this.currentWeather = this.weatherTypes[weatherIndex];
    this.eventTimer = 0;
    this.weatherDuration = 0;
    this.isTransitioning = true;
    this.transitionProgress = 0;
    this.eventEmitter.emit('weatherChange', this.currentWeather);
    this.showWeatherWarning();
    this.applyWeatherStartEffects();
  }

  private showWeatherWarning(): void {
    let message = '';
    let color = '#ffffff';
    switch (this.currentWeather) {
      case 'storm':
        message = '⚠️ 暴风雨来袭！体力消耗加倍！';
        color = '#66aaff';
        this.waveFrequency = 2;
        break;
      case 'sunny':
        message = '☀️ 烈日当空！体力消耗增加！';
        color = '#ffdd00';
        break;
      case 'damp':
        message = '🌧️ 潮湿天气！食物采集效率减半！';
        color = '#aaddaa';
        break;
    }

    if (this.warningText) {
      this.warningText.setText(message);
      this.warningText.setColor(color);
      this.scene.tweens.add({
        targets: this.warningText,
        alpha: 1,
        duration: 300,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.scene.time.delayedCall(2000, () => {
            this.scene.tweens.add({
              targets: this.warningText,
              alpha: 0,
              duration: 500,
              ease: 'Quad.easeIn'
            });
          });
        }
      });
    }
  }

  private applyWeatherStartEffects(): void {
    switch (this.currentWeather) {
      case 'storm':
        this.stormParticles?.start();
        break;
      case 'sunny':
        this.scene.tweens.add({
          targets: this.sunnyOverlay,
          alpha: 1,
          duration: 500
        });
        break;
      case 'damp':
        this.scene.tweens.add({
          targets: this.dampMask,
          alpha: 1,
          duration: 500
        });
        break;
    }
  }

  private endWeatherEvent(): void {
    this.currentWeather = 'clear';
    this.eventTimer = 0;
    this.weatherDuration = 0;
    this.isTransitioning = true;
    this.transitionProgress = 0;
    this.waveFrequency = 1;
    this.eventEmitter.emit('weatherChange', this.currentWeather);

    this.stormParticles?.stop();
    this.scene.tweens.add({
      targets: [this.sunnyOverlay, this.dampMask],
      alpha: 0,
      duration: 500
    });
  }

  private updateWeatherEffects(deltaTime: number, hasShelter: boolean): void {
  }

  public getStaminaDrainRate(): number {
    switch (this.currentWeather) {
      case 'storm':
        return 2;
      case 'sunny':
        return 1.5;
      default:
        return 1;
    }
  }

  public getEffectiveStaminaDrain(hasShelter: boolean): number {
    let rate = this.getStaminaDrainRate();
    if (this.currentWeather === 'storm' && hasShelter) {
      rate = 1;
    }
    return rate;
  }

  public isFoodGatheringReduced(): boolean {
    return this.currentWeather === 'damp';
  }

  public destroy(): void {
    this.stormParticles?.destroy();
    this.sunnyOverlay?.destroy();
    this.dampMask?.destroy();
    this.transitionMask?.destroy();
    this.warningText?.destroy();
    this.eventEmitter.removeAllListeners();
  }
}
