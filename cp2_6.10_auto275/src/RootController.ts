import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { RootSystem, PlantRootData } from './RootSystem';

export interface ControllerOptions {
  growthSpeed: number;
  onPlantSelected: (plantId: string | null) => void;
  onPlantHover: (info: { depth: number; color: number } | null, x: number, y: number) => void;
  onGrowthComplete: () => void;
  onGrowthUpdate: () => void;
}

interface Particle {
  mesh: THREE.Mesh | THREE.Line;
  life: number;
  maxLife: number;
  velocity: THREE.Vector3;
  type: 'competition' | 'symbiosis';
}

export class RootController {
  public growthSpeed: number = 1.0;
  public isGrowing: boolean = false;
  public selectedPlantId: string | null = null;
  public showOnlySelected: boolean = false;

  private sceneManager: SceneManager;
  private rootSystem: RootSystem;
  private options: ControllerOptions;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private particles: Particle[] = [];
  private handledEvents: Set<string> = new Set();
  private animationFrameId: number | null = null;
  private domElement: HTMLElement;
  private isDragging: boolean = false;
  private mouseDownPos: { x: number; y: number } = { x: 0, y: 0 };
  private lastHoverPlantId: string | null = null;

  constructor(
    sceneManager: SceneManager,
    rootSystem: RootSystem,
    options: ControllerOptions
  ) {
    this.sceneManager = sceneManager;
    this.rootSystem = rootSystem;
    this.options = options;
    this.growthSpeed = options.growthSpeed;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.domElement = sceneManager.renderer.domElement;

    this._bindEvents();
  }

  private _bindEvents(): void {
    this.domElement.addEventListener('pointerdown', this._onPointerDown.bind(this));
    this.domElement.addEventListener('pointermove', this._onPointerMove.bind(this));
    this.domElement.addEventListener('pointerup', this._onPointerUp.bind(this));
    this.domElement.addEventListener('pointerleave', this._onPointerLeave.bind(this));
    window.addEventListener('keydown', this._onKeyDown.bind(this));
  }

  private _onPointerDown(e: PointerEvent): void {
    this.isDragging = true;
    this.mouseDownPos = { x: e.clientX, y: e.clientY };
  }

  private _onPointerMove(e: PointerEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (!this.isDragging || Math.abs(e.clientX - this.mouseDownPos.x) + Math.abs(e.clientY - this.mouseDownPos.y) < 3) {
      this._updateHover(e.clientX, e.clientY);
    }
  }

  private _onPointerUp(e: PointerEvent): void {
    const dragDist = Math.abs(e.clientX - this.mouseDownPos.x) + Math.abs(e.clientY - this.mouseDownPos.y);
    const wasDragging = this.isDragging;
    this.isDragging = false;

    if (wasDragging && dragDist < 5) {
      this._handleClick();
    }
  }

  private _onPointerLeave(): void {
    this.isDragging = false;
    this.options.onPlantHover(null, 0, 0);
  }

