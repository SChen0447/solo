export type RuneAttribute = 'fire' | 'lightning' | 'ice' | 'pink' | 'deepBlue' | 'purple' | 'rose' | 'cyan';

export const RUNE_COLORS: Record<RuneAttribute, string> = {
  fire: '#ff6b6b',
  lightning: '#feca57',
  ice: '#48dbfb',
  pink: '#ff9ff3',
  deepBlue: '#54a0ff',
  purple: '#a29bfe',
  rose: '#fd79a8',
  cyan: '#00cec9'
};

export const RUNE_ATTRIBUTES: RuneAttribute[] = ['fire', 'lightning', 'ice', 'pink', 'deepBlue', 'purple', 'rose', 'cyan'];

export interface HexCoord {
  q: number;
  r: number;
}

export interface RunePiece {
  id: string;
  faction: 'player' | 'ai';
  position: HexCoord;
  attribute: RuneAttribute;
  isFrozen: boolean;
  frozenUntil: number;
  hasShield: boolean;
  isEliminated: boolean;
}

export interface BattleInfo {
  attackerId: string;
  defenderId: string;
  targetAttribute: RuneAttribute;
  startTime: number;
  duration: number;
  resolved: boolean;
}

export type SkillType = 'shield' | 'freeze' | 'starcrack';

export type GamePhase = 'select' | 'move' | 'battle' | 'skill' | 'end' | 'gameover';

export interface GameState {
  turn: number;
  currentPlayer: 'player' | 'ai';
  phase: GamePhase;
  playerEnergy: number;
  aiEnergy: number;
  pieces: RunePiece[];
  selectedPieceId: string | null;
  battleInfo: BattleInfo | null;
  winner: 'player' | 'ai' | null;
  message: string;
}

export type GameEventType = 'select' | 'move' | 'battle_start' | 'battle_win' | 'battle_lose' |
  'skill_shield' | 'skill_freeze' | 'skill_starcrack' | 'turn_end' | 'victory';

export interface GameEvent {
  type: GameEventType;
  data?: unknown;
  timestamp: number;
}

const HEX_SIZE = 40;
const BOARD_RADIUS = 3;
const MAX_ENERGY = 5;
const BATTLE_DURATION = 1500;

const HEX_DIRECTIONS: HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 }
];

