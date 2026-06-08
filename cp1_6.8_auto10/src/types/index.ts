export interface Task {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  priority: 'high' | 'medium' | 'low';
  assignee: string;
  description: string;
  progress: number;
  dependencies: string[];
  isWarning?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

export interface OnlineUser extends User {
  socketId: string;
  lastActive: number;
}

export interface Baseline {
  id: string;
  name: string;
  tasks: Task[];
  createdAt: string;
}

export type ViewMode = 'week' | 'month' | 'quarter';

export type WSActionType = 
  | 'task:create'
  | 'task:update'
  | 'task:delete'
  | 'dependency:add'
  | 'dependency:remove'
  | 'user:join'
  | 'user:leave'
  | 'baseline:set'
  | 'ping';

export interface WSMessage {
  type: WSActionType;
  payload: any;
  userId?: string;
  timestamp: number;
}

export interface FilterOptions {
  assignee: string;
  priority: string;
  status: string;
}
