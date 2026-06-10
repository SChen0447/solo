import * as THREE from 'three';

const CUBIE_SIZE = 1;
const CUBIE_GAP = 0.05;
const STEP = CUBIE_SIZE + CUBIE_GAP;
const INNER_COLOR = 0x2d2d2d;

export const FACE_COLORS = {
  top: 0xffffff,
  bottom: 0xffff00,
  front: 0x00ff00,
  back: 0x0000ff,
  right: 0xff0000,
  left: 0xff8c00,
};

export interface RotationMove {
  axis: 'x' | 'y' | 'z';
  layer: number;
  direction: number;
}

interface CubieInfo {
  mesh: THREE.Group;
  position: THREE.Vector3;
}

export class RubiksCube {
  public group: THREE.Group;
  public cubies: CubieInfo[] = [];
  public moveHistory: RotationMove[] = [];
  public isAnimating = false;

  private highlightMesh: THREE.Mesh | null = null;

  constructor() {
    this.group = new THREE.Group();
    this.group.rotation.x = (25 * Math.PI) / 180;
    this.group.rotation.y = (30 * Math.PI) / 180;
    this.createCubies();
  }

  private createCubies() {
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const cubie = this.createSingleCubie(x, y, z);
          this.group.add(cubie.mesh);
          this.cubies.push(cubie);
        }
      }
    }
  }

  private createSingleCubie(x: number, y: number, z: number): CubieInfo {
    const group = new THREE.Group();
    const position = new THREE.Vector3(x * STEP, y * STEP, z * STEP);
    group.position.copy(position);

    const materials: THREE.MeshStandardMaterial[] = [
      new THREE.MeshStandardMaterial({ color: x === 1 ? FACE_COLORS.right : INNER_COLOR }),
      new THREE.MeshStandardMaterial({ color: x === -1 ? FACE_COLORS.left : INNER_COLOR }),
      new THREE.MeshStandardMaterial({ color: y === 1 ? FACE_COLORS.top : INNER_COLOR }),
      new THREE.MeshStandardMaterial({ color: y === -1 ? FACE_COLORS.bottom : INNER_COLOR }),
      new THREE.MeshStandardMaterial({ color: z === 1 ? FACE_COLORS.front : INNER_COLOR }),
      new THREE.MeshStandardMaterial({ color: z === -1 ? FACE_COLORS.back : INNER_COLOR }),
    ];

    const geometry = new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE);
    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 })
    );

    const mesh = new THREE.Mesh(geometry, materials);
    group.add(mesh);
    group.add(line);

    return { mesh: group, position };
  }

  public getCubiesInLayer(axis: 'x' | 'y' | 'z', layer: number): CubieInfo[] {
    const tolerance = STEP * 0.5;
    return this.cubies.filter((c) => {
      const pos = c.mesh.position;
      if (axis === 'x') return Math.abs(pos.x - layer * STEP) < tolerance;
      if (axis === 'y') return Math.abs(pos.y - layer * STEP) < tolerance;
      return Math.abs(pos.z - layer * STEP) < tolerance;
    });
  }

  public rotateLayerAnimated(
    axis: 'x' | 'y' | 'z',
    layer: number,
    direction: number,
    duration: number,
    onComplete?: () => void,
    highlight: boolean = false
  ): void {
    if (this.isAnimating) return;
    this.isAnimating = true;

    const cubiesInLayer = this.getCubiesInLayer(axis, layer);
    const pivot = new THREE.Group();
    this.group.add(pivot);

    cubiesInLayer.forEach((c) => {
      pivot.attach(c.mesh);
    });

    if (highlight && cubiesInLayer.length > 0) {
      this.showHighlight(axis, layer);
      setTimeout(() => this.hideHighlight(), 100);
    }

    const targetAngle = (direction * Math.PI) / 2;
    const startTime = performance.now();
    const startAngle = 0;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = this.easeInOutQuad(progress);
      const currentAngle = startAngle + (targetAngle - startAngle) * eased;

      if (axis === 'x') pivot.rotation.x = currentAngle;
      else if (axis === 'y') pivot.rotation.y = currentAngle;
      else pivot.rotation.z = currentAngle;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        cubiesInLayer.forEach((c) => {
          this.group.attach(c.mesh);
          c.mesh.position.x = Math.round(c.mesh.position.x / STEP) * STEP;
          c.mesh.position.y = Math.round(c.mesh.position.y / STEP) * STEP;
          c.mesh.position.z = Math.round(c.mesh.position.z / STEP) * STEP;
          c.position.copy(c.mesh.position);
          c.mesh.rotation.set(
            Math.round(c.mesh.rotation.x / (Math.PI / 2)) * (Math.PI / 2),
            Math.round(c.mesh.rotation.y / (Math.PI / 2)) * (Math.PI / 2),
            Math.round(c.mesh.rotation.z / (Math.PI / 2)) * (Math.PI / 2)
          );
        });
        this.group.remove(pivot);
        this.isAnimating = false;
        if (onComplete) onComplete();
      }
    };
    requestAnimationFrame(animate);
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  public recordMove(axis: 'x' | 'y' | 'z', layer: number, direction: number) {
    this.moveHistory.push({ axis, layer, direction });
  }

  public getMoveCount(): number {
    return this.moveHistory.length;
  }

  public clearHistory() {
    this.moveHistory = [];
  }

  public reset() {
    this.cubies.forEach((c) => {
      c.mesh.position.set(
        c.position.x,
        c.position.y,
        c.position.z
      );
      c.mesh.rotation.set(0, 0, 0);
      c.mesh.quaternion.identity();
    });
    this.moveHistory = [];
  }

  private showHighlight(axis: 'x' | 'y' | 'z', layer: number) {
    this.hideHighlight();
    const size = CUBIE_SIZE * 3 + CUBIE_GAP * 2 + 0.05;
    let geometry: THREE.BufferGeometry;
    const position = new THREE.Vector3();

    if (axis === 'x') {
      geometry = new THREE.BoxGeometry(0.02, size, size);
      position.set(layer * STEP, 0, 0);
    } else if (axis === 'y') {
      geometry = new THREE.BoxGeometry(size, 0.02, size);
      position.set(0, layer * STEP, 0);
    } else {
      geometry = new THREE.BoxGeometry(size, size, 0.02);
      position.set(0, 0, layer * STEP);
    }

    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
    });
    this.highlightMesh = new THREE.Mesh(geometry, material);
    this.highlightMesh.position.copy(position);
    this.group.add(this.highlightMesh);
  }

  private hideHighlight() {
    if (this.highlightMesh) {
      this.group.remove(this.highlightMesh);
      this.highlightMesh.geometry.dispose();
      (this.highlightMesh.material as THREE.Material).dispose();
      this.highlightMesh = null;
    }
  }
}
