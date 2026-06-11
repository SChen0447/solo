import * as THREE from 'three';
import gsap from 'gsap';
import { FluidSystem } from './fluidSystem';
import { UIController } from './uiController';
import {
  createGlassMaterial,
  createLampLiquidMaterial,
  createHeatWaveTexture,
  COLOR_THEMES,
  ThemeName,
  ColorTheme,
  lerpColor
} from './materials';

const LAMP_HEIGHT = 5;
const LAMP_RADIUS = 2;
const CORNER_RADIUS = 0.35;

class LavaLampApp {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private clock!: THREE.Clock;
  private container!: HTMLElement;

  private lampGroup!: THREE.Group;
  private lampGlass!: THREE.Mesh;
  private lampLiquid!: THREE.Mesh;
  private lampBase!: THREE.Mesh;
  private lampTop!: THREE.Mesh;
  private heatWaveMesh!: THREE.Mesh;
  private heatWaveTexture!: THREE.CanvasTexture;
  private heatWaveOffsetY: number = 0;
  private heatWaveSpeed: number = 0.5;

  private fluidSystem!: FluidSystem;
  private _uiController!: UIController;

  private currentTheme: ColorTheme;
  private targetBgTop: string;
  private targetBgBottom: string;
  private currentBgTop: string;
  private currentBgBottom: string;

  private cameraAngleY: number = 0;
  private cameraDistance: number = 10;
  private targetCameraAngleY: number = 0;
  private targetCameraDistance: number = 10;
  private cameraTiltX: number = 0.25;
  private targetCameraTiltX: number = 0.25;

  private isDraggingCamera: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private dragAccumulatorX: number = 0;
  private dragAccumulatorY: number = 0;
  private lastDragTime: number = 0;

  private resizeObserver!: ResizeObserver;
  private animationFrameId: number = 0;

  constructor() {
    this.currentTheme = COLOR_THEMES.find(t => t.name === 'neon') || COLOR_THEMES[0];
    this.currentBgTop = this.currentTheme.gradient.top;
    this.currentBgBottom = this.currentTheme.gradient.bottom;
    this.targetBgTop = this.currentBgTop;
    this.targetBgBottom = this.currentBgBottom;

    this.init();
  }

  private init(): void {
    this.container = document.getElementById('canvas-container')!;
    if (!this.container) {
      console.error('Canvas container not found');
      return;
    }

    this.initThree();
    this.initLamp();
    this.initHeatWave();
    this.initFluidSystem();
    this.initUI();
    this.initCameraControls();
    this.initResizeObserver();
    this.startAnimationLoop();

    this.updateCameraPosition();
    void this._uiController;
  }

