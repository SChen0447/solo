import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem';

export interface Crystal {
  group: THREE.Group;
  mesh: THREE.Mesh;
  edgeMesh: THREE.LineSegments;
  glowMesh: THREE.Mesh;
  baseHue: number;
  currentHue: number;
  targetHue: number;
  hueTransitionTime: number;
  hueTransitionDuration: number;
  baseScale: number;
  scaleAnimationTime: number;
  scaleAnimationDuration: number;
  isLit: boolean;
  litBrightnessMultiplier: number;
  height: number;
}

interface CrystalState {
  hue: number;
  isLit: boolean;
  brightnessMultiplier: number;
}

export type CrystalResonateCallback = (crystal: Crystal, wavelength: number) => void;

export class CrystalArray {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particleSystem: ParticleSystem;
  public crystals: Crystal[] = [];
  public crystalMeshes: THREE.Mesh[] = [];
  private resonateCallback: CrystalResonateCallback | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private isDragging = false;
  private dragStartPos = new THREE.Vector2();
  private currentEnergy = 0.5;

  private readonly GRID_SIZE = 5;
  private readonly SPACING = 1.5;
  private readonly MIN_HEIGHT = 1.5;
  private readonly MAX_HEIGHT = 3.0;
  private readonly PARTICLE_COUNT_BASE = 30;
  private readonly PARTICLE_RADIUS = 4;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    particleSystem: ParticleSystem
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.particleSystem = particleSystem;

