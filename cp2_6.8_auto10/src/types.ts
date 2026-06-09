export type ActionStatus = 'todo' | 'in-progress' | 'done';

export interface ActionItem {
  id: string;
  description: string;
  assignee: string;
  dueDate: string;
  status: ActionStatus;
  meetingId: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  description: string;
  actionItems: ActionItem[];
  createdAt: number;
}
