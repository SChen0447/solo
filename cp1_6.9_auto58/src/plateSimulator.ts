import * as THREE from 'three';
import * as d3 from 'd3';

export interface PlateData {
  id: string;
  name: string;
  color: number;
  polygonPoints: THREE.Vector2[];
  driftPath: THREE.Vector3[];
  collisionEvents: number[];
  crackZones: THREE.Vector2[];
}

export interface PlateState {
  id: string;
  position: THREE.Vector3;
  rotation: number;
  isColliding: boolean;
  collisionPoint: THREE.Vector3 | null;
}

export class PlateSimulator {
  private plates: Map<string, PlateData> = new Map();
  private plateStates: Map<string, PlateState> = new Map();
  private plateMeshes: Map<string, THREE.Mesh> = new Map();
  private plateGroup: THREE.Group;
  private pathLines: Map<string, THREE.Line> = new Map();
  private crackHighlights: Map<string, THREE.LineSegments> = new Map();
  private currentTime: number = 0;
  private onCollisionCallback: ((plate1: string, plate2: string, point: THREE.Vector3) => void) | null = null;
  private lastCollisionState: Map<string, boolean> = new Map();
  private plateOriginalPositions: THREE.Vector3[] | null = null;
  private shakeAmplitude: number = 0;
  private shakeStartTime: number = 0;

  constructor(scene: THREE.Scene) {
    this.plateGroup = new THREE.Group();
    scene.add(this.plateGroup);
    this.initializePlates();
  }

  private initializePlates(): void {
    const plate1: PlateData = {
      id: 'plate1',
      name: '大陆板块A',
      color: 0x8B7355,
      polygonPoints: this.generateIrregularPolygon(8, 40),
      driftPath: this.generateDriftPath(
        new THREE.Vector3(-150, 0, -80),
        new THREE.Vector3(80, 0, 60),
        20
      ),
      collisionEvents: [80, 120, 160],
      crackZones: [
        new THREE.Vector2(-20, 10),
        new THREE.Vector2(15, -15),
        new THREE.Vector2(5, 25)
      ]
    };

    const plate2: PlateData = {
      id: 'plate2',
      name: '海洋板块B',
      color: 0x4682B4,
      polygonPoints: this.generateIrregularPolygon(7, 35),
      driftPath: this.generateDriftPath(
        new THREE.Vector3(120, 0, 100),
        new THREE.Vector3(-60, 0, -50),
        20
      ),
      collisionEvents: [80, 120, 160],
      crackZones: [
        new THREE.Vector2(-10, -20),
        new THREE.Vector2(20, 5)
      ]
    };

    this.plates.set(plate1.id, plate1);
    this.plates.set(plate2.id, plate2);

    this.plates.forEach((plate) => {
      this.createPlateMesh(plate);
      this.createDriftPathLine(plate);
      this.createCrackHighlights(plate);
      this.plateStates.set(plate.id, {
        id: plate.id,
        position: plate.driftPath[0].clone(),
        rotation: 0,
        isColliding: false,
        collisionPoint: null
      });
      this.lastCollisionState.set(plate.id, false);
    });
  }

