import dayjs from 'dayjs';
import type { Task, ViewMode } from '../../types';

export const DAY_WIDTH_MAP: Record<ViewMode, number> = {
  week: 80,
  month: 30,
  quarter: 10,
};

export const ROW_HEIGHT = 50;
export const TASK_HEIGHT = 36;
export const HEADER_HEIGHT = 60;
export const SIDEBAR_WIDTH = 200;

export function getDateRange(tasks: Task[], viewMode: ViewMode): { start: dayjs.Dayjs; end: dayjs.Dayjs } {
  if (tasks.length === 0) {
    const today = dayjs();
    return {
      start: today.subtract(1, 'week'),
      end: today.add(4, 'week'),
    };
  }

  let minDate = dayjs(tasks[0].startDate);
  let maxDate = dayjs(tasks[0].endDate);

  tasks.forEach(task => {
    const start = dayjs(task.startDate);
    const end = dayjs(task.endDate);
    if (start.isBefore(minDate)) minDate = start;
    if (end.isAfter(maxDate)) maxDate = end;
  });

  const padding = viewMode === 'week' ? 3 : viewMode === 'month' ? 7 : 14;
  
  return {
    start: minDate.subtract(padding, 'day'),
    end: maxDate.add(padding, 'day'),
  };
}

export function getTimeColumns(start: dayjs.Dayjs, end: dayjs.Dayjs, viewMode: ViewMode): { date: dayjs.Dayjs; label: string; subLabel?: string }[] {
  const columns: { date: dayjs.Dayjs; label: string; subLabel?: string }[] = [];
  let current = start.clone();

  while (current.isBefore(end) || current.isSame(end, 'day')) {
    let label = '';
    let subLabel = '';

    if (viewMode === 'week') {
      label = current.format('MM/DD');
      subLabel = current.format('ddd');
    } else if (viewMode === 'month') {
      label = current.format('DD');
      if (current.date() === 1 || columns.length === 0) {
        subLabel = current.format('YYYY年MM月');
      }
    } else {
      label = current.format('MM月');
      if (current.date() === 1 || columns.length === 0) {
        subLabel = current.format('YYYY年');
      }
    }

    columns.push({ date: current.clone(), label, subLabel });
    current = current.add(1, 'day');
  }

  return columns;
}

export function dateToPosition(date: string, startDate: dayjs.Dayjs, dayWidth: number): number {
  const d = dayjs(date);
  const diffDays = d.diff(startDate, 'day');
  return diffDays * dayWidth;
}

export function positionToDate(position: number, startDate: dayjs.Dayjs, dayWidth: number): dayjs.Dayjs {
  const days = Math.round(position / dayWidth);
  return startDate.add(days, 'day');
}

export function getTaskStatus(task: Task): 'not-started' | 'in-progress' | 'completed' {
  if (task.progress >= 100) return 'completed';
  if (task.progress > 0) return 'in-progress';
  return 'not-started';
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high': return '#e74c3c';
    case 'medium': return '#f39c12';
    case 'low': return '#2ecc71';
    default: return '#95a5a6';
  }
}

export function generatePath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1);
  const controlOffset = Math.max(dx * 0.5, 30);
  
  return `M ${x1} ${y1} C ${x1 + controlOffset} ${y1}, ${x2 - controlOffset} ${y2}, ${x2} ${y2}`;
}
