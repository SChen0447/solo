import * as THREE from 'three';
import gsap from 'gsap';
import { CrystalFragments } from './particles';

export interface CrystalParams {
  temperature: number;
  growthSpeed: number;
}

type CrystalType = 'hexagonal' | 'rhombohedral' | 'acicular';

export class CrystalCluster {
  public group: THREE.Group;
  public crystals: THREE.Mesh[] = [];
  public glowSprite: THREE.Sprite | null = null;
  private position: THREE.Vector3;
  private normal: THREE.Vector3;
  private fragments: CrystalFragments;
  private audioContext: AudioContext | null = null;

  constructor(position: THREE.Vector3, normal: THREE.Vector3, fragments: CrystalFragments) {
    this.position = position.clone();
    this.normal = normal.clone().normalize();
    this.fragments = fragments;
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.lookAt(position.clone().add(normal));
    this.generateCluster();
    this.createGlowSprite();
  }

  private createGlowSprite(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(180, 200, 255, 0.8)');
    gradient.addColorStop(0.5, 'rgba(120, 150, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(100, 130, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.glowSprite = new THREE.Sprite(material);
    this.glowSprite.scale.set(1.5, 1.5, 1.5);
    this.group.add(this.glowSprite);
  }

  private createHexagonalGeometry(height: number, radius: number): THREE.BufferGeometry {
    return new THREE.CylinderGeometry(radius * 0.6, radius, height, 6, 1, false);
  }

  private createRhombohedralGeometry(size: number): THREE.BufferGeometry {
    const geometry = new THREE.OctahedronGeometry(size, 0);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      positions.setY(i, y * 1.4);
    }
    geometry.computeVertexNormals();
    return geometry;
  }

  private createAcicularGeometry(height: number, radius: number): THREE.BufferGeometry {
    return new THREE.CylinderGeometry(radius * 0.2, radius * 0.5, height, 6, 1, false);
  }

  private generateCluster(): void {
    const crystalCount = 3 + Math.floor(Math.random() * 5);
    const types: CrystalType[] = ['hexagonal', 'rhombohedral', 'acicular'];

    for (let i = 0; i < crystalCount; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const crystal = this.createSingleCrystal(type, i, crystalCount);
      this.crystals.push(crystal);
      this.group.add(crystal);
    }
  }

  private createSingleCrystal(type: CrystalType, index: number, total: number): THREE.Mesh {
    const baseSize = 0.3 + Math.random() * 0.5;
    const height = type === 'acicular' ? baseSize * 3.5 : baseSize * (1.5 + Math.random() * 1);
    const radius = type === 'acicular' ? baseSize * 0.15 : baseSize * 0.4;

    let geometry: THREE.BufferGeometry;
    switch (type) {
      case 'hexagonal':
        geometry = this.createHexagonalGeometry(height, radius);
        break;
      case 'rhombohedral':
        geometry = this.createRhombohedralGeometry(baseSize);
        break;
      case 'acicular':
        geometry = this.createAcicularGeometry(height, radius);
        break;
    }

    const material = new THREE.MeshPhysicalMaterial({
      color: 0x6a8cff,
      transparent: true,
      opacity: 0.75,
      roughness: 0.1,
      metalness: 0.0,
      transmission: 0.6,
      thickness: 0.5,
      envMapIntensity: 1.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      emissive: 0x1a2a5a,
      emissiveIntensity: 0.3
    });

    const mesh = new THREE.Mesh(geometry, material);
    const angleOffset = (index / total) * Math.PI * 2;
    const radialDist = 0.1 + Math.random() * 0.2;
    const upOffset = Math.random() * 0.2;

    mesh.position.set(
      Math.cos(angleOffset) * radialDist,
      upOffset,
      Math.sin(angleOffset) * radialDist
    );

    mesh.rotation.set(
      (Math.random() - 0.5) * 0.4,
      Math.random() * Math.PI,
      (Math.random() - 0.5) * 0.4
    );

    mesh.scale.setScalar(0.01);
    mesh.userData.isCrystal = true;
    mesh.userData.cluster = this;

    return mesh;
  }

