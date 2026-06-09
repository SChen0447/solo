import { Cell, Position, Direction, AIState } from './gameTypes';
import { isWalkable } from './mazeGenerator';
import { findPath } from './pathfinding';

const directionDeltas: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  right: { dx: 1, dy: 0 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
};

const rightTurns: Record<Direction, Direction> = {
  up: 'right',
  right: 'down',
  down: 'left',
  left: 'up',
};

const leftTurns: Record<Direction, Direction> = {
  up: 'left',
  left: 'down',
  down: 'right',
  right: 'up',
};

function canMove(maze: Cell[][], pos: Position, dir: Direction): boolean {
  const delta = directionDeltas[dir];
  const nx = pos.x + delta.dx;
  const ny = pos.y + delta.dy;
  return isWalkable(maze, nx, ny);
}

export function getNextPatrolPosition(
  maze: Cell[][],
  pos: Position,
  currentDir: Direction
): { position: Position; direction: Direction } {
  let dir: Direction = rightTurns[currentDir];

  if (canMove(maze, pos, dir)) {
    const delta = directionDeltas[dir];
    return {
      position: { x: pos.x + delta.dx, y: pos.y + delta.dy },
      direction: dir,
    };
  }

  dir = currentDir;
  if (canMove(maze, pos, dir)) {
    const delta = directionDeltas[dir];
    return {
      position: { x: pos.x + delta.dx, y: pos.y + delta.dy },
      direction: dir,
    };
  }

  dir = leftTurns[currentDir];
  if (canMove(maze, pos, dir)) {
    const delta = directionDeltas[dir];
    return {
      position: { x: pos.x + delta.dx, y: pos.y + delta.dy },
      direction: dir,
    };
  }

  dir = leftTurns[leftTurns[currentDir]];
  if (canMove(maze, pos, dir)) {
    const delta = directionDeltas[dir];
    return {
      position: { x: pos.x + delta.dx, y: pos.y + delta.dy },
      direction: dir,
    };
  }

  return { position: pos, direction: currentDir };
}

export function manhattanDistance(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function isPlayerInVision(aiPos: Position, playerPos: Position, visionRange: number): boolean {
  return manhattanDistance(aiPos, playerPos) <= visionRange;
}

export function getChasePath(
  maze: Cell[][],
  aiPos: Position,
  playerPos: Position,
  traps: Position[]
): Position[] {
  return findPath(maze, aiPos, playerPos, traps);
}

export function updateAI(
  ai: AIState,
  maze: Cell[][],
  playerPos: Position,
  traps: Position[],
  deltaTime: number
): AIState {
  const newAI = { ...ai };
  newAI.moveTimer += deltaTime;

  const inVision = isPlayerInVision(ai.position, playerPos, ai.visionRange);
  newAI.state = inVision ? 'chase' : 'patrol';

  if (newAI.moveTimer >= newAI.moveInterval) {
    newAI.moveTimer = 0;

    if (newAI.state === 'chase') {
      const path = getChasePath(maze, ai.position, playerPos, traps);
      if (path.length > 1) {
        newAI.position = path[1];
      }
    } else {
      const result = getNextPatrolPosition(maze, ai.position, ai.patrolDirection);
      newAI.position = result.position;
      newAI.patrolDirection = result.direction;
    }
  }

  return newAI;
}

export function checkPlayerCaught(ais: AIState[], playerPos: Position): boolean {
  return ais.some((ai) => ai.position.x === playerPos.x && ai.position.y === playerPos.y);
}
