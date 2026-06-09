import * as THREE from 'three';
import { World } from './world';

export class Book {
  private world: World;
  private id: number;
  private group!: THREE.Group;
  private clickableMesh!: THREE.Mesh;
  private runeParticles!: THREE.Points;
  private runeCount: number;
  private basePositions!: Float32Array;
  private baseAngles!: Float32Array;
  private baseRadii!: Float32Array;
  private explodeParticles: THREE.Points | null = null;
  private isExploding: boolean = false;
  private explodeTime: number = 0;
  private explodeDuration: number = 1.5;
  private explodeVelocities: Float32Array | null = null;

  private isHovered: boolean = false;
  private hoverScale: number = 1;
  private targetHoverScale: number = 1;
  private hoverTiltX: number = 0;
  private hoverTiltZ: number = 0;
  private targetTiltX: number = 0;
  private targetTiltZ: number = 0;

  private baseAngle: number;
  private baseRadius: number;
  private baseHeight: number;
  private floatPhase: number;

  private hasAwakened: boolean = false;
  private runePulsePhase: number = 0;
  private baseRuneColor: THREE.Color;
  private hoverRuneColor: THREE.Color;

  private audioContext: AudioContext | null = null;

  constructor(world: World, id: number, angle: number, radius: number, height: number) {
    this.world = world;
    this.id = id;
    this.baseAngle = angle;
    this.baseRadius = radius;
    this.baseHeight = height;
    this.floatPhase = Math.random() * Math.PI * 2;
    this.runeCount = 80 + Math.floor(Math.random() * 41);
    this.baseRuneColor = new THREE.Color(0xffaa00);
    this.hoverRuneColor = new THREE.Color(0xffdd44);

    this.group = new THREE.Group();
    this.basePositions = new Float32Array(this.runeCount * 3);
    this.baseAngles = new Float32Array(this.runeCount);
    this.baseRadii = new Float32Array(this.runeCount);

    this.createBookMesh();
    this.createRuneParticles();
    this.setInitialPosition();

    this.world.scene.add(this.group);
  }

