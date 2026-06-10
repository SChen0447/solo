import { v4 as uuidv4 } from 'uuid';
import { MiningField } from './MiningField';
import { DroneManager } from './DroneManager';
import { UIOverlay } from './UIOverlay';
import { type MineralType, type GameRecord, GRID_SIZE } from './types';

export class GameMain {
  private canvas: HTMLCanvasElement;
  private container: HTMLElement;
  private miningField: MiningField;
  private droneManager: DroneManager;
  private ui: UIOverlay;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private keysPressed: Set<string> = new Set();
  private lastStorageSave: number = 0;

  constructor() {
    this.container = document.getElementById('game-container')!;
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

    this.miningField = new MiningField();
    this.droneManager = new DroneManager();
    this.ui = new UIOverlay(this.canvas, this.container);

    this.setupCallbacks();
    this.setupEventListeners();
  }

  private setupCallbacks(): void {
    this.miningField.setOnMineCallback((type: MineralType, amount: number) => {
      this.droneManager.addMineral(type, amount);
      this.ui.markGridDirty();
    });

    this.droneManager.setOnStunCallback(() => {
      this.ui.triggerShake();
    });

    this.droneManager.setOnGameOverCallback(() => {
      this.handleGameOver();
    });

    this.ui.setOnUpgradeClick((type: 'thruster' | 'arm' | 'oxygenTank') => {
      this.handleUpgrade(type);
    });

    this.ui.setOnRestartClick(() => {
      this.handleRestart();
    });

    this.ui.setOnReturnBaseClick(() => {
      this.handleReturnBase();
    });

    this.ui.setOnBaseButtonClick(() => {
      this.toggleUpgradePanel();
    });

    this.ui.setOnCloseUpgradeClick(() => {
      this.hideUpgradePanel();
    });
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      if (this.isPaused) return;
      const key = e.key.toLowerCase();
      this.keysPressed.add(key);
      this.handleKeyPress(key);
    });

    window.addEventListener('keyup', (e) => {
      this.keysPressed.delete(e.key.toLowerCase());
    });
  }

  private handleKeyPress(key: string): void {
    if (this.droneManager.isStunned()) return;

    const drone = this.droneManager.getState();

    switch (key) {
      case 'w':
        this.droneManager.move(0, -1);
        break;
      case 's':
        this.droneManager.move(0, 1);
        break;
      case 'a':
        this.droneManager.move(-1, 0);
        break;
      case 'd':
        this.droneManager.move(1, 0);
        break;
      case 'q':
        this.droneManager.dive();
        break;
      case 'e':
        this.droneManager.ascend();
        break;
      case ' ':
        e.preventDefault();
        if (!drone.isMining && this.miningField.canMineAt(drone.gridX, drone.gridY)) {
          this.droneManager.startMining();
        }
        break;
      case 'r':
        this.droneManager.fireSonar();
        break;
    }
  }

  private handleUpgrade(type: 'thruster' | 'arm' | 'oxygenTank'): void {
    const costs = {
      thruster: { iron: 10, copper: 5, cobalt: 0 },
      arm: { iron: 15, copper: 0, cobalt: 8 },
      oxygenTank: { iron: 0, copper: 12, cobalt: 5 }
    };
    const cost = costs[type];
    const success = this.droneManager.applyUpgrade(type, cost);
    if (success) {
      this.ui.showUpgradePanel(this.droneManager.getState(), this.droneManager.getUpgradeState());
      this.ui.updateHUD(this.droneManager.getState());
    }
  }

  private handleRestart(): void {
    this.ui.hideGameOverPanel();
    this.miningField.generateMap();
    this.droneManager.resetForNewGame();
    this.ui.markGridDirty();
    this.isPaused = false;
  }

  private handleReturnBase(): void {
    this.ui.hideGameOverPanel();
    this.miningField.generateMap();
    this.droneManager.resetToBase();
    this.ui.markGridDirty();
    this.isPaused = false;
  }

  private toggleUpgradePanel(): void {
    if (this.droneManager.isAtSurface()) {
      this.isPaused = true;
      this.droneManager.refillAtBase();
      this.ui.showUpgradePanel(this.droneManager.getState(), this.droneManager.getUpgradeState());
    }
  }

  private hideUpgradePanel(): void {
    this.ui.hideUpgradePanel();
    this.isPaused = false;
  }

  private handleGameOver(): void {
    if (this.isPaused) return;
    this.isPaused = true;

    const record: GameRecord = {
      id: uuidv4(),
      date: new Date().toISOString(),
      duration: this.droneManager.getElapsedTime(),
      maxDepth: this.droneManager.getMaxDepth(),
      minerals: { ...this.droneManager.getState().inventory },
      upgradesUnlocked: this.droneManager.getTotalUpgrades()
    };

    const now = Date.now();
    if (now - this.lastStorageSave >= 1000) {
      UIOverlay.saveRecord(record);
      this.lastStorageSave = now;
    }

    this.ui.showGameOverPanel({
      duration: record.duration,
      maxDepth: record.maxDepth,
      minerals: record.minerals,
      upgrades: record.upgradesUnlocked
    });
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private gameLoop = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    const deltaTime = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    if (!this.isPaused) {
      this.update(deltaTime);
    }
    this.render();

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number): void {
    this.droneManager.update(deltaTime);

    const drone = this.droneManager.getState();
    if (drone.isMining && drone.miningTarget) {
      if (drone.miningProgress >= drone.miningTime) {
        this.miningField.mineAt(drone.miningTarget.x, drone.miningTarget.y);
        this.droneManager.cancelMining();
      }
    }
  }

  private render(): void {
    const drone = this.droneManager.getState();
    const creatures = this.droneManager.getCreatures();
    const floatingTexts = this.droneManager.getFloatingTexts();
    const alertActive = this.droneManager.hasCreaturesNearby() || drone.oxygen < 20;

    this.ui.renderGrid(this.miningField.getGrid());
    this.ui.render(drone, creatures, floatingTexts, alertActive);
    this.ui.updateHUD(drone);
  }
}

const game = new GameMain();
game.start();

(window as unknown as { __game: GameMain }).__game = game;
