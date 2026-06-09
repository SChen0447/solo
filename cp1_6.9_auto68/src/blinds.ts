import * as THREE from 'three';

export const BLIND_COLORS: string[] = [
  '#ff3366',
  '#33ccff',
  '#66ff33',
  '#ffcc33',
  '#aa66ff',
  '#ff8833'
];

export const BLIND_WIDTH = 2;
export const BLIND_HEIGHT = 0.15;
export const BLIND_GAP = 0.25;
export const BLIND_COUNT = 12;
export const MIN_ANGLE = -45;
export const MAX_ANGLE = 45;
export const ANGLE_STEP = 5;
export const DEFAULT_OPACITY = 0.7;

export interface BlindData {
  mesh: THREE.Mesh;
  material: THREE.MeshPhysicalMaterial;
  baseColor: THREE.Color;
  targetOpacity: number;
  currentOpacity: number;
}

export class BlindsManager {
  public blinds: BlindData[] = [];
  public group: THREE.Group = new THREE.Group();
  private angleDeg: number = 0;
  private opacityAnimating: boolean = false;
  private opacityDir: number = 0;
  private minOpacity: number = 0.3;

  constructor() {
    this.createBlinds();
  }

  private createBlinds(): void {
    const geometry = new THREE.PlaneGeometry(BLIND_WIDTH, BLIND_HEIGHT);
    const totalHeight = (BLIND_COUNT - 1) * BLIND_GAP;

    for (let i = 0; i < BLIND_COUNT; i++) {
      const colorHex = BLIND_COLORS[Math.floor(Math.random() * BLIND_COLORS.length)];
      const color = new THREE.Color(colorHex);

      const material = new THREE.MeshPhysicalMaterial({
        color: color,
        transparent: true,
        opacity: DEFAULT_OPACITY,
        roughness: 0.2,
        metalness: 0.1,
        transmission: 0.6,
        thickness: 0.1,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geometry, material);
      const y = totalHeight / 2 - i * BLIND_GAP;
      mesh.position.set(0, y, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = false;

      this.group.add(mesh);
      this.blinds.push({
        mesh,
        material,
        baseColor: color.clone(),
        targetOpacity: DEFAULT_OPACITY,
        currentOpacity: DEFAULT_OPACITY
      });
    }
  }

  public rotate(deltaDeg: number): void {
    const newAngle = THREE.MathUtils.clamp(
      this.angleDeg + deltaDeg,
      MIN_ANGLE,
      MAX_ANGLE
    );
    if (newAngle !== this.angleDeg) {
      this.angleDeg = newAngle;
      this.triggerOpacityPulse();
    }
  }

  private triggerOpacityPulse(): void {
    this.opacityAnimating = true;
    this.opacityDir = -1;
  }

  public randomizeColors(): void {
    for (const blind of this.blinds) {
      const colorHex = BLIND_COLORS[Math.floor(Math.random() * BLIND_COLORS.length)];
      blind.baseColor.set(colorHex);
      blind.material.color.copy(blind.baseColor);
    }
  }

  public getAngle(): number {
    return this.angleDeg;
  }

  public getBlindColors(): THREE.Color[] {
    return this.blinds.map(b => b.baseColor.clone());
  }

  public getWeightedAverageColor(): THREE.Color {
    const result = new THREE.Color(0, 0, 0);
    for (let i = 0; i < this.blinds.length; i++) {
      const weight = (this.blinds.length - i) / this.blinds.length;
      result.r += this.blinds[i].baseColor.r * weight;
      result.g += this.blinds[i].baseColor.g * weight;
      result.b += this.blinds[i].baseColor.b * weight;
    }
    const totalWeight = (this.blinds.length + 1) / 2;
    result.r /= totalWeight;
    result.g /= totalWeight;
    result.b /= totalWeight;
    return result;
  }

  public update(deltaTime: number): void {
    const angleRad = THREE.MathUtils.degToRad(this.angleDeg);

    for (let i = 0; i < this.blinds.length; i++) {
      const blind = this.blinds[i];
      blind.mesh.rotation.x = angleRad;

      const offset = Math.sin(angleRad) * BLIND_HEIGHT * 0.5;
      blind.mesh.position.z = offset;
    }

    if (this.opacityAnimating) {
      const speed = 1.5;
      for (const blind of this.blinds) {
        blind.currentOpacity += this.opacityDir * speed * deltaTime;
        if (this.opacityDir < 0 && blind.currentOpacity <= this.minOpacity) {
          blind.currentOpacity = this.minOpacity;
          this.opacityDir = 1;
        } else if (this.opacityDir > 0 && blind.currentOpacity >= DEFAULT_OPACITY) {
          blind.currentOpacity = DEFAULT_OPACITY;
          this.opacityDir = 0;
          this.opacityAnimating = false;
        }
        blind.material.opacity = blind.currentOpacity;
      }
    }
  }

  public dispose(): void {
    for (const blind of this.blinds) {
      blind.material.dispose();
    }
    if (this.blinds.length > 0) {
      (this.blinds[0].mesh.geometry as THREE.BufferGeometry).dispose();
    }
  }
}
