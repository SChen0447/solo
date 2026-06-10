import * as THREE from 'three';
import type { SceneManager } from './scene';

export interface PlateInfo {
  id: number;
  name: string;
  speed: number;
  boundaryType: string;
  colorStart: string;
  colorEnd: string;
}

export interface PlateData {
  mesh: THREE.Mesh;
  border: THREE.Line;
  info: PlateInfo;
  basePositions: Float32Array;
  currentPositions: Float32Array;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  centerLat: number;
  centerLon: number;
  lastSeparationTime: number;
  deformation: Float32Array;
}

interface PlateConfig {
  name: string;
  colorStart: string;
  colorEnd: string;
  centerLat: number;
  centerLon: number;
  boundaryType: string;
}

const PLATE_CONFIGS: PlateConfig[] = [
  { name: '太平洋板块', colorStart: '#1E90FF', colorEnd: '#00BFFF', centerLat: 10, centerLon: -160, boundaryType: '汇聚型' },
  { name: '非洲板块', colorStart: '#8B4513', colorEnd: '#D2691E', centerLat: 5, centerLon: 20, boundaryType: '离散型' },
  { name: '欧亚板块', colorStart: '#228B22', colorEnd: '#32CD32', centerLat: 45, centerLon: 90, boundaryType: '汇聚型' },
  { name: '美洲板块', colorStart: '#8B008B', colorEnd: '#BA55D3', centerLat: 30, centerLon: -90, boundaryType: '转换型' },
  { name: '印度洋板块', colorStart: '#FF8C00', colorEnd: '#FFA500', centerLat: -15, centerLon: 80, boundaryType: '汇聚型' },
  { name: '南极洲板块', colorStart: '#4682B4', colorEnd: '#87CEEB', centerLat: -80, centerLon: 0, boundaryType: '离散型' },
];

const EARTH_RADIUS = 5;
const PLATE_THICKNESS = 0.5;
const COLLISION_THRESHOLD = 0.5;
const REPULSION_STRENGTH = 0.02;
const SEPARATION_COOLDOWN_FRAMES = 600;

