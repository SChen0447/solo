import * as THREE from 'three';
import { DataPoint } from './dataLoader';

export interface DimensionMapping {
  x: number;
  y: number;
  z: number;
  color: number;
  size: number;
  opacity: number;
}

export interface RenderState {
  mapping: DimensionMapping;
  visibleCategories: Set<string>;
}

interface AnimatedValue {
  current: number;
  target: number;
}

const ANIMATION_DURATION = 0.5;
const MIN_RADIUS = 0.06;
const MAX_RADIUS = 0.18;

export class PointCloudRenderer {
  private scene: THREE.Scene;
  private instancedMesh: THREE.InstancedMesh;
  private glowSprites: THREE.Points;
  private data: DataPoint[] = [];
  private dummy: THREE.Object3D;
  private colorArray: Float32Array;
  private animatedPositions: AnimatedValue[][];
  private animatedScales: AnimatedValue[];
  private animatedOpacities: AnimatedValue[];
  private animatedColors: AnimatedValue[][];
  private currentColors: THREE.Color[];
  private material: THREE.MeshStandardMaterial;
  private spriteMaterial: THREE.PointsMaterial;
  private animationProgress: Map<number, number> = new Map();
  private needsAnimation = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.dummy = new THREE.Object3D();

    const geometry = new THREE.SphereGeometry(1, 16, 12);
    this.material = new THREE.MeshStandardMaterial({
      metalness: 0.3,
      roughness: 0.5,
      transparent: true,
      opacity: 0.9,
      vertexColors: true,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.15
    });

    this.instancedMesh = new THREE.InstancedMesh(geometry, this.material, 200);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instancedMesh.castShadow = false;
    this.instancedMesh.receiveShadow = false;

    this.colorArray = new Float32Array(200 * 3);
    this.instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(this.colorArray, 3);

    this.scene.add(this.instancedMesh);

    const spriteGeom = new THREE.BufferGeometry();
    const spritePositions = new Float32Array(200 * 3);
    const spriteColors = new Float32Array(200 * 3);
    const spriteSizes = new Float32Array(200);
    spriteGeom.setAttribute('position', new THREE.BufferAttribute(spritePositions, 3));
    spriteGeom.setAttribute('color', new THREE.BufferAttribute(spriteColors, 3));
    spriteGeom.setAttribute('size', new THREE.BufferAttribute(spriteSizes, 1));

