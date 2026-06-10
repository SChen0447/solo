import React, { useState, useRef, useEffect } from 'react';
import { Task, ProgressStatus } from '../types';

interface TaskNodeProps {
  task: Task;
  isOnCriticalPath: boolean;
  onContextMenu: (e: React.MouseEvent, taskId: string) => void;
  onDoubleClick: (task: Task) => void;
  onDragStart: (taskId: string) => void;
  onDragEnd: (taskId: string) => void;
  nodeWidth: number;
}

const getProgressColor = (progress: number): ProgressStatus => {
  if (progress <= 30) return 'danger';
  if (progress <= 70) return 'warning';
  return 'success';
};

const getProgressBarColor = (status: ProgressStatus): string => {
  switch (status) {
    case 'danger': return '#e74c3c';
    case 'warning': return '#f1c40f';
    case 'success': return '#2ecc71';
  }
};

export const TaskNode: React.FC<TaskNodeProps> = ({
  task,
  isOnCriticalPath,
  onContextMenu,
  onDoubleClick,
  onDragStart,
  onDragEnd,
  nodeWidth
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const status = getProgressColor(task.progress);
  const barColor = getProgressBarColor(status);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    pressTimer.current = window.setTimeout(() => {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 300);
    }, 200);
  };

  const handleMouseUp = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    onDragStart(task.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnd(task.id);
  };

  useEffect(() => {
    return () => {
      if (pressTimer.current) {
        clearTimeout(pressTimer.current);
      }
    };
  }, []);

  return (
    <div
      className={`task-node ${isOnCriticalPath ? 'critical-path' : ''} ${isDragging ? 'dragging' : ''} ${isFlashing ? 'flashing' : ''}`}
      draggable
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => onContextMenu(e, task.id)}
      onDoubleClick={() => onDoubleClick(task)}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{ width: nodeWidth }}
    >
      <div className="task-progress-bar" style={{ backgroundColor: barColor, height: `${task.progress}%` }} />
      <div className="task-content">
        <div className="task-name" title={task.name}>{task.name}</div>
        <div className="task-progress-row">
          <div className="task-progress-track">
            <div
              className="task-progress-fill"
              style={{ width: `${task.progress}%`, backgroundColor: barColor }}
            />
          </div>
          <span className="task-progress-text">{task.progress}%</span>
        </div>
        <div className="task-assignee">
          <span className="assignee-icon">👤</span>
          {task.assignee}
        </div>
        <div className="task-deadline">
          📅 {task.endDate}
        </div>
      </div>
    </div>
  );
};
