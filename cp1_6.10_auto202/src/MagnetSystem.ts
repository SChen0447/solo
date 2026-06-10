import * as THREE from 'three';

const COLOR_N_DEFAULT = new THREE.Color('#ff3b3b');
const COLOR_S_DEFAULT = new THREE.Color('#3b6bff');
const ROTATION_SPEED = 0.2;
const FLIP_DURATION = 0.8;
const FLASH_DURATION = 0.3;

export interface PolarityColors {
  colorN: THREE.Color;
  colorS: THREE.Color;
}

export class MagnetSystem {
  public group: THREE.Group;
  private meshN: THREE.Mesh;
  private meshS: THREE.Mesh;
  private flashMesh: THREE.Mesh;
  private colorN: THREE.Color;
  private colorS: THREE.Color;
  private targetColorN: THREE.Color;
  private targetColorS: THREE.Color;
  private isFlipping: boolean = false;
  private flipProgress: number = 0;
  private isFlashing: boolean = false;
  private flashProgress: number = 0;
  private rotationSpeed: number = ROTATION_SPEED;
  private startColorN: THREE.Color;
  private startColorS: THREE.Color;

  constructor() {
    this.group = new THREE.Group();
    this.colorN = COLOR_N_DEFAULT.clone();
    this.colorS = COLOR_S_DEFAULT.clone();
    this.targetColorN = this.colorN.clone();
    this.targetColorS = this.colorS.clone();
    this.startColorN = this.colorN.clone();
    this.startColorS = this.colorS.clone();

    this.createMagnetMeshes();
    this.createFlashMesh();
  }

  private createMagnetMeshes(): void {
    const geometry = new THREE.BoxGeometry(1.5, 1, 1);

    const materialN = new THREE.MeshStandardMaterial({
      color: this.colorN,
      transparent: true,
      opacity: 0.75,
      roughness: 0.3,
      metalness: 0.5,
      emissive: this.colorN,
      emissiveIntensity: 0.15
    });

    const materialS = new THREE.MeshStandardMaterial({
      color: this.colorS,
      transparent: true,
      opacity: 0.75,
      roughness: 0.3,
      metalness: 0.5,
      emissive: this.colorS,
      emissiveIntensity: 0.15
    });

    this.meshN = new THREE.Mesh(geometry, materialN);
    this.meshN.position.x = -0.75;
    this.meshN.name = 'poleN';

    this.meshS = new THREE.Mesh(geometry, materialS);
    this.meshS.position.x = 0.75;
    this.meshS.name = 'poleS';

    const edgesGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(3, 1, 1));
    const edgesMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);

    this.group.add(this.meshN);
    this.group.add(this.meshS);
    this.group.add(edges);
  }

  private createFlashMesh(): void {
    const geometry = new THREE.BoxGeometry(3.2, 1.2, 1.2);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0
    });
    this.flashMesh = new THREE.Mesh(geometry, material);
    this.flashMesh.visible = false;
    this.group.add(this.flashMesh);
  }

  public setPolarity(colorN: THREE.Color, colorS: THREE.Color): void {
    this.targetColorN = colorN.clone();
    this.targetColorS = colorS.clone();
    this.isFlipping = true;
    this.flipProgress = 0;
    this.startColorN = this.colorN.clone();
    this.startColorS = this.colorS.clone();
    this.triggerFlash();
  }

  public flipPolarity(): void {
    this.setPolarity(this.colorS.clone(), this.colorN.clone());
  }

  private triggerFlash(): void {
    this.isFlashing = true;
    this.flashProgress = 0;
    this.flashMesh.visible = true;
  }

  public update(deltaTime: number): void {
    this.group.rotation.y += this.rotationSpeed * deltaTime;

    if (this.isFlipping) {
      this.flipProgress = Math.min(this.flipProgress + deltaTime / FLIP_DURATION, 1);
      const t = this.easeInOutCubic(this.flipProgress);
      this.colorN.lerpColors(this.startColorN, this.targetColorN, t);
      this.colorS.lerpColors(this.startColorS, this.targetColorS, t);
      this.updateMaterials();

      if (this.flipProgress >= 1) {
        this.isFlipping = false;
      }
    }

    if (this.isFlashing) {
      this.flashProgress = Math.min(this.flashProgress + deltaTime / FLASH_DURATION, 1);
      const flashOpacity = Math.sin(this.flashProgress * Math.PI) * 0.6;
      (this.flashMesh.material as THREE.MeshBasicMaterial).opacity = flashOpacity;

      if (this.flashProgress >= 1) {
        this.isFlashing = false;
        this.flashMesh.visible = false;
      }
    }
  }

  private updateMaterials(): void {
    const matN = this.meshN.material as THREE.MeshStandardMaterial;
    const matS = this.meshS.material as THREE.MeshStandardMaterial;
    matN.color.copy(this.colorN);
    matN.emissive.copy(this.colorN);
    matS.color.copy(this.colorS);
    matS.emissive.copy(this.colorS);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public checkClick(intersects: THREE.Intersection[]): boolean {
    for (const hit of intersects) {
      if (hit.object === this.meshN || hit.object === this.meshS) {
        return true;
      }
    }
    return false;
  }

  public getPolePositions(): { north: THREE.Vector3; south: THREE.Vector3 } {
    const north = new THREE.Vector3();
    const south = new THREE.Vector3();
    this.meshN.getWorldPosition(north);
    this.meshS.getWorldPosition(south);
    return { north, south };
  }

  public getMagnetRotation(): number {
    return this.group.rotation.y;
  }

  public getPolarity(): PolarityColors {
    return {
      colorN: this.colorN.clone(),
      colorS: this.colorS.clone()
    };
  }
}
