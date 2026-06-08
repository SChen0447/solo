import { useState, useEffect, useCallback, useRef } from 'react';
import Maze from './components/Maze';
import PlayerController from './components/Player';
import AIController from './components/AI';
import StatusPanel from './components/StatusPanel';
import MiniMap from './components/MiniMap';
import { generateMaze, isTrap } from './utils/mazeGenerator';
import { findPathWithTimeout } from './utils/pathfinding';
import { checkPlayerCaught } from './utils/aiLogic';
import {
  Position,
  Direction,
  Cell,
  AIState,
  GameStatus,
  PLAYER_BASE_SPEED,
  AI_MOVE_INTERVAL,
  AI_VISION_RANGE,
  AI_COUNT,
  PATH_COOLDOWN,
  SLOW_DURATION,
  DARK_VISION_DURATION,
  TRAP_FLASH_DURATION,
  MAZE_WIDTH,
  MAZE_HEIGHT,
} from './utils/gameTypes';
import './App.css';

interface GameStateData {
  maze: Cell[][];
  playerPos: Position;
  playerDirection: Direction;
  ais: AIState[];
  startPos: Position;
  endPos: Position;
  traps: Position[];
  gameStatus: GameStatus;
  elapsedTime: number;
  showPath: boolean;
  pathCooldown: number;
  shortestPath: Position[];
  isSlowed: boolean;
  slowTimer: number;
  trapFlashActive: boolean;
  darkVision: boolean;
  darkVisionTimer: number;
  pathOpacity: number;
  health: number;
}

function createInitialState(): GameStateData {
  const { maze, startPos, endPos, traps } = generateMaze();

  const pathCells: Position[] = [];
  for (let y = 0; y < MAZE_HEIGHT; y++) {
    for (let x = 0; x < MAZE_WIDTH; x++) {
      if (maze[y][x].type !== 'wall' &&
          !(x === startPos.x && y === startPos.y) &&
          !(x === endPos.x && y === endPos.y)) {
        pathCells.push({ x, y });
      }
    }
  }

  const shuffled = pathCells.sort(() => Math.random() - 0.5);
  const ais: AIState[] = [];

  for (let i = 0; i < AI_COUNT && i < shuffled.length; i++) {
    const dist = Math.abs(shuffled[i].x - startPos.x) + Math.abs(shuffled[i].y - startPos.y);
    if (dist > 5) {
      ais.push({
        id: i,
        position: shuffled[i],
        state: 'patrol',
        patrolDirection: 'right',
        visionRange: AI_VISION_RANGE,
        moveTimer: 0,
        moveInterval: AI_MOVE_INTERVAL + i * 50,
      });
    } else {
      const farCells = pathCells.filter(
        (c) => Math.abs(c.x - startPos.x) + Math.abs(c.y - startPos.y) > 5
      );
      if (farCells.length > i) {
        ais.push({
          id: i,
          position: farCells[i % farCells.length],
          state: 'patrol',
          patrolDirection: 'right',
          visionRange: AI_VISION_RANGE,
          moveTimer: 0,
          moveInterval: AI_MOVE_INTERVAL + i * 50,
        });
      }
    }
  }

  maze[startPos.y][startPos.x].explored = true;

  return {
    maze,
    playerPos: startPos,
    playerDirection: 'down',
    ais,
    startPos,
    endPos,
    traps,
    gameStatus: 'playing',
    elapsedTime: 0,
    showPath: false,
    pathCooldown: 0,
    shortestPath: [],
    isSlowed: false,
    slowTimer: 0,
    trapFlashActive: false,
    darkVision: false,
    darkVisionTimer: 0,
    pathOpacity: 0,
    health: 100,
  };
}

