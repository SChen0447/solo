import { InputState } from './InputManager';

export interface Player {
  x: number;
  y: number;
  angle: number;
  speed: number;
  spotlightOn: boolean;
  flashTimer: number;
  vx: number;
  vy: number;
}

export interface Artifact {
  x: number;
  y: number;
  collected: boolean;
  flashPhase: number;
  fadeOut: number;
}

export interface Enemy {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  changeTimer: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface ShipSection {
  x: number;
  y: number;
  w: number;
  h: number;
  shape: 'rect' | 'triangle';
  falling: boolean;
  vy: number;
  rotation: number;
}

export interface SeaCreature {
  x: number;
  y: number;
  color: string;
  size: number;
  phase: number;
  isTop: boolean;
}

export interface Debris {
  x: number;
  y: number;
  points: { x: number; y: number }[];
  falling: boolean;
  vy: number;
  rotation: number;
  rotSpeed: number;
}

export interface Exit {
  x: number;
  y: number;
  w: number;
  h: number;
  blinkPhase: number;
}

export type GameState = 'TITLE' | 'PLAYING' | 'WIN' | 'LOSE';

const GRID_SIZE = 16;
const SHIP_LENGTH = 20;
const CANVAS_W = 960;
const CANVAS_H = 540;
const PICKUP_DISTANCE = 6;
const PLAYER_SPEED = 2;
const ROTATION_SPEED = 0.05;
const ENEMY_SPEED = 1.5;
const COUNTDOWN_SECONDS = 60;
const MAX_PARTICLES = 50;
const MAX_ENTITIES = 30;

export class GameEngine {
  public state: GameState;
  public player: Player;
  public artifacts: Artifact[];
  public enemies: Enemy[];
  public particles: Particle[];
  public shipSections: ShipSection[];
  public seaCreatures: SeaCreature[];
  public debris: Debris[];
  public exit: Exit;
  public collectedCount: number;
  public countdown: number;
  public countdownActive: boolean;
  public shakeOffset: { x: number; y: number };
  public resultTimer: number;
  public timeElapsed: number;
  private shipBounds: { left: number; right: number; top: number; bottom: number };

  constructor() {
    this.state = 'TITLE';
    this.player = this.createPlayer();
    this.artifacts = [];
    this.enemies = [];
    this.particles = [];
    this.shipSections = [];
    this.seaCreatures = [];
    this.debris = [];
    this.exit = { x: 0, y: 0, w: 32, h: 64, blinkPhase: 0 };
    this.collectedCount = 0;
    this.countdown = COUNTDOWN_SECONDS;
    this.countdownActive = false;
    this.shakeOffset = { x: 0, y: 0 };
    this.resultTimer = 0;
    this.timeElapsed = 0;
    this.shipBounds = { left: 0, right: 0, top: 0, bottom: 0 };
  }

  private createPlayer(): Player {
    return {
      x: 100,
      y: CANVAS_H / 2,
      angle: 0,
      speed: PLAYER_SPEED,
      spotlightOn: false,
      flashTimer: 0,
      vx: 0,
      vy: 0
    };
  }

  public resetGame(): void {
    this.player = this.createPlayer();
    this.artifacts = [];
    this.enemies = [];
    this.particles = [];
    this.shipSections = [];
    this.seaCreatures = [];
    this.debris = [];
    this.collectedCount = 0;
    this.countdown = COUNTDOWN_SECONDS;
    this.countdownActive = false;
    this.shakeOffset = { x: 0, y: 0 };
    this.resultTimer = 0;
    this.timeElapsed = 0;
    this.generateShip();
  }

