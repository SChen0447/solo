export type PlayerId = 1 | 2;
export type PieceType = 'scout' | 'engineer' | 'commander';
export type GamePhase = 'playing' | 'ended';

export interface Vec2 {
  x: number;
  y: number;
}

export interface PieceState {
  id: string;
  type: PieceType;
  owner: PlayerId;
  pos: Vec2;
  hp: number;
  maxHp: number;
  moveRange: number;
  movedThisTurn: boolean;
  attackedThisTurn: boolean;
  stunnedUntil: number;
  markedUntil: number;
  animating: boolean;
  animProgress: number;
  animFrom?: Vec2;
  animTo?: Vec2;
}

export interface CellState {
  elevation: number;
  baseElevation: number;
  surgeUntil: number;
  fortifyUntil: number;
  fortifyOwner?: PlayerId;
}

export interface SurgeEvent {
  pos: Vec2;
  startAt: number;
  endAt: number;
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

export interface GameState {
  board: CellState[][];
  pieces: PieceState[];
  currentPlayer: PlayerId;
  turnStartedAt: number;
  turnDuration: number;
  energy: Record<PlayerId, number>;
  phase: GamePhase;
  winner?: PlayerId;
  winReason?: string;
  coreCapturedBy?: PlayerId;
  coreCaptureStartedAt?: number;
  tideCycleStart: number;
  tideInterval: number;
  surges: SurgeEvent[];
  particles: Particle[];
  selectedPieceId?: string;
  pendingAction?: 'move' | 'attack' | 'flash' | 'fortify';
  hoveredCell?: Vec2;
  skillCooldowns: Record<string, number>;
}

export type EventHandler = (...args: any[]) => void;

export class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  on(event: string, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  off(event: string, handler: EventHandler): void {
    const list = this.handlers.get(event);
    if (list) {
      const idx = list.indexOf(handler);
      if (idx >= 0) list.splice(idx, 1);
    }
  }

  emit(event: string, ...args: any[]): void {
    const list = this.handlers.get(event);
    if (list) {
      list.forEach(h => {
        try { h(...args); } catch (e) { console.error(e); }
      });
    }
  }
}

export const BOARD_SIZE = 8;
export const CORE_POS: Vec2 = { x: 3.5, y: 3.5 };
export const TIDE_INTERVAL = 15000;
export const SURGE_DURATION = 3000;
export const TURN_DURATION = 15000;
export const CORE_CAPTURE_TIME = 3000;
export const FORTIFY_DURATION = 5000;
export const STUN_DURATION = 2000;
export const MARK_DURATION = 3000;

const PIECE_STATS: Record<PieceType, { hp: number; moveRange: number }> = {
  scout: { hp: 2, moveRange: 4 },
  engineer: { hp: 3, moveRange: 2 },
  commander: { hp: 5, moveRange: 3 },
};

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chebyshev(a: Vec2, b: Vec2): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export class GameCore {
  state: GameState;
  bus: EventBus;
  lastTime: number = 0;
  rafId: number = 0;
  running: boolean = false;

  constructor() {
    this.bus = new EventBus();
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const board: CellState[][] = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
      const row: CellState[] = [];
      for (let x = 0; x < BOARD_SIZE; x++) {
        const elev = randInt(0, 3);
        row.push({
          elevation: elev,
          baseElevation: elev,
          surgeUntil: 0,
          fortifyUntil: 0,
        });
      }
      board.push(row);
    }

    const pieces: PieceState[] = [];
    const p1Start: Vec2[] = [
      { x: 1, y: 7 }, { x: 3, y: 7 }, { x: 6, y: 7 },
    ];
    const p2Start: Vec2[] = [
      { x: 1, y: 0 }, { x: 4, y: 0 }, { x: 6, y: 0 },
    ];
    const types: PieceType[] = ['scout', 'engineer', 'commander'];
    types.forEach((t, i) => {
      const stats = PIECE_STATS[t];
      pieces.push({
        id: uid(),
        type: t,
        owner: 1,
        pos: { ...p1Start[i] },
        hp: stats.hp,
        maxHp: stats.hp,
        moveRange: stats.moveRange,
        movedThisTurn: false,
        attackedThisTurn: false,
        stunnedUntil: 0,
        markedUntil: 0,
        animating: false,
        animProgress: 0,
      });
      pieces.push({
        id: uid(),
        type: t,
        owner: 2,
        pos: { ...p2Start[i] },
        hp: stats.hp,
        maxHp: stats.hp,
        moveRange: stats.moveRange,
        movedThisTurn: false,
        attackedThisTurn: false,
        stunnedUntil: 0,
        markedUntil: 0,
        animating: false,
        animProgress: 0,
      });
    });

    return {
      board,
      pieces,
      currentPlayer: 1,
      turnStartedAt: performance.now(),
      turnDuration: TURN_DURATION,
      energy: { 1: 0, 2: 0 },
      phase: 'playing',
      particles: [],
      tideCycleStart: performance.now(),
      tideInterval: TIDE_INTERVAL,
      surges: [],
      skillCooldowns: {},
    };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    const loop = (t: number) => {
      if (!this.running) return;
      const dt = t - this.lastTime;
      this.lastTime = t;
      this.update(dt, t);
      this.bus.emit('render', this.state, t);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  reset(): void {
    this.state = this.createInitialState();
    this.bus.emit('stateChanged', this.state);
  }

  private update(dt: number, now: number): void {
    if (this.state.phase === 'ended') return;

    this.updateParticles(dt);
    this.updatePieceAnimations(dt);
    this.updateSurges(now);
    this.checkTide(now);
    this.checkTurnTimeout(now);
    this.checkCoreCapture(now);
    this.checkWinCondition();

    this.bus.emit('tick', this.state, now);
  }

  private updateParticles(dt: number): void {
    const ps = this.state.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.0003 * dt;
      p.life -= dt;
      if (p.life <= 0) ps.splice(i, 1);
    }
  }

  private updatePieceAnimations(dt: number): void {
    for (const p of this.state.pieces) {
      if (p.animating) {
        p.animProgress += dt / 300;
        if (p.animProgress >= 1) {
          p.animProgress = 1;
          p.animating = false;
          if (p.animTo) {
            p.pos = { ...p.animTo };
          }
          p.animFrom = undefined;
          p.animTo = undefined;
        }
      }
    }
  }

  private updateSurges(now: number): void {
    const surges = this.state.surges;
    for (let i = surges.length - 1; i >= 0; i--) {
      const s = surges[i];
      const cell = this.state.board[s.pos.y]?.[s.pos.x];
      if (!cell) { surges.splice(i, 1); continue; }
      if (now >= s.endAt) {
        cell.elevation = cell.baseElevation;
        cell.surgeUntil = 0;
        surges.splice(i, 1);
      }
    }
  }

  private checkTide(now: number): void {
    const elapsed = now - this.state.tideCycleStart;
    if (elapsed >= this.state.tideInterval) {
      this.triggerTide(now);
      this.state.tideCycleStart = now;
    }
    const remaining = this.state.tideInterval - elapsed;
    if (remaining <= 5000 && remaining > 4900) {
      this.bus.emit('tideWarning', true);
    }
    if (remaining <= 0) {
      this.bus.emit('tideWarning', false);
    }
  }

  private triggerTide(now: number): void {
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const cell = this.state.board[y][x];
        if (cell.surgeUntil === 0) {
          cell.baseElevation = Math.max(0, cell.baseElevation - 1);
          cell.elevation = cell.baseElevation;
        }
      }
    }

