import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as dat from 'dat.gui';
import { WaveSource, getInterferenceType } from './waveSimulator';
import { ParticleRenderer } from './particleRenderer';

class WaveInterferenceApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;
  private particleRenderer: ParticleRenderer;
  private sources: WaveSource[] = [];
  private sourceMeshes: THREE.Group[] = [];
  private rippleMeshes: { mesh: THREE.Mesh; startTime: number; sourceIndex: number }[] = [];
  private gui: dat.GUI;
  private clock: THREE.Clock;

  private params = {
    frequency: 400,
    amplitude: 0.6,
    sourceDistance: 12
  };

  private targetParams = {
    frequency: 400,
    amplitude: 0.6,
    sourceDistance: 12
  };

  private fpsElement: HTMLElement;
  private interferenceElement: HTMLElement;
  private fpsFrames = 0;
  private fpsLastTime = 0;
  private currentFps = 60;

  private readonly RIPPLE_DURATION = 2.0;
  private readonly RIPPLE_INTERVAL = 0.8;
  private lastRippleTime = 0;

  constructor() {
    this.container = document.getElementById('app')!;
    this.fpsElement = document.getElementById('fps')!;
    this.interferenceElement = document.getElementById('interference')!;
    this.clock = new THREE.Clock();

    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initControls();
    this.initSources();
    this.initParticleRenderer();
    this.initGUI();
    this.initEventListeners();

    this.animate();
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = null;
  }

  private initCamera(): void {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(0, 30, 30);
    this.camera.lookAt(0, 0, 0);
  }

  private initRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);
  }

  private initControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.rotateSpeed = 0.5;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 80;
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  private createGlowTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(200, 220, 255, 0.8)');
    gradient.addColorStop(0.5, 'rgba(100, 150, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(50, 100, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createSourceVisual(x: number, y: number, z: number): THREE.Group {
    const group = new THREE.Group();

    const sphereGeo = new THREE.SphereGeometry(0.5, 32, 32);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    group.add(sphere);

    const glowTexture = this.createGlowTexture();
    const glowMat = new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const glowSprite = new THREE.Sprite(glowMat);
    glowSprite.scale.set(4, 4, 4);
    group.add(glowSprite);

    group.position.set(x, y, z);
    return group;
  }

  private initSources(): void {
    const halfDist = this.targetParams.sourceDistance / 2;
    const positions = [
      { x: -halfDist, y: 0, z: 0 },
      { x: halfDist, y: 0, z: 0 }
    ];

    for (let i = 0; i < 2; i++) {
      this.sources.push({
        x: positions[i].x,
        y: positions[i].y,
        z: positions[i].z,
        frequency: this.targetParams.frequency,
        amplitude: this.targetParams.amplitude,
        phase: 0
      });

      const mesh = this.createSourceVisual(positions[i].x, positions[i].y, positions[i].z);
      this.sourceMeshes.push(mesh);
      this.scene.add(mesh);
    }
  }

  private initParticleRenderer(): void {
    this.particleRenderer = new ParticleRenderer();
    this.scene.add(this.particleRenderer.points);
  }

  private initGUI(): void {
    this.gui = new dat.GUI({ autoPlace: true });
    this.gui.domElement.style.position = 'absolute';
    this.gui.domElement.style.top = '16px';
    this.gui.domElement.style.right = '16px';

    const style = document.createElement('style');
    style.textContent = `
      .dg .c input[type=text] { color: #00d4aa !important; }
      .dg .slider { background-color: #333 !important; }
      .dg .slider-fg { background-color: #00d4aa !important; }
      .dg .property-name { color: #ffffff !important; }
      .dg .c { background-color: rgba(40, 40, 40, 0.8) !important; }
      .dg li.title { background-color: rgba(30, 30, 30, 0.9) !important; color: #ffffff !important; }
      .dg .close-button { color: #ffffff !important; background-color: rgba(40, 40, 40, 0.8) !important; }
      .dg.main { background-color: rgba(20, 20, 30, 0.8) !important; }
    `;
    document.head.appendChild(style);

    this.gui.add(this.params, 'frequency', 100, 1000, 10)
      .name('声源频率 (Hz)')
      .onChange((v: number) => { this.targetParams.frequency = v; });

    this.gui.add(this.params, 'amplitude', 0.1, 1.0, 0.05)
      .name('声源振幅')
      .onChange((v: number) => { this.targetParams.amplitude = v; });

    this.gui.add(this.params, 'sourceDistance', 4, 20, 1)
      .name('声源间距')
      .onChange((v: number) => { this.targetParams.sourceDistance = v; });
  }

  private initEventListeners(): void {
    window.addEventListener('resize', () => this.onResize());
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private createRipple(x: number, y: number, z: number): THREE.Mesh {
    const geometry = new THREE.RingGeometry(0.48, 0.52, 64);
    const material = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }

  private updateRipples(currentTime: number): void {
    if (currentTime - this.lastRippleTime >= this.RIPPLE_INTERVAL) {
      this.lastRippleTime = currentTime;
      for (let i = 0; i < this.sources.length; i++) {
        const source = this.sources[i];
        const ripple = this.createRipple(source.x, source.y, source.z);
        this.scene.add(ripple);
        this.rippleMeshes.push({ mesh: ripple, startTime: currentTime, sourceIndex: i });
      }
    }

    for (let i = this.rippleMeshes.length - 1; i >= 0; i--) {
      const ripple = this.rippleMeshes[i];
      const elapsed = currentTime - ripple.startTime;

      if (elapsed >= this.RIPPLE_DURATION) {
        this.scene.remove(ripple.mesh);
        ripple.mesh.geometry.dispose();
        (ripple.mesh.material as THREE.Material).dispose();
        this.rippleMeshes.splice(i, 1);
      } else {
        const progress = elapsed / this.RIPPLE_DURATION;
        const radius = 0.5 + progress * 7.5;
        const newGeometry = new THREE.RingGeometry(radius - 0.04, radius + 0.04, 64);
        ripple.mesh.geometry.dispose();
        ripple.mesh.geometry = newGeometry;
        (ripple.mesh.material as THREE.MeshBasicMaterial).opacity = 1.0 - progress;
      }
    }
  }

  private smoothParams(deltaTime: number): void {
    const smoothRate = Math.min(1, deltaTime * 2.0);
    this.params.frequency += (this.targetParams.frequency - this.params.frequency) * smoothRate;
    this.params.amplitude += (this.targetParams.amplitude - this.params.amplitude) * smoothRate;
    this.params.sourceDistance += (this.targetParams.sourceDistance - this.params.sourceDistance) * smoothRate;
  }

  private updateSources(): void {
    const halfDist = this.params.sourceDistance / 2;
    for (let i = 0; i < this.sources.length; i++) {
      this.sources[i].frequency = this.params.frequency;
      this.sources[i].amplitude = this.params.amplitude;
      this.sources[i].x = i === 0 ? -halfDist : halfDist;
      this.sourceMeshes[i].position.x = this.sources[i].x;
    }
  }

  private updateFPS(): void {
    this.fpsFrames++;
    const now = performance.now();
    if (now - this.fpsLastTime >= 2000) {
      this.currentFps = Math.round((this.fpsFrames * 1000) / (now - this.fpsLastTime));
      this.fpsElement.textContent = this.currentFps.toString();
      this.fpsFrames = 0;
      this.fpsLastTime = now;
    }
  }

  private updateInterferenceInfo(): void {
    const midpoint = { x: 0, y: -1, z: 0 };
    const type = getInterferenceType(this.sources, midpoint);
    let label = '混合';
    if (type === 'constructive') label = '相长干涉';
    else if (type === 'destructive') label = '相消干涉';
    this.interferenceElement.textContent = label;
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    this.smoothParams(deltaTime);
    this.updateSources();
    this.controls.update();
    this.particleRenderer.update(this.sources, elapsedTime, deltaTime, 3);
    this.updateRipples(elapsedTime);
    this.updateFPS();
    this.updateInterferenceInfo();

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.particleRenderer.dispose();
    for (const mesh of this.sourceMeshes) {
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) child.material.dispose();
        }
        if (child instanceof THREE.Sprite && child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      });
    }
    this.renderer.dispose();
    this.gui.destroy();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new WaveInterferenceApp();
});
