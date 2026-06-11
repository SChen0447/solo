import { PlayerState, Vector2, PLAYER_SPEED, TILE_SIZE } from './types';
import { checkCollision, clamp, lightToColor, distance } from './utils';
import { ParticleSystem } from './particles';

export class Player {
  private state: PlayerState;
  private actionPressed: boolean;
  private lastActionTime: number;
  private trailTimer: number;

  constructor() {
    this.state = {
      position: { x: TILE_SIZE * 2, y: TILE_SIZE * 2 },
      lightAmount: 0,
      maxLight: 10,
      isAbsorbing: false,
      isReleasing: false,
      velocity: { x: 0, y: 0 }
    };
    this.actionPressed = false;
    this.lastActionTime = 0;
    this.trailTimer = 0;
  }

  init(startPosition: Vector2): void {
    this.state.position = { ...startPosition };
    this.state.lightAmount = 0;
    this.state.isAbsorbing = false;
    this.state.isReleasing = false;
    this.state.velocity = { x: 0, y: 0 };
  }

  update(
    dt: number,
    moveDir: Vector2,
    actionPressed: boolean,
    tiles: number[][],
    particles: ParticleSystem,
    currentTime: number
  ): { absorbed: boolean; released: boolean } {
    const result = { absorbed: false, released: false };

    this.state.velocity.x = moveDir.x * PLAYER_SPEED;
    this.state.velocity.y = moveDir.y * PLAYER_SPEED;

    const newX = this.state.position.x + this.state.velocity.x * dt;
    const newY = this.state.position.y + this.state.velocity.y * dt;

    if (!checkCollision({ x: newX, y: this.state.position.y }, tiles)) {
      this.state.position.x = newX;
    }
    if (!checkCollision({ x: this.state.position.x, y: newY }, tiles)) {
      this.state.position.y = newY;
    }

    const margin = 12;
    this.state.position.x = clamp(this.state.position.x, margin, tiles[0].length * TILE_SIZE - margin);
    this.state.position.y = clamp(this.state.position.y, margin, tiles.length * TILE_SIZE - margin);

    if (moveDir.x !== 0 || moveDir.y !== 0) {
      this.trailTimer += dt;
      if (this.trailTimer >= 0.03) {
        this.trailTimer = 0;
        const color = lightToColor(this.state.lightAmount, this.state.maxLight);
        particles.emitTrail(this.state.position, color);
      }
    }

    this.state.isAbsorbing = false;
    this.state.isReleasing = false;

    if (actionPressed && !this.actionPressed && currentTime - this.lastActionTime > 200) {
      this.lastActionTime = currentTime;

      if (this.state.lightAmount > 0) {
        this.state.isReleasing = true;
        result.released = true;
        const color = lightToColor(this.state.lightAmount, this.state.maxLight);
        particles.emitRelease(this.state.position, color);
      } else {
        this.state.isAbsorbing = true;
        result.absorbed = true;
      }
    }

    this.actionPressed = actionPressed;

    return result;
  }

  absorbLight(amount: number, fromPosition: Vector2, particles: ParticleSystem): void {
    const actualAmount = Math.min(amount, this.state.maxLight - this.state.lightAmount);
    this.state.lightAmount += actualAmount;

    for (let i = 0; i < 5; i++) {
      const offsetX = (Math.random() - 0.5) * 30;
      const offsetY = (Math.random() - 0.5) * 30;
      particles.emitAbsorb(
        { x: fromPosition.x + offsetX, y: fromPosition.y + offsetY },
        this.state.position,
        '#FFD700'
      );
    }
  }

  releaseLight(amount: number): number {
    const actualAmount = Math.min(amount, this.state.lightAmount);
    this.state.lightAmount -= actualAmount;
    return actualAmount;
  }

  addLight(amount: number): void {
    this.state.lightAmount = clamp(this.state.lightAmount + amount, 0, this.state.maxLight);
  }

  removeLight(amount: number): void {
    this.state.lightAmount = clamp(this.state.lightAmount - amount, 0, this.state.maxLight);
  }

  getState(): PlayerState {
    return { ...this.state };
  }

  getPosition(): Vector2 {
    return { ...this.state.position };
  }

  getLightAmount(): number {
    return this.state.lightAmount;
  }

  getMaxLight(): number {
    return this.state.maxLight;
  }

  getColor(): string {
    return lightToColor(this.state.lightAmount, this.state.maxLight);
  }

  findNearbyStele(steles: Array<{ position: Vector2; lightRemaining: number }>): { index: number; distance: number } | null {
    let nearest: { index: number; distance: number } | null = null;

    for (let i = 0; i < steles.length; i++) {
      const dist = distance(this.state.position, steles[i].position);
      if (dist < TILE_SIZE * 1.5) {
        if (!nearest || dist < nearest.distance) {
          nearest = { index: i, distance: dist };
        }
      }
    }

    return nearest;
  }
}
