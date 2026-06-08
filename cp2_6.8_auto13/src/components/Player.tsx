import { useEffect, useCallback } from 'react';
import { Position, Direction, MAZE_WIDTH, MAZE_HEIGHT } from '../utils/gameTypes';
import { isWalkable, isTrap } from '../utils/mazeGenerator';
import { Cell } from '../utils/gameTypes';

interface PlayerControllerProps {
  playerPos: Position;
  maze: Cell[][];
  isSlowed: boolean;
  baseSpeed: number;
  gameStatus: 'playing' | 'won' | 'lost';
  onMove: (newPos: Position, direction: Direction) => void;
  onShowPath: (show: boolean) => void;
  pathCooldown: number;
  onRestart?: () => void;
}

const PlayerController: React.FC<PlayerControllerProps> = ({
  playerPos,
  maze,
  isSlowed,
  baseSpeed,
  gameStatus,
  onMove,
  onShowPath,
  pathCooldown,
  onRestart,
}) => {
  const moveInterval = isSlowed ? baseSpeed * 2 : baseSpeed;

  const tryMove = useCallback(
    (direction: Direction) => {
      if (gameStatus !== 'playing') return;

      const deltas: Record<Direction, { dx: number; dy: number }> = {
        up: { dx: 0, dy: -1 },
        down: { dx: 0, dy: 1 },
        left: { dx: -1, dy: 0 },
        right: { dx: 1, dy: 0 },
      };

      const delta = deltas[direction];
      const newX = playerPos.x + delta.dx;
      const newY = playerPos.y + delta.dy;

      if (isWalkable(maze, newX, newY)) {
        onMove({ x: newX, y: newY }, direction);
      }
    },
    [playerPos, maze, gameStatus, onMove]
  );

  useEffect(() => {
    let lastMoveTime = 0;
    let spacePressed = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();

      if (gameStatus !== 'playing') {
        if (e.key === 'r' || e.key === 'R') {
          onRestart?.();
        }
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (!spacePressed && pathCooldown <= 0) {
          spacePressed = true;
          onShowPath(true);
        }
        return;
      }

      if (now - lastMoveTime < moveInterval) return;

      let direction: Direction | null = null;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          direction = 'up';
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          direction = 'down';
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          direction = 'left';
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          direction = 'right';
          break;
      }

      if (direction) {
        e.preventDefault();
        lastMoveTime = now;
        tryMove(direction);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        spacePressed = false;
        onShowPath(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [tryMove, moveInterval, gameStatus, pathCooldown, onShowPath, onRestart]);

  return null;
};

export default PlayerController;
