import * as THREE from 'three';

export interface PaperFinalPose {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  colorIndex: number;
}

export const PHOENIX_PAPER_COLORS: string[] = [
  '#e8c4a0',
  '#c4a882',
  '#d4a574',
  '#b8956a',
  '#e5b98a',
  '#cc9966',
  '#dbb896',
  '#c9a07a'
];

export const PHOENIX_CORRECT_SEQUENCE: number[][] = [
  [0, 1],
  [2, 3],
  [0, 2],
  [4, 5],
  [1, 5],
  [6, 7],
  [3, 7],
  [4, 8],
  [6, 9],
  [8, 9]
];

export const PHOENIX_PAPER_POSES: PaperFinalPose[] = [
  {
    position: new THREE.Vector3(-1.2, 0.3, -0.5),
    rotation: new THREE.Euler(-0.3, 0.2, 0.1),
    scale: new THREE.Vector3(1, 1, 1),
    colorIndex: 0
  },
  {
    position: new THREE.Vector3(-0.6, 0.5, -0.8),
    rotation: new THREE.Euler(-0.2, 0.4, 0.15),
    scale: new THREE.Vector3(1, 1, 1),
    colorIndex: 2
  },
  {
    position: new THREE.Vector3(-1.0, 0.2, 0.2),
    rotation: new THREE.Euler(0.2, -0.3, -0.1),
    scale: new THREE.Vector3(1, 1, 1),
    colorIndex: 1
  },
  {
    position: new THREE.Vector3(-0.4, 0.4, 0.6),
    rotation: new THREE.Euler(0.3, -0.5, -0.2),
    scale: new THREE.Vector3(1, 1, 1),
    colorIndex: 3
  },
  {
    position: new THREE.Vector3(0.0, 0.8, -0.3),
    rotation: new THREE.Euler(-0.5, 0.0, 0.0),
    scale: new THREE.Vector3(0.8, 0.8, 0.8),
    colorIndex: 4
  },
  {
    position: new THREE.Vector3(0.0, 0.6, -0.1),
    rotation: new THREE.Euler(-0.3, 0.1, 0.0),
    scale: new THREE.Vector3(0.9, 0.9, 0.9),
    colorIndex: 5
  },
  {
    position: new THREE.Vector3(1.0, 0.3, 0.3),
    rotation: new THREE.Euler(0.2, 0.4, 0.1),
    scale: new THREE.Vector3(1, 1, 1),
    colorIndex: 6
  },
  {
    position: new THREE.Vector3(0.6, 0.4, 0.7),
    rotation: new THREE.Euler(0.3, 0.6, 0.2),
    scale: new THREE.Vector3(1, 1, 1),
    colorIndex: 7
  },
  {
    position: new THREE.Vector3(0.8, 0.2, -0.4),
    rotation: new THREE.Euler(-0.1, -0.3, 0.0),
    scale: new THREE.Vector3(0.9, 0.9, 0.9),
    colorIndex: 0
  },
  {
    position: new THREE.Vector3(1.2, 0.15, -0.2),
    rotation: new THREE.Euler(0.0, -0.15, 0.05),
    scale: new THREE.Vector3(0.85, 0.85, 0.85),
    colorIndex: 2
  }
];

export class Phoenix {
  private scene: THREE.Scene;
  private group: THREE.Group;
  private isRising: boolean = false;
  private riseStartTime: number = 0;
  private targetHeight: number = 5;
  private riseSpeed: number = 0.5;
  private startY: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.scene.add(this.group);
  }

  public buildFromPapers(paperMeshes: THREE.Mesh[]): void {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
    }

    paperMeshes.forEach((mesh, index) => {
      const pose = PHOENIX_PAPER_POSES[index];
      const cloned = mesh.clone(true);

      cloned.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          const mat = obj.material as THREE.MeshStandardMaterial;
          if (mat.map) {
            mat.map = mat.map.clone();
          }
          obj.material = mat.clone();
        }
      });

      cloned.position.copy(pose.position);
      cloned.rotation.copy(pose.rotation);
      cloned.scale.copy(pose.scale);
      cloned.userData.originalColor = (mesh.material as THREE.MeshStandardMaterial).color.clone();

      this.group.add(cloned);
    });

    this.addPhoenixDetails();

    this.group.position.set(0, this.startY, 0);
    this.group.visible = true;
  }

  private addPhoenixDetails(): void {
    const headGeom = new THREE.ConeGeometry(0.25, 0.5, 6);
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xcc4444,
      metalness: 0.3,
      roughness: 0.6
    });
    const head = new THREE.Mesh(headGeom, headMat);
    head.position.set(0, 1.2, -0.2);
    head.rotation.z = Math.PI;
    this.group.add(head);

    const beakGeom = new THREE.ConeGeometry(0.08, 0.25, 4);
    const beakMat = new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      metalness: 0.5,
      roughness: 0.4
    });
    const beak = new THREE.Mesh(beakGeom, beakMat);
    beak.position.set(0, 1.35, -0.15);
    beak.rotation.x = Math.PI * 0.4;
    this.group.add(beak);

    const tailGeom = new THREE.PlaneGeometry(1.5, 0.4);
    const tailMat = new THREE.MeshStandardMaterial({
      color: 0xdd6644,
      metalness: 0.2,
      roughness: 0.7,
      side: THREE.DoubleSide
    });
    const tail = new THREE.Mesh(tailGeom, tailMat);
    tail.position.set(0.5, 0.1, 1.0);
    tail.rotation.y = -0.5;
    tail.rotation.z = 0.3;
    this.group.add(tail);

    const tail2 = tail.clone();
    tail2.position.set(0.8, 0.05, 0.8);
    tail2.rotation.y = -0.7;
    tail2.rotation.z = 0.2;
    this.group.add(tail2);
  }

  public startRise(): void {
    this.isRising = true;
    this.riseStartTime = performance.now();
    this.group.position.y = this.startY;
  }

  public update(deltaTime: number): void {
    if (this.isRising) {
      const elapsed = (performance.now() - this.riseStartTime) / 1000;
      const targetY = this.startY + this.riseSpeed * elapsed;

      if (targetY >= this.targetHeight) {
        this.group.position.y = this.targetHeight;
        this.isRising = false;
      } else {
        this.group.position.y = targetY;
      }

      this.group.rotation.y += deltaTime * 0.3;
    }
  }

  public hide(): void {
    this.group.visible = false;
    this.isRising = false;
    this.group.position.y = this.startY;
    this.group.rotation.y = 0;
  }

  public isVisible(): boolean {
    return this.group.visible;
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public dispose(): void {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    this.scene.remove(this.group);
  }
}

export function getNextExpectedPair(completedPairs: number[][]): number[] | null {
  for (const pair of PHOENIX_CORRECT_SEQUENCE) {
    const alreadyDone = completedPairs.some(cp =>
      (cp[0] === pair[0] && cp[1] === pair[1]) ||
      (cp[0] === pair[1] && cp[1] === pair[0])
    );
    if (!alreadyDone) {
      return pair;
    }
  }
  return null;
}

export function isCorrectPair(paperIdx1: number, paperIdx2: number, completedPairs: number[][]): boolean {
  const expected = getNextExpectedPair(completedPairs);
  if (!expected) return false;

  return (
    (paperIdx1 === expected[0] && paperIdx2 === expected[1]) ||
    (paperIdx1 === expected[1] && paperIdx2 === expected[0])
  );
}