  private initThree(): void {
    this.scene = new THREE.Scene();
    this.updateSceneBackground();

    const aspect = this.getAspectRatio();
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.camera.position.set(0, 2, this.cameraDistance);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.setupLights();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(5, 8, 5);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.5);
    fillLight.position.set(-5, 3, -5);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff88aa, 0.3);
    rimLight.position.set(0, 5, -8);
    this.scene.add(rimLight);

    const bottomLight = new THREE.PointLight(0xffaa44, 0.6, 15);
    bottomLight.position.set(0, -LAMP_HEIGHT / 2 + 0.5, 0);
    this.scene.add(bottomLight);
  }

  private getAspectRatio(): number {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    return h > 0 ? w / h : 1;
  }

  private createRoundedCylinderGeometry(
    radiusTop: number,
    radiusBottom: number,
    height: number,
    radialSegments: number,
    cornerRadius: number,
    capSegments: number = 8
  ): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const halfHeight = height / 2;
    const cornerCR = Math.min(cornerRadius, Math.min(radiusTop, radiusBottom) * 0.8);
    const totalHeight = height;
    const straightHeight = totalHeight - cornerCR * 2;

    const torusSegments = capSegments;

    let vertexOffset = 0;

    for (let y = 0; y <= 2 + torusSegments * 2; y++) {
      let yPos: number;
      let r: number;
      let normalY: number;
      let normalRadial: number;

      if (y === 0) {
        yPos = -halfHeight;
        r = radiusBottom;
        normalY = -1;
        normalRadial = 0;
      } else if (y <= torusSegments) {
        const t = (y - 0.5) / torusSegments;
        const angle = Math.PI * (1 + t) / 2;
        yPos = -halfHeight + cornerCR * (1 + Math.sin(angle));
        r = radiusBottom - cornerCR * (1 - Math.cos(angle)) * (1 - (radiusBottom - radiusTop) / (radiusBottom * 2));
        normalY = Math.sin(angle);
        normalRadial = Math.cos(angle);
      } else if (y <= torusSegments + 2) {
        const t = (y - torusSegments - 1);
        yPos = -halfHeight + cornerCR + t * straightHeight;
        r = radiusBottom - (radiusBottom - radiusTop) * (cornerCR + t * straightHeight) / totalHeight;
        const slope = (radiusTop - radiusBottom) / totalHeight;
        const normalLen = Math.sqrt(1 + slope * slope);
        normalY = -slope / normalLen;
        normalRadial = 1 / normalLen;
      } else if (y <= torusSegments * 2 + 2) {
        const t = (y - torusSegments - 2.5) / torusSegments;
        const angle = Math.PI * t / 2;
        yPos = halfHeight - cornerCR + cornerCR * Math.sin(angle);
        r = radiusTop - cornerCR * (1 - Math.cos(angle)) * (1 - (radiusBottom - radiusTop) / (radiusTop * 2));
        normalY = Math.sin(angle);
        normalRadial = -Math.cos(angle);
      } else {
        yPos = halfHeight;
        r = radiusTop;
        normalY = 1;
        normalRadial = 0;
      }

      for (let x = 0; x <= radialSegments; x++) {
        const theta = (x / radialSegments) * Math.PI * 2;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);

        positions.push(r * cos, yPos, r * sin);
        normals.push(normalRadial * cos, normalY, normalRadial * sin);
        uvs.push(x / radialSegments, (y) / (2 + torusSegments * 2));
      }

      if (y > 0) {
        const prevOffset = vertexOffset - (radialSegments + 1);
        for (let x = 0; x < radialSegments; x++) {
          const a = prevOffset + x;
          const b = prevOffset + x + 1;
          const c = vertexOffset + x;
          const d = vertexOffset + x + 1;

          indices.push(a, c, b);
          indices.push(b, c, d);
        }
      }

      vertexOffset += radialSegments + 1;
    }

    const bottomCenterIdx = vertexOffset;
    positions.push(0, -halfHeight, 0);
    normals.push(0, -1, 0);
    uvs.push(0.5, 0);
    vertexOffset++;

    for (let x = 0; x <= radialSegments; x++) {
      const theta = (x / radialSegments) * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      positions.push(radiusBottom * cos, -halfHeight, radiusBottom * sin);
      normals.push(0, -1, 0);
      uvs.push(0.5 + cos * 0.5, 0 + sin * 0.5);
      if (x > 0) {
        indices.push(bottomCenterIdx, vertexOffset - 1, vertexOffset);
      }
      vertexOffset++;
    }

    const topCenterIdx = vertexOffset;
    positions.push(0, halfHeight, 0);
    normals.push(0, 1, 0);
    uvs.push(0.5, 1);
    vertexOffset++;

    for (let x = 0; x <= radialSegments; x++) {
      const theta = (x / radialSegments) * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      positions.push(radiusTop * cos, halfHeight, radiusTop * sin);
      normals.push(0, 1, 0);
      uvs.push(0.5 + cos * 0.5, 1 - sin * 0.5);
      if (x > 0) {
        indices.push(topCenterIdx, vertexOffset, vertexOffset - 1);
      }
      vertexOffset++;
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  private initLamp(): void {
    this.lampGroup = new THREE.Group();
    this.scene.add(this.lampGroup);

    const glassGeometry = this.createRoundedCylinderGeometry(
      LAMP_RADIUS, LAMP_RADIUS, LAMP_HEIGHT, 64, CORNER_RADIUS, 8
    );
    const glassMaterial = createGlassMaterial();
    this.lampGlass = new THREE.Mesh(glassGeometry, glassMaterial);
    this.lampGroup.add(this.lampGlass);

    const innerRadius = LAMP_RADIUS - 0.05;
    const innerHeight = LAMP_HEIGHT - 0.1;
    const liquidGeometry = this.createRoundedCylinderGeometry(
      innerRadius, innerRadius, innerHeight, 64, CORNER_RADIUS - 0.02, 8
    );
    const liquidMaterial = createLampLiquidMaterial();
    this.lampLiquid = new THREE.Mesh(liquidGeometry, liquidMaterial);
    this.lampGroup.add(this.lampLiquid);

    const baseGeometry = new THREE.CylinderGeometry(LAMP_RADIUS * 1.15, LAMP_RADIUS * 1.25, 0.4, 64);
    const baseMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1a1a2e,
      metalness: 0.9,
      roughness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1
    });
    this.lampBase = new THREE.Mesh(baseGeometry, baseMaterial);
    this.lampBase.position.y = -LAMP_HEIGHT / 2 - 0.2;
    this.lampGroup.add(this.lampBase);

    const topGeometry = new THREE.CylinderGeometry(LAMP_RADIUS * 1.25, LAMP_RADIUS * 1.15, 0.4, 64);
    this.lampTop = new THREE.Mesh(topGeometry, baseMaterial);
    this.lampTop.position.y = LAMP_HEIGHT / 2 + 0.2;
    this.lampGroup.add(this.lampTop);
  }

  private initHeatWave(): void {
    this.heatWaveTexture = createHeatWaveTexture();

    const innerRadius = LAMP_RADIUS - 0.08;
    const halfHeight = LAMP_HEIGHT / 2 - 0.1;
    const heatWaveGeometry = new THREE.CylinderGeometry(
      innerRadius * 0.98, innerRadius * 0.98, halfHeight, 64, 1, true
    );
    const heatWaveMaterial = new THREE.MeshBasicMaterial({
      map: this.heatWaveTexture,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false
    });

    this.heatWaveMesh = new THREE.Mesh(heatWaveGeometry, heatWaveMaterial);
    this.heatWaveMesh.position.y = -LAMP_HEIGHT / 4 + 0.1;
    this.lampGroup.add(this.heatWaveMesh);
  }

  private initFluidSystem(): void {
    this.fluidSystem = new FluidSystem({
      ballCount: 8,
      minRadius: 0.3,
      maxRadius: 1.0,
      minSpeed: 0.2,
      maxSpeed: 0.5,
      initialTheme: 'neon'
    });
    this.lampGroup.add(this.fluidSystem.group);
  }

  private initUI(): void {
    this._uiController = new UIController({
      onHeatChange: (value: number) => {
        this.fluidSystem.setHeatLevel(value);
        this.updateHeatWave(value);
      },
      onThemeChange: (themeName: ThemeName) => {
        this.handleThemeChange(themeName);
      }
    });
  }

  private updateHeatWave(value: number): void {
    const t = value / 100;
    const mat = this.heatWaveMesh.material as THREE.MeshBasicMaterial;
    gsap.killTweensOf(mat, 'opacity');
    gsap.to(mat, {
      opacity: t * 0.5,
      duration: 0.3,
      ease: 'power2.out'
    });

    this.heatWaveSpeed = 0.5 + t * 1.5;
  }

  private handleThemeChange(themeName: ThemeName): void {
    const theme = COLOR_THEMES.find(t => t.name === themeName);
    if (!theme) return;

    this.currentTheme = theme;
    this.fluidSystem.setTheme(themeName);

    const prevTop = this.currentBgTop;
    const prevBottom = this.currentBgBottom;
    this.targetBgTop = theme.gradient.top;
    this.targetBgBottom = theme.gradient.bottom;
    const progress = { t: 0 };

    gsap.to(progress, {
      t: 1,
      duration: 0.8,
      ease: 'power2.out',
      onUpdate: () => {
        this.currentBgTop = lerpColor(prevTop, this.targetBgTop, progress.t);
        this.currentBgBottom = lerpColor(prevBottom, this.targetBgBottom, progress.t);
        this.updateSceneBackground();
      }
    });
  }

  private updateSceneBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, this.currentBgTop);
    gradient.addColorStop(1, this.currentBgBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    this.scene.background = texture;
  }

  private initCameraControls(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e: MouseEvent) => {
      this.isDraggingCamera = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.dragAccumulatorX = 0;
      this.dragAccumulatorY = 0;
      this.lastDragTime = performance.now();
      canvas.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isDraggingCamera) return;

      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;
      const now = performance.now();

      this.targetCameraAngleY += deltaX * 0.5 * (Math.PI / 180);

      this.dragAccumulatorX += deltaX;
      this.dragAccumulatorY += deltaY;

      if (now - this.lastDragTime > 30) {
        this.fluidSystem.applyDragInertia(this.dragAccumulatorX, this.dragAccumulatorY);
        this.dragAccumulatorX = 0;
        this.dragAccumulatorY = 0;
        this.lastDragTime = now;
      }

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    document.addEventListener('mouseup', () => {
      if (this.isDraggingCamera && (this.dragAccumulatorX !== 0 || this.dragAccumulatorY !== 0)) {
        this.fluidSystem.applyDragInertia(this.dragAccumulatorX, this.dragAccumulatorY);
      }
      this.isDraggingCamera = false;
      this.dragAccumulatorX = 0;
      this.dragAccumulatorY = 0;
      canvas.style.cursor = 'grab';
    });

    canvas.style.cursor = 'grab';

    canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY * 0.001;
      this.targetCameraDistance = Math.min(
        Math.max(this.targetCameraDistance * (1 + delta), 5),
        20
      );
    }, { passive: false });

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartDist = 0;

    canvas.addEventListener('touchstart', (e: TouchEvent) => {
      if (e.touches.length === 1) {
        this.isDraggingCamera = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        this.lastMouseX = touchStartX;
        this.lastMouseY = touchStartY;
        this.dragAccumulatorX = 0;
        this.dragAccumulatorY = 0;
        this.lastDragTime = performance.now();
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDist = Math.sqrt(dx * dx + dy * dy);
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e: TouchEvent) => {
      if (e.touches.length === 1 && this.isDraggingCamera) {
        const deltaX = e.touches[0].clientX - this.lastMouseX;
        const deltaY = e.touches[0].clientY - this.lastMouseY;
        const now = performance.now();

        this.targetCameraAngleY += deltaX * 0.5 * (Math.PI / 180);

        this.dragAccumulatorX += deltaX;
        this.dragAccumulatorY += deltaY;

        if (now - this.lastDragTime > 30) {
          this.fluidSystem.applyDragInertia(this.dragAccumulatorX, this.dragAccumulatorY);
          this.dragAccumulatorX = 0;
          this.dragAccumulatorY = 0;
          this.lastDragTime = now;
        }

        this.lastMouseX = e.touches[0].clientX;
        this.lastMouseY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (touchStartDist > 0) {
          const scale = touchStartDist / dist;
          this.targetCameraDistance = Math.min(Math.max(this.targetCameraDistance * scale, 5), 20);
          touchStartDist = dist;
        }
      }
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
      if (this.isDraggingCamera && (this.dragAccumulatorX !== 0 || this.dragAccumulatorY !== 0)) {
        this.fluidSystem.applyDragInertia(this.dragAccumulatorX, this.dragAccumulatorY);
      }
      this.isDraggingCamera = false;
      this.dragAccumulatorX = 0;
      this.dragAccumulatorY = 0;
      touchStartDist = 0;
    });
  }

  private updateCameraPosition(): void {
    const lerpFactor = 0.08;
    this.cameraAngleY += (this.targetCameraAngleY - this.cameraAngleY) * lerpFactor;
    this.cameraDistance += (this.targetCameraDistance - this.cameraDistance) * lerpFactor;
    this.cameraTiltX += (this.targetCameraTiltX - this.cameraTiltX) * lerpFactor;

    const x = Math.sin(this.cameraAngleY) * Math.cos(this.cameraTiltX) * this.cameraDistance;
    const z = Math.cos(this.cameraAngleY) * Math.cos(this.cameraTiltX) * this.cameraDistance;
    const y = Math.sin(this.cameraTiltX) * this.cameraDistance + 1;

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private initResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    this.resizeObserver.observe(this.container);
    this.handleResize();
  }

  private handleResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = this.getAspectRatio();
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  private updateHeatWaveTexture(deltaTime: number): void {
    this.heatWaveOffsetY += this.heatWaveSpeed * deltaTime;
    if (this.heatWaveOffsetY > 1) this.heatWaveOffsetY -= 1;
    this.heatWaveTexture.offset.y = this.heatWaveOffsetY;

    this.heatWaveTexture.offset.x = Math.sin(performance.now() * 0.001) * 0.02;
    this.heatWaveTexture.needsUpdate = true;
  }

  private startAnimationLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      const deltaTime = Math.min(this.clock.getDelta(), 0.05);
      const now = performance.now();

      this.updateCameraPosition();
      this.fluidSystem.update(deltaTime, now);
      this.updateHeatWaveTexture(deltaTime);

      this.lampGroup.rotation.y = 0;

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.renderer.dispose();
  }
}

let app: LavaLampApp | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new LavaLampApp();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
    app = null;
  }
});
