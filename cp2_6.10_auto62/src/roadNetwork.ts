import * as THREE from 'three';

export type Direction = 'north' | 'east' | 'south' | 'west';

export interface Intersection {
  id: string;
  row: number;
  col: number;
  position: THREE.Vector3;
  signals: Record<Direction, SignalState>;
  mesh: THREE.Mesh;
  hitbox: THREE.Mesh;
}

export interface SignalState {
  greenDuration: number;
  isGreen: boolean;
  timer: number;
}

export interface RoadSegment {
  id: string;
  from: string;
  to: string;
  start: THREE.Vector3;
  end: THREE.Vector3;
  length: number;
  line: THREE.Line;
  trafficDensity: number;
  currentSpeed: number;
}

const GRID_SIZE = 6;
const CELL_SIZE = 12;
const BASE_GREEN_DURATION = 15;

export class RoadNetwork {
  public intersections: Map<string, Intersection> = new Map();
  public segments: Map<string, RoadSegment> = new Map();
  public group: THREE.Group = new THREE.Group();

  private directionOrder: Direction[] = ['north', 'east', 'south', 'west'];

  constructor() {
    this.generateNetwork();
  }

  private generateNetwork(): void {
    const offset = (GRID_SIZE - 1) * CELL_SIZE / 2;

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const id = this.getIntersectionId(row, col);
        const position = new THREE.Vector3(
          col * CELL_SIZE - offset,
          0,
          row * CELL_SIZE - offset
        );

        const signals = this.createDefaultSignals();

        const meshGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.3, 16);
        const meshMaterial = new THREE.MeshBasicMaterial({
          color: 0x00d4ff,
          transparent: true,
          opacity: 0.9
        });
        const mesh = new THREE.Mesh(meshGeometry, meshMaterial);
        mesh.position.copy(position);
        mesh.position.y = 0.15;

        const hitboxGeometry = new THREE.CylinderGeometry(1.5, 1.5, 2, 16);
        const hitboxMaterial = new THREE.MeshBasicMaterial({
          color: 0x00ffff,
          transparent: true,
          opacity: 0
        });
        const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
        hitbox.position.copy(position);
        hitbox.position.y = 1;
        hitbox.userData = { intersectionId: id, isIntersection: true };

        const intersection: Intersection = {
          id,
          row,
          col,
          position,
          signals,
          mesh,
          hitbox
        };

