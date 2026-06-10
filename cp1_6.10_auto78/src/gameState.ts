import * as THREE from 'three';

export type GameStatus = 'ready' | 'playing' | 'gameover';

export interface ScoreZone {
  id: number;
  position: THREE.Vector3;
  color: string;
  value: number;
  type: 'green' | 'blue' | 'gold';
  triggered: boolean;
  lastTriggerTime: number;
}

export interface GameStateData {
  score: number;
  lives: number;
  combo: number;
  lastZoneType: string | null;
  status: GameStatus;
  ballPosition: THREE.Vector3;
  ballVelocity: THREE.Vector3;
  paddleX: number;
}

type Listener = (state: GameStateData) => void;

class GameState {
  private state: GameStateData;
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.state = {
      score: 0,
      lives: 3,
      combo: 0,
      lastZoneType: null,
      status: 'ready',
      ballPosition: new THREE.Vector3(0, 3, 0),
      ballVelocity: new THREE.Vector3(0, 0, 0),
      paddleX: 0,
    };
  }

  get(): GameStateData {
    return { ...this.state };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l(this.get()));
  }

  setStatus(status: GameStatus): void {
    this.state.status = status;
    this.notify();
  }

  addScore(baseValue: number, zoneType: string): void {
    if (this.state.lastZoneType !== null && this.state.lastZoneType !== zoneType) {
      this.state.combo = Math.min(this.state.combo + 1, 4);
    } else if (this.state.lastZoneType === null) {
      this.state.combo = 1;
    }
    const multiplier = Math.pow(1.5, this.state.combo - 1);
    this.state.score += Math.floor(baseValue * multiplier);
    this.state.lastZoneType = zoneType;
    this.notify();
  }

  resetCombo(): void {
    this.state.combo = 0;
    this.state.lastZoneType = null;
    this.notify();
  }

  loseLife(): void {
    this.state.lives = Math.max(0, this.state.lives - 1);
    this.state.combo = 0;
    this.state.lastZoneType = null;
    if (this.state.lives <= 0) {
      this.state.status = 'gameover';
    }
    this.notify();
  }

  setBallPosition(pos: THREE.Vector3): void {
    this.state.ballPosition.copy(pos);
  }

  setBallVelocity(vel: THREE.Vector3): void {
    this.state.ballVelocity.copy(vel);
  }

  setPaddleX(x: number): void {
    this.state.paddleX = x;
  }

  reset(): void {
    this.state.score = 0;
    this.state.lives = 3;
    this.state.combo = 0;
    this.state.lastZoneType = null;
    this.state.status = 'ready';
    this.state.ballPosition.set(0, 3, 0);
    this.state.ballVelocity.set(0, 0, 0);
    this.state.paddleX = 0;
    this.notify();
  }
}

export const gameState = new GameState();
