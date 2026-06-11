import './style.css';
import { TrafficLightController } from './trafficLight';
import { VehicleManager, type Point } from './vehicle';
import { StatsTracker, StatsUIUpdater } from './stats';

interface GameState {
  isRunning: boolean;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  virtualSize: number;
  scale: number;
  intersectionSize: number;
  intersectionCenter: Point;
  lastTime: number;
  fps: number;
  frameCount: number;
  fpsUpdateTime: number;
}

class TrafficSimulation {
  private state: GameState;
  private lightController: TrafficLightController;
  private vehicleManager: VehicleManager;
  private statsTracker: StatsTracker;
  private statsUI: StatsUIUpdater;
  private animationId: number | null = null;

  constructor() {
    const canvas = document.getElementById('trafficCanvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context');
    }

    this.state = {
      isRunning: false,
      canvas,
      ctx,
      virtualSize: 800,
      scale: 1,
      intersectionSize: 200,
      intersectionCenter: { x: 400, y: 400 },
      lastTime: 0,
      fps: 0,
      frameCount: 0,
      fpsUpdateTime: 0
    };

    this.lightController = new TrafficLightController();
    this.vehicleManager = new VehicleManager();
    this.statsUI = new StatsUIUpdater();

    this.statsTracker = new StatsTracker({
      onTotalVehiclesChange: (value) => this.statsUI.updateTotalVehicles(value),
      onWaitTimeChange: (direction, value) => this.statsUI.updateWaitTime(direction, value),
      onCongestionChange: (value) => this.statsUI.updateCongestionIndex(value)
    });

