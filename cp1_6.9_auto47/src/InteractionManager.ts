import * as THREE from 'three';
import { IceCrystal } from './IceCrystal';
import { setAuroraSpeed, setAuroraPulse, updateHighlights } from './AuroraShader';

export class InteractionManager {
  public crystals: IceCrystal[] = [];
  public auroraSpeed: number = 3;

  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredCrystal: IceCrystal | null = null;
  private lastHoverCheck: number = 0;
  private hoverThrottle: number = 50;

  private pulseTimer: number = 0;
  private isPulsing: boolean = false;
  private pulseDuration: number = 1.0;

  private speedValueEl: HTMLElement | null;
  private speedBarEl: HTMLElement | null;
  private crystalCountEl: HTMLElement | null;
  private grownCountEl: HTMLElement | null;
  private spaceFeedbackEl: HTMLElement | null;

  constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-10, -10);

    this.speedValueEl = document.getElementById('speed-value');
    this.speedBarEl = document.getElementById('speed-bar');
    this.crystalCountEl = document.getElementById('crystal-count');
    this.grownCountEl = document.getElementById('grown-count');
    this.spaceFeedbackEl = document.getElementById('space-feedback');

    this.updateSpeedUI();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const dom = this.renderer.domElement;

    dom.addEventListener('mousemove', (e) => {
      this.updateMouse(e);
    });

    dom.addEventListener('click', (e) => {
      this.updateMouse(e);
      this.handleClick();
    });

    dom.addEventListener('mouseleave', () => {
      if (this.hoveredCrystal) {
        this.hoveredCrystal.updateHover(false);
        this.hoveredCrystal = null;
      }
    });

    window.addEventListener('keydown', (e) => {
      this.handleKeydown(e);
    });
  }

  private updateMouse(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handleClick(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const crystalMeshes = this.crystals.map(c => c.mesh);
    const intersects = this.raycaster.intersectObjects(crystalMeshes, true);

    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && !obj.userData.crystal) {
        obj = obj.parent;
      }
      if (obj && obj.userData.crystal) {
        const crystal = obj.userData.crystal as IceCrystal;
        crystal.startGrowth();
        this.updateCrystalCountUI();
      }
    }
  }

  private handleHover(now: number): void {
    if (now - this.lastHoverCheck < this.hoverThrottle) return;
    this.lastHoverCheck = now;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const crystalMeshes = this.crystals.map(c => c.mesh);
    const intersects = this.raycaster.intersectObjects(crystalMeshes, true);

    let foundCrystal: IceCrystal | null = null;
    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && !obj.userData.crystal) {
        obj = obj.parent;
      }
      if (obj && obj.userData.crystal) {
        foundCrystal = obj.userData.crystal as IceCrystal;
      }
    }

    if (foundCrystal !== this.hoveredCrystal) {
      if (this.hoveredCrystal) {
        this.hoveredCrystal.updateHover(false);
      }
      if (foundCrystal) {
        foundCrystal.updateHover(true);
      }
      this.hoveredCrystal = foundCrystal;
    }
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (e.key >= '1' && e.key <= '5') {
      const level = parseInt(e.key, 10);
      this.setAuroraSpeed(level);
    } else if (e.code === 'Space') {
      e.preventDefault();
      this.triggerResonance();
      this.flashSpaceFeedback();
    }
  }

  private flashSpaceFeedback(): void {
    if (!this.spaceFeedbackEl) return;
    this.spaceFeedbackEl.classList.add('active');
    setTimeout(() => {
      if (this.spaceFeedbackEl) {
        this.spaceFeedbackEl.classList.remove('active');
      }
    }, 100);
  }

  public addCrystal(crystal: IceCrystal): void {
    this.crystals.push(crystal);
    this.scene.add(crystal.mesh);
    this.updateCrystalCountUI();
  }

  public triggerResonance(): void {
    this.crystals.forEach(c => c.triggerResonance());
    this.isPulsing = true;
    this.pulseTimer = 0;
  }

  public setAuroraSpeed(level: number): void {
    this.auroraSpeed = Math.max(1, Math.min(5, level));
    setAuroraSpeed(this.auroraSpeed);
    this.updateSpeedUI();
  }

  private updateSpeedUI(): void {
    if (this.speedValueEl) {
      this.speedValueEl.textContent = String(this.auroraSpeed);
    }
    if (this.speedBarEl) {
      const dots = this.speedBarEl.querySelectorAll('.speed-dot');
      dots.forEach((dot, i) => {
        if (i < this.auroraSpeed) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });
    }
  }

  private updateCrystalCountUI(): void {
    if (this.crystalCountEl) {
      this.crystalCountEl.textContent = String(this.crystals.length);
    }
    if (this.grownCountEl) {
      const grown = this.crystals.filter(c => c.isGrown).length;
      this.grownCountEl.textContent = String(grown);
    }
  }

  public update(delta: number, now: number): void {
    this.crystals.forEach(c => c.update(delta));

    this.handleHover(now);

    const growingPositions: THREE.Vector3[] = [];
    const growingColors: THREE.Color[] = [];
    this.crystals.forEach(c => {
      if (c.isGrowing || (c.isGrown && c.light.intensity > 0)) {
        growingPositions.push(c.mesh.position);
        growingColors.push(c.color);
      }
    });
    updateHighlights(growingPositions, growingColors);

    if (this.isPulsing) {
      this.pulseTimer += delta;
      const t = this.pulseTimer / this.pulseDuration;
      if (t >= 1) {
        this.isPulsing = false;
        this.pulseTimer = 0;
        setAuroraPulse(0);
      } else {
        const pulse = t < 0.15
          ? t / 0.15
          : (1 - (t - 0.15) / 0.85);
        setAuroraPulse(Math.max(0, Math.min(1, pulse)));
      }
    }

    this.updateCrystalCountUI();
  }

  public dispose(): void {
    this.crystals.forEach(c => c.dispose());
  }
}
