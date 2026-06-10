export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: number;
  deadline: number;
}

export interface InspirationFragment {
  id: string;
  projectId: string;
  text: string;
  imagePath: string;
  color: string;
  x: number;
  y: number;
}

export type Priority = 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: string;
  projectId: string;
  fragmentId: string | null;
  name: string;
  priority: Priority;
  status: TaskStatus;
}

export interface FragmentConnection {
  id: string;
  fragmentAId: string;
  fragmentBId: string;
  relevance: number;
}

export interface AppData {
  projects: Project[];
  fragments: InspirationFragment[];
  tasks: Task[];
  connections: FragmentConnection[];
}

export type View = 'projects' | 'editor' | 'map';
