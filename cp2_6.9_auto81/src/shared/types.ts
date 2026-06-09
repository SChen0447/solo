export type ToolType = 'pen' | 'rect' | 'circle' | 'text' | 'eraser' | 'select';

export interface Point {
  x: number;
  y: number;
}

export interface BaseElement {
  id: string;
  type: 'pen' | 'rect' | 'circle' | 'text';
  color: string;
  lineWidth: number;
  opacity: number;
  createdAt: number;
  isNew?: boolean;
  isDeleting?: boolean;
}

export interface PenElement extends BaseElement {
  type: 'pen';
  points: Point[];
}

export interface RectElement extends BaseElement {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleElement extends BaseElement {
  type: 'circle';
  cx: number;
  cy: number;
  r: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  x: number;
  y: number;
  text: string;
  fontSize: number;
}

export type DrawElement = PenElement | RectElement | CircleElement | TextElement;

export type OperationType = 'add' | 'modify' | 'delete' | 'move';

export interface Operation {
  id: string;
  type: OperationType;
  userId: string;
  timestamp: number;
  element?: DrawElement;
  elementId?: string;
  modifications?: Partial<DrawElement>;
}

export interface Version {
  id: string;
  timestamp: number;
  elements: DrawElement[];
  operationCount: number;
}

export interface RoomUser {
  id: string;
  nickname: string;
  socketId: string;
}

export interface RoomState {
  id: string;
  users: RoomUser[];
  elements: DrawElement[];
  versions: Version[];
  lastSnapshotTime: number;
  operationCountSinceSnapshot: number;
}

export interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}
