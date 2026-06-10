export enum Column {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done'
}

export enum Priority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export interface Member {
  id: string
  name: string
  color: string
  avatar: string
}

export interface SubTask {
  id: string
  title: string
  completed: boolean
}

export interface Task {
  id: string
  title: string
  description: string
  column: Column
  priority: Priority
  assigneeId: string
  dueDate: string
  startDate: string
  subtasks: SubTask[]
  createdAt: number
  updatedAt: number
}

export interface TeamData {
  name: string
  members: Member[]
}

export const MEMBER_COLORS = [
  '#E8A87C',
  '#85B3A9',
  '#B8A9C9',
  '#D4A574',
  '#7FA1B8',
  '#C9A87A'
]

export const PRIORITY_COLORS: Record<Priority, string> = {
  [Priority.HIGH]: '#E74C3C',
  [Priority.MEDIUM]: '#F1C40F',
  [Priority.LOW]: '#27AE60'
}

export const COLUMN_TITLES: Record<Column, string> = {
  [Column.TODO]: '待办',
  [Column.IN_PROGRESS]: '进行中',
  [Column.DONE]: '已完成'
}
