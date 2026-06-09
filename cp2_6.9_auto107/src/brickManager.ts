import * as THREE from 'three';
import {
  Brick,
  BrickType,
  BrickDimensions,
  BRICK_DIMENSIONS,
  BRICK_COLORS,
  GRID_SIZE,
  MAX_BRICKS
} from './types';

export type BrickChangeListener = (bricks: Brick[]) => void;

export class BrickManager {
  private bricks: Brick[] = [];
  private undoStack: Brick[][] = [];
  private currentType: BrickType = BrickType.BRICK_2x4;
  private currentColor: string = BRICK_COLORS[0];
  private listeners: Set<BrickChangeListener> = new Set();
  private meshes: Map<string, THREE.Mesh> = new Map();
  private glowMeshes: Map<string, THREE.Mesh> = new Map();
  private geometryCache: Map<string, THREE.BufferGeometry> = new Map();
  private materialCache: Map<string, THREE.MeshStandardMaterial> = new Map();
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  setCurrentBrick(type: BrickType): void {
    this.currentType = type;
  }

  getCurrentBrick(): BrickType {
    return this.currentType;
  }

  setCurrentColor(color: string): void {
    this.currentColor = color;
  }

  getCurrentColor(): string {
    return this.currentColor;
  }

  getBricks(): Brick[] {
    return [...this.bricks];
  }

  getBrickById(id: string): Brick | undefined {
    return this.bricks.find(b => b.id === id);
  }

  getMeshById(id: string): THREE.Mesh | undefined {
    return this.meshes.get(id);
  }

  getGlowMeshById(id: string): THREE.Mesh | undefined {
    return this.glowMeshes.get(id);
  }

  subscribe(listener: BrickChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(l => l([...this.bricks]));
  }

  private saveUndoState(): void {
    this.undoStack.push(this.bricks.map(b => ({
      ...b,
      position: { ...b.position }
    })));
    if (this.undoStack.length > 50) {
      this.undoStack.shift();
    }
  }

