export interface Project {
  id: number;
  title: string;
  description: string;
  summary: string;
  date: string;
  techStack: string[];
  imageUrl: string;
  icon: string;
}

export type ViewMode = '3d' | '2d';
