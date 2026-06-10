import React, { useMemo, useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';
import { useStore } from '../store';
import { ColumnId, Task, COLUMN_TITLES } from '../types';

const COLUMNS: ColumnId[] = ['todo', 'inProgress', 'done'];

export const KanbanBoard: React.FC = () => {
  const project = useStore((s) => s.getCurrentProject());
  const moveTask = useStore((s) => s.moveTask);
  const addTask = useStore((s) => s.addTask);
  const getFilteredTasks = useStore((s) => s.getFilteredTasks);
  const searchQuery = useStore((s) => s.searchQuery);
  const filterType = useStore((s) => s.filterType);

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [filterVisible, setFilterVisible] = useState(true);
  const [newTaskColumn, setNewTaskColumn] = useState<ColumnId | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  useEffect(() => {
    setFilterVisible(false);
    const timer = setTimeout(() => setFilterVisible(true), 150);
    return () => clearTimeout(timer);
  }, [searchQuery, filterType]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const filteredTaskIds = useMemo(() => {
    if (!project) return new Set<string>();
    const filtered = getFilteredTasks(project.id);
    return new Set(filtered.map((t) => t.id));
  }, [project, getFilteredTasks, searchQuery, filterType]);

  const handleDragStart = (event: DragStartEvent) => {
    if (!project) return;
    const task = project.tasks[event.active.id as string];
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    if (!project) return;

    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const task = project.tasks[taskId];
    if (!task) return;

    const activeColumnId = task.columnId;
    let overColumnId: ColumnId;

    if (COLUMNS.includes(over.id as ColumnId)) {
      overColumnId = over.id as ColumnId;
    } else {
      const overTask = project.tasks[over.id as string];
      if (!overTask) return;
      overColumnId = overTask.columnId;
    }

    const fromTaskIds = project.columns[activeColumnId].taskIds;
    const toTaskIds =
      activeColumnId === overColumnId
        ? fromTaskIds
        : project.columns[overColumnId].taskIds;

    const oldIndex = fromTaskIds.indexOf(taskId);
    let newIndex: number;

    if (COLUMNS.includes(over.id as ColumnId)) {
      newIndex = toTaskIds.length;
    } else {
      newIndex = toTaskIds.indexOf(over.id as string);
      if (newIndex === -1) newIndex = toTaskIds.length;
    }

    if (activeColumnId === overColumnId && oldIndex === newIndex) return;

    if (activeColumnId === overColumnId) {
      const newOrder = arrayMove(fromTaskIds, oldIndex, newIndex);
      newOrder.forEach((id, idx) => {
        moveTask(project.id, id, activeColumnId, overColumnId, idx);
      });
    } else {
      moveTask(project.id, taskId, activeColumnId, overColumnId, newIndex);
    }
  };

  const handleAddTask = (columnId: ColumnId) => {
    if (!newTaskTitle.trim() || !project) return;
    addTask(project.id, newTaskTitle.trim(), columnId);
    setNewTaskTitle('');
    setNewTaskColumn(null);
  };

  if (!project) {
    return <div className="kanban-empty">暂无项目，请先创建一个项目</div>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-board">
        {COLUMNS.map((columnId) => {
          const column = project.columns[columnId];
          const taskIds = column.taskIds;

          return (
            <div key={columnId} className="kanban-column" data-column={columnId}>
              <div className="kanban-column__header">
                <h3 className="kanban-column__title">{COLUMN_TITLES[columnId]}</h3>
                <span className="kanban-column__count">{taskIds.length}</span>
              </div>

              <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                <div className="kanban-column__tasks" data-droppable={columnId}>
                  {taskIds.map((taskId) => {
                    const task = project.tasks[taskId];
                    if (!task) return null;
                    const isFiltered = !filteredTaskIds.has(taskId);
                    return (
                      <TaskCard
                        key={taskId}
                        task={task}
                        isFiltered={!filterVisible || isFiltered}
                      />
                    );
                  })}

                  {taskIds.length === 0 && (
                    <div className="kanban-column__empty">拖拽任务到这里</div>
                  )}
                </div>
              </SortableContext>

              <div className="kanban-column__add">
                {newTaskColumn === columnId ? (
                  <div className="kanban-column__add-form">
                    <input
                      type="text"
                      autoFocus
                      placeholder="输入任务标题..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddTask(columnId);
                        if (e.key === 'Escape') {
                          setNewTaskColumn(null);
                          setNewTaskTitle('');
                        }
                      }}
                      onBlur={() => handleAddTask(columnId)}
                    />
                  </div>
                ) : (
                  <button
                    className="kanban-column__add-btn"
                    onClick={() => setNewTaskColumn(columnId)}
                  >
                    + 添加任务
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="task-card task-card--overlay">
            <div
              className="task-card__priority-bar"
              style={{ backgroundColor: activeTask.priority === 'urgent' ? '#E74C3C' : activeTask.priority === 'high' ? '#E67E22' : activeTask.priority === 'medium' ? '#F1C40F' : '#27AE60' }}
            />
            <div className="task-card__content">
              <h4 className="task-card__title">{activeTask.title}</h4>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