  private createBookMesh(): void {
    const bookWidth = 0.6;
    const bookHeight = 0.8;
    const bookDepth = 0.08;

    const coverGeo = new THREE.BoxGeometry(bookWidth, bookHeight, bookDepth);
    const coverMat = new THREE.MeshStandardMaterial({
      color: 0x2a1a0a,
      roughness: 0.85,
      metalness: 0.15
    });

    const leftCover = new THREE.Mesh(coverGeo, coverMat);
    leftCover.position.x = -bookWidth / 4;
    leftCover.rotation.y = 0.25;
    leftCover.castShadow = true;
    leftCover.receiveShadow = true;
    this.group.add(leftCover);

    const rightCover = new THREE.Mesh(coverGeo, coverMat);
    rightCover.position.x = bookWidth / 4;
    rightCover.rotation.y = -0.25;
    rightCover.castShadow = true;
    rightCover.receiveShadow = true;
    this.group.add(rightCover);

    const pagesGeo = new THREE.BoxGeometry(bookWidth * 0.92, bookHeight * 0.9, bookDepth * 0.6);
    const pagesMat = new THREE.MeshStandardMaterial({
      color: 0xf5e6c8,
      roughness: 0.95,
      metalness: 0.0
    });
    const pages = new THREE.Mesh(pagesGeo, pagesMat);
    pages.castShadow = true;
    pages.receiveShadow = true;
    this.group.add(pages);

    const spineGeo = new THREE.BoxGeometry(bookDepth * 0.8, bookHeight, bookDepth * 1.2);
    const spineMat = new THREE.MeshStandardMaterial({
      color: 0x3d2817,
      roughness: 0.8,
      metalness: 0.2
    });
    const spine = new THREE.Mesh(spineGeo, spineMat);
    spine.castShadow = true;
    spine.receiveShadow = true;
    this.group.add(spine);

    const clickGeo = new THREE.BoxGeometry(bookWidth * 1.2, bookHeight * 1.1, bookDepth * 3);
    const clickMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    });
    this.clickableMesh = new THREE.Mesh(clickGeo, clickMat);
    this.clickableMesh.userData.isBook = true;
    this.clickableMesh.userData.bookId = this.id;
    this.group.add(this.clickableMesh);
  }

  private createRuneParticles(): void {
    const positions = new Float32Array(this.runeCount * 3);
    const colors = new Float32Array(this.runeCount * 3);

    for (let i = 0; i < this.runeCount; i++) {
      const x = (Math.random() - 0.5) * 0.45;
      const y = (Math.random() - 0.5) * 0.65;
      const z = 0.05;
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.01 + Math.random() * 0.04;

      this.basePositions[i * 3] = x;
      this.basePositions[i * 3 + 1] = y;
      this.basePositions[i * 3 + 2] = z;
      this.baseAngles[i] = angle;
      this.baseRadii[i] = radius;

      positions[i * 3] = x + Math.cos(angle) * radius;
      positions[i * 3 + 1] = y + Math.sin(angle) * radius;
      positions[i * 3 + 2] = z;

      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.67;
      colors[i * 3 + 2] = 0.0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false
    });

    this.runeParticles = new THREE.Points(geo, mat);
    this.group.add(this.runeParticles);
  }

  private setInitialPosition(): void {
    const x = Math.cos(this.baseAngle) * this.baseRadius;
    const z = Math.sin(this.baseAngle) * this.baseRadius;
    this.group.position.set(x, this.baseHeight, z);
    this.group.rotation.y = -this.baseAngle + Math.PI / 2;
    this.group.rotation.x = 0.05;
  }

  public getClickableObject(): THREE.Mesh {
    return this.clickableMesh;
  }

  public getId(): number {
    return this.id;
  }

  public isAwakened(): boolean {
    return this.hasAwakened;
  }

  public getWorldPosition(): THREE.Vector3 {
    return this.group.position.clone();
  }

  public setHovered(hovered: boolean): void {
    if (this.isHovered === hovered) return;
    this.isHovered = hovered;
    this.targetHoverScale = hovered ? 1.2 : 1.0;

    if (hovered) {
      this.targetTiltX = 0.12;
      this.targetTiltZ = 0.08;
      const lookAtPos = new THREE.Vector3(0, this.baseHeight + 0.5, 0);
      const camPos = this.group.position.clone();
      camPos.y += 0.5;
      const toCam = camPos.clone().sub(new THREE.Vector3(0, 1, 0)).normalize();
      const newCamPos = this.group.position.clone().add(toCam.multiplyScalar(3));
      newCamPos.y += 1;
      this.world.tweenCameraTo(newCamPos, this.group.position.clone());
    } else {
      this.targetTiltX = 0;
      this.targetTiltZ = 0;
    }
  }

  public handleClick(): void {
    if (this.hasAwakened) {
      this.world.spiritManager.flashSpirit(this.id);
      return;
    }

    this.triggerRuneExplosion();
    this.playBellSound();

    setTimeout(() => {
      this.hasAwakened = true;
      this.world.spiritManager.createSpirit(this.id, this.getWorldPosition());
      this.world.updateCounter();
    }, 500);
  }

  private triggerRuneExplosion(): void {
    this.isExploding = true;
    this.explodeTime = 0;

    const explodeCount = 300;
    const positions = new Float32Array(explodeCount * 3);
    const colors = new Float32Array(explodeCount * 3);
    this.explodeVelocities = new Float32Array(explodeCount * 3);

    for (let i = 0; i < explodeCount; i++) {
      const idx = Math.floor(Math.random() * this.runeCount);
      const bx = this.basePositions[idx * 3];
      const by = this.basePositions[idx * 3 + 1];
      const bz = this.basePositions[idx * 3 + 2];

      positions[i * 3] = bx;
      positions[i * 3 + 1] = by;
      positions[i * 3 + 2] = bz;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 1.5 + Math.random() * 2.5;
      this.explodeVelocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      this.explodeVelocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed + 1;
      this.explodeVelocities[i * 3 + 2] = Math.cos(phi) * speed;

      const colorT = Math.random();
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.85 - colorT * 0.2;
      colors[i * 3 + 2] = 0.1 + colorT * 0.3;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false
    });

    this.explodeParticles = new THREE.Points(geo, mat);
    this.group.add(this.explodeParticles);

    (this.runeParticles.material as THREE.PointsMaterial).opacity = 0;
  }

  private playBellSound(): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = this.audioContext;

      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const osc3 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc3.type = 'triangle';
      osc1.frequency.value = 1046.5;
      osc2.frequency.value = 1318.5;
      osc3.frequency.value = 1568.0;

      filter.type = 'lowpass';
      filter.frequency.value = 4000;
      filter.Q.value = 2;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

      osc1.connect(filter);
      osc2.connect(filter);
      osc3.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc3.start(now);
      osc1.stop(now + 2.0);
      osc2.stop(now + 2.0);
      osc3.stop(now + 2.0);
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }

  public update(elapsed: number, delta: number): void {
    const floatY = Math.sin(elapsed * 1.2 + this.floatPhase) * 0.08;
    this.group.position.y = this.baseHeight + floatY;
    this.group.rotation.z = Math.sin(elapsed * 0.8 + this.floatPhase) * 0.03;

    this.hoverScale += (this.targetHoverScale - this.hoverScale) * Math.min(delta * 8, 1);
    this.group.scale.setScalar(this.hoverScale);

    this.hoverTiltX += (this.targetTiltX - this.hoverTiltX) * Math.min(delta * 6, 1);
    this.hoverTiltZ += (this.targetTiltZ - this.hoverTiltZ) * Math.min(delta * 6, 1);
    this.group.rotation.x = 0.05 + this.hoverTiltX;

    this.runePulsePhase += delta * (this.isHovered ? 6 : 3);

    if (!this.isExploding || this.explodeTime < this.explodeDuration * 0.3) {
      const positions = this.runeParticles.geometry.attributes.position as THREE.BufferAttribute;
      const colors = this.runeParticles.geometry.attributes.color as THREE.BufferAttribute;
      const pulseSpeed = this.isHovered ? 2 : 1;
      const colorT = (Math.sin(this.runePulsePhase) + 1) / 2;

      for (let i = 0; i < this.runeCount; i++) {
        const bx = this.basePositions[i * 3];
        const by = this.basePositions[i * 3 + 1];
        const bz = this.basePositions[i * 3 + 2];
        const angle = this.baseAngles[i] + this.runePulsePhase * 0.5 + i * 0.1;
        const radius = this.baseRadii[i] * (1 + Math.sin(this.runePulsePhase * pulseSpeed + i) * 0.3);

        positions.setX(i, bx + Math.cos(angle) * radius);
        positions.setY(i, by + Math.sin(angle) * radius);
        positions.setZ(i, bz + Math.sin(this.runePulsePhase * pulseSpeed * 0.5 + i * 0.2) * 0.01);

        if (this.isHovered) {
          colors.setX(i, 1.0);
          colors.setY(i, 0.8 + colorT * 0.07);
          colors.setZ(i, 0.27);
        } else {
          colors.setX(i, 1.0);
          colors.setY(i, 0.57 + colorT * 0.1);
          colors.setZ(i, 0.0);
        }
      }
      positions.needsUpdate = true;
      colors.needsUpdate = true;
    }

    if (this.isExploding && this.explodeParticles && this.explodeVelocities) {
      this.explodeTime += delta;
      const t = this.explodeTime / this.explodeDuration;

      const positions = this.explodeParticles.geometry.attributes.position as THREE.BufferAttribute;
      const mat = this.explodeParticles.material as THREE.PointsMaterial;

      for (let i = 0; i < 300; i++) {
        positions.setX(i, positions.getX(i) + this.explodeVelocities[i * 3] * delta);
        positions.setY(i, positions.getY(i) + this.explodeVelocities[i * 3 + 1] * delta);
        positions.setZ(i, positions.getZ(i) + this.explodeVelocities[i * 3 + 2] * delta);

        this.explodeVelocities[i * 3 + 1] -= delta * 2;
      }
      positions.needsUpdate = true;

      mat.opacity = Math.max(0, 1 - t);
      mat.size = 0.05 * (1 - t * 0.5);

      if (this.explodeTime >= this.explodeDuration) {
        this.group.remove(this.explodeParticles);
        this.explodeParticles.geometry.dispose();
        (this.explodeParticles.material as THREE.Material).dispose();
        this.explodeParticles = null;
        this.explodeVelocities = null;
        this.isExploding = false;
      }
    }
  }
}
