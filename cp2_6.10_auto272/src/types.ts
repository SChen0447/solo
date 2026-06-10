export interface ICropHistory {
  crop: string;
  plantDate: string;
  harvestDate: string;
  adopterId: string | null;
}

export interface ICropBed {
  id: string;
  bedNumber: string;
  location: string;
  currentCrop: string;
  plantDate: string;
  harvestDate: string;
  isReady: boolean;
  adopterId: string | null;
  history: ICropHistory[];
}

export interface IMember {
  id: string;
  username: string;
  avatar: string;
  points: number;
  createdAt: string;
}

export type TaskType = '浇水' | '除虫' | '施肥';

export interface ILaborRecord {
  id: string;
  cropBedId: string;
  date: string;
  taskType: TaskType;
  assigneeIds: string[];
  completed: boolean;
  completerId?: string;
  note?: string;
  photo?: string;
  completedAt?: string;
}

export interface INotification {
  id: string;
  title: string;
  content: string;
  recipientIds: string[];
  cropBedId?: string;
  isRead: boolean;
  isArchived: boolean;
  createdAt: string;
}

export interface IAppContext {
  currentUser: IMember | null;
  setCurrentUser: (user: IMember | null) => void;
  cropBeds: ICropBed[];
  members: IMember[];
  laborRecords: ILaborRecord[];
  notifications: INotification[];
  refreshData: () => Promise<void>;
  isAdmin: boolean;
}
