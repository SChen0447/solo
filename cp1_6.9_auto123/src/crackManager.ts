import * as THREE from 'three';

interface CrackData {
  line: THREE.LineSegments;
  geometry: THREE.BufferGeometry;
  length: number;
  maxLength: number;
  width: number;
  targetWidth: number;
  startPoint: THREE.Vector3;
  direction: THREE.Vector3;
  points: THREE.Vector3[];
}

export class CrackManager {
  private scene: THREE.Scene;
  private buildings: THREE.Mesh[] = [];
  private buildingCracks: Map<THREE.Mesh, CrackData[]> = new Map();
  private crackGenerationTimer: Map<THREE.Mesh, number> = new Map();
  private readonly maxCracksPerBuilding: number = 5;
  private readonly minWidth: number = 0.05;
  private readonly maxWidth: number = 0.15;
  private frameCount: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public setBuildings(buildings: THREE.Mesh[]): void {
    this.buildings = buildings;
    for (const building of buildings) {
      this.buildingCracks.set(building, []);
      this.crackGenerationTimer.set(building, 0);
    }
  }

  private createJaggedPoints(
    start: THREE.Vector3,
    direction: THREE.Vector3,
    length: number
  ): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    const segments = Math.max(3, Math.floor(length * 3));

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const basePoint = start.clone().add(direction.clone().multiplyScalar(length * t));

      const perpX = -direction.z;
      const perpZ = direction.x;
      const offset = (Math.random() - 0.5) * 0.2 * length * t;

      basePoint.x += perpX * offset;
      basePoint.z += perpZ * offset;
      basePoint.y += (Math.random() - 0.5) * 0.1;

      points.push(basePoint);
    }

    return points;
  }

  private createCrackGeometry(points: THREE.Vector3[], width: number): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];

      const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
      const perp = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(width / 2);

      vertices.push(
        p1.x - perp.x, p1.y, p1.z - perp.z,
        p1.x + perp.x, p1.y, p1.z + perp.z,
        p2.x - perp.x, p2.y, p2.z - perp.z,
        p1.x + perp.x, p1.y, p1.z + perp.z,
        p2.x + perp.x, p2.y, p2.z + perp.z,
        p2.x - perp.x, p2.y, p2.z - perp.z
      );
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    return geometry;
  }

  private addCrackToBuilding(building: THREE.Mesh): void {
    const cracks = this.buildingCracks.get(building);
    if (!cracks || cracks.length >= this.maxCracksPerBuilding) return;

    const box = new THREE.Box3().setFromObject(building);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const face = Math.floor(Math.random() * 4);
    let startPoint: THREE.Vector3;
    let direction: THREE.Vector3;

    switch (face) {
      case 0:
        startPoint = new THREE.Vector3(
          center.x + (Math.random() - 0.5) * size.x,
          box.min.y + Math.random() * size.y * 0.7,
          box.max.z
        );
        direction = new THREE.Vector3((Math.random() - 0.5) * 0.3, 1, 0).normalize();
        break;
      case 1:
        startPoint = new THREE.Vector3(
          center.x + (Math.random() - 0.5) * size.x,
          box.min.y + Math.random() * size.y * 0.7,
          box.min.z
        );
        direction = new THREE.Vector3((Math.random() - 0.5) * 0.3, 1, 0).normalize();
        break;
      case 2:
        startPoint = new THREE.Vector3(
          box.min.x,
          box.min.y + Math.random() * size.y * 0.7,
          center.z + (Math.random() - 0.5) * size.z
        );
        direction = new THREE.Vector3(0, 1, (Math.random() - 0.5) * 0.3).normalize();
        break;
      default:
        startPoint = new THREE.Vector3(
          box.max.x,
          box.min.y + Math.random() * size.y * 0.7,
          center.z + (Math.random() - 0.5) * size.z
        );
        direction = new THREE.Vector3(0, 1, (Math.random() - 0.5) * 0.3).normalize();
    }

    const crackLength = 0.5 + Math.random();
    const maxLength = Math.min(2, crackLength + 1);

    const initialPoints = this.createJaggedPoints(startPoint, direction, crackLength);
    const geometry = this.createCrackGeometry(initialPoints, this.minWidth);

    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
    });

    const line = new THREE.LineSegments(geometry, material);
    this.scene.add(line);

    cracks.push({
      line,
      geometry,
      length: crackLength,
      maxLength,
      width: this.minWidth,
      targetWidth: this.minWidth,
      startPoint,
      direction,
      points: initialPoints,
    });
  }

  private updateCrackWidth(crack: CrackData): void {
    const widthDiff = crack.targetWidth - crack.width;
    if (Math.abs(widthDiff) > 0.001) {
      crack.width += widthDiff * 0.05;
      crack.width = Math.max(this.minWidth, Math.min(this.maxWidth, crack.width));

      const newGeometry = this.createCrackGeometry(crack.points, crack.width);
      crack.line.geometry.dispose();
      crack.line.geometry = newGeometry;
      crack.geometry = newGeometry;
    }
  }

  private extendCrack(crack: CrackData, deltaTime: number): void {
    if (crack.length >= crack.maxLength) return;

    const growthAmount = 0.1 * 60 * deltaTime;
    const newLength = Math.min(crack.maxLength, crack.length + growthAmount);

    if (newLength > crack.length) {
      crack.length = newLength;
      crack.points = this.createJaggedPoints(crack.startPoint, crack.direction, crack.length);

      const newGeometry = this.createCrackGeometry(crack.points, crack.width);
      crack.line.geometry.dispose();
      crack.line.geometry = newGeometry;
      crack.geometry = newGeometry;
    }
  }

  public update(temperature: number, deltaTime: number): void {
    this.frameCount++;

    const isExtremeCold = temperature < -20;

    for (const building of this.buildings) {
      const cracks = this.buildingCracks.get(building);
      if (!cracks) continue;

      if (isExtremeCold) {
        const timer = (this.crackGenerationTimer.get(building) || 0) + deltaTime;
        this.crackGenerationTimer.set(building, timer);

        if (timer >= 3 && cracks.length < this.maxCracksPerBuilding) {
          this.addCrackToBuilding(building);
          this.crackGenerationTimer.set(building, 0);
        }

        for (const crack of cracks) {
          crack.targetWidth = this.maxWidth;
          this.extendCrack(crack, deltaTime);
        }
      } else {
        for (const crack of cracks) {
          crack.targetWidth = this.minWidth;
        }
      }

      for (const crack of cracks) {
        this.updateCrackWidth(crack);
      }
    }
  }
}
