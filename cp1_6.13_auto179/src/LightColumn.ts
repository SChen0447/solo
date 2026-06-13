import * as THREE from 'three';
import gsap from 'gsap';
import { AudioEngine } from './AudioEngine';

export class LightColumn {
  public group: THREE.Group;
  public columnMesh: THREE.Mesh;
  public topOrb: THREE.Mesh;
  public glowRing: THREE.Mesh | null = null;
  public surroundParticles: THREE.Mesh[] = [];
  public dissolveParticles: THREE.Mesh[] = [];
  public position: THREE.Vector3;
  public radius: number;
  public height: number = 120;
  public color: THREE.Color;
  public topColor: THREE.Color;
  public isDragging: boolean = false;
  public isActive: boolean = true;
  public audioEngine: AudioEngine;
  public noteIndex: number = 0;
  public id: number;

  private columnMaterial: THREE.ShaderMaterial;
  private orbMaterial: THREE.MeshBasicMaterial;
  private orbBaseScale: number = 1;
  private breatheTime: number = 0;
  private surroundAngle: number = 0;
  private hasSurroundParticles: boolean = false;
  private static nextId: number = 0;
  private static colorPaletteIndex: number = 0;

  private static warmColors = [
    { bottom: 0xffaa00, top: 0xff4d4d },
    { bottom: 0xff8800, top: 0xff2200 },
    { bottom: 0xffcc00, top: 0xff6600 },
  ];

  private static coolColors = [
    { bottom: 0x00ccff, top: 0xaa66ff },
    { bottom: 0x00ffaa, top: 0xaaffee },
    { bottom: 0x6688ff, top: 0x9944ff },
  ];

  constructor(position: THREE.Vector3, radius: number, audioEngine: AudioEngine) {
    this.id = LightColumn.nextId++;
    this.position = position.clone();
    this.radius = radius;
    this.audioEngine = audioEngine;

    const palette = this.getNextColorPalette();
    this.color = new THREE.Color(palette.bottom);
    this.topColor = new THREE.Color(palette.top);

    this.group = new THREE.Group();
    this.group.position.copy(this.position);

    this.columnMaterial = this.createColumnMaterial();
    const columnGeo = new THREE.CylinderGeometry(radius, radius * 1.2, this.height, 24, 1, true);
    this.columnMesh = new THREE.Mesh(columnGeo, this.columnMaterial);
    this.columnMesh.position.y = this.height / 2;
    this.group.add(this.columnMesh);

    const orbGeo = new THREE.SphereGeometry(7.5, 32, 32);
    this.orbMaterial = new THREE.MeshBasicMaterial({
      color: this.topColor,
      transparent: true,
      opacity: 0.9,
    });
    this.topOrb = new THREE.Mesh(orbGeo, this.orbMaterial);
    this.topOrb.position.y = this.height;
    this.group.add(this.topOrb);

    this.group.scale.y = 0;
    this.playSpawnAnimation();
  }

  private getNextColorPalette(): { bottom: number; top: number } {
    const index = LightColumn.colorPaletteIndex;
    LightColumn.colorPaletteIndex++;
    const useWarm = index % 2 === 0;
    const paletteArray = useWarm ? LightColumn.warmColors : LightColumn.coolColors;
    return paletteArray[Math.floor(index / 2) % paletteArray.length];
  }