  private generateIrregularPolygon(sides: number, radius: number): THREE.Vector2[] {
    const points: THREE.Vector2[] = [];
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const r = radius * (0.7 + Math.random() * 0.6);
      points.push(new THREE.Vector2(
        Math.cos(angle) * r,
        Math.sin(angle) * r
      ));
    }
    return points;
  }

  private generateDriftPath(start: THREE.Vector3, end: THREE.Vector3, segments: number): THREE.Vector3[] {
    const path: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = start.x + (end.x - start.x) * t + Math.sin(t * Math.PI * 3) * 30;
      const z = start.z + (end.z - start.z) * t + Math.cos(t * Math.PI * 2) * 25;
      path.push(new THREE.Vector3(x, 0, z));
    }
    return path;
  }

  private createPlateMesh(plate: PlateData): void {
    const shape = new THREE.Shape();
    shape.moveTo(plate.polygonPoints[0].x, plate.polygonPoints[0].y);
    for (let i = 1; i < plate.polygonPoints.length; i++) {
      shape.lineTo(plate.polygonPoints[i].x, plate.polygonPoints[i].y);
    }
    shape.closePath();

    const extrudeSettings = {
      depth: 3,
      bevelEnabled: true,
      bevelThickness: 1,
      bevelSize: 1,
      bevelSegments: 2
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.rotateX(-Math.PI / 2);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(256, 256, 50, 256, 256, 256);
    const color = new THREE.Color(plate.color);
    gradient.addColorStop(0, `rgb(${color.r * 255}, ${color.g * 255}, ${color.b * 255})`);
    gradient.addColorStop(1, `rgb(${color.r * 180}, ${color.g * 180}, ${color.b * 180})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = `rgba(${Math.random() * 60 + 40}, ${Math.random() * 40 + 20}, ${Math.random() * 30 + 10}, 0.3)`;
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 15 + 2, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    const material = new THREE.MeshPhongMaterial({
      map: texture,
      color: 0xffffff,
      shininess: 10,
      transparent: true,
      opacity: 0.95
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.plateId = plate.id;
    mesh.userData.texture = texture;
    mesh.position.copy(plate.driftPath[0]);
    mesh.receiveShadow = true;
    mesh.castShadow = true;

    this.plateMeshes.set(plate.id, mesh);
    this.plateGroup.add(mesh);
  }

  private createDriftPathLine(plate: PlateData): void {
    const points = plate.driftPath.map(p => new THREE.Vector3(p.x, 0.5, p.z));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
      color: 0x4a9eff,
      dashSize: 3,
      gapSize: 2,
      transparent: true,
      opacity: 0.4
    });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    this.pathLines.set(plate.id, line);
    this.plateGroup.add(line);
  }

  private createCrackHighlights(plate: PlateData): void {
    const points: THREE.Vector3[] = [];
    plate.crackZones.forEach((zone, index) => {
      const nextZone = plate.crackZones[(index + 1) % plate.crackZones.length];
      points.push(new THREE.Vector3(zone.x, 3.5, zone.y));
      points.push(new THREE.Vector3(nextZone.x, 3.5, nextZone.y));
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xff3333,
      transparent: true,
      opacity: 0.6
    });
    const lines = new THREE.LineSegments(geometry, material);
    this.crackHighlights.set(plate.id, lines);
    this.plateGroup.add(lines);
  }

  public setCollisionCallback(callback: (plate1: string, plate2: string, point: THREE.Vector3) => void): void {
    this.onCollisionCallback = callback;
  }

  public update(timeInMillionsYears: number, deltaTime: number, simulationSpeed: number): void {
    this.currentTime = timeInMillionsYears;
    const normalizedTime = Math.min(timeInMillionsYears / 200, 1);

    const positions: THREE.Vector3[] = [];

    this.plates.forEach((plate, plateId) => {
      const state = this.plateStates.get(plateId)!;
      const mesh = this.plateMeshes.get(plateId)!;

      const pathIndex = normalizedTime * (plate.driftPath.length - 1);
      const pathFloor = Math.floor(pathIndex);
      const pathCeil = Math.min(pathFloor + 1, plate.driftPath.length - 1);
      const pathT = pathIndex - pathFloor;

      const startPoint = plate.driftPath[pathFloor];
      const endPoint = plate.driftPath[pathCeil];

      let newX = startPoint.x + (endPoint.x - startPoint.x) * pathT;
      let newZ = startPoint.z + (endPoint.z - startPoint.z) * pathT;

      if (this.shakeAmplitude > 0) {
        const elapsed = (performance.now() - this.shakeStartTime) / 1000;
        if (elapsed < 0.5) {
          const shakeX = (Math.random() - 0.5) * this.shakeAmplitude * 2;
          const shakeZ = (Math.random() - 0.5) * this.shakeAmplitude * 2;
          newX += shakeX;
          newZ += shakeZ;
        } else {
          this.shakeAmplitude = 0;
        }
      }

      state.position.set(newX, 0, newZ);
      state.rotation = normalizedTime * Math.PI * 0.3;

      mesh.position.copy(state.position);
      mesh.position.y = 0;
      mesh.rotation.y = state.rotation;

      const texture = mesh.userData.texture as THREE.Texture;
      texture.offset.x += deltaTime * simulationSpeed * 0.1;
      texture.offset.y += deltaTime * simulationSpeed * 0.05;
      texture.needsUpdate = true;

      const crackLines = this.crackHighlights.get(plateId)!;
      crackLines.position.copy(state.position);
      crackLines.position.y = 0;
      crackLines.rotation.y = state.rotation;

      positions.push(state.position.clone());
    });

    this.detectCollisions();
  }

  public triggerShake(): void {
    this.shakeAmplitude = 2;
    this.shakeStartTime = performance.now();
  }

  private detectCollisions(): void {
    const plateIds = Array.from(this.plates.keys());
    for (let i = 0; i < plateIds.length; i++) {
      for (let j = i + 1; j < plateIds.length; j++) {
        const state1 = this.plateStates.get(plateIds[i])!;
        const state2 = this.plateStates.get(plateIds[j])!;
        const distance = state1.position.distanceTo(state2.position);

        const wasColliding = this.lastCollisionState.get(plateIds[i]) && this.lastCollisionState.get(plateIds[j]);
        const isColliding = distance < 80;

        state1.isColliding = isColliding;
        state2.isColliding = isColliding;

        if (isColliding && !wasColliding) {
          const collisionPoint = new THREE.Vector3(
            (state1.position.x + state2.position.x) / 2,
            0,
            (state1.position.z + state2.position.z) / 2
          );
          state1.collisionPoint = collisionPoint.clone();
          state2.collisionPoint = collisionPoint.clone();

          if (this.onCollisionCallback) {
            this.onCollisionCallback(plateIds[i], plateIds[j], collisionPoint);
          }
        }

        this.lastCollisionState.set(plateIds[i], isColliding);
        this.lastCollisionState.set(plateIds[j], isColliding);
      }
    }
  }

  public getPlateMeshes(): THREE.Mesh[] {
    return Array.from(this.plateMeshes.values());
  }

  public getPlateState(plateId: string): PlateState | undefined {
    return this.plateStates.get(plateId);
  }

  public getPlateData(plateId: string): PlateData | undefined {
    return this.plates.get(plateId);
  }

  public getAllPlateIds(): string[] {
    return Array.from(this.plates.keys());
  }

  public getCrackWorldPositions(plateId: string): THREE.Vector3[] {
    const plate = this.plates.get(plateId);
    const state = this.plateStates.get(plateId);
    if (!plate || !state) return [];

    return plate.crackZones.map(zone => {
      const rotatedX = zone.x * Math.cos(state.rotation) - zone.y * Math.sin(state.rotation);
      const rotatedZ = zone.x * Math.sin(state.rotation) + zone.y * Math.cos(state.rotation);
      return new THREE.Vector3(
        state.position.x + rotatedX,
        3.5,
        state.position.z + rotatedZ
      );
    });
  }

  public getClosestCrackPoint(worldPoint: THREE.Vector3, maxDistance: number = 20): { plateId: string; point: THREE.Vector3 } | null {
    let closest: { plateId: string; point: THREE.Vector3; distance: number } | null = null;

    this.plates.forEach((_plate, plateId) => {
      const crackPoints = this.getCrackWorldPositions(plateId);
      crackPoints.forEach(point => {
        const distance = worldPoint.distanceTo(point);
        if (distance < maxDistance && (!closest || distance < closest.distance)) {
          closest = { plateId, point: point.clone(), distance };
        }
      });
    });

    return closest ? { plateId: closest.plateId, point: closest.point } : null;
  }

  public getDriftPath(plateId: string): THREE.Vector3[] {
    return this.plates.get(plateId)?.driftPath || [];
  }
}
