import * as THREE from 'three';

export type Axis = 'x' | 'y' | 'z';
export type LayerIndex = 0 | 1 | 2;

export interface LayerInfo {
  axis: Axis;
  index: LayerIndex;
  clockwise: boolean;
}

interface Cubie {
  mesh: THREE.Mesh;
  gridPos: THREE.Vector3;
}

const FACE_COLORS: Record<string, number> = {
  right: 0xff0000,
  left: 0xff8c00,
  top: 0xffd500,
  bottom: 0xffffff,
  front: 0x009b48,
  back: 0x0046ad,
  inner: 0x1a1a2e,
};

const CUBIE_SIZE = 0.95;
const GAP = 0.05;
const STEP = CUBIE_SIZE + GAP;
const ANIM_DURATION = 300;
const SCRAMBLE_STEP_INTERVAL = 200;

export class RubiksCube {
  public group: THREE.Group;
  private cubies: Cubie[] = [];
  private geometry: THREE.BoxGeometry;
  private materials: Record<string, THREE.MeshStandardMaterial>;
  private isAnimating = false;
  private animationQueue: LayerInfo[] = [];
  private pivot: THREE.Group;
  private onStepCallback?: () => void;

  constructor() {
    this.group = new THREE.Group();
    this.pivot = new THREE.Group();
    this.group.add(this.pivot);

    this.geometry = new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE);

    this.materials = {
      right: new THREE.MeshStandardMaterial({ color: FACE_COLORS.right, roughness: 0.5, metalness: 0.1 }),
      left: new THREE.MeshStandardMaterial({ color: FACE_COLORS.left, roughness: 0.5, metalness: 0.1 }),
      top: new THREE.MeshStandardMaterial({ color: FACE_COLORS.top, roughness: 0.5, metalness: 0.1 }),
      bottom: new THREE.MeshStandardMaterial({ color: FACE_COLORS.bottom, roughness: 0.5, metalness: 0.1 }),
      front: new THREE.MeshStandardMaterial({ color: FACE_COLORS.front, roughness: 0.5, metalness: 0.1 }),
      back: new THREE.MeshStandardMaterial({ color: FACE_COLORS.back, roughness: 0.5, metalness: 0.1 }),
      inner: new THREE.MeshStandardMaterial({ color: FACE_COLORS.inner, roughness: 0.8, metalness: 0 }),
    };

