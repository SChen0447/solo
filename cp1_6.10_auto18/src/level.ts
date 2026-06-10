export type ObstacleType = 'spike' | 'crow' | 'thunder';

export interface Obstacle {
  type: ObstacleType;
  x: number;
  y: number;
  width: number;
  height: number;
  velocityX: number;
  velocityY: number;
  phase: number;
  active: boolean;
}

export interface EnergyOrb {
  x: number;
  y: number;
  radius: number;
  collected: boolean;
  phase: number;
}

export interface CloudLayer {
  speed: number;
  opacity: number;
  clouds: { x: number; y: number; width: number; height: number; offset: number }[];
}

export interface LevelTheme {
  skyTop: string;
  skyBottom: string;
  mountainColor: string;
  mountainColorDark: string;
  cloudColor: string;
  accentColor: string;
  levelName: string;
}

export const LEVEL_THEMES: LevelTheme[] = [
  {
    skyTop: '#FFB347',
    skyBottom: '#87CEEB',
    mountainColor: '#6B8E7A',
    mountainColorDark: '#4A6B5A',
    cloudColor: 'rgba(255, 255, 255, 0.85)',
    accentColor: '#FFD700',
    levelName: '第一章 · 晨曦山谷'
  },
  {
    skyTop: '#7B2D8E',
    skyBottom: '#FF8C42',
    mountainColor: '#5D4E6D',
    mountainColorDark: '#3D2E4D',
    cloudColor: 'rgba(255, 200, 150, 0.7)',
    accentColor: '#C084FC',
    levelName: '第二章 · 暮光幻域'
  },
  {
    skyTop: '#0A1128',
    skyBottom: '#1E3A5F',
    mountainColor: '#1B2838',
    mountainColorDark: '#0D1520',
    cloudColor: 'rgba(150, 255, 180, 0.5)',
    accentColor: '#39FF14',
    levelName: '第三章 · 星夜秘境'
  }
];

const LEVEL_LENGTH = 8000;
const SCROLL_SPEED_BASE = 120;
const NUM_OBSTACLES_PER_LEVEL = 25;
const NUM_ORBS_PER_LEVEL = 20;

export class LevelManager {
  private currentLevel: number = 0;
  private scrollX: number = 0;
  private canvasWidth: number;
  private canvasHeight: number;
  private obstacles: Obstacle[] = [];
  private energyOrbs: EnergyOrb[] = [];
  private cloudLayers: CloudLayer[] = [];
  private mountainOffsets: number[] = [];
  private transitionActive: boolean = false;
  private transitionProgress: number = 0;
  private targetLevel: number = 0;
  private collectedOrbs: number = 0;
  private levelComplete: boolean = false;
  private totalCollectedOrbs: number = 0;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.initCloudLayers();
    this.mountainOffsets = [0, 0, 0, 0, 0];
    this.generateLevel(0);
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  private initCloudLayers(): void {
    this.cloudLayers = [];
    const layerConfigs = [
      { speed: 8, opacity: 0.35, count: 6 },
      { speed: 16, opacity: 0.5, count: 5 },
      { speed: 28, opacity: 0.65, count: 5 },
      { speed: 45, opacity: 0.75, count: 4 }
    ];

    for (const config of layerConfigs) {
      const clouds: CloudLayer['clouds'] = [];
      for (let i = 0; i < config.count; i++) {
        clouds.push({
          x: Math.random() * this.canvasWidth * 2,
          y: this.canvasHeight * (0.08 + Math.random() * 0.45),
          width: 120 + Math.random() * 180,
          height: 40 + Math.random() * 50,
          offset: Math.random() * Math.PI * 2
        });
      }
      this.cloudLayers.push({ speed: config.speed, opacity: config.opacity, clouds });
    }
  }

