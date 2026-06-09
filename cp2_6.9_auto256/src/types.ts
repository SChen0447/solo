export interface Comment {
  id: string;
  content: string;
  createdAt: number;
}

export interface Note {
  id: string;
  projectId: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  likes: number;
  comments: Comment[];
  createdAt: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
}
