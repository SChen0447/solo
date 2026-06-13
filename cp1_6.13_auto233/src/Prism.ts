import * as THREE from 'three';
import gsap from 'gsap';
import { Beam } from './Beam';

export const COLOR_PALETTE = [
  0xff6b6b, 0x48dbfb, 0xfeca57, 0xff9ff3,
  0x54a0ff, 0xa29bfe, 0xf368e0, 0x00d2d3,
];

export class Prism {
  public group: THREE.Group;
  public mesh: THREE.Mesh;
  public beams: Beam[] = [];
  private baseColor: THREE.Color;
  private basePosition: THREE.Vector3;
  private floatAmplitude: number = 0.2;
  private floatPeriod: number;
  private floatPhase: number;
  private isHovered: boolean = false;
  private emissiveTween: gsap.core.Tween | null = null;
  private scaleTween: gsap.core.Tween | null = null;
  private whiteFlashTween: gsap.core.Tween | null = null;

  private static sharedGeometry: THREE.TetrahedronGeometry | null = null;
  private static sharedMaterial: THREE.MeshPhysicalMaterial | null = null;

  constructor(
    position: THREE.Vector3,
    colorIndex: number,
    sharedBeamMaterial?: THREE.MeshBasicMaterial
  ) {
    this.basePosition = position.clone();
    this.baseColor = new THREE.Color(COLOR_PALETTE[colorIndex % COLOR_PALETTE.length]);
    this.floatPeriod = 1.5 + Math.random() * 1.5;
    this.floatPhase = Math.random() * Math.PI * 2;

    this.group = new THREE.Group();
    this.group.position.copy(position);

    if (!Prism.sharedGeometry) {
      Prism.sharedGeometry = new THREE.TetrahedronGeometry(0.2, 0);
    }

    if (!Prism.sharedMaterial) {
      Prism.sharedMaterial = new THREE.MeshPhysicalMaterial({
        roughness: 0.1,
        metalness: 0.0,
        transmission: 0.9,
        transparent: true,
        opacity: 0.9,
        thickness: 0.5,
        ior: 1.5,
        clearcoat: 0.8,
        clearcoatRoughness: 0.1,
        emissive: new THREE.Color(0x000000),
        emissiveIntensity: 0,
      });
    }

    this.mesh = new THREE.Mesh(Prism.sharedGeometry, Prism.sharedMaterial.clone());
    (this.mesh.material as THREE.MeshPhysicalMaterial).color.copy(this.baseColor);
    (this.mesh.material as THREE.MeshPhysicalMaterial).emissive.copy(this.baseColor);
    (this.mesh.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.1;

    this.mesh.scale.setScalar(1);
    this.mesh.userData.prism = this;
    this.group.add(this.mesh);

    this.createBeams(sharedBeamMaterial);
  }

  private createBeams(sharedBeamMaterial?: THREE.MeshBasicMaterial): void {
    const geom = Prism.sharedGeometry!;
    const positions = geom.attributes.position;
    const vertexSet = new Set<string>();
    const vertices: THREE.Vector3[] = [];

    for (let i = 0; i < positions.count; i++) {
      const v = new THREE.Vector3(
        positions.getX(i),
        positions.getY(i),
        positions.getZ(i)
      );
      const key = `${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`;
      if (!vertexSet.has(key)) {
        vertexSet.add(key);
        vertices.push(v);
      }
    }

    const pickedVertices = vertices.slice(0, 3);

    pickedVertices.forEach((vertex) => {
      const worldVertex = vertex.clone();
      const direction = worldVertex.clone().normalize();
      const beam = new Beam(
        worldVertex.multiplyScalar(1.2).add(this.basePosition),
        direction,
        this.baseColor,
        sharedBeamMaterial
      );
      this.group.add(beam.mesh);
      this.beams.push(beam);
    });
  }

  public update(deltaTime: number, elapsedTime: number): void {
    const float = Math.sin(elapsedTime * (2 * Math.PI / this.floatPeriod) + this.floatPhase);
    const targetY = this.basePosition.y + float * this.floatAmplitude;
    this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, targetY, 0.1);

    this.mesh.rotation.y += deltaTime * 0.3;
    this.mesh.rotation.x += deltaTime * 0.15;

    this.beams.forEach((beam) => beam.update(deltaTime, elapsedTime));
  }

  public setHovered(hovered: boolean): void {
    if (this.isHovered === hovered) return;
    this.isHovered = hovered;

    if (this.emissiveTween) {
      this.emissiveTween.kill();
      this.emissiveTween = null;
    }
    if (this.scaleTween) {
      this.scaleTween.kill();
      this.scaleTween = null;
    }

    const mat = this.mesh.material as THREE.MeshPhysicalMaterial;
    const targetScale = hovered ? 1.2 : 1.0;
    const targetEmissive = hovered ? 0.5 : 0.1;

    const scaleObj = { value: this.mesh.scale.x };
    this.scaleTween = gsap.to(scaleObj, {
      value: targetScale,
      duration: 0.3,
      ease: 'back.out(1.7)',
      onUpdate: () => {
        this.mesh.scale.setScalar(scaleObj.value);
      },
    });

    const emissiveObj = { intensity: mat.emissiveIntensity };
    this.emissiveTween = gsap.to(emissiveObj, {
      intensity: targetEmissive,
      duration: 0.3,
      ease: 'power2.out',
      onUpdate: () => {
        mat.emissiveIntensity = emissiveObj.intensity;
      },
    });

    this.beams.forEach((beam) => beam.setHovered(hovered));
  }

  public triggerLightPulse(): void {
    const mat = this.mesh.material as THREE.MeshPhysicalMaterial;
    const originalColor = this.baseColor.clone();

    if (this.whiteFlashTween) {
      this.whiteFlashTween.kill();
      this.whiteFlashTween = null;
    }

    const flash = { t: 0 };
    this.whiteFlashTween = gsap.to(flash, {
      t: 1,
      duration: 0.2,
      ease: 'power2.out',
      onUpdate: () => {
        mat.color.lerpColors(originalColor, new THREE.Color(0xffffff), flash.t);
        mat.emissive.lerpColors(originalColor, new THREE.Color(0xffffff), flash.t);
      },
      onComplete: () => {
        const newColorIdx = Math.floor(Math.random() * COLOR_PALETTE.length);
        this.baseColor = new THREE.Color(COLOR_PALETTE[newColorIdx]);
        mat.color.copy(this.baseColor);
        mat.emissive.copy(this.baseColor);
        this.beams.forEach((beam) => beam.updateColor(this.baseColor));
      },
    });

    this.beams.forEach((beam) => beam.triggerPulseBurst());
  }

  public dispose(): void {
    if (this.emissiveTween) this.emissiveTween.kill();
    if (this.scaleTween) this.scaleTween.kill();
    if (this.whiteFlashTween) this.whiteFlashTween.kill();
    this.beams.forEach((beam) => beam.dispose());
    (this.mesh.material as THREE.Material).dispose();
  }

  public static disposeSharedResources(): void {
    if (Prism.sharedGeometry) {
      Prism.sharedGeometry.dispose();
      Prism.sharedGeometry = null;
    }
    if (Prism.sharedMaterial) {
      Prism.sharedMaterial.dispose();
      Prism.sharedMaterial = null;
    }
  }
}
