import * as THREE from 'three';
import { StratumGenerator, MineralNode } from './StratumGenerator';

export interface DrillState {
  currentDepth: number;
  currentResistance: number;
  isDrilling: boolean;
  drillSpeedMultiplier: number;
  maxDepth: number;
  isOverloaded: boolean;
  overloadTime: number;
  collectedMinerals: MineralNode[];
  currentStratumName: string;
  hitMineral: MineralNode | null;
}

export type DrillEvent =
  | { type: 'depthChanged'; depth: number; resistance: number }
  | { type: 'drillingStarted' }
  | { type: 'drillingStopped' }
  | { type: 'speedChanged'; multiplier: number }
  | { type: 'mineralHit'; mineral: MineralNode }
  | { type: 'mineralCollected'; mineral: MineralNode }
  | { type: 'overloadWarning' }
  | { type: 'overloadCleared' };

type DrillEventHandler = (event: DrillEvent) => void;

export class DrillManager {
  private stratumGenerator: StratumGenerator;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private raycaster: THREE.Raycaster;
  private drillMesh: THREE.Group;
  private drillTipPosition: THREE.Vector3;
  private isDragging: boolean = false;
  private drillStartPosition: THREE.Vector3 | null = null;
  private drillCylinderGroup: THREE.Group | null = null;
  private handlers: Set<DrillEventHandler> = new Set();

  private state: DrillState = {
    currentDepth: 0,
    currentResistance: 0,
    isDrilling: false,
    drillSpeedMultiplier: 1.0,
    maxDepth: 50,
    isOverloaded: false,
    overloadTime: 0,
    collectedMinerals: [],
    currentStratumName: '表土层',
    hitMineral: null
  };

  private collectedMineralIds: Set<string> = new Set();
  private baseDrillSpeed: number = 8;
  private overloadThreshold: number = 3;
  private bedrockStartDepth: number = 45;
  private lastMineralTriggerRadius: number = 1.5;

  constructor(
    stratumGenerator: StratumGenerator,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement
  ) {
    this.stratumGenerator = stratumGenerator;
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;
    this.raycaster = new THREE.Raycaster();
    this.drillMesh = this.createDrillMesh();
    this.drillTipPosition = new THREE.Vector3(0, stratumGenerator.CYLINDER_HEIGHT / 2, 0);
    this.scene.add(this.drillMesh);
    this.bindMouseEvents();
  }

