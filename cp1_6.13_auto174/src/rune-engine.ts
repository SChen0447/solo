export interface Point {
  x: number;
  y: number;
}

export interface RuneObject {
  id: string;
  controlPoints: Point[];
  color: string;
  position: Point;
  rotation: number;
  scale: number;
  pulsePhase: number;
  selected: boolean;
  inCircle: string | null;
  circleAngle: number;
  gradientOffset: number;
}

export interface CircleObject {
  id: string;
  center: Point;
  radius: number;
  rotation: number;
  runeIds: string[];
}

export interface Connection {
  from: Point;
  to: Point;
}

export interface HistoryEntry {
  type: 'add' | 'move';
  runeId: string;
  prevPosition?: Point;
}

const MAGIC_COLORS = ['#00ffcc', '#ff66aa', '#aaccff', '#ffcc00', '#66ff99', '#cc66ff'];
const CONNECTION_DISTANCE = 80;
const MIN_CONTROL_POINTS = 5;
const CIRCLE_RADIUS = 150;

let runeIdCounter = 0;
let circleIdCounter = 0;

function generateId(prefix: string): string {
  return `${prefix}_${++runeIdCounter}_${Date.now()}`;
}

function generateCircleId(): string {
  return `circle_${++circleIdCounter}_${Date.now()}`;
}

function dist(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function perpendicularDist(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return dist(point, lineStart);
  const t = Math.max(0, Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSq));
  const proj: Point = { x: lineStart.x + t * dx, y: lineStart.y + t * dy };
  return dist(point, proj);
}

function douglasPeucker(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let maxIdx = 0;
  const end = points.length - 1;
  for (let i = 1; i < end; i++) {
    const d = perpendicularDist(points[i], points[0], points[end]);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }
  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, maxIdx + 1), epsilon);
    const right = douglasPeucker(points.slice(maxIdx), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[end]];
}

function getBoundingBox(points: Point[]): { min: Point; max: Point; center: Point } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    min: { x: minX, y: minY },
    max: { x: maxX, y: maxY },
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
  };
}

function simplifyPath(points: Point[]): Point[] {
  if (points.length < 3) return points;
  let simplified = douglasPeucker(points, 4);
  if (simplified.length < MIN_CONTROL_POINTS) {
    const step = (points.length - 1) / (MIN_CONTROL_POINTS - 1);
    simplified = [];
    for (let i = 0; i < MIN_CONTROL_POINTS; i++) {
      const idx = Math.min(Math.round(i * step), points.length - 1);
      simplified.push(points[idx]);
    }
  }
  return simplified;
}

export class RuneEngine {
  runes: RuneObject[] = [];
  history: HistoryEntry[] = [];
  circles: CircleObject[] = [];
  selectedRune: RuneObject | null = null;
  private _canvasWidth = 0;
  private _canvasHeight = 0;

  setCanvasSize(w: number, h: number): void {
    const oldW = this._canvasWidth || w;
    const oldH = this._canvasHeight || h;
    if (oldW > 0 && oldH > 0) {
      const sx = w / oldW;
      const sy = h / oldH;
      for (const r of this.runes) {
        r.position.x *= sx;
        r.position.y *= sy;
      }
      for (const c of this.circles) {
        c.center.x *= sx;
        c.center.y *= sy;
      }
    }
    this._canvasWidth = w;
    this._canvasHeight = h;
  }

  addRune(rawPoints: Point[]): RuneObject | null {
    if (rawPoints.length < 3) return null;
    const controlPoints = simplifyPath(rawPoints);
    if (controlPoints.length < MIN_CONTROL_POINTS) return null;
    const bbox = getBoundingBox(controlPoints);
    const color = MAGIC_COLORS[Math.floor(Math.random() * MAGIC_COLORS.length)];
    const rune: RuneObject = {
      id: generateId('rune'),
      controlPoints,
      color,
      position: { ...bbox.center },
      rotation: 0,
      scale: 1.0,
      pulsePhase: Math.random() * Math.PI * 2,
      selected: false,
      inCircle: null,
      circleAngle: 0,
      gradientOffset: Math.random() * Math.PI * 2,
    };
    for (const cp of rune.controlPoints) {
      cp.x -= bbox.center.x;
      cp.y -= bbox.center.y;
    }
    this.runes.push(rune);
    this.history.push({ type: 'add', runeId: rune.id });
    return rune;
  }

  removeRune(id: string): void {
    const idx = this.runes.findIndex(r => r.id === id);
    if (idx === -1) return;
    const removed = this.runes.splice(idx, 1)[0];
    if (this.selectedRune?.id === id) {
      this.selectedRune = null;
    }
    for (const circle of this.circles) {
      circle.runeIds = circle.runeIds.filter(rid => rid !== id);
    }
    this.history = this.history.filter(h => h.runeId !== id);
  }

  selectRune(x: number, y: number): RuneObject | null {
    if (this.selectedRune) {
      this.selectedRune.selected = false;
    }
    this.selectedRune = null;
    for (let i = this.runes.length - 1; i >= 0; i--) {
      const r = this.runes[i];
      if (this._hitTest(r, x, y)) {
        r.selected = true;
        this.selectedRune = r;
        return r;
      }
    }
    return null;
  }

