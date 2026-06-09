import { Pole, PlayerState, Vector2, GAME_CONFIG } from './types';

export class Player {
  private state: PlayerState;
  private keys: Set<string> = new Set();
  private poleCooldownTimer: number = 0;

  constructor(startPosition: Vector2) {
    this.state = {
      position: { ...startPosition },
      velocity: { x: 0, y: 0 },
      pole: 'N',
      poleCooldown: 0,
      onGround: false,
      facing: 0,
    };
  }

  handleKeyDown(key: string): void {
    this.keys.add(key.toLowerCase());
    if (key === ' ') {
      this.tryTogglePole();
    }
  }

  handleKeyUp(key: string): void {
    this.keys.delete(key.toLowerCase());
  }

  private tryTogglePole(): void {
    if (this.poleCooldownTimer <= 0) {
      this.state.pole = this.state.pole === 'N' ? 'S' : 'N';
      this.poleCooldownTimer = GAME_CONFIG.POLE_COOLDOWN;
      this.state.poleCooldown = 1;
    }
  }

  update(deltaTime: number, gravity: number): void {
    const dt = deltaTime;

    if (this.poleCooldownTimer > 0) {
      this.poleCooldownTimer -= dt;
      if (this.poleCooldownTimer < 0) this.poleCooldownTimer = 0;
      this.state.poleCooldown = this.poleCooldownTimer / GAME_CONFIG.POLE_COOLDOWN;
    }

    let moveX = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) {
      moveX -= 1;
    }
    if (this.keys.has('d') || this.keys.has('arrowright')) {
      moveX += 1;
    }

    this.state.velocity.x = moveX * GAME_CONFIG.PLAYER_SPEED;

    if (moveX !== 0) {
      this.state.facing = moveX;
    }

    if ((this.keys.has('w') || this.keys.has('arrowup')) && this.state.onGround) {
      this.state.velocity.y = GAME_CONFIG.JUMP_VELOCITY;
      this.state.onGround = false;
    }

    this.state.velocity.y += gravity * dt;

    if (Math.abs(this.state.velocity.x) < 1) this.state.velocity.x = 0;
    if (Math.abs(this.state.velocity.y) < 1) this.state.velocity.y = 0;
  }

  getState(): Readonly<PlayerState> {
    return this.state;
  }

  setPosition(pos: Vector2): void {
    this.state.position = { ...pos };
  }

  setVelocity(vel: Vector2): void {
    this.state.velocity = { ...vel };
  }

  setOnGround(onGround: boolean): void {
    this.state.onGround = onGround;
  }

  reset(startPosition: Vector2): void {
    this.state.position = { ...startPosition };
    this.state.velocity = { x: 0, y: 0 };
    this.state.pole = 'N';
    this.state.poleCooldown = 0;
    this.state.onGround = false;
    this.state.facing = 0;
    this.poleCooldownTimer = 0;
    this.keys.clear();
  }

  getPole(): Pole {
    return this.state.pole;
  }

  getPoleCooldown(): number {
    return this.state.poleCooldown;
  }
}
