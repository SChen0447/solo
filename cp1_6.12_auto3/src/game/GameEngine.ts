import { Player, Direction, PlayerConfig } from './Player';
import { NetworkSimulator, ScoreUpdateMessage } from './NetworkSimulator';

export type GameStatus = 'idle' | 'countdown' | 'playing' | 'ended';

export interface PlayerResult {
  id: string;
  name: string;
  color: string;
  trailLength: number;
  areaScore: number;
  totalScore: number;
  rank: number;
}

export const PLAYER_PRESETS: PlayerConfig[] = [
  {
    id: 'p1',
    name: '红方玩家',
    color: '#ef4444',
    startX: 0,
    startY: 0,
    controls: {
      up: ['w', 'W'],
      down: ['s', 'S'],
      left: ['a', 'A'],
      right: ['d', 'D']
    }
  },
  {
    id: 'p2',
    name: '蓝方玩家',
    color: '#3b82f6',
    startX: 0,
    startY: 0,
    controls: {
      up: ['ArrowUp'],
      down: ['ArrowDown'],
      left: ['ArrowLeft'],
      right: ['ArrowRight']
    }
  },
  {
    id: 'p3',
    name: '绿方玩家',
    color: '#22c55e',
    startX: 0,
    startY: 0,
    controls: {
      up: ['i', 'I'],
      down: ['k', 'K'],
      left: ['j', 'J'],
      right: ['l', 'L']
    }
  },
  {
    id: 'p4',
    name: '紫方玩家',
    color: '#a855f7',
    startX: 0,
    startY: 0,
    controls: {
      up: ['8', 'Numpad8'],
      down: ['5', 'Numpad5', '2', 'Numpad2'],
      left: ['4', 'Numpad4'],
      right: ['6', 'Numpad6']
    }
  }
];

export class GameEngine {
  public readonly GAME_DURATION = 30;
  public readonly TARGET_FPS = 60;

  private players: Map<string, Player> = new Map();
  private status: GameStatus = 'idle';
  private timeRemaining: number = this.GAME_DURATION;

  private canvasWidth: number = 800;
  private canvasHeight: number = 600;

  private rafId: number | null = null;
  private lastFrameTime: number = 0;
  private lastSecondTime: number = 0;
  private readonly frameInterval: number = 1000 / this.TARGET_FPS;

  private network: NetworkSimulator;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  public onTick?: () => void;
  public onSecond?: (remaining: number) => void;
  public onGameEnd?: (results: PlayerResult[]) => void;
  public onStatusChange?: (status: GameStatus) => void;

  constructor() {
    this.network = NetworkSimulator.getInstance();
  }

  public setCanvasSize(w: number, h: number): void {
    this.canvasWidth = w;
    this.canvasHeight = h;
  }

  public getPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  public getStatus(): GameStatus {
    return this.status;
  }

  public getTimeRemaining(): number {
    return this.timeRemaining;
  }

  public initPlayers(count: number): void {
    this.players.clear();
    const selected = PLAYER_PRESETS.slice(0, count);
    const positions = this.calcStartPositions(count);

    selected.forEach((cfg, idx) => {
      const config: PlayerConfig = {
        ...cfg,
        startX: positions[idx].x,
        startY: positions[idx].y
      };
      this.players.set(cfg.id, new Player(config));
    });

    this.bindKeyboard();
    this.emitAllScores();
  }

  private calcStartPositions(count: number): { x: number; y: number; dir: Direction }[] {
    const margin = 80;
    const w = this.canvasWidth;
    const h = this.canvasHeight;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) / 2 - margin;

    const positions: { x: number; y: number; dir: Direction }[] = [];
    const dirs: Direction[] = ['right', 'down', 'left', 'up'];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
      positions.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        dir: dirs[i % 4]
      });
    }
    return positions;
  }

  private bindKeyboard(): void {
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
    }
    this.keyHandler = (e: KeyboardEvent) => {
      if (this.status !== 'playing' && this.status !== 'countdown') return;
      const key = e.key;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(key)) {
        e.preventDefault();
      }
      for (const player of this.players.values()) {
        const c = player.controls;
        if (c.up.includes(key))    player.setDirection('up');
        if (c.down.includes(key))  player.setDirection('down');
        if (c.left.includes(key))  player.setDirection('left');
        if (c.right.includes(key)) player.setDirection('right');
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  public startGame(): void {
    this.resetRound();
    this.status = 'countdown';
    this.onStatusChange?.(this.status);
    this.network.broadcastGameState({ type: 'countdown' });

    let countdown = 3;
    this.timeRemaining = this.GAME_DURATION;

    const tickCountdown = () => {
      if (countdown <= 0) {
        this.status = 'playing';
        this.onStatusChange?.(this.status);
        this.network.broadcastGameState({ type: 'start' });
        this.lastFrameTime = performance.now();
        this.lastSecondTime = performance.now();
        this.loop();
        return;
      }
      countdown--;
      setTimeout(tickCountdown, 800);
    };
    tickCountdown();
  }

  private resetRound(): void {
    const positions = this.calcStartPositions(this.players.size);
    const dirs: Direction[] = ['right', 'down', 'left', 'up'];
    let idx = 0;
    for (const player of this.players.values()) {
      const p = positions[idx];
      player.reset(p.x, p.y, dirs[idx % 4]);
      idx++;
    }
    this.emitAllScores();
  }

  private loop = (): void => {
    if (this.status !== 'playing') return;

    const now = performance.now();
    const delta = now - this.lastFrameTime;

    if (delta >= this.frameInterval) {
      this.lastFrameTime = now - (delta % this.frameInterval);
      this.update();
      this.onTick?.();
    }

    if (now - this.lastSecondTime >= 1000) {
      this.lastSecondTime = now;
      this.timeRemaining = Math.max(0, this.timeRemaining - 1);
      this.onSecond?.(this.timeRemaining);
      if (this.timeRemaining <= 0) {
        this.endGame();
        return;
      }
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(): void {
    for (const player of this.players.values()) {
      player.update(this.canvasWidth, this.canvasHeight);
      this.network.broadcastMove({
        playerId: player.id,
        x: player.x,
        y: player.y,
        direction: player.direction,
        timestamp: performance.now()
      });
    }
    this.emitAllScores();
  }

  private emitAllScores(): void {
    for (const player of this.players.values()) {
      const msg: ScoreUpdateMessage = {
        playerId: player.id,
        trailLength: Math.floor(player.trailLength),
        areaScore: player.areaScore,
        totalScore: player.getTotalScore()
      };
      this.network.broadcastScore(msg);
    }
  }

  private endGame(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.status = 'ended';
    this.onStatusChange?.(this.status);
    this.network.broadcastGameState({ type: 'end' });
    this.emitAllScores();

    const results = this.calculateResults();
    this.onGameEnd?.(results);
  }

  public calculateResults(): PlayerResult[] {
    const list: PlayerResult[] = [];
    for (const p of this.players.values()) {
      list.push({
        id: p.id,
        name: p.name,
        color: p.color,
        trailLength: Math.floor(p.trailLength),
        areaScore: p.areaScore,
        totalScore: p.getTotalScore(),
        rank: 0
      });
    }
    list.sort((a, b) => b.totalScore - a.totalScore);
    list.forEach((r, i) => r.rank = i + 1);
    return list;
  }

  public restart(): void {
    this.startGame();
  }

  public destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    this.players.clear();
  }
}