        this.intersections.set(id, intersection);
        this.group.add(mesh);
        this.group.add(hitbox);
      }
    }

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const currentId = this.getIntersectionId(row, col);

        if (col < GRID_SIZE - 1) {
          const rightId = this.getIntersectionId(row, col + 1);
          this.createSegment(currentId, rightId);
        }

        if (row < GRID_SIZE - 1) {
          const bottomId = this.getIntersectionId(row + 1, col);
          this.createSegment(currentId, bottomId);
        }
      }
    }
  }

  private createDefaultSignals(): Record<Direction, SignalState> {
    return {
      north: { greenDuration: BASE_GREEN_DURATION, isGreen: true, timer: 0 },
      east: { greenDuration: BASE_GREEN_DURATION, isGreen: false, timer: BASE_GREEN_DURATION * 0.5 },
      south: { greenDuration: BASE_GREEN_DURATION, isGreen: true, timer: 0 },
      west: { greenDuration: BASE_GREEN_DURATION, isGreen: false, timer: BASE_GREEN_DURATION * 0.5 }
    };
  }

  private createSegment(fromId: string, toId: string): void {
    const from = this.intersections.get(fromId);
    const to = this.intersections.get(toId);
    if (!from || !to) return;

    const segmentId = `${fromId}-${toId}`;
    const reverseId = `${toId}-${fromId}`;

    const positions = new Float32Array([
      from.position.x, 0.1, from.position.z,
      to.position.x, 0.1, to.position.z
    ]);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.7,
      linewidth: 2
    });

    const line = new THREE.Line(geometry, material);

    const length = from.position.distanceTo(to.position);

    const segment: RoadSegment = {
      id: segmentId,
      from: fromId,
      to: toId,
      start: from.position.clone(),
      end: to.position.clone(),
      length,
      line,
      trafficDensity: 0.2 + Math.random() * 0.3,
      currentSpeed: 1
    };

    this.segments.set(segmentId, segment);
    this.group.add(line);

    const reverseSegment: RoadSegment = {
      id: reverseId,
      from: toId,
      to: fromId,
      start: to.position.clone(),
      end: from.position.clone(),
      length,
      line: line.clone(),
      trafficDensity: 0.2 + Math.random() * 0.3,
      currentSpeed: 1
    };
    this.segments.set(reverseId, reverseSegment);
  }

  public getIntersectionId(row: number, col: number): string {
    const letter = String.fromCharCode(65 + row);
    return `${letter}${col + 1}`;
  }

  public getIntersectionPosition(id: string): THREE.Vector3 | null {
    const intersection = this.intersections.get(id);
    return intersection ? intersection.position.clone() : null;
  }

  public getNeighborIntersections(id: string): string[] {
    const intersection = this.intersections.get(id);
    if (!intersection) return [];

    const neighbors: string[] = [];
    const { row, col } = intersection;

    if (row > 0) neighbors.push(this.getIntersectionId(row - 1, col));
    if (row < GRID_SIZE - 1) neighbors.push(this.getIntersectionId(row + 1, col));
    if (col > 0) neighbors.push(this.getIntersectionId(row, col - 1));
    if (col < GRID_SIZE - 1) neighbors.push(this.getIntersectionId(row, col + 1));

    return neighbors;
  }

  public getSegment(from: string, to: string): RoadSegment | undefined {
    return this.segments.get(`${from}-${to}`);
  }

  public setSignalGreenDuration(intersectionId: string, direction: Direction, duration: number): void {
    const intersection = this.intersections.get(intersectionId);
    if (!intersection) return;

    const clampedDuration = Math.max(5, Math.min(30, duration));
    intersection.signals[direction].greenDuration = clampedDuration;
  }

  public updateSignals(deltaTime: number): void {
    this.intersections.forEach(intersection => {
      this.directionOrder.forEach(direction => {
        const signal = intersection.signals[direction];
        signal.timer += deltaTime;

        if (signal.timer >= signal.greenDuration) {
          signal.timer = 0;
          signal.isGreen = !signal.isGreen;
          this.updateIntersectionVisual(intersection);
        }
      });
    });
  }

  private updateIntersectionVisual(intersection: Intersection): void {
    const hasGreen = Object.values(intersection.signals).some(s => s.isGreen);
    const material = intersection.mesh.material as THREE.MeshBasicMaterial;
    material.color.setHex(hasGreen ? 0x00ff88 : 0xff4444);
  }

  public canPass(intersectionId: string, fromDirection: Direction): boolean {
    const intersection = this.intersections.get(intersectionId);
    if (!intersection) return true;
    return intersection.signals[fromDirection].isGreen;
  }

  public getDirectionFromTo(from: string, to: string): Direction | null {
    const fromIntersection = this.intersections.get(from);
    const toIntersection = this.intersections.get(to);
    if (!fromIntersection || !toIntersection) return null;

    const dx = toIntersection.col - fromIntersection.col;
    const dz = toIntersection.row - fromIntersection.row;

    if (dz < 0) return 'north';
    if (dz > 0) return 'south';
    if (dx > 0) return 'east';
    if (dx < 0) return 'west';

    return null;
  }

  public getGridSize(): number {
    return GRID_SIZE;
  }

  public getCellSize(): number {
    return CELL_SIZE;
  }

  public getAllIntersectionHitboxes(): THREE.Mesh[] {
    return Array.from(this.intersections.values()).map(i => i.hitbox);
  }

  public getIntersectionName(id: string): string {
    return `路口 ${id}`;
  }
}
