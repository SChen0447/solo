export type OpType =
  | 'draw'
  | 'text'
  | 'stickyNote'
  | 'delete'
  | 'undo'
  | 'redo'
  | 'clear'
  | 'sync'
  | 'hello'
  | 'users';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface BaseOperation {
  id: string;
  type: OpType;
  timestamp: number;
  userId: string;
  roomId: string;
}

export interface DrawOperation extends BaseOperation {
  type: 'draw';
  color: string;
  strokeWidth: number;
  points: Point[];
}

export interface TextOperation extends BaseOperation {
  type: 'text';
  elementId: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
}

export interface StickyNoteOperation extends BaseOperation {
  type: 'stickyNote';
  elementId: string;
  x: number;
  y: number;
  text: string;
  color: string;
}

export interface DeleteOperation extends BaseOperation {
  type: 'delete';
  elementId: string;
}

export interface UndoOperation extends BaseOperation {
  type: 'undo';
}

export interface RedoOperation extends BaseOperation {
  type: 'redo';
}

export interface ClearOperation extends BaseOperation {
  type: 'clear';
}

export interface SyncMessage {
  type: 'sync';
  operations: BaseOperation[];
}

export interface HelloMessage {
  type: 'hello';
  userId: string;
  roomId: string;
}

export interface UsersMessage {
  type: 'users';
  count: number;
  userIds: string[];
}

export type WsMessage =
  | BaseOperation
  | SyncMessage
  | HelloMessage
  | UsersMessage;

export type ToolType = 'pen' | 'text' | 'stickyNote' | 'select';

export type StrokeWidth = 2 | 6 | 12;

export interface Viewport {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface CanvasElement {
  id: string;
  type: 'text' | 'stickyNote';
  x: number;
  y: number;
  text: string;
  fontSize?: number;
  color: string;
}

export const COLOR_PALETTE: string[] = [
  '#000000',
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#06B6D4',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#6B7280',
  '#FFFFFF',
  '#1F2937',
];
