export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export interface PageContent {
  text: string;
  drawingData: DrawingStroke[];
  pageNumber: number;
}

export interface DrawingStroke {
  tool: 'pencil' | 'brush' | 'eraser';
  color: string;
  points: { x: number; y: number; pressure: number }[];
  timestamp: number;
}

export interface Capsule {
  id: string;
  userId: string;
  notebookId: string;
  title: string;
  encryptedContent: string;
  encryptionKey: string;
  openDate: Date;
  sealedAt: Date;
  isOpened: boolean;
  isShared: boolean;
  sharedWith: string[];
}

export enum EncryptionStatus {
  SEALED = 'sealed',
  UNSEALED = 'unsealed',
  EXPIRED = 'expired'
}

export interface EditingState {
  notebookId: string;
  pageNumber: number;
  userId: string;
  username: string;
  isEditing: boolean;
}

export interface Notebook {
  id: string;
  userId: string;
  title: string;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Collaborator {
  id: string;
  notebookId: string;
  userId: string | null;
  inviteEmail: string;
  status: 'pending' | 'accepted' | 'declined';
  invitedAt: Date;
}
