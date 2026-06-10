import { Board, HexCoord, TerrainType, TERRAIN_MOVE_COST } from './board';
import { Card, CardType } from './cards';

export interface AIDecision {
  type: 'use_card' | 'move_base' | 'end_turn';
  card?: Card;
  target?: HexCoord;
  moveTo?: HexCoord;
}

export class SimpleAI {
  private board: Board;
  private playerId: number;

  constructor(board: Board, playerId: number) {
    this.board = board;
    this.playerId = playerId;
  }

  private getEnemyBase(): HexCoord {
    return this.playerId === 2 ? this.board.getPlayer1Base() : this.board.getPlayer2Base();
  }

  private getAIBase(): HexCoord {
    return this.playerId === 2 ? this.board.getPlayer2Base() : this.board.getPlayer1Base();
  }

  private hexDistance(a: HexCoord, b: HexCoord): number {
    return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
  }

  public decide(hand: Card[], actionPoints: number, aiPosition: HexCoord): AIDecision {
    const enemyBase = this.getEnemyBase();
    const distToEnemy = this.hexDistance(aiPosition, enemyBase);

    const earthquakeCard = hand.find(c => c.type === CardType.EARTHQUAKE && c.cost <= actionPoints);
    if (earthquakeCard) {
      const target = this.findEarthquakeTarget(aiPosition, enemyBase);
      if (target) {
        return { type: 'use_card', card: earthquakeCard, target };
      }
    }

    const reshapeCard = hand.find(c => c.type === CardType.RESHAPE && c.cost <= actionPoints);
    if (reshapeCard) {
      const target = this.findReshapeTarget(aiPosition, enemyBase, reshapeCard.targetTerrain || TerrainType.MOUNTAIN);
      if (target) {
        return { type: 'use_card', card: reshapeCard, target };
      }
    }

    const tideCard = hand.find(c => c.type === CardType.TIDE && c.cost <= actionPoints);
    if (tideCard) {
      const target = this.findTideTarget(aiPosition, enemyBase);
      if (target) {
        return { type: 'use_card', card: tideCard, target };
      }
    }

    const resourceCard = hand.find(c => c.type === CardType.RESOURCE && c.cost <= actionPoints);
    if (resourceCard && actionPoints <= 1) {
      return { type: 'use_card', card: resourceCard };
    }

    if (actionPoints >= 1) {
      const moveTarget = this.findMoveTarget(aiPosition, enemyBase);
      if (moveTarget) {
        return { type: 'move_base', moveTo: moveTarget };
      }
    }

    return { type: 'end_turn' };
  }

  private findEarthquakeTarget(aiPos: HexCoord, enemyBase: HexCoord): HexCoord | undefined {
    const allCells = this.board.getAllCells();
    let bestTarget: HexCoord | undefined;
    let bestScore = -Infinity;

    for (const cell of allCells) {
      if (cell.isBasePlayer1 || cell.isBasePlayer2) continue;
      if (cell.terrain === TerrainType.MOUNTAIN) continue;

      const neighbors = this.board.getNeighbors(cell.coord);
      let score = 0;

      for (const neighbor of neighbors) {
        if (this.hexDistance(neighbor.coord, enemyBase) <= 2) {
          score += 3;
        }
        if (this.hexDistance(neighbor.coord, aiPos) <= 2) {
          score -= 1;
        }
      }

      const distToEnemyPath = this.hexDistance(cell.coord, enemyBase);
      score += Math.max(0, 5 - distToEnemyPath);

      if (score > bestScore) {
        bestScore = score;
        bestTarget = cell.coord;
      }
    }

    return bestTarget;
  }

  private findReshapeTarget(aiPos: HexCoord, enemyBase: HexCoord, targetTerrain: TerrainType): HexCoord | undefined {
    const allCells = this.board.getAllCells();
    let bestTarget: HexCoord | undefined;
    let bestScore = -Infinity;

    for (const cell of allCells) {
      if (cell.isBasePlayer1 || cell.isBasePlayer2) continue;
      if (cell.terrain === targetTerrain) continue;

      const distToEnemy = this.hexDistance(cell.coord, enemyBase);
      const distToAI = this.hexDistance(cell.coord, aiPos);

      let score = 0;

      if (targetTerrain === TerrainType.MOUNTAIN || targetTerrain === TerrainType.WATER) {
        if (distToEnemy <= 3) score += 5 - distToEnemy;
        if (distToAI <= 2) score -= 3;
      } else if (targetTerrain === TerrainType.FOREST) {
        if (distToAI <= 3) score += 3;
      } else {
        if (distToAI <= 3) score += 4 - distToAI;
      }

      if (score > bestScore) {
        bestScore = score;
        bestTarget = cell.coord;
      }
    }

    return bestTarget;
  }

  private findTideTarget(aiPos: HexCoord, enemyBase: HexCoord): HexCoord | undefined {
    const allCells = this.board.getAllCells();
    let bestTarget: HexCoord | undefined;
    let bestScore = -Infinity;

    for (const cell of allCells) {
      if (cell.isBasePlayer1 || cell.isBasePlayer2) continue;
      if (cell.terrain === TerrainType.WATER) continue;

      let score = 0;
      const neighbors = this.board.getNeighbors(cell.coord);

      for (const neighbor of neighbors) {
        const dist = this.hexDistance(neighbor.coord, enemyBase);
        if (dist <= 2) score += 4;
        const aiDist = this.hexDistance(neighbor.coord, aiPos);
        if (aiDist <= 2) score -= 2;
      }

      if (score > bestScore) {
        bestScore = score;
        bestTarget = cell.coord;
      }
    }

    return bestTarget;
  }

  private findMoveTarget(currentPos: HexCoord, enemyBase: HexCoord): HexCoord | undefined {
    const neighbors = this.board.getNeighbors(currentPos);
    let bestMove: HexCoord | undefined;
    let bestDist = this.hexDistance(currentPos, enemyBase);

    for (const neighbor of neighbors) {
      const cost = TERRAIN_MOVE_COST[neighbor.terrain];
      if (cost <= 0) continue;

      const dist = this.hexDistance(neighbor.coord, enemyBase);
      if (dist < bestDist) {
        bestDist = dist;
        bestMove = neighbor.coord;
      }
    }

    return bestMove;
  }
}
