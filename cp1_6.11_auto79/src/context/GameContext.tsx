import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { GameState, Level, Command, RobotState, Direction, GameStatus, Position } from '../types';
import { generateLevels } from '../utils/levelGenerator';

type GameAction =
  | { type: 'SET_LEVEL'; levelId: number }
  | { type: 'SET_COMMANDS'; commands: Command[] }
  | { type: 'ADD_COMMAND'; command: Command; index?: number }
  | { type: 'REMOVE_COMMAND'; commandId: string }
  | { type: 'UPDATE_COMMAND'; commandId: string; updates: Partial<Command> }
  | { type: 'RESET_ROBOT' }
  | { type: 'SET_ROBOT'; robot: RobotState }
  | { type: 'SET_GAME_STATUS'; status: GameStatus }
  | { type: 'SET_RUNNING'; running: boolean }
  | { type: 'SET_CURRENT_COMMAND_INDEX'; index: number }
  | { type: 'SET_HIGHLIGHTED_BRANCH'; branch: 'then' | 'else' | null }
  | { type: 'COLLECT_FRAGMENT'; fragmentId: string }
  | { type: 'RESET_GAME' };

const initialLevels = generateLevels();
const currentLevel = initialLevels[0];

const initialState: GameState = {
  levels: initialLevels,
  currentLevelId: 1,
  commands: [],
  robot: {
    position: { ...currentLevel.start },
    direction: 'right',
    collectedFragments: [],
    steps: 0,
  },
  gameStatus: 'idle',
  isRunning: false,
  currentCommandIndex: -1,
  highlightedBranch: null,
};

function getCurrentLevel(state: GameState): Level {
  return state.levels.find(l => l.id === state.currentLevelId) || state.levels[0];
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_LEVEL': {
      const level = state.levels.find(l => l.id === action.levelId);
      if (!level) return state;
      return {
        ...state,
        currentLevelId: action.levelId,
        robot: {
          position: { ...level.start },
          direction: 'right',
          collectedFragments: [],
          steps: 0,
        },
        gameStatus: 'idle',
        isRunning: false,
        currentCommandIndex: -1,
        highlightedBranch: null,
      };
    }
    case 'SET_COMMANDS':
      return { ...state, commands: action.commands };
    case 'ADD_COMMAND': {
      const commands = [...state.commands];
      if (action.index !== undefined) {
        commands.splice(action.index, 0, action.command);
      } else {
        commands.push(action.command);
      }
      return { ...state, commands };
    }
    case 'REMOVE_COMMAND': {
      return {
        ...state,
        commands: state.commands.filter(c => c.id !== action.commandId),
      };
    }
    case 'UPDATE_COMMAND': {
      return {
        ...state,
        commands: state.commands.map(c =>
          c.id === action.commandId ? { ...c, ...action.updates } : c
        ),
      };
    }
    case 'RESET_ROBOT': {
      const level = getCurrentLevel(state);
      return {
        ...state,
        robot: {
          position: { ...level.start },
          direction: 'right',
          collectedFragments: [],
          steps: 0,
        },
        gameStatus: 'idle',
        currentCommandIndex: -1,
        highlightedBranch: null,
      };
    }
    case 'SET_ROBOT':
      return { ...state, robot: action.robot };
    case 'SET_GAME_STATUS':
      return { ...state, gameStatus: action.status };
    case 'SET_RUNNING':
      return { ...state, isRunning: action.running };
    case 'SET_CURRENT_COMMAND_INDEX':
      return { ...state, currentCommandIndex: action.index };
    case 'SET_HIGHLIGHTED_BRANCH':
      return { ...state, highlightedBranch: action.branch };
    case 'COLLECT_FRAGMENT': {
      if (state.robot.collectedFragments.includes(action.fragmentId)) {
        return state;
      }
      return {
        ...state,
        robot: {
          ...state.robot,
          collectedFragments: [...state.robot.collectedFragments, action.fragmentId],
        },
      };
    }
    case 'RESET_GAME': {
      const level = getCurrentLevel(state);
      return {
        ...state,
        robot: {
          position: { ...level.start },
          direction: 'right',
          collectedFragments: [],
          steps: 0,
        },
        gameStatus: 'idle',
        isRunning: false,
        currentCommandIndex: -1,
        highlightedBranch: null,
      };
    }
    default:
      return state;
  }
}

interface GameContextType {
  state: GameState;
  currentLevel: Level;
  setLevel: (levelId: number) => void;
  setCommands: (commands: Command[]) => void;
  addCommand: (command: Command, index?: number) => void;
  removeCommand: (commandId: string) => void;
  updateCommand: (commandId: string, updates: Partial<Command>) => void;
  resetRobot: () => void;
  setRobot: (robot: RobotState) => void;
  setGameStatus: (status: GameStatus) => void;
  setRunning: (running: boolean) => void;
  setCurrentCommandIndex: (index: number) => void;
  setHighlightedBranch: (branch: 'then' | 'else' | null) => void;
  collectFragment: (fragmentId: string) => void;
  resetGame: () => void;
  moveForward: () => boolean;
  turnLeft: () => void;
  turnRight: () => void;
  isWallAhead: () => boolean;
  isAtEnd: () => boolean;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const currentLevel = getCurrentLevel(state);

