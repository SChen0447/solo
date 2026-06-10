import * as THREE from 'three';

export interface AsteroidData {
  id: number;
  mass: number;
  orbitRadius: number;
  orbitSpeed: number;
  orbitAngle: number;
  orbitY: number;
  size: number;
  color: THREE.Color;
  rotationAxis: THREE.Vector3;
  rotationSpeed: number;
  currentRotation: number;
}

const ORBIT_INNER = 6.0;
const ORBIT_OUTER = 20.0;
const ORBIT_THICKNESS = 1.5;
const ASTEROID_COUNT = 1500;
const DUST_COUNT = 5000;
const MIN_SPEED = 0.005;
const MAX_SPEED = 0.025;
const MIN_SIZE = 0.15;
const MAX_SIZE = 0.6;
const COLOR_LOW = new THREE.Color(0xff9966);
const COLOR_HIGH = new THREE.Color(0x6699ff);

export class AsteroidBelt {
  public readonly group: THREE.Group;
  private readonly instancedMesh: THREE.InstancedMesh;
  private readonly baseMaterial: THREE.MeshStandardMaterial;
  private readonly dustPoints: THREE.Points;
  private readonly data: AsteroidData[] = [];
  private readonly raycaster: THREE.Raycaster = new THREE.Raycaster();
  private readonly dummy: THREE.Object3D = new THREE.Object3D();
  private readonly tempColor: THREE.Color = new THREE.Color();
  private highlightedId: number | null = null;
  private highlightEndTime: number = 0;

  constructor(lightPosition: THREE.Vector3) {
    this.group = new THREE.Group();

    this.baseMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.7,
      metalness: 0.3,
      vertexColors: false
    });

    const geometry = new THREE.SphereGeometry(1.0, 16, 12);
    this.instancedMesh = new THREE.InstancedMesh(geometry, this.baseMaterial, ASTEROID_COUNT);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.instancedMesh);

    this.generateAsteroids();
    this.generateDust();
    this.setupInstanceColors();

    void lightPosition;
  }

  private generateAsteroids(): void {
    for (let i = 0; i < ASTEROID_COUNT; i++) {
      const mass = Math.random();
      const orbitRadius = ORBIT_INNER + Math.random() * (ORBIT_OUTER - ORBIT_INNER);
      const speedFactor = 1.0 - (orbitRadius - ORBIT_INNER) / (ORBIT_OUTER - ORBIT_INNER) * 0.6;
      const orbitSpeed = (MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED)) * speedFactor;
      const size = MIN_SIZE + mass * (MAX_SIZE - MIN_SIZE);
      const color = COLOR_LOW.clone().lerp(COLOR_HIGH, mass);

      this.data.push({
        id: i,
        mass,
        orbitRadius,
        orbitSpeed,
        orbitAngle: Math.random() * Math.PI * 2,
        orbitY: (Math.random() - 0.5) * ORBIT_THICKNESS,
        size,
        color,
        rotationAxis: new THREE.Vector3(
          Math.random() * 2 - 1,
          Math.random() * 2 - 1,
          Math.random() * 2 - 1
        ).normalize(),
        rotationSpeed: (Math.random() - 0.5) * 0.04,
        currentRotation: Math.random() * Math.PI * 2
      });

      this.updateInstanceMatrix(i);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  private setupInstanceColors(): void {
    for (let i = 0; i < ASTEROID_COUNT; i++) {
      this.instancedMesh.setColorAt(i, this.data[i].color);
    }
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  private generateDust(): void {
    const positions = new Float32Array(DUST_COUNT * 3);
    const sizes = new Float32Array(DUST_COUNT);
    const alphas = new Float32Array(DUST_COUNT);

    for (let i = 0; i < DUST_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = ORBIT_INNER + Math.random() * (ORBIT_OUTER - ORBIT_INNER);
      const y = (Math.random() - 0.5) * ORBIT_THICKNESS * 1.2;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      sizes[i] = 0.03 + Math.random() * 0.05;
      alphas[i] = 0.1 + Math.random() * 0.3;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    const material = new THREE.PointsMaterial({
      color: 0xb8c6db,
      size: 0.06,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    });

    this.dustPoints = new THREE.Points(geometry, material);
    this.group.add(this.dustPoints);
  }

  private updateInstanceMatrix(index: number): void {
    const d = this.data[index];
    const x = Math.cos(d.orbitAngle) * d.orbitRadius;
    const z = Math.sin(d.orbitAngle) * d.orbitRadius;
    const y = d.orbitY;

    this.dummy.position.set(x, y, z);
    this.dummy.scale.set(d.size, d.size, d.size);

    const q = new THREE.Quaternion().setFromAxisAngle(d.rotationAxis, d.currentRotation);
    this.dummy.quaternion.copy(q);

    this.dummy.updateMatrix();
    this.instancedMesh.setMatrixAt(index, this.dummy.matrix);
  }

  public update(deltaSeconds: number, currentTimeMs: number): void {
    const deltaFactor = deltaSeconds * 60;

    for (let i = 0; i < ASTEROID_COUNT; i++) {
      const d = this.data[i];
      d.orbitAngle += d.orbitSpeed * deltaFactor;
      if (d.orbitAngle > Math.PI * 2) {
        d.orbitAngle -= Math.PI * 2;
      }
      d.currentRotation += d.rotationSpeed * deltaFactor;
      this.updateInstanceMatrix(i);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;

    if (this.highlightedId !== null && currentTimeMs >= this.highlightEndTime) {
      this.restoreHighlightedColor();
    }
  }

  public getAsteroidAt(
    normalizedX: number,
    normalizedY: number,
    camera: THREE.Camera
  ): AsteroidData | null {
    this.raycaster.setFromCamera(new THREE.Vector2(normalizedX, normalizedY), camera);
    const intersects = this.raycaster.intersectObject(this.instancedMesh, false);

    if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
      return this.data[intersects[0].instanceId];
    }
    return null;
  }

  public highlightAsteroid(id: number, durationMs: number = 500): void {
    if (this.highlightedId !== null) {
      this.restoreHighlightedColor();
    }

    this.highlightedId = id;
    this.highlightEndTime = performance.now() + durationMs;
    this.tempColor.setHex(0xffaa00);
    this.instancedMesh.setColorAt(id, this.tempColor);
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  private restoreHighlightedColor(): void {
    if (this.highlightedId === null) return;
    this.instancedMesh.setColorAt(this.highlightedId, this.data[this.highlightedId].color);
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
    this.highlightedId = null;
  }

  public getData(): AsteroidData[] {
    return this.data;
  }

  public getInstancedMesh(): THREE.InstancedMesh {
    return this.instancedMesh;
  }

  public dispose(): void {
    this.instancedMesh.geometry.dispose();
    (this.instancedMesh.material as THREE.Material).dispose();
    this.dustPoints.geometry.dispose();
    (this.dustPoints.material as THREE.Material).dispose();
  }
}