  private createDrillMesh(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'drill-bit';

    const coneGeometry = new THREE.ConeGeometry(0.6, 2, 32);
    const coneMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0x332200,
      emissiveIntensity: 0.2
    });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.rotation.x = Math.PI;
    cone.position.y = -1;
    group.add(cone);

    const threadGeometry = new THREE.TorusGeometry(0.6, 0.06, 16, 48);
    const threadMaterial = new THREE.MeshStandardMaterial({
      color: 0xdaa520,
      metalness: 0.8,
      roughness: 0.25
    });

    for (let i = 0; i < 6; i++) {
      const thread = new THREE.Mesh(threadGeometry, threadMaterial);
      thread.position.y = -2.5 + i * 0.5;
      thread.rotation.x = Math.PI / 2;
      group.add(thread);
    }

    const shaftGeometry = new THREE.CylinderGeometry(0.45, 0.45, 4, 32);
    const shaftMaterial = new THREE.MeshStandardMaterial({
      color: 0xc9a96a,
      metalness: 0.7,
      roughness: 0.3
    });
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    shaft.position.y = 3.5;
    group.add(shaft);

    group.position.copy(this.drillTipPosition.clone());
    group.position.y += 4;
    group.visible = false;

    return group;
  }

  private bindMouseEvents(): void {
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.domElement.addEventListener('pointermove', this.onPointerMove);
    this.domElement.addEventListener('pointerup', this.onPointerUp);
    this.domElement.addEventListener('pointerleave', this.onPointerUp);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
      }
    }, { passive: false });
  }

  private onPointerDown = (event: PointerEvent): void => {
    const mouse = new THREE.Vector2();
    const rect = this.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(mouse, this.camera);

    this.drillCylinderGroup = this.scene.getObjectByName('geological-cylinder') as THREE.Group || null;
    if (!this.drillCylinderGroup) return;

    const intersects = this.raycaster.intersectObjects(this.drillCylinderGroup.children, true);

    if (intersects.length > 0) {
      const point = intersects[0].point;

      const radius = this.stratumGenerator.CYLINDER_RADIUS;
      const halfHeight = this.stratumGenerator.CYLINDER_HEIGHT / 2;

      if (point.y <= halfHeight + 2 && point.y >= -halfHeight - 2) {
        const horizontalDist = Math.sqrt(point.x * point.x + point.z * point.z);
        if (horizontalDist <= radius + 3) {
          this.isDragging = true;
          this.drillStartPosition = point.clone();

          const angle = Math.atan2(point.z, point.x);
          const surfaceRadius = Math.max(radius - 0.5, 0.5);
          this.drillTipPosition.set(
            Math.cos(angle) * surfaceRadius,
            Math.min(point.y, halfHeight),
            Math.sin(angle) * surfaceRadius
          );
          this.drillMesh.position.set(
            this.drillTipPosition.x,
            this.drillTipPosition.y + 4,
            this.drillTipPosition.z
          );
          this.drillMesh.lookAt(0, this.drillTipPosition.y, 0);
          this.drillMesh.rotateX(Math.PI / 2);
          this.drillMesh.visible = true;

          const rawDepth = halfHeight - this.drillTipPosition.y;
          this.state.currentDepth = Math.max(0, Math.min(rawDepth, this.state.maxDepth));
          this.state.currentStratumName = this.stratumGenerator.getStratumAtDepth(this.state.currentDepth)?.name || '表土层';
          this.emit({ type: 'drillingStarted' });
          this.state.isDrilling = true;
          (this.domElement as any).setPointerCapture?.(event.pointerId);
        }
      }
    }
  }

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.isDragging || !this.drillStartPosition) return;

    const mouse = new THREE.Vector2();
    const rect = this.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(mouse, this.camera);

    if (!this.drillCylinderGroup) return;

    const intersects = this.raycaster.intersectObjects(this.drillCylinderGroup.children, true);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      const halfHeight = this.stratumGenerator.CYLINDER_HEIGHT / 2;
      const radius = this.stratumGenerator.CYLINDER_RADIUS;

      const angle = Math.atan2(point.z, point.x);
      const surfaceRadius = Math.max(radius - 0.5, 0.5);
      const targetY = Math.min(point.y, halfHeight);
      const clampedY = Math.max(targetY, -halfHeight);

      this.drillTipPosition.set(
        Math.cos(angle) * surfaceRadius,
        clampedY,
        Math.sin(angle) * surfaceRadius
      );

      this.drillMesh.position.set(
        this.drillTipPosition.x,
        this.drillTipPosition.y + 4,
        this.drillTipPosition.z
      );
      this.drillMesh.lookAt(0, this.drillTipPosition.y, 0);
      this.drillMesh.rotateX(Math.PI / 2);

      const rawDepth = halfHeight - this.drillTipPosition.y;
      const newDepth = Math.max(0, Math.min(rawDepth, this.state.maxDepth));

      if (newDepth !== this.state.currentDepth) {
        this.state.currentDepth = newDepth;
        const hardness = this.stratumGenerator.getHardnessAtDepth(newDepth);
        this.state.currentResistance = hardness * this.state.drillSpeedMultiplier;
        this.state.currentStratumName = this.stratumGenerator.getStratumAtDepth(newDepth)?.name || '表土层';
        this.emit({
          type: 'depthChanged',
          depth: newDepth,
          resistance: this.state.currentResistance
        });

        this.checkMineralHit();
      }
    }
  }

  private onPointerUp = (_event: PointerEvent): void => {
    if (this.isDragging) {
      this.isDragging = false;
      this.drillStartPosition = null;
      this.state.isDrilling = false;
      this.state.isOverloaded = false;
      this.state.overloadTime = 0;
      this.emit({ type: 'overloadCleared' });
      this.emit({ type: 'drillingStopped' });
      (this.domElement as any).releasePointerCapture?.(_event.pointerId);
    }
  }

  private checkMineralHit(): void {
    const allMinerals = this.stratumGenerator.getAllMineralNodes();
    const halfHeight = this.stratumGenerator.CYLINDER_HEIGHT / 2;

    for (const mineral of allMinerals) {
      if (this.collectedMineralIds.has(mineral.id)) continue;

      const mineralWorldY = halfHeight - mineral.depth;
      const dy = Math.abs(this.drillTipPosition.y - mineralWorldY);
      const dx = this.drillTipPosition.distanceTo(
        new THREE.Vector3(mineral.position.x, mineralWorldY, mineral.position.z)
      );

      if (dx < this.lastMineralTriggerRadius && dy < 2) {
        if (!this.state.hitMineral || this.state.hitMineral.id !== mineral.id) {
          this.state.hitMineral = mineral;
          this.emit({ type: 'mineralHit', mineral });
        }

        this.collectMineral(mineral);
      }
    }
  }

  private collectMineral(mineral: MineralNode): void {
    if (this.collectedMineralIds.has(mineral.id)) return;

    const collected = this.stratumGenerator.collectMineral(mineral.id);
    if (collected) {
      this.collectedMineralIds.add(mineral.id);
      this.state.collectedMinerals.push(collected);
      this.emit({ type: 'mineralCollected', mineral: collected });
    }
  }

  public update(deltaTime: number): void {
    if (this.state.isDrilling) {
      const rotationSpeed = 8 * this.state.drillSpeedMultiplier;
      this.drillMesh.children.forEach((child, index) => {
        if (index === 0 || index > 6) {
          child.rotation.y += rotationSpeed * deltaTime;
        } else {
          child.rotation.z += rotationSpeed * deltaTime;
        }
      });

      if (this.state.currentDepth >= this.bedrockStartDepth) {
        const extraShake = 0.1 * ((this.state.currentDepth - this.bedrockStartDepth) / 5;
        this.drillMesh.position.x += (Math.random() - 0.5) * extraShake;
        this.drillMesh.position.z += (Math.random() - 0.5) * extraShake;

        this.state.overloadTime += deltaTime;
        if (this.state.overloadTime >= this.overloadThreshold) {
          if (!this.state.isOverloaded) {
            this.state.isOverloaded = true;
            this.emit({ type: 'overloadWarning' });
          }
        }
      } else {
        this.state.overloadTime = Math.max(0, this.state.overloadTime - deltaTime * 2);
      }
    }
  }

  public setDrillSpeed(multiplier: number): void {
    const clamped = Math.max(0.1, Math.min(2.0, multiplier));
    this.state.drillSpeedMultiplier = clamped;
    this.emit({ type: 'speedChanged', multiplier: clamped });
  }

  public getState(): DrillState {
    return { ...this.state };
  }

  public getDrillWorldPosition(): THREE.Vector3 {
    return this.drillTipPosition.clone();
  }

  public getDrillMesh(): THREE.Group {
    return this.drillMesh;
  }

  public getStratumGenerator(): StratumGenerator {
    return this.stratumGenerator;
  }

  public on(handler: DrillEventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private emit(event: DrillEvent): void {
    this.handlers.forEach(handler => handler(event));
  }

  public destroy(): void {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.domElement.removeEventListener('pointerleave', this.onPointerUp);
  }
}