  private generateLevel(levelIndex: number): void {
    this.obstacles = [];
    this.energyOrbs = [];
    this.collectedOrbs = 0;
    this.levelComplete = false;
    this.scrollX = 0;

    const difficulty = levelIndex + 1;
    const obstacleSpacing = LEVEL_LENGTH / NUM_OBSTACLES_PER_LEVEL;

    for (let i = 0; i < NUM_OBSTACLES_PER_LEVEL; i++) {
      const types: ObstacleType[] = levelIndex === 0 
        ? ['spike', 'spike', 'crow'] 
        : levelIndex === 1 
          ? ['spike', 'crow', 'crow', 'thunder']
          : ['spike', 'crow', 'thunder', 'thunder'];
      
      const type = types[Math.floor(Math.random() * types.length)];
      const x = 600 + i * obstacleSpacing + (Math.random() - 0.5) * obstacleSpacing * 0.5;
      
      let obstacle: Obstacle;
      
      switch (type) {
        case 'spike': {
          const fromTop = Math.random() > 0.5;
          obstacle = {
            type,
            x,
            y: fromTop ? -10 : this.canvasHeight - 80 - Math.random() * 100,
            width: 50 + Math.random() * 30,
            height: 80 + Math.random() * 80 * difficulty,
            velocityX: 0,
            velocityY: 0,
            phase: Math.random() * Math.PI * 2,
            active: true
          };
          break;
        }
        case 'crow': {
          obstacle = {
            type,
            x,
            y: this.canvasHeight * (0.15 + Math.random() * 0.55),
            width: 45,
            height: 30,
            velocityX: -30 * difficulty,
            velocityY: 0,
            phase: Math.random() * Math.PI * 2,
            active: true
          };
          break;
        }
        case 'thunder':
        default: {
          obstacle = {
            type,
            x,
            y: this.canvasHeight * (0.2 + Math.random() * 0.4),
            width: 100 + Math.random() * 60,
            height: 120 + Math.random() * 80,
            velocityX: 0,
            velocityY: Math.sin(Date.now() * 0.001) * 20,
            phase: Math.random() * Math.PI * 2,
            active: true
          };
          break;
        }
      }
      
      this.obstacles.push(obstacle);
    }

    const orbSpacing = LEVEL_LENGTH / NUM_ORBS_PER_LEVEL;
    for (let i = 0; i < NUM_ORBS_PER_LEVEL; i++) {
      this.energyOrbs.push({
        x: 500 + i * orbSpacing + (Math.random() - 0.5) * orbSpacing * 0.6,
        y: this.canvasHeight * (0.15 + Math.random() * 0.6),
        radius: 14,
        collected: false,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  update(deltaTime: number): void {
    if (this.transitionActive) {
      this.transitionProgress += deltaTime * 0.8;
      if (this.transitionProgress >= 1.0) {
        this.transitionActive = false;
        this.transitionProgress = 0;
        this.currentLevel = this.targetLevel;
        this.generateLevel(this.currentLevel);
      }
      return;
    }

    if (this.levelComplete) return;

    const scrollSpeed = SCROLL_SPEED_BASE * (1 + this.currentLevel * 0.2);
    this.scrollX += scrollSpeed * deltaTime;

    for (let i = 0; i < this.cloudLayers.length; i++) {
      const layer = this.cloudLayers[i];
      for (const cloud of layer.clouds) {
        cloud.x -= layer.speed * deltaTime;
        if (cloud.x + cloud.width < -100) {
          cloud.x = this.canvasWidth + 50 + Math.random() * 200;
          cloud.y = this.canvasHeight * (0.08 + Math.random() * 0.45);
        }
      }
    }

    for (let i = 0; i < this.mountainOffsets.length; i++) {
      this.mountainOffsets[i] -= (8 + i * 12) * deltaTime;
    }

    for (const obs of this.obstacles) {
      if (!obs.active) continue;
      obs.phase += deltaTime * 2;
      
      if (obs.type === 'crow') {
        obs.y += Math.sin(obs.phase * 3) * 0.8;
      } else if (obs.type === 'thunder') {
        obs.y += Math.sin(obs.phase) * 0.5;
      }
    }

    for (const orb of this.energyOrbs) {
      orb.phase += deltaTime * 3;
    }

    if (this.scrollX >= LEVEL_LENGTH) {
      this.levelComplete = true;
      this.totalCollectedOrbs += this.collectedOrbs;
    }
  }

  checkCollisions(
    playerX: number,
    playerY: number,
    playerRadius: number
  ): { hit: boolean; orbCollected: boolean } {
    let hit = false;
    let orbCollected = false;

    for (const obs of this.obstacles) {
      if (!obs.active) continue;
      
      const screenX = obs.x - this.scrollX;
      if (screenX > this.canvasWidth + 200 || screenX < -200) continue;

      const closestX = Math.max(screenX, Math.min(playerX, screenX + obs.width));
      const closestY = Math.max(obs.y, Math.min(playerY, obs.y + obs.height));
      const dx = playerX - closestX;
      const dy = playerY - closestY;
      
      if (dx * dx + dy * dy < playerRadius * playerRadius) {
        hit = true;
        break;
      }
    }

    for (const orb of this.energyOrbs) {
      if (orb.collected) continue;
      
      const screenX = orb.x - this.scrollX;
      if (screenX > this.canvasWidth + 100 || screenX < -100) continue;

      const dx = playerX - screenX;
      const dy = playerY - orb.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < playerRadius + orb.radius) {
        orb.collected = true;
        orbCollected = true;
        this.collectedOrbs++;
      }
    }

    return { hit, orbCollected };
  }

  startTransition(toLevel: number): void {
    if (this.transitionActive) return;
    this.targetLevel = toLevel;
    this.transitionActive = true;
    this.transitionProgress = 0;
  }

  isTransitionActive(): boolean {
    return this.transitionActive;
  }

  getTransitionProgress(): number {
    return this.transitionProgress;
  }

  getCurrentLevel(): number {
    return this.currentLevel;
  }

  getTheme(): LevelTheme {
    return LEVEL_THEMES[this.currentLevel];
  }

  getProgress(): number {
    return Math.min(1, this.scrollX / LEVEL_LENGTH);
  }

  getObstacles(): Obstacle[] {
    return this.obstacles;
  }

  getEnergyOrbs(): EnergyOrb[] {
    return this.energyOrbs;
  }

  getCloudLayers(): CloudLayer[] {
    return this.cloudLayers;
  }

  getMountainOffsets(): number[] {
    return this.mountainOffsets;
  }

  getScrollX(): number {
    return this.scrollX;
  }

  getCollectedOrbs(): number {
    return this.collectedOrbs;
  }

  getTotalCollectedOrbs(): number {
    return this.totalCollectedOrbs;
  }

  isLevelComplete(): boolean {
    return this.levelComplete;
  }

  hasNextLevel(): boolean {
    return this.currentLevel < LEVEL_THEMES.length - 1;
  }

  reset(): void {
    this.currentLevel = 0;
    this.totalCollectedOrbs = 0;
    this.transitionActive = false;
    this.transitionProgress = 0;
    this.generateLevel(0);
  }

  advanceToNextLevel(): boolean {
    if (!this.hasNextLevel()) return false;
    this.startTransition(this.currentLevel + 1);
    return true;
  }
}
