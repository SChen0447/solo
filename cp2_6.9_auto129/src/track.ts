export type ObstacleType = 'barrel' | 'rock';

export interface Obstacle {
  x: number;
  y: number;
  lane: number;
  type: ObstacleType;
  color: string;
  size: number;
  colliderSize: number;
  active: boolean;
}

export interface Coin {
  x: number;
  y: number;
  lane: number;
  diameter: number;
  collected: boolean;
  active: boolean;
  flashPhase: number;
}

export interface CollectParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
  active: boolean;
}

export interface SideObject {
  x: number;
  y: number;
  side: 'left' | 'right';
  type: 'tree' | 'lamp';
  active: boolean;
}

export class Track {
  public laneWidth: number = 100;
  public trackCenterX: number;
  public canvasWidth: number;
  public canvasHeight: number;

  private obstacles: Obstacle[] = [];
  private maxObstacles: number = 5;

  private coins: Coin[] = [];
  private maxCoins: number = 8;

  private collectParticles: CollectParticle[] = [];
  private maxCollectParticles: number = 30;

  private sideObjects: SideObject[] = [];
  private maxSideObjects: number = 30;

  private obstacleTimer: number = 0;
  private obstacleInterval: number = 120;

  private coinTimer: number = 0;
  private baseCoinInterval: number = 60;
  private minCoinInterval: number = 20;

  private sideObjectTimer: number = 0;
  private sideObjectInterval: number = 40;

  private distanceTraveled: number = 0;
  private dashOffset: number = 0;