  private generateShip(): void {
    const shipLeft = (CANVAS_W - SHIP_LENGTH * GRID_SIZE) / 2 + 40;
    const shipTop = CANVAS_H / 2 - 80;
    const shipWidth = SHIP_LENGTH * GRID_SIZE;
    const shipHeight = 160;

    this.shipBounds = {
      left: shipLeft,
      right: shipLeft + shipWidth,
      top: shipTop,
      bottom: shipTop + shipHeight
    };

    const wallThickness = 8;

    this.shipSections.push({
      x: shipLeft,
      y: shipTop,
      w: shipWidth,
      h: wallThickness,
      shape: 'rect',
      falling: false,
      vy: 0,
      rotation: 0
    });

    this.shipSections.push({
      x: shipLeft,
      y: shipTop + shipHeight - wallThickness,
      w: shipWidth,
      h: wallThickness,
      shape: 'rect',
      falling: false,
      vy: 0,
      rotation: 0
    });

    this.shipSections.push({
      x: shipLeft,
      y: shipTop,
      w: wallThickness,
      h: shipHeight,
      shape: 'rect',
      falling: false,
      vy: 0,
      rotation: 0
    });

    this.shipSections.push({
      x: shipLeft + shipWidth - wallThickness,
      y: shipTop,
      w: wallThickness,
      h: shipHeight,
      shape: 'rect',
      falling: false,
      vy: 0,
      rotation: 0
    });

    this.shipSections.push({
      x: shipLeft + shipWidth - 32,
      y: shipTop - 16,
      w: 32,
      h: 16,
      shape: 'triangle',
      falling: false,
      vy: 0,
      rotation: 0
    });

    const roomCount = 4 + Math.floor(Math.random() * 3);
    const roomWidth = Math.floor((shipWidth - wallThickness * 2) / roomCount);

    for (let i = 1; i < roomCount; i++) {
      const wallX = shipLeft + wallThickness + i * roomWidth;
      this.shipSections.push({
        x: wallX,
        y: shipTop,
        w: wallThickness,
        h: shipHeight - wallThickness - 32,
        shape: 'rect',
        falling: false,
        vy: 0,
        rotation: 0
      });
    }

    for (let r = 0; r < roomCount; r++) {
      const roomLeft = shipLeft + wallThickness + r * roomWidth + wallThickness;
      const artifactsInRoom = 1 + Math.floor(Math.random() * 3);
      for (let a = 0; a < artifactsInRoom; a++) {
        const ax = roomLeft + Math.random() * (roomWidth - wallThickness * 2 - 16);
        const ay = shipTop + wallThickness + 16 + Math.random() * (shipHeight - wallThickness * 2 - 48);
        if (this.artifacts.length < MAX_ENTITIES) {
          this.artifacts.push({
            x: ax,
            y: ay,
            collected: false,
            flashPhase: Math.random() * Math.PI * 2,
            fadeOut: 0
          });
        }
      }
    }

    for (let i = 0; i < 12; i++) {
      const isTop = i < 6;
      const cx = shipLeft + 20 + Math.random() * (shipWidth - 40);
      const cy = isTop ? shipTop - 6 : shipTop + shipHeight + 6;
      const isGreen = Math.random() > 0.5;
      this.seaCreatures.push({
        x: cx,
        y: cy,
        color: isGreen ? '#2ECC71' : '#ECF0F1',
        size: isGreen ? 4 + Math.random() * 3 : 3 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        isTop
      });
    }

    for (let i = 0; i < 8; i++) {
      const dx = shipLeft - 40 + Math.random() * (shipWidth + 80);
      const dy = shipTop - 30 + Math.random() * (shipHeight + 60);
      const points: { x: number; y: number }[] = [];
      const sides = 3 + Math.floor(Math.random() * 3);
      for (let p = 0; p < sides; p++) {
        const angle = (p / sides) * Math.PI * 2;
        const r = 4 + Math.random() * 8;
        points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      }
      this.debris.push({
        x: dx,
        y: dy,
        points,
        falling: false,
        vy: 0,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.05
      });
    }

    this.exit = {
      x: shipLeft + shipWidth - 16,
      y: shipTop + shipHeight / 2 - 32,
      w: 32,
      h: 64,
      blinkPhase: 0
    };
  }