    this.initialize();
  }

  private initialize(): void {
    this.setupCanvas();
    this.setupUI();
    this.lightController.bindControlPanel('lightControls');
    this.start();
  }

  private setupCanvas(): void {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private resizeCanvas(): void {
    const wrapper = this.state.canvas.parentElement;
    if (!wrapper) return;

    const wrapperRect = wrapper.getBoundingClientRect();
    const size = Math.min(wrapperRect.width, wrapperRect.height);
    
    this.state.canvas.width = size;
    this.state.canvas.height = size;
    this.state.scale = size / this.state.virtualSize;
    this.state.intersectionCenter = {
      x: this.state.virtualSize / 2,
      y: this.state.virtualSize / 2
    };
  }

  private setupUI(): void {
    const menuToggle = document.getElementById('menuToggle');
    const controlPanel = document.getElementById('controlPanel');
    const statsPanel = document.getElementById('statsPanel');
    const closePanel = document.getElementById('closePanel');
    const overlay = document.getElementById('overlay');

    const closePanels = () => {
      controlPanel?.classList.remove('open');
      statsPanel?.classList.remove('open');
      overlay?.classList.remove('active');
    };

    menuToggle?.addEventListener('click', () => {
      if (window.innerWidth <= 1280) {
        controlPanel?.classList.toggle('open');
        overlay?.classList.toggle('active');
      }
    });

    statsPanel?.addEventListener('click', (e) => {
      if (window.innerWidth <= 1280 && e.target === statsPanel) {
        statsPanel.classList.toggle('open');
        overlay?.classList.toggle('active');
      }
    });

    closePanel?.addEventListener('click', closePanels);
    overlay?.addEventListener('click', closePanels);

    const handleResize = () => {
      if (window.innerWidth > 1280) {
        controlPanel?.classList.remove('open');
        controlPanel?.classList.remove('collapsed');
        statsPanel?.classList.remove('open');
        statsPanel?.classList.remove('collapsed');
        overlay?.classList.remove('active');
      } else {
        controlPanel?.classList.add('collapsed');
        statsPanel?.classList.add('collapsed');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
  }

  private start(): void {
    this.state.isRunning = true;
    this.state.lastTime = performance.now();
    this.loop(this.state.lastTime);
  }

  private stop(): void {
    this.state.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private loop = (currentTime: number): void => {
    if (!this.state.isRunning) return;

    const deltaTime = Math.min((currentTime - this.state.lastTime) / 1000, 0.1);
    this.state.lastTime = currentTime;

    this.updateFPS(currentTime);
    this.update(deltaTime, currentTime / 1000);
    this.render();

    this.animationId = requestAnimationFrame(this.loop);
  };

  private updateFPS(currentTime: number): void {
    this.state.frameCount++;
    
    if (currentTime - this.state.fpsUpdateTime >= 1000) {
      this.state.fps = this.state.frameCount;
      this.state.frameCount = 0;
      this.state.fpsUpdateTime = currentTime;
      this.statsUI.updateFPS(this.state.fps);
    }
  }

  private update(deltaTime: number, currentTime: number): void {
    this.lightController.update(deltaTime);
    this.vehicleManager.update(
      deltaTime,
      this.lightController,
      this.state.intersectionCenter,
      this.state.intersectionSize,
      this.state.virtualSize
    );
    this.statsTracker.update(currentTime, this.vehicleManager);
  }

  private render(): void {
    const { ctx, scale } = this.state;
    
    ctx.clearRect(0, 0, this.state.canvas.width, this.state.canvas.height);
    
    ctx.save();
    ctx.scale(scale, scale);

    this.drawBackground();
    this.drawRoads();
    this.drawIntersection();
    this.vehicleManager.render(ctx, 1);
    this.lightController.renderLights(
      ctx,
      this.state.intersectionCenter.x,
      this.state.intersectionCenter.y,
      1
    );

    ctx.restore();
  }

  private drawBackground(): void {
    const { ctx, virtualSize } = this.state;
    
    const gradient = ctx.createRadialGradient(
      virtualSize / 2, virtualSize / 2, 0,
      virtualSize / 2, virtualSize / 2, virtualSize / 2
    );
    gradient.addColorStop(0, '#1f2937');
    gradient.addColorStop(1, '#1a1f2e');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, virtualSize, virtualSize);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    
    for (let x = 0; x <= virtualSize; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, virtualSize);
      ctx.stroke();
    }
    
    for (let y = 0; y <= virtualSize; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(virtualSize, y);
      ctx.stroke();
    }
  }

  private drawRoads(): void {
    const { ctx, virtualSize, intersectionSize, intersectionCenter } = this.state;
    const halfSize = intersectionSize / 2;
    const roadWidth = intersectionSize;

    ctx.fillStyle = '#2d3436';

    ctx.fillRect(
      0,
      intersectionCenter.y - roadWidth / 2,
      virtualSize,
      roadWidth
    );

    ctx.fillRect(
      intersectionCenter.x - roadWidth / 2,
      0,
      roadWidth,
      virtualSize
    );

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 15]);

    ctx.beginPath();
    ctx.moveTo(0, intersectionCenter.y);
    ctx.lineTo(intersectionCenter.x - halfSize, intersectionCenter.y);
    ctx.moveTo(intersectionCenter.x + halfSize, intersectionCenter.y);
    ctx.lineTo(virtualSize, intersectionCenter.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(intersectionCenter.x, 0);
    ctx.lineTo(intersectionCenter.x, intersectionCenter.y - halfSize);
    ctx.moveTo(intersectionCenter.x, intersectionCenter.y + halfSize);
    ctx.lineTo(intersectionCenter.x, virtualSize);
    ctx.stroke();

    ctx.setLineDash([]);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(0, intersectionCenter.y - roadWidth / 2);
    ctx.lineTo(virtualSize, intersectionCenter.y - roadWidth / 2);
    ctx.moveTo(0, intersectionCenter.y + roadWidth / 2);
    ctx.lineTo(virtualSize, intersectionCenter.y + roadWidth / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(intersectionCenter.x - roadWidth / 2, 0);
    ctx.lineTo(intersectionCenter.x - roadWidth / 2, virtualSize);
    ctx.moveTo(intersectionCenter.x + roadWidth / 2, 0);
    ctx.lineTo(intersectionCenter.x + roadWidth / 2, virtualSize);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);

    const laneOffset = intersectionSize / 4;

    ctx.beginPath();
    ctx.moveTo(0, intersectionCenter.y - laneOffset);
    ctx.lineTo(intersectionCenter.x - halfSize, intersectionCenter.y - laneOffset);
    ctx.moveTo(intersectionCenter.x + halfSize, intersectionCenter.y - laneOffset);
    ctx.lineTo(virtualSize, intersectionCenter.y - laneOffset);
    ctx.moveTo(0, intersectionCenter.y + laneOffset);
    ctx.lineTo(intersectionCenter.x - halfSize, intersectionCenter.y + laneOffset);
    ctx.moveTo(intersectionCenter.x + halfSize, intersectionCenter.y + laneOffset);
    ctx.lineTo(virtualSize, intersectionCenter.y + laneOffset);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(intersectionCenter.x - laneOffset, 0);
    ctx.lineTo(intersectionCenter.x - laneOffset, intersectionCenter.y - halfSize);
    ctx.moveTo(intersectionCenter.x - laneOffset, intersectionCenter.y + halfSize);
    ctx.lineTo(intersectionCenter.x - laneOffset, virtualSize);
    ctx.moveTo(intersectionCenter.x + laneOffset, 0);
    ctx.lineTo(intersectionCenter.x + laneOffset, intersectionCenter.y - halfSize);
    ctx.moveTo(intersectionCenter.x + laneOffset, intersectionCenter.y + halfSize);
    ctx.lineTo(intersectionCenter.x + laneOffset, virtualSize);
    ctx.stroke();

    ctx.setLineDash([]);

    this.drawStopLines();
    this.drawCrosswalks();
  }

  private drawStopLines(): void {
    const { ctx, intersectionSize, intersectionCenter } = this.state;
    const halfSize = intersectionSize / 2;
    const stopLineOffset = 15;
    const lineLength = intersectionSize / 2 - 5;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;

    ctx.beginPath();
    ctx.moveTo(
      intersectionCenter.x - lineLength,
      intersectionCenter.y - halfSize - stopLineOffset
    );
    ctx.lineTo(
      intersectionCenter.x + lineLength,
      intersectionCenter.y - halfSize - stopLineOffset
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(
      intersectionCenter.x - lineLength,
      intersectionCenter.y + halfSize + stopLineOffset
    );
    ctx.lineTo(
      intersectionCenter.x + lineLength,
      intersectionCenter.y + halfSize + stopLineOffset
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(
      intersectionCenter.x - halfSize - stopLineOffset,
      intersectionCenter.y - lineLength
    );
    ctx.lineTo(
      intersectionCenter.x - halfSize - stopLineOffset,
      intersectionCenter.y + lineLength
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(
      intersectionCenter.x + halfSize + stopLineOffset,
      intersectionCenter.y - lineLength
    );
    ctx.lineTo(
      intersectionCenter.x + halfSize + stopLineOffset,
      intersectionCenter.y + lineLength
    );
    ctx.stroke();
  }

  private drawCrosswalks(): void {
    const { ctx, intersectionSize, intersectionCenter } = this.state;
    const halfSize = intersectionSize / 2;
    const crosswalkWidth = 60;
    const stripeWidth = 8;
    const stripeGap = 6;
    const crosswalkOffset = 25;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

    for (let i = 0; i < crosswalkWidth / (stripeWidth + stripeGap); i++) {
      const offset = i * (stripeWidth + stripeGap) - crosswalkWidth / 2;
      
      ctx.fillRect(
        intersectionCenter.x - halfSize - crosswalkOffset - stripeWidth,
        intersectionCenter.y + offset,
        stripeWidth,
        stripeWidth
      );

      ctx.fillRect(
        intersectionCenter.x + halfSize + crosswalkOffset,
        intersectionCenter.y + offset,
        stripeWidth,
        stripeWidth
      );

      ctx.fillRect(
        intersectionCenter.x + offset,
        intersectionCenter.y - halfSize - crosswalkOffset - stripeWidth,
        stripeWidth,
        stripeWidth
      );

      ctx.fillRect(
        intersectionCenter.x + offset,
        intersectionCenter.y + halfSize + crosswalkOffset,
        stripeWidth,
        stripeWidth
      );
    }
  }

  private drawIntersection(): void {
    const { ctx, intersectionSize, intersectionCenter } = this.state;
    const halfSize = intersectionSize / 2;

    ctx.fillStyle = '#1f2937';
    ctx.fillRect(
      intersectionCenter.x - halfSize,
      intersectionCenter.y - halfSize,
      intersectionSize,
      intersectionSize
    );

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 20;

    for (let x = intersectionCenter.x - halfSize; x <= intersectionCenter.x + halfSize; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, intersectionCenter.y - halfSize);
      ctx.lineTo(x, intersectionCenter.y + halfSize);
      ctx.stroke();
    }

    for (let y = intersectionCenter.y - halfSize; y <= intersectionCenter.y + halfSize; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(intersectionCenter.x - halfSize, y);
      ctx.lineTo(intersectionCenter.x + halfSize, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      intersectionCenter.x - halfSize,
      intersectionCenter.y - halfSize,
      intersectionSize,
      intersectionSize
    );
  }

  public getFPS(): number {
    return this.state.fps;
  }

  public getVehicleCount(): number {
    return this.vehicleManager.getVehicleCount();
  }

  public reset(): void {
    this.vehicleManager.clear();
    this.statsTracker.reset();
    this.statsUI.updateAll(this.statsTracker.getStatsData());
  }
}

let simulation: TrafficSimulation | null = null;

document.addEventListener('DOMContentLoaded', () => {
  try {
    simulation = new TrafficSimulation();
    console.log('交通流模拟系统已启动');
  } catch (error) {
    console.error('初始化失败:', error);
  }
});

/// <reference types="vite/client" />

if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => {
    if (simulation) {
      simulation['stop']();
    }
  });
}

export default TrafficSimulation;
