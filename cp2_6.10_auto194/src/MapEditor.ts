import { Island, ResourceType, IslandGenerator } from './IslandGenerator';

export type EditorMode = 'generate' | 'edit';

interface PulseAnimation {
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

interface EventMap {
  islandSelected: (island: Island | null) => void;
  islandAdded: (island: Island) => void;
  islandRemoved: (island: Island) => void;
  islandUpdated: (island: Island) => void;
  modeChanged: (mode: EditorMode) => void;
  islandsChanged: (islands: Island[]) => void;
}

type EventName = keyof EventMap;

const RESOURCE_COLORS: Record<string, string> = {
  wood: '#8B4513',
  ore: '#708090',
  crystal: '#9b59b6'
};

const RESOURCE_ICONS: Record<string, string> = {
  wood: '🔨',
  ore: '⛏️',
  crystal: '💎'
};

export class MapEditor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private islands: Island[] = [];
  private mode: EditorMode = 'generate';
  private selectedIslandId: string | null = null;
  private draggingIslandId: string | null = null;
  private dragOffset = { x: 0, y: 0 };
  private hoveredIslandId: string | null = null;
  private events: Map<EventName, Set<Function>> = new Map();
  private gridSize = 20;
  private snapThreshold = 10;
  private pulseAnimations: PulseAnimation[] = [];
  private animationFrameId: number | null = null;
  private isMouseDown = false;
  private mouseDownPos = { x: 0, y: 0 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.resizeCanvas();
    this.bindEvents();
    this.startRenderLoop();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private resizeCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.addEventListener('contextmenu', this.handleContextMenu);
  }

  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
    window.removeEventListener('resize', () => this.resizeCanvas());
  }

  on<K extends EventName>(event: K, callback: EventMap[K]): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback as Function);
  }

  off<K extends EventName>(event: K, callback: EventMap[K]): void {
    this.events.get(event)?.delete(callback as Function);
  }

  private emit<K extends EventName>(event: K, ...args: Parameters<EventMap[K]>): void {
    this.events.get(event)?.forEach(cb => (cb as Function)(...args));
  }

  setMode(mode: EditorMode): void {
    this.mode = mode;
    this.canvas.style.cursor = mode === 'generate' ? 'crosshair' : 'default';
    this.emit('modeChanged', mode);
  }

  getMode(): EditorMode {
    return this.mode;
  }

  addIsland(island: Island): void {
    this.islands.push(island);
    this.emit('islandAdded', island);
    this.emit('islandsChanged', [...this.islands]);
  }

  removeIsland(id: string): void {
    const index = this.islands.findIndex(i => i.id === id);
    if (index !== -1) {
      const island = this.islands[index];
      this.islands.splice(index, 1);
      if (this.selectedIslandId === id) {
        this.selectedIslandId = null;
        this.emit('islandSelected', null);
      }
      this.emit('islandRemoved', island);
      this.emit('islandsChanged', [...this.islands]);
    }
  }

  selectIsland(id: string | null): void {
    this.selectedIslandId = id;
    const island = id ? this.islands.find(i => i.id === id) || null : null;
    this.emit('islandSelected', island);
  }

  getSelectedIsland(): Island | null {
    if (!this.selectedIslandId) return null;
    return this.islands.find(i => i.id === this.selectedIslandId) || null;
  }

  setIslandResource(id: string, resource: ResourceType): void {
    const island = this.islands.find(i => i.id === id);
    if (island) {
      island.resource = resource;
      this.emit('islandUpdated', island);
      this.emit('islandsChanged', [...this.islands]);
    }
  }

  setIslandMonsterLevel(id: string, level: number): void {
    const island = this.islands.find(i => i.id === id);
    if (island) {
      island.monsterLevel = Math.max(1, Math.min(10, level));
      this.emit('islandUpdated', island);
      this.emit('islandsChanged', [...this.islands]);
    }
  }

  getIslands(): Island[] {
    return [...this.islands];
  }

  clearIslands(): void {
    this.islands = [];
    this.selectedIslandId = null;
    this.emit('islandSelected', null);
    this.emit('islandsChanged', []);
  }

  exportToJSON(): string {
    const data = {
      islands: this.islands.map(island => ({
        id: island.id,
        x: island.x,
        y: island.y,
        radius: island.radius,
        shapePoints: island.shapePoints,
        resource: island.resource,
        monsterLevel: island.monsterLevel
      })),
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
    return JSON.stringify(data, null, 2);
  }

  private getMousePos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private getIslandAt(x: number, y: number): Island | null {
    for (let i = this.islands.length - 1; i >= 0; i--) {
      const island = this.islands[i];
      const dx = x - island.x;
      const dy = y - island.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= island.radius * 1.1) {
        return island;
      }
    }
    return null;
  }

  private handleMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    const pos = this.getMousePos(e);
    this.isMouseDown = true;
    this.mouseDownPos = pos;

    const island = this.getIslandAt(pos.x, pos.y);

    if (this.mode === 'generate') {
      if (!island) {
        this.selectIsland(null);
      }
      return;
    }

    if (this.mode === 'edit' && island) {
      this.draggingIslandId = island.id;
      this.selectIsland(island.id);
      this.dragOffset = {
        x: pos.x - island.x,
        y: pos.y - island.y
      };
      this.canvas.style.cursor = 'grabbing';
    } else if (this.mode === 'edit' && !island) {
      this.selectIsland(null);
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    const pos = this.getMousePos(e);

    if (this.mode === 'edit' && this.draggingIslandId) {
      const island = this.islands.find(i => i.id === this.draggingIslandId);
      if (island) {
        let newX = pos.x - this.dragOffset.x;
        let newY = pos.y - this.dragOffset.y;

        const snapped = this.snapToGrid(newX, newY);
        if (snapped.snapped) {
          newX = snapped.x;
          newY = snapped.y;
          if (!snapped.alreadyPulsed) {
            this.addPulseAnimation(newX, newY);
          }
        }

        island.x = newX;
        island.y = newY;
        this.emit('islandUpdated', island);
        this.emit('islandsChanged', [...this.islands]);
      }
      return;
    }

    if (this.mode === 'edit') {
      const island = this.getIslandAt(pos.x, pos.y);
      this.hoveredIslandId = island ? island.id : null;
      this.canvas.style.cursor = island ? 'grab' : 'default';
    }
  };

  private handleMouseUp = (e: MouseEvent): void => {
    const pos = this.getMousePos(e);
    const wasClick = Math.abs(pos.x - this.mouseDownPos.x) < 5 && Math.abs(pos.y - this.mouseDownPos.y) < 5;

    if (this.mode === 'generate' && wasClick && e.button === 0) {
      const existing = this.getIslandAt(pos.x, pos.y);
      if (!existing) {
        const island = IslandGenerator.generateIsland(pos.x, pos.y);
        this.addIsland(island);
        this.selectIsland(island.id);
      } else {
        this.selectIsland(existing.id);
      }
    }

    if (this.draggingIslandId) {
      this.draggingIslandId = null;
      const island = this.getIslandAt(pos.x, pos.y);
      this.canvas.style.cursor = island ? 'grab' : 'default';
    }

    this.isMouseDown = false;
  };

  private handleMouseLeave = (): void => {
    this.draggingIslandId = null;
    this.hoveredIslandId = null;
    this.canvas.style.cursor = this.mode === 'generate' ? 'crosshair' : 'default';
    this.isMouseDown = false;
  };

  private handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
    if (this.mode !== 'edit') return;
    const pos = this.getMousePos(e);
    const island = this.getIslandAt(pos.x, pos.y);
    if (island) {
      this.removeIsland(island.id);
    }
  };

  private snapToGrid(x: number, y: number): { x: number; y: number; snapped: boolean; alreadyPulsed: boolean } {
    const gridX = Math.round(x / this.gridSize) * this.gridSize;
    const gridY = Math.round(y / this.gridSize) * this.gridSize;
    const dist = Math.sqrt((x - gridX) ** 2 + (y - gridY) ** 2);
    const snapped = dist < this.snapThreshold;

    const alreadyPulsed = this.pulseAnimations.some(
      p => Math.abs(p.x - gridX) < 1 && Math.abs(p.y - gridY) < 1 && Date.now() - p.startTime < 100
    );

    return {
      x: snapped ? gridX : x,
      y: snapped ? gridY : y,
      snapped,
      alreadyPulsed
    };
  }

  private addPulseAnimation(x: number, y: number): void {
    this.pulseAnimations.push({
      x,
      y,
      startTime: Date.now(),
      duration: 300
    });
  }

  private startRenderLoop(): void {
    const render = () => {
      this.render();
      this.animationFrameId = requestAnimationFrame(render);
    };
    render();
  }

  private render(): void {
    const ctx = this.ctx;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    ctx.clearRect(0, 0, width, height);
    this.drawGrid(width, height);

    const now = Date.now();
    this.updateCloudParticles(now);

    this.pulseAnimations = this.pulseAnimations.filter(p => now - p.startTime < p.duration);

    for (const island of this.islands) {
      this.drawClouds(island, now);
    }

    for (const island of this.islands) {
      const isSelected = island.id === this.selectedIslandId;
      const isHovered = island.id === this.hoveredIslandId;
      this.drawIsland(island, isSelected, isHovered, now);
    }

    for (const pulse of this.pulseAnimations) {
      this.drawPulse(pulse, now);
    }
  }

  private drawGrid(width: number, height: number): void {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(51, 51, 51, 0.15)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= width; x += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  private updateCloudParticles(now: number): void {
    for (const island of this.islands) {
      for (const cloud of island.clouds) {
        cloud.angle += cloud.speed;
        cloud.x = Math.cos(cloud.angle) * island.radius * (0.9 + Math.sin(now * 0.0005 + cloud.offsetY) * 0.3);
        cloud.y = Math.sin(cloud.angle) * island.radius * (0.9 + Math.cos(now * 0.0003 + cloud.offsetY) * 0.3);
      }
    }
  }

  private drawClouds(island: Island, now: number): void {
    const ctx = this.ctx;
    for (const cloud of island.clouds) {
      const floatY = Math.sin(now * 0.001 + cloud.offsetY) * 3;
      ctx.beginPath();
      ctx.arc(island.x + cloud.x, island.y + cloud.y + floatY, cloud.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${cloud.alpha})`;
      ctx.fill();
    }
  }

  private drawIsland(island: Island, isSelected: boolean, isHovered: boolean, now: number): void {
    const ctx = this.ctx;
    const { x, y, shapePoints } = island;

    if (island.resource) {
      const color = RESOURCE_COLORS[island.resource];
      ctx.beginPath();
      ctx.arc(x, y, island.radius + 10, 0, Math.PI * 2);
      ctx.strokeStyle = this.hexToRgba(color, 0.4);
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.save();
    ctx.beginPath();
    if (shapePoints.length > 0) {
      ctx.moveTo(x + shapePoints[0].x, y + shapePoints[0].y);
      for (let i = 0; i < shapePoints.length; i++) {
        const p1 = shapePoints[i];
        const p2 = shapePoints[(i + 1) % shapePoints.length];
        const cpx = x + (p1.x + p2.x) / 2;
        const cpy = y + (p1.y + p2.y) / 2;
        ctx.quadraticCurveTo(x + p1.x, y + p1.y, cpx, cpy);
      }
    }
    ctx.closePath();

    const gradient = ctx.createLinearGradient(x, y - island.radius, x, y + island.radius);
    gradient.addColorStop(0, '#6b8e23');
    gradient.addColorStop(1, '#556b2f');
    ctx.fillStyle = gradient;
    ctx.fill();

    if (island.monsterLevel >= 5) {
      const flashSpeed = island.monsterLevel >= 8 ? 400 : 800;
      const flashPhase = (now % flashSpeed) / flashSpeed;
      const flashAlpha = Math.sin(flashPhase * Math.PI) * 0.3;
      if (flashAlpha > 0) {
        ctx.strokeStyle = `rgba(255, 0, 0, ${flashAlpha})`;
        ctx.lineWidth = 4;
        ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    if (isSelected) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (isHovered) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();

    if (island.resource) {
      ctx.font = '24px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(RESOURCE_ICONS[island.resource], x, y);
    }

    if (island.monsterLevel >= 3) {
      const eyeX = x + Math.sin(now * 0.002) * island.radius * 0.4;
      const eyeY = y + island.radius * 0.6;
      ctx.font = '20px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.7;
      ctx.fillText('👁️', eyeX, eyeY);
      ctx.globalAlpha = 1;
    }
  }

  private drawPulse(pulse: PulseAnimation, now: number): void {
    const ctx = this.ctx;
    const progress = (now - pulse.startTime) / pulse.duration;
    const maxRadius = 40;
    const radius = maxRadius * progress;
    const alpha = (1 - progress) * 0.5;

    ctx.beginPath();
    ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