    this.createCrystals();
    this.bindEvents();
  }

  private createCrystals(): void {
    const totalCrystals = this.GRID_SIZE * this.GRID_SIZE;
    const offset = ((this.GRID_SIZE - 1) * this.SPACING) / 2;

    for (let i = 0; i < this.GRID_SIZE; i++) {
      for (let j = 0; j < this.GRID_SIZE; j++) {
        const index = i * this.GRID_SIZE + j;
        const hue = (index / totalCrystals) * 360;
        const height = this.MIN_HEIGHT + Math.random() * (this.MAX_HEIGHT - this.MIN_HEIGHT);
        const x = i * this.SPACING - offset;
        const z = j * this.SPACING - offset;

        const crystal = this.createCrystal(hue, height);
        crystal.group.position.set(x, height / 2, z);
        this.scene.add(crystal.group);
        this.crystals.push(crystal);
        this.crystalMeshes.push(crystal.mesh);
      }
    }
  }

  private createCrystal(hue: number, height: number): Crystal {
    const group = new THREE.Group();

    const baseRadius = 0.5;
    const topRadius = 0.15;
    const segments = 6;

    const geometry = new THREE.CylinderGeometry(topRadius, baseRadius, height, segments);
    const color = new THREE.Color().setHSL(hue / 360, 0.85, 0.5);

    const material = new THREE.MeshPhongMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      shininess: 100,
      specular: new THREE.Color(0xffffff),
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    const edgeGeometry = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color().setHSL(hue / 360, 1, 0.7),
      transparent: true,
      opacity: 0.6
    });
    const edgeMesh = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    group.add(edgeMesh);

    const glowGeometry = new THREE.CylinderGeometry(topRadius * 1.05, baseRadius * 1.05, height * 1.02, segments);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glowMesh);

    this.addSurfaceTexture(mesh, hue);

    return {
      group,
      mesh,
      edgeMesh,
      glowMesh,
      baseHue: hue,
      currentHue: hue,
      targetHue: hue,
      hueTransitionTime: 0,
      hueTransitionDuration: 0.5,
      baseScale: 1,
      scaleAnimationTime: 0,
      scaleAnimationDuration: 0.3,
      isLit: false,
      litBrightnessMultiplier: 1.15,
      height
    };
  }

  private addSurfaceTexture(mesh: THREE.Mesh, hue: number): void {
    const material = mesh.material as THREE.MeshPhongMaterial;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 256, 256);
    const hslColor = new THREE.Color().setHSL(hue / 360, 0.85, 0.5);
    gradient.addColorStop(0, `rgba(${hslColor.r * 255},${hslColor.g * 255},${hslColor.b * 255},0.3)`);
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.1)');
    gradient.addColorStop(1, `rgba(${hslColor.r * 255},${hslColor.g * 255},${hslColor.b * 255},0.3)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const size = 2 + Math.random() * 6;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.1})`;
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    material.map = texture;
    material.needsUpdate = true;
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', (e) => {
      this.isDragging = false;
      this.dragStartPos.set(e.clientX, e.clientY);
    });

    canvas.addEventListener('pointermove', (e) => {
      if (this.dragStartPos.distanceTo(new THREE.Vector2(e.clientX, e.clientY)) > 5) {
        this.isDragging = true;
      }
    });

    canvas.addEventListener('pointerup', (e) => {
      const dist = this.dragStartPos.distanceTo(new THREE.Vector2(e.clientX, e.clientY));
      if (dist <= 5) {
        this.handleClick(e);
      }
    });
  }

  private handleClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.crystalMeshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const crystal = this.crystals.find(c => c.mesh === hitMesh);
      if (crystal) {
        this.triggerResonance(crystal);
      }
    }
  }

  private triggerResonance(crystal: Crystal): void {
    const wavelength = 380 + Math.random() * 400;
    const targetHue = this.wavelengthToHue(wavelength);

    crystal.targetHue = targetHue;
    crystal.hueTransitionTime = crystal.hueTransitionDuration;
    crystal.scaleAnimationTime = crystal.scaleAnimationDuration;

    const particleCount = Math.round(
      10 + (this.PARTICLE_COUNT_BASE - 10) * this.currentEnergy * 1.67
    );

    const topPosition = new THREE.Vector3();
    crystal.group.getWorldPosition(topPosition);
    topPosition.y += crystal.height / 2;

    this.particleSystem.emitSoundParticles({
      count: Math.min(particleCount, 50),
      origin: topPosition,
      startHue: crystal.currentHue,
      endHue: (targetHue + 180) % 360,
      radius: this.PARTICLE_RADIUS,
      life: 0.5
    });

    if (this.resonateCallback) {
      this.resonateCallback(crystal, wavelength);
    }
  }

  private wavelengthToHue(wavelength: number): number {
    const clamped = Math.max(380, Math.min(780, wavelength));
    const normalized = (clamped - 380) / 400;
    return normalized * 300;
  }

  hueToWavelength(hue: number): number {
    const normalized = (hue % 360) / 300;
    return 380 + Math.max(0, Math.min(1, normalized)) * 400;
  }

  setEnergy(energy: number): void {
    this.currentEnergy = energy;
  }

  onResonate(callback: CrystalResonateCallback): void {
    this.resonateCallback = callback;
  }

  setLitCrystals(litMeshes: Set<THREE.Mesh>): void {
    for (const crystal of this.crystals) {
      const wasLit = crystal.isLit;
      crystal.isLit = litMeshes.has(crystal.mesh);

      if (crystal.isLit) {
        (crystal.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.3;
      } else if (wasLit && !crystal.isLit) {
        (crystal.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0;
      }
    }
  }

  applyLightColorToLit(hue: number): void {
    for (const crystal of this.crystals) {
      if (crystal.isLit) {
        crystal.targetHue = hue;
        crystal.hueTransitionTime = crystal.hueTransitionDuration;
      }
    }
  }

  update(delta: number): void {
    for (const crystal of this.crystals) {
      this.updateCrystal(crystal, delta);
    }
  }

  private updateCrystal(crystal: Crystal, delta: number): void {
    if (crystal.hueTransitionTime > 0) {
      crystal.hueTransitionTime -= delta;
      const t = 1 - (crystal.hueTransitionTime / crystal.hueTransitionDuration);
      const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      let hueDiff = crystal.targetHue - crystal.currentHue;
      if (hueDiff > 180) hueDiff -= 360;
      if (hueDiff < -180) hueDiff += 360;

      const currentHue = crystal.baseHue + hueDiff * easeT;
      crystal.currentHue = currentHue;

      this.updateCrystalColor(crystal, currentHue);
    } else if (!crystal.isLit) {
      crystal.currentHue = crystal.baseHue;
      this.updateCrystalColor(crystal, crystal.baseHue);
    }

    if (crystal.scaleAnimationTime > 0) {
      crystal.scaleAnimationTime -= delta;
      const t = crystal.scaleAnimationTime / crystal.scaleAnimationDuration;
      const scale = 1 + (1.2 - 1) * (1 - t * t);
      crystal.group.scale.setScalar(scale);
    } else {
      crystal.group.scale.setScalar(1);
    }
  }

  private updateCrystalColor(crystal: Crystal, hue: number): void {
    const state: CrystalState = {
      hue,
      isLit: crystal.isLit,
      brightnessMultiplier: crystal.litBrightnessMultiplier
    };

    const lightness = crystal.isLit ? 0.5 * state.brightnessMultiplier : 0.5;
    const clampedLightness = Math.min(lightness, 0.85);

    const color = new THREE.Color().setHSL(hue / 360, 0.85, clampedLightness);
    (crystal.mesh.material as THREE.MeshPhongMaterial).color.copy(color);

    const edgeColor = new THREE.Color().setHSL(hue / 360, 1, clampedLightness + 0.15);
    (crystal.edgeMesh.material as THREE.LineBasicMaterial).color.copy(edgeColor);

    (crystal.glowMesh.material as THREE.MeshBasicMaterial).color.copy(color);
  }

  dispose(): void {
    for (const crystal of this.crystals) {
      (crystal.mesh.material as THREE.Material).dispose();
      crystal.mesh.geometry.dispose();
      (crystal.edgeMesh.material as THREE.Material).dispose();
      crystal.edgeMesh.geometry.dispose();
      (crystal.glowMesh.material as THREE.Material).dispose();
      crystal.glowMesh.geometry.dispose();
      this.scene.remove(crystal.group);
    }
    this.crystals = [];
    this.crystalMeshes = [];
  }
}
