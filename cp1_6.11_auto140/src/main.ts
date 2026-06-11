import { PetRenderer, type Emotion, type PetState } from './PetRenderer';
import { InteractionUI, type PetStats, type EnvSettings } from './InteractionUI';
import { LineageView } from './LineageView';
import { createRandomGenome, breed, generatePhenotype } from './Genome';
import type { Genome, Phenotype } from './Genome';

class PetGame {
  private container: HTMLElement;
  private petCanvas: HTMLCanvasElement;
  private petRenderer: PetRenderer;
  private interactionUI: InteractionUI;
  private lineageView: LineageView;

  private genome: Genome;
  private mateGenome: Genome;
  private phenotype: Phenotype;

  private petState: PetState = 'egg';
  private emotion: Emotion = 'neutral';
  private emotionTimer: number | null = null;

  private stats: PetStats = {
    hunger: 70,
    happiness: 60,
    energy: 80,
    weight: 2.5,
    skillPoints: 0
  };

  private envSettings: EnvSettings = {
    temperature: 22,
    humidity: 50
  };

  private bounceOffset: number = 0;
  private breathScale: number = 1;
  private breathPhase: number = 0;
  private bouncePhase: number = 0;
  private isBouncing: boolean = false;

  private animationFrameId: number | null = null;
  private lastTime: number = 0;

  private hatchProgress: number = 0;
  private isHatching: boolean = false;

  constructor(container: HTMLElement) {
    this.container = container;

    this.genome = createRandomGenome();
    this.mateGenome = createRandomGenome();
    this.phenotype = generatePhenotype(this.genome);

    this.petCanvas = this.createPetCanvas();
    this.petRenderer = new PetRenderer(this.petCanvas);

    this.interactionUI = new InteractionUI(
      this.container,
      {
        onFeed: () => this.handleFeed(),
        onGroom: () => this.handleGroom(),
        onTrain: (points) => this.handleTrain(points),
        onMeasure: () => this.handleMeasure(),
        onEnvChange: (settings) => this.handleEnvChange(settings),
        onPetClick: () => this.handlePetClick()
      },
      this.stats,
      this.envSettings
    );

    this.lineageView = new LineageView(this.container);
    this.lineageView.updateGenome(this.genome);
    this.lineageView.setMateGenome(this.mateGenome);
    this.lineageView.setOnBreedCallback(() => this.handleBreed());

    this.bindEvents();
    this.resizeCanvas();
    this.startGameLoop();
    this.startStatsDecay();
  }

