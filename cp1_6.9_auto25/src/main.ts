import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem';
import { CrystalArray } from './CrystalArray';
import { LightSource, Fragment } from './LightSource';
import { ControlPanel } from './ControlPanel';

class OrbitControls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private target = new THREE.Vector3(0, 1.5, 0);
  private spherical = new THREE.Spherical(15, Math.PI / 3, Math.PI / 4);
  private isDragging = false;
  private previousMousePosition = { x: 0, y: 0 };
  private minDistance = 8;
  private maxDistance = 30;
  private minPolar = Math.PI / 6;
  private maxPolar = Math.PI / 2.1;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.bindEvents();
    this.update();
  }

  private bindEvents(): void {
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.domElement.addEventListener('pointermove', this.onPointerMove);
    this.domElement.addEventListener('pointerup', this.onPointerUp);
    this.domElement.addEventListener('pointerleave', this.onPointerUp);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.isDragging = true;
    this.previousMousePosition = { x: e.clientX, y: e.clientY };
    this.domElement.setPointerCapture(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.previousMousePosition.x;
    const deltaY = e.clientY - this.previousMousePosition.y;

    this.spherical.theta -= deltaX * 0.005;
    this.spherical.phi = Math.max(
      this.minPolar,
      Math.min(this.maxPolar, this.spherical.phi + deltaY * 0.005)
    );

    this.previousMousePosition = { x: e.clientX, y: e.clientY };
    this.update();
  };

  private onPointerUp = (e: PointerEvent): void => {
    this.isDragging = false;
    try {
      this.domElement.releasePointerCapture(e.pointerId);
    } catch (_err) {
      // ignore
    }
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    this.spherical.radius = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.spherical.radius * zoomFactor)
    );
    this.update();
  };

  private update(): void {
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }

  dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.domElement.removeEventListener('pointerleave', this.onPointerUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
  }
}

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particleSystem: ParticleSystem;
  private crystalArray: CrystalArray;
  private lightSource: LightSource;
  private controlPanel: ControlPanel;
  private orbitControls: OrbitControls;
  private clock = new THREE.Clock();
  private fragments: Fragment[] = [];
  private previousLitFragments = new Set<THREE.Mesh>();
  private animationFrameId: number | null = null;

  constructor() {
    const container = document.getElementById('app')!;

    this.scene = new THREE.Scene();
    this.scene.background = this.createGradientTexture();
    this.scene.fog = new THREE.Fog(0x0a0a1a, 15, 40);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    this.setupLighting();

    this.particleSystem = new ParticleSystem(this.scene);
    this.crystalArray = new CrystalArray(this.scene, this.camera, this.renderer, this.particleSystem);
    this.lightSource = new LightSource(this.scene, this.camera);
    this.fragments = this.lightSource.getFragments();

    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);

    this.controlPanel = new ControlPanel({
      onHueChange: (hue) => {
        this.lightSource.setHue(hue);
        this.crystalArray.applyLightColorToLit(hue);
      },
      onEnergyChange: (energy) => {
        this.lightSource.setEnergy(energy);
        this.crystalArray.setEnergy(energy);
      },
      onWavelengthChange: (_wavelength) => {
        // handled together with hue
      }
    });

    this.crystalArray.onResonate((_crystal, wavelength) => {
      this.controlPanel.setWavelength(Math.round(wavelength));
    });

    window.addEventListener('resize', this.onResize);

    this.hideLoading();
    this.start();
  }

  private createGradientTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(1, '#1a0a3a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 10, 7);
    this.scene.add(directional);

    const pointLight1 = new THREE.PointLight(0x6633ff, 0.4, 30);
    pointLight1.position.set(-8, 6, -8);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x33aaff, 0.3, 30);
    pointLight2.position.set(8, 4, 8);
    this.scene.add(pointLight2);
  }

  private hideLoading(): void {
    const loading = document.getElementById('loading');
    if (loading) {
      setTimeout(() => {
        loading.classList.add('hidden');
        setTimeout(() => {
          if (loading.parentNode) {
            loading.parentNode.removeChild(loading);
          }
        }, 600);
      }, 300);
    }
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private updateFragmentTrails(delta: number): void {
    const currentLitFragments = this.lightSource.litFragments;

    for (const fragment of this.fragments) {
      if (currentLitFragments.has(fragment.mesh)) {
        const beamDir = this.lightSource.getDirection();
        this.particleSystem.emitTrailParticle({
          origin: fragment.mesh.position.clone(),
          direction: beamDir,
          life: 0.5
        });
      }
    }

    this.previousLitFragments = new Set(currentLitFragments);
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.crystalArray.update(delta);
    this.lightSource.update(delta, this.crystalArray.crystalMeshes);
    this.crystalArray.setLitCrystals(this.lightSource.litCrystals);
    this.updateFragmentTrails(delta);
    this.particleSystem.update(delta);

    this.renderer.render(this.scene, this.camera);
  };

  private start(): void {
    this.clock.start();
    this.animate();
  }

  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onResize);
    this.orbitControls.dispose();
    this.particleSystem.dispose();
    this.crystalArray.dispose();
    this.lightSource.dispose();
    this.controlPanel.dispose();
    this.renderer.dispose();
  }
}

let app: App | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
    app = null;
  }
});
