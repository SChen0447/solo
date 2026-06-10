import { v4 as uuidv4 } from 'uuid';

export type ComponentType = 'button' | 'input' | 'card';

export interface Comment {
  id: string;
  text: string;
  offsetX: number;
  offsetY: number;
}

export interface CanvasComponent {
  id: string;
  type: ComponentType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  comment?: Comment;
  displayColor: string;
}

const DEFAULT_COLORS: Record<ComponentType, string> = {
  button: '#2563EB',
  input: '#FFFFFF',
  card: '#FFFFFF',
};

const DEFAULT_SIZES: Record<ComponentType, { width: number; height: number }> = {
  button: { width: 120, height: 40 },
  input: { width: 200, height: 40 },
  card: { width: 240, height: 160 },
};

export const PRESET_COLORS: string[] = [
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#06B6D4',
  '#2563EB',
  '#8B5CF6',
  '#6B7280',
];

export class ComponentManager {
  private components: Map<string, CanvasComponent> = new Map();

  addComponent(type: ComponentType, x: number, y: number): CanvasComponent {
    const id = uuidv4();
    const size = DEFAULT_SIZES[type];
    const defaultColor = DEFAULT_COLORS[type];
    const component: CanvasComponent = {
      id,
      type,
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      width: size.width,
      height: size.height,
      color: defaultColor,
      displayColor: defaultColor,
    };
    this.components.set(id, component);
    return component;
  }

  removeComponent(id: string): boolean {
    return this.components.delete(id);
  }

  updateComponent(id: string, patch: Partial<CanvasComponent>): CanvasComponent | null {
    const comp = this.components.get(id);
    if (!comp) return null;
    if (patch.x !== undefined) patch.x = Math.round(patch.x * 100) / 100;
    if (patch.y !== undefined) patch.y = Math.round(patch.y * 100) / 100;
    const updated = { ...comp, ...patch };
    this.components.set(id, updated);
    return updated;
  }

  getComponentById(id: string): CanvasComponent | undefined {
    return this.components.get(id);
  }

  getAllComponents(): CanvasComponent[] {
    return Array.from(this.components.values());
  }

  addComment(componentId: string, text: string = ''): Comment | null {
    const comp = this.components.get(componentId);
    if (!comp) return null;
    const comment: Comment = {
      id: uuidv4(),
      text,
      offsetX: 0,
      offsetY: -comp.height - 40,
    };
    comp.comment = comment;
    return comment;
  }

  updateComment(componentId: string, patch: Partial<Comment>): Comment | null {
    const comp = this.components.get(componentId);
    if (!comp || !comp.comment) return null;
    comp.comment = { ...comp.comment, ...patch };
    return comp.comment;
  }

  saveToJSON(): string {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      components: this.getAllComponents().map((c) => ({
        id: c.id,
        type: c.type,
        x: Math.round(c.x * 100) / 100,
        y: Math.round(c.y * 100) / 100,
        width: c.width,
        height: c.height,
        color: c.color,
        comment: c.comment
          ? {
              text: c.comment.text,
              offsetX: Math.round(c.comment.offsetX * 100) / 100,
              offsetY: Math.round(c.comment.offsetY * 100) / 100,
            }
          : undefined,
      })),
    };
    return JSON.stringify(data, null, 2);
  }
}