  private createPetCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 5;
    `;
    this.container.appendChild(canvas);
    return canvas;
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resizeCanvas());

    this.container.addEventListener('mousemove', (e) => {
      this.interactionUI.handleMouseMove(e);
    });

    this.container.addEventListener('click', (e) => {
      this.interactionUI.handleClick(e);
    });
  }

  private resizeCanvas(): void {
    const containerRect = this.container.getBoundingClientRect();
    const size = Math.min(containerRect.width * 0.6, containerRect.height * 0.6, 400);
    this.petCanvas.width = size;
    this.petCanvas.height = size;
    this.petRenderer.resize(size, size);
  }

  private startGameLoop(): void {
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - this.lastTime;
      this.lastTime = currentTime;

      this.update(deltaTime);
      this.render();

      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  private startStatsDecay(): void {
    setInterval(() => {
      if (this.petState === 'egg') return;

      this.stats.hunger = Math.max(0, this.stats.hunger - 0.5);
      this.stats.happiness = Math.max(0, this.stats.happiness - 0.3);
      this.stats.energy = Math.max(0, this.stats.energy - 0.2);

      this.updateEmotion();
      this.interactionUI.updateStats(this.stats);
    }, 3000);
  }

  private update(deltaTime: number): void {
    this.breathPhase += deltaTime * 0.006;
    this.breathScale = 1 + Math.sin(this.breathPhase) * 0.03;

    if (this.isBouncing) {
      this.bouncePhase += deltaTime * 0.01;
      this.bounceOffset = Math.abs(Math.sin(this.bouncePhase)) * -15;
      
      if (this.bouncePhase > Math.PI * 2) {
        this.isBouncing = false;
        this.bounceOffset = 0;
      }
    }

    if (this.isHatching) {
      this.hatchProgress += deltaTime * 0.001;
      if (this.hatchProgress >= 1) {
        this.isHatching = false;
        this.petState = 'hatched';
        this.setEmotion('happy');
      }
    }
  }

  private render(): void {
    this.petRenderer.render({
      phenotype: this.phenotype,
      emotion: this.emotion,
      state: this.petState,
      temperature: this.envSettings.temperature,
      humidity: this.envSettings.humidity,
      bounceOffset: this.bounceOffset,
      breathScale: this.breathScale
    });
  }

  private handleFeed(): void {
    if (this.petState === 'egg') {
      this.tryHatch();
      return;
    }

    this.stats.hunger = Math.min(100, this.stats.hunger + 15);
    this.stats.weight = Math.min(5, this.stats.weight + 0.1);
    this.stats.happiness = Math.min(100, this.stats.happiness + 5);

    if (this.stats.hunger > 80) {
      this.setEmotion('happy');
    }

    this.interactionUI.updateStats(this.stats);
  }

  private handleGroom(): void {
    if (this.petState === 'egg') return;

    this.stats.happiness = Math.min(100, this.stats.happiness + 0.5);
    this.stats.energy = Math.max(0, this.stats.energy - 0.1);
    this.interactionUI.updateStats(this.stats);
  }

  private handleTrain(points: number): void {
    if (this.petState === 'egg') return;

    this.stats.skillPoints += points;
    this.stats.happiness = Math.min(100, this.stats.happiness + 2);
    this.stats.energy = Math.max(0, this.stats.energy - 5);
    this.stats.hunger = Math.max(0, this.stats.hunger - 3);

    this.setEmotion('happy');
    this.interactionUI.updateStats(this.stats);
  }

  private handleMeasure(): void {
    if (this.petState === 'egg') {
      this.showEggInfo();
      return;
    }

    const weightInfo = `体重: ${this.stats.weight.toFixed(1)} kg`;
    const bodyTypeInfo = this.getBodyTypeDescription();
    console.log(`${weightInfo} | ${bodyTypeInfo}`);
  }

  private handleEnvChange(settings: EnvSettings): void {
    this.envSettings = settings;

    if (this.petState === 'egg') {
      const tempOptimal = settings.temperature >= 20 && settings.temperature <= 28;
      const humidOptimal = settings.humidity >= 40 && settings.humidity <= 70;
      
      if (tempOptimal && humidOptimal) {
        this.tryHatch();
      }
    }
  }

  private handlePetClick(): void {
    if (this.petState === 'egg') {
      this.tryHatch();
    } else {
      this.stats.happiness = Math.min(100, this.stats.happiness + 3);
      this.setEmotion('happy');
      this.isBouncing = true;
      this.bouncePhase = 0;
      this.interactionUI.updateStats(this.stats);
    }
  }

  private handleBreed(): void {
    const result = breed(this.genome, this.mateGenome);
    
    this.lineageView.showBreedingResult({
      offspring: result.offspring,
      parent1: this.genome,
      parent2: this.mateGenome,
      mutationOccurred: result.mutationOccurred,
      rareMutation: result.rareMutation
    });

    setTimeout(() => {
      this.genome = result.offspring;
      this.phenotype = generatePhenotype(this.genome);
      this.petState = 'egg';
      this.hatchProgress = 0;
      this.isHatching = false;
      this.mateGenome = createRandomGenome();
      
      this.lineageView.updateGenome(this.genome);
      this.lineageView.setMateGenome(this.mateGenome);
      
      this.stats = {
        hunger: 70,
        happiness: 60,
        energy: 80,
        weight: 2.5,
        skillPoints: 0
      };
      this.interactionUI.updateStats(this.stats);
      this.setEmotion('neutral');
    }, 3000);
  }

  private tryHatch(): void {
    if (this.isHatching || this.petState !== 'egg') return;

    const hatchChance = 0.5 + 
      (this.envSettings.temperature >= 20 && this.envSettings.temperature <= 28 ? 0.3 : 0) +
      (this.envSettings.humidity >= 40 && this.envSettings.humidity <= 70 ? 0.2 : 0);

    if (Math.random() < hatchChance * 0.3) {
      this.isHatching = true;
      this.hatchProgress = 0;
    }
  }

  private showEggInfo(): void {
    const temp = this.envSettings.temperature;
    const humid = this.envSettings.humidity;
    
    let tempStatus = '适宜';
    if (temp < 20) tempStatus = '偏冷';
    else if (temp > 28) tempStatus = '偏热';

    let humidStatus = '适宜';
    if (humid < 40) humidStatus = '干燥';
    else if (humid > 70) humidStatus = '潮湿';

    console.log(`蛋状态 - 温度: ${tempStatus} (${temp}°C) | 湿度: ${humidStatus} (${humid}%)`);
  }

  private getBodyTypeDescription(): string {
    switch (this.phenotype.bodyType) {
      case 'slim': return '瘦小型';
      case 'sturdy': return '魁梧型';
      default: return '标准型';
    }
  }

  private setEmotion(emotion: Emotion): void {
    if (this.emotionTimer) {
      clearTimeout(this.emotionTimer);
    }

    this.emotion = emotion;
    this.interactionUI.setEmotion(emotion);

    if (emotion !== 'neutral') {
      this.emotionTimer = window.setTimeout(() => {
        this.emotion = 'neutral';
        this.interactionUI.setEmotion('neutral');
        this.emotionTimer = null;
      }, 1500);
    }
  }

  private updateEmotion(): void {
    if (this.emotionTimer) return;

    if (this.stats.hunger < 30) {
      this.setEmotion('hungry');
    } else if (this.stats.energy < 20) {
      this.setEmotion('tired');
    } else if (this.stats.happiness > 80) {
      this.setEmotion('happy');
    }
  }

  destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.emotionTimer) {
      clearTimeout(this.emotionTimer);
    }
    this.interactionUI.destroy();
    this.lineageView.destroy();
  }
}

function initApp(): void {
  const app = document.getElementById('app');
  if (!app) {
    console.error('App container not found');
    return;
  }

  const ground = document.createElement('div');
  ground.style.cssText = `
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 25%;
    background: linear-gradient(180deg, #7cb342 0%, #558b2f 100%);
    z-index: 1;
  `;
  ground.innerHTML = `
    <div style="
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: radial-gradient(circle at 20% 30%, rgba(139, 195, 74, 0.4) 2px, transparent 2px),
                        radial-gradient(circle at 60% 50%, rgba(139, 195, 74, 0.3) 1.5px, transparent 1.5px),
                        radial-gradient(circle at 80% 20%, rgba(104, 159, 56, 0.4) 2.5px, transparent 2.5px),
                        radial-gradient(circle at 40% 70%, rgba(104, 159, 56, 0.3) 1.5px, transparent 1.5px);
      background-size: 30px 30px, 40px 40px, 25px 25px, 35px 35px;
    "></div>
  `;
  app.appendChild(ground);

  const platform = document.createElement('div');
  platform.style.cssText = `
    position: absolute;
    top: 55%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 280px;
    height: 80px;
    background: linear-gradient(180deg, #8d6e63 0%, #6d4c41 100%);
    border-radius: 50%;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
    z-index: 2;
  `;
  app.appendChild(platform);

  const moss = document.createElement('div');
  moss.style.cssText = `
    position: absolute;
    top: 55%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 290px;
    height: 90px;
    background: radial-gradient(ellipse at center, #7cb342 0%, #558b2f 60%, transparent 100%);
    border-radius: 50%;
    opacity: 0.6;
    z-index: 3;
  `;
  app.appendChild(moss);

  new PetGame(app);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

export { PetGame };
