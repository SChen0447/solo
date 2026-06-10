import type { WebSocket } from 'ws';

export const COLOR_PALETTE = [
  '#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf',
  '#ff8b94', '#c7ceea', '#95e1d3', '#f38181',
  '#aa96da', '#fcbad3', '#a8d8ea', '#ffd3b6'
];

export interface User {
  id: string;
  name: string;
  color: string;
  strokeWidth: number;
  tool: string;
  ws: WebSocket;
}

export interface DrawOperation {
  type: 'draw';
  id: string;
  userId: string;
  tool: string;
  color: string;
  strokeWidth: number;
  points?: { x: number; y: number }[];
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  text?: string;
  noteId?: string;
}

export interface ChatMessage {
  type: 'chat';
  id: string;
  userId: string;
  userName: string;
  color: string;
  text: string;
  timestamp: number;
}

export type Operation = DrawOperation | ChatMessage;

export interface JoinMessage {
  type: 'join';
  userId: string;
  userName: string;
}

export interface LeaveMessage {
  type: 'leave';
  userId: string;
}

export interface ToolChangeMessage {
  type: 'toolChange';
  userId: string;
  tool: string;
  strokeWidth: number;
}

export interface RequestHistoryMessage {
  type: 'requestHistory';
}

export type ServerMessage =
  | { type: 'welcome'; userId: string; color: string; users: Omit<User, 'ws'>[] }
  | { type: 'userJoined'; user: Omit<User, 'ws'> }
  | { type: 'userLeft'; userId: string }
  | { type: 'userList'; users: Omit<User, 'ws'>[] }
  | { type: 'toolChanged'; userId: string; tool: string; strokeWidth: number }
  | { type: 'history'; operations: Operation[] }
  | Operation;

export type ClientMessage =
  | JoinMessage
  | LeaveMessage
  | DrawOperation
  | ChatMessage
  | ToolChangeMessage
  | RequestHistoryMessage;

const MAX_HISTORY = 5000;

export class Room {
  private users: Map<string, User> = new Map();
  private history: Operation[] = [];
  private colorIndex = 0;

  constructor(public roomId: string) {}

  getUsers(): Omit<User, 'ws'>[] {
    return Array.from(this.users.values()).map(({ ws, ...user }) => user);
  }

  getHistory(): Operation[] {
    return [...this.history];
  }

  addUser(userId: string, userName: string, ws: WebSocket): User {
    const color = COLOR_PALETTE[this.colorIndex % COLOR_PALETTE.length];
    this.colorIndex++;

    const user: User = {
      id: userId,
      name: userName,
      color,
      strokeWidth: 4,
      tool: 'pen',
      ws
    };

    this.users.set(userId, user);
    return user;
  }

  removeUser(userId: string): void {
    this.users.delete(userId);
  }

  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  updateUserTool(userId: string, tool: string, strokeWidth: number): void {
    const user = this.users.get(userId);
    if (user) {
      user.tool = tool;
      user.strokeWidth = strokeWidth;
    }
  }

  addHistory(op: Operation): void {
    this.history.push(op);
    if (this.history.length > MAX_HISTORY) {
      this.history = this.history.slice(-MAX_HISTORY);
    }
  }

  broadcast(message: ServerMessage, excludeUserId?: string): void {
    const data = JSON.stringify(message);
    for (const user of this.users.values()) {
      if (excludeUserId && user.id === excludeUserId) continue;
      if (user.ws.readyState === 1) {
        user.ws.send(data);
      }
    }
  }

  sendTo(userId: string, message: ServerMessage): void {
    const user = this.users.get(userId);
    if (user && user.ws.readyState === 1) {
      user.ws.send(JSON.stringify(message));
    }
  }

  isEmpty(): boolean {
    return this.users.size === 0;
  }
}
