import * as THREE from 'three';
import { Plate } from './Plate';
import { Rift } from './Rift';
import { SpatialHash } from './SpatialHash';
import type { PlateSettings, CollisionEvent } from '../types';
import { PLATE_COLORS, PLATE_NAMES } from '../types';

type EventCallback = (event: CollisionEvent) => void;
type SelectCallback = (plate: Plate | null) => void;

export class PlateManager {
  private scene: THREE.Scene;
  private plates: Plate[];
  private rifts: Map<string, Rift>;
  private spatialHash: SpatialHash;
  private settings: PlateSettings;
  private timeMultiplier: number;
  private totalCollisions: number;
  private simulationTime: number;
  private eventListeners: Map<string, EventCallback[]>;
  private selectListeners: SelectCallback[];
  private selectedPlate: Plate | null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.plates = [];
    this.rifts = new Map();
    this.spatialHash = new SpatialHash(1);
    this.settings = {
      driftSpeed: 0.02,
      upliftAmount: 0.2,
      opacity: 0.8
    };
    this.timeMultiplier = 1;
    this.totalCollisions = 0;
    this.simulationTime = 0;
    this.eventListeners = new Map();
    this.selectListeners = [];
    this.selectedPlate = null;

    this.initializePlates();
  }

  private generatePolygonVertices(
    centerX: number,
    centerZ: number,
    radius: number,
    sides: number
  ): THREE.Vector3[] {
    const vertices: THREE.Vector3[] = [];
    const points = sides + Math.floor(Math.random() * 3);
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2 + Math.random() * 0.3;
      const r = radius * (0.7 + Math.random() * 0.5);
      const x = centerX + Math.cos(angle) * r;
      const z = centerZ + Math.sin(angle) * r;
      vertices.push(new THREE.Vector3(x, 0, z));
    }
    return vertices;
  }

  private initializePlates(): void {
    const usedColors = new Set<number>();
    const usedNames = new Set<number>();
    const distributionRadius = 15;

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.random() * 0.5;
      const r = distributionRadius * (0.5 + Math.random() * 0.4);
      const cx = Math.cos(angle) * r;
      const cz = Math.sin(angle) * r;

      let colorIdx: number;
      do {
        colorIdx = Math.floor(Math.random() * PLATE_COLORS.length);
      } while (usedColors.has(colorIdx) && usedColors.size < PLATE_COLORS.length);
      usedColors.add(colorIdx);

      let nameIdx: number;
      do {
        nameIdx = Math.floor(Math.random() * PLATE_NAMES.length);
      } while (usedNames.has(nameIdx) && usedNames.size < PLATE_NAMES.length);
      usedNames.add(nameIdx);

      const sides = 5 + Math.floor(Math.random() * 2);
      const vertices = this.generatePolygonVertices(cx, cz, 10, sides);

      const driftAngle = Math.random() * Math.PI * 2;
      const driftDir = new THREE.Vector2(Math.cos(driftAngle), Math.sin(driftAngle));

      const plate = new Plate(
        `plate-${i}`,
        PLATE_NAMES[nameIdx],
        vertices,
        PLATE_COLORS[colorIdx],
        driftDir
      );

      this.plates.push(plate);
      this.scene.add(plate.mesh);
    }
  }

  public update(dt: number): void {
    for (const plate of this.plates) {
      plate.update(dt, this.settings, this.timeMultiplier);
    }

    this.detectCollisions();
    this.detectRifts();

    this.simulationTime += dt * 0.5 * this.timeMultiplier;
  }

  private detectCollisions(): void {
    this.spatialHash.clear();

    for (let pi = 0; pi < this.plates.length; pi++) {
      const plate = this.plates[pi];
      for (const v of plate.getVertices()) {
        this.spatialHash.insert(v, { plateIndex: pi });
      }
    }

    const collisionPairs = new Set<string>();
    const collisionRadius = 0.5;

    for (let pi = 0; pi < this.plates.length; pi++) {
      const plate = this.plates[pi];
      for (const v of plate.getVertices()) {
        const nearby = this.spatialHash.queryRadius(v, collisionRadius);
        for (const entry of nearby) {
          const data = entry.data as { plateIndex: number };
          if (data.plateIndex <= pi) continue;

          const pairKey = `${pi}-${data.plateIndex}`;
          if (collisionPairs.has(pairKey)) continue;
          collisionPairs.add(pairKey);

          const other = this.plates[data.plateIndex];
          const collisionPoint = new THREE.Vector3()
            .addVectors(v, entry.point)
            .multiplyScalar(0.5);

          plate.setCollisionForce(collisionPoint, this.settings.upliftAmount);
          other.setCollisionForce(collisionPoint, this.settings.upliftAmount);
          plate.incrementCollisionCount();
          other.incrementCollisionCount();
          this.totalCollisions++;

          const event: CollisionEvent = {
            plateAId: plate.id,
            plateBId: other.id,
            point: collisionPoint,
            timestamp: performance.now()
          };
          this.emit('collision', event);
        }
      }
    }
  }

  private getRiftKey(aId: string, bId: string): string {
    return aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
  }

  private detectRifts(): void {
    const activeRifts = new Set<string>();

    for (let i = 0; i < this.plates.length; i++) {
      for (let j = i + 1; j < this.plates.length; j++) {
        const a = this.plates[i];
        const b = this.plates[j];
        const centerA = a.getCenter();
        const centerB = b.getCenter();
        const dx = centerB.x - centerA.x;
        const dz = centerB.y - centerA.y;
        const distance = Math.sqrt(dx * dx + dz * dz);

        const dirA = a.getDriftDirection();
        const dirB = b.getDriftDirection();
        const relVelX = dirB.x - dirA.x;
        const relVelZ = dirB.y - dirA.y;
        const dirNorm = Math.sqrt(relVelX * relVelX + relVelZ * relVelZ);
        const normX = dx / (distance || 1);
        const normZ = dz / (distance || 1);
        const relativeSpeed = (relVelX * normX + relVelZ * normZ) * this.settings.driftSpeed;

        if (distance > 2 && relativeSpeed > 0.02) {
          const key = this.getRiftKey(a.id, b.id);
          activeRifts.add(key);

          const startPoint = new THREE.Vector3(centerA.x, 0, centerA.y);
          const endPoint = new THREE.Vector3(centerB.x, 0, centerB.y);

          let rift = this.rifts.get(key);
          if (!rift) {
            rift = new Rift(`rift-${key}`, a.id, b.id, startPoint, endPoint);
            this.rifts.set(key, rift);
            this.scene.add(rift.mesh);
            for (const debris of rift.debris) {
              this.scene.add(debris);
            }
          } else {
            rift.updatePosition(startPoint, endPoint);
          }
        }
      }
    }

    for (const [key, rift] of this.rifts) {
      if (!activeRifts.has(key)) {
        this.scene.remove(rift.mesh);
        for (const debris of rift.debris) {
          this.scene.remove(debris);
        }
        rift.dispose();
        this.rifts.delete(key);
      }
    }
  }

  public updateSettings(settings: Partial<PlateSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  public getSettings(): PlateSettings {
    return { ...this.settings };
  }

  public setTimeMultiplier(multiplier: number): void {
    this.timeMultiplier = multiplier;
  }

  public getTimeMultiplier(): number {
    return this.timeMultiplier;
  }

  public getTotalCollisions(): number {
    return this.totalCollisions;
  }

  public getSimulationTime(): number {
    return this.simulationTime;
  }

  public getPlates(): Plate[] {
    return this.plates;
  }

  public handleClick(intersects: THREE.Intersection[]): Plate | null {
    let newSelected: Plate | null = null;

    for (const hit of intersects) {
      for (const plate of this.plates) {
        if (hit.object === plate.mesh || plate.mesh.children.includes(hit.object as THREE.Object3D)) {
          newSelected = plate;
          break;
        }
      }
      if (newSelected) break;
    }

    if (this.selectedPlate && this.selectedPlate !== newSelected) {
      this.selectedPlate.setHighlighted(false);
    }
    if (newSelected && newSelected !== this.selectedPlate) {
      newSelected.setHighlighted(true);
    }
    this.selectedPlate = newSelected;

    for (const cb of this.selectListeners) {
      cb(this.selectedPlate);
    }

    return this.selectedPlate;
  }

  public getSelectedPlate(): Plate | null {
    return this.selectedPlate;
  }

  public on(event: string, callback: EventCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public onSelect(callback: SelectCallback): void {
    this.selectListeners.push(callback);
  }

  private emit(event: string, data: CollisionEvent): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const cb of listeners) {
        cb(data);
      }
    }
  }
}