    this.spriteMaterial = new THREE.PointsMaterial({
      size: 0.3,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.glowSprites = new THREE.Points(spriteGeom, this.spriteMaterial);
    this.scene.add(this.glowSprites);

    this.animatedPositions = Array.from({ length: 200 }, () => [
      { current: 0, target: 0 },
      { current: 0, target: 0 },
      { current: 0, target: 0 }
    ]);
    this.animatedScales = Array.from({ length: 200 }, () => ({ current: MIN_RADIUS, target: MIN_RADIUS }));
    this.animatedOpacities = Array.from({ length: 200 }, () => ({ current: 0.9, target: 0.9 }));
    this.animatedColors = Array.from({ length: 200 }, () => [
      { current: 0.5, target: 0.5 },
      { current: 0.5, target: 0.5 },
      { current: 1.0, target: 1.0 }
    ]);
    this.currentColors = Array.from({ length: 200 }, () => new THREE.Color(0x8888ff));
  }

  setData(data: DataPoint[]): void {
    this.data = data;
    this.animationProgress.clear();
    for (let i = 0; i < data.length; i++) {
      this.animationProgress.set(i, 1);
    }
  }

  updateMapping(state: RenderState): void {
    for (let i = 0; i < this.data.length; i++) {
      const point = this.data[i];
      const dims = point.dimensions;

      const tx = (dims[state.mapping.x] - 0.5) * 4;
      const ty = (dims[state.mapping.y] - 0.5) * 4;
      const tz = (dims[state.mapping.z] - 0.5) * 4;

      this.animatedPositions[i][0].target = tx;
      this.animatedPositions[i][1].target = ty;
      this.animatedPositions[i][2].target = tz;

      const sizeValue = dims[state.mapping.size];
      const targetScale = MIN_RADIUS + sizeValue * (MAX_RADIUS - MIN_RADIUS);
      this.animatedScales[i].target = targetScale;

      const opacityValue = dims[state.mapping.opacity];
      const visible = state.visibleCategories.has(point.category);
      this.animatedOpacities[i].target = visible ? (0.4 + opacityValue * 0.6) : 0.0;

      const colorValue = dims[state.mapping.color];
      const targetColor = this.getColorFromHSL(colorValue);
      this.animatedColors[i][0].target = targetColor.r;
      this.animatedColors[i][1].target = targetColor.g;
      this.animatedColors[i][2].target = targetColor.b;

      this.animationProgress.set(i, 0);
    }
    this.needsAnimation = true;
  }

  getInstanceColor(index: number): THREE.Color {
    return this.currentColors[index];
  }

  getInstancePosition(index: number): THREE.Vector3 {
    const pos = this.animatedPositions[index];
    return new THREE.Vector3(pos[0].current, pos[1].current, pos[2].current);
  }

  getInstanceScale(index: number): number {
    return this.animatedScales[index].current;
  }

  getInstanceOpacity(index: number): number {
    return this.animatedOpacities[index].current;
  }

  update(deltaTime: number): void {
    if (!this.needsAnimation && this.animationProgress.size === 0) {
      return;
    }

    let anyAnimating = false;
    const spritePos = this.glowSprites.geometry.attributes.position.array as Float32Array;
    const spriteCol = this.glowSprites.geometry.attributes.color.array as Float32Array;
    const spriteSize = this.glowSprites.geometry.attributes.size.array as Float32Array;

    for (let i = 0; i < this.data.length; i++) {
      const progress = this.animationProgress.get(i) ?? 1;

      if (progress < 1) {
        const eased = this.easeInOutCubic(Math.min(1, progress + deltaTime / ANIMATION_DURATION));
        this.animationProgress.set(i, eased);
        anyAnimating = true;

        for (let axis = 0; axis < 3; axis++) {
          this.animatedPositions[i][axis].current = this.lerp(
            this.animatedPositions[i][axis].current,
            this.animatedPositions[i][axis].target,
            this.easeInOutCubic(Math.min(1, (progress + deltaTime / ANIMATION_DURATION)))
          );
        }

        this.animatedScales[i].current = this.lerp(
          this.animatedScales[i].current,
          this.animatedScales[i].target,
          eased
        );

        this.animatedOpacities[i].current = this.lerp(
          this.animatedOpacities[i].current,
          this.animatedOpacities[i].target,
          eased
        );

        for (let c = 0; c < 3; c++) {
          this.animatedColors[i][c].current = this.lerp(
            this.animatedColors[i][c].current,
            this.animatedColors[i][c].target,
            eased
          );
        }
      }

      this.dummy.position.set(
        this.animatedPositions[i][0].current,
        this.animatedPositions[i][1].current,
        this.animatedPositions[i][2].current
      );
      const s = this.animatedScales[i].current;
      this.dummy.scale.set(s, s, s);
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);

      const r = this.animatedColors[i][0].current;
      const g = this.animatedColors[i][1].current;
      const b = this.animatedColors[i][2].current;
      this.colorArray[i * 3] = r;
      this.colorArray[i * 3 + 1] = g;
      this.colorArray[i * 3 + 2] = b;

      this.currentColors[i].setRGB(r, g, b);

      spritePos[i * 3] = this.dummy.position.x;
      spritePos[i * 3 + 1] = this.dummy.position.y;
      spritePos[i * 3 + 2] = this.dummy.position.z;

      spriteCol[i * 3] = r;
      spriteCol[i * 3 + 1] = g;
      spriteCol[i * 3 + 2] = b;

      spriteSize[i] = s * 4;
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    this.instancedMesh.instanceColor!.needsUpdate = true;
    this.glowSprites.geometry.attributes.position.needsUpdate = true;
    this.glowSprites.geometry.attributes.color.needsUpdate = true;
    this.glowSprites.geometry.attributes.size.needsUpdate = true;

    this.needsAnimation = anyAnimating;
  }

  private getColorFromHSL(t: number): { r: number; g: number; b: number } {
    const hue = 270 - t * 230;
    const color = new THREE.Color();
    color.setHSL(hue / 360, 0.75, 0.55);
    return { r: color.r, g: color.g, b: color.b };
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  getMesh(): THREE.InstancedMesh {
    return this.instancedMesh;
  }

  dispose(): void {
    this.instancedMesh.geometry.dispose();
    (this.instancedMesh.material as THREE.Material).dispose();
    this.glowSprites.geometry.dispose();
    this.glowSprites.material.dispose();
    this.scene.remove(this.instancedMesh);
    this.scene.remove(this.glowSprites);
  }
}