    this.buildCube();
  }

  private buildCube(): void {
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const mats = this.getCubieMaterials(x, y, z);
          const mesh = new THREE.Mesh(this.geometry, mats);
          mesh.position.set(x * STEP, y * STEP, z * STEP);

          const edges = new THREE.EdgesGeometry(this.geometry);
          const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })
          );
          mesh.add(line);

          this.group.add(mesh);
          this.cubies.push({
            mesh,
            gridPos: new THREE.Vector3(x, y, z),
          });
        }
      }
    }
  }

  private getCubieMaterials(x: number, y: number, z: number): THREE.MeshStandardMaterial[] {
    return [
      x === 1 ? this.materials.right : this.materials.inner,
      x === -1 ? this.materials.left : this.materials.inner,
      y === 1 ? this.materials.top : this.materials.inner,
      y === -1 ? this.materials.bottom : this.materials.inner,
      z === 1 ? this.materials.front : this.materials.inner,
      z === -1 ? this.materials.back : this.materials.inner,
    ];
  }

  public setOnStepCallback(callback: () => void): void {
    this.onStepCallback = callback;
  }

  public isBusy(): boolean {
    return this.isAnimating || this.animationQueue.length > 0;
  }

  public getCubieMeshes(): THREE.Mesh[] {
    return this.cubies.map((c) => c.mesh);
  }

  public detectLayerFromFace(
    mesh: THREE.Mesh,
    faceNormal: THREE.Vector3
  ): LayerInfo | null {
    const worldNormal = faceNormal.clone();
    const cubie = this.cubies.find((c) => c.mesh === mesh);
    if (!cubie) return null;

    const normal = worldNormal.clone();
    normal.round();

    let axis: Axis;
    let index: LayerIndex;
    let clockwise = true;

    if (Math.abs(normal.x) > 0.5) {
      axis = 'x';
      index = cubie.gridPos.x === -1 ? 0 : cubie.gridPos.x === 0 ? 1 : 2;
      clockwise = normal.x > 0;
    } else if (Math.abs(normal.y) > 0.5) {
      axis = 'y';
      index = cubie.gridPos.y === -1 ? 0 : cubie.gridPos.y === 0 ? 1 : 2;
      clockwise = normal.y < 0;
    } else {
      axis = 'z';
      index = cubie.gridPos.z === -1 ? 0 : cubie.gridPos.z === 0 ? 1 : 2;
      clockwise = normal.z < 0;
    }

    return { axis, index, clockwise };
  }

  public rotateLayer(layer: LayerInfo, countStep = true): void {
    if (this.isAnimating) {
      this.animationQueue.push(layer);
      return;
    }
    this.executeRotation(layer, countStep);
  }

  private executeRotation(layer: LayerInfo, countStep: boolean): void {
    this.isAnimating = true;

    const targetCubies = this.getLayerCubies(layer.axis, layer.index);

    targetCubies.forEach((c) => {
      this.pivot.attach(c.mesh);
    });

    const angle = layer.clockwise ? -Math.PI / 2 : Math.PI / 2;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / ANIM_DURATION, 1);
      const eased = this.elasticEaseOut(progress);

      this.pivot.setRotationFromAxisAngle(
        new THREE.Vector3(
          layer.axis === 'x' ? 1 : 0,
          layer.axis === 'y' ? 1 : 0,
          layer.axis === 'z' ? 1 : 0
        ),
        angle * eased
      );

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.finalizeRotation(targetCubies, layer);
        if (countStep && this.onStepCallback) {
          this.onStepCallback();
        }
        this.isAnimating = false;
        if (this.animationQueue.length > 0) {
          const next = this.animationQueue.shift()!;
          setTimeout(() => this.executeRotation(next, countStep), 50);
        }
      }
    };

    animate();
  }

  private elasticEaseOut(t: number): number {
    if (t === 0 || t === 1) return t;
    const p = 0.3;
    const s = p / 4;
    return Math.pow(2, -10 * t) * Math.sin(((t - s) * (2 * Math.PI)) / p) + 1;
  }

  private getLayerCubies(axis: Axis, index: LayerIndex): Cubie[] {
    const target = index - 1;
    return this.cubies.filter((c) => {
      if (axis === 'x') return c.gridPos.x === target;
      if (axis === 'y') return c.gridPos.y === target;
      return c.gridPos.z === target;
    });
  }

  private finalizeRotation(cubies: Cubie[], layer: LayerInfo): void {
    cubies.forEach((c) => {
      const worldPos = new THREE.Vector3();
      const worldQuat = new THREE.Quaternion();
      c.mesh.getWorldPosition(worldPos);
      c.mesh.getWorldQuaternion(worldQuat);

      this.group.attach(c.mesh);

      c.mesh.position.copy(worldPos);
      c.mesh.quaternion.copy(worldQuat);

      c.gridPos.set(
        Math.round(c.mesh.position.x / STEP),
        Math.round(c.mesh.position.y / STEP),
        Math.round(c.mesh.position.z / STEP)
      );
    });

    this.pivot.rotation.set(0, 0, 0);
  }

  public scramble(steps = 20): Promise<void> {
    return new Promise((resolve) => {
      const axes: Axis[] = ['x', 'y', 'z'];
      const indices: LayerIndex[] = [0, 1, 2];
      const scrambleSteps: LayerInfo[] = [];

      for (let i = 0; i < steps; i++) {
        scrambleSteps.push({
          axis: axes[Math.floor(Math.random() * 3)],
          index: indices[Math.floor(Math.random() * 3)],
          clockwise: Math.random() > 0.5,
        });
      }

      let idx = 0;
      const doNext = () => {
        if (idx >= scrambleSteps.length) {
          resolve();
          return;
        }
        this.rotateLayer(scrambleSteps[idx], false);
        idx++;
        setTimeout(doNext, SCRAMBLE_STEP_INTERVAL);
      };

      doNext();
    });
  }

  public reset(): void {
    this.animationQueue = [];
    if (this.isAnimating) {
      setTimeout(() => this.reset(), 50);
      return;
    }

    this.cubies.forEach((c) => {
      this.group.attach(c.mesh);
    });
    this.pivot.rotation.set(0, 0, 0);
    this.pivot.clear();

    const targetPos = [-STEP, 0, STEP];
    let i = 0;
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const cubie = this.cubies[i];
          cubie.mesh.position.set(targetPos[x + 1], targetPos[y + 1], targetPos[z + 1]);
          cubie.mesh.rotation.set(0, 0, 0);
          cubie.gridPos.set(x, y, z);
          i++;
        }
      }
    }
  }
}