  public updateMaterial(params: CrystalParams): void {
    const t = (params.temperature - 100) / 400;
    const coldColor = new THREE.Color(0x4a9eff);
    const hotColor = new THREE.Color(0xb06eff);
    const finalColor = coldColor.clone().lerp(hotColor, t);
    const opacity = 0.5 + t * 0.35;

    this.crystals.forEach((crystal) => {
      const mat = crystal.material as THREE.MeshPhysicalMaterial;
      gsap.to(mat.color, {
        r: finalColor.r,
        g: finalColor.g,
        b: finalColor.b,
        duration: 1.5,
        ease: 'power2.out'
      });
      gsap.to(mat, {
        opacity: opacity,
        duration: 1.5,
        ease: 'power2.out'
      });
      const emissive = finalColor.clone().multiplyScalar(0.25);
      gsap.to(mat.emissive, {
        r: emissive.r,
        g: emissive.g,
        b: emissive.b,
        duration: 1.5,
        ease: 'power2.out'
      });
    });
  }

  public playGrowthAnimation(duration: number): void {
    this.crystals.forEach((crystal, index) => {
      crystal.scale.setScalar(0.01);
      const mat = crystal.material as THREE.MeshPhysicalMaterial;
      mat.opacity = 0;

      const delay = index * 0.1;
      const actualDuration = Math.max(0.3, duration * 0.8);

      gsap.to(crystal.scale, {
        x: 1.2,
        y: 1.2,
        z: 1.2,
        duration: actualDuration * 0.7,
        delay: delay,
        ease: 'back.out(1.7)',
        onComplete: () => {
          gsap.to(crystal.scale, {
            x: 1.0,
            y: 1.0,
            z: 1.0,
            duration: actualDuration * 0.3,
            ease: 'power2.out'
          });
        }
      });

      gsap.to(mat, {
        opacity: 0.75,
        duration: actualDuration,
        delay: delay,
        ease: 'power2.out'
      });
    });
  }

  public playHoverGlow(active: boolean): void {
    if (!this.glowSprite) return;
    gsap.to(this.glowSprite.material, {
      opacity: active ? 1.0 : 0,
      duration: 0.3,
      ease: 'power2.out'
    });
    const targetScale = active ? 2.5 : 1.5;
    gsap.to(this.glowSprite.scale, {
      x: targetScale,
      y: targetScale,
      z: targetScale,
      duration: 0.3,
      ease: 'power2.out'
    });
  }

  public triggerBurst(origin: THREE.Vector3): void {
    this.fragments.spawnBurst(origin, 30);
    this.playBreakSound();

    this.crystals.forEach((crystal) => {
      const mat = crystal.material as THREE.MeshPhysicalMaterial;
      const originalScale = crystal.scale.x;
      gsap.to(crystal.scale, {
        x: originalScale * 0.85,
        y: originalScale * 0.85,
        z: originalScale * 0.85,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: 'power2.out'
      });
      gsap.to(mat, {
        emissiveIntensity: 1.5,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: 'power2.out'
      });
    });
  }

  private playBreakSound(): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = this.audioContext;
      const now = ctx.currentTime;
      const duration = 0.3;

      const oscHigh = ctx.createOscillator();
      oscHigh.type = 'sine';
      oscHigh.frequency.setValueAtTime(1800, now);
      oscHigh.frequency.exponentialRampToValueAtTime(600, now + duration);

      const oscLow = ctx.createOscillator();
      oscLow.type = 'triangle';
      oscLow.frequency.setValueAtTime(300, now);
      oscLow.frequency.exponentialRampToValueAtTime(100, now + duration);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.linearRampToValueAtTime(0.1, now + duration);

      oscHigh.connect(gain);
      oscLow.connect(gain);
      gain.connect(ctx.destination);

      oscHigh.start(now);
      oscLow.start(now);
      oscHigh.stop(now + duration);
      oscLow.stop(now + duration);
    } catch (e) {
      // Audio not available
    }
  }

  public dispose(): void {
    this.crystals.forEach((crystal) => {
      crystal.geometry.dispose();
      (crystal.material as THREE.Material).dispose();
    });
    if (this.glowSprite) {
      (this.glowSprite.material as THREE.Material).dispose();
      if ((this.glowSprite.material as THREE.SpriteMaterial).map) {
        (this.glowSprite.material as THREE.SpriteMaterial).map!.dispose();
      }
    }
    this.crystals = [];
  }
}
