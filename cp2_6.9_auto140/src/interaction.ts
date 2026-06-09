import * as THREE from 'three';
import type { BranchData, TreeResult, TreeConfig } from './fractalTree';
import { regrowFromNode } from './fractalTree';

export interface FallingBranch {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  startTime: number;
  duration: number;
}

export interface InteractionState {
  isDragging: boolean;
  isRightDragging: boolean;
  lastMouseX: number;
  lastMouseY: number;
  cameraDistance: number;
  cameraAngleY: number;
  cameraAngleX: number;
  cameraTarget: THREE.Vector3;
  targetDistance: number;
  targetAngleY: number;
  targetAngleX: number;
  targetPosition: THREE.Vector3;
}

export const DEFAULT_INTERACTION_STATE: InteractionState = {
  isDragging: false,
  isRightDragging: false,
  lastMouseX: 0,
  lastMouseY: 0,
  cameraDistance: 6,
  cameraAngleY: 0.5,
  cameraAngleX: 0.4,
  cameraTarget: new THREE.Vector3(0, 1.5, 0),
  targetDistance: 6,
  targetAngleY: 0.5,
  targetAngleX: 0.4,
  targetPosition: new THREE.Vector3(0, 1.5, 0),
};

export class InteractionManager {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private treeResult: TreeResult | null = null;
  private state: InteractionState;
  private fallingBranches: FallingBranch[] = [];
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private onBranchBreakCallback: (() => void) | null = null;
  private onRegenerateCallback: (() => void) | null = null;
  private onResetViewCallback: (() => void) | null = null;
  private treeConfig: TreeConfig;
  private regrowAnimations: Map<string, { startTime: number; duration: number }> = new Map();

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    initialConfig: TreeConfig
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.scene = scene;
    this.treeConfig = initialConfig;
    this.state = { ...DEFAULT_INTERACTION_STATE };
    this.bindEvents();
    this.updateCamera();
  }

  setTreeResult(result: TreeResult | null): void {
    this.treeResult = result;
    this.fallingBranches = [];
    this.regrowAnimations.clear();
  }

  setConfig(config: TreeConfig): void {
    this.treeConfig = config;
  }

  onBranchBreak(callback: () => void): void {
    this.onBranchBreakCallback = callback;
  }

  onRegenerate(callback: () => void): void {
    this.onRegenerateCallback = callback;
  }

  onResetView(callback: () => void): void {
    this.onResetViewCallback = callback;
  }

  resetCamera(): void {
    this.state.targetDistance = 6;
    this.state.targetAngleY = 0.5;
    this.state.targetAngleX = 0.4;
    this.state.targetPosition.set(0, 1.5, 0);
    if (this.onResetViewCallback) {
      this.onResetViewCallback();
    }
  }

  private bindEvents(): void {
    const domElement = this.renderer.domElement;

    domElement.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    domElement.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', (e) => this.onKeyDown(e));

    domElement.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    domElement.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    domElement.addEventListener('touchend', (e) => this.onTouchEnd(e));
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this.state.isDragging = true;
    } else if (e.button === 2) {
      this.state.isRightDragging = true;
    }
    this.state.lastMouseX = e.clientX;
    this.state.lastMouseY = e.clientY;
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.state.isDragging) {
      const deltaX = e.clientX - this.state.lastMouseX;
      const deltaY = e.clientY - this.state.lastMouseY;
      this.state.targetAngleY -= deltaX * 0.005;
      this.state.targetAngleX += deltaY * 0.005;
      this.state.targetAngleX = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.state.targetAngleX));
      this.state.lastMouseX = e.clientX;
      this.state.lastMouseY = e.clientY;
    } else if (this.state.isRightDragging) {
      const deltaX = e.clientX - this.state.lastMouseX;
      const deltaY = e.clientY - this.state.lastMouseY;
      const panSpeed = 0.01 * this.state.cameraDistance;
      const right = new THREE.Vector3();
      const up = new THREE.Vector3(0, 1, 0);
      this.camera.getWorldDirection(right);
      right.cross(up).normalize();
      this.state.targetPosition.add(right.multiplyScalar(-deltaX * panSpeed));
      this.state.targetPosition.y += deltaY * panSpeed;
      this.state.lastMouseX = e.clientX;
      this.state.lastMouseY = e.clientY;
    }
  }

  private onMouseUp(e: MouseEvent): void {
    const moved = Math.abs(e.clientX - this.state.lastMouseX) > 3 || 
                  Math.abs(e.clientY - this.state.lastMouseY) > 3;
    
    if (e.button === 0 && this.state.isDragging && !moved) {
      this.handleClick(e.clientX, e.clientY);
    }
    this.state.isDragging = false;
    this.state.isRightDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const zoomSpeed = 0.001;
    this.state.targetDistance += e.deltaY * zoomSpeed * this.state.targetDistance;
    this.state.targetDistance = Math.max(0.5, Math.min(5, this.state.targetDistance));
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      e.preventDefault();
      if (this.onRegenerateCallback) {
        this.onRegenerateCallback();
      }
    } else if (e.code === 'KeyR') {
      this.resetCamera();
    }
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.state.isDragging = true;
      this.state.lastMouseX = e.touches[0].clientX;
      this.state.lastMouseY = e.touches[0].clientY;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (this.state.isDragging && e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - this.state.lastMouseX;
      const deltaY = e.touches[0].clientY - this.state.lastMouseY;
      this.state.targetAngleY -= deltaX * 0.005;
      this.state.targetAngleX += deltaY * 0.005;
      this.state.targetAngleX = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.state.targetAngleX));
      this.state.lastMouseX = e.touches[0].clientX;
      this.state.lastMouseY = e.touches[0].clientY;
    }
  }

  private onTouchEnd(_e: TouchEvent): void {
    this.state.isDragging = false;
  }

  private handleClick(clientX: number, clientY: number): void {
    if (!this.treeResult) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const branchMeshes: THREE.Mesh[] = [];
    this.treeResult.meshes.forEach((mesh) => {
      if (mesh.parent === this.treeResult!.group) {
        branchMeshes.push(mesh);
      }
    });

    const intersects = this.raycaster.intersectObjects(branchMeshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const mesh = hit.object as THREE.Mesh;
      const branch = mesh.userData.branch as BranchData;
      if (branch) {
        this.breakBranch(branch, hit.point);
      }
    }
  }

  private breakBranch(branch: BranchData, breakPoint: THREE.Vector3): void {
    if (!this.treeResult || !branch.mesh) return;

    const allDescendants = this.getAllDescendants(branch.id);
    
    allDescendants.forEach((id) => {
      const b = this.treeResult!.branches.get(id);
      if (b && b.mesh) {
        this.createFallingBranch(b, breakPoint);
        this.treeResult!.group.remove(b.mesh);
        this.treeResult!.meshes.delete(id);
        this.treeResult!.branches.delete(id);
      }
    });

    if (branch.mesh) {
      const originalEnd = branch.end.clone();
      branch.end.copy(breakPoint);
      if (branch.originalEnd) {
        branch.originalEnd.copy(breakPoint);
      }
      
      this.treeResult.group.remove(branch.mesh);
      this.treeResult.meshes.delete(branch.id);
      branch.mesh.geometry.dispose();
      (branch.mesh.material as THREE.Material).dispose();

      this.createPartialFallingBranch(branch, originalEnd, breakPoint);

      this.recreateBranchMesh(branch);
    }

    const { newMeshes } = regrowFromNode(
      branch,
      breakPoint,
      this.treeConfig,
      this.treeResult.branches,
      this.treeResult.group
    );

    const now = performance.now();
    newMeshes.forEach((mesh) => {
      this.treeResult!.meshes.set(mesh.userData.branchId, mesh);
      this.regrowAnimations.set(mesh.userData.branchId, {
        startTime: now,
        duration: 500,
      });
    });

    if (this.onBranchBreakCallback) {
      this.onBranchBreakCallback();
    }
  }

  private recreateBranchMesh(branch: BranchData): void {
    if (!this.treeResult) return;

    const direction = new THREE.Vector3().subVectors(branch.end, branch.start);
    const length = direction.length();
    if (length < 0.01) return;

    const geometry = new THREE.CylinderGeometry(
      branch.radius * 0.6,
      branch.radius,
      length,
      8
    );

    const BARK_BROWN = new THREE.Color(0x8B4513);
    const LEAF_GREEN = new THREE.Color(0x3CB371);
    const depthRatio = branch.depth / branch.maxDepth;
    const color = new THREE.Color().lerpColors(BARK_BROWN, LEAF_GREEN, depthRatio);

    const material = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);

    const midpoint = new THREE.Vector3().addVectors(branch.start, branch.end).multiplyScalar(0.5);
    mesh.position.copy(midpoint);

    const up = new THREE.Vector3(0, 1, 0);
    direction.normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
    mesh.quaternion.copy(quaternion);

    mesh.userData = { branchId: branch.id, branch: branch };
    mesh.castShadow = true;

    branch.mesh = mesh;
    this.treeResult.group.add(mesh);
    this.treeResult.meshes.set(branch.id, mesh);
  }

  private getAllDescendants(branchId: string): string[] {
    if (!this.treeResult) return [];
    const descendants: string[] = [];
    const queue = [branchId];
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const current = this.treeResult.branches.get(currentId);
      if (current && currentId !== branchId) {
        descendants.push(currentId);
      }
      if (current) {
        queue.push(...current.children);
      }
    }
    
    return descendants;
  }

  private createFallingBranch(branch: BranchData, _breakPoint: THREE.Vector3): void {
    if (!branch.mesh) return;
    
    const mesh = branch.mesh.clone();
    mesh.position.copy(branch.mesh.position);
    mesh.quaternion.copy(branch.mesh.quaternion);
    mesh.scale.copy(branch.mesh.scale);

    const falling: FallingBranch = {
      mesh,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 2,
        (Math.random() - 0.5) * 2
      ),
      angularVelocity: new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4
      ),
      startTime: performance.now(),
      duration: 1000,
    };

    this.fallingBranches.push(falling);
    this.scene.add(mesh);
  }

  private createPartialFallingBranch(
    branch: BranchData,
    originalEnd: THREE.Vector3,
    breakPoint: THREE.Vector3
  ): void {
    if (!this.treeResult) return;

    const direction = new THREE.Vector3().subVectors(originalEnd, breakPoint);
    const length = direction.length();
    if (length < 0.01) return;

    const geometry = new THREE.CylinderGeometry(
      branch.radius * 0.6,
      branch.radius * 0.8,
      length,
      8
    );

    const BARK_BROWN = new THREE.Color(0x8B4513);
    const LEAF_GREEN = new THREE.Color(0x3CB371);
    const depthRatio = branch.depth / branch.maxDepth;
    const color = new THREE.Color().lerpColors(BARK_BROWN, LEAF_GREEN, depthRatio);

    const material = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);

    const midpoint = new THREE.Vector3().addVectors(breakPoint, originalEnd).multiplyScalar(0.5);
    mesh.position.copy(midpoint);

    const up = new THREE.Vector3(0, 1, 0);
    direction.normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
    mesh.quaternion.copy(quaternion);

    const falling: FallingBranch = {
      mesh,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 1 + 1,
        (Math.random() - 0.5) * 2
      ),
      angularVelocity: new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4
      ),
      startTime: performance.now(),
      duration: 1000,
    };

    this.fallingBranches.push(falling);
    this.scene.add(mesh);
  }

  updateCamera(): void {
    const damping = 0.15;
    this.state.cameraDistance += (this.state.targetDistance - this.state.cameraDistance) * damping;
    this.state.cameraAngleY += (this.state.targetAngleY - this.state.cameraAngleY) * damping;
    this.state.cameraAngleX += (this.state.targetAngleX - this.state.cameraAngleX) * damping;
    this.state.cameraTarget.lerp(this.state.targetPosition, damping);

    const x = this.state.cameraDistance * Math.cos(this.state.cameraAngleX) * Math.sin(this.state.cameraAngleY);
    const y = this.state.cameraDistance * Math.sin(this.state.cameraAngleX) + this.state.cameraTarget.y;
    const z = this.state.cameraDistance * Math.cos(this.state.cameraAngleX) * Math.cos(this.state.cameraAngleY);

    this.camera.position.set(
      x + this.state.cameraTarget.x,
      y,
      z + this.state.cameraTarget.z
    );
    this.camera.lookAt(this.state.cameraTarget);
  }

  updateFallingBranches(currentTime: number): void {
    const gravity = 9.8;
    const toRemove: number[] = [];

    this.fallingBranches.forEach((falling, index) => {
      const elapsed = (currentTime - falling.startTime) / 1000;
      
      if (elapsed >= falling.duration / 1000) {
        toRemove.push(index);
        return;
      }

      falling.velocity.y -= gravity * 0.016;
      falling.mesh.position.add(falling.velocity.clone().multiplyScalar(0.016));
      falling.mesh.rotation.x += falling.angularVelocity.x * 0.016;
      falling.mesh.rotation.y += falling.angularVelocity.y * 0.016;
      falling.mesh.rotation.z += falling.angularVelocity.z * 0.016;

      const alpha = 1 - elapsed / (falling.duration / 1000);
      (falling.mesh.material as THREE.MeshLambertMaterial).opacity = Math.max(0, alpha);
      (falling.mesh.material as THREE.MeshLambertMaterial).transparent = true;
    });

    toRemove.reverse().forEach((index) => {
      const falling = this.fallingBranches[index];
      this.scene.remove(falling.mesh);
      falling.mesh.geometry.dispose();
      (falling.mesh.material as THREE.Material).dispose();
      this.fallingBranches.splice(index, 1);
    });
  }

  updateRegrowAnimations(currentTime: number): void {
    const toRemove: string[] = [];

    this.regrowAnimations.forEach((anim, branchId) => {
      const elapsed = currentTime - anim.startTime;
      const progress = Math.min(1, elapsed / anim.duration);
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      if (this.treeResult) {
        const mesh = this.treeResult.meshes.get(branchId);
        if (mesh) {
          mesh.scale.setScalar(easedProgress);
        }
      }

      if (progress >= 1) {
        toRemove.push(branchId);
      }
    });

    toRemove.forEach((id) => this.regrowAnimations.delete(id));
  }

  updateSway(currentTime: number): void {
    if (!this.treeResult) return;
    const time = currentTime / 1000;
    const frequency = 0.2;
    const amplitude = 0.05;

    this.treeResult.branches.forEach((branch) => {
      if (!branch.mesh || !branch.originalEnd) return;
      const swayAmount = Math.sin(time * frequency * Math.PI * 2 + (branch.swayOffset || 0)) * amplitude;
      const swayAmountX = swayAmount * Math.cos(branch.swayOffset || 0);
      const swayAmountZ = swayAmount * Math.sin(branch.swayOffset || 0);
      
      const depthFactor = branch.depth / branch.maxDepth;
      if (depthFactor > 0.5) {
        const finalSwayX = swayAmountX * depthFactor;
        const finalSwayZ = swayAmountZ * depthFactor;
        branch.mesh.position.x = branch.mesh.position.x + finalSwayX * 0.01;
        branch.mesh.position.z = branch.mesh.position.z + finalSwayZ * 0.01;
      }
    });
  }

  getBranchCount(): number {
    return this.treeResult ? this.treeResult.branches.size : 0;
  }
}
