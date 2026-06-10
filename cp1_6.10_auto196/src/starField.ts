export interface Star {
  id: number;
  x: number;
  y: number;
  radius: number;
  color: string;
  glowRadius: number;
  glowAlpha: number;
  isBlinking: boolean;
  blinkStartTime: number;
  isRemoving: boolean;
  removeStartTime: number;
}

export interface StarTrack {
  fromId: number;
  toId: number;
}

export type AdjacencyList = Map<number, number[]>;

const STAR_COLORS = [
  '#ff6b8a',
  '#6dd3ff',
  '#ffd93d',
  '#c084fc',
  '#ff9f43',
  '#6bcb77'
];

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export class StarField {
  private stars: Star[] = [];
  private tracks: StarTrack[] = [];
  private adjacency: AdjacencyList = new Map();
  private nextId = 0;
  private canvasWidth: number;
  private canvasHeight: number;
  private lastGenerateTime = 0;
  private generateInterval: number;
  private hasGeneratedInitial = false;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.generateInterval = randRange(1500, 2500);
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  private createStar(): Star {
    const margin = 60;
    return {
      id: this.nextId++,
      x: randRange(margin, this.canvasWidth - margin),
      y: randRange(margin, this.canvasHeight - margin),
      radius: randRange(5, 10),
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      glowRadius: randRange(15, 25),
      glowAlpha: randRange(0.3, 0.6),
      isBlinking: false,
      blinkStartTime: 0,
      isRemoving: false,
      removeStartTime: 0
    };
  }

  generateStars(count?: number): void {
    const num = count ?? Math.floor(randRange(30, 50));
    for (let i = 0; i < num; i++) {
      this.stars.push(this.createStar());
    }
    this.buildTracks();
  }

  private buildTracks(): void {
    this.tracks = [];
    this.adjacency.clear();

    for (const star of this.stars) {
      this.adjacency.set(star.id, []);
    }

    for (const star of this.stars) {
      const distances: { id: number; dist: number }[] = [];
      for (const other of this.stars) {
        if (other.id === star.id) continue;
        const dx = star.x - other.x;
        const dy = star.y - other.y;
        distances.push({ id: other.id, dist: Math.sqrt(dx * dx + dy * dy) });
      }
      distances.sort((a, b) => a.dist - b.dist);
      const connectCount = Math.min(Math.floor(randRange(3, 6)), distances.length);
      for (let i = 0; i < connectCount; i++) {
        const neighborId = distances[i].id;
        if (!this.hasTrack(star.id, neighborId)) {
          this.addTrack(star.id, neighborId);
        }
      }
    }
  }

  private hasTrack(a: number, b: number): boolean {
    return this.tracks.some(
      t => (t.fromId === a && t.toId === b) || (t.fromId === b && t.toId === a)
    );
  }

  private addTrack(a: number, b: number): void {
    this.tracks.push({ fromId: a, toId: b });
    this.adjacency.get(a)?.push(b);
    this.adjacency.get(b)?.push(a);
  }

  update(currentTime: number): void {
    if (!this.hasGeneratedInitial) {
      this.generateStars();
      this.hasGeneratedInitial = true;
      this.lastGenerateTime = currentTime;
    }

    const remainingStars: Star[] = [];
    for (const star of this.stars) {
      if (star.isRemoving && currentTime - star.removeStartTime >= 1000) {
        continue;
      }
      if (star.isBlinking && currentTime - star.blinkStartTime >= 600) {
        star.isBlinking = false;
      }
      remainingStars.push(star);
    }
    const removedCount = this.stars.length - remainingStars.length;
    if (removedCount > 0) {
      this.stars = remainingStars;
      this.rebuildTracksForRemaining();
    }
  }

  private rebuildTracksForRemaining(): void {
    const validIds = new Set(this.stars.map(s => s.id));
    this.tracks = this.tracks.filter(
      t => validIds.has(t.fromId) && validIds.has(t.toId)
    );
    this.adjacency.clear();
    for (const star of this.stars) {
      this.adjacency.set(star.id, []);
    }
    for (const track of this.tracks) {
      this.adjacency.get(track.fromId)?.push(track.toId);
      this.adjacency.get(track.toId)?.push(track.fromId);
    }
  }

  findStarAtPoint(x: number, y: number): Star | null {
    for (let i = this.stars.length - 1; i >= 0; i--) {
      const star = this.stars[i];
      if (star.isRemoving) continue;
      const dx = x - star.x;
      const dy = y - star.y;
      const hitRadius = star.radius + 8;
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        return star;
      }
    }
    return null;
  }

  getStars(): Star[] {
    return this.stars;
  }

  getTracks(): StarTrack[] {
    return this.tracks;
  }

  getStarById(id: number): Star | undefined {
    return this.stars.find(s => s.id === id);
  }

  getNeighbors(starId: number): number[] {
    return this.adjacency.get(starId) ?? [];
  }

  findShortestPath(fromId: number, toId: number): number[] | null {
    if (fromId === toId) return [fromId];
    if (!this.adjacency.has(fromId) || !this.adjacency.has(toId)) return null;

    const visited = new Set<number>();
    const queue: { id: number; path: number[] }[] = [{ id: fromId, path: [fromId] }];
    visited.add(fromId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const neighbor of this.adjacency.get(current.id) ?? []) {
        if (visited.has(neighbor)) continue;
        const newPath = [...current.path, neighbor];
        if (neighbor === toId) {
          return newPath;
        }
        visited.add(neighbor);
        queue.push({ id: neighbor, path: newPath });
      }
    }
    return null;
  }

  removeStars(starIds: number[], currentTime: number): Star[] {
    const removed: Star[] = [];
    for (const id of starIds) {
      const star = this.stars.find(s => s.id === id);
      if (star && !star.isRemoving) {
        star.isRemoving = true;
        star.removeStartTime = currentTime;
        removed.push(star);
      }
    }
    return removed;
  }

  triggerBlink(starIds: number[], currentTime: number): void {
    for (const id of starIds) {
      const star = this.stars.find(s => s.id === id);
      if (star && !star.isRemoving) {
        star.isBlinking = true;
        star.blinkStartTime = currentTime;
      }
    }
  }

  reset(): void {
    this.stars = [];
    this.tracks = [];
    this.adjacency.clear();
    this.nextId = 0;
    this.hasGeneratedInitial = false;
  }

  getActiveStarCount(): number {
    return this.stars.filter(s => !s.isRemoving).length;
  }

  getStarColors(): string[] {
    return STAR_COLORS;
  }

  computeTrackAlignment(
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ): number {
    if (this.tracks.length === 0) return 0;

    const dragDx = endX - startX;
    const dragDy = endY - startY;
    const dragLen = Math.sqrt(dragDx * dragDx + dragDy * dragDy);
    if (dragLen < 1) return 0;

    let totalAlignedLength = 0;

    for (const track of this.tracks) {
      const from = this.getStarById(track.fromId);
      const to = this.getStarById(track.toId);
      if (!from || !to) continue;

      const overlap = this.segmentOverlapOnLine(
        from.x, from.y, to.x, to.y,
        startX, startY, endX, endY
      );
      totalAlignedLength += overlap;
    }

    return Math.min(1, totalAlignedLength / dragLen);
  }

  private segmentOverlapOnLine(
    ax: number, ay: number, bx: number, by: number,
    lx1: number, ly1: number, lx2: number, ly2: number
  ): number {
    const threshold = 20;

    const dx = bx - ax;
    const dy = by - ay;
    const segmentLen = Math.sqrt(dx * dx + dy * dy);
    if (segmentLen < 1) return 0;

    const dragDx = lx2 - lx1;
    const dragDy = ly2 - ly1;
    const dragLen = Math.sqrt(dragDx * dragDx + dragDy * dragDy);
    if (dragLen < 1) return 0;

    const dot = (dx * dragDx + dy * dragDy) / (segmentLen * dragLen);
    if (Math.abs(dot) < 0.5) return 0;

    const distA = this.pointToLineDistance(ax, ay, lx1, ly1, lx2, ly2);
    const distB = this.pointToLineDistance(bx, by, lx1, ly1, lx2, ly2);

    let overlap = 0;
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = ax + dx * t;
      const py = ay + dy * t;
      const dist = this.pointToSegmentDistance(px, py, lx1, ly1, lx2, ly2);
      if (dist < threshold) {
        overlap += segmentLen / steps;
      }
    }

    if (distA >= threshold && distB >= threshold) {
      overlap *= 0.5;
    }

    return overlap;
  }

  private pointToLineDistance(
    px: number, py: number,
    lx1: number, ly1: number,
    lx2: number, ly2: number
  ): number {
    const dx = lx2 - lx1;
    const dy = ly2 - ly1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.sqrt((px - lx1) ** 2 + (py - ly1) ** 2);
    const t = Math.max(0, Math.min(1, ((px - lx1) * dx + (py - ly1) * dy) / lenSq));
    const projX = lx1 + t * dx;
    const projY = ly1 + t * dy;
    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
  }

  private pointToSegmentDistance(
    px: number, py: number,
    sx1: number, sy1: number,
    sx2: number, sy2: number
  ): number {
    return this.pointToLineDistance(px, py, sx1, sy1, sx2, sy2);
  }
}