function App() {
  const [gameState, setGameState] = useState<GameStateData>(createInitialState);
  const lastTimeRef = useRef<number>(0);
  const animationRef = useRef<number>(0);
  const trapFlashTimerRef = useRef<number>(0);
  const [isPathCalculating, setIsPathCalculating] = useState(false);

  const updateExplored = useCallback((maze: Cell[][], pos: Position): Cell[][] => {
    const newMaze = maze.map((row) => row.map((cell) => ({ ...cell })));
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = pos.x + dx;
        const ny = pos.y + dy;
        if (nx >= 0 && nx < MAZE_WIDTH && ny >= 0 && ny < MAZE_HEIGHT) {
          if (Math.abs(dx) + Math.abs(dy) <= 2) {
            newMaze[ny][nx].explored = true;
          }
        }
      }
    }
    return newMaze;
  }, []);

  const handlePlayerMove = useCallback(
    (newPos: Position, direction: Direction) => {
      setGameState((prev) => {
        if (prev.gameStatus !== 'playing') return prev;

        const isTrapCell = isTrap(prev.traps, newPos.x, newPos.y);
        let newMaze = updateExplored(prev.maze, newPos);

        let newSlowTimer = prev.slowTimer;
        let newIsSlowed = prev.isSlowed;
        let newDarkVisionTimer = prev.darkVisionTimer;
        let newDarkVision = prev.darkVision;
        let newTrapFlashActive = prev.trapFlashActive;
        let newHealth = prev.health;

        if (isTrapCell) {
          newIsSlowed = true;
          newSlowTimer = SLOW_DURATION;
          newDarkVision = true;
          newDarkVisionTimer = DARK_VISION_DURATION;
          newTrapFlashActive = true;
          newHealth = Math.max(0, newHealth - 10);
          trapFlashTimerRef.current = TRAP_FLASH_DURATION;
        }

        let newStatus: GameStatus = prev.gameStatus;
        if (newPos.x === prev.endPos.x && newPos.y === prev.endPos.y) {
          newStatus = 'won';
        }

        if (checkPlayerCaught(prev.ais, newPos)) {
          newStatus = 'lost';
        }

        return {
          ...prev,
          playerPos: newPos,
          playerDirection: direction,
          maze: newMaze,
          isSlowed: newIsSlowed,
          slowTimer: newSlowTimer,
          darkVision: newDarkVision,
          darkVisionTimer: newDarkVisionTimer,
          trapFlashActive: newTrapFlashActive,
          health: newHealth,
          gameStatus: newStatus,
        };
      });
    },
    [updateExplored]
  );

  const handleShowPath = useCallback((show: boolean) => {
    setGameState((prev) => {
      if (prev.pathCooldown > 0 && show) return prev;
      return { ...prev, showPath: show };
    });
  }, []);

  const handleAIUpdate = useCallback((newAis: AIState[]) => {
    setGameState((prev) => {
      if (prev.gameStatus !== 'playing') return prev;

      const caught = newAis.some(
        (ai) => ai.position.x === prev.playerPos.x && ai.position.y === prev.playerPos.y
      );

      return {
        ...prev,
        ais: newAis,
        gameStatus: caught ? 'lost' : prev.gameStatus,
      };
    });
  }, []);

  const handleRestart = useCallback(() => {
    const newState = createInitialState();
    setGameState(newState);
    trapFlashTimerRef.current = 0;
    lastTimeRef.current = 0;
  }, []);

  useEffect(() => {
    if (!gameState.showPath || gameState.gameStatus !== 'playing') {
      return;
    }

    setIsPathCalculating(true);
    const result = findPathWithTimeout(
      gameState.maze,
      gameState.playerPos,
      gameState.endPos,
      [],
      20
    );

    setTimeout(() => {
      setGameState((prev) => ({
        ...prev,
        shortestPath: result.path,
        pathOpacity: result.timedOut ? 0 : 1,
      }));
      setIsPathCalculating(false);
    }, 0);
  }, [gameState.showPath, gameState.playerPos, gameState.maze, gameState.endPos, gameState.gameStatus]);

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }

      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      setGameState((prev) => {
        if (prev.gameStatus !== 'playing') return prev;

        let newElapsedTime = prev.elapsedTime + deltaTime / 1000;
        let newPathCooldown = Math.max(0, prev.pathCooldown - deltaTime);
        let newSlowTimer = Math.max(0, prev.slowTimer - deltaTime);
        let newDarkVisionTimer = Math.max(0, prev.darkVisionTimer - deltaTime);
        let newIsSlowed = newSlowTimer > 0;
        let newDarkVision = newDarkVisionTimer > 0;

        if (trapFlashTimerRef.current > 0) {
          trapFlashTimerRef.current -= deltaTime;
        }
        let newTrapFlashActive = trapFlashTimerRef.current > 0;

        let newPathOpacity = prev.pathOpacity;
        if (prev.showPath && prev.shortestPath.length > 0) {
          newPathOpacity = Math.min(1, prev.pathOpacity + deltaTime / 300);
        } else {
          newPathOpacity = Math.max(0, prev.pathOpacity - deltaTime / 300);
        }

        return {
          ...prev,
          elapsedTime: newElapsedTime,
          pathCooldown: newPathCooldown,
          slowTimer: newSlowTimer,
          darkVisionTimer: newDarkVisionTimer,
          isSlowed: newIsSlowed,
          darkVision: newDarkVision,
          trapFlashActive: newTrapFlashActive,
          pathOpacity: newPathOpacity,
        };
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  useEffect(() => {
    if (gameState.showPath && gameState.pathCooldown === 0 && gameState.shortestPath.length > 0) {
      setGameState((prev) => ({
        ...prev,
        pathCooldown: PATH_COOLDOWN,
      }));
    }
  }, [gameState.showPath, gameState.pathCooldown, gameState.shortestPath.length]);

  return (
    <div className="game-app">
      <h1 className="game-title">迷宫探索</h1>

      <div className="game-container">
        <div className="left-panel">
          <StatusPanel
            health={gameState.health}
            position={gameState.playerPos}
            elapsedTime={gameState.elapsedTime}
            pathCooldown={gameState.pathCooldown}
            gameStatus={gameState.gameStatus}
            isSlowed={gameState.isSlowed}
            onRestart={handleRestart}
          />
        </div>

        <div className="maze-wrapper">
          <Maze
            maze={gameState.maze}
            playerPos={gameState.playerPos}
            ais={gameState.ais}
            shortestPath={gameState.shortestPath}
            showPath={gameState.showPath && gameState.shortestPath.length > 0}
            traps={gameState.traps}
            trapFlashActive={gameState.trapFlashActive}
            darkVision={gameState.darkVision}
            pathOpacity={gameState.pathOpacity}
          />

          {isPathCalculating && (
            <div className="path-loading">
              <div className="loading-spinner" />
              <span>计算路径中...</span>
            </div>
          )}
        </div>

        <div className="right-panel">
          <MiniMap
            maze={gameState.maze}
            playerPos={gameState.playerPos}
            ais={gameState.ais}
            endPos={gameState.endPos}
          />
        </div>
      </div>

      <PlayerController
        playerPos={gameState.playerPos}
        maze={gameState.maze}
        isSlowed={gameState.isSlowed}
        baseSpeed={PLAYER_BASE_SPEED}
        gameStatus={gameState.gameStatus}
        onMove={handlePlayerMove}
        onShowPath={handleShowPath}
        pathCooldown={gameState.pathCooldown}
        onRestart={handleRestart}
      />

      <AIController
        ais={gameState.ais}
        maze={gameState.maze}
        playerPos={gameState.playerPos}
        traps={gameState.traps}
        gameStatus={gameState.gameStatus}
        onUpdate={handleAIUpdate}
      />
    </div>
  );
}

export default App;