  undo(): boolean {
    if (this.undoStack.length === 0) return false;
    const prevState = this.undoStack.pop()!;
    this.clearAllMeshes();
    this.bricks = prevState;
    this.bricks.forEach(b => this.createBrickMesh(b));
    this.notify();
    return true;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  snapToGrid(value: number, size: number): number {
    const halfGrid = 0.5;
    const offset = size % 2 === 0 ? 0 : halfGrid;
    return Math.round(value - offset) + offset;
  }

  snapPosition(
    worldX: number,
    worldY: number,
    worldZ: number,
    type: BrickType,
    rotationY: number
  ): { x: number; y: number; z: number } {
    const dims = BRICK_DIMENSIONS[type];
    const cos = Math.abs(Math.cos(rotationY));
    const sin = Math.abs(Math.sin(rotationY));
    const effectiveWidth = dims.width * cos + dims.depth * sin;
    const effectiveDepth = dims.depth * cos + dims.width * sin;

    const halfGrid = GRID_SIZE / 2;
    let x = this.snapToGrid(worldX, Math.round(effectiveWidth));
    let z = this.snapToGrid(worldZ, Math.round(effectiveDepth));
    x = Math.max(-halfGrid + effectiveWidth / 2, Math.min(halfGrid - effectiveWidth / 2, x));
    z = Math.max(-halfGrid + effectiveDepth / 2, Math.min(halfGrid - effectiveDepth / 2, z));

    const y = Math.max(0, Math.round(worldY * 3) / 3);

    return { x, y, z };
  }

  findStackingY(
    x: number,
    z: number,
    type: BrickType,
    rotationY: number,
    excludeId?: string
  ): number {
    const dims = BRICK_DIMENSIONS[type];
    const cos = Math.abs(Math.cos(rotationY));
    const sin = Math.abs(Math.sin(rotationY));
    const effectiveWidth = dims.width * cos + dims.depth * sin;
    const effectiveDepth = dims.depth * cos + dims.width * sin;

    let maxTop = 0;
    const halfW = effectiveWidth / 2;
    const halfD = effectiveDepth / 2;

    for (const brick of this.bricks) {
      if (excludeId && brick.id === excludeId) continue;
      const bDims = BRICK_DIMENSIONS[brick.type];
      const bCos = Math.abs(Math.cos(brick.rotationY));
      const bSin = Math.abs(Math.sin(brick.rotationY));
      const bW = bDims.width * bCos + bDims.depth * bSin;
      const bD = bDims.depth * bCos + bDims.width * bSin;
      const bHalfW = bW / 2;
      const bHalfD = bD / 2;
      const bTop = brick.position.y + bDims.height;

      const overlapX =
        x + halfW > brick.position.x - bHalfW &&
        x - halfW < brick.position.x + bHalfW;
      const overlapZ =
        z + halfD > brick.position.z - bHalfD &&
        z - halfD < brick.position.z + bHalfD;

      if (overlapX && overlapZ && bTop > maxTop) {
        maxTop = bTop;
      }
    }

    return maxTop;
  }

  checkCollision(
    x: number,
    y: number,
    z: number,
    type: BrickType,
    rotationY: number,
    excludeId?: string
  ): boolean {
    const dims = BRICK_DIMENSIONS[type];
    const cos = Math.abs(Math.cos(rotationY));
    const sin = Math.abs(Math.sin(rotationY));
    const effectiveWidth = dims.width * cos + dims.depth * sin;
    const effectiveDepth = dims.depth * cos + dims.width * sin;
    const halfW = effectiveWidth / 2;
    const halfD = effectiveDepth / 2;
    const top = y + dims.height;

    for (const brick of this.bricks) {
      if (excludeId && brick.id === excludeId) continue;
      const bDims = BRICK_DIMENSIONS[brick.type];
      const bCos = Math.abs(Math.cos(brick.rotationY));
      const bSin = Math.abs(Math.sin(brick.rotationY));
      const bW = bDims.width * bCos + bDims.depth * bSin;
      const bD = bDims.depth * bCos + bDims.width * bSin;
      const bHalfW = bW / 2;
      const bHalfD = bD / 2;
      const bTop = brick.position.y + bDims.height;

      const overlapX =
        x + halfW > brick.position.x - bHalfW &&
        x - halfW < brick.position.x + bHalfW;
      const overlapZ =
        z + halfD > brick.position.z - bHalfD &&
        z - halfD < brick.position.z + bHalfD;
      const overlapY =
        y < bTop && top > brick.position.y;

      if (overlapX && overlapZ && overlapY) {
        return true;
      }
    }
    return false;
  }

  addBrick(
    type: BrickType,
    color: string,
    position: { x: number; y: number; z: number },
    rotationY: number
  ): Brick | null {
    if (this.bricks.length >= MAX_BRICKS) return null;

    const snapped = this.snapPosition(position.x, position.y, position.z, type, rotationY);
    const stackY = this.findStackingY(snapped.x, snapped.z, type, rotationY);
    const finalY = Math.max(snapped.y, stackY);

    if (this.checkCollision(snapped.x, finalY, snapped.z, type, rotationY)) {
      return null;
    }

    this.saveUndoState();

    const brick: Brick = {
      id: `brick_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      color,
      position: { x: snapped.x, y: finalY, z: snapped.z },
      rotationY
    };

    this.bricks.push(brick);
    this.createBrickMesh(brick);
    this.animatePlacement(brick.id, finalY);
    this.notify();
    return brick;
  }

  removeBrick(id: string): boolean {
    const index = this.bricks.findIndex(b => b.id === id);
    if (index === -1) return false;

    this.saveUndoState();
    const brick = this.bricks[index];
    this.bricks.splice(index, 1);
    this.removeBrickMesh(id);
    this.notify();
    return true;
  }

  rotateBrick(id: string, degrees: number = 90): boolean {
    const brick = this.bricks.find(b => b.id === id);
    if (!brick) return false;

    this.saveUndoState();
    const newRotation = brick.rotationY + (degrees * Math.PI) / 180;

    if (this.checkCollision(brick.position.x, brick.position.y, brick.position.z, brick.type, newRotation, id)) {
      this.undoStack.pop();
      return false;
    }

    brick.rotationY = newRotation;
    const mesh = this.meshes.get(id);
    if (mesh) {
      mesh.rotation.y = newRotation;
    }
    const glow = this.glowMeshes.get(id);
    if (glow) {
      glow.rotation.y = newRotation;
    }
    this.notify();
    return true;
  }

  duplicateBrick(id: string): Brick | null {
    const brick = this.bricks.find(b => b.id === id);
    if (!brick) return null;

    const newPos = {
      x: brick.position.x + 1,
      y: brick.position.y,
      z: brick.position.z
    };

    return this.addBrick(brick.type, brick.color, newPos, brick.rotationY);
  }

  private getGeometry(type: BrickType): THREE.BufferGeometry {
    const dims = BRICK_DIMENSIONS[type];
    const cacheKey = `${type}`;
    if (this.geometryCache.has(cacheKey)) {
      return this.geometryCache.get(cacheKey)!;
    }

    let geometry: THREE.BufferGeometry;
    if (dims.isCylinder) {
      geometry = new THREE.CylinderGeometry(0.45, 0.45, dims.height, 24);
    } else if (dims.isPlate) {
      geometry = new THREE.CylinderGeometry(
        Math.min(dims.width, dims.depth) / 2,
        Math.min(dims.width, dims.depth) / 2,
        dims.height,
        32
      );
    } else if (dims.isSlope) {
      geometry = this.createSlopeGeometry(dims);
    } else {
      geometry = new THREE.BoxGeometry(dims.width, dims.height, dims.depth);
    }

    this.geometryCache.set(cacheKey, geometry);
    return geometry;
  }

  private createSlopeGeometry(dims: BrickDimensions): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    const w = dims.width / 2;
    const d = dims.depth / 2;
    const h = dims.height;

    shape.moveTo(-d, 0);
    shape.lineTo(d, 0);
    shape.lineTo(-d, h);
    shape.lineTo(-d, 0);

    const extrudeSettings = {
      steps: 1,
      depth: dims.width,
      bevelEnabled: false
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.translate(0, 0, -w);
    geometry.rotateY(Math.PI / 2);
    return geometry;
  }

  private getMaterial(color: string, transparent: boolean = false, opacity: number = 1): THREE.MeshStandardMaterial {
    const cacheKey = `${color}_${transparent}_${opacity}`;
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)!;
    }

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      transparent,
      opacity,
      roughness: 0.5,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    this.materialCache.set(cacheKey, material);
    return material;
  }

  createPreviewMesh(type: BrickType, color: string): THREE.Mesh {
    const geometry = this.getGeometry(type);
    const material = this.getMaterial(color, true, 0.5);
    const mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);
    return mesh;
  }

  private createBrickMesh(brick: Brick): void {
    const geometry = this.getGeometry(brick.type);
    const material = this.getMaterial(brick.color, false, 1);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(brick.position.x, brick.position.y, brick.position.z);
    mesh.rotation.y = brick.rotationY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.brickId = brick.id;
    this.scene.add(mesh);
    this.meshes.set(brick.id, mesh);

    const glowGeometry = this.getGeometry(brick.type);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFF88,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(mesh.position);
    glow.rotation.copy(mesh.rotation);
    glow.scale.setScalar(1.08);
    glow.userData.brickId = brick.id;
    this.scene.add(glow);
    this.glowMeshes.set(brick.id, glow);
  }

  private removeBrickMesh(id: string): void {
    const mesh = this.meshes.get(id);
    if (mesh) {
      this.scene.remove(mesh);
      this.meshes.delete(id);
    }
    const glow = this.glowMeshes.get(id);
    if (glow) {
      this.scene.remove(glow);
      (glow.material as THREE.Material).dispose();
      this.glowMeshes.delete(id);
    }
  }

  private clearAllMeshes(): void {
    for (const id of Array.from(this.meshes.keys())) {
      this.removeBrickMesh(id);
    }
  }

  private animatePlacement(id: string, targetY: number): void {
    const mesh = this.meshes.get(id);
    if (!mesh) return;

    const startY = targetY + 0.5;
    mesh.position.y = startY;
    const duration = 200;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      mesh.position.y = startY + (targetY - startY) * easeOut;

      const glow = this.glowMeshes.get(id);
      if (glow) {
        glow.position.y = mesh.position.y;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }

  getAllMeshes(): THREE.Mesh[] {
    return Array.from(this.meshes.values());
  }
}