  private _onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Tab') {
      e.preventDefault();
      this.showOnlySelected = !this.showOnlySelected;
      if (this.showOnlySelected && this.selectedPlantId) {
        this.rootSystem.toggleOtherPlantsVisibility(this.selectedPlantId);
      } else {
        this.rootSystem.toggleOtherPlantsVisibility(null);
      }
    } else if (e.key === 'r' || e.key === 'R') {
      this.sceneManager.resetCamera();
    }
  }

  private _updateHover(clientX: number, clientY: number): void {
    this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

    const allMeshes: THREE.Object3D[] = [];
    for (const plant of this.rootSystem.plants) {
      allMeshes.push(...plant.rootGroup.children);
    }

    const intersects = this.raycaster.intersectObjects(allMeshes, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const userData = mesh.userData;
      if (userData && typeof userData.depth === 'number') {
        this.options.onPlantHover(
          { depth: userData.depth, color: userData.color },
          clientX,
          clientY
        );
        return;
      }
    }
    this.options.onPlantHover(null, 0, 0);
  }

  private _handleClick(): void {
    this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

    const allMeshes: THREE.Object3D[] = [];
    for (const plant of this.rootSystem.plants) {
      allMeshes.push(...plant.rootGroup.children);
    }

    const intersects = this.raycaster.intersectObjects(allMeshes, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const plantId = mesh.userData.plantId as string;
      this.selectPlant(plantId);
    } else {
      this.selectPlant(null);
    }
  }

  public selectPlant(plantId: string | null): void {
    if (this.selectedPlantId && this.selectedPlantId !== plantId) {
      this.rootSystem.highlightPlant(this.selectedPlantId, false);
    }

    this.selectedPlantId = plantId;

    if (plantId) {
      this.rootSystem.highlightPlant(plantId, true);
      if (this.showOnlySelected) {
        this.rootSystem.toggleOtherPlantsVisibility(plantId);
      }
    } else if (this.showOnlySelected) {
      this.rootSystem.toggleOtherPlantsVisibility(null);
    }

    this.options.onPlantSelected(plantId);
  }

  public startGrowth(): void {
    if (this.isGrowing) return;

    this.isGrowing = true;
    const now = performance.now();
    for (const plant of this.rootSystem.plants) {
      plant.growStartTime = now;
    }

    this._animationLoop();
  }

  public stopGrowth(): void {
    this.isGrowing = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public resetGrowth(): void {
    this.stopGrowth();
    this.rootSystem.resetGrowth();
    this.particles = [];
    this.handledEvents.clear();
    this.selectedPlantId = null;
    this.showOnlySelected = false;
    this.options.onPlantSelected(null);
  }

  private _animationLoop = (): void => {
    if (!this.isGrowing) return;

    let anyGrowing = false;
    for (const plant of this.rootSystem.plants) {
      if (!plant.isComplete) {
        const grew = this.rootSystem.growStep(plant, this.growthSpeed, this.rootSystem.plants);
        if (grew) anyGrowing = true;
      }
    }

    this._updateParticles();
    this._checkAndSpawnEvents();
    this.options.onGrowthUpdate();

    this.sceneManager.render();

    if (anyGrowing || this.particles.length > 0) {
      this.animationFrameId = requestAnimationFrame(this._animationLoop);
    } else {
      this.isGrowing = false;
      this.animationFrameId = null;
      this._showCompletionBanner();
      this.options.onGrowthComplete();
    }
  };

  public renderIdle(): void {
    this._updateParticles();
    this.sceneManager.render();
  }

  private _checkAndSpawnEvents(): void {
    const events = this.rootSystem.checkCompetition(this.rootSystem.plants);

    for (const event of events) {
      const key = `${event.type}_${event.position.x.toFixed(2)}_${event.position.y.toFixed(2)}_${event.position.z.toFixed(2)}`;
      if (this.handledEvents.has(key)) continue;
      this.handledEvents.add(key);

      if (event.type === 'competition') {
        this._spawnCompetitionParticle(event.position);
      } else if (event.type === 'symbiosis') {
        this._spawnSymbiosisThreads(event.position);
      }
    }
  }

  private _spawnCompetitionParticle(position: THREE.Vector3): void {
    const geo = new THREE.SphereGeometry(0.04, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff3333,
      transparent: true,
      opacity: 1
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    this.sceneManager.scene.add(mesh);

    this.particles.push({
      mesh,
      life: 0,
      maxLife: 1.0,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        Math.random() * 0.3,
        (Math.random() - 0.5) * 0.3
      ),
      type: 'competition'
    });
  }

  private _spawnSymbiosisThreads(center: THREE.Vector3): void {
    for (let i = 0; i < 3; i++) {
      const points: THREE.Vector3[] = [];
      const startDir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 2
      ).normalize();

      let pos = center.clone();
      points.push(pos.clone());

      for (let j = 0; j < 6; j++) {
        startDir.x += (Math.random() - 0.5) * 0.4;
        startDir.y += (Math.random() - 0.5) * 0.2;
        startDir.z += (Math.random() - 0.5) * 0.4;
        startDir.normalize();
        pos = pos.clone().add(startDir.clone().multiplyScalar(0.15));
        points.push(pos.clone());
      }

      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
      });
      const line = new THREE.Line(geo, mat);
      this.sceneManager.scene.add(line);

      this.particles.push({
        mesh: line,
        life: 0,
        maxLife: 2.5 + Math.random(),
        velocity: new THREE.Vector3(0, 0, 0),
        type: 'symbiosis'
      });
    }
  }

  private _updateParticles(): void {
    const dt = 1 / 60;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;

      if (p.mesh instanceof THREE.Mesh) {
        p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));
        const mat = p.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, 1 - p.life / p.maxLife);
      } else if (p.mesh instanceof THREE.Line) {
        const mat = p.mesh.material as THREE.LineBasicMaterial;
        const flicker = 0.6 + Math.sin(p.life * 8) * 0.4;
        mat.opacity = Math.max(0, flicker * (1 - p.life / p.maxLife));
        const scale = 1 + p.life * 0.3;
        p.mesh.scale.setScalar(scale);
      }

      if (p.life >= p.maxLife) {
        this.sceneManager.scene.remove(p.mesh);
        if (p.mesh instanceof THREE.Mesh) {
          p.mesh.geometry.dispose();
          (p.mesh.material as THREE.Material).dispose();
        } else if (p.mesh instanceof THREE.Line) {
          p.mesh.geometry.dispose();
          (p.mesh.material as THREE.Material).dispose();
        }
        this.particles.splice(i, 1);
      }
    }
  }

  private _showCompletionBanner(): void {
    const banner = document.getElementById('completion-banner');
    if (banner) {
      banner.style.opacity = '1';
      setTimeout(() => {
        banner.style.opacity = '0';
      }, 2000);
    }
  }

  public getSelectedPlant(): PlantRootData | null {
    if (!this.selectedPlantId) return null;
    return this.rootSystem.plants.find(p => p.id === this.selectedPlantId) || null;
  }

  public setGrowthSpeed(speed: number): void {
    this.growthSpeed = Math.max(0.1, Math.min(3.0, speed));
  }

  public dispose(): void {
    this.stopGrowth();
    this.domElement.removeEventListener('pointerdown', this._onPointerDown.bind(this));
    this.domElement.removeEventListener('pointermove', this._onPointerMove.bind(this));
    this.domElement.removeEventListener('pointerup', this._onPointerUp.bind(this));
    this.domElement.removeEventListener('pointerleave', this._onPointerLeave.bind(this));
    window.removeEventListener('keydown', this._onKeyDown.bind(this));
  }
}
