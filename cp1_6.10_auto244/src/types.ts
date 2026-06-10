export interface Vector2 {
  x: number;
  y: number;
}

export interface Projectile {
  id: number;
  pos: Vector2;
  vel: Vector2;
  radius: number;
  color: string;
  reflected: boolean;
  trail: Vector2[];
}

export interface Target {
  id: number;
  pos: Vector2;
  vel: Vector2;
  radius: number;
  blinkPhase: number;
}

export interface GameState {
  score: number;
  lives: number;
  isGameOver: boolean;
  isPaused: boolean;
}
