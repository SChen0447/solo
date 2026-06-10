import * as THREE from 'three';
import { Firefly } from './Firefly';

interface TrailParticle {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

export class UserInteraction {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private fireflies: Firefly[];
  private onReset: () => void;

  private trailParticles: TrailParticle[] = [];
  private isDragging: boolean = false;
  private lastMouseWorld: THREE.Vector3 | null = null;
  private trailIntensity: number = 5;
  private hoverMarker: THREE.Mesh | null = null;
  private raycaster: THREE.Raycaster;
  private mouseNDC: THREE.Vector2;
  private currentTrailPoint: THREE.Vector3 | null = null;

  private container: HTMLElement | null = null;
  private slider: HTMLInputElement | null = null;
  private progressBar: HTMLDivElement | null = null;
  private progressFill: HTMLDivElement | null = null;
  private resetBtn: HTMLButtonElement | null = null;

  private recentlyAffected: Set<Firefly> = new Set();

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    fireflies: Firefly[],
    onReset: () => void
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.fireflies = fireflies;
    this.onReset = onReset;

    this.raycaster = new THREE.Raycaster();
    this.mouseNDC = new THREE.Vector2();

    this.createHoverMarker();
    this.createControlPanel();
    this.bindEvents();
  }

  private createHoverMarker(): void {
    const ringGeom = new THREE.RingGeometry(0.18, 0.2, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.hoverMarker = new THREE.Mesh(ringGeom, ringMat);

    const crossH = new THREE.Mesh(
      new THREE.PlaneGeometry(0.15, 0.01),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false })
    );
    const crossV = new THREE.Mesh(
      new THREE.PlaneGeometry(0.01, 0.15),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false })
    );
    this.hoverMarker.add(crossH);
    this.hoverMarker.add(crossV);
    this.hoverMarker.visible = false;
    this.scene.add(this.hoverMarker);
  }

  private createControlPanel(): void {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      right: 20px;
      bottom: 20px;
      background: rgba(26, 26, 46, 0.8);
      border-radius: 12px;
      padding: 16px;
      color: #e0e0e0;
      font-size: 13px;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: 1000;
      min-width: 180px;
    `;

    const title = document.createElement('div');
    title.textContent = '控制面板';
    title.style.cssText = 'margin-bottom: 12px; font-weight: 600; color: #aaddff; font-size: 14px;';
    this.container.appendChild(title);

    const intensityLabel = document.createElement('div');
    intensityLabel.textContent = '光带强度';
    intensityLabel.style.cssText = 'margin-bottom: 6px;';
    this.container.appendChild(intensityLabel);

    this.slider = document.createElement('input');
    this.slider.type = 'range';
    this.slider.min = '1';
    this.slider.max = '10';
    this.slider.value = '5';
    this.slider.style.cssText = `
      -webkit-appearance: slider-vertical;
      appearance: slider-vertical;
      width: 24px;
      height: 100px;
      writing-mode: bt-lr;
      margin: 4px 0 12px 0;
      accent-color: #88ddff;
      cursor: pointer;
    `;
    this.slider.addEventListener('input', () => {
      if (this.slider) {
        this.trailIntensity = parseInt(this.slider.value);
      }
    });
    this.container.appendChild(this.slider);

    const syncLabel = document.createElement('div');
    syncLabel.textContent = '频率同步';
    syncLabel.style.cssText = 'margin-bottom: 6px;';
    this.container.appendChild(syncLabel);

    this.progressBar = document.createElement('div');
    this.progressBar.style.cssText = `
      width: 100%;
      height: 10px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 5px;
      overflow: hidden;
      margin-bottom: 4px;
    `;
    this.progressFill = document.createElement('div');
    this.progressFill.style.cssText = `
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #88ddff, #aaffaa);
      border-radius: 5px;
      transition: width 0.3s ease;
    `;
    this.progressBar.appendChild(this.progressFill);
    this.container.appendChild(this.progressBar);

    const progressText = document.createElement('div');
    progressText.id = 'progress-text';
    progressText.style.cssText = 'text-align: right; font-size: 11px; color: #88bbdd; margin-bottom: 14px;';
    progressText.textContent = '0%';
    this.container.appendChild(progressText);

    this.resetBtn = document.createElement('button');
    this.resetBtn.textContent = '重置萤火虫';
    this.resetBtn.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      background: linear-gradient(135deg, #3a4a6a, #2a3a5a);
      border: 1px solid rgba(136, 221, 255, 0.3);
      border-radius: 6px;
      color: #e0e0e0;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    this.resetBtn.addEventListener('mouseenter', () => {
      if (this.resetBtn) {
        this.resetBtn.style.background = 'linear-gradient(135deg, #4a5a7a, #3a4a6a)';
      }
    });
    this.resetBtn.addEventListener('mouseleave', () => {
      if (this.resetBtn) {
        this.resetBtn.style.background = 'linear-gradient(135deg, #3a4a6a, #2a3a5a)';
      }
    });
    this.resetBtn.addEventListener('click', () => {
      this.onReset();
      this.recentlyAffected.clear();
    });
    this.container.appendChild(this.resetBtn);

    document.body.appendChild(this.container);

    setTimeout(() => {
      if (this.container) {
        this.container.style.opacity = '1';
      }
    }, 100);
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isDragging = true;
        this.lastMouseWorld = null;
        this.updateMouseNDC(e);
        this.currentTrailPoint = this.getMouseWorldPoint();
      }
    });

    canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.lastMouseWorld = null;
      this.recentlyAffected.clear();
    });

    canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
      this.lastMouseWorld = null;
      if (this.hoverMarker) this.hoverMarker.visible = false;
      this.recentlyAffected.clear();
    });

    canvas.addEventListener('mousemove', (e) => {
      this.updateMouseNDC(e);
      this.currentTrailPoint = this.getMouseWorldPoint();

      if (this.isDragging && this.currentTrailPoint) {
        this.spawnTrailParticle(this.currentTrailPoint);
      }

      this.checkHover();
    });
  }

  private updateMouseNDC(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getMouseWorldPoint(): THREE.Vector3 {
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -1.5);
    const target = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, target);
    return target;
  }

  private spawnTrailParticle(worldPos: THREE.Vector3): void {
    if (this.lastMouseWorld) {
      const dist = worldPos.distanceTo(this.lastMouseWorld);
      const minDist = 0.1;
      const maxDist = 0.3;
      if (dist < minDist) return;

      const steps = Math.ceil(dist / maxDist);
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const p = new THREE.Vector3().lerpVectors(this.lastMouseWorld, worldPos, t);
        this.createParticleAt(p);
      }
    } else {
      this.createParticleAt(worldPos);
    }
    this.lastMouseWorld = worldPos.clone();
  }

  private createParticleAt(pos: THREE.Vector3): void {
    const geom = new THREE.SphereGeometry(0.05, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x88ddff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(pos);
    const scale = 0.6 + (this.trailIntensity / 10) * 0.8;
    mesh.scale.setScalar(scale);
    this.scene.add(mesh);

    this.trailParticles.push({
      mesh,
      life: 1.0,
      maxLife: 1.0
    });

    this.checkFireflyCollision(pos);
  }

  private checkFireflyCollision(point: THREE.Vector3): void {
    const threshold = 0.4 * (0.7 + this.trailIntensity / 15);
    const affectedFreqs: number[] = [];

    for (const ff of this.fireflies) {
      if (ff.checkCollision(point, threshold) && !this.recentlyAffected.has(ff)) {
        this.recentlyAffected.add(ff);
        affectedFreqs.push(ff.currentFrequency);
      }
    }

    if (affectedFreqs.length > 0) {
      const avgFreq = affectedFreqs.reduce((a, b) => a + b, 0) / affectedFreqs.length;
      for (const ff of this.fireflies) {
        if (this.recentlyAffected.has(ff)) {
          ff.affectWithFrequency(avgFreq);
        }
      }
    }
  }

  private checkHover(): void {
    if (!this.hoverMarker) return;

    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    let closest: Firefly | null = null;
    let closestDist = Infinity;

    for (const ff of this.fireflies) {
      const dist = this.raycaster.ray.distanceToPoint(ff.position);
      if (dist < 0.3 && dist < closestDist) {
        const projected = new THREE.Vector3();
        this.raycaster.ray.closestPointToPoint(ff.position, projected);
        const depth = projected.distanceTo(this.camera.position);
        const ffDepth = ff.position.distanceTo(this.camera.position);
        if (Math.abs(depth - ffDepth) < 2) {
          closestDist = dist;
          closest = ff;
        }
      }
    }

    if (closest) {
      this.hoverMarker.visible = true;
      this.hoverMarker.position.copy(closest.position);
      this.hoverMarker.lookAt(this.camera.position);
    } else {
      this.hoverMarker.visible = false;
    }
  }

  public updateSyncProgress(): void {
    if (!this.progressFill) return;

    if (this.fireflies.length === 0) {
      this.progressFill.style.width = '0%';
      const text = document.getElementById('progress-text');
      if (text) text.textContent = '0%';
      return;
    }

    const freqs = this.fireflies.map(f => f.currentFrequency);
    const mean = freqs.reduce((a, b) => a + b, 0) / freqs.length;
    const variance = freqs.reduce((sum, f) => sum + (f - mean) ** 2, 0) / freqs.length;
    const stdDev = Math.sqrt(variance);
    const maxStdDev = 1.0;
    const sync = Math.max(0, Math.min(100, (1 - stdDev / maxStdDev) * 100));

    this.progressFill.style.width = `${sync.toFixed(1)}%`;
    const text = document.getElementById('progress-text');
    if (text) text.textContent = `${sync.toFixed(0)}%`;
  }

  public update(delta: number): void {
    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const p = this.trailParticles[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        (p.mesh.geometry as THREE.BufferGeometry).dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.trailParticles.splice(i, 1);
      } else {
        const mat = p.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = (p.life / p.maxLife) * 0.9;
        const s = 0.6 + (this.trailIntensity / 10) * 0.8;
        p.mesh.scale.setScalar(s * (p.life / p.maxLife));
      }
    }

    this.updateSyncProgress();
  }

  public dispose(): void {
    if (this.container) {
      this.container.remove();
    }
    for (const p of this.trailParticles) {
      this.scene.remove(p.mesh);
      (p.mesh.geometry as THREE.BufferGeometry).dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    this.trailParticles = [];
  }
}
