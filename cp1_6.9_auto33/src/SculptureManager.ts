export type GeometryType = 'box' | 'sphere' | 'torus' | 'cone' | 'cylinder' | 'octahedron';

export interface PartConfig {
  type: GeometryType;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color: string;
}

export interface SculptureConfig {
  id: string;
  name: string;
  parts: PartConfig[];
  baseColor: string;
  accentColor: string;
}

export class SculptureManager {
  private sculptures: SculptureConfig[] = [];
  private currentIndex: number = 0;

  constructor() {
    this.initPresets();
  }

  private initPresets(): void {
    this.sculptures = [
      {
        id: 'harmony',
        name: '和谐之韵',
        baseColor: '#8B9DAE',
        accentColor: '#3498DB',
        parts: [
          { type: 'box', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 2, y: 2, z: 2 }, color: '#8B9DAE' },
          { type: 'sphere', position: { x: 0, y: 2.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1.2, y: 1.2, z: 1.2 }, color: '#3498DB' },
          { type: 'torus', position: { x: 0, y: 0, z: 0 }, rotation: { x: Math.PI / 2, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 0.4 }, color: '#A8B8C8' },
          { type: 'cone', position: { x: 1.8, y: 0.5, z: 0 }, rotation: { x: 0, y: 0, z: Math.PI / 4 }, scale: { x: 0.8, y: 1.8, z: 0.8 }, color: '#6C7A89' },
          { type: 'cone', position: { x: -1.8, y: 0.5, z: 0 }, rotation: { x: 0, y: 0, z: -Math.PI / 4 }, scale: { x: 0.8, y: 1.8, z: 0.8 }, color: '#6C7A89' },
        ],
      },
      {
        id: 'equilibrium',
        name: '平衡之境',
        baseColor: '#A0A0A0',
        accentColor: '#E74C3C',
        parts: [
          { type: 'cylinder', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1.5, y: 0.3, z: 1.5 }, color: '#808080' },
          { type: 'cylinder', position: { x: 0, y: 1.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 0.3, y: 2, z: 0.3 }, color: '#A0A0A0' },
          { type: 'box', position: { x: 2, y: 1.5, z: 0 }, rotation: { x: 0, y: Math.PI / 6, z: 0 }, scale: { x: 1.5, y: 0.4, z: 0.4 }, color: '#B0B0B0' },
          { type: 'box', position: { x: -2, y: 1.5, z: 0 }, rotation: { x: 0, y: -Math.PI / 6, z: 0 }, scale: { x: 1.5, y: 0.4, z: 0.4 }, color: '#B0B0B0' },
          { type: 'sphere', position: { x: 0, y: 2.8, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 0.8, y: 0.8, z: 0.8 }, color: '#E74C3C' },
          { type: 'octahedron', position: { x: 2.5, y: 2.2, z: 0 }, rotation: { x: 0, y: Math.PI / 4, z: 0 }, scale: { x: 0.6, y: 0.6, z: 0.6 }, color: '#C0C0C0' },
        ],
      },
      {
        id: 'transcendence',
        name: '超越之形',
        baseColor: '#90A4AE',
        accentColor: '#2C3E50',
        parts: [
          { type: 'torus', position: { x: 0, y: 0, z: 0 }, rotation: { x: Math.PI / 2, y: 0, z: 0 }, scale: { x: 1.8, y: 1.8, z: 0.5 }, color: '#90A4AE' },
          { type: 'torus', position: { x: 0, y: 0, z: 0 }, rotation: { x: Math.PI / 2, y: Math.PI / 3, z: 0 }, scale: { x: 1.4, y: 1.4, z: 0.4 }, color: '#78909C' },
          { type: 'sphere', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 0.9, y: 0.9, z: 0.9 }, color: '#2C3E50' },
          { type: 'cylinder', position: { x: 0, y: 2, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 0.25, y: 1.2, z: 0.25 }, color: '#B0BEC5' },
          { type: 'sphere', position: { x: 0, y: 2.8, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 0.45, y: 0.45, z: 0.45 }, color: '#CFD8DC' },
        ],
      },
      {
        id: 'momentum',
        name: '动势之流',
        baseColor: '#B0A090',
        accentColor: '#D4A574',
        parts: [
          { type: 'box', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: Math.PI / 4, z: 0 }, scale: { x: 1.5, y: 1.5, z: 1.5 }, color: '#8B7355' },
          { type: 'cone', position: { x: 0, y: 1.8, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 2, z: 1 }, color: '#B0A090' },
          { type: 'torus', position: { x: 0, y: 1.8, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1.2, y: 1.2, z: 0.3 }, color: '#D4A574' },
          { type: 'sphere', position: { x: 1.5, y: 0.8, z: 0.5 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 0.5, y: 0.5, z: 0.5 }, color: '#C9A87C' },
          { type: 'sphere', position: { x: -1.2, y: 0.5, z: -0.8 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 0.4, y: 0.4, z: 0.4 }, color: '#C9A87C' },
          { type: 'octahedron', position: { x: 0, y: -1.2, z: 0 }, rotation: { x: 0, y: Math.PI / 4, z: 0 }, scale: { x: 0.7, y: 0.7, z: 0.7 }, color: '#A08060' },
        ],
      },
      {
        id: 'serenity',
        name: '静谧之塔',
        baseColor: '#7A8B8B',
        accentColor: '#5F9EA0',
        parts: [
          { type: 'cylinder', position: { x: 0, y: -1, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1.8, y: 0.3, z: 1.8 }, color: '#556B6B' },
          { type: 'box', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1.4, y: 0.8, z: 1.4 }, color: '#7A8B8B' },
          { type: 'box', position: { x: 0, y: 1, z: 0 }, rotation: { x: 0, y: Math.PI / 4, z: 0 }, scale: { x: 1.1, y: 0.8, z: 1.1 }, color: '#6B7C7C' },
          { type: 'cylinder', position: { x: 0, y: 2, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 0.8, y: 0.6, z: 0.8 }, color: '#5F9EA0' },
          { type: 'sphere', position: { x: 0, y: 3, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 0.7, y: 0.7, z: 0.7 }, color: '#5F9EA0' },
        ],
      },
    ];
  }

  getAllSculptures(): SculptureConfig[] {
    return this.sculptures;
  }

  getSculptureCount(): number {
    return this.sculptures.length;
  }

  getSculptureByIndex(index: number): SculptureConfig {
    const safeIndex = Math.max(0, Math.min(index, this.sculptures.length - 1));
    return this.sculptures[safeIndex];
  }

  getCurrentSculpture(): SculptureConfig {
    return this.sculptures[this.currentIndex];
  }

  setCurrentSculpture(index: number): SculptureConfig {
    this.currentIndex = Math.max(0, Math.min(index, this.sculptures.length - 1));
    return this.sculptures[this.currentIndex];
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getGeometryParams(type: GeometryType): { segments: number } {
    switch (type) {
      case 'sphere':
        return { segments: 32 };
      case 'torus':
        return { segments: 48 };
      case 'cone':
      case 'cylinder':
        return { segments: 24 };
      case 'octahedron':
        return { segments: 0 };
      default:
        return { segments: 1 };
    }
  }
}
