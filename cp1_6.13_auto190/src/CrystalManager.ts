import * as THREE from 'three';
import gsap from 'gsap';
import { GardenGenerator, CrystalData, COLOR_PALETTE } from './GardenGenerator';
import { ParticleSystem } from './ParticleSystem';

export class CrystalManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private gardenGenerator: GardenGenerator;
  private particleSystem: ParticleSystem;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private isDragging: boolean = false;
  private dragStartTime: number = 0;
  private lastSpawnTime: number = 0;
  private lastDragPosition: THREE.Vector3 | null = null;
  private readonly SPAWN_INTERVAL: number = 0.3;

  private crystalsToDecay: Set<number> = new Set();

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    gardenGenerator: GardenGenerator,
    particleSystem: ParticleSystem
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.gardenGenerator = gardenGenerator;
    this.particleSystem = particleSystem;
    this.setupEventListeners();
    this.animateInitialCrystals();
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    canvas.addEventListener('pointermove', this.onPointerMove.bind(this));
    canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
    canvas.addEventListener('pointerleave', this.onPointerUp.bind(this));
  }

  private onPointerDown(event: PointerEvent): void {
    this.updateMouse(event);
    this.isDragging = true;
    this.dragStartTime = performance.now() / 1000;
    this.lastSpawnTime = 0;
    this.lastDragPosition = this.getGroundIntersection();
  }

  private onPointerMove(event: PointerEvent): void {
    this.updateMouse(event);

    if (this.isDragging) {
      const currentTime = performance.now() / 1000;
      const groundPoint = this.getGroundIntersection();

      if (groundPoint && currentTime - this.lastSpawnTime >= this.SPAWN_INTERVAL) {
        this.spawnDraggedCrystal(groundPoint);
        this.lastSpawnTime = currentTime;
        this.particleSystem.triggerWave();
      }

      this.lastDragPosition = groundPoint;
    }
  }

  private onPointerUp(event: PointerEvent): void {
    if (!this.isDragging) return;

    const dragDuration = performance.now() / 1000 - this.dragStartTime;
    this.isDragging = false;

    if (dragDuration < 0.2) {
      this.handleClick(event);
    }

    this.lastDragPosition = null;
  }

  private updateMouse(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getGroundIntersection(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.gardenGenerator.ground);
    if (intersects.length > 0) {
      const localPoint = intersects[0].point.clone();
      this.gardenGenerator.gardenGroup.worldToLocal(localPoint);
      const dist = Math.sqrt(localPoint.x ** 2 + localPoint.z ** 2);
      if (dist < this.gardenGenerator.groundRadius * 0.9) {
        return localPoint;
      }
    }
    return null;
  }

  private getClickedCrystal(): CrystalData | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const crystalMeshes: THREE.Object3D[] = [];
    for (const crystal of this.gardenGenerator.crystals.values()) {
      if (!crystal.isDecaying) {
        crystalMeshes.push(crystal.mesh);
      }
    }

    const intersects = this.raycaster.intersectObjects(crystalMeshes, true);
    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && obj.parent !== this.gardenGenerator.gardenGroup) {
        obj = obj.parent;
      }
      if (obj) {
        for (const crystal of this.gardenGenerator.crystals.values()) {
          if (crystal.mesh === obj) {
            return crystal;
          }
        }
      }
    }

    return null;
  }

  private handleClick(event: PointerEvent): void {
    const crystal = this.getClickedCrystal();
    if (crystal) {
      this.pulseCrystal(crystal);
    }
  }

  private animateInitialCrystals(): void {
    const crystals = Array.from(this.gardenGenerator.crystals.values());
    crystals.forEach((crystal, index) => {
      setTimeout(() => {
        this.animateSpawn(crystal);
      }, index * 80);
    });
  }

  public animateSpawn(crystal: CrystalData): void {
    const mesh = crystal.mesh;
    mesh.scale.set(0.01, 0.01, 0.01);
    const originalY = mesh.position.y + 20;
    mesh.position.y = originalY - 40;
    crystal.originalScale.set(1, 1, 1);

    gsap.to(mesh.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.5,
      ease: 'elastic.out(1.2, 0.5)'
    });

    gsap.to(mesh.position, {
      y: originalY,
      duration: 0.5,
      ease: 'bounce.out'
    });
  }

  private spawnDraggedCrystal(groundPoint: THREE.Vector3): void {
    const colorHex = this.gardenGenerator.getRandomColor();
    const height = (30 + Math.random() * 50) * 0.6;
    const radius = (15 + Math.random() * 10) * 0.5;

    const crystal = this.gardenGenerator.createCrystal(
      groundPoint.clone(),
      height,
      radius,
      colorHex,
      2,
      false
    );

    if (crystal) {
      this.animateSpawn(crystal);
      this.particleSystem.createSpawnSparkles(groundPoint.clone(), colorHex, 8);
    }
  }

  private pulseCrystal(crystal: CrystalData): void {
    const mesh = crystal.mesh;
    const originalScale = crystal.originalScale.clone();

    gsap.to(mesh.scale, {
      x: originalScale.x * 1.3,
      y: originalScale.y * 1.3,
      z: originalScale.z * 1.3,
      duration: 0.1,
      ease: 'power2.out',
      onComplete: () => {
        gsap.to(mesh.scale, {
          x: originalScale.x,
          y: originalScale.y,
          z: originalScale.z,
          duration: 0.1,
          ease: 'power2.in',
          onComplete: () => {
            this.splitCrystal(crystal);
          }
        });
      }
    });
  }

  private splitCrystal(parent: CrystalData): void {
    this.particleSystem.triggerSpeedBoost();

    const childCount = 3 + Math.floor(Math.random() * 3);
    const parentWorldPos = new THREE.Vector3();
    parent.mesh.getWorldPosition(parentWorldPos);
    this.gardenGenerator.gardenGroup.worldToLocal(parentWorldPos);

    this.particleSystem.createSplitRipple(parentWorldPos.clone(), `#${parent.baseColor.getHexString()}`);

    for (let i = 0; i < childCount; i++) {
      setTimeout(() => {
        const sizeRatio = 0.25 + Math.random() * 0.15;
        const childHeight = parent.height * sizeRatio;
        const childRadius = parent.radius * sizeRatio;

        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const shellRadius = 50 + Math.random() * 70;

        const offset = new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * shellRadius,
          Math.abs(Math.cos(phi)) * shellRadius * 0.5,
          Math.sin(phi) * Math.sin(theta) * shellRadius
        );

        const childPos = parentWorldPos.clone().add(offset);
        childPos.y = Math.max(childPos.y - childHeight / 2, -10);

        const parentColorHex = `#${parent.baseColor.getHexString()}`;
        const colorIndex = COLOR_PALETTE.indexOf(parentColorHex);
        let childColor: string;
        if (colorIndex >= 0 && Math.random() < 0.6) {
          const shift = Math.random() < 0.5 ? -1 : 1;
          const newIndex = (colorIndex + shift + COLOR_PALETTE.length) % COLOR_PALETTE.length;
          childColor = COLOR_PALETTE[newIndex];
        } else {
          childColor = this.gardenGenerator.getRandomColor();
        }

        const child = this.gardenGenerator.createCrystal(
          childPos,
          childHeight,
          childRadius,
          childColor,
          parent.generation + 1,
          false
        );

        if (child) {
          child.mesh.scale.set(0.01, 0.01, 0.01);
          child.originalScale.set(1, 1, 1);

          gsap.to(child.mesh.scale, {
            x: 1,
            y: 1,
            z: 1,
            duration: 0.5,
            ease: 'elastic.out(1, 0.6)'
          });
        }
      }, i * 50);
    }
  }

  public startDecay(crystal: CrystalData): void {
    if (crystal.isDecaying) return;

    crystal.isDecaying = true;
    crystal.decayStartTime = crystal.lifetime;
    this.gardenGenerator.createCrackLines(crystal);
    this.crystalsToDecay.add(crystal.id);

    const mat = crystal.mesh.material as THREE.ShaderMaterial;
    const duration = 3;

    const obj = { opacity: 1, decay: 0 };
    gsap.to(obj, {
      opacity: 0,
      decay: 1,
      duration: duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        if (mat.uniforms) {
          mat.uniforms.uOpacity.value = obj.opacity;
          mat.uniforms.uDecayFactor.value = obj.decay;
        }
      },
      onComplete: () => {
        this.onDecayComplete(crystal);
      }
    });
  }

  private onDecayComplete(crystal: CrystalData): void {
    this.particleSystem.createDecayParticles(crystal);
    this.gardenGenerator.removeCrystal(crystal.id);
    this.crystalsToDecay.delete(crystal.id);
  }

  public update(time: number, deltaTime: number): void {
    for (const crystal of this.gardenGenerator.crystals.values()) {
      if (!crystal.isDecaying && crystal.lifetime >= crystal.maxLifetime) {
        this.startDecay(crystal);
      }
    }
  }

  public dispose(): void {
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown.bind(this));
    canvas.removeEventListener('pointermove', this.onPointerMove.bind(this));
    canvas.removeEventListener('pointerup', this.onPointerUp.bind(this));
    canvas.removeEventListener('pointerleave', this.onPointerUp.bind(this));
  }
}
