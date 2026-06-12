type Listener = (...args: any[]) => void;

class EventEmitter {
  private events: Map<string, Listener[]> = new Map();

  public on(event: string, listener: Listener): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
    return () => this.off(event, listener);
  }

  public off(event: string, listener: Listener): void {
    const listeners = this.events.get(event);
    if (!listeners) return;
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  }

  public emit(event: string, ...args: any[]): void {
    const listeners = this.events.get(event);
    if (!listeners) return;
    for (const fn of [...listeners]) {
      fn(...args);
    }
  }
}

export interface PlayerMoveMessage {
  playerId: string;
  x: number;
  y: number;
  direction: string;
  timestamp: number;
}

export interface ScoreUpdateMessage {
  playerId: string;
  trailLength: number;
  areaScore: number;
  totalScore: number;
}

export interface GameStateMessage {
  type: 'countdown' | 'start' | 'end';
  payload?: any;
}

export class NetworkSimulator extends EventEmitter {
  private static instance: NetworkSimulator | null = null;

  private constructor() {
    super();
  }

  public static getInstance(): NetworkSimulator {
    if (!NetworkSimulator.instance) {
      NetworkSimulator.instance = new NetworkSimulator();
    }
    return NetworkSimulator.instance;
  }

  public broadcastMove(msg: PlayerMoveMessage): void {
    this.emit('player:move', msg);
  }

  public broadcastScore(msg: ScoreUpdateMessage): void {
    this.emit('player:score', msg);
  }

  public broadcastGameState(msg: GameStateMessage): void {
    this.emit('game:state', msg);
  }

  public broadcastTrailUpdate(playerId: string, trail: { x: number; y: number }[]): void {
    this.emit('player:trail', { playerId, trail });
  }
}
