import * as THREE from 'three';
import { MazeData } from './mazeGenerator';

const WALL_HEIGHT = 3;
const WALL_THICKNESS = 0.3;
const LIGHT_COUNT = 5;

export class MazeRenderer {
  private scene: THREE.Scene;
  private maze: MazeData;
  private group: THREE.Group;
  private wallMeshes: THREE.Mesh[] = [];
  private exitPillar!: THREE.Mesh;
  private lightPoints: THREE.Mesh[] = [];
  private lightMaterials: THREE.MeshBasicMaterial[] = [];
  private time = 0;

  constructor(scene: THREE.Scene, maze: MazeData) {
    this.scene = scene;
    this.maze = maze;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.createFloor();
    this.createCeiling();
    this.createWalls();
    this.createExitPillar();
    this.createLightPoints();
  }

  public getWallMeshes(): THREE.Mesh[] {
    return this.wallMeshes;
  }

  public getExitWorldPosition(): THREE.Vector3 {
    const x = this.maze.exit.x * this.maze.cellSize;
    const z = this.maze.exit.z * this.maze.cellSize;
    return new THREE.Vector3(x, 0, z);
  }

  private createFloor(): void {
    const totalWidth = this.maze.width * this.maze.cellSize;
    const totalHeight = this.maze.height * this.maze.cellSize;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#404040';
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 2;
    const gridSize = 32;
    for (let i = 0; i <= 512; i += gridSize) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(this.maze.width, this.maze.height);

    const geometry = new THREE.PlaneGeometry(totalWidth, totalHeight);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      metalness: 0.1,
    });

    const floor = new THREE.Mesh(geometry, material);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(totalWidth / 2 - this.maze.cellSize / 2, 0, totalHeight / 2 - this.maze.cellSize / 2);
    floor.receiveShadow = true;
    this.group.add(floor);
  }

  private createCeiling(): void {
    const totalWidth = this.maze.width * this.maze.cellSize;
    const totalHeight = this.maze.height * this.maze.cellSize;

    const geometry = new THREE.PlaneGeometry(totalWidth, totalHeight);
    const material = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 1,
      metalness: 0,
      side: THREE.DoubleSide,
    });

    const ceiling = new THREE.Mesh(geometry, material);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(
      totalWidth / 2 - this.maze.cellSize / 2,
      WALL_HEIGHT,
      totalHeight / 2 - this.maze.cellSize / 2
    );
    this.group.add(ceiling);
  }

  private createWallTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#5a4a3a';
    ctx.fillRect(0, 0, 256, 512);

    ctx.fillStyle = '#4a3a2a';
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 512;
      const w = 20 + Math.random() * 60;
      const h = 3 + Math.random() * 8;
      ctx.fillRect(x, y, w, h);
    }

    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 1;
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 512;
      const length = 30 + Math.random() * 100;
      const angle = Math.random() * Math.PI;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  private createWalls(): void {
    const wallTexture = this.createWallTexture();
    const wallMaterial = new THREE.MeshStandardMaterial({
      map: wallTexture,
      color: 0x887766,
      roughness: 0.85,
      metalness: 0.05,
    });

    const processed = new Set<string>();

    for (const wall of this.maze.wallVertices) {
      const key = `${wall.x1},${wall.z1},${wall.x2},${wall.z2}`;
      const reverseKey = `${wall.x2},${wall.z2},${wall.x1},${wall.z1}`;
      if (processed.has(key) || processed.has(reverseKey)) continue;
      processed.add(key);

      const isHorizontal = wall.z1 === wall.z2;
      let geometry: THREE.BoxGeometry;
      let x: number, z: number;

      if (isHorizontal) {
        const length = Math.abs(wall.x2 - wall.x1) + WALL_THICKNESS;
        geometry = new THREE.BoxGeometry(length, WALL_HEIGHT, WALL_THICKNESS);
        x = (wall.x1 + wall.x2) / 2;
        z = wall.z1;
      } else {
        const length = Math.abs(wall.z2 - wall.z1) + WALL_THICKNESS;
        geometry = new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, length);
        x = wall.x1;
        z = (wall.z1 + wall.z2) / 2;
      }

      const wallMesh = new THREE.Mesh(geometry, wallMaterial);
      wallMesh.position.set(x, WALL_HEIGHT / 2, z);
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;
      this.group.add(wallMesh);
      this.wallMeshes.push(wallMesh);
    }
  }

  private createExitPillar(): void {
    const x = this.maze.exit.x * this.maze.cellSize;
    const z = this.maze.exit.z * this.maze.cellSize;

    const geometry = new THREE.CylinderGeometry(0.5, 0.5, 4, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff44,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });

    this.exitPillar = new THREE.Mesh(geometry, material);
    this.exitPillar.position.set(x, 2, z);
    this.group.add(this.exitPillar);

    const glowGeometry = new THREE.CylinderGeometry(0.7, 0.7, 4, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff44,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(x, 2, z);
    this.group.add(glow);
  }

  private createLightPoints(): void {
    const passableCells: Array<{ x: number; z: number }> = [];
    for (let gz = 0; gz < this.maze.height; gz++) {
      for (let gx = 0; gx < this.maze.width; gx++) {
        if (this.maze.grid[gz][gx] === 0) {
          passableCells.push({ x: gx, z: gz });
        }
      }
    }

    for (let i = 0; i < LIGHT_COUNT && i < passableCells.length; i++) {
      const idx = Math.floor(Math.random() * passableCells.length);
      const cell = passableCells.splice(idx, 1)[0];

      const x = cell.x * this.maze.cellSize;
      const z = cell.z * this.maze.cellSize;
      const y = 0.5 + Math.random() * 1.5;

      const geometry = new THREE.SphereGeometry(0.1, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.3 + Math.random() * 0.2,
      });

      const lightPoint = new THREE.Mesh(geometry, material);
      lightPoint.position.set(x, y, z);
      this.group.add(lightPoint);
      this.lightPoints.push(lightPoint);
      this.lightMaterials.push(material);
    }
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    this.exitPillar.rotation.y = (this.time / 2) * Math.PI * 2;

    for (let i = 0; i < this.lightMaterials.length; i++) {
      const pulse = 0.3 + 0.15 * Math.sin(this.time * 1.5 + i * 2);
      this.lightMaterials[i].opacity = pulse;
    }
  }

  public dispose(): void {
    this.scene.remove(this.group);
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }
}
