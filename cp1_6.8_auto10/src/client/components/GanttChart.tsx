import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import dayjs from 'dayjs';
import {
  DAY_WIDTH_MAP,
  ROW_HEIGHT,
  TASK_HEIGHT,
  HEADER_HEIGHT,
  getDateRange,
  getTimeColumns,
  dateToPosition,
  positionToDate,
  getPriorityColor,
  getTaskStatus,
  generatePath,
} from '../utils/gantt';
import type { Task, ViewMode, FilterOptions } from '../../types';

interface GanttChartProps {
  tasks: Task[];
  viewMode: ViewMode;
  filters: FilterOptions;
  selectedTaskId: string | null;
  onTaskSelect: (id: string | null) => void;
  onTaskUpdate: (id: string, data: Partial<Task>) => void;
  onTaskCreate: (data: Partial<Task>) => void;
  onChartClick: (date: string) => void;
  onAddDependency: (fromId: string, toId: string) => void;
  showBaseline: boolean;
  baselineTasks: Task[] | undefined;
}

type DragType = 'start' | 'end' | 'move' | 'progress' | 'dependency' | null;

interface DragState {
  type: DragType;
  taskId: string;
  startX: number;
  startY: number;
  originalStartDate?: string;
  originalEndDate?: string;
  originalProgress?: number;
  isCopy?: boolean;
  fromTaskId?: string;
  currentX?: number;
  currentY?: number;
  offsetDays?: number;
}