    const numSurges = randInt(2, 3);
    const used = new Set<string>();
    for (let i = 0; i < numSurges; i++) {
      let sx: number, sy: number, key: string;
      let tries = 0;
      do {
        sx = randInt(0, BOARD_SIZE - 1);
        sy = randInt(0, BOARD_SIZE - 1);
        key = `${sx},${sy}`;
        tries++;
      } while (used.has(key) && tries < 20);
      used.add(key);

      const cell = this.state.board[sy][sx];
      cell.elevation = 4;
      cell.surgeUntil = now + SURGE_DURATION;
      this.state.surges.push({
        pos: { x: sx, y: sy },
        startAt: now,
        endAt: now + SURGE_DURATION,
      });
    }

    this.bus.emit('tide', this.state);
  }

  private checkTurnTimeout(now: number): void {
    if (now - this.state.turnStartedAt >= this.state.turnDuration) {
      this.endTurn();
    }
  }

  private checkCoreCapture(now: number): void {
    const coreCell = { x: 3, y: 3 };
    const occupant = this.getPieceAt(coreCell);
    const nearCore = this.getPieceAt({ x: 4, y: 3 }) || this.getPieceAt({ x: 3, y: 4 }) || this.getPieceAt({ x: 4, y: 4 });

    if (!occupant) {
      this.state.coreCapturedBy = undefined;
      this.state.coreCaptureStartedAt = undefined;
      return;
    }

    const hasEnemy = this.state.pieces.some(p =>
      p.owner !== occupant.owner && chebyshev(p.pos, coreCell) <= 1
    );
    if (hasEnemy) {
      this.state.coreCaptureStartedAt = now;
    }

    if (this.state.coreCapturedBy !== occupant.owner) {
      this.state.coreCapturedBy = occupant.owner;
      this.state.coreCaptureStartedAt = now;
    }

    if (this.state.coreCaptureStartedAt && now - this.state.coreCaptureStartedAt >= CORE_CAPTURE_TIME) {
      this.state.phase = 'ended';
      this.state.winner = occupant.owner;
      this.state.winReason = '占领能源核心';
      this.bus.emit('gameOver', this.state.winner, this.state.winReason);
    }
  }

  private checkWinCondition(): void {
    for (const player of [1, 2] as PlayerId[]) {
      const alive = this.state.pieces.filter(p => p.owner === player && p.hp > 0);
      if (alive.length === 0) {
        const winner: PlayerId = player === 1 ? 2 : 1;
        this.state.phase = 'ended';
        this.state.winner = winner;
        this.state.winReason = '消灭敌方全部棋子';
        this.bus.emit('gameOver', winner, this.state.winReason);
        return;
      }
    }
  }

  isCellPassable(pos: Vec2, forPlayer?: PlayerId): boolean {
    if (pos.x < 0 || pos.x >= BOARD_SIZE || pos.y < 0 || pos.y >= BOARD_SIZE) return false;
    const cell = this.state.board[pos.y][pos.x];
    if (cell.elevation >= 4) return false;
    if (cell.fortifyUntil > performance.now() && cell.fortifyOwner !== undefined && forPlayer !== undefined && cell.fortifyOwner !== forPlayer) {
      return false;
    }
    return true;
  }

  getPieceAt(pos: Vec2): PieceState | undefined {
    return this.state.pieces.find(p => p.hp > 0 && p.pos.x === pos.x && p.pos.y === pos.y);
  }

  getEffectiveMoveRange(piece: PieceState): number {
    let range = piece.moveRange;
    const hasCommanderBuff = this.state.pieces.some(p =>
      p.owner === piece.owner && p.type === 'commander' && chebyshev(p.pos, piece.pos) <= 1 && p.id !== piece.id
    );
    if (hasCommanderBuff) range = Math.ceil(range * 1.5);
    return range;
  }

  getReachableCells(piece: PieceState): Vec2[] {
    if (piece.movedThisTurn) return [];
    if (piece.stunnedUntil > performance.now()) return [];
    const range = this.getEffectiveMoveRange(piece);
    const result: Vec2[] = [];
    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > range) continue;
        if (dx === 0 && dy === 0) continue;
        const pos = { x: piece.pos.x + dx, y: piece.pos.y + dy };
        if (!this.isCellPassable(pos, piece.owner)) continue;
        if (this.getPieceAt(pos)) continue;
        result.push(pos);
      }
    }
    return result;
  }

  getAttackableCells(piece: PieceState): Vec2[] {
    if (piece.attackedThisTurn) return [];
    if (piece.stunnedUntil > performance.now()) return [];
    const result: Vec2[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const pos = { x: piece.pos.x + dx, y: piece.pos.y + dy };
        const target = this.getPieceAt(pos);
        if (target && target.owner !== piece.owner) {
          result.push(pos);
        }
      }
    }
    return result;
  }

  getScoutVision(piece: PieceState): Vec2[] {
    const cell = this.state.board[piece.pos.y][piece.pos.x];
    const visionRange = cell.elevation >= 2 ? 2 : 1;
    const result: Vec2[] = [];
    for (let dy = -visionRange; dy <= visionRange; dy++) {
      for (let dx = -visionRange; dx <= visionRange; dx++) {
        const pos = { x: piece.pos.x + dx, y: piece.pos.y + dy };
        if (pos.x >= 0 && pos.x < BOARD_SIZE && pos.y >= 0 && pos.y < BOARD_SIZE) {
          result.push(pos);
        }
      }
    }
    return result;
  }

  selectPiece(id: string | undefined): void {
    this.state.selectedPieceId = id;
    this.state.pendingAction = undefined;
    this.bus.emit('selectionChanged', id);
  }

  movePiece(pieceId: string, to: Vec2): boolean {
    const piece = this.state.pieces.find(p => p.id === pieceId);
    if (!piece) return false;
    if (piece.owner !== this.state.currentPlayer) return false;
    if (piece.movedThisTurn) return false;
    if (piece.stunnedUntil > performance.now()) return false;

    const reachable = this.getReachableCells(piece);
    if (!reachable.some(r => r.x === to.x && r.y === to.y)) return false;

    piece.animFrom = { ...piece.pos };
    piece.animTo = { ...to };
    piece.animProgress = 0;
    piece.animating = true;
    piece.pos = { ...to };
    piece.movedThisTurn = true;

    this.bus.emit('pieceMoved', piece, to);
    this.bus.emit('stateChanged', this.state);
    return true;
  }

  attackPiece(attackerId: string, targetPos: Vec2): boolean {
    const attacker = this.state.pieces.find(p => p.id === attackerId);
    if (!attacker) return false;
    if (attacker.owner !== this.state.currentPlayer) return false;
    if (attacker.attackedThisTurn) return false;
    if (attacker.stunnedUntil > performance.now()) return false;

    const targets = this.getAttackableCells(attacker);
    if (!targets.some(t => t.x === targetPos.x && t.y === targetPos.y)) return false;

    const target = this.getPieceAt(targetPos);
    if (!target) return false;

    target.hp -= 1;
    attacker.attackedThisTurn = true;
    attacker.movedThisTurn = true;

    if (target.hp <= 0) {
      this.spawnDeathParticles(target);
      this.state.energy[attacker.owner] += 2;
      this.bus.emit('pieceKilled', target, attacker);
    } else {
      this.bus.emit('pieceDamaged', target, attacker);
    }

    this.bus.emit('stateChanged', this.state);
    return true;
  }

  private spawnDeathParticles(piece: PieceState): void {
    const color = piece.owner === 1 ? '#00e5ff' : '#ff5252';
    const count = 12 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 0.08 + Math.random() * 0.08;
      this.state.particles.push({
        x: piece.pos.x + 0.5,
        y: piece.pos.y + 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 600 + Math.random() * 400,
        maxLife: 1000,
        color,
        size: 3 + Math.random() * 3,
      });
    }
  }

  useSkill(pieceId: string, skill: string, target?: Vec2): boolean {
    const piece = this.state.pieces.find(p => p.id === pieceId);
    if (!piece) return false;
    if (piece.owner !== this.state.currentPlayer) return false;
    if (piece.stunnedUntil > performance.now()) return false;

    const now = performance.now();
    const cdKey = `${pieceId}:${skill}`;
    if (this.state.skillCooldowns[cdKey] > now) return false;

    switch (skill) {
      case 'flash': {
        if (piece.type !== 'scout') return false;
        if (this.state.energy[piece.owner] < 2) return false;
        if (!target) return false;
        const vision = this.getScoutVision(piece);
        if (!vision.some(v => v.x === target.x && v.y === target.y)) return false;
        if (!this.isCellPassable(target, piece.owner)) return false;
        if (this.getPieceAt(target)) return false;
        this.state.energy[piece.owner] -= 2;
        piece.animFrom = { ...piece.pos };
        piece.animTo = { ...target };
        piece.animProgress = 0;
        piece.animating = true;
        piece.pos = { ...target };
        piece.movedThisTurn = true;
        this.state.skillCooldowns[cdKey] = now + 5000;
        this.bus.emit('skillUsed', piece, 'flash', target);
        break;
      }
      case 'repair': {
        if (piece.type !== 'engineer') return false;
        if (this.state.energy[piece.owner] < 1) return false;
        if (piece.hp >= piece.maxHp) return false;
        this.state.energy[piece.owner] -= 1;
        piece.hp = Math.min(piece.maxHp, piece.hp + 1);
        this.state.skillCooldowns[cdKey] = now + 3000;
        this.bus.emit('skillUsed', piece, 'repair');
        break;
      }
      case 'deter': {
        if (piece.type !== 'commander') return false;
        if (this.state.energy[piece.owner] < 3) return false;
        this.state.energy[piece.owner] -= 3;
        for (const p of this.state.pieces) {
          if (p.owner !== piece.owner && chebyshev(p.pos, piece.pos) <= 2) {
            p.stunnedUntil = now + STUN_DURATION;
          }
        }
        this.state.skillCooldowns[cdKey] = now + 8000;
        this.bus.emit('skillUsed', piece, 'deter');
        break;
      }
      case 'fortify': {
        if (piece.type !== 'engineer') return false;
        if (this.state.energy[piece.owner] < 1) return false;
        if (!target) return false;
        if (chebyshev(piece.pos, target) !== 1) return false;
        if (!this.isCellPassable(target, piece.owner)) return false;
        const cell = this.state.board[target.y][target.x];
        if (cell.fortifyUntil > now) return false;
        this.state.energy[piece.owner] -= 1;
        cell.fortifyUntil = now + FORTIFY_DURATION;
        cell.fortifyOwner = piece.owner;
        this.state.skillCooldowns[cdKey] = now + 4000;
        this.bus.emit('skillUsed', piece, 'fortify', target);
        break;
      }
      default:
        return false;
    }

    this.bus.emit('stateChanged', this.state);
    return true;
  }

  endTurn(): void {
    if (this.state.phase === 'ended') return;
    const now = performance.now();

    for (const p of this.state.pieces) {
      if (p.owner === this.state.currentPlayer) {
        if (this.state.board[p.pos.y][p.pos.x].elevation >= 2) {
          this.state.energy[p.owner] += 1;
        }
      }
    }

    this.state.energy[this.state.currentPlayer] += 1;

    this.state.currentPlayer = this.state.currentPlayer === 1 ? 2 : 1;
    this.state.turnStartedAt = now;

    for (const p of this.state.pieces) {
      if (p.owner === this.state.currentPlayer) {
        p.movedThisTurn = false;
        p.attackedThisTurn = false;
      }
    }

    this.state.selectedPieceId = undefined;
    this.state.pendingAction = undefined;

    this.bus.emit('turnChanged', this.state.currentPlayer);
    this.bus.emit('stateChanged', this.state);
  }

  clickCell(pos: Vec2): void {
    if (this.state.phase === 'ended') return;

    const piece = this.getPieceAt(pos);
    const selected = this.state.selectedPieceId
      ? this.state.pieces.find(p => p.id === this.state.selectedPieceId)
      : undefined;

    if (this.state.pendingAction === 'flash' && selected) {
      this.useSkill(selected.id, 'flash', pos);
      this.state.pendingAction = undefined;
      return;
    }
    if (this.state.pendingAction === 'fortify' && selected) {
      this.useSkill(selected.id, 'fortify', pos);
      this.state.pendingAction = undefined;
      return;
    }

    if (piece && piece.owner === this.state.currentPlayer) {
      this.selectPiece(piece.id);
      return;
    }

    if (selected) {
      if (piece && piece.owner !== this.state.currentPlayer) {
        this.attackPiece(selected.id, pos);
      } else if (!piece) {
        this.movePiece(selected.id, pos);
      }
    }
  }

  getTurnRemaining(now: number): number {
    return Math.max(0, this.state.turnDuration - (now - this.state.turnStartedAt));
  }

  getTideRemaining(now: number): number {
    return Math.max(0, this.state.tideInterval - (now - this.state.tideCycleStart));
  }

  getCoreProgress(now: number): number {
    if (!this.state.coreCaptureStartedAt || !this.state.coreCapturedBy) return 0;
    return Math.min(1, (now - this.state.coreCaptureStartedAt) / CORE_CAPTURE_TIME);
  }
}
