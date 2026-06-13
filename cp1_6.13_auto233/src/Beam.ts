import * as THREE from 'three';
import gsap from 'gsap';

export class Beam {
  public mesh: THREE.Mesh;
  private baseLength: number = 3;
  private currentLength: number = 3;
  private pulseMin: number = 2.5;
  private pulseMax: number = 3.5;
  private pulsePeriod: number;
  private pulsePhase: number;
  private baseColor: THREE.Color;
  private geometry: THREE.CylinderGeometry;
  private material: THREE.MeshBasicMaterial;
  private isHovered: boolean = false;
  private flashTween: gsap.core.Tween | null = null;

  constructor(
    startPoint: THREE.Vector3,
    direction: THREE.Vector3,
    color: THREE.Color,
    sharedMaterial?: THREE.MeshBasicMaterial
  ) {
    this.baseColor = color.clone();
    this.pulsePeriod = 1 + Math.random() * 1;
    this.pulsePhase = Math.random() * Math.PI * 2;

    this.geometry = new THREE.CylinderGeometry(0.005, 0.01, this.baseLength, 8, 1, true);
    this.geometry.translate(0, this.baseLength / 2, 0);

    if (sharedMaterial) {
      this.material = sharedMaterial.clone();
    } else {
      this.material = new THREE.MeshBasicMaterial({
        color: this.baseColor,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
    }

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.copy(startPoint);

    const up = new THREE.Vector3(0, 1, 0);
    const dirNorm = direction.clone().normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dirNorm);
    this.mesh.quaternion.copy(quaternion);

    this.setupOpacityGradient();
  }

  private setupOpacityGradient(): void {
    const colors = new Float32Array(this.geometry.attributes.position.count * 3);
    const color = new THREE.Color();
    const positions = this.geometry.attributes.position;
    const topY = this.baseLength;

    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const t = THREE.MathUtils.clamp(y / topY, 0, 1);
      color.copy(this.baseColor);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('position', positions);
  }

  public update(deltaTime: number, elapsedTime: number): void {
    const pulse = Math.sin(elapsedTime * (2 * Math.PI / this.pulsePeriod) + this.pulsePhase);
    const targetLength = this.baseLength + (pulse * 0.5);
    this.currentLength = THREE.MathUtils.lerp(this.currentLength, targetLength, 0.1);

    const scale = this.currentLength / this.baseLength;
    this.mesh.scale.set(1, scale, 1);

    const fadeT = 0.3 + 0.7 * (1 - Math.abs(pulse));
    this.material.opacity = this.isHovered ? 1.0 : (0.6 + 0.3 * fadeT);
  }

  public setHovered(hovered: boolean): void {
    this.isHovered = hovered;

    if (this.flashTween) {
      this.flashTween.kill();
      this.flashTween = null;
    }

    if (hovered) {
      this.material.color.setHex(0xffffff);
      this.startFlashAnimation();
    } else {
      this.material.color.copy(this.baseColor);
    }
  }

  private startFlashAnimation(): void {
    const flash = { intensity: 0 };
    this.flashTween = gsap.to(flash, {
      intensity: 1,
      duration: 0.3,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      onUpdate: () => {
        this.material.opacity = 0.7 + flash.intensity * 0.3;
      },
    });
  }

  public triggerPulseBurst(): void {
    const burstScale = { value: 1 };
    const originalBaseLength = this.baseLength;

    gsap.to(burstScale, {
      value: 6 / originalBaseLength,
      duration: 0.15,
      ease: 'power2.out',
      onUpdate: () => {
        this.mesh.scale.set(1, burstScale.value, 1);
      },
      onComplete: () => {
        gsap.to(burstScale, {
          value: 1,
          duration: 0.6,
          ease: 'elastic.out(1.2, 0.5)',
          onUpdate: () => {
            this.mesh.scale.set(1, burstScale.value, 1);
          },
        });
      },
    });
  }

  public updateColor(newColor: THREE.Color): void {
    this.baseColor.copy(newColor);
    if (!this.isHovered) {
      this.material.color.copy(newColor);
    }
  }

  public dispose(): void {
    if (this.flashTween) {
      this.flashTween.kill();
    }
    this.geometry.dispose();
    this.material.dispose();
  }
}