export class PlateManager {
  private scene: THREE.Scene;
  private plates: PlateData[] = [];
  private plateGroup: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.plateGroup = new THREE.Group();
    this.scene.add(this.plateGroup);
    this.generatePlates();
  }

  private latLonToVector3(lat: number, lon: number, radius: number = EARTH_RADIUS): THREE.Vector3 {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  private vector3ToLatLon(vec: THREE.Vector3): { lat: number; lon: number } {
    const normalized = vec.clone().normalize();
    const lat = 90 - Math.acos(normalized.y) * (180 / Math.PI);
    const lon = Math.atan2(normalized.z, -normalized.x) * (180 / Math.PI) - 180;
    return { lat, lon };
  }

  private generatePlateVertices(centerLat: number, centerLon: number, vertexCount: number): Float32Array {
    const positions = new Float32Array(vertexCount * 3);
    const centerVec = this.latLonToVector3(centerLat, centerLon);

    for (let i = 0; i < vertexCount; i++) {
      const angle = (i / vertexCount) * Math.PI * 2;
      const angularDist = 0.25 + Math.sin(i * 2.7) * 0.08 + Math.cos(i * 1.3) * 0.06;

      const latOffset = Math.sin(angle) * angularDist * (180 / Math.PI);
      const lonOffset = Math.cos(angle) * angularDist * (180 / Math.PI) / Math.cos(centerLat * Math.PI / 180);

      const vertexLat = centerLat + latOffset;
      const vertexLon = centerLon + lonOffset;

      const vec = this.latLonToVector3(vertexLat, vertexLon, EARTH_RADIUS + PLATE_THICKNESS);
      positions[i * 3] = vec.x;
      positions[i * 3 + 1] = vec.y;
      positions[i * 3 + 2] = vec.z;
    }

    return positions;
  }

  private createTriangulatedIndices(vertexCount: number): Uint16Array {
    const indices: number[] = [];
    for (let i = 1; i < vertexCount - 1; i++) {
      indices.push(0, i, i + 1);
    }
    return new Uint16Array(indices);
  }

  private createGradientTexture(colorStart: string, colorEnd: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
    gradient.addColorStop(0, colorEnd);
    gradient.addColorStop(1, colorStart);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
      ctx.beginPath();
      ctx.arc(Math.random() * 256, Math.random() * 256, Math.random() * 10 + 2, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  private generatePlates(): void {
    PLATE_CONFIGS.forEach((config, index) => {
      const vertexCount = 16 + Math.floor(Math.random() * 5);
      const positions = this.generatePlateVertices(config.centerLat, config.centerLon, vertexCount);
      const indices = this.createTriangulatedIndices(vertexCount);

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
      geometry.computeVertexNormals();

      const uvs = new Float32Array(vertexCount * 2);
      for (let i = 0; i < vertexCount; i++) {
        const angle = (i / vertexCount) * Math.PI * 2;
        uvs[i * 2] = 0.5 + Math.cos(angle) * 0.4;
        uvs[i * 2 + 1] = 0.5 + Math.sin(angle) * 0.4;
      }
      geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

      const texture = this.createGradientTexture(config.colorStart, config.colorEnd);
      const material = new THREE.MeshPhongMaterial({
        map: texture,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        shininess: 30,
        specular: new THREE.Color(0x444444),
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      (mesh as any).userData = { plateId: index };

      const borderGeometry = new THREE.BufferGeometry();
      const borderPositions = new Float32Array((vertexCount + 1) * 3);
      for (let i = 0; i < vertexCount; i++) {
        borderPositions[i * 3] = positions[i * 3];
        borderPositions[i * 3 + 1] = positions[i * 3 + 1];
        borderPositions[i * 3 + 2] = positions[i * 3 + 2];
      }
      borderPositions[vertexCount * 3] = positions[0];
      borderPositions[vertexCount * 3 + 1] = positions[1];
      borderPositions[vertexCount * 3 + 2] = positions[2];
      borderGeometry.setAttribute('position', new THREE.BufferAttribute(borderPositions, 3));

      const borderColor = new THREE.Color(config.colorEnd);
      const borderMaterial = new THREE.LineBasicMaterial({
        color: borderColor,
        transparent: true,
        opacity: 0.95,
        linewidth: 2,
      });

      const border = new THREE.Line(borderGeometry, borderMaterial);

      this.plateGroup.add(mesh);
      this.plateGroup.add(border);

      const speed = 2 + Math.random() * 13;

      this.plates.push({
        mesh,
        border,
        info: {
          id: index,
          name: config.name,
          speed: parseFloat(speed.toFixed(2)),
          boundaryType: config.boundaryType,
          colorStart: config.colorStart,
          colorEnd: config.colorEnd,
        },
        basePositions: new Float32Array(positions),
        currentPositions: new Float32Array(positions),
        velocity: new THREE.Vector3(),
        angularVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.002,
          (Math.random() - 0.5) * 0.002,
          (Math.random() - 0.5) * 0.002
        ),
        centerLat: config.centerLat,
        centerLon: config.centerLon,
        lastSeparationTime: -SEPARATION_COOLDOWN_FRAMES,
        deformation: new Float32Array(vertexCount),
      });
    });
  }

  private snapToSphere(positions: Float32Array): void {
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      const len = Math.sqrt(x * x + y * y + z * z);
      if (len > 0) {
        const scale = (EARTH_RADIUS + PLATE_THICKNESS) / len;
        positions[i] = x * scale;
        positions[i + 1] = y * scale;
        positions[i + 2] = z * scale;
      }
    }
  }

  private getPlateCenter(plate: PlateData): THREE.Vector3 {
    const positions = plate.currentPositions;
    let cx = 0, cy = 0, cz = 0;
    const count = positions.length / 3;
    for (let i = 0; i < positions.length; i += 3) {
      cx += positions[i];
      cy += positions[i + 1];
      cz += positions[i + 2];
    }
    return new THREE.Vector3(cx / count, cy / count, cz / count);
  }

  private detectCollisions(sceneManager: SceneManager): { plateA: PlateData; plateB: PlateData; contactPoint: THREE.Vector3; distance: number }[] {
    const collisions: { plateA: PlateData; plateB: PlateData; contactPoint: THREE.Vector3; distance: number }[] = [];

    for (let i = 0; i < this.plates.length; i++) {
      for (let j = i + 1; j < this.plates.length; j++) {
        const centerA = this.getPlateCenter(this.plates[i]);
        const centerB = this.getPlateCenter(this.plates[j]);
        const distance = centerA.distanceTo(centerB);

        if (distance < COLLISION_THRESHOLD * 4) {
          const positionsA = this.plates[i].currentPositions;
          const positionsB = this.plates[j].currentPositions;
          let minDist = Infinity;
          let contactPoint = new THREE.Vector3();

          for (let a = 0; a < positionsA.length; a += 3) {
            for (let b = 0; b < positionsB.length; b += 3) {
              const dx = positionsA[a] - positionsB[b];
              const dy = positionsA[a + 1] - positionsB[b + 1];
              const dz = positionsA[a + 2] - positionsB[b + 2];
              const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
              if (d < minDist) {
                minDist = d;
                contactPoint.set(
                  (positionsA[a] + positionsB[b]) / 2,
                  (positionsA[a + 1] + positionsB[b + 1]) / 2,
                  (positionsA[a + 2] + positionsB[b + 2]) / 2
                );
              }
            }
          }

          if (minDist < COLLISION_THRESHOLD) {
            collisions.push({
              plateA: this.plates[i],
              plateB: this.plates[j],
              contactPoint,
              distance: minDist,
            });
          }
        }
      }
    }

    return collisions;
  }

  public update(
    deltaTime: number,
    currentMode: string,
    targetMode: string,
    transitionT: number,
    sceneManager: SceneManager
  ): void {
    const effectiveMode = transitionT < 0.5 ? currentMode : targetMode;

    this.plates.forEach((plate) => {
      plate.velocity.set(0, 0, 0);
    });

    switch (effectiveMode) {
      case 'collision':
        this.applyCollisionMode();
        break;
      case 'separation':
        this.applySeparationMode(sceneManager);
        break;
      case 'subduction':
        this.applySubductionMode();
        break;
      default:
        this.applyIdleDrift();
    }

    const collisions = this.detectCollisions(sceneManager);

    collisions.forEach(({ plateA, plateB, contactPoint, distance }) => {
      const repulseDir = this.getPlateCenter(plateA).sub(this.getPlateCenter(plateB)).normalize();
      const repulseForce = REPULSION_STRENGTH * (COLLISION_THRESHOLD - distance) / COLLISION_THRESHOLD;

      plateA.velocity.add(repulseDir.clone().multiplyScalar(repulseForce));
      plateB.velocity.add(repulseDir.clone().multiplyScalar(-repulseForce));

      if (effectiveMode === 'collision' || effectiveMode === 'subduction') {
        this.applyCollisionDeformation(plateA, contactPoint);
        this.applyCollisionDeformation(plateB, contactPoint);
      }
    });

    this.plates.forEach((plate, index) => {
      this.updatePlatePosition(plate, deltaTime);
      this.updateDeformation(plate, effectiveMode, index, sceneManager.state.frameCount);
      this.updatePlateMesh(plate);
    });

    if (collisions.length > 0 && (effectiveMode === 'collision' || effectiveMode === 'separation')) {
      sceneManager.incrementCollisionCount();
    }
  }

  private applyCollisionMode(): void {
    if (this.plates.length < 2) return;
    const plateA = this.plates[0];
    const plateB = this.plates[2];

    const centerA = this.getPlateCenter(plateA);
    const centerB = this.getPlateCenter(plateB);
    const dir = centerB.clone().sub(centerA).normalize();

    plateA.velocity.add(dir.clone().multiplyScalar(0.05));
    plateB.velocity.add(dir.clone().multiplyScalar(-0.05));
  }

  private applySeparationMode(sceneManager: SceneManager): void {
    if (this.plates.length < 2) return;
    const plateA = this.plates[0];
    const plateB = this.plates[1];

    if (sceneManager.state.frameCount - plateA.lastSeparationTime > SEPARATION_COOLDOWN_FRAMES) {
      const centerA = this.getPlateCenter(plateA);
      const centerB = this.getPlateCenter(plateB);
      const dir = centerA.clone().sub(centerB).normalize();

      plateA.velocity.add(dir.clone().multiplyScalar(0.04));
      plateB.velocity.add(dir.clone().multiplyScalar(-0.04));

      plateA.lastSeparationTime = sceneManager.state.frameCount;
      plateB.lastSeparationTime = sceneManager.state.frameCount;
    }
  }

  private applySubductionMode(): void {
    if (this.plates.length < 2) return;
    const plateTop = this.plates[2];
    const plateSubduct = this.plates[4];

    const centerTop = this.getPlateCenter(plateTop);
    const centerSub = this.getPlateCenter(plateSubduct);
    const dir = centerTop.clone().sub(centerSub).normalize();

    plateSubduct.velocity.add(dir.clone().multiplyScalar(0.03));
  }

  private applyIdleDrift(): void {
    this.plates.forEach((plate) => {
      const drift = new THREE.Vector3(
        (Math.random() - 0.5) * 0.003,
        (Math.random() - 0.5) * 0.003,
        (Math.random() - 0.5) * 0.003
      );
      plate.velocity.add(drift);
    });
  }

  private applyCollisionDeformation(plate: PlateData, contactPoint: THREE.Vector3): void {
    const positions = plate.currentPositions;
    for (let i = 0; i < positions.length; i += 3) {
      const vertex = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
      const dist = vertex.distanceTo(contactPoint);
      const influence = Math.max(0, 1 - dist / 2);
      plate.deformation[i / 3] = Math.min(plate.deformation[i / 3] + influence * 0.02, 0.8);
    }
  }

  private updateDeformation(plate: PlateData, mode: string, plateIndex: number, frameCount: number): void {
    for (let i = 0; i < plate.deformation.length; i++) {
      if (plate.deformation[i] > 0) {
        plate.deformation[i] = Math.max(0, plate.deformation[i] - 0.001);
      }
    }

    if (mode === 'subduction' && plateIndex === 2) {
      for (let i = 0; i < plate.deformation.length; i++) {
        const wave = Math.sin(i * 0.8 + frameCount * 0.05) * 0.5 + 0.5;
        plate.deformation[i] = Math.max(plate.deformation[i], wave * 0.2);
      }
    }
  }

  private updatePlatePosition(plate: PlateData, deltaTime: number): void {
    if (plate.velocity.length() < 0.0001) return;

    const positions = plate.currentPositions;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] += plate.velocity.x;
      positions[i + 1] += plate.velocity.y;
      positions[i + 2] += plate.velocity.z;
    }

    this.snapToSphere(positions);

    const center = this.getPlateCenter(plate);
    const latLon = this.vector3ToLatLon(center);
    plate.centerLat = latLon.lat;
    plate.centerLon = latLon.lon;
  }

  private updatePlateMesh(plate: PlateData): void {
    const positionAttr = plate.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const positions = positionAttr.array as Float32Array;

    for (let i = 0; i < plate.currentPositions.length; i += 3) {
      const baseVec = new THREE.Vector3(
        plate.currentPositions[i],
        plate.currentPositions[i + 1],
        plate.currentPositions[i + 2]
      );
      const normal = baseVec.clone().normalize();
      const deformAmount = plate.deformation[i / 3];

      positions[i] = baseVec.x + normal.x * deformAmount;
      positions[i + 1] = baseVec.y + normal.y * deformAmount;
      positions[i + 2] = baseVec.z + normal.z * deformAmount;
    }

    positionAttr.needsUpdate = true;
    plate.mesh.geometry.computeVertexNormals();

    const borderPositions = plate.border.geometry.getAttribute('position') as THREE.BufferAttribute;
    const borderArr = borderPositions.array as Float32Array;
    const vertexCount = plate.currentPositions.length / 3;

    for (let i = 0; i < vertexCount; i++) {
      const baseVec = new THREE.Vector3(
        plate.currentPositions[i * 3],
        plate.currentPositions[i * 3 + 1],
        plate.currentPositions[i * 3 + 2]
      );
      const normal = baseVec.clone().normalize();
      const deformAmount = plate.deformation[i];

      borderArr[i * 3] = baseVec.x + normal.x * deformAmount;
      borderArr[i * 3 + 1] = baseVec.y + normal.y * deformAmount;
      borderArr[i * 3 + 2] = baseVec.z + normal.z * deformAmount;
    }
    borderArr[vertexCount * 3] = borderArr[0];
    borderArr[vertexCount * 3 + 1] = borderArr[1];
    borderArr[vertexCount * 3 + 2] = borderArr[2];

    borderPositions.needsUpdate = true;
  }

  public getPlateMeshes(): THREE.Mesh[] {
    return this.plates.map((p) => p.mesh);
  }

  public getPlateInfo(id: number): PlateInfo {
    return this.plates[id].info;
  }

  public getPlatesData(): PlateData[] {
    return this.plates;
  }

  public getCollisionEvents(currentFrame: number): { contactPoint: THREE.Vector3; type: 'collision' | 'separation' }[] {
    const events: { contactPoint: THREE.Vector3; type: 'collision' | 'separation' }[] = [];

    for (let i = 0; i < this.plates.length; i++) {
      for (let j = i + 1; j < this.plates.length; j++) {
        const centerA = this.getPlateCenter(this.plates[i]);
        const centerB = this.getPlateCenter(this.plates[j]);
        const distance = centerA.distanceTo(centerB);

        if (distance < COLLISION_THRESHOLD * 3) {
          const positionsA = this.plates[i].currentPositions;
          const positionsB = this.plates[j].currentPositions;
          let minDist = Infinity;
          let contactPoint = new THREE.Vector3();

          for (let a = 0; a < positionsA.length; a += 3) {
            for (let b = 0; b < positionsB.length; b += 3) {
              const dx = positionsA[a] - positionsB[b];
              const dy = positionsA[a + 1] - positionsB[b + 1];
              const dz = positionsA[a + 2] - positionsB[b + 2];
              const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
              if (d < minDist) {
                minDist = d;
                contactPoint.set(
                  (positionsA[a] + positionsB[b]) / 2,
                  (positionsA[a + 1] + positionsB[b + 1]) / 2,
                  (positionsA[a + 2] + positionsB[b + 2]) / 2
                );
              }
            }
          }

          if (minDist < COLLISION_THRESHOLD * 1.5) {
            events.push({
              contactPoint,
              type: minDist < COLLISION_THRESHOLD ? 'collision' : 'separation',
            });
          }
        }
      }
    }

    return events;
  }

  public reset(): void {
    PLATE_CONFIGS.forEach((config, index) => {
      const plate = this.plates[index];
      plate.currentPositions.set(plate.basePositions);
      plate.velocity.set(0, 0, 0);
      plate.deformation.fill(0);
      plate.centerLat = config.centerLat;
      plate.centerLon = config.centerLon;
      plate.lastSeparationTime = -SEPARATION_COOLDOWN_FRAMES;
      this.updatePlateMesh(plate);
    });
  }

  public dispose(): void {
    this.plates.forEach((plate) => {
      plate.mesh.geometry.dispose();
      (plate.mesh.material as THREE.Material).dispose();
      plate.border.geometry.dispose();
      (plate.border.material as THREE.Material).dispose();
    });
    this.scene.remove(this.plateGroup);
  }
}
