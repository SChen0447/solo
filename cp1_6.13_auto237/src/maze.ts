import * as THREE from 'three';
import { gsap } from 'gsap';

const CUBE_COLORS = [
  '#ff6b6b',
  '#48dbfb',
  '#feca57',
  '#ff9ff3',
  '#54a0ff',
  '#a29bfe'
];

const GRID_SIZE = 8;
const SPACING = 1.5;
const TOTAL_CUBES = 300;

export interface Cube {
  mesh: THREE.Mesh;
  originalPosition: THREE.Vector3;
  color: string;
  opacity: number;
  size: number;
  isMoving: boolean;
  targetPosition: THREE.Vector3 | null;
  material: THREE.MeshStandardMaterial;
}

export class Maze {
  public cubes: Cube[] = [];
  public group: THREE.Group;
  public rotationSpeed = 0.5;
  private scene: THREE.Scene;
  private materialCache: Map<string, THREE.MeshStandardMaterial> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
  }

  public generateGrid(): void {
    const positions: THREE.Vector3[] = [];
    const sqrt2 = Math.sqrt(2);
    const sqrt3 = Math.sqrt(3);

    for (let i = -GRID_SIZE; i <= GRID_SIZE; i++) {
      for (let j = -GRID_SIZE; j <= GRID_SIZE; j++) {
        for (let k = -GRID_SIZE; k <= GRID_SIZE; k++) {
          if (i + j + k !== 0) continue;
          
          const x = (i - j) * SPACING * 0.5;
          const y = (i + j - 2 * k) * SPACING * sqrt3 / 6;
          const z = (i + j + k) * SPACING * sqrt2 / 3;
          
          const dist = Math.sqrt(x * x + y * y + z * z);
          if (dist <= GRID_SIZE * SPACING * 0.8) {
            positions.push(new THREE.Vector3(x, y, z));
          }
        }
      }
    }

    this.shuffleArray(positions);
    
    const selectedPositions = positions.slice(0, TOTAL_CUBES);

    selectedPositions.forEach((pos) => {
      const size = 0.5 + Math.random() * 0.7;
      const color = CUBE_COLORS[Math.floor(Math.random() * CUBE_COLORS.length)];
      const opacity = 0.5 + Math.random() * 0.3;

      const geometry = new THREE.BoxGeometry(size, size, size);
      const material = this.getOrCreateMaterial(color, opacity);

      const mesh = new THREE.Mesh(geometry, material.clone());
      mesh.position.copy(pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const cube: Cube = {
        mesh,
        originalPosition: pos.clone(),
        color,
        opacity,
        size,
        isMoving: false,
        targetPosition: null,
        material: mesh.material as THREE.MeshStandardMaterial
      };

      this.cubes.push(cube);
      this.group.add(mesh);
    });
  }

  private getOrCreateMaterial(color: string, opacity: number): THREE.MeshStandardMaterial {
    const key = `${color}_${opacity.toFixed(2)}`;
    if (this.materialCache.has(key)) {
      return this.materialCache.get(key)!;
    }

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity,
      emissive: new THREE.Color(color),
      emissiveIntensity: 1.5,
      metalness: 0.3,
      roughness: 0.2
    });

    this.materialCache.set(key, material);
    return material;
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  public getNearestCube(position: THREE.Vector3): Cube | null {
    let nearest: Cube | null = null;
    let minDist = Infinity;

    for (const cube of this.cubes) {
      const worldPos = new THREE.Vector3();
      cube.mesh.getWorldPosition(worldPos);
      const dist = worldPos.distanceTo(position);
      if (dist < minDist) {
        minDist = dist;
        nearest = cube;
      }
    }

    return nearest;
  }

  public explodeCube(cube: Cube): THREE.Vector3 {
    const worldPos = new THREE.Vector3();
    cube.mesh.getWorldPosition(worldPos);

    const mat = cube.material;
    mat.color.set('#ffd700');
    mat.emissive.set('#ffd700');
    mat.opacity = 1;
    mat.emissiveIntensity = 3;

    gsap.to(cube.mesh.scale, {
      x: 1.5,
      y: 1.5,
      z: 1.5,
      duration: 0.15,
      ease: 'power2.out'
    });

    gsap.to(cube.mesh.scale, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0.15,
      delay: 0.15,
      ease: 'power2.in'
    });

    gsap.to(mat, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in'
    });

    setTimeout(() => {
      this.removeCube(cube);
    }, 300);

    return worldPos.clone();
  }

  private removeCube(cube: Cube): void {
    const index = this.cubes.indexOf(cube);
    if (index > -1) {
      this.cubes.splice(index, 1);
      this.group.remove(cube.mesh);
      cube.mesh.geometry.dispose();
      (cube.mesh.material as THREE.Material).dispose();
    }
  }

  public moveCubeToCore(cube: Cube, corePosition: THREE.Vector3): void {
    if (cube.isMoving) return;

    cube.isMoving = true;
    cube.targetPosition = corePosition.clone();

    cube.material.opacity = 0.9;
    cube.material.emissiveIntensity = 2.5;

    const worldPos = new THREE.Vector3();
    cube.mesh.getWorldPosition(worldPos);

    const localTarget = this.group.worldToLocal(corePosition.clone());

    gsap.to(cube.mesh.position, {
      x: localTarget.x,
      y: localTarget.y,
      z: localTarget.z,
      duration: 3,
      ease: 'power1.inOut',
      onComplete: () => {
        cube.isMoving = false;
        cube.targetPosition = null;
      }
    });
  }

  public getAdjacentCubes(cube: Cube): Cube[] {
    const adjacent: Cube[] = [];
    const threshold = 2.0;

    const cubeWorldPos = new THREE.Vector3();
    cube.mesh.getWorldPosition(cubeWorldPos);

    for (const other of this.cubes) {
      if (other === cube) continue;
      
      const otherWorldPos = new THREE.Vector3();
      other.mesh.getWorldPosition(otherWorldPos);
      
      const dist = cubeWorldPos.distanceTo(otherWorldPos);
      if (dist < threshold) {
        adjacent.push(other);
      }
    }

    return adjacent;
  }

  public randomizeOpacity(): void {
    for (const cube of this.cubes) {
      if (cube.isMoving) continue;
      const newOpacity = 0.3 + Math.random() * 0.6;
      cube.opacity = newOpacity;
      cube.material.opacity = newOpacity;
    }
  }

  public updateRotation(delta: number): void {
    this.group.rotation.y += this.rotationSpeed * delta * 0.01;
    this.group.rotation.x += this.rotationSpeed * delta * 0.005;
  }

  public increaseRotationSpeed(): void {
    this.rotationSpeed = Math.min(this.rotationSpeed + 0.2, 3.0);
  }

  public recalculatePositions(scale: number): void {
    this.group.scale.setScalar(scale);
  }

  public dispose(): void {
    for (const cube of this.cubes) {
      cube.mesh.geometry.dispose();
      (cube.mesh.material as THREE.Material).dispose();
    }
    this.cubes = [];
    this.materialCache.forEach((mat) => mat.dispose());
    this.materialCache.clear();
    this.scene.remove(this.group);
  }
}