  const setLevel = useCallback((levelId: number) => {
    dispatch({ type: 'SET_LEVEL', levelId });
  }, []);

  const setCommands = useCallback((commands: Command[]) => {
    dispatch({ type: 'SET_COMMANDS', commands });
  }, []);

  const addCommand = useCallback((command: Command, index?: number) => {
    dispatch({ type: 'ADD_COMMAND', command, index });
  }, []);

  const removeCommand = useCallback((commandId: string) => {
    dispatch({ type: 'REMOVE_COMMAND', commandId });
  }, []);

  const updateCommand = useCallback((commandId: string, updates: Partial<Command>) => {
    dispatch({ type: 'UPDATE_COMMAND', commandId, updates });
  }, []);

  const resetRobot = useCallback(() => {
    dispatch({ type: 'RESET_ROBOT' });
  }, []);

  const setRobot = useCallback((robot: RobotState) => {
    dispatch({ type: 'SET_ROBOT', robot });
  }, []);

  const setGameStatus = useCallback((status: GameStatus) => {
    dispatch({ type: 'SET_GAME_STATUS', status });
  }, []);

  const setRunning = useCallback((running: boolean) => {
    dispatch({ type: 'SET_RUNNING', running });
  }, []);

  const setCurrentCommandIndex = useCallback((index: number) => {
    dispatch({ type: 'SET_CURRENT_COMMAND_INDEX', index });
  }, []);

  const setHighlightedBranch = useCallback((branch: 'then' | 'else' | null) => {
    dispatch({ type: 'SET_HIGHLIGHTED_BRANCH', branch });
  }, []);

  const collectFragment = useCallback((fragmentId: string) => {
    dispatch({ type: 'COLLECT_FRAGMENT', fragmentId });
  }, []);

  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET_GAME' });
  }, []);

  const getNextPosition = useCallback((pos: Position, dir: Direction): Position => {
    switch (dir) {
      case 'up': return { x: pos.x, y: pos.y - 1 };
      case 'down': return { x: pos.x, y: pos.y + 1 };
      case 'left': return { x: pos.x - 1, y: pos.y };
      case 'right': return { x: pos.x + 1, y: pos.y };
    }
  }, []);

  const isWallAhead = useCallback((): boolean => {
    const nextPos = getNextPosition(state.robot.position, state.robot.direction);
    const level = getCurrentLevel(state);
    if (nextPos.x < 0 || nextPos.x >= level.size || nextPos.y < 0 || nextPos.y >= level.size) {
      return true;
    }
    return level.grid[nextPos.y][nextPos.x] === 'wall';
  }, [state.robot.position, state.robot.direction, getNextPosition, currentLevel]);

  const isAtEnd = useCallback((): boolean => {
    const level = getCurrentLevel(state);
    return state.robot.position.x === level.end.x && state.robot.position.y === level.end.y;
  }, [state.robot.position, currentLevel]);

  const moveForward = useCallback((): boolean => {
    const nextPos = getNextPosition(state.robot.position, state.robot.direction);
    const level = getCurrentLevel(state);

    if (nextPos.x < 0 || nextPos.x >= level.size || nextPos.y < 0 || nextPos.y >= level.size) {
      return false;
    }
    if (level.grid[nextPos.y][nextPos.x] === 'wall') {
      return false;
    }

    const newRobot = {
      ...state.robot,
      position: nextPos,
      steps: state.robot.steps + 1,
    };

    const fragment = level.fragments.find(
      f => f.position.x === nextPos.x && f.position.y === nextPos.y && !state.robot.collectedFragments.includes(f.id)
    );
    if (fragment) {
      newRobot.collectedFragments = [...state.robot.collectedFragments, fragment.id];
    }

    dispatch({ type: 'SET_ROBOT', robot: newRobot });
    return true;
  }, [state.robot, getNextPosition, currentLevel]);

  const turnLeft = useCallback(() => {
    const directions: Direction[] = ['up', 'left', 'down', 'right'];
    const currentIndex = directions.indexOf(state.robot.direction);
    const newDirection = directions[(currentIndex + 1) % 4];
    dispatch({
      type: 'SET_ROBOT',
      robot: { ...state.robot, direction: newDirection, steps: state.robot.steps + 1 },
    });
  }, [state.robot]);

  const turnRight = useCallback(() => {
    const directions: Direction[] = ['up', 'right', 'down', 'left'];
    const currentIndex = directions.indexOf(state.robot.direction);
    const newDirection = directions[(currentIndex + 1) % 4];
    dispatch({
      type: 'SET_ROBOT',
      robot: { ...state.robot, direction: newDirection, steps: state.robot.steps + 1 },
    });
  }, [state.robot]);

  const value: GameContextType = {
    state,
    currentLevel,
    setLevel,
    setCommands,
    addCommand,
    removeCommand,
    updateCommand,
    resetRobot,
    setRobot,
    setGameStatus,
    setRunning,
    setCurrentCommandIndex,
    setHighlightedBranch,
    collectFragment,
    resetGame,
    moveForward,
    turnLeft,
    turnRight,
    isWallAhead,
    isAtEnd,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
