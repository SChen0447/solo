import React from 'react';
import type { Task, TaskPriority } from '../types';
import { useAppContext } from '../context/AppContext';

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  urgent: 'var(--priority-urgent)',
  high: 'var(--priority-high)',
  medium: 'var(--priority-medium)',
  low: 'var(--priority-low)'
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: '紧急',
  high: '高',
  medium: '中',
  low: '低'
};

const AVATAR_COLORS = ['#F06292', '#BA68C8', '#7986CB', '#4FC3F7', '#4DB6AC', '#81C784', '#FFD54F'];

const TaskCard: React.FC<TaskCardProps> = ({ task, isDragging, onDragStart, onDragEnd }) => {
  const { setSelectedTask, users } = useAppContext();
  const assignee = users.find(u => u.id === task.assignee);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTask(task);
  };

  const borderColor = PRIORITY_COLORS[task.priority];
  const avatarColor = AVATAR_COLORS[task.id.charCodeAt(task.id.length - 1) % AVATAR_COLORS.length];

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={handleClick}
      style={{
        width: '100%',
        height: 'auto',
        borderRadius: 8,
        backgroundColor: 'var(--card-white)',
        padding: 12,
        cursor: 'grab',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        transition: 'box-shadow 0.15s ease, transform 0.15s ease, opacity 0.15s ease',
        opacity: isDragging ? 0.5 : 1,
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none'
      }}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        backgroundColor: borderColor,
        borderBottomLeftRadius: 8,
        borderTopLeftRadius: 8
      }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 4 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 8
        }}>
          <span style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#1E1E2E',
            lineHeight: 1.4,
            flex: 1
          }}>
            {task.title}
          </span>
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 4,
            color: '#FFFFFF',
            backgroundColor: borderColor,
            flexShrink: 0
          }}>
            {PRIORITY_LABELS[task.priority]}
          </span>
        </div>

        {task.description && (
          <p style={{
            fontSize: 12,
            color: '#666',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {task.description}
          </p>
        )}

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 4
        }}>
          {assignee ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                backgroundColor: avatarColor,
                color: '#FFFFFF',
                fontSize: 10,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {assignee.initial}
              </span>
              <span style={{ fontSize: 11, color: '#666' }}>{assignee.name}</span>
            </div>
          ) : (
            <span style={{ fontSize: 11, color: '#999' }}>未指派</span>
          )}

          {task.deadline && (
            <span style={{
              fontSize: 11,
              color: '#888',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              {task.deadline}
            </span>
          )}
        </div>

        {task.comments && task.comments.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            color: '#888',
            paddingTop: 4,
            borderTop: '1px solid #f0f0f0'
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            {task.comments.length} 条评论
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