function GanttChart({
  tasks,
  viewMode,
  filters,
  selectedTaskId,
  onTaskSelect,
  onTaskUpdate,
  onTaskCreate,
  onChartClick,
  onAddDependency,
  showBaseline,
  baselineTasks,
}: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [tooltipDate, setTooltipDate] = useState<string | null>(null);
  const [copiedTask, setCopiedTask] = useState<Task | null>(null);

  const dayWidth = DAY_WIDTH_MAP[viewMode];

  const { start: startDate, end: endDate } = useMemo(() => {
    const allTasks = [...tasks];
    if (showBaseline && baselineTasks) {
      allTasks.push(...baselineTasks);
    }
    return getDateRange(allTasks, viewMode);
  }, [tasks, showBaseline, baselineTasks, viewMode]);

  const timeColumns = useMemo(
    () => getTimeColumns(startDate, endDate, viewMode),
    [startDate, endDate, viewMode]
  );

  const totalWidth = timeColumns.length * dayWidth;
  const totalHeight = tasks.length * ROW_HEIGHT + HEADER_HEIGHT;

  const filteredTaskIds = useMemo(() => {
    const filtered = tasks.filter(task => {
      if (filters.assignee && task.assignee !== filters.assignee) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.status) {
        const status = getTaskStatus(task);
        if (status !== filters.status) return false;
      }
      return true;
    });
    return new Set(filtered.map(t => t.id));
  }, [tasks, filters]);

  const getTaskRowIndex = useCallback((taskId: string) => {
    return tasks.findIndex(t => t.id === taskId);
  }, [tasks]);

  const handleMouseDown = useCallback((
    e: React.MouseEvent,
    taskId: string,
    type: DragType,
    offsetDays: number = 0
  ) => {
    e.stopPropagation();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const isCopy = e.ctrlKey || e.metaKey;

    setDragState({
      type,
      taskId,
      startX: e.clientX,
      startY: e.clientY,
      originalStartDate: task.startDate,
      originalEndDate: task.endDate,
      originalProgress: task.progress,
      isCopy,
      fromTaskId: type === 'dependency' ? taskId : undefined,
      offsetDays,
    });

    if (isCopy && type === 'move') {
      setCopiedTask({ ...task, id: 'copy-preview' });
    }
  }, [tasks]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState || !scrollContainerRef.current) return;

    const containerRect = scrollContainerRef.current.getBoundingClientRect();
    const scrollLeft = scrollContainerRef.current.scrollLeft;
    const x = e.clientX - containerRect.left + scrollLeft;

    if (dragState.type === 'dependency') {
      setDragState(prev => prev ? {
        ...prev,
        currentX: x,
        currentY: e.clientY - containerRect.top,
      } : null);
      return;
    }

    const diffX = e.clientX - dragState.startX;
    const diffDays = Math.round(diffX / dayWidth);

    const currentDate = positionToDate(x - 80, startDate, dayWidth);
    setTooltipDate(currentDate.format('YYYY-MM-DD'));
    setTooltipPos({ x: e.clientX, y: e.clientY - 40 });

    if (dragState.isCopy && dragState.type === 'move' && copiedTask) {
      const newStart = dayjs(dragState.originalStartDate!).add(diffDays, 'day');
      const newEnd = dayjs(dragState.originalEndDate!).add(diffDays, 'day');
      setCopiedTask(prev => prev ? {
        ...prev,
        startDate: newStart.format('YYYY-MM-DD'),
        endDate: newEnd.format('YYYY-MM-DD'),
      } : null);
      return;
    }

    if (dragState.type === 'start') {
      const newStart = dayjs(dragState.originalStartDate!).add(diffDays, 'day');
      const originalEnd = dayjs(dragState.originalEndDate!);
      if (newStart.isBefore(originalEnd)) {
        onTaskUpdate(dragState.taskId, { startDate: newStart.format('YYYY-MM-DD') });
      }
    } else if (dragState.type === 'end') {
      const newEnd = dayjs(dragState.originalEndDate!).add(diffDays, 'day');
      const originalStart = dayjs(dragState.originalStartDate!);
      if (newEnd.isAfter(originalStart)) {
        onTaskUpdate(dragState.taskId, { endDate: newEnd.format('YYYY-MM-DD') });
      }
    } else if (dragState.type === 'move') {
      const duration = dayjs(dragState.originalEndDate!).diff(dayjs(dragState.originalStartDate!), 'day');
      const newStart = dayjs(dragState.originalStartDate!).add(diffDays, 'day');
      const newEnd = newStart.add(duration, 'day');
      onTaskUpdate(dragState.taskId, {
        startDate: newStart.format('YYYY-MM-DD'),
        endDate: newEnd.format('YYYY-MM-DD'),
      });
    } else if (dragState.type === 'progress') {
      const task = tasks.find(t => t.id === dragState.taskId);
      if (task) {
        const taskStartX = dateToPosition(task.startDate, startDate, dayWidth);
        const taskWidth = (dayjs(task.endDate).diff(dayjs(task.startDate), 'day') + 1) * dayWidth;
        const progressX = x - taskStartX;
        const newProgress = Math.max(0, Math.min(100, Math.round((progressX / taskWidth) * 100)));
        onTaskUpdate(dragState.taskId, { progress: newProgress });
      }
    }
  }, [dragState, dayWidth, startDate, onTaskUpdate, tasks, copiedTask]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!dragState) return;

    if (dragState.type === 'dependency') {
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const taskElement = target?.closest('[data-task-id]');
      if (taskElement) {
        const toTaskId = taskElement.getAttribute('data-task-id');
        if (toTaskId && toTaskId !== dragState.fromTaskId) {
          onAddDependency(dragState.fromTaskId!, toTaskId);
        }
      }
    }

    if (dragState.isCopy && dragState.type === 'move' && copiedTask) {
      const diffX = e.clientX - dragState.startX;
      const diffDays = Math.round(diffX / dayWidth);
      const newStart = dayjs(dragState.originalStartDate!).add(diffDays, 'day');
      const newEnd = dayjs(dragState.originalEndDate!).add(diffDays, 'day');
      
      const originalTask = tasks.find(t => t.id === dragState.taskId);
      if (originalTask) {
        onTaskCreate({
          ...originalTask,
          name: `${originalTask.name} (副本)`,
          startDate: newStart.format('YYYY-MM-DD'),
          endDate: newEnd.format('YYYY-MM-DD'),
          progress: 0,
          dependencies: [...originalTask.dependencies],
        });
      }
    }

    setDragState(null);
    setTooltipDate(null);
    setCopiedTask(null);
  }, [dragState, dayWidth, copiedTask, tasks, onTaskUpdate, onAddDependency]);

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = dragState.type === 'move' ? 'grabbing' : 'ew-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, handleMouseMove, handleMouseUp]);

  const handleChartClick = useCallback((e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    
    const rect = scrollContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollContainerRef.current.scrollLeft - 200;
    const y = e.clientY - rect.top;

    if (y < HEADER_HEIGHT) return;

    const clickedDate = positionToDate(x, startDate, dayWidth);
    onChartClick(clickedDate.format('YYYY-MM-DD'));
  }, [startDate, dayWidth, onChartClick]);

  const handleTaskClick = useCallback((e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    if (dragState) return;
    onTaskSelect(taskId);
  }, [dragState, onTaskSelect]);

  const renderDependencyLines = () => {
    const lines: JSX.Element[] = [];
    let lineId = 0;

    tasks.forEach(task => {
      if (!filteredTaskIds.has(task.id)) return;
      
      task.dependencies.forEach(depId => {
        const fromTask = tasks.find(t => t.id === depId);
        if (!fromTask || !filteredTaskIds.has(depId)) return;

        const fromRowIndex = getTaskRowIndex(depId);
        const toRowIndex = getTaskRowIndex(task.id);
        
        if (fromRowIndex < 0 || toRowIndex < 0) return;

        const fromX = dateToPosition(fromTask.endDate, startDate, dayWidth) + dayWidth;
        const fromY = HEADER_HEIGHT + fromRowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
        
        const toX = dateToPosition(task.startDate, startDate, dayWidth);
        const toY = HEADER_HEIGHT + toRowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

        const path = generatePath(fromX, fromY, toX, toY);

        lines.push(
          <g key={`dep-${lineId++}`} className="dependency-line">
            <path
              d={path}
              fill="none"
              stroke="#95a5a6"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
          </g>
        );
      });
    });

    return lines;
  };

  const renderDependencyPreview = () => {
    if (!dragState || dragState.type !== 'dependency' || !dragState.currentX || !dragState.currentY) {
      return null;
    }

    const fromTask = tasks.find(t => t.id === dragState.fromTaskId);
    if (!fromTask) return null;

    const fromRowIndex = getTaskRowIndex(fromTask.id);
    const fromX = dateToPosition(fromTask.endDate, startDate, dayWidth) + dayWidth;
    const fromY = HEADER_HEIGHT + fromRowIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

    const path = generatePath(fromX, fromY, dragState.currentX - 200, dragState.currentY);

    return (
      <path
        d={path}
        fill="none"
        stroke="#3498db"
        strokeWidth="2"
        strokeDasharray="5,5"
        className="dependency-preview"
      />
    );
  };

  return (
    <div className="gantt-container" ref={containerRef}>
      <div className="gantt-scroll" ref={scrollContainerRef} onClick={handleChartClick}>
        <div className="gantt-inner" style={{ width: totalWidth, height: totalHeight }}>
          <svg
            className="gantt-svg"
            width={totalWidth}
            height={totalHeight}
            style={{ position: 'absolute', top: 0, left: 200, pointerEvents: 'none' }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#95a5a6" />
              </marker>
              <marker
                id="arrowhead-blue"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#3498db" />
              </marker>
            </defs>
            {renderDependencyLines()}
            {renderDependencyPreview()}
          </svg>

          <div className="gantt-header" style={{ height: HEADER_HEIGHT }}>
            <div className="gantt-header-sidebar" style={{ width: 200 }}>
              <span>任务名称</span>
            </div>
            <div 
              className="gantt-header-timeline"
              style={{ marginLeft: 200, height: HEADER_HEIGHT }}
            >
              <div className="timeline-row">
                {timeColumns.map((col, i) => (
                  <div
                    key={i}
                    className="timeline-cell"
                    style={{ width: dayWidth }}
                  >
                    {col.subLabel && (
                      <div className="timeline-month-label">{col.subLabel}</div>
                    )}
                    <div className="timeline-day-label">{col.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="gantt-body" style={{ marginTop: HEADER_HEIGHT }}>
            <div className="gantt-sidebar">
              {tasks.map(task => (
                <div
                  key={task.id}
                  className={`task-sidebar-item ${!filteredTaskIds.has(task.id) ? 'filtered-out' : ''} ${selectedTaskId === task.id ? 'selected' : ''}`}
                  style={{ height: ROW_HEIGHT }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTaskSelect(task.id);
                  }}
                >
                  <span className="task-name-text" title={task.name}>{task.name}</span>
                  {task.isWarning && <span className="warning-badge">!</span>}
                </div>
              ))}
            </div>

            <div className="gantt-task-area" style={{ marginLeft: 200 }}>
              {timeColumns.map((col, i) => (
                <div
                  key={i}
                  className={`grid-column ${col.date.day() === 0 || col.date.day() === 6 ? 'weekend' : ''}`}
                  style={{ left: i * dayWidth, width: dayWidth }}
                />
              ))}

              {showBaseline && baselineTasks?.map(blTask => {
                const rowIndex = tasks.findIndex(t => t.id === blTask.id);
                if (rowIndex < 0) return null;

                const taskLeft = dateToPosition(blTask.startDate, startDate, dayWidth);
                const taskWidth = (dayjs(blTask.endDate).diff(dayjs(blTask.startDate), 'day') + 1) * dayWidth;
                const taskTop = rowIndex * ROW_HEIGHT + (ROW_HEIGHT - TASK_HEIGHT) / 2;

                const currentTask = tasks.find(t => t.id === blTask.id);
                const hasDiff = currentTask && (
                  currentTask.startDate !== blTask.startDate ||
                  currentTask.endDate !== blTask.endDate
                );

                return (
                  <div
                    key={`baseline-${blTask.id}`}
                    className={`baseline-task ${hasDiff ? 'has-diff' : ''}`}
                    style={{
                      left: taskLeft,
                      top: taskTop,
                      width: taskWidth,
                      height: TASK_HEIGHT,
                    }}
                  />
                );
              })}

              {tasks.map(task => {
                const rowIndex = getTaskRowIndex(task.id);
                if (rowIndex < 0) return null;

                const taskLeft = dateToPosition(task.startDate, startDate, dayWidth);
                const taskWidth = Math.max(dayWidth, (dayjs(task.endDate).diff(dayjs(task.startDate), 'day') + 1) * dayWidth);
                const taskTop = rowIndex * ROW_HEIGHT + (ROW_HEIGHT - TASK_HEIGHT) / 2;
                const priorityColor = getPriorityColor(task.priority);
                const isFiltered = !filteredTaskIds.has(task.id);
                const isSelected = selectedTaskId === task.id;
                const isDragging = dragState?.taskId === task.id && !dragState.isCopy;

                return (
                  <div
                    key={task.id}
                    data-task-id={task.id}
                    className={`task-bar ${isSelected ? 'selected' : ''} ${isFiltered ? 'filtered-out' : ''} ${task.isWarning ? 'warning' : ''} ${isDragging ? 'dragging' : ''}`}
                    style={{
                      left: taskLeft,
                      top: taskTop,
                      width: taskWidth,
                      height: TASK_HEIGHT,
                      borderLeftColor: priorityColor,
                      transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                    onClick={(e) => handleTaskClick(e, task.id)}
                    onMouseDown={(e) => handleMouseDown(e, task.id, 'move')}
                  >
                    <div className="task-progress" style={{ width: `${task.progress}%` }} />
                    
                    <span className="task-label">{task.name}</span>
                    
                    <div
                      className="task-drag-handle task-drag-left"
                      onMouseDown={(e) => handleMouseDown(e, task.id, 'start')}
                    />
                    
                    <div
                      className="task-drag-handle task-drag-right"
                      onMouseDown={(e) => handleMouseDown(e, task.id, 'end')}
                    />

                    <div
                      className="task-dependency-handle"
                      onMouseDown={(e) => handleMouseDown(e, task.id, 'dependency')}
                    >
                      <span>→</span>
                    </div>

                    <div
                      className="task-progress-handle"
                      style={{ left: `${task.progress}%` }}
                      onMouseDown={(e) => handleMouseDown(e, task.id, 'progress')}
                    />
                  </div>
                );
              })}

              {copiedTask && dragState?.isCopy && (() => {
                const rowIndex = tasks.findIndex(t => t.id === dragState.taskId);
                if (rowIndex < 0) return null;

                const taskLeft = dateToPosition(copiedTask.startDate, startDate, dayWidth);
                const taskWidth = (dayjs(copiedTask.endDate).diff(dayjs(copiedTask.startDate), 'day') + 1) * dayWidth;
                const taskTop = (rowIndex + 0.3) * ROW_HEIGHT + (ROW_HEIGHT - TASK_HEIGHT) / 2;
                const priorityColor = getPriorityColor(copiedTask.priority);

                return (
                  <div
                    className="task-bar task-copy-ghost"
                    style={{
                      left: taskLeft,
                      top: taskTop,
                      width: taskWidth,
                      height: TASK_HEIGHT,
                      borderLeftColor: priorityColor,
                    }}
                  >
                    <span className="task-label">{copiedTask.name} (副本)</span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {tooltipDate && (
        <div
          className="date-tooltip"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          {tooltipDate}
        </div>
      )}
    </div>
  );
}

export default GanttChart;
