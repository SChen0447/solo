import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import { generateFractalPointCloud, type FractalParams, type FractalData } from './fractalGenerator';
import { UIController } from './uiController';

class FractalPlanetApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;
  private uiController: UIController;

  private starField: THREE.Points | null = null;
  private pointCloud: THREE.Points | null = null;
  private fogEffect: THREE.Fog | null = null;

  private frameCount = 0;
  private lastFpsUpdate = 0;
  private currentFps = 0;
  private isTransitioning = false;

  private oldPositions: Float32Array | null = null;
  private targetPositions: Float32Array | null = null;

  constructor() {
    this.container = document.getElementById('app') as HTMLElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0B0B1A);

    this.fogEffect = new THREE.Fog(0x0B0B1A, 8, 25);
    this.scene.fog = this.fogEffect;

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 10);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 30;
    this.controls.enablePan = false;

    this.uiController = new UIController({
      onRegenerate: (params) => this.regeneratePointCloud(params),
      onExport: () => this.exportScreenshot()
    });

    this.createStarField();
    this.createInitialPointCloud();
    this.setupEventListeners();
    this.animate();
  }

  private createStarField(): void {
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const radius = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const brightness = 0.5 + Math.random() * 0.5;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness;

      sizes[i] = 0.05 + Math.random() * 0.1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });

    this.starField = new THREE.Points(geometry, material);
    this.scene.add(this.starField);
  }

  private createInitialPointCloud(): void {
    const params = this.uiController.getCurrentParams();
    const data = generateFractalPointCloud(params);
    this.createPointCloudFromData(data);
  }

  private createPointCloudFromData(data: FractalData): void {
    if (this.pointCloud) {
      this.scene.remove(this.pointCloud);
      (this.pointCloud.geometry as THREE.BufferGeometry).dispose();
      (this.pointCloud.material as THREE.Material).dispose();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(data.sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.pointCloud = new THREE.Points(geometry, material);
    this.scene.add(this.pointCloud);
  }

  private regeneratePointCloud(params: FractalParams): void {
    if (this.isTransitioning || !this.pointCloud) return;
    this.isTransitioning = true;

    const oldGeometry = this.pointCloud.geometry as THREE.BufferGeometry;
    const oldPosAttr = oldGeometry.getAttribute('position') as THREE.BufferAttribute;
    this.oldPositions = new Float32Array(oldPosAttr.array as Float32Array);

    const newData = generateFractalPointCloud(params);
    this.targetPositions = newData.positions;

    const oldCount = this.oldPositions.length / 3;
    const newCount = this.targetPositions.length / 3;
    const maxCount = Math.max(oldCount, newCount);

    const tempPositions = new Float32Array(maxCount * 3);
    const tempColors = new Float32Array(maxCount * 3);
    const tempSizes = new Float32Array(maxCount);

    for (let i = 0; i < maxCount; i++) {
      const oldIdx = i % oldCount;
      tempPositions[i * 3] = this.oldPositions[oldIdx * 3];
      tempPositions[i * 3 + 1] = this.oldPositions[oldIdx * 3 + 1];
      tempPositions[i * 3 + 2] = this.oldPositions[oldIdx * 3 + 2];

      const newIdx = i % newCount;
      tempColors[i * 3] = newData.colors[newIdx * 3];
      tempColors[i * 3 + 1] = newData.colors[newIdx * 3 + 1];
      tempColors[i * 3 + 2] = newData.colors[newIdx * 3 + 2];
      tempSizes[i] = newData.sizes[newIdx];
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(tempPositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(tempColors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(tempSizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.scene.remove(this.pointCloud);
    oldGeometry.dispose();
    (this.pointCloud.material as THREE.Material).dispose();

    this.pointCloud = new THREE.Points(geometry, material);
    this.scene.add(this.pointCloud);

    const progressObj = { t: 0, scale: 1 };

    gsap.to(progressObj, {
      t: 1,
      scale: 1,
      duration: 1.5,
      ease: 'power2.inOut',
      onUpdate: () => {
        const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
        const posArr = posAttr.array as Float32Array;
        const t = progressObj.t;
        const explosionT = t < 0.5 ? t * 2 : (1 - t) * 2;
        const explosionScale = 1 + explosionT * 1.5;

        for (let i = 0; i < maxCount; i++) {
          const oldIdx = i % oldCount;
          const newIdx = i % newCount;

          const ox = this.oldPositions![oldIdx * 3];
          const oy = this.oldPositions![oldIdx * 3 + 1];
          const oz = this.oldPositions![oldIdx * 3 + 2];

          const nx = this.targetPositions![newIdx * 3];
          const ny = this.targetPositions![newIdx * 3 + 1];
          const nz = this.targetPositions![newIdx * 3 + 2];

          const midX = (ox + nx) / 2;
          const midY = (oy + ny) / 2;
          const midZ = (oz + nz) / 2;

          const lerpX = ox + (nx - ox) * t;
          const lerpY = oy + (ny - oy) * t;
          const lerpZ = oz + (nz - oz) * t;

          posArr[i * 3] = midX + (lerpX - midX) * explosionScale;
          posArr[i * 3 + 1] = midY + (lerpY - midY) * explosionScale;
          posArr[i * 3 + 2] = midZ + (lerpZ - midZ) * explosionScale;
        }

        posAttr.needsUpdate = true;
      },
      onComplete: () => {
        const finalGeometry = new THREE.BufferGeometry();
        finalGeometry.setAttribute('position', new THREE.BufferAttribute(newData.positions, 3));
        finalGeometry.setAttribute('color', new THREE.BufferAttribute(newData.colors, 3));
        finalGeometry.setAttribute('size', new THREE.BufferAttribute(newData.sizes, 1));

        this.scene.remove(this.pointCloud!);
        geometry.dispose();
        material.dispose();

        this.pointCloud = new THREE.Points(finalGeometry, new THREE.PointsMaterial({
          size: 0.05,
          vertexColors: true,
          transparent: true,
          opacity: 0.9,
          sizeAttenuation: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        }));
        this.scene.add(this.pointCloud);

        this.oldPositions = null;
        this.targetPositions = null;
        this.isTransitioning = false;
      }
    });
  }

  private async exportScreenshot(): Promise<void> {
    this.uiController.hideUI();
    this.controls.enabled = false;

    this.renderer.render(this.scene, this.camera);

    const exportWidth = 1920;
    const exportHeight = 1080;

    const originalSize = new THREE.Vector2();
    this.renderer.getSize(originalSize);

    this.renderer.setSize(exportWidth, exportHeight, false);
    this.renderer.render(this.scene, this.camera);

    const canvas = this.renderer.domElement;
    const dataURL = canvas.toDataURL('image/png');

    this.renderer.setSize(originalSize.x, originalSize.y, false);

    const link = document.createElement('a');
    link.download = `fractal-planet-${Date.now()}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      this.uiController.showUI();
      this.controls.enabled = true;
    }, 100);
  }

  private updateFogColor(): void {
    if (!this.fogEffect) return;

    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);

    const hueShift = (direction.x + direction.y + direction.z) * 0.02;
    const baseColor = new THREE.Color(0x0B0B1A);
    const tintColor = new THREE.Color().setHSL(0.6 + hueShift, 0.3, 0.08);
    baseColor.lerp(tintColor, 0.5);

    this.fogEffect.color.copy(baseColor);
    this.scene.background = baseColor;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const now = performance.now();
    this.frameCount++;

    if (now - this.lastFpsUpdate >= 1000) {
      this.currentFps = (this.frameCount * 1000) / (now - this.lastFpsUpdate);
      this.frameCount = 0;
      this.lastFpsUpdate = now;
      this.uiController.updateFPS(this.currentFps);
    }

    if (this.pointCloud && !this.isTransitioning) {
      this.pointCloud.rotation.y += 0.0005;
    }

    if (this.starField) {
      this.starField.rotation.y += 0.0001;
      this.starField.rotation.x += 0.00005;
    }

    this.updateFogColor();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
}

new FractalPlanetApp();
