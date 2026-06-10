import * as THREE from 'three';
import { RoadNetwork, RoadSegment, Direction } from './roadNetwork';

export interface Vehicle {
  id: number;
  mesh: THREE.Mesh;
  trail: THREE.Points;
  trailPositions: Float32Array;
  trailAlphas: Float32Array;
  currentSegmentId: string;
  progress: number;
  path: string[];
  pathIndex: number;
  speed: number;
  baseSpeed: number;
  waiting: boolean;
  rerouteTimer: number;
  needsReroute: boolean;
}

export interface TrafficStats {
  totalVehicles: number;
  averageSpeed: number;
  topCongested: { id: string; density: number }[];
}

const MAX_VEHICLES = 120;
const SPAWN_INTERVAL = 0.3;
const BASE_SPEED = 8;
const TRAIL_LENGTH = 12;
const REROUTE_DELAY = 0.2;
const CONGESTION_THRESHOLD = 0.7;

export class TrafficFlow {
  public vehicles: Vehicle[] = [];
  public group: THREE.Group = new THREE.Group();
  private roadNetwork: RoadNetwork;
  private nextVehicleId = 0;
  private spawnTimer = 0;
  private segmentDensities: Map<string, number> = new Map();
  private segmentVehicleCounts: Map<string, number> = new Map();
  private heatmapData: Map<string, number> = new Map();
  private densityUpdateTimer = 0;

  constructor(roadNetwork: RoadNetwork) {
    this.roadNetwork = roadNetwork;
    this.initializeDensities();
  }

  private initializeDensities(): void {
    this.roadNetwork.segments.forEach((segment, id) => {
      this.segmentDensities.set(id, segment.trafficDensity);
      this.segmentVehicleCounts.set(id, 0);
      this.heatmapData.set(id, segment.trafficDensity);
    });
  }

  public update(deltaTime: number, timeScale: number): void {
    const scaledDelta = deltaTime * timeScale;

    this.spawnTimer += scaledDelta;
    if (this.spawnTimer >= SPAWN_INTERVAL && this.vehicles.length < MAX_VEHICLES) {
      this.spawnVehicle();
      this.spawnTimer = 0;
    }

    this.updateVehicles(scaledDelta);
    this.updateSegmentDensities(scaledDelta);

    this.densityUpdateTimer += deltaTime;
    if (this.densityUpdateTimer >= 0.5) {
      this.updateHeatmapData();
      this.densityUpdateTimer = 0;
    }
  }

  private spawnVehicle(): void {
    const intersectionIds = Array.from(this.roadNetwork.intersections.keys());
    const startId = intersectionIds[Math.floor(Math.random() * intersectionIds.length)];
    
    const neighbors = this.roadNetwork.getNeighborIntersections(startId);
    if (neighbors.length === 0) return;

    let endId = neighbors[Math.floor(Math.random() * neighbors.length)];
    while (endId === startId) {
      endId = intersectionIds[Math.floor(Math.random() * intersectionIds.length)];
    }

    const path = this.findPath(startId, endId);
    if (path.length < 2) return;

    const geometry = new THREE.SphereGeometry(0.15, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff6b35,
      transparent: true,
      opacity: 0.95
    });
    const mesh = new THREE.Mesh(geometry, material);

    const trailPositions = new Float32Array(TRAIL_LENGTH * 3);
    const trailAlphas = new Float32Array(TRAIL_LENGTH);
    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailGeometry.setAttribute('alpha', new THREE.BufferAttribute(trailAlphas, 1));