  private _hitTest(rune: RuneObject, x: number, y: number): boolean {
    const dx = x - rune.position.x;
    const dy = y - rune.position.y;
    const cos = Math.cos(-rune.rotation);
    const sin = Math.sin(-rune.rotation);
    const lx = (dx * cos - dy * sin) / rune.scale;
    const ly = (dx * sin + dy * cos) / rune.scale;
    for (const cp of rune.controlPoints) {
      if (dist({ x: lx, y: ly }, cp) < 20) return true;
    }
    for (let i = 0; i < rune.controlPoints.length - 1; i++) {
      const a = rune.controlPoints[i];
      const b = rune.controlPoints[i + 1];
      if (this._pointToSegDist({ x: lx, y: ly }, a, b) < 15) return true;
    }
    return false;
  }

  private _pointToSegDist(p: Point, a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return dist(p, a);
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
    return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
  }

  moveRune(id: string, x: number, y: number): void {
    const rune = this.runes.find(r => r.id === id);
    if (!rune) return;
    const prev = { ...rune.position };
    rune.position.x = x;
    rune.position.y = y;
    if (!this.history.some(h => h.runeId === id && h.type === 'move' && h === this.history[this.history.length - 1])) {
      this.history.push({ type: 'move', runeId: id, prevPosition: prev });
    } else {
      const last = this.history[this.history.length - 1];
      if (last && last.type === 'move' && last.runeId === id) {
        // keep the original prevPosition
      }
    }
  }

  startMoveRune(id: string): void {
    const rune = this.runes.find(r => r.id === id);
    if (!rune) return;
    this.history.push({ type: 'move', runeId: id, prevPosition: { ...rune.position } });
  }

  rotateRune(id: string, angle: number): void {
    const rune = this.runes.find(r => r.id === id);
    if (rune) rune.rotation += angle;
  }

  scaleRune(id: string, delta: number): void {
    const rune = this.runes.find(r => r.id === id);
    if (!rune) return;
    const newScale = Math.round((rune.scale + delta) * 10) / 10;
    rune.scale = Math.max(0.5, Math.min(2.0, newScale));
  }

  undo(): void {
    if (this.history.length === 0) return;
    const entry = this.history.pop()!;
    if (entry.type === 'add') {
      const idx = this.runes.findIndex(r => r.id === entry.runeId);
      if (idx !== -1) {
        const removed = this.runes.splice(idx, 1)[0];
        if (this.selectedRune?.id === entry.runeId) this.selectedRune = null;
        for (const circle of this.circles) {
          circle.runeIds = circle.runeIds.filter(rid => rid !== entry.runeId);
        }
      }
    } else if (entry.type === 'move' && entry.prevPosition) {
      const rune = this.runes.find(r => r.id === entry.runeId);
      if (rune) {
        rune.position = { ...entry.prevPosition };
      }
    }
  }

  addCircle(x: number, y: number): CircleObject {
    const circle: CircleObject = {
      id: generateCircleId(),
      center: { x, y },
      radius: CIRCLE_RADIUS,
      rotation: 0,
      runeIds: [],
    };
    const nearbyRunes = this.runes.filter(r => {
      return dist(r.position, circle.center) <= circle.radius + 50;
    });
    for (let i = 0; i < nearbyRunes.length; i++) {
      const angle = (2 * Math.PI * i) / nearbyRunes.length;
      const rune = nearbyRunes[i];
      rune.inCircle = circle.id;
      rune.circleAngle = angle;
      circle.runeIds.push(rune.id);
    }
    this.circles.push(circle);
    return circle;
  }

  clearAll(): void {
    this.runes = [];
    this.circles = [];
    this.history = [];
    this.selectedRune = null;
    runeIdCounter = 0;
    circleIdCounter = 0;
  }

  getConnections(): Connection[] {
    const connections: Connection[] = [];
    for (let i = 0; i < this.runes.length; i++) {
      for (let j = i + 1; j < this.runes.length; j++) {
        const a = this.runes[i];
        const b = this.runes[j];
        if (dist(a.position, b.position) < CONNECTION_DISTANCE) {
          connections.push({ from: a.position, to: b.position });
        }
      }
    }
    return connections;
  }

  update(deltaTime: number): void {
    for (const circle of this.circles) {
      circle.rotation += 0.01 * deltaTime;
      for (const runeId of circle.runeIds) {
        const rune = this.runes.find(r => r.id === runeId);
        if (!rune) continue;
        const angle = rune.circleAngle + circle.rotation;
        const targetX = circle.center.x + Math.cos(angle) * circle.radius;
        const targetY = circle.center.y + Math.sin(angle) * circle.radius;
        rune.position.x += (targetX - rune.position.x) * 0.05;
        rune.position.y += (targetY - rune.position.y) * 0.05;
        const targetRotation = angle + Math.PI;
        let rotDiff = targetRotation - rune.rotation;
        while (rotDiff > Math.PI) rotDiff -= 2 * Math.PI;
        while (rotDiff < -Math.PI) rotDiff += 2 * Math.PI;
        rune.rotation += rotDiff * 0.05;
      }
    }
  }

  getSelectedCount(): number {
    return this.selectedRune ? 1 : 0;
  }
}
