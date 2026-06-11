import * as THREE from 'three';

export interface ColorPreset {
  name: string;
  color: THREE.Color;
}

export class ColorManager {
  private colorPresets: ColorPreset[] = [];
  private currentColor: THREE.Color;
  private targetColors: Float32Array | null = null;
  private currentColors: Float32Array | null = null;
  private isAnimating: boolean = false;
  private animationProgress: number = 0;
  private animationDuration: number = 800;
  private vertexCount: number = 0;
  private brushRadius: number = 0.25;
  private isPainting: boolean = false;

  constructor() {
    this.currentColor = new THREE.Color(0xd9bf9e);
    this.initColorPresets();
  }

  private initColorPresets(): void {
    const presetColors = [
      { name: '陶土', color: 0xd9bf9e },
      { name: '朱砂', color: 0xc94c4c },
      { name: '琥珀', color: 0xf0a040 },
      { name: '翠绿', color: 0x5cb85c },
      { name: '湖蓝', color: 0x4a90d9 },
      { name: '靛紫', color: 0x8a63d2 },
      { name: '品红', color: 0xd850a0 },
      { name: '玄铁', color: 0x4a4a4a },
      { name: '赤金', color: 0xffd700 },
      { name: '月白', color: 0xe8f0f8 }
    ];

    for (const preset of presetColors) {
      this.colorPresets.push({
        name: preset.name,
        color: new THREE.Color(preset.color)
      });
    }
  }

  public getPresets(): ColorPreset[] {
    return [...this.colorPresets];
  }

  public getCurrentColor(): THREE.Color {
    return this.currentColor.clone();
  }

  public setCurrentColor(color: THREE.Color): void {
    this.currentColor = color.clone();
  }

  public setBrushRadius(radius: number): void {
    this.brushRadius = Math.max(0.1, Math.min(0.5, radius));
  }

  public setVertexCount(count: number): void {
    this.vertexCount = count;
  }

  public startColorAnimation(targetColor: THREE.Color, colorAttribute: THREE.BufferAttribute): void {
    if (this.vertexCount === 0) return;

    this.currentColors = new Float32Array(colorAttribute.array as Float32Array);
    this.targetColors = new Float32Array(this.vertexCount * 3);

    for (let i = 0; i < this.vertexCount; i++) {
      this.targetColors[i * 3] = targetColor.r;
      this.targetColors[i * 3 + 1] = targetColor.g;
      this.targetColors[i * 3 + 2] = targetColor.b;
    }

    this.animationProgress = 0;
    this.isAnimating = true;
    this.currentColor = targetColor.clone();
  }

  public paintAtPoint(
    hitPoint: THREE.Vector3,
    mesh: THREE.Mesh,
    colorAttribute: THREE.BufferAttribute,
    strength: number
  ): void {
    if (this.vertexCount === 0) return;

    const positions = mesh.geometry.attributes.position.array as Float32Array;
    const colors = colorAttribute.array as Float32Array;
    const localHit = mesh.worldToLocal(hitPoint.clone());

    for (let i = 0; i < this.vertexCount; i++) {
      const i3 = i * 3;
      const vertex = new THREE.Vector3(
        positions[i3],
        positions[i3 + 1],
        positions[i3 + 2]
      );

      const distance = vertex.distanceTo(localHit);

      if (distance < this.brushRadius) {
        const falloff = 1 - distance / this.brushRadius;
        const smoothFalloff = falloff * falloff * (3 - 2 * falloff);
        const blend = smoothFalloff * strength;

        colors[i3] = colors[i3] * (1 - blend) + this.currentColor.r * blend;
        colors[i3 + 1] = colors[i3 + 1] * (1 - blend) + this.currentColor.g * blend;
        colors[i3 + 2] = colors[i3 + 2] * (1 - blend) + this.currentColor.b * blend;
      }
    }

    colorAttribute.needsUpdate = true;
  }

  public update(deltaTime: number, colorAttribute: THREE.BufferAttribute): boolean {
    if (!this.isAnimating || !this.currentColors || !this.targetColors) {
      return false;
    }

    this.animationProgress += deltaTime * 1000;
    const t = Math.min(1, this.animationProgress / this.animationDuration);
    
    const easeT = this.easeInOutCubic(t);

    const colors = colorAttribute.array as Float32Array;
    for (let i = 0; i < colors.length; i++) {
      colors[i] = this.currentColors[i] + (this.targetColors[i] - this.currentColors[i]) * easeT;
    }

    colorAttribute.needsUpdate = true;

    if (t >= 1) {
      this.isAnimating = false;
      this.currentColors = null;
      this.targetColors = null;
    }

    return true;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public applyColorFlow(
    colorAttribute: THREE.BufferAttribute,
    centerPoint: THREE.Vector3,
    mesh: THREE.Mesh,
    newColor: THREE.Color
  ): void {
    if (this.vertexCount === 0) return;

    const positions = mesh.geometry.attributes.position.array as Float32Array;
    const colors = colorAttribute.array as Float32Array;
    const localCenter = mesh.worldToLocal(centerPoint.clone());

    let maxDist = 0;
    for (let i = 0; i < this.vertexCount; i++) {
      const i3 = i * 3;
      const vertex = new THREE.Vector3(positions[i3], positions[i3 + 1], positions[i3 + 2]);
      const dist = vertex.distanceTo(localCenter);
      maxDist = Math.max(maxDist, dist);
    }

    const tempColors = new Float32Array(colors);
    for (let i = 0; i < this.vertexCount; i++) {
      const i3 = i * 3;
      const vertex = new THREE.Vector3(
        positions[i3],
        positions[i3 + 1],
        positions[i3 + 2]
      );
      const dist = vertex.distanceTo(localCenter);
      const blend = 1 - (dist / maxDist) * 0.5;

      colors[i3] = tempColors[i3] * (1 - blend) + newColor.r * blend;
      colors[i3 + 1] = tempColors[i3 + 1] * (1 - blend) + newColor.g * blend;
      colors[i3 + 2] = tempColors[i3 + 2] * (1 - blend) + newColor.b * blend;
    }

    colorAttribute.needsUpdate = true;
  }

  public resetColors(colorAttribute: THREE.BufferAttribute): void {
    const colors = colorAttribute.array as Float32Array;
    for (let i = 0; i < this.vertexCount; i++) {
      colors[i * 3] = 0.85;
      colors[i * 3 + 1] = 0.75;
      colors[i * 3 + 2] = 0.65;
    }
    colorAttribute.needsUpdate = true;
  }
}