  private spawnEnemy(): void {
    if (this.enemies.length >= MAX_ENTITIES - this.artifacts.length) return;
    const shipLeft = this.shipBounds.left + 16;
    const shipRight = this.shipBounds.right - 16;
    const shipTop = this.shipBounds.top + 16;
    const shipBottom = this.shipBounds.bottom - 16;
    const ex = shipLeft + Math.random() * (shipRight - shipLeft);
    const ey = shipTop + Math.random() * (shipBottom - shipTop);
    const dx = Math.random() - 0.5;
    const dy = Math.random() - 0.5;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    this.enemies.push({
      x: ex,
      y: ey,
      vx: (dx / len) * ENEMY_SPEED,
      vy: (dy / len) * ENEMY_SPEED,
      speed: ENEMY_SPEED,
      changeTimer: 60 + Math.random() * 60
    });
  }

  public update(input: InputState, spaceJustPressed: boolean, dt: number): void {
    if (this.state === 'TITLE') {
      if (spaceJustPressed) {
        this.resetGame();
        this.state = 'PLAYING';
      }
      return;
    }

    if (this.state === 'WIN' || this.state === 'LOSE') {
      this.resultTimer += dt;
      if (this.resultTimer >= 3) {
        this.state = 'TITLE';
      }
      return;
    }

    this.timeElapsed += dt;

    this.updatePlayer(input, spaceJustPressed, dt);
    this.updateArtifacts(dt);
    this.updateSeaCreatures(dt);
    this.updateDebris(dt);
    this.updateExit(dt);
    this.updateParticles(dt);

    if (this.countdownActive) {
      this.countdown -= dt;
      this.shakeOffset.x = (Math.random() - 0.5) * 2;
      this.shakeOffset.y = (Math.random() - 0.5) * 2;
      this.updateEnemies(dt);
      this.updateShipFalling(dt);
      if (Math.random() < 0.01) {
        this.spawnEnemy();
      }
      if (this.countdown <= 0) {
        this.state = 'LOSE';
      }
    }

    this.checkCollisions();

    if (this.countdownActive) {
      if (this.player.x > this.exit.x &&
          this.player.x < this.exit.x + this.exit.w &&
          this.player.y > this.exit.y &&
          this.player.y < this.exit.y + this.exit.h) {
        this.state = 'WIN';
      }
    }
  }

  private updatePlayer(input: InputState, spaceJustPressed: boolean, _dt: number): void {
    if (input.left) {
      this.player.angle -= ROTATION_SPEED;
    }
    if (input.right) {
      this.player.angle += ROTATION_SPEED;
    }

    let moveSpeed = 0;
    if (input.forward) {
      moveSpeed = this.player.speed;
    } else if (input.backward) {
      moveSpeed = -this.player.speed * 0.5;
    }

    this.player.vx = Math.cos(this.player.angle) * moveSpeed;
    this.player.vy = Math.sin(this.player.angle) * moveSpeed;

    let newX = this.player.x + this.player.vx;
    let newY = this.player.y + this.player.vy;

    newX = Math.max(8, Math.min(CANVAS_W - 8, newX));
    newY = Math.max(8, Math.min(CANVAS_H - 8, newY));

    const collided = this.checkShipCollision(newX, newY);
    if (collided) {
      this.player.flashTimer = 0.1;
      this.player.x -= this.player.vx * 0.5;
      this.player.y -= this.player.vy * 0.5;
    } else {
      this.player.x = newX;
      this.player.y = newY;
    }

    if (this.player.flashTimer > 0) {
      this.player.flashTimer -= 1 / 60;
    }

    if (spaceJustPressed) {
      this.player.spotlightOn = !this.player.spotlightOn;
    }

    if (moveSpeed !== 0 && this.particles.length < MAX_PARTICLES) {
      const backAngle = this.player.angle + Math.PI;
      this.particles.push({
        x: this.player.x + Math.cos(backAngle) * 5,
        y: this.player.y + Math.sin(backAngle) * 5,
        vx: Math.cos(backAngle) * 0.3 + (Math.random() - 0.5) * 0.5,
        vy: Math.sin(backAngle) * 0.3 - 0.5 + (Math.random() - 0.5) * 0.5,
        life: 30,
        maxLife: 30,
        color: '#FFFFFF',
        size: 2
      });
    }
  }

