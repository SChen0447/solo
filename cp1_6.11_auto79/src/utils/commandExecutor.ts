import { Command, Direction } from '../types';

export interface ExecutionCallbacks {
  onForward: () => boolean;
  onTurnLeft: () => void;
  onTurnRight: () => void;
  isWallAhead: () => boolean;
  onStep: () => Promise<void>;
  onHighlightBranch: (branch: 'then' | 'else' | null) => void;
  onSetCommandIndex: (index: number) => void;
}

export async function executeCommands(
  commands: Command[],
  callbacks: ExecutionCallbacks
): Promise<boolean> {
  let success = true;

  for (let i = 0; i < commands.length; i++) {
    callbacks.onSetCommandIndex(i);
    const result = await executeCommand(commands[i], callbacks);
    if (!result) {
      success = false;
      break;
    }
  }

  callbacks.onSetCommandIndex(-1);
  return success;
}

async function executeCommand(
  command: Command,
  callbacks: ExecutionCallbacks
): Promise<boolean> {
  switch (command.type) {
    case 'forward': {
      await callbacks.onStep();
      const success = callbacks.onForward();
      return success;
    }
    case 'turnLeft': {
      await callbacks.onStep();
      callbacks.onTurnLeft();
      return true;
    }
    case 'turnRight': {
      await callbacks.onStep();
      callbacks.onTurnRight();
      return true;
    }
    case 'repeat': {
      const count = command.repeatCount || 2;
      const children = command.children || [];
      for (let r = 0; r < count; r++) {
        for (const child of children) {
          const result = await executeCommand(child, callbacks);
          if (!result) return false;
        }
      }
      return true;
    }
    case 'ifWall': {
      const wallAhead = callbacks.isWallAhead();
      if (wallAhead) {
        callbacks.onHighlightBranch('then');
        const thenBranch = command.thenBranch || [];
        for (const child of thenBranch) {
          const result = await executeCommand(child, callbacks);
          if (!result) {
            callbacks.onHighlightBranch(null);
            return false;
          }
        }
        callbacks.onHighlightBranch(null);
      } else {
        callbacks.onHighlightBranch('else');
        const elseBranch = command.elseBranch || [];
        for (const child of elseBranch) {
          const result = await executeCommand(child, callbacks);
          if (!result) {
            callbacks.onHighlightBranch(null);
            return false;
          }
        }
        callbacks.onHighlightBranch(null);
      }
      return true;
    }
    default:
      return true;
  }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function createCommand(type: Command['type']): Command {
  const cmd: Command = {
    id: generateId(),
    type,
  };

  if (type === 'repeat') {
    cmd.repeatCount = 2;
    cmd.children = [];
  }

  if (type === 'ifWall') {
    cmd.conditionType = 'wallAhead';
    cmd.thenBranch = [];
    cmd.elseBranch = [];
  }

  return cmd;
}

export function getDirectionAngle(direction: Direction): number {
  switch (direction) {
    case 'up': return -90;
    case 'right': return 0;
    case 'down': return 90;
    case 'left': return 180;
  }
}