  private obstacleColors: string[] = ['#8B4513', '#808080'];
  private obstacleColorIndex: number = 0;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.trackCenterX = canvasWidth / 2;
    this.initPools();
  }

  private initPools(): void {
    for (let i = 0; i < this.maxObstacles; i++) {
      this.obstacles.push({
        x: 0, y: 0, lane: 0, type: 'barrel',
        color: '#8B4513', size: 30, colliderSize: 22, active: false
      });
    }

    for (let i = 0; i < this.maxCoins; i++) {
      this.coins.push({
        x: 0, y: 0, lane: 0, diameter: 12,
        collected: false, active: false, flashPhase: 0
      });
    }

    for (let i = 0; i < this.maxCollectParticles; i++) {
      this.collectParticles.push({
        x: 0, y: 0, vx: 0, vy: 0, radius: 0,
        life: 0, maxLife: 18, active: false
      });
    }

    for (let i = 0; i < this.maxSideObjects; i++) {
      this.sideObjects.push({
        x: 0, y: 0, side: 'left', type: 'tree', active: false
      });
    }
  }

  public update(playerSpeed: number): void {
    this.distanceTraveled += playerSpeed;
    this.dashOffset = (this.dashOffset + playerSpeed) % 50;

    this.updateObstacles(playerSpeed);
    this.updateCoins(playerSpeed);
    this.updateCollectParticles();
    this.updateSideObjects(playerSpeed);

    this.spawnObstacles(playerSpeed);
    this.spawnCoins(playerSpeed);
    this.spawnSideObjects(playerSpeed);
  }

  private updateObstacles(playerSpeed: number): void {
    for (const obs of this.obstacles) {
      if (!obs.active) continue;
      obs.y += playerSpeed;
      if (obs.y > this.canvasHeight + 50) {
        obs.active = false;
      }
    }
  }

  private updateCoins(playerSpeed: number): void {
    for (const coin of this.coins) {
      if (!coin.active) continue;
      coin.y += playerSpeed;
      coin.flashPhase = (coin.flashPhase + 1) % 30;
      if (coin.y > this.canvasHeight + 50) {
        coin.active = false;
      }
    }
  }

  private updateCollectParticles(): void {
    for (const p of this.collectParticles) {
      if (!p.active) continue;
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      if (p.life >= p.maxLife) {
        p.active = false;
      }
    }
  }

  private updateSideObjects(playerSpeed: number): void {
    for (const obj of this.sideObjects) {
      if (!obj.active) continue;
      obj.y += playerSpeed * 1.2;
      if (obj.y > this.canvasHeight + 100) {
        obj.active = false;
      }
    }
  }

  private spawnObstacles(_playerSpeed: number): void {
    this.obstacleTimer++;
    const activeCount = this.obstacles.filter(o => o.active).length;
    if (this.obstacleTimer >= this.obstacleInterval && activeCount < this.maxObstacles) {
      this.obstacleTimer = 0;
      const obs = this.obstacles.find(o => !o.active);
      if (obs) {
        const lane = Math.floor(Math.random() * 3);
        obs.lane = lane;
        obs.x = this.trackCenterX + (lane - 1) * this.laneWidth;
        obs.y = -50;
        obs.type = Math.random() < 0.5 ? 'barrel' : 'rock';
        obs.color = this.obstacleColors[this.obstacleColorIndex];
        this.obstacleColorIndex = (this.obstacleColorIndex + 1) % 2;
        obs.size = 30;
        obs.colliderSize = 22;
        obs.active = true;
      }
    }
  }

  private spawnCoins(playerSpeed: number): void {
    this.coinTimer++;
    const speedFactor = Math.floor((playerSpeed - 2) / 1);
    const interval = Math.max(this.minCoinInterval, this.baseCoinInterval - speedFactor * 5);
    const activeCount = this.coins.filter(c => c.active).length;
    if (this.coinTimer >= interval && activeCount < this.maxCoins) {
      this.coinTimer = 0;
      const coin = this.coins.find(c => !c.active);
      if (coin) {
        const lane = Math.floor(Math.random() * 3);
        coin.lane = lane;
        coin.x = this.trackCenterX + (lane - 1) * this.laneWidth;
        coin.y = -30;
        coin.diameter = 12;
        coin.collected = false;
        coin.flashPhase = 0;
        coin.active = true;
      }
    }
  }

  private spawnSideObjects(_playerSpeed: number): void {
    this.sideObjectTimer++;
    const activeCount = this.sideObjects.filter(o => o.active).length;
    if (this.sideObjectTimer >= this.sideObjectInterval && activeCount < this.maxSideObjects) {
      this.sideObjectTimer = 0;
      const obj = this.sideObjects.find(o => !o.active);
      if (obj) {
        const side: 'left' | 'right' = Math.random() < 0.5 ? 'left' : 'right';
        obj.side = side;
        obj.x = side === 'left'
          ? this.trackCenterX - this.laneWidth * 1.5 - 30 - Math.random() * 40
          : this.trackCenterX + this.laneWidth * 1.5 + 30 + Math.random() * 40;
        obj.y = -80;
        obj.type = Math.random() < 0.7 ? 'tree' : 'lamp';
        obj.active = true;
      }
    }
  }

  public triggerCollectEffect(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const particle = this.collectParticles.find(p => !p.active);
      if (!particle) break;

      const angle = (Math.PI * 2 * i) / 6;
      const speed = 1.5 + Math.random();
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.radius = 2 + Math.random() * 2;
      particle.life = 0;
      particle.maxLife = 18;
      particle.active = true;
    }
  }

  public getActiveObstacles(): Obstacle[] {
    return this.obstacles.filter(o => o.active);
  }

  public getActiveCoins(): Coin[] {
    return this.coins.filter(c => c.active);
  }

  public getCollectParticles(): CollectParticle[] {
    return this.collectParticles.filter(p => p.active);
  }

  public getSideObjects(): SideObject[] {
    return this.sideObjects.filter(o => o.active);
  }

  public getDashOffset(): number {
    return this.dashOffset;
  }

  public collectCoin(coin: Coin): void {
    coin.collected = true;
    coin.active = false;
    this.triggerCollectEffect(coin.x, coin.y);
  }

  public reset(): void {
    this.distanceTraveled = 0;
    this.dashOffset = 0;
    this.obstacleTimer = 0;
    this.coinTimer = 0;
    this.sideObjectTimer = 0;
    this.obstacleColorIndex = 0;

    for (const obs of this.obstacles) obs.active = false;
    for (const coin of this.coins) coin.active = false;
    for (const p of this.collectParticles) p.active = false;
    for (const obj of this.sideObjects) obj.active = false;
  }
}
