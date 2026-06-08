export type ObstacleType = 'spike' | 'flyingBoard';

export interface Obstacle {
  id: number;
  type: ObstacleType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  rotationSpeed: number;
  passed: boolean;
}

export class ObstacleManager {
  private obstacles: Obstacle[] = [];
  private nextId: number = 0;
  
  private canvasWidth: number = 800;
  private canvasHeight: number = 600;
  private groundY: number = 0;
  
  private baseSpeed: number = 200;
  private currentSpeed: number = 200;
  private maxSpeed: number = 500;
  private speedIncrease: number = 15;
  private speedIncreaseInterval: number = 10;
  
  private lastSpikeTime: number = 0;
  private spikeInterval: number = 1500;
  
  private lastFlyingBoardTime: number = 0;
  private flyingBoardMinInterval: number = 1500;
  private flyingBoardMaxInterval: number = 2500;
  private nextFlyingBoardInterval: number = 2000;
  
  private passedCount: number = 0;
  private comboCount: number = 0;
  private perfectDodgeCount: number = 0;
  
  private gameStartTime: number = 0;
  private isRunning: boolean = false;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.groundY = canvasHeight * 0.8;
  }

  start(currentTime: number): void {
    this.isRunning = true;
    this.gameStartTime = currentTime;
    this.lastSpikeTime = currentTime;
    this.lastFlyingBoardTime = currentTime;
    this.nextFlyingBoardInterval = this.getRandomFlyingBoardInterval();
    this.passedCount = 0;
    this.comboCount = 0;
    this.perfectDodgeCount = 0;
    this.currentSpeed = this.baseSpeed;
    this.obstacles = [];
    this.nextId = 0;
  }

  stop(): void {
    this.isRunning = false;
  }

  update(deltaTime: number, currentTime: number): void {
    if (!this.isRunning) return;

    this.updateSpeed(currentTime);
    this.moveObstacles(deltaTime);
    this.spawnObstacles(currentTime);
    this.removeOffscreenObstacles();
    this.checkPassedObstacles();
  }

  private updateSpeed(currentTime: number): void {
    const elapsedSeconds = (currentTime - this.gameStartTime) / 1000;
    const speedLevel = Math.floor(elapsedSeconds / this.speedIncreaseInterval);
    const targetSpeed = this.baseSpeed + speedLevel * this.speedIncrease;
    this.currentSpeed = Math.min(targetSpeed, this.maxSpeed);
  }

  private moveObstacles(deltaTime: number): void {
    for (const obstacle of this.obstacles) {
      obstacle.x -= this.currentSpeed * deltaTime;
      
      if (obstacle.type === 'flyingBoard') {
        obstacle.rotation += obstacle.rotationSpeed * deltaTime;
      }
    }
  }

  private spawnObstacles(currentTime: number): void {
    if (currentTime - this.lastSpikeTime > this.spikeInterval) {
      this.spawnSpike();
      this.lastSpikeTime = currentTime;
    }

    if (currentTime - this.lastFlyingBoardTime > this.nextFlyingBoardInterval) {
      this.spawnFlyingBoard();
      this.lastFlyingBoardTime = currentTime;
      this.nextFlyingBoardInterval = this.getRandomFlyingBoardInterval();
    }
  }

  private spawnSpike(): void {
    const height = 10 + Math.random() * 20;
    const width = 20 + Math.random() * 15;
    
    this.obstacles.push({
      id: this.nextId++,
      type: 'spike',
      x: this.canvasWidth + 50,
      y: this.groundY - height,
      width,
      height,
      rotation: 0,
      rotationSpeed: 0,
      passed: false
    });
  }

  private spawnFlyingBoard(): void {
    const minY = this.canvasHeight * 0.4;
    const maxY = this.canvasHeight * 0.7;
    const y = minY + Math.random() * (maxY - minY);
    const width = 60;
    const height = 15;
    
    this.obstacles.push({
      id: this.nextId++,
      type: 'flyingBoard',
      x: this.canvasWidth + 50,
      y,
      width,
      height,
      rotation: 0,
      rotationSpeed: (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 3),
      passed: false
    });
  }

  private getRandomFlyingBoardInterval(): number {
    return this.flyingBoardMinInterval + 
           Math.random() * (this.flyingBoardMaxInterval - this.flyingBoardMinInterval);
  }

  private removeOffscreenObstacles(): void {
    this.obstacles = this.obstacles.filter(o => o.x + o.width > -50);
  }

  private checkPassedObstacles(): void {
    for (const obstacle of this.obstacles) {
      if (!obstacle.passed && obstacle.x + obstacle.width < 100) {
        obstacle.passed = true;
        this.passedCount++;
        this.perfectDodgeCount++;
        this.comboCount = this.perfectDodgeCount;
      }
    }
  }

  getObstacles(): Obstacle[] {
    return this.obstacles;
  }

  getPassedCount(): number {
    return this.passedCount;
  }

  getComboCount(): number {
    return this.perfectDodgeCount;
  }

  resetCombo(): void {
    this.perfectDodgeCount = 0;
    this.comboCount = 0;
  }

  getCurrentSpeed(): number {
    return this.currentSpeed;
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.groundY = canvasHeight * 0.8;
  }

  checkCollision(playerBox: { x: number; y: number; width: number; height: number }): boolean {
    for (const obstacle of this.obstacles) {
      if (this.checkBoxCollision(playerBox, obstacle)) {
        return true;
      }
    }
    return false;
  }

  private checkBoxCollision(
    box1: { x: number; y: number; width: number; height: number },
    obstacle: Obstacle
  ): boolean {
    if (obstacle.type === 'spike') {
      return this.checkSpikeCollision(box1, obstacle);
    } else {
      return this.checkRotatedRectCollision(box1, obstacle);
    }
  }

  private checkSpikeCollision(
    box1: { x: number; y: number; width: number; height: number },
    spike: Obstacle
  ): boolean {
    const spikeLeft = spike.x + spike.width * 0.2;
    const spikeRight = spike.x + spike.width * 0.8;
    const spikeTop = spike.y;
    const spikeBottom = spike.y + spike.height;

    return (
      box1.x < spikeRight &&
      box1.x + box1.width > spikeLeft &&
      box1.y < spikeBottom &&
      box1.y + box1.height > spikeTop
    );
  }

  private checkRotatedRectCollision(
    box1: { x: number; y: number; width: number; height: number },
    rect: Obstacle
  ): boolean {
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    
    const cos = Math.cos(-rect.rotation);
    const sin = Math.sin(-rect.rotation);
    
    const dx = box1.x + box1.width / 2 - cx;
    const dy = box1.y + box1.height / 2 - cy;
    
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    
    const halfW = rect.width / 2;
    const halfH = rect.height / 2;
    
    const playerHalfW = box1.width / 2;
    const playerHalfH = box1.height / 2;
    
    return (
      Math.abs(localX) < halfW + playerHalfW &&
      Math.abs(localY) < halfH + playerHalfH
    );
  }

  getGroundY(): number {
    return this.groundY;
  }
}
