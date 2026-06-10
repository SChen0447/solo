export interface Task {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  progress: number;
  assignee: string;
  dependencies: string[];
  description?: string;
  notes?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface Dependency {
  source: string;
  target: string;
  description?: string;
  delayDays?: number;
}

export type ProgressStatus = 'danger' | 'warning' | 'success';

export interface NodePosition {
  id: string;
  x: number;
  y: number;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  taskId: string | null;
}

export interface TaskDetail {
  task: Task;
  predecessors: Task[];
  successors: Task[];
  completedDays: number;
}