    const trailMaterial = new THREE.PointsMaterial({
      color: 0xff6b35,
      size: 0.1,
      transparent: true,
      opacity: 0.6,
      vertexColors: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const trail = new THREE.Points(trailGeometry, trailMaterial);

    const startPos = this.roadNetwork.getIntersectionPosition(startId);
    if (!startPos) return;
    mesh.position.copy(startPos);
    mesh.position.y = 0.3;

    for (let i = 0; i < TRAIL_LENGTH; i++) {
      trailPositions[i * 3] = startPos.x;
      trailPositions[i * 3 + 1] = 0.3;
      trailPositions[i * 3 + 2] = startPos.z;
      trailAlphas[i] = 0;
    }

    const firstSegment = this.roadNetwork.getSegment(path[0], path[1]);
    const vehicle: Vehicle = {
      id: this.nextVehicleId++,
      mesh,
      trail,
      trailPositions,
      trailAlphas,
      currentSegmentId: firstSegment?.id || '',
      progress: 0,
      path,
      pathIndex: 0,
      speed: BASE_SPEED,
      baseSpeed: BASE_SPEED,
      waiting: false,
      rerouteTimer: 0,
      needsReroute: false
    };

    this.vehicles.push(vehicle);
    this.group.add(mesh);
    this.group.add(trail);

    if (firstSegment) {
      const count = this.segmentVehicleCounts.get(firstSegment.id) || 0;
      this.segmentVehicleCounts.set(firstSegment.id, count + 1);
    }
  }

  private findPath(start: string, end: string): string[] {
    if (start === end) return [start];

    const openSet = new Map<string, { cost: number; heuristic: number; total: number; parent: string | null }>();
    const closedSet = new Set<string>();

    const startPos = this.roadNetwork.getIntersectionPosition(start);
    const endPos = this.roadNetwork.getIntersectionPosition(end);
    if (!startPos || !endPos) return [start];

    const heuristic = (id: string): number => {
      const pos = this.roadNetwork.getIntersectionPosition(id);
      return pos ? pos.distanceTo(endPos) : Infinity;
    };

    openSet.set(start, { cost: 0, heuristic: heuristic(start), total: heuristic(start), parent: null });

    while (openSet.size > 0) {
      let currentId = '';
      let currentLowest = Infinity;

      openSet.forEach((data, id) => {
        if (data.total < currentLowest) {
          currentLowest = data.total;
          currentId = id;
        }
      });

      if (currentId === end) {
        const path: string[] = [];
        let nodeId: string | null = currentId;
        while (nodeId) {
          path.unshift(nodeId);
          nodeId = openSet.get(nodeId)?.parent || null;
        }
        return path;
      }

      const current = openSet.get(currentId)!;
      openSet.delete(currentId);
      closedSet.add(currentId);

      const neighbors = this.roadNetwork.getNeighborIntersections(currentId);
      for (const neighbor of neighbors) {
        if (closedSet.has(neighbor)) continue;

        const segment = this.roadNetwork.getSegment(currentId, neighbor);
        if (!segment) continue;

        const density = this.segmentDensities.get(segment.id) || 0.5;
        const segmentCost = segment.length * (1 + density * 2);
        const tentativeCost = current.cost + segmentCost;

        const existing = openSet.get(neighbor);
        if (!existing || tentativeCost < existing.cost) {
          openSet.set(neighbor, {
            cost: tentativeCost,
            heuristic: heuristic(neighbor),
            total: tentativeCost + heuristic(neighbor),
            parent: currentId
          });
        }
      }
    }

    return [start];
  }

  private updateVehicles(scaledDelta: number): void {
    const toRemove: number[] = [];

    for (let i = 0; i < this.vehicles.length; i++) {
      const vehicle = this.vehicles[i];

      if (vehicle.pathIndex >= vehicle.path.length - 1) {
        toRemove.push(i);
        continue;
      }

      const currentIntersection = vehicle.path[vehicle.pathIndex];
      const nextIntersection = vehicle.path[vehicle.pathIndex + 1];
      const segment = this.roadNetwork.getSegment(currentIntersection, nextIntersection);

      if (!segment) {
        toRemove.push(i);
        continue;
      }

      if (vehicle.needsReroute) {
        vehicle.rerouteTimer += scaledDelta;
        if (vehicle.rerouteTimer >= REROUTE_DELAY) {
          const destination = vehicle.path[vehicle.path.length - 1];
          const newPath = this.findPath(currentIntersection, destination);
          if (newPath.length > 1) {
            vehicle.path = newPath;
            vehicle.pathIndex = 0;
          }
          vehicle.needsReroute = false;
          vehicle.rerouteTimer = 0;
        }
      }

      const direction = this.roadNetwork.getDirectionFromTo(currentIntersection, nextIntersection);
      const canProceed = direction ? this.roadNetwork.canPass(nextIntersection, direction) : true;

      const oldCount = this.segmentVehicleCounts.get(segment.id) || 0;
      const congestionLevel = Math.min(1, oldCount / 15);
      vehicle.speed = vehicle.baseSpeed * (1 - congestionLevel * 0.5);

      if (!canProceed && vehicle.progress > 0.85) {
        vehicle.waiting = true;
      } else {
        vehicle.waiting = false;
      }

      if (!vehicle.waiting) {
        const moveDistance = vehicle.speed * scaledDelta;
        vehicle.progress += moveDistance / segment.length;

        const density = this.segmentDensities.get(segment.id) || 0.5;
        if (density > CONGESTION_THRESHOLD && Math.random() < 0.02) {
          vehicle.needsReroute = true;
        }
      }

      if (vehicle.progress >= 1) {
        vehicle.progress = 0;
        vehicle.pathIndex++;

        const count = this.segmentVehicleCounts.get(segment.id) || 0;
        this.segmentVehicleCounts.set(segment.id, Math.max(0, count - 1));

        if (vehicle.pathIndex < vehicle.path.length - 1) {
          const nextSeg = this.roadNetwork.getSegment(
            vehicle.path[vehicle.pathIndex],
            vehicle.path[vehicle.pathIndex + 1]
          );
          if (nextSeg) {
            vehicle.currentSegmentId = nextSeg.id;
            const nextCount = this.segmentVehicleCounts.get(nextSeg.id) || 0;
            this.segmentVehicleCounts.set(nextSeg.id, nextCount + 1);
          }
        }
      }

      this.updateVehiclePosition(vehicle, segment);
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.removeVehicle(toRemove[i]);
    }
  }

  private updateVehiclePosition(vehicle: Vehicle, segment: RoadSegment): void {
    const t = Math.min(1, Math.max(0, vehicle.progress));
    const x = segment.start.x + (segment.end.x - segment.start.x) * t;
    const z = segment.start.z + (segment.end.z - segment.start.z) * t;

    for (let i = TRAIL_LENGTH - 1; i > 0; i--) {
      vehicle.trailPositions[i * 3] = vehicle.trailPositions[(i - 1) * 3];
      vehicle.trailPositions[i * 3 + 1] = vehicle.trailPositions[(i - 1) * 3 + 1];
      vehicle.trailPositions[i * 3 + 2] = vehicle.trailPositions[(i - 1) * 3 + 2];
      vehicle.trailAlphas[i] = vehicle.trailAlphas[i - 1] * 0.9;
    }

    vehicle.trailPositions[0] = x;
    vehicle.trailPositions[1] = 0.3;
    vehicle.trailPositions[2] = z;
    vehicle.trailAlphas[0] = 0.8;

    const posAttr = vehicle.trail.geometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;

    vehicle.mesh.position.set(x, 0.3, z);

    const color = vehicle.waiting ? 0xff4444 : 0xff6b35;
    (vehicle.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
  }

  private removeVehicle(index: number): void {
    const vehicle = this.vehicles[index];
    const count = this.segmentVehicleCounts.get(vehicle.currentSegmentId) || 0;
    this.segmentVehicleCounts.set(vehicle.currentSegmentId, Math.max(0, count - 1));

    this.group.remove(vehicle.mesh);
    this.group.remove(vehicle.trail);
    vehicle.mesh.geometry.dispose();
    (vehicle.mesh.material as THREE.Material).dispose();
    vehicle.trail.geometry.dispose();
    (vehicle.trail.material as THREE.Material).dispose();

    this.vehicles.splice(index, 1);
  }

  private updateSegmentDensities(scaledDelta: number): void {
    this.roadNetwork.segments.forEach((segment, id) => {
      const vehicleCount = this.segmentVehicleCounts.get(id) || 0;
      const targetDensity = Math.min(1, vehicleCount / 12 + 0.15);
      const currentDensity = this.segmentDensities.get(id) || 0.3;
      const newDensity = currentDensity + (targetDensity - currentDensity) * Math.min(1, scaledDelta * 2);
      this.segmentDensities.set(id, newDensity);

      const lineMaterial = segment.line.material as THREE.LineBasicMaterial;
      const hue = 0.4 - newDensity * 0.4;
      lineMaterial.color.setHSL(hue, 0.8, 0.5 + newDensity * 0.2);
      lineMaterial.opacity = 0.5 + newDensity * 0.4;
    });
  }

  private updateHeatmapData(): void {
    this.roadNetwork.segments.forEach((segment, id) => {
      const density = this.segmentDensities.get(id) || 0;
      this.heatmapData.set(id, density);
    });
  }

  public getHeatmapData(): Map<string, number> {
    return new Map(this.heatmapData);
  }

  public getStats(): TrafficStats {
    let totalSpeed = 0;
    let activeVehicles = 0;

    for (const vehicle of this.vehicles) {
      if (!vehicle.waiting) {
        totalSpeed += vehicle.speed;
        activeVehicles++;
      }
    }

    const avgSpeed = activeVehicles > 0 ? (totalSpeed / activeVehicles) * 3.6 : 0;

    const densities: { id: string; density: number }[] = [];
    this.segmentDensities.forEach((density, id) => {
      densities.push({ id, density });
    });

    densities.sort((a, b) => b.density - a.density);
    const topCongested = densities.slice(0, 3).map(d => ({
      id: d.id,
      density: d.density
    }));

    return {
      totalVehicles: this.vehicles.length,
      averageSpeed: Math.round(avgSpeed * 10) / 10,
      topCongested
    };
  }

  public triggerReroute(): void {
    for (const vehicle of this.vehicles) {
      if (Math.random() < 0.3) {
        vehicle.needsReroute = true;
      }
    }
  }
}