export class GameCore {
  private state: GameState;
  private listeners: ((state: GameState, event: GameEvent) => void)[] = [];
  private validMoves: HexCoord[] = [];

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      turn: 1,
      currentPlayer: 'player',
      phase: 'select',
      playerEnergy: 1,
      aiEnergy: 1,
      pieces: this.createInitialPieces(),
      selectedPieceId: null,
      battleInfo: null,
      winner: null,
      message: '玩家回合 - 选择一枚棋子'
    };
  }

  private createInitialPieces(): RunePiece[] {
    const pieces: RunePiece[] = [];
    const playerPositions: HexCoord[] = [
      { q: -3, r: 1 }, { q: -3, r: 2 }, { q: -2, r: 3 },
      { q: -2, r: 2 }, { q: -1, r: 3 }
    ];
    const aiPositions: HexCoord[] = [
      { q: 3, r: -1 }, { q: 3, r: -2 }, { q: 2, r: -3 },
      { q: 2, r: -2 }, { q: 1, r: -3 }
    ];

    playerPositions.forEach((pos, i) => {
      pieces.push({
        id: `player-${i}`,
        faction: 'player',
        position: pos,
        attribute: RUNE_ATTRIBUTES[i % 8],
        isFrozen: false,
        frozenUntil: 0,
        hasShield: false,
        isEliminated: false
      });
    });

    aiPositions.forEach((pos, i) => {
      pieces.push({
        id: `ai-${i}`,
        faction: 'ai',
        position: pos,
        attribute: RUNE_ATTRIBUTES[(i + 4) % 8],
        isFrozen: false,
        frozenUntil: 0,
        hasShield: false,
        isEliminated: false
      });
    });

    return pieces;
  }

  static getAllHexCoords(): HexCoord[] {
    const coords: HexCoord[] = [];
    for (let q = -BOARD_RADIUS; q <= BOARD_RADIUS; q++) {
      const r1 = Math.max(-BOARD_RADIUS, -q - BOARD_RADIUS);
      const r2 = Math.min(BOARD_RADIUS, -q + BOARD_RADIUS);
      for (let r = r1; r <= r2; r++) {
        coords.push({ q, r });
      }
    }
    return coords;
  }

  static isOnBoard(coord: HexCoord): boolean {
    const s = -coord.q - coord.r;
    return Math.abs(coord.q) <= BOARD_RADIUS &&
      Math.abs(coord.r) <= BOARD_RADIUS &&
      Math.abs(s) <= BOARD_RADIUS;
  }

  static getHexCenter(coord: HexCoord, centerX: number, centerY: number, size: number): { x: number; y: number } {
    const x = size * (3 / 2 * coord.q);
    const y = size * (Math.sqrt(3) / 2 * coord.q + Math.sqrt(3) * coord.r);
    return { x: centerX + x, y: centerY + y };
  }

  static hexDistance(a: HexCoord, b: HexCoord): number {
    return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
  }

  static getNeighbors(coord: HexCoord): HexCoord[] {
    return HEX_DIRECTIONS.map(d => ({ q: coord.q + d.q, r: coord.r + d.r }))
      .filter(c => GameCore.isOnBoard(c));
  }

  private emitEvent(type: GameEventType, data?: unknown): void {
    const event: GameEvent = { type, data, timestamp: Date.now() };
    this.listeners.forEach(fn => fn(this.state, event));
  }

  subscribe(callback: (state: GameState, event: GameEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  getState(): GameState {
    return { ...this.state };
  }

  getValidMoves(): HexCoord[] {
    return [...this.validMoves];
  }

  getPieceAt(coord: HexCoord): RunePiece | null {
    return this.state.pieces.find(p =>
      !p.isEliminated && p.position.q === coord.q && p.position.r === coord.r
    ) || null;
  }

  selectPiece(pieceId: string): boolean {
    if (this.state.phase !== 'select' && this.state.phase !== 'move') return false;

    const piece = this.state.pieces.find(p => p.id === pieceId);
    if (!piece || piece.isEliminated) return false;
    if (piece.faction !== this.state.currentPlayer) return false;
    if (piece.isFrozen && Date.now() < piece.frozenUntil) return false;

    if (piece.isFrozen && Date.now() >= piece.frozenUntil) {
      piece.isFrozen = false;
    }

    this.state.selectedPieceId = pieceId;
    this.state.phase = 'move';
    this.validMoves = this.calculateValidMoves(piece);
    this.state.message = '选择目标格子移动或与敌方对决';
    this.emitEvent('select', { pieceId });
    return true;
  }

  private calculateValidMoves(piece: RunePiece): HexCoord[] {
    const neighbors = GameCore.getNeighbors(piece.position);
    return neighbors.filter(coord => {
      const occupant = this.getPieceAt(coord);
      return !occupant || occupant.faction !== piece.faction;
    });
  }

  movePiece(targetCoord: HexCoord): boolean {
    if (this.state.phase !== 'move' || !this.state.selectedPieceId) return false;

    const isValid = this.validMoves.some(m => m.q === targetCoord.q && m.r === targetCoord.r);
    if (!isValid) return false;

    const piece = this.state.pieces.find(p => p.id === this.state.selectedPieceId);
    if (!piece) return false;

    const targetPiece = this.getPieceAt(targetCoord);

    if (targetPiece && targetPiece.faction !== piece.faction) {
      this.startBattle(piece, targetPiece);
    } else {
      piece.position = { ...targetCoord };
      this.state.selectedPieceId = null;
      this.state.phase = 'select';
      this.validMoves = [];
      this.state.message = '移动完成，可继续操作或结束回合';
      this.emitEvent('move', { pieceId: piece.id, from: piece.position, to: targetCoord });
    }

    return true;
  }

  private startBattle(attacker: RunePiece, defender: RunePiece): void {
    this.state.phase = 'battle';
    this.state.battleInfo = {
      attackerId: attacker.id,
      defenderId: defender.id,
      targetAttribute: defender.attribute,
      startTime: Date.now(),
      duration: BATTLE_DURATION,
      resolved: false
    };
    this.state.message = '符文对决！点击匹配的颜色区域！';
    this.emitEvent('battle_start', { attacker: attacker.id, defender: defender.id });
  }

  battleClick(sectorIndex: number): boolean {
    if (this.state.phase !== 'battle' || !this.state.battleInfo) return false;
    if (this.state.battleInfo.resolved) return false;
    if (this.state.currentPlayer !== 'player') return false;

    const battle = this.state.battleInfo;
    const targetAttr = battle.targetAttribute;
    const clickedAttr = RUNE_ATTRIBUTES[sectorIndex % 8];

    battle.resolved = true;
    const success = clickedAttr === targetAttr;

    const attacker = this.state.pieces.find(p => p.id === battle.attackerId)!;
    const defender = this.state.pieces.find(p => p.id === battle.defenderId)!;

    if (success) {
      if (defender.hasShield) {
        defender.hasShield = false;
        this.state.message = '对决成功！但对方护盾抵消了伤害';
      } else {
        defender.isEliminated = true;
        this.state.message = '对决成功！敌方棋子被消除！';
      }
      this.emitEvent('battle_win', { target: defender.id, color: RUNE_COLORS[targetAttr] });
    } else {
      if (attacker.hasShield) {
        attacker.hasShield = false;
        this.state.message = '对决失败！但你的护盾抵消了伤害';
      } else {
        attacker.isEliminated = true;
        this.state.message = '对决失败！己方棋子被消除...';
      }
      this.emitEvent('battle_lose', { target: attacker.id, color: RUNE_COLORS[targetAttr] });
    }

    this.state.selectedPieceId = null;
    this.validMoves = [];

    setTimeout(() => {
      this.state.battleInfo = null;
      this.state.phase = 'select';
      this.checkGameOver();
    }, 800);

    return true;
  }

  battleTimeout(): void {
    if (this.state.phase !== 'battle' || !this.state.battleInfo) return;
    if (this.state.battleInfo.resolved) return;

    const battle = this.state.battleInfo;
    battle.resolved = true;

    const attacker = this.state.pieces.find(p => p.id === battle.attackerId)!;

    if (attacker.hasShield) {
      attacker.hasShield = false;
      this.state.message = '超时！护盾抵消了伤害';
    } else {
      attacker.isEliminated = true;
      this.state.message = '超时！己方棋子被消除...';
    }

    this.state.selectedPieceId = null;
    this.validMoves = [];
    this.emitEvent('battle_lose', { target: attacker.id, color: RUNE_COLORS[battle.targetAttribute] });

    setTimeout(() => {
      this.state.battleInfo = null;
      this.state.phase = 'select';
      this.checkGameOver();
    }, 800);
  }

  useSkill(skillType: SkillType, targetPieceId?: string): boolean {
    if (this.state.phase === 'battle' || this.state.phase === 'gameover') return false;
    if (this.state.phase !== 'select' && this.state.phase !== 'move') return false;

    const energyKey = this.state.currentPlayer === 'player' ? 'playerEnergy' : 'aiEnergy';
    const costs: Record<SkillType, number> = { shield: 2, freeze: 3, starcrack: 5 };
    const cost = costs[skillType];

    if (this.state[energyKey] < cost) return false;

    this.state[energyKey] -= cost;

    switch (skillType) {
      case 'shield':
        this.applyShield(targetPieceId);
        break;
      case 'freeze':
        this.applyFreeze(targetPieceId);
        break;
      case 'starcrack':
        this.applyStarcrack();
        break;
    }

    this.state.selectedPieceId = null;
    this.validMoves = [];
    return true;
  }

  private applyShield(targetPieceId?: string): void {
    const pieceId = targetPieceId || this.state.selectedPieceId;
    if (!pieceId) return;

    const piece = this.state.pieces.find(p => p.id === pieceId);
    if (!piece || piece.isEliminated) return;
    if (piece.faction !== this.state.currentPlayer) return;

    piece.hasShield = true;
    this.state.message = `${this.state.currentPlayer === 'player' ? '玩家' : 'AI'}释放了护盾！`;
    this.emitEvent('skill_shield', { pieceId: piece.id });
  }

  private applyFreeze(targetPieceId?: string): void {
    if (!targetPieceId) return;

    const piece = this.state.pieces.find(p => p.id === targetPieceId);
    if (!piece || piece.isEliminated) return;
    if (piece.faction === this.state.currentPlayer) return;

    piece.isFrozen = true;
    piece.frozenUntil = Date.now() + 2000;
    this.state.message = `${this.state.currentPlayer === 'player' ? '玩家' : 'AI'}释放了冰封！`;
    this.emitEvent('skill_freeze', { pieceId: piece.id });
  }

  private applyStarcrack(): void {
    const playerPieces = this.state.pieces.filter(p => p.faction === this.state.currentPlayer);
    const allCoords = GameCore.getAllHexCoords();
    const occupiedCoords = new Set<string>();

    const alivePieces = this.state.pieces.filter(p => !p.isEliminated);
    alivePieces.forEach(p => occupiedCoords.add(`${p.position.q},${p.position.r}`));

    const eliminatedPieces = this.state.pieces.filter(
      p => p.isEliminated && p.faction === this.state.currentPlayer
    );
    if (eliminatedPieces.length > 0) {
      const toRevive = eliminatedPieces[0];
      toRevive.isEliminated = false;

      const availableCoords = allCoords.filter(c => !occupiedCoords.has(`${c.q},${c.r}`));
      if (availableCoords.length > 0) {
        const randomCoord = availableCoords[Math.floor(Math.random() * availableCoords.length)];
        toRevive.position = randomCoord;
        occupiedCoords.add(`${randomCoord.q},${randomCoord.r}`);
      }
    }

    const shuffledPieces = [...alivePieces];
    if (eliminatedPieces.length > 0 && !eliminatedPieces[0].isEliminated) {
      shuffledPieces.push(eliminatedPieces[0]);
    }

    const positions = [...allCoords].sort(() => Math.random() - 0.5).slice(0, shuffledPieces.length);
    shuffledPieces.forEach((piece, i) => {
      piece.position = positions[i];
    });

    this.state.message = `${this.state.currentPlayer === 'player' ? '玩家' : 'AI'}释放了星裂！全场重排！`;
    this.emitEvent('skill_starcrack', {});
  }

  endTurn(): boolean {
    if (this.state.phase === 'battle' || this.state.phase === 'gameover') return false;

    this.state.currentPlayer = this.state.currentPlayer === 'player' ? 'ai' : 'player';
    if (this.state.currentPlayer === 'player') {
      this.state.turn++;
    }

    const energyKey = this.state.currentPlayer === 'player' ? 'playerEnergy' : 'aiEnergy';
    this.state[energyKey] = Math.min(MAX_ENERGY, this.state[energyKey] + 1);

    this.state.selectedPieceId = null;
    this.validMoves = [];
    this.state.phase = 'select';

    this.state.message = this.state.currentPlayer === 'player'
      ? '玩家回合 - 选择一枚棋子'
      : 'AI思考中...';

    this.emitEvent('turn_end', { nextPlayer: this.state.currentPlayer });

    this.state.pieces.forEach(p => {
      if (p.isFrozen && Date.now() >= p.frozenUntil) {
        p.isFrozen = false;
      }
    });

    if (this.state.currentPlayer === 'ai') {
      setTimeout(() => this.executeAITurn(), 600);
    }

    return true;
  }

  private executeAITurn(): void {
    if (this.state.currentPlayer !== 'ai' || this.state.phase === 'gameover') return;

    const aiPieces = this.state.pieces.filter(p => p.faction === 'ai' && !p.isEliminated);
    const playerPieces = this.state.pieces.filter(p => p.faction === 'player' && !p.isEliminated);

    if (aiPieces.length === 0 || playerPieces.length === 0) return;

    if (this.state.aiEnergy >= 3 && Math.random() < 0.4) {
      if (this.state.aiEnergy >= 5 && Math.random() < 0.3) {
        this.useSkill('starcrack');
        setTimeout(() => this.endAITurn(), 1200);
        return;
      }

      const target = this.findBestFreezeTarget(playerPieces);
      if (target) {
        this.useSkill('freeze', target.id);
        setTimeout(() => this.endAITurn(), 1200);
        return;
      }
    }

    const center: HexCoord = { q: 0, r: 0 };
    let bestPiece: RunePiece | null = null;
    let bestMove: HexCoord | null = null;
    let bestScore = -Infinity;

    for (const piece of aiPieces) {
      if (piece.isFrozen && Date.now() < piece.frozenUntil) continue;

      const moves = this.calculateValidMoves(piece);
      for (const move of moves) {
        let score = 0;

        const distToCenter = GameCore.hexDistance(move, center);
        score += (BOARD_RADIUS - distToCenter) * 2;

        const targetPiece = this.getPieceAt(move);
        if (targetPiece && targetPiece.faction === 'player') {
          if (piece.attribute === targetPiece.attribute) {
            score += 50;
          } else {
            score += 20;
          }
        }

        let minPlayerDist = Infinity;
        for (const pp of playerPieces) {
          const dist = GameCore.hexDistance(move, pp.position);
          minPlayerDist = Math.min(minPlayerDist, dist);
        }
        score += (6 - minPlayerDist) * 3;

        if (score > bestScore) {
          bestScore = score;
          bestPiece = piece;
          bestMove = move;
        }
      }
    }

    if (bestPiece && bestMove) {
      this.state.selectedPieceId = bestPiece.id;
      this.validMoves = this.calculateValidMoves(bestPiece);
      this.state.phase = 'move';

      setTimeout(() => {
        this.movePiece(bestMove!);
        setTimeout(() => this.endAITurn(), this.state.phase === 'battle' ? 0 : 800);
      }, 400);
    } else {
      this.endAITurn();
    }
  }

  private findBestFreezeTarget(playerPieces: RunePiece[]): RunePiece | null {
    const available = playerPieces.filter(p => !p.isFrozen);
    if (available.length === 0) return null;

    available.sort((a, b) => {
      const aDist = GameCore.hexDistance(a.position, { q: 0, r: 0 });
      const bDist = GameCore.hexDistance(b.position, { q: 0, r: 0 });
      return aDist - bDist;
    });

    return available[0];
  }

  private endAITurn(): void {
    if (this.state.phase === 'battle') {
      setTimeout(() => this.endAITurn(), 100);
      return;
    }
    this.endTurn();
  }

  private checkGameOver(): void {
    const playerAlive = this.state.pieces.filter(p => p.faction === 'player' && !p.isEliminated).length;
    const aiAlive = this.state.pieces.filter(p => p.faction === 'ai' && !p.isEliminated).length;

    if (playerAlive === 0) {
      this.state.winner = 'ai';
      this.state.phase = 'gameover';
      this.state.message = '游戏结束 - AI获胜！';
      this.emitEvent('victory', { winner: 'ai' });
    } else if (aiAlive === 0) {
      this.state.winner = 'player';
      this.state.phase = 'gameover';
      this.state.message = '游戏结束 - 玩家获胜！';
      this.emitEvent('victory', { winner: 'player' });
    }
  }

  resetGame(): void {
    this.state = this.createInitialState();
    this.validMoves = [];
    this.emitEvent('turn_end', { nextPlayer: 'player' });
  }

  static getHexSize(): number {
    return HEX_SIZE;
  }

  static getBoardRadius(): number {
    return BOARD_RADIUS;
  }

  static getMaxEnergy(): number {
    return MAX_ENERGY;
  }
}
