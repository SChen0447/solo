import type {
  Hold,
  Rope,
  Character,
  Point,
  EditorMode,
  DragState,
  RopeCreationState,
  RouteData
} from './types';
import { PhysicsEngine } from './physicsEngine';

const GRID_SIZE = 30;
const GRID_SNAP_DISTANCE = 15;
const SNAP_RADIUS = 30;
const HOLD_RADIUS = 15;
const ANCHOR_SIZE = 20;
const CHARACTER_SIZE = 12;
const COLOR_HOLD = '#ff6b6b';
const COLOR_ANCHOR = '#4ecdc4';
const COLOR_ROPE = '#ffe66d';
const COLOR_CHARACTER = '#fd79a8';
const COLOR_GRID = '#2d2d44';
const COLOR_BORDER = '#ffffff';

export class SceneManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private physicsEngine: PhysicsEngine;
  private holds: Hold[] = [];
  private ropes: Rope[] = [];
  private characters: Character[] = [];
  private editorMode: EditorMode = 'select';
  private dragState: DragState = { isDragging: false, holdId: null, offsetX: 0, offsetY: 0 };
  private ropeCreation: RopeCreationState = { isCreating: false, startHoldId: null, mouseX: 0, mouseY: 0 };
  private selectedRopeId: string | null = null;
  private isSimulating: boolean = false;
  private animationId: number | null = null;
  private idCounter: number = 0;

  constructor(canvas: HTMLCanvasElement, physicsEngine: PhysicsEngine) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.physicsEngine = physicsEngine;
    this.resizeCanvas();
  }

  public resizeCanvas(): void {
    const container = this.canvas.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = Math.max(rect.height, 600);
    this.render();
  }

  public setEditorMode(mode: EditorMode): void {
    this.editorMode = mode;
  }

  public getHolds(): Hold[] {
    return this.holds;
  }

  public getRopes(): Rope[] {
    return this.ropes;
  }

  public getCharacters(): Character[] {
    return this.characters;
  }

  public handleMouseDown(x: number, y: number, button: number, shiftKey: boolean): void {
    if (this.isSimulating) return;

    const snapped = this.snapToGrid(x, y);

    if (button === 2) {
      this.handleRightClick(x, y);
      return;
    }

    const hitHold = this.findHoldAt(x, y);
    if (hitHold) {
      if (shiftKey && this.editorMode === 'select') {
        this.startRopeCreation(hitHold.id, x, y);
      } else {
        this.startDragging(hitHold.id, x, y);
      }
      return;
    }

    const hitRope = this.findRopeAt(x, y);
    if (hitRope) {
      this.selectedRopeId = hitRope.id;
      this.render();
      return;
    }

    this.selectedRopeId = null;

    if (this.editorMode === 'hold' || (this.editorMode === 'select' && !shiftKey)) {
      if (!hitHold && this.editorMode !== 'select') {
        this.addHold(snapped.x, snapped.y, 'hold');
      } else if (this.editorMode === 'select' && !shiftKey) {
        this.addHold(snapped.x, snapped.y, 'hold');
      }
    }

    if (this.editorMode === 'anchor' || shiftKey) {
      this.addHold(snapped.x, snapped.y, 'anchor');
    }

    this.render();
  }

  public handleMouseMove(x: number, y: number): void {
    const snapped = this.snapToGrid(x, y);

    if (this.dragState.isDragging && this.dragState.holdId) {
      const hold = this.holds.find(h => h.id === this.dragState.holdId);
      if (hold) {
        hold.x = snapped.x - this.dragState.offsetX;
        hold.y = snapped.y - this.dragState.offsetY;
        hold.x = this.snapToGrid(hold.x, hold.y).x;
        hold.y = this.snapToGrid(hold.x, hold.y).y;
        this.syncRopesWithPhysics();
      }
      this.render();
      return;
    }

    if (this.ropeCreation.isCreating) {
      this.ropeCreation.mouseX = x;
      this.ropeCreation.mouseY = y;
      this.render();
      return;
    }
  }

  public handleMouseUp(x: number, y: number): void {
    if (this.ropeCreation.isCreating && this.ropeCreation.startHoldId) {
      const endHold = this.findHoldAt(x, y);
      if (endHold && endHold.id !== this.ropeCreation.startHoldId) {
        this.addRope(this.ropeCreation.startHoldId, endHold.id);
      } else {
        const nearest = this.findNearestHold(x, y, SNAP_RADIUS);
        if (nearest && nearest.id !== this.ropeCreation.startHoldId) {
          this.addRope(this.ropeCreation.startHoldId, nearest.id);
        }
      }
      this.ropeCreation = { isCreating: false, startHoldId: null, mouseX: 0, mouseY: 0 };
      this.render();
    }

    this.dragState = { isDragging: false, holdId: null, offsetX: 0, offsetY: 0 };
  }

  public handleKeyDown(key: string): void {
    if (this.isSimulating) return;

    if ((key === 'Delete' || key === 'Backspace') && this.selectedRopeId) {
      this.deleteRope(this.selectedRopeId);
      this.selectedRopeId = null;
      this.render();
    }
  }

  public startSimulation(): void {
    if (this.ropes.length === 0) return;
    if (this.isSimulating) {
      this.stopSimulation();
      return;
    }

    this.isSimulating = true;
    this.characters = [];

    for (const rope of this.ropes) {
      const startHold = this.holds.find(h => h.id === rope.startHoldId);
      if (!startHold) continue;

      this.characters.push({
        id: this.generateId(),
        x: startHold.x,
        y: startHold.y,
        vx: 0,
        vy: 0,
        ropeId: rope.id,
        progress: 0,
        trail: []
      });
    }

    this.animate();
  }

  public stopSimulation(): void {
    this.isSimulating = false;
    this.characters = [];
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.render();
  }

  public getIsSimulating(): boolean {
    return this.isSimulating;
  }

  public exportRoute(): RouteData {
    return {
      holds: JSON.parse(JSON.stringify(this.holds)),
      ropes: this.ropes.map(r => ({
        id: r.id,
        startHoldId: r.startHoldId,
        endHoldId: r.endHoldId,
        segments: []
      }))
    };
  }

  public importRoute(data: RouteData): void {
    this.holds = data.holds || [];
    this.ropes = (data.ropes || []).map(r => ({
      ...r,
      segments: []
    }));
    this.characters = [];
    this.selectedRopeId = null;

    for (const rope of this.ropes) {
      this.physicsEngine.initRopeSegments(rope, this.holds);
    }

    this.idCounter = Math.max(
      ...this.holds.map(h => parseInt(h.id.split('_')[1]) || 0),
      ...this.ropes.map(r => parseInt(r.id.split('_')[1]) || 0),
      0
    ) + 1;

    this.render();
  }

  public render(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawGrid();
    this.drawRopes();
    this.drawRopeCreationPreview();
    this.drawHolds();
    this.drawCharacters();
  }

  private animate(): void {
    if (!this.isSimulating) return;

    const lastTime = performance.now();
    const loop = (time: number) => {
      if (!this.isSimulating) return;
      const dt = (time - lastTime) / 16.67;
      this.characters = this.physicsEngine.simulate(this.ropes, this.holds, this.characters, dt);
      this.render();
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  private drawGrid(): void {
    this.ctx.strokeStyle = COLOR_GRID;
    this.ctx.lineWidth = 1;

    for (let x = 0; x <= this.canvas.width; x += GRID_SIZE) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = 0; y <= this.canvas.height; y += GRID_SIZE) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  private drawHolds(): void {
    for (const hold of this.holds) {
      this.ctx.save();
      if (hold.type === 'hold') {
        this.ctx.fillStyle = COLOR_HOLD;
        this.ctx.strokeStyle = COLOR_BORDER;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(hold.x, hold.y, hold.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
      } else {
        this.ctx.fillStyle = COLOR_ANCHOR;
        this.ctx.strokeStyle = COLOR_BORDER;
        this.ctx.lineWidth = 2;
        this.ctx.translate(hold.x, hold.y);
        this.ctx.rotate(Math.PI / 4);
        this.ctx.fillRect(-ANCHOR_SIZE / 2, -ANCHOR_SIZE / 2, ANCHOR_SIZE, ANCHOR_SIZE);
        this.ctx.strokeRect(-ANCHOR_SIZE / 2, -ANCHOR_SIZE / 2, ANCHOR_SIZE, ANCHOR_SIZE);
      }
      this.ctx.restore();
    }
  }

  private drawRopes(): void {
    for (const rope of this.ropes) {
      const points = this.isSimulating
        ? this.physicsEngine.getRopePoints(rope.id)
        : this.getStaticRopePoints(rope);

      if (points.length < 2) continue;

      this.ctx.strokeStyle = this.selectedRopeId === rope.id ? '#ffffff' : COLOR_ROPE;
      this.ctx.lineWidth = 3;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      this.ctx.beginPath();
      this.ctx.moveTo(points[0].x, points[0].y);

      if (points.length === 2) {
        this.ctx.lineTo(points[1].x, points[1].y);
      } else {
        for (let i = 1; i < points.length - 2; i++) {
          const xc = (points[i].x + points[i + 1].x) / 2;
          const yc = (points[i].y + points[i + 1].y) / 2;
          this.ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        this.ctx.lineTo(points[points.length - 2].x, points[points.length - 2].y);
        this.ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      }
      this.ctx.stroke();

      if (this.selectedRopeId === rope.id) {
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }
    }
  }

  private getStaticRopePoints(rope: Rope): Point[] {
    const startHold = this.holds.find(h => h.id === rope.startHoldId);
    const endHold = this.holds.find(h => h.id === rope.endHoldId);
    if (!startHold || !endHold) return [];

    const midX = (startHold.x + endHold.x) / 2;
    const midY = Math.max(startHold.y, endHold.y) + 30;

    const points: Point[] = [];
    const segments = 15;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = (1 - t) * (1 - t) * startHold.x + 2 * (1 - t) * t * midX + t * t * endHold.x;
      const y = (1 - t) * (1 - t) * startHold.y + 2 * (1 - t) * t * midY + t * t * endHold.y;
      points.push({ x, y });
    }
    return points;
  }

  private drawRopeCreationPreview(): void {
    if (!this.ropeCreation.isCreating || !this.ropeCreation.startHoldId) return;

    const startHold = this.holds.find(h => h.id === this.ropeCreation.startHoldId);
    if (!startHold) return;

    this.ctx.strokeStyle = COLOR_ROPE;
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(startHold.x, startHold.y);
    this.ctx.lineTo(this.ropeCreation.mouseX, this.ropeCreation.mouseY);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  private drawCharacters(): void {
    for (const char of this.characters) {
      for (let i = 0; i < char.trail.length; i++) {
        const alpha = (i / char.trail.length) * 0.3;
        this.ctx.fillStyle = COLOR_CHARACTER;
        this.ctx.globalAlpha = alpha;
        this.ctx.beginPath();
        this.ctx.arc(char.trail[i].x, char.trail[i].y, CHARACTER_SIZE / 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.globalAlpha = 1;

      this.ctx.fillStyle = COLOR_CHARACTER;
      this.ctx.beginPath();
      this.ctx.arc(char.x, char.y, CHARACTER_SIZE / 2, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private addHold(x: number, y: number, type: 'hold' | 'anchor'): void {
    const hold: Hold = {
      id: this.generateId(),
      type,
      x,
      y,
      radius: HOLD_RADIUS
    };
    this.holds.push(hold);
  }

  private addRope(startHoldId: string, endHoldId: string): void {
    const exists = this.ropes.some(
      r => (r.startHoldId === startHoldId && r.endHoldId === endHoldId) ||
           (r.startHoldId === endHoldId && r.endHoldId === startHoldId)
    );
    if (exists) return;

    const rope: Rope = {
      id: this.generateId(),
      startHoldId,
      endHoldId,
      segments: []
    };
    this.ropes.push(rope);
    this.physicsEngine.initRopeSegments(rope, this.holds);
  }

  private deleteRope(ropeId: string): void {
    this.ropes = this.ropes.filter(r => r.id !== ropeId);
    this.physicsEngine.removeRope(ropeId);
  }

  private handleRightClick(x: number, y: number): void {
    const hitHold = this.findHoldAt(x, y);
    if (hitHold) {
      this.holds = this.holds.filter(h => h.id !== hitHold.id);
      const ropesToRemove = this.ropes.filter(
        r => r.startHoldId === hitHold.id || r.endHoldId === hitHold.id
      );
      for (const rope of ropesToRemove) {
        this.physicsEngine.removeRope(rope.id);
      }
      this.ropes = this.ropes.filter(
        r => r.startHoldId !== hitHold.id && r.endHoldId !== hitHold.id
      );
      this.render();
      return;
    }

    const hitRope = this.findRopeAt(x, y);
    if (hitRope) {
      this.deleteRope(hitRope.id);
      this.selectedRopeId = null;
      this.render();
    }
  }

  private startDragging(holdId: string, x: number, y: number): void {
    const hold = this.holds.find(h => h.id === holdId);
    if (!hold) return;
    this.dragState = {
      isDragging: true,
      holdId,
      offsetX: x - hold.x,
      offsetY: y - hold.y
    };
  }

  private startRopeCreation(holdId: string, x: number, y: number): void {
    this.ropeCreation = {
      isCreating: true,
      startHoldId: holdId,
      mouseX: x,
      mouseY: y
    };
  }

  private findHoldAt(x: number, y: number): Hold | null {
    for (const hold of this.holds) {
      const dx = x - hold.x;
      const dy = y - hold.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= hold.radius + 5) {
        return hold;
      }
    }
    return null;
  }

  private findNearestHold(x: number, y: number, maxDist: number): Hold | null {
    let nearest: Hold | null = null;
    let minDist = maxDist;

    for (const hold of this.holds) {
      const dx = x - hold.x;
      const dy = y - hold.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        nearest = hold;
      }
    }
    return nearest;
  }

  private findRopeAt(x: number, y: number): Rope | null {
    const threshold = 8;
    for (const rope of this.ropes) {
      const points = this.getStaticRopePoints(rope);
      for (let i = 0; i < points.length - 1; i++) {
        const dist = this.pointToSegmentDistance(
          x, y,
          points[i].x, points[i].y,
          points[i + 1].x, points[i + 1].y
        );
        if (dist <= threshold) {
          return rope;
        }
      }
    }
    return null;
  }

  private pointToSegmentDistance(
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) {
      return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    }
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
  }

  private snapToGrid(x: number, y: number): Point {
    const gridX = Math.round(x / GRID_SIZE) * GRID_SIZE;
    const gridY = Math.round(y / GRID_SIZE) * GRID_SIZE;
    const dx = Math.abs(x - gridX);
    const dy = Math.abs(y - gridY);
    return {
      x: dx <= GRID_SNAP_DISTANCE ? gridX : x,
      y: dy <= GRID_SNAP_DISTANCE ? gridY : y
    };
  }

  private syncRopesWithPhysics(): void {
    for (const rope of this.ropes) {
      this.physicsEngine.updateRopeSegments(rope, this.holds);
    }
  }

  private generateId(): string {
    return `id_${this.idCounter++}`;
  }
}
