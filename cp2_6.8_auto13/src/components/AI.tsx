import { useEffect, useRef } from 'react';
import { AIState, Cell, Position, GameStatus } from '../utils/gameTypes';
import { updateAI } from '../utils/aiLogic';

interface AIControllerProps {
  ais: AIState[];
  maze: Cell[][];
  playerPos: Position;
  traps: Position[];
  gameStatus: GameStatus;
  onUpdate: (ais: AIState[]) => void;
}

const AIController: React.FC<AIControllerProps> = ({
  ais,
  maze,
  playerPos,
  traps,
  gameStatus,
  onUpdate,
}) => {
  const lastTimeRef = useRef<number>(0);
  const animationRef = useRef<number>(0);
  const aisRef = useRef<AIState[]>(ais);

  useEffect(() => {
    aisRef.current = ais;
  }, [ais]);

  useEffect(() => {
    if (gameStatus !== 'playing') {
      return;
    }

    const tick = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }

      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      const currentAis = aisRef.current;
      const updatedAis = currentAis.map((ai) =>
        updateAI(ai, maze, playerPos, traps, deltaTime)
      );

      const hasChanged = updatedAis.some(
        (ai, i) =>
          ai.position.x !== currentAis[i].position.x ||
          ai.position.y !== currentAis[i].position.y ||
          ai.state !== currentAis[i].state
      );

      if (hasChanged) {
        aisRef.current = updatedAis;
        onUpdate(updatedAis);
      }

      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationRef.current);
      lastTimeRef.current = 0;
    };
  }, [maze, playerPos, traps, gameStatus, onUpdate]);

  return null;
};

export default AIController;