  private createColumnMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        bottomColor: { value: this.color },
        topColor: { value: this.topColor },
        opacity: { value: 0.7 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 bottomColor;
        uniform vec3 topColor;
        uniform float opacity;
        varying vec2 vUv;
        void main() {
          vec3 color = mix(bottomColor, topColor, vUv.y);
          gl_FragColor = vec4(color, opacity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  private playSpawnAnimation(): void {
    gsap.to(this.group.scale, {
      y: 1,
      duration: 0.5,
      ease: 'back.out(1.7)',
    });
  }

  public triggerNote(): void {
    this.audioEngine.playNextNote();
    this.noteIndex = this.audioEngine.getCurrentNoteIndex();
    this.playOrbPulse();
    this.playGlowRing();
  }

  private playOrbPulse(): void {
    const targetScale = 1.5;
    gsap.to(this.topOrb.scale, {
      x: targetScale,
      y: targetScale,
      z: targetScale,
      duration: 0.15,
      ease: 'power2.out',
      onComplete: () => {
        gsap.to(this.topOrb.scale, {
          x: this.orbBaseScale,
          y: this.orbBaseScale,
          z: this.orbBaseScale,
          duration: 0.15,
          ease: 'power2.in',
        });
      },
    });
  }

  private playGlowRing(): void {
    const ringGeo = new THREE.RingGeometry(0, 1, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = this.height * 0.8;
    ring.rotation.x = -Math.PI / 2;
    this.group.add(ring);
    this.glowRing = ring;

    const targetRadius = 80;
    gsap.to(ring.scale, {
      x: targetRadius,
      y: targetRadius,
      z: targetRadius,
      duration: 0.6,
      ease: 'power2.out',
    });
    gsap.to(ringMat, {
      opacity: 0,
      duration: 0.6,
      ease: 'power2.out',
      onComplete: () => {
        this.group.remove(ring);
        ringGeo.dispose();
        ringMat.dispose();
        if (this.glowRing === ring) {
          this.glowRing = null;
        }
      },
    });
  }

  public startDrag(): void {
    this.isDragging = true;
    this.createSurroundParticles();
  }

  public endDrag(): void {
    this.isDragging = false;
    this.removeSurroundParticles();
  }

  private createSurroundParticles(): void {
    if (this.hasSurroundParticles) return;
    this.hasSurroundParticles = true;

    const particleGeo = new THREE.SphereGeometry(1.5, 8, 8);
    for (let i = 0; i < 8; i++) {
      const particleMat = new THREE.MeshBasicMaterial({
        color: this.topColor,
        transparent: true,
        opacity: 0.8,
      });
      const particle = new THREE.Mesh(particleGeo, particleMat);
      const angle = (i / 8) * Math.PI * 2;
      const radius = 20;
      particle.position.set(
        Math.cos(angle) * radius,
        this.height * 0.5,
        Math.sin(angle) * radius
      );
      this.group.add(particle);
      this.surroundParticles.push(particle);
    }
  }

  private removeSurroundParticles(): void {
    this.hasSurroundParticles = false;
    for (const particle of this.surroundParticles) {
      this.group.remove(particle);
      (particle.material as THREE.Material).dispose();
    }
    this.surroundParticles = [];
  }

  public setPosition(x: number, z: number): void {
    this.position.x = x;
    this.position.z = z;
    this.group.position.x = x;
    this.group.position.z = z;
  }

  public update(delta: number, time: number): void {
    if (!this.isActive) return;

    this.breatheTime += delta;
    const breatheScale = 1 + Math.sin(this.breatheTime * (Math.PI * 2 / 1.5)) * 0.1;
    if (this.topOrb.scale.x === this.orbBaseScale || !this.isDragging) {
      this.topOrb.scale.setScalar(breatheScale * this.orbBaseScale);
    }

    if (this.isDragging && this.surroundParticles.length > 0) {
      this.surroundAngle += delta * 2;
      const radius = 20;
      for (let i = 0; i < this.surroundParticles.length; i++) {
        const angle = this.surroundAngle + (i / this.surroundParticles.length) * Math.PI * 2;
        this.surroundParticles[i].position.x = Math.cos(angle) * radius;
        this.surroundParticles[i].position.z = Math.sin(angle) * radius;
      }
    }
  }

  public dissolve(): Promise<void> {
    return new Promise((resolve) => {
      this.isActive = false;

      const particleCount = 20;
      const particleGeo = new THREE.SphereGeometry(2, 8, 8);
      for (let i = 0; i < particleCount; i++) {
        const particleMat = new THREE.MeshBasicMaterial({
          color: this.topColor,
          transparent: true,
          opacity: 0.9,
        });
        const particle = new THREE.Mesh(particleGeo, particleMat);
        particle.position.set(
          (Math.random() - 0.5) * this.radius * 2,
          this.height * (0.5 + Math.random() * 0.5),
          (Math.random() - 0.5) * this.radius * 2
        );
        this.group.add(particle);
        this.dissolveParticles.push(particle);

        const velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 30,
          Math.random() * -40 - 10,
          (Math.random() - 0.5) * 30
        );

        gsap.to(particle.position, {
          x: particle.position.x + velocity.x,
          y: particle.position.y + velocity.y,
          z: particle.position.z + velocity.z,
          duration: 0.8,
          ease: 'power2.in',
        });
        gsap.to(particleMat, {
          opacity: 0,
          duration: 0.8,
          ease: 'power2.in',
        });
      }

      gsap.to(this.columnMesh.material, {
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out',
      });
      gsap.to(this.orbMaterial, {
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out',
      });

      setTimeout(() => {
        for (const p of this.dissolveParticles) {
          this.group.remove(p);
          (p.material as THREE.Material).dispose();
        }
        this.dissolveParticles = [];
        resolve();
      }, 800);
    });
  }

  public dispose(): void {
    this.columnMesh.geometry.dispose();
    this.columnMaterial.dispose();
    this.topOrb.geometry.dispose();
    this.orbMaterial.dispose();
    for (const p of this.surroundParticles) {
      p.geometry.dispose();
      (p.material as THREE.Material).dispose();
    }
    for (const p of this.dissolveParticles) {
      p.geometry.dispose();
      (p.material as THREE.Material).dispose();
    }
  }

  public getTopPosition(): THREE.Vector3 {
    return new THREE.Vector3(
      this.position.x,
      this.position.y + this.height,
      this.position.z
    );
  }

  public getBottomPosition(): THREE.Vector3 {
    return this.position.clone();
  }
}
