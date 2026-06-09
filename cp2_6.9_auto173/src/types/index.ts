export type TaskStatus = 'todo' | 'inprogress' | 'done';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface User {
  id: string;
  name: string;
  initial: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string | null;
  deadline: string | null;
  createdAt: number;
  comments?: Comment[];
}

export interface Project {
  id: string;
  name: string;
  client: string;
  deadline: string;
  color: string;
  createdAt: number;
  stats?: {
    total: number;
    completed: number;
    inprogress: number;
    todo: number;
  };
}

export interface Message {
  id: string;
  projectId: string;
  sender: string;
  content: string;
  timestamp: number;
}

export interface Comment {
  id: string;
  taskId: string;
  sender: string;
  content: string;
  timestamp: number;
}

export interface OverviewStats {
  total: number;
  completed: number;
  inprogress: number;
  overdue: number;
}

export type Page = 'projects' | 'overview' | 'kanban';

export interface AppContextType {
  projects: Project[];
  tasks: Task[];
  users: User[];
  currentPage: Page;
  currentProjectId: string | null;
  selectedTask: Task | null;
  loadProjects: () => Promise<void>;
  loadTasks: (projectId: string) => Promise<void>;
  loadUsers: () => Promise<void>;
  createProject: (name: string, client: string, deadline: string) => Promise<Project | null>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  createTask: (task: Omit<Task, 'id' | 'status' | 'createdAt'>) => Promise<void>;
  sendMessage: (projectId: string, sender: string, content: string) => Promise<void>;
  addComment: (taskId: string, sender: string, content: string) => Promise<void>;
  navigateTo: (page: Page, projectId?: string) => void;
  setSelectedTask: (task: Task | null) => void;
}
