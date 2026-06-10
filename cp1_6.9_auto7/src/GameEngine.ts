export type TileType = 'floor' | 'wall' | 'entrance' | 'exit';
export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Position {
  x: number;
  y: number;
}

export interface Spike {
  id: number;
  pos: Position;
  dir: Direction;
  active: boolean;
}

export interface Flamethrower {
  id: number;
  pos: Position;
  angle: number;
}

export interface Coin {
  id: number;
  pos: Position;
  collected: boolean;
}

export interface KeyItem {
  id: number;
  pos: Position;
  collected: boolean;
}

export interface Door {
  id: number;
  pos: Position;
  open: boolean;
}

export interface GameState {
  grid: TileType[][];
  player: Position;
  playerRenderPos: { x: number; y: number };
  playerMoving: boolean;
  moveProgress: number;
  moveFrom: Position;
  moveTo: Position;
  gold: number;
  keys: number;
  life: number;
  time: number;
  coins: Coin[];
  keyItems: KeyItem[];
  doors: Door[];
  spikes: Spike[];
  flamethrowers: Flamethrower[];
  exitUnlocked: boolean;
  gameOver: boolean;
  victory: boolean;
  started: boolean;
}

export type GameEvent =
  | { type: 'goldChange'; value: number }
  | { type: 'keyChange'; value: number }
  | { type: 'lifeChange'; value: number }
  | { type: 'timeUpdate'; value: number }
  | { type: 'damage' }
  | { type: 'victory'; time: number; gold: number; life: number }
  | { type: 'gameover'; time: number; gold: number }
  | { type: 'exitUnlocked' }
  | { type: 'doorOpened'; doorId: number }
  | { type: 'mapGenerated' };

type Listener = (event: GameEvent) => void;

export const GRID_SIZE = 10;
export const MOVE_DURATION = 200;
export const TOTAL_COINS = 10;
export const TOTAL_KEYS = 3;
export const TOTAL_DOORS = 2;
export const TOTAL_SPIKES = 4;
export const TOTAL_FLAMETHROWERS = 2;
export const INITIAL_LIFE = 3;
export const FLAME_DAMAGE_INTERVAL = 1000;

