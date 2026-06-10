export interface StickyNote {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: string;
  sentiment: 'positive' | 'neutral';
  groupId: string | null;
  zIndex: number;
}

export type ShapeType = 'pen' | 'line' | 'eraser';

export interface Shape {
  id: string;
  type: ShapeType;
  color: string;
  thickness: number;
  points: { x: number; y: number }[];
}

export interface Group {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed: boolean;
  noteIds: string[];
}

export type Tool = 'select' | 'pen' | 'eraser' | 'line' | 'sticky' | 'marquee';

export interface AppState {
  notes: StickyNote[];
  shapes: Shape[];
  groups: Group[];
  selectedIds: string[];
  activeTool: Tool;
  penColor: string;
  penThickness: number;
  zoom: number;
  panOffset: { x: number; y: number };
}

const STORAGE_KEY = 'brainstorm_whiteboard_state_v1';

export const PEN_COLORS = [
  '#FFD700',
  '#87CEEB',
  '#FF6B6B',
  '#4ECDC4',
  '#95E1D3',
  '#A8E6CF'
];

const WARM_COLORS = ['#FFE4B5', '#FFDAB9', '#F0E68C'];
const COOL_COLORS = ['#E0FFFF', '#E6E6FA', '#D3D3D3'];

const POSITIVE_KEYWORDS = [
  '好', '棒', '赞', '优秀', '喜欢', '厉害', '完美', '不错',
  'great', 'good', 'awesome', 'excellent', 'love', 'nice',
  'idea', '创意', '精彩', '赞同', '支持', 'yes', 'yep',
  'happy', '开心', '高兴', '牛', '强'
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function analyzeSentiment(content: string): 'positive' | 'neutral' {
  const lower = content.toLowerCase();
  return POSITIVE_KEYWORDS.some(k => lower.includes(k.toLowerCase())) ? 'positive' : 'neutral';
}

function pickColor(sentiment: 'positive' | 'neutral'): string {
  const pool = sentiment === 'positive' ? WARM_COLORS : COOL_COLORS;
  return pool[Math.floor(Math.random() * pool.length)];
}

type Listener = (state: AppState) => void;

export class Store {
  private state: AppState;
  private listeners: Set<Listener> = new Set();
  private saveTimer: number | null = null;

  constructor() {
    this.state = this.loadFromStorage() || this.defaultState();
  }

  private defaultState(): AppState {
    return {
      notes: [],
      shapes: [],
      groups: [],
      selectedIds: [],
      activeTool: 'select',
      penColor: PEN_COLORS[0],
      penThickness: 3,
      zoom: 1,
      panOffset: { x: 0, y: 0 }
    };
  }

  private loadFromStorage(): AppState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        ...this.defaultState(),
        ...parsed,
        selectedIds: [],
        activeTool: 'select'
      };
    } catch {
      return null;
    }
  }

  private scheduleSave(): void {
    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
    }
    this.saveTimer = window.setTimeout(() => {
      this.saveToStorage();
      this.saveTimer = null;
    }, 300);
  }

  private saveToStorage(): void {
    try {
      const { selectedIds, activeTool, ...persistable } = this.state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
    } catch {
      // ignore quota errors
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
    this.scheduleSave();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  getState(): AppState {
    return this.state;
  }

  setActiveTool(tool: Tool): void {
    this.state.activeTool = tool;
    if (tool !== 'marquee') {
      this.state.selectedIds = [];
    }
    this.notify();
  }

  setPenColor(color: string): void {
    this.state.penColor = color;
    this.notify();
  }

  setPenThickness(thickness: number): void {
    this.state.penThickness = Math.max(1, Math.min(20, thickness));
    this.notify();
  }

  setZoom(zoom: number): void {
    this.state.zoom = Math.max(0.1, Math.min(2, zoom));
    this.notify();
  }

  setPanOffset(x: number, y: number): void {
    this.state.panOffset = { x, y };
    this.notify();
  }

  addNote(x: number, y: number, content: string = ''): StickyNote {
    const sentiment = analyzeSentiment(content);
    const maxZ = this.state.notes.reduce((m, n) => Math.max(m, n.zIndex), 0);
    const note: StickyNote = {
      id: generateId(),
      x,
      y,
      width: 180,
      height: 140,
      content,
      color: pickColor(sentiment),
      sentiment,
      groupId: null,
      zIndex: maxZ + 1
    };
    this.state.notes.push(note);
    this.state.selectedIds = [note.id];
    this.notify();
    return note;
  }

  updateNote(id: string, patch: Partial<StickyNote>): void {
    const note = this.state.notes.find(n => n.id === id);
    if (!note) return;
    if (patch.content !== undefined && patch.content !== note.content) {
      const sentiment = analyzeSentiment(patch.content);
      Object.assign(note, patch, {
        sentiment,
        color: pickColor(sentiment)
      });
    } else {
      Object.assign(note, patch);
    }
    this.notify();
  }

  deleteNote(id: string): void {
    this.state.notes = this.state.notes.filter(n => n.id !== id);
    this.state.selectedIds = this.state.selectedIds.filter(s => s !== id);
    for (const group of this.state.groups) {
      group.noteIds = group.noteIds.filter(nid => nid !== id);
    }
    this.notify();
  }

  bringNoteToFront(id: string): void {
    const maxZ = this.state.notes.reduce((m, n) => Math.max(m, n.zIndex), 0);
    const note = this.state.notes.find(n => n.id === id);
    if (note) {
      note.zIndex = maxZ + 1;
      this.notify();
    }
  }

  addShape(type: ShapeType, points: { x: number; y: number }[]): Shape {
    const shape: Shape = {
      id: generateId(),
      type,
      color: type === 'eraser' ? '#F5F5F5' : this.state.penColor,
      thickness: type === 'eraser' ? this.state.penThickness * 3 : this.state.penThickness,
      points
    };
    this.state.shapes.push(shape);
    this.notify();
    return shape;
  }

  updateShapePoints(id: string, points: { x: number; y: number }[]): void {
    const shape = this.state.shapes.find(s => s.id === id);
    if (shape) {
      shape.points = points;
      this.notify();
    }
  }

  setSelectedIds(ids: string[]): void {
    this.state.selectedIds = ids;
    this.notify();
  }

  groupSelectedNotes(): Group | null {
    const selectedNotes = this.state.notes.filter(n => this.state.selectedIds.includes(n.id));
    if (selectedNotes.length < 2) return null;

    const minX = Math.min(...selectedNotes.map(n => n.x));
    const minY = Math.min(...selectedNotes.map(n => n.y));
    const maxX = Math.max(...selectedNotes.map(n => n.x + n.width));
    const maxY = Math.max(...selectedNotes.map(n => n.y + n.height));
    const padding = 24;

    const group: Group = {
      id: generateId(),
      title: '分组 ' + (this.state.groups.length + 1),
      x: minX - padding,
      y: minY - padding - 32,
      width: (maxX - minX) + padding * 2,
      height: (maxY - minY) + padding * 2 + 32,
      collapsed: false,
      noteIds: selectedNotes.map(n => n.id)
    };

    this.state.groups.push(group);
    for (const note of selectedNotes) {
      note.groupId = group.id;
    }
    this.state.selectedIds = [];
    this.notify();
    return group;
  }

  updateGroup(id: string, patch: Partial<Group>): void {
    const group = this.state.groups.find(g => g.id === id);
    if (!group) return;
    const oldX = group.x;
    const oldY = group.y;
    Object.assign(group, patch);
    if ((patch.x !== undefined || patch.y !== undefined) && !group.collapsed) {
      const dx = (patch.x ?? oldX) - oldX;
      const dy = (patch.y ?? oldY) - oldY;
      for (const noteId of group.noteIds) {
        const note = this.state.notes.find(n => n.id === noteId);
        if (note) {
          note.x += dx;
          note.y += dy;
        }
      }
    }
    this.notify();
  }

  toggleGroupCollapsed(id: string): void {
    const group = this.state.groups.find(g => g.id === id);
    if (group) {
      group.collapsed = !group.collapsed;
      this.notify();
    }
  }

  deleteGroup(id: string): void {
    const group = this.state.groups.find(g => g.id === id);
    if (!group) return;
    for (const noteId of group.noteIds) {
      const note = this.state.notes.find(n => n.id === noteId);
      if (note) note.groupId = null;
    }
    this.state.groups = this.state.groups.filter(g => g.id !== id);
    this.notify();
  }

  clearAll(): void {
    this.state.notes = [];
    this.state.shapes = [];
    this.state.groups = [];
    this.state.selectedIds = [];
    this.notify();
  }
}

export const store = new Store();
