import { FishManager, FishConfig } from './fish';
import { Boat, BoatConfig } from './boat';
import { UIManager, GameState, UIConfig } from './ui';

interface Cloud {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  speed: number;
}

interface Rock {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Seaweed {
  x: number;
  y: number;
  height: number;
  swayOffset: number;
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;

  private width: number = 0;
  private height: number = 0;
  private isSmallScreen: boolean = false;

  private time: number = 0;
  private lastTime: number = 0;
  private waveAmplitude: number = 10;
  private waveFrequency: number = (2 * Math.PI * 12) / 60;
  private targetWaveAmplitude: number = 10;

  private fishCount: number = 0;
  private coins: number = 50;
  private netRangeLevel: number = 1;
  private speedLevel: number = 1;
  private fishFlashTimer: number = 0;
  private coinFlashTimer: number = 0;

  private tideTime: number = 0;
  private tideCycle: number = 60;
  private isHighTide: boolean = false;

  private fishManager: FishManager;
  private boat: Boat;
  private uiManager: UIManager;

  private clouds: Cloud[] = [];
  private rocks: Rock[] = [];
  private seaweeds: Seaweed[] = [];

  private mouseX: number = 0;
  private mouseY: number = 0;
  private isMouseDown: boolean = false;

  private blurVisible: boolean = true;
  private blurTimer: number = 0;
  private blurCycle: number = 30;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.dpr = window.devicePixelRatio || 1;

    this.fishManager = new FishManager();
    this.boat = new Boat(0, 0);
    this.uiManager = new UIManager();

    this.resize();
    this.initEnvironment();
    this.bindEvents();

    this.boat = new Boat(this.width / 2, this.getSeaLevelY(), this.isSmallScreen);

    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  private resize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.isSmallScreen = this.width < 600;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';

    this.ctx.scale(this.dpr, this.dpr);
    this.ctx.imageSmoothingEnabled = false;

    if (this.boat) {
      this.boat.setSize(this.isSmallScreen);
    }
  }

  private getSeaLevelY(): number {
    return this.height * 0.5;
  }

  private initEnvironment(): void {
    const cloudCount = 3 + Math.floor(Math.random() * 3);
    this.clouds = [];
    for (let i = 0; i < cloudCount; i++) {
      this.clouds.push({
        x: Math.random() * this.width,
        y: 20 + Math.random() * (this.getSeaLevelY() * 0.4),
        radius: 15 + Math.random() * 15,
        opacity: 0.2 + Math.random() * 0.2,
        speed: 0.1 + Math.random() * 0.2
      });
    }

    this.rocks = [];
    const rockCount = 5 + Math.floor(Math.random() * 5);
    for (let i = 0; i < rockCount; i++) {
      this.rocks.push({
        x: Math.random() * this.width,
        y: this.height - 20 - Math.random() * 40,
        width: 20 + Math.random() * 40,
        height: 10 + Math.random() * 25
      });
    }

    this.seaweeds = [];
    const seaweedCount = 8 + Math.floor(Math.random() * 8);
    for (let i = 0; i < seaweedCount; i++) {
      this.seaweeds.push({
        x: Math.random() * this.width,
        y: this.height - 5,
        height: 20 + Math.random() * 40,
        swayOffset: Math.random() * Math.PI * 2
      });
    }

    const fishConfig: FishConfig = {
      canvasWidth: this.width,
      canvasHeight: this.height,
      seaLevelY: this.getSeaLevelY()
    };
    this.fishManager.spawnFishes(fishConfig, 50);
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => {
      this.resize();
      this.initEnvironment();
    });