export class GameEngine {
  public state: GameState;
  private listeners: Set<Listener> = new Set();
  private lastTime: number = 0;
  private startTime: number = 0;
  private spikeTimer: number = 0;
  private playerInFlameSince: number = 0;
  private damagedByFlame: boolean = false;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      grid: [],
      player: { x: 0, y: 0 },
      playerRenderPos: { x: 0, y: 0 },
      playerMoving: false,
      moveProgress: 0,
      moveFrom: { x: 0, y: 0 },
      moveTo: { x: 0, y: 0 },
      gold: 0,
      keys: 0,
      life: INITIAL_LIFE,
      time: 0,
      coins: [],
      keyItems: [],
      doors: [],
      spikes: [],
      flamethrowers: [],
      exitUnlocked: false,
      gameOver: false,
      victory: false,
      started: false
    };
  }

  public on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: GameEvent): void {
    for (const l of this.listeners) l(event);
  }

  public startNewGame(): void {
    this.state = this.createInitialState();
    this.generateMap();
    this.startTime = performance.now();
    this.lastTime = this.startTime;
    this.spikeTimer = 0;
    this.playerInFlameSince = 0;
    this.damagedByFlame = false;
    this.state.started = true;
    this.emit({ type: 'mapGenerated' });
    this.emit({ type: 'goldChange', value: 0 });
    this.emit({ type: 'keyChange', value: 0 });
    this.emit({ type: 'lifeChange', value: INITIAL_LIFE });
    this.emit({ type: 'timeUpdate', value: 0 });
  }

  private generateMap(): void {
    const layoutIdx = Math.floor(Math.random() * 3);
    this.generateLayout(layoutIdx);
  }

  private generateLayout(layout: number): void {
    const grid: TileType[][] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      grid[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        grid[y][x] = 'floor';
      }
    }

    if (layout === 0) {
      for (let x = 0; x < GRID_SIZE; x++) {
        grid[3][x] = 'wall';
        grid[6][x] = 'wall';
      }
      grid[3][2] = 'floor';
      grid[3][7] = 'floor';
      grid[6][1] = 'floor';
      grid[6][5] = 'floor';
      grid[6][8] = 'floor';
    } else if (layout === 1) {
      for (let y = 0; y < GRID_SIZE; y++) {
        grid[y][4] = 'wall';
        grid[y][7] = 'wall';
      }
      grid[1][4] = 'floor';
      grid[4][4] = 'floor';
      grid[7][4] = 'floor';
      grid[2][7] = 'floor';
      grid[5][7] = 'floor';
      grid[8][7] = 'floor';
    } else {
      for (let i = 0; i < GRID_SIZE; i++) {
        if (i !== 1 && i !== 8) grid[i][i] = 'wall';
        if (i !== 0 && i !== 9) grid[GRID_SIZE - 1 - i][i] = 'wall';
      }
      grid[4][4] = 'floor';
      grid[5][5] = 'floor';
    }

    grid[0][0] = 'entrance';
    grid[GRID_SIZE - 1][GRID_SIZE - 1] = 'exit';
    this.state.grid = grid;
    this.state.player = { x: 0, y: 0 };
    this.state.playerRenderPos = { x: 0, y: 0 };

    const floorCells: Position[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (grid[y][x] === 'floor' && !(x === 0 && y === 0) && !(x === GRID_SIZE - 1 && y === GRID_SIZE - 1)) {
          floorCells.push({ x, y });
        }
      }
    }

    this.shuffle(floorCells);

    let idx = 0;
    this.state.coins = [];
    for (let i = 0; i < TOTAL_COINS && idx < floorCells.length; i++, idx++) {
      this.state.coins.push({ id: i, pos: { ...floorCells[idx] }, collected: false });
    }

    this.state.keyItems = [];
    for (let i = 0; i < TOTAL_KEYS && idx < floorCells.length; i++, idx++) {
      this.state.keyItems.push({ id: i, pos: { ...floorCells[idx] }, collected: false });
    }

    this.state.doors = [];
    for (let i = 0; i < TOTAL_DOORS && idx < floorCells.length; i++, idx++) {
      this.state.doors.push({ id: i, pos: { ...floorCells[idx] }, open: false });
    }

    this.state.spikes = [];
    const dirs: Direction[] = ['up', 'down', 'left', 'right'];
    for (let i = 0; i < TOTAL_SPIKES && idx < floorCells.length; i++, idx++) {
      this.state.spikes.push({
        id: i,
        pos: { ...floorCells[idx] },
        dir: dirs[Math.floor(Math.random() * 4)],
        active: true
      });
    }

    this.state.flamethrowers = [];
    for (let i = 0; i < TOTAL_FLAMETHROWERS && idx < floorCells.length; i++, idx++) {
      this.state.flamethrowers.push({
        id: i,
        pos: { ...floorCells[idx] },
        angle: Math.random() * Math.PI * 2
      });
    }
  }

  private shuffle<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  public tryMove(dir: Direction): void {
    if (this.state.gameOver || this.state.victory || this.state.playerMoving || !this.state.started) return;

    const { x, y } = this.state.player;
    let nx = x, ny = y;
    if (dir === 'up') ny--;
    else if (dir === 'down') ny++;
    else if (dir === 'left') nx--;
    else if (dir === 'right') nx++;

    if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) return;
    if (this.state.grid[ny][nx] === 'wall') return;

    const door = this.state.doors.find(d => d.pos.x === nx && d.pos.y === ny && !d.open);
    if (door) {
      if (this.state.keys > 0) {
        this.state.keys--;
        door.open = true;
        this.emit({ type: 'keyChange', value: this.state.keys });
        this.emit({ type: 'doorOpened', doorId: door.id });
      } else {
        return;
      }
    }

    if (this.state.grid[ny][nx] === 'exit' && !this.state.exitUnlocked) {
      return;
    }

    this.state.playerMoving = true;
    this.state.moveProgress = 0;
    this.state.moveFrom = { x, y };
    this.state.moveTo = { x: nx, y: ny };
    this.damagedByFlame = false;
  }

  public update(now: number): void {
    if (!this.state.started || this.state.gameOver || this.state.victory) return;

    const dt = now - this.lastTime;
    this.lastTime = now;
    this.state.time = Math.floor(now - this.startTime);
    this.emit({ type: 'timeUpdate', value: this.state.time });

    if (this.state.playerMoving) {
      this.state.moveProgress += dt / MOVE_DURATION;
      if (this.state.moveProgress >= 1) {
        this.state.moveProgress = 1;
        this.state.player = { ...this.state.moveTo };
        this.state.playerRenderPos = { x: this.state.player.x, y: this.state.player.y };
        this.state.playerMoving = false;
        this.onPlayerArrived();
      } else {
        const t = this.state.moveProgress;
        this.state.playerRenderPos.x = this.state.moveFrom.x + (this.state.moveTo.x - this.state.moveFrom.x) * t;
        this.state.playerRenderPos.y = this.state.moveFrom.y + (this.state.moveTo.y - this.state.moveFrom.y) * t;
      }
    }

    this.spikeTimer += dt;
    if (this.spikeTimer >= 800) {
      this.spikeTimer = 0;
      this.moveSpikes();
    }

    for (const f of this.state.flamethrowers) {
      f.angle += dt * 0.002;
    }

    const onFlame = this.isPlayerOnFlame();
    if (onFlame) {
      if (this.playerInFlameSince === 0) {
        this.playerInFlameSince = now;
      }
      if (now - this.playerInFlameSince >= FLAME_DAMAGE_INTERVAL && !this.damagedByFlame) {
        this.takeDamage();
        this.damagedByFlame = true;
        this.playerInFlameSince = now;
      }
    } else {
      this.playerInFlameSince = 0;
      this.damagedByFlame = false;
    }
  }

  private moveSpikes(): void {
    const dirs: Direction[] = ['up', 'down', 'left', 'right'];
    for (const spike of this.state.spikes) {
      let nx = spike.pos.x;
      let ny = spike.pos.y;
      if (spike.dir === 'up') ny--;
      else if (spike.dir === 'down') ny++;
      else if (spike.dir === 'left') nx--;
      else if (spike.dir === 'right') nx++;

      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE || this.state.grid[ny][nx] === 'wall') {
        const newDirs = dirs.filter(d => d !== spike.dir);
        spike.dir = newDirs[Math.floor(Math.random() * newDirs.length)];
      } else {
        spike.pos = { x: nx, y: ny };
      }
    }

    if (this.isPlayerOnSpike() && !this.state.playerMoving) {
      this.takeDamage();
    }
  }

  private isPlayerOnSpike(): boolean {
    return this.state.spikes.some(
      s => s.pos.x === this.state.player.x && s.pos.y === this.state.player.y && s.active
    );
  }

  private isPlayerOnFlame(): boolean {
    return this.state.flamethrowers.some(
      f => f.pos.x === this.state.player.x && f.pos.y === this.state.player.y
    );
  }

  private onPlayerArrived(): void {
    const { x, y } = this.state.player;

    for (const coin of this.state.coins) {
      if (!coin.collected && coin.pos.x === x && coin.pos.y === y) {
        coin.collected = true;
        this.state.gold++;
        this.emit({ type: 'goldChange', value: this.state.gold });
        if (this.state.gold >= TOTAL_COINS && !this.state.exitUnlocked) {
          this.state.exitUnlocked = true;
          this.emit({ type: 'exitUnlocked' });
        }
      }
    }

    for (const key of this.state.keyItems) {
      if (!key.collected && key.pos.x === x && key.pos.y === y) {
        key.collected = true;
        this.state.keys++;
        this.emit({ type: 'keyChange', value: this.state.keys });
      }
    }

    if (this.isPlayerOnSpike()) {
      this.takeDamage();
    }

    if (this.state.grid[y][x] === 'exit' && this.state.exitUnlocked) {
      this.state.victory = true;
      this.emit({
        type: 'victory',
        time: this.state.time,
        gold: this.state.gold,
        life: this.state.life
      });
    }
  }

  private takeDamage(): void {
    if (this.state.gameOver || this.state.victory) return;
    this.state.life--;
    this.emit({ type: 'lifeChange', value: this.state.life });
    this.emit({ type: 'damage' });
    if (this.state.life <= 0) {
      this.state.gameOver = true;
      this.emit({
        type: 'gameover',
        time: this.state.time,
        gold: this.state.gold
      });
    }
  }

  public getBounceOffset(_now: number): number {
    if (!this.state.playerMoving) return 0;
    const t = this.state.moveProgress;
    return Math.sin(t * Math.PI) * 8;
  }
}
