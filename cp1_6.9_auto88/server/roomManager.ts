export interface NodeData {
  id: string;
  parentId: string | null;
  text: string;
  x: number;
  y: number;
  color: string;
  type: 'root' | 'child';
  width: number;
  height: number;
}

export interface User {
  id: string;
  username: string;
  color: string;
  x: number;
  y: number;
}

export interface HistoryEntry {
  type: 'add' | 'move' | 'update-text' | 'delete';
  before: NodeData | null;
  after: NodeData | null;
}

const CHILD_COLORS = [
  '#2C3E50',
  '#8E44AD',
  '#16A085',
  '#C0392B',
  '#D35400',
  '#2980B9',
  '#7F8C8D'
];

const USER_COLORS = [
  '#E74C3C',
  '#3498DB',
  '#2ECC71',
  '#F39C12',
  '#9B59B6',
  '#1ABC9C',
  '#E67E22',
  '#34495E'
];

export function getRandomChildColor(): string {
  return CHILD_COLORS[Math.floor(Math.random() * CHILD_COLORS.length)];
}

export function getRandomUserColor(): string {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

const MAX_HISTORY = 100;

export class RoomManager {
  private nodes: Map<string, NodeData> = new Map();
  private users: Map<string, User> = new Map();
  private history: HistoryEntry[] = [];
  private historyIndex: number = -1;

  getNodes(): NodeData[] {
    return Array.from(this.nodes.values());
  }

  getUsers(): User[] {
    return Array.from(this.users.values());
  }

  getHistoryIndex(): number {
    return this.historyIndex;
  }

  getHistoryLength(): number {
    return this.history.length;
  }

  join(userId: string, username: string): User {
    const user: User = {
      id: userId,
      username,
      color: getRandomUserColor(),
      x: 0,
      y: 0
    };
    this.users.set(userId, user);
    return user;
  }

  leave(userId: string): void {
    this.users.delete(userId);
  }

  updateCursor(userId: string, x: number, y: number): void {
    const user = this.users.get(userId);
    if (user) {
      user.x = x;
      user.y = y;
    }
  }

  addNode(node: NodeData): void {
    this.nodes.set(node.id, node);
    this.pushHistory({
      type: 'add',
      before: null,
      after: { ...node }
    });
  }

  moveNode(nodeId: string, x: number, y: number): NodeData | null {
    const node = this.nodes.get(nodeId);
    if (!node) return null;
    const before = { ...node };
    node.x = x;
    node.y = y;
    this.pushHistory({
      type: 'move',
      before,
      after: { ...node }
    });
    return node;
  }

  updateText(nodeId: string, text: string): NodeData | null {
    const node = this.nodes.get(nodeId);
    if (!node) return null;
    const before = { ...node };
    node.text = text;
    this.pushHistory({
      type: 'update-text',
      before,
      after: { ...node }
    });
    return node;
  }

  deleteNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    this.nodes.delete(nodeId);
    this.pushHistory({
      type: 'delete',
      before: { ...node },
      after: null
    });
  }

  private pushHistory(entry: HistoryEntry): void {
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(entry);
    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  undo(): NodeData[] {
    if (this.historyIndex < 0) return this.getNodes();
    const entry = this.history[this.historyIndex];
    this.applyHistoryEntry(entry, true);
    this.historyIndex--;
    return this.getNodes();
  }

  redo(): NodeData[] {
    if (this.historyIndex >= this.history.length - 1) return this.getNodes();
    this.historyIndex++;
    const entry = this.history[this.historyIndex];
    this.applyHistoryEntry(entry, false);
    return this.getNodes();
  }

  private applyHistoryEntry(entry: HistoryEntry, isUndo: boolean): void {
    const target = isUndo ? entry.before : entry.after;
    const source = isUndo ? entry.after : entry.before;
    if (entry.type === 'add') {
      if (isUndo && source) {
        this.nodes.delete(source.id);
      } else if (!isUndo && target) {
        this.nodes.set(target.id, target);
      }
    } else if (entry.type === 'delete') {
      if (isUndo && target) {
        this.nodes.set(target.id, target);
      } else if (!isUndo && source) {
        this.nodes.delete(source.id);
      }
    } else {
      if (target) {
        this.nodes.set(target.id, { ...target });
      }
    }
  }

  reset(): void {
    this.nodes.clear();
    this.history = [];
    this.historyIndex = -1;
  }
}