  private checkShipCollision(px: number, py: number): boolean {
    for (const section of this.shipSections) {
      if (section.falling) continue;
      if (section.shape === 'rect') {
        if (px > section.x - 4 && px < section.x + section.w + 4 &&
            py > section.y - 4 && py < section.y + section.h + 4) {
          return true;
        }
      }
    }
    return false;
  }

  private updateArtifacts(dt: number): void {
    for (const artifact of this.artifacts) {
      artifact.flashPhase += dt * 5;
      if (artifact.collected && artifact.fadeOut > 0) {
        artifact.fadeOut -= dt * 5;
      }
      if (!artifact.collected) {
        const dx = this.player.x - artifact.x;
        const dy = this.player.y - artifact.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < PICKUP_DISTANCE) {
          artifact.collected = true;
          artifact.fadeOut = 1;
          this.collectedCount++;
          for (let i = 0; i < 10 && this.particles.length < MAX_PARTICLES; i++) {
            this.particles.push({
              x: artifact.x,
              y: artifact.y,
              vx: (Math.random() - 0.5) * 2,
              vy: (Math.random() - 0.5) * 2,
              life: 20,
              maxLife: 20,
              color: '#FFD700',
              size: 2
            });
          }
          if (this.collectedCount >= 2 && !this.countdownActive) {
            this.countdownActive = true;
            this.spawnEnemy();
            this.spawnEnemy();
          }
        }
      }
    }
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      enemy.x += enemy.vx;
      enemy.y += enemy.vy;
      enemy.changeTimer -= 1;

      if (enemy.changeTimer <= 0) {
        const dx = Math.random() - 0.5;
        const dy = Math.random() - 0.5;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        enemy.vx = (dx / len) * enemy.speed;
        enemy.vy = (dy / len) * enemy.speed;
        enemy.changeTimer = 60 + Math.random() * 60;
      }

      if (enemy.x < this.shipBounds.left + 8 || enemy.x > this.shipBounds.right - 8) {
        enemy.vx *= -1;
        enemy.x = Math.max(this.shipBounds.left + 8, Math.min(this.shipBounds.right - 8, enemy.x));
      }
      if (enemy.y < this.shipBounds.top + 8 || enemy.y > this.shipBounds.bottom - 8) {
        enemy.vy *= -1;
        enemy.y = Math.max(this.shipBounds.top + 8, Math.min(this.shipBounds.bottom - 8, enemy.y));
      }
    }
    void dt;
  }

  private updateSeaCreatures(dt: number): void {
    for (const creature of this.seaCreatures) {
      creature.phase += dt * 2;
    }
  }

  private updateDebris(dt: number): void {
    for (const d of this.debris) {
      if (d.falling) {
        d.vy += 0.05;
        d.y += d.vy;
        d.rotation += d.rotSpeed;
      } else {
        d.rotation += d.rotSpeed * 0.2;
      }
    }
    void dt;
  }

  private updateShipFalling(dt: number): void {
    if (Math.random() < 0.005) {
      for (const section of this.shipSections) {
        if (!section.falling && section.shape === 'rect' && section.w < 64 && Math.random() < 0.3) {
          section.falling = true;
          section.vy = 0.5;
          break;
        }
      }
    }
    if (Math.random() < 0.01) {
      for (const d of this.debris) {
        if (!d.falling && Math.random() < 0.5) {
          d.falling = true;
          break;
        }
      }
    }
    void dt;
  }

  private updateExit(dt: number): void {
    this.exit.blinkPhase += dt * 4;
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
    void dt;
  }

  private checkCollisions(): void {
    if (!this.countdownActive) return;
    for (const enemy of this.enemies) {
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) {
        this.state = 'LOSE';
        return;
      }
    }
  }
}
