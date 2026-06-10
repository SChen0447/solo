import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, PRIORITY_COLORS } from '../types';
import { useStore } from '../store';

interface TaskCardProps {
  task: Task;
  isFiltered?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, isFiltered = false }) => {
  const setSelectedTaskId = useStore((s) => s.setSelectedTaskId);
  const priorityColor = PRIORITY_COLORS[task.priority];

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: 'task', task } });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : isFiltered ? 0 : 1,
    pointerEvents: isFiltered ? 'none' : 'auto',
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const isOverdue = () => {
    if (!task.dueDate || task.columnId === 'done') return false;
    return new Date(task.dueDate) < new Date(new Date().toDateString());
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`task-card ${isDragging ? 'dragging' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedTaskId(task.id);
      }}
    >
      <div className="task-card__priority-bar" style={{ backgroundColor: priorityColor }} />
      <div className="task-card__content">
        <h4 className="task-card__title">{task.title}</h4>
        <div className="task-card__meta">
          {task.dueDate && (
            <span className={`task-card__date ${isOverdue() ? 'overdue' : ''}`}>
              📅 {formatDate(task.dueDate)}
            </span>
          )}
          {task.assignee && (
            <span className="task-card__assignee">👤 {task.assignee}</span>
          )}
        </div>
      </div>
    </div>
  );
};
