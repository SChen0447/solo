import React, { useState, useCallback } from 'react';
import TaskCard from './TaskCard';
import type { Task, TaskStatus } from '../types';
import { useAppContext } from '../context/AppContext';

interface ColumnConfig {
  key: TaskStatus;
  title: string;
  bgColor: string;
}

const COLUMNS: ColumnConfig[] = [
  { key: 'todo', title: '待办', bgColor: 'var(--column-todo)' },
  { key: 'inprogress', title: '进行中', bgColor: 'var(--column-inprogress)' },
  { key: 'done', title: '已完成', bgColor: 'var(--column-done)' }
];

interface KanbanBoardProps {
  projectId: string;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ projectId }) => {
  const { tasks, updateTask } = useAppContext();
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  const projectTasks = tasks.filter(t => t.projectId === projectId);

  const getTasksByStatus = (status: TaskStatus): Task[] => {
    return projectTasks.filter(t => t.status === status);
  };

  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const taskId = draggedTaskId || e.dataTransfer.getData('text/plain');
    setDragOverColumn(null);
    setDraggedTaskId(null);
    
    if (!taskId) return;
    
    const task = projectTasks.find(t => t.id === taskId);
    if (task && task.status !== status) {
      await updateTask(taskId, { status });
    }
  }, [draggedTaskId, projectTasks, updateTask]);

  const handleDragEnd = useCallback(() => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  }, []);

  return (
    <div style={{
      display: 'flex',
      gap: 20,
      padding: 24,
      width: '100%',
      minHeight: 'calc(100vh - 56px)',
      flexWrap: 'wrap'
    }}>
      {COLUMNS.map(column => {
        const columnTasks = getTasksByStatus(column.key);
        const isHighlighted = dragOverColumn === column.key;

        return (
          <div
            key={column.key}
            onDragOver={(e) => handleDragOver(e, column.key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.key)}
            style={{
              flex: '1 1 300px',
              minWidth: 300,
              backgroundColor: column.bgColor,
              borderRadius: 12,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              border: isHighlighted ? '3px dashed #64FFDA' : '3px solid transparent',
              transition: 'border 0.15s ease',
              minHeight: 400
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 4
            }}>
              <span style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#1E1E2E'
              }}>
                {column.title}
              </span>
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                backgroundColor: 'rgba(30, 30, 46, 0.1)',
                color: '#1E1E2E',
                padding: '2px 10px',
                borderRadius: 10,
                minWidth: 24,
                textAlign: 'center'
              }}>
                {columnTasks.length}
              </span>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              flex: 1
            }}>
              {columnTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isDragging={draggedTaskId === task.id}
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onDragEnd={handleDragEnd}
                />
              ))}
              {columnTasks.length === 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 40,
                  color: 'rgba(30, 30, 46, 0.3)',
                  fontSize: 13,
                  border: '2px dashed rgba(30, 30, 46, 0.1)',
                  borderRadius: 8
                }}>
                  拖拽任务到此处
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KanbanBoard;