    this.canvas.addEventListener('mousedown', (e) => {
      this.isMouseDown = true;
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.mouseX = x;
      this.mouseY = y;

      const uiHandled = this.uiManager.handleClick(x, y, this.handleBuy.bind(this));
      if (!uiHandled) {
        this.boat.isDragging = true;
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
      this.uiManager.handleMouseMove(this.mouseX, this.mouseY);
    });

    this.canvas.addEventListener('mouseup', () => {
      this.isMouseDown = false;
      this.boat.isDragging = false;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isMouseDown = false;
      this.boat.isDragging = false;
    });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      this.mouseX = x;
      this.mouseY = y;
      this.isMouseDown = true;

      const uiHandled = this.uiManager.handleClick(x, y, this.handleBuy.bind(this));
      if (!uiHandled) {
        this.boat.isDragging = true;
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = touch.clientX - rect.left;
      this.mouseY = touch.clientY - rect.top;
      this.uiManager.handleMouseMove(this.mouseX, this.mouseY);
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.isMouseDown = false;
      this.boat.isDragging = false;
    }, { passive: false });
  }

  private handleBuy(type: 'net' | 'speed'): void {
    const cost = 50;
    if (this.coins < cost) return;

    if (type === 'net' && this.netRangeLevel < 3) {
      this.coins -= cost;
      this.netRangeLevel++;
      this.coinFlashTimer = 0.3;
    } else if (type === 'speed' && this.speedLevel < 3) {
      this.coins -= cost;
      this.speedLevel++;
      this.coinFlashTimer = 0.3;
    }
  }

  private loop(currentTime: number): void {
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;
    this.time += deltaTime;

    this.updateTide(deltaTime);
    this.updateBlur(deltaTime);
    this.update(deltaTime);
    this.draw();

    requestAnimationFrame(this.loop.bind(this));
  }

  private updateTide(dt: number): void {
    this.tideTime += dt;
    if (this.tideTime >= this.tideCycle) {
      this.tideTime = 0;
    }

    const progress = this.tideTime / this.tideCycle;
    this.isHighTide = progress < 0.5;

    const baseAmplitude = 8 + Math.sin(this.time * 0.1) * 3.5;
    this.targetWaveAmplitude = this.isHighTide ? baseAmplitude * 1.5 : baseAmplitude;
    this.waveAmplitude += (this.targetWaveAmplitude - this.waveAmplitude) * 0.02;
  }

  private updateBlur(dt: number): void {
    this.blurTimer += dt;
    if (this.blurTimer >= this.blurCycle) {
      this.blurTimer = 0;
      this.blurVisible = !this.blurVisible;
      const overlay = document.getElementById('blur-overlay');
      if (overlay) {
        overlay.classList.toggle('hidden', !this.blurVisible);
      }
    }
  }

  private update(dt: number): void {
    for (const cloud of this.clouds) {
      cloud.x += cloud.speed;
      if (cloud.x - cloud.radius * 3 > this.width) {
        cloud.x = -cloud.radius * 3;
      }
    }

    const fishConfig: FishConfig = {
      canvasWidth: this.width,
      canvasHeight: this.height,
      seaLevelY: this.getSeaLevelY()
    };

    const boatConfig: BoatConfig = {
      canvasWidth: this.width,
      canvasHeight: this.height,
      seaLevelY: this.getSeaLevelY(),
      waveAmplitude: this.waveAmplitude,
      waveFrequency: this.waveFrequency,
      time: this.time,
      netRangeLevel: this.netRangeLevel,
      speedLevel: this.speedLevel,
      isHighTide: this.isHighTide
    };

    this.boat.update(boatConfig, this.mouseX);

    const netBounds = this.boat.getNetBounds(boatConfig);
    const caughtCount = this.fishManager.update(
      fishConfig, this.boat.x, this.boat.y,
      netBounds.left, netBounds.right, netBounds.top, netBounds.bottom
    );

    if (caughtCount > 0) {
      this.fishCount += caughtCount;
      this.coins += caughtCount * 2;
      this.fishFlashTimer = 0.3;
      this.coinFlashTimer = 0.3;
    }

    if (this.fishFlashTimer > 0) this.fishFlashTimer -= dt;
    if (this.coinFlashTimer > 0) this.coinFlashTimer -= dt;

    this.fishManager.cullFarFishes(this.boat.x, this.boat.y, 500);
  }

  private draw(): void {
    this.drawBackground();
    this.drawClouds();
    this.drawSeaBottom();
    this.drawWave();
    this.fishManager.draw(this.ctx);

    const boatConfig: BoatConfig = {
      canvasWidth: this.width,
      canvasHeight: this.height,
      seaLevelY: this.getSeaLevelY(),
      waveAmplitude: this.waveAmplitude,
      waveFrequency: this.waveFrequency,
      time: this.time,
      netRangeLevel: this.netRangeLevel,
      speedLevel: this.speedLevel,
      isHighTide: this.isHighTide
    };
    this.boat.draw(this.ctx, boatConfig);

    const gameState: GameState = {
      fishCount: this.fishCount,
      coins: this.coins,
      netRangeLevel: this.netRangeLevel,
      speedLevel: this.speedLevel,
      tideProgress: this.tideTime / this.tideCycle,
      isHighTide: this.isHighTide,
      fishFlashTimer: this.fishFlashTimer,
      coinFlashTimer: this.coinFlashTimer
    };

    const uiConfig: UIConfig = {
      canvasWidth: this.width,
      canvasHeight: this.height,
      isSmallScreen: this.isSmallScreen
    };

    this.uiManager.draw(this.ctx, gameState, uiConfig);
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0d1b2a');
    gradient.addColorStop(0.5, '#1b2838');
    gradient.addColorStop(1, '#2a4a5f');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawClouds(): void {
    for (const cloud of this.clouds) {
      const gradient = this.ctx.createRadialGradient(
        cloud.x, cloud.y, 0,
        cloud.x, cloud.y, cloud.radius * 2
      );
      gradient.addColorStop(0, `rgba(255, 255, 255, ${cloud.opacity})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(cloud.x, cloud.y, cloud.radius * 2, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(cloud.x - cloud.radius * 0.8, cloud.y + cloud.radius * 0.2,
        cloud.radius * 1.3, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(cloud.x + cloud.radius * 0.7, cloud.y + cloud.radius * 0.1,
        cloud.radius * 1.2, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawSeaBottom(): void {
    for (const rock of this.rocks) {
      this.ctx.fillStyle = '#1a3a4a';
      this.ctx.beginPath();
      this.ctx.moveTo(rock.x - rock.width / 2, rock.y + rock.height);
      this.ctx.lineTo(rock.x - rock.width / 3, rock.y);
      this.ctx.lineTo(rock.x + rock.width / 3, rock.y + rock.height * 0.1);
      this.ctx.lineTo(rock.x + rock.width / 2, rock.y + rock.height);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.fillStyle = '#0f2530';
      this.ctx.fillRect(rock.x - rock.width / 3, rock.y + 2, 2, rock.height * 0.6);
    }

    this.ctx.strokeStyle = '#1a3a4a';
    this.ctx.lineWidth = 2;
    for (const seaweed of this.seaweeds) {
      const segments = 5;
      this.ctx.beginPath();
      this.ctx.moveTo(seaweed.x, seaweed.y);
      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const sway = Math.sin(this.time * 1.5 + seaweed.swayOffset + t * 2) * (5 + t * 8);
        this.ctx.lineTo(seaweed.x + sway, seaweed.y - seaweed.height * t);
      }
      this.ctx.stroke();
    }
  }

  private drawWave(): void {
    const seaLevelY = this.getSeaLevelY();

    this.ctx.save();
    this.ctx.shadowColor = '#4a7c8c';
    this.ctx.shadowBlur = 8;
    this.ctx.strokeStyle = '#4a7c8c';
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    this.ctx.moveTo(0, seaLevelY);

    const step = 4;
    for (let x = 0; x <= this.width; x += step) {
      const y = seaLevelY +
        Math.sin(this.time * this.waveFrequency + x * 0.02) * this.waveAmplitude;
      this.ctx.lineTo(x, y);
    }

    this.ctx.lineTo(this.width, this.height);
    this.ctx.lineTo(0, this.height);
    this.ctx.closePath();

    const seaGradient = this.ctx.createLinearGradient(0, seaLevelY, 0, this.height);
    seaGradient.addColorStop(0, 'rgba(74, 124, 140, 0.3)');
    seaGradient.addColorStop(1, 'rgba(42, 74, 95, 0.8)');
    this.ctx.fillStyle = seaGradient;
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.moveTo(0, seaLevelY);
    for (let x = 0; x <= this.width; x += step) {
      const y = seaLevelY +
        Math.sin(this.time * this.waveFrequency + x * 0.02) * this.waveAmplitude;
      this.ctx.lineTo(x, y);
    }
    this.ctx.stroke();

    this.ctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
