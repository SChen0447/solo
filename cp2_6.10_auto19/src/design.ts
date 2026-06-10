export interface TextElement {
  id: string;
  type: 'text';
  content: string;
  fontSize: number;
  color: string;
  x: number;
  y: number;
}

export interface ImageElement {
  id: string;
  type: 'image';
  dataUrl: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

export type DesignElement = TextElement | ImageElement;

export interface DesignSnapshot {
  id: string;
  timestamp: number;
  color: string;
  elements: DesignElement[];
}

const STORAGE_KEY = 'tshirt_design_data';
const HISTORY_KEY = 'tshirt_design_history';
const MAX_HISTORY = 5;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export class DesignManager {
  private color: string = '#ffffff';
  private elements: DesignElement[] = [];
  private selectedElementId: string | null = null;
  private history: DesignSnapshot[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
    this.loadHistoryFromStorage();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  private saveToStorage(): void {
    try {
      const data = {
        color: this.color,
        elements: this.elements
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('保存设计数据失败:', e);
    }
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        this.color = data.color || '#ffffff';
        this.elements = data.elements || [];
      }
    } catch (e) {
      console.error('加载设计数据失败:', e);
    }
  }

  private saveHistoryToStorage(): void {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(this.history));
    } catch (e) {
      console.error('保存历史记录失败:', e);
    }
  }

  private loadHistoryFromStorage(): void {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        this.history = JSON.parse(raw);
      }
    } catch (e) {
      console.error('加载历史记录失败:', e);
    }
  }

  public saveSnapshot(): void {
    const snapshot: DesignSnapshot = {
      id: generateId(),
      timestamp: Date.now(),
      color: this.color,
      elements: JSON.parse(JSON.stringify(this.elements))
    };
    this.history.unshift(snapshot);
    if (this.history.length > MAX_HISTORY) {
      this.history = this.history.slice(0, MAX_HISTORY);
    }
    this.saveHistoryToStorage();
  }

  public getHistory(): DesignSnapshot[] {
    return this.history;
  }

  public restoreSnapshot(snapshotId: string): boolean {
    const snapshot = this.history.find(s => s.id === snapshotId);
    if (!snapshot) return false;

    this.saveSnapshot();

    this.color = snapshot.color;
    this.elements = JSON.parse(JSON.stringify(snapshot.elements));
    this.selectedElementId = null;
    this.saveToStorage();
    this.notify();
    return true;
  }

  public undo(): boolean {
    if (this.history.length === 0) return false;
    const snapshot = this.history.shift()!;
    this.saveHistoryToStorage();

    this.color = snapshot.color;
    this.elements = JSON.parse(JSON.stringify(snapshot.elements));
    this.selectedElementId = null;
    this.saveToStorage();
    this.notify();
    return true;
  }

  public canUndo(): boolean {
    return this.history.length > 0;
  }

  public getColor(): string {
    return this.color;
  }

  public setColor(color: string): void {
    if (this.color !== color) {
      this.saveSnapshot();
      this.color = color;
      this.saveToStorage();
      this.notify();
    }
  }

  public getElements(): DesignElement[] {
    return this.elements;
  }

  public getElement(id: string): DesignElement | undefined {
    return this.elements.find(e => e.id === id);
  }

  public getSelectedElement(): DesignElement | null {
    if (!this.selectedElementId) return null;
    return this.elements.find(e => e.id === this.selectedElementId) || null;
  }

  public selectElement(id: string | null): void {
    this.selectedElementId = id;
    this.notify();
  }

  public getSelectedElementId(): string | null {
    return this.selectedElementId;
  }

  public addText(content: string, fontSize: number = 32, color: string = '#000000'): TextElement {
    this.saveSnapshot();
    const element: TextElement = {
      id: generateId(),
      type: 'text',
      content: content.substring(0, 20),
      fontSize,
      color,
      x: 0.5,
      y: 0.5
    };
    this.elements.push(element);
    this.selectedElementId = element.id;
    this.saveToStorage();
    this.notify();
    return element;
  }

  public addImage(dataUrl: string, width: number, height: number): ImageElement {
    this.saveSnapshot();
    const maxSize = 400;
    let scaledWidth = width;
    let scaledHeight = height;
    if (width > height && width > maxSize) {
      scaledWidth = maxSize;
      scaledHeight = (height / width) * maxSize;
    } else if (height > maxSize) {
      scaledHeight = maxSize;
      scaledWidth = (width / height) * maxSize;
    }

    const element: ImageElement = {
      id: generateId(),
      type: 'image',
      dataUrl,
      width: scaledWidth,
      height: scaledHeight,
      x: 0.5,
      y: 0.5
    };
    this.elements.push(element);
    this.selectedElementId = element.id;
    this.saveToStorage();
    this.notify();
    return element;
  }

  public updateText(id: string, updates: Partial<Omit<TextElement, 'id' | 'type'>>): boolean {
    const element = this.elements.find(e => e.id === id && e.type === 'text') as TextElement | undefined;
    if (!element) return false;

    this.saveSnapshot();
    if (updates.content !== undefined) {
      element.content = updates.content.substring(0, 20);
    }
    if (updates.fontSize !== undefined) {
      element.fontSize = Math.max(12, Math.min(48, updates.fontSize));
    }
    if (updates.color !== undefined) {
      element.color = updates.color;
    }
    if (updates.x !== undefined) {
      element.x = Math.max(0, Math.min(1, updates.x));
    }
    if (updates.y !== undefined) {
      element.y = Math.max(0, Math.min(1, updates.y));
    }
    this.saveToStorage();
    this.notify();
    return true;
  }

  public updateImage(id: string, updates: Partial<Omit<ImageElement, 'id' | 'type' | 'dataUrl'>>): boolean {
    const element = this.elements.find(e => e.id === id && e.type === 'image') as ImageElement | undefined;
    if (!element) return false;

    this.saveSnapshot();
    if (updates.x !== undefined) {
      element.x = Math.max(0, Math.min(1, updates.x));
    }
    if (updates.y !== undefined) {
      element.y = Math.max(0, Math.min(1, updates.y));
    }
    if (updates.width !== undefined) {
      element.width = updates.width;
    }
    if (updates.height !== undefined) {
      element.height = updates.height;
    }
    this.saveToStorage();
    this.notify();
    return true;
  }

  public moveElement(id: string, x: number, y: number): boolean {
    const element = this.elements.find(e => e.id === id);
    if (!element) return false;

    element.x = Math.max(0, Math.min(1, x));
    element.y = Math.max(0, Math.min(1, y));
    this.saveToStorage();
    this.notify();
    return true;
  }

  public deleteElement(id: string): boolean {
    const index = this.elements.findIndex(e => e.id === id);
    if (index === -1) return false;

    this.saveSnapshot();
    this.elements.splice(index, 1);
    if (this.selectedElementId === id) {
      this.selectedElementId = null;
    }
    this.saveToStorage();
    this.notify();
    return true;
  }
}
