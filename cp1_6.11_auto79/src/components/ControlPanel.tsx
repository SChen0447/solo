import { useState, DragEvent } from 'react';
import { useGame } from '../context/GameContext';
import { createCommand, executeCommands } from '../utils/commandExecutor';
import { Command, CommandType } from '../types';
import './ControlPanel.css';

interface DraggedItem {
  type: 'new' | 'existing';
  commandType?: CommandType;
  commandId?: string;
}

const COMMAND_TEMPLATES: { type: CommandType; label: string; icon: string; color: string }[] = [
  { type: 'forward', label: '前进', icon: '→', color: '#3498db' },
  { type: 'turnLeft', label: '左转', icon: '↺', color: '#9b59b6' },
  { type: 'turnRight', label: '右转', icon: '↻', color: '#e67e22' },
  { type: 'repeat', label: '重复', icon: '↻', color: '#27ae60' },
  { type: 'ifWall', label: '如果有墙', icon: '?', color: '#e74c3c' },
];

export default function ControlPanel() {
  const {
    state,
    setCommands,
    addCommand,
    removeCommand,
    updateCommand,
    resetGame,
    moveForward,
    turnLeft,
    turnRight,

    setGameStatus,
    setRunning,
    setCurrentCommandIndex,
    setHighlightedBranch,
    currentLevel,
  } = useGame();

  const { commands, isRunning, highlightedBranch, robot, currentCommandIndex } = state;
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: DragEvent<HTMLDivElement>, type: CommandType) => {
    setDraggedItem({ type: 'new', commandType: type });
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', type);
  };

  const handleExistingDragStart = (e: DragEvent<HTMLDivElement>, commandId: string) => {
    setDraggedItem({ type: 'existing', commandId });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', commandId);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, index?: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = draggedItem?.type === 'new' ? 'copy' : 'move';
    setDragOverIndex(index !== undefined ? index : commands.length);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, dropIndex?: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem) return;

    const targetIdx = dropIndex !== undefined ? dropIndex : commands.length;

    if (draggedItem.type === 'new' && draggedItem.commandType) {
      const newCommand = createCommand(draggedItem.commandType);
      addCommand(newCommand, targetIdx);
    } else if (draggedItem.type === 'existing' && draggedItem.commandId) {
      const fromIndex = commands.findIndex(c => c.id === draggedItem.commandId);
      if (fromIndex === -1) return;

      const newCommands = [...commands];
      const [removed] = newCommands.splice(fromIndex, 1);
      const insertIndex = fromIndex < targetIdx ? targetIdx - 1 : targetIdx;
      newCommands.splice(insertIndex, 0, removed);
      setCommands(newCommands);
    }

    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const handleRun = async () => {
    if (isRunning || commands.length === 0) return;

    resetGame();
    setRunning(true);
    setGameStatus('running');

    let currentPos = { ...currentLevel.start };
    let currentDir: typeof robot.direction = 'right';
    let collected: string[] = [];
    let hitWall = false;

    const directionDeltas: Record<string, { x: number; y: number }> = {
      right: { x: 1, y: 0 },
      left: { x: -1, y: 0 },
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
    };

    const turnLeftOrder: typeof robot.direction[] = ['up', 'left', 'down', 'right'];
    const turnRightOrder: typeof robot.direction[] = ['up', 'right', 'down', 'left'];

    const callbacks = {
      onForward: (): boolean => {
        const delta = directionDeltas[currentDir];
        const nextPos = { x: currentPos.x + delta.x, y: currentPos.y + delta.y };

        if (
          nextPos.x < 0 || nextPos.x >= currentLevel.size ||
          nextPos.y < 0 || nextPos.y >= currentLevel.size ||
          currentLevel.grid[nextPos.y][nextPos.x] === 'wall'
        ) {
          hitWall = true;
          moveForward();
          return false;
        }

        currentPos = nextPos;
        moveForward();

        const fragment = currentLevel.fragments.find(
          f => f.position.x === nextPos.x && f.position.y === nextPos.y && !collected.includes(f.id)
        );
        if (fragment) {
          collected.push(fragment.id);
        }

        return true;
      },
      onTurnLeft: () => {
        const idx = turnLeftOrder.indexOf(currentDir);
        currentDir = turnLeftOrder[(idx + 1) % 4];
        turnLeft();
      },
      onTurnRight: () => {
        const idx = turnRightOrder.indexOf(currentDir);
        currentDir = turnRightOrder[(idx + 1) % 4];
        turnRight();
      },
      isWallAhead: (): boolean => {
        const delta = directionDeltas[currentDir];
        const nextPos = { x: currentPos.x + delta.x, y: currentPos.y + delta.y };
        if (
          nextPos.x < 0 || nextPos.x >= currentLevel.size ||
          nextPos.y < 0 || nextPos.y >= currentLevel.size
        ) {
          return true;
        }
        return currentLevel.grid[nextPos.y][nextPos.x] === 'wall';
      },
      onStep: () => new Promise<void>(resolve => setTimeout(resolve, 300)),
      onHighlightBranch: (branch: 'then' | 'else' | null) => setHighlightedBranch(branch),
      onSetCommandIndex: (index: number) => setCurrentCommandIndex(index),
    };

    const success = await executeCommands(commands, callbacks);

    setHighlightedBranch(null);
    setCurrentCommandIndex(-1);

    const atEnd = currentPos.x === currentLevel.end.x && currentPos.y === currentLevel.end.y;

    if (!success || hitWall) {
      setGameStatus('failed');
      setTimeout(() => {
        resetGame();
      }, 1500);
    } else if (atEnd) {
      setGameStatus('success');
    } else {
      setGameStatus('idle');
    }

    setRunning(false);
  };

  const handleReset = () => {
    resetGame();
  };

  const handleRepeatCountChange = (commandId: string, count: number) => {
    updateCommand(commandId, { repeatCount: Math.max(2, Math.min(5, count)) });
  };

  const handleRemoveCommand = (commandId: string) => {
    removeCommand(commandId);
  };

  return (
    <div className="control-panel">
      <div className="command-library">
        <h3>指令库</h3>
        <div className="command-templates">
          {COMMAND_TEMPLATES.map(cmd => (
            <div
              key={cmd.type}
              className={`command-template command-${cmd.type}`}
              draggable
              onDragStart={(e) => handleDragStart(e, cmd.type)}
              style={{ borderColor: cmd.color }}
            >
              <span className="command-icon" style={{ background: cmd.color }}>{cmd.icon}</span>
              <span className="command-label">{cmd.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        className={`programming-area ${highlightedBranch ? `highlight-${highlightedBranch}` : ''}`}
        onDragOver={(e) => handleDragOver(e)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e)}
      >
        <h3>编程区域</h3>
        <div className="commands-list">
          {commands.length === 0 ? (
            <div className="empty-hint">将指令拖到这里</div>
          ) : (
            commands.map((cmd, index) => (
              <div
                key={cmd.id}
                className={`command-item command-${cmd.type} ${currentCommandIndex === index ? 'active' : ''} ${dragOverIndex === index ? 'drag-over-top' : ''} ${dragOverIndex === index + 1 ? 'drag-over-bottom' : ''}`}
                draggable
                onDragStart={(e) => handleExistingDragStart(e, cmd.id)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
              >
                <CommandBlock
                  command={cmd}
                  index={index}
                  onRemove={() => handleRemoveCommand(cmd.id)}
                  onRepeatChange={(count) => handleRepeatCountChange(cmd.id, count)}
                  isActive={currentCommandIndex === index}
                />
              </div>
            ))
          )}
          {dragOverIndex === commands.length && commands.length > 0 && (
            <div className="drag-indicator-bottom" />
          )}
        </div>
      </div>

      <div className="control-buttons">
        <button
          className="btn btn-run"
          onClick={handleRun}
          disabled={isRunning || commands.length === 0}
        >
          ▶ 运行
        </button>
        <button
          className="btn btn-reset"
          onClick={handleReset}
          disabled={isRunning}
        >
          ↺ 重置
        </button>
      </div>

      <div className="stats">
        <div className="stat-item">
          <span className="stat-label">步数：</span>
          <span className="stat-value">{robot.steps}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">碎片：</span>
          <span className="stat-value">
            {robot.collectedFragments.length}/{currentLevel.fragments.length}
          </span>
        </div>
      </div>
    </div>
  );
}

function CommandBlock({
  command,
  index,
  onRemove,
  onRepeatChange,
  isActive,
}: {
  command: Command;
  index: number;
  onRemove: () => void;
  onRepeatChange: (count: number) => void;
  isActive: boolean;
}) {
  const template = COMMAND_TEMPLATES.find(t => t.type === command.type);
  if (!template) return null;

  return (
    <div className={`command-block ${isActive ? 'active' : ''}`} style={{ borderColor: template.color }}>
      <span className="command-index">{index + 1}</span>
      <span className="command-icon" style={{ background: template.color }}>{template.icon}</span>
      <span className="command-name">{template.label}</span>

      {command.type === 'repeat' && (
        <div className="repeat-config">
          <span>×</span>
          <input
            type="number"
            min="2"
            max="5"
            value={command.repeatCount || 2}
            onChange={(e) => onRepeatChange(parseInt(e.target.value) || 2)}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {command.type === 'ifWall' && (
        <div className="if-wall-hint">前方有墙？</div>
      )}

      <button className="remove-btn" onClick={onRemove}>×</button>
    </div>
  );
}
