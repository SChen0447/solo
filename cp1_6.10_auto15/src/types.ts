export type Priority = 'urgent' | 'high' | 'medium' | 'low';

export type ColumnId = 'todo' | 'inProgress' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  dueDate: string | null;
  columnId: ColumnId;
  assignee: string;
  createdAt: number;
}

export interface Column {
  id: ColumnId;
  title: string;
  taskIds: string[];
}

export interface BurndownPoint {
  date: string;
  remaining: number;
}

export interface Project {
  id: string;
  name: string;
  columns: Record<ColumnId, Column>;
  tasks: Record<string, Task>;
  sprintDays: number;
  sprintStartDate: string;
  burndownHistory: BurndownPoint[];
  createdAt: number;
}

export type FilterType = 'all' | 'mine' | 'highPriority';

export const PRIORITY_COLORS: Record<Priority, string> = {
  urgent: '#E74C3C',
  high: '#E67E22',
  medium: '#F1C40F',
  low: '#27AE60',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: '紧急',
  high: '高',
  medium: '中',
  low: '低',
};

export const COLUMN_TITLES: Record<ColumnId, string> = {
  todo: '待办',
  inProgress: '进行中',
  done: '已完成',
};
