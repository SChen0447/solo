import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TerrainGenerator } from './terrainGenerator';
import { UIController } from './uiController';

interface LightConfig {
  type: 'directional' | 'point';
  color: THREE.Color;
  intensity: number;
  position: THREE.Vector3;
  ambientColor: THREE.Color;
  ambientIntensity: number;
}

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private terrainGenerator: TerrainGenerator;
  private uiController: UIController;
  private mainLight: THREE.DirectionalLight | THREE.PointLight;
  private ambientLight: THREE.AmbientLight;
  private clock: THREE.Clock;

  private currentLightMode: string = 'day';
  private targetLightConfig: LightConfig | null = null;
  private lightTransitionProgress: number = 1;
  private readonly lightTransitionDuration: number = 1.5;

  private lightConfigs: Record<string, LightConfig> = {
    day: {
      type: 'directional',
      color: new THREE.Color(0xffffff),
      intensity: 1.2,
      position: new THREE.Vector3(0, 100, 50),
      ambientColor: new THREE.Color(0x87ceeb),
      ambientIntensity: 0.4
    },
    sunset: {
      type: 'directional',
      color: new THREE.Color(0xffa500),
      intensity: 0.9,
      position: new THREE.Vector3(80, 30, 20),
      ambientColor: new THREE.Color(0xff6b35),
      ambientIntensity: 0.35
    },
    night: {
      type: 'point',
      color: new THREE.Color(0x6495ed),
      intensity: 0.8,
      position: new THREE.Vector3(0, 60, 0),
      ambientColor: new THREE.Color(0x1a1a2e),
      ambientIntensity: 0.2
    }
  };

  constructor() {
    this.clock = new THREE.Clock();

    const viewport = document.getElementById('viewport');
    if (!viewport) {
      throw new Error('Viewport element not found');
    }

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d1b2a);
    this.scene.fog = new THREE.Fog(0x0d1b2a, 150, 300);

    this.camera = new THREE.PerspectiveCamera(
      60,
      viewport.clientWidth / viewport.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(80, 70, 80);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(viewport.clientWidth, viewport.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    viewport.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 50;
    this.controls.maxDistance = 250;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.target.set(0, 10, 0);

    this.ambientLight = new THREE.AmbientLight(
      this.lightConfigs.day.ambientColor,
      this.lightConfigs.day.ambientIntensity
    );
    this.scene.add(this.ambientLight);

    this.mainLight = new THREE.DirectionalLight(
      this.lightConfigs.day.color,
      this.lightConfigs.day.intensity
    );
    this.mainLight.position.copy(this.lightConfigs.day.position);
    this.mainLight.castShadow = true;
    this.mainLight.shadow.mapSize.width = 2048;
    this.mainLight.shadow.mapSize.height = 2048;
    this.mainLight.shadow.camera.near = 0.5;
    this.mainLight.shadow.camera.far = 500;
    this.mainLight.shadow.camera.left = -100;
    this.mainLight.shadow.camera.right = 100;
    this.mainLight.shadow.camera.top = 100;
    this.mainLight.shadow.camera.bottom = -100;
    this.scene.add(this.mainLight);

    const gridHelper = new THREE.GridHelper(200, 40, 0x334155, 0x1e293b);
    gridHelper.position.y = -0.1;
    this.scene.add(gridHelper);

    this.terrainGenerator = new TerrainGenerator(this.scene);

    this.uiController = new UIController('drawing-canvas', {
      onDrawingEnd: (canvas) => {
        this.handleDrawingEnd(canvas);
      },
      onLightModeChange: (mode) => {
        this.handleLightModeChange(mode);
      },
      onClear: () => {
        this.handleClear();
      },
      onExport: () => {
        this.handleExport();
      }
    });

    this.setupSplitPane();
    window.addEventListener('resize', this.onWindowResize.bind(this));

    this.animate();
  }

  private setupSplitPane(): void {
    const splitter = document.getElementById('splitter');
    const leftPanel = document.getElementById('left-panel');
    const rightPanel = document.getElementById('right-panel');
    const container = document.getElementById('main-container');

    if (!splitter || !leftPanel || !rightPanel || !container) return;

    let isDragging = false;

    splitter.addEventListener('mousedown', (e) => {
      isDragging = true;
      document.body.style.cursor = 'col-resize';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const containerRect = container.getBoundingClientRect();
      const leftWidth = e.clientX - containerRect.left;
      const totalWidth = containerRect.width;
      const leftPercent = (leftWidth / totalWidth) * 100;

      if (leftPercent > 20 && leftPercent < 80) {
        leftPanel.style.flex = `0 0 ${leftPercent}%`;
        rightPanel.style.flex = `0 0 ${100 - leftPercent}%`;
        this.onWindowResize();
      }
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        document.body.style.cursor = '';
      }
    });
  }

  private handleDrawingEnd(canvas: HTMLCanvasElement): void {
    requestAnimationFrame(() => {
      this.terrainGenerator.generateFromCanvas(canvas);
      const mesh = this.terrainGenerator.getMesh();
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.transparent = true;
      material.opacity = 0;

      const startTime = performance.now();
      const duration = 300;

      const fadeIn = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        material.opacity = eased;

        if (progress < 1) {
          requestAnimationFrame(fadeIn);
        } else {
          material.transparent = false;
        }
      };

      fadeIn();
    });
  }

  private handleLightModeChange(mode: string): void {
    if (mode === this.currentLightMode || !this.lightConfigs[mode]) return;

    this.targetLightConfig = JSON.parse(JSON.stringify(this.lightConfigs[mode]));
    this.targetLightConfig.color = new THREE.Color(this.lightConfigs[mode].color);
    this.targetLightConfig.position = this.lightConfigs[mode].position.clone();
    this.targetLightConfig.ambientColor = new THREE.Color(this.lightConfigs[mode].ambientColor);

    this.lightTransitionProgress = 0;
    this.currentLightMode = mode;
  }

  private updateLightTransition(delta: number): void {
    if (this.lightTransitionProgress >= 1 || !this.targetLightConfig) return;

    this.lightTransitionProgress += delta / this.lightTransitionDuration;
    this.lightTransitionProgress = Math.min(this.lightTransitionProgress, 1);

    const t = this.lightTransitionProgress;
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const startConfig = this.lightConfigs[this.getPreviousLightMode()];

    const currentColor = new THREE.Color().lerpColors(
      startConfig.color,
      this.targetLightConfig.color,
      eased
    );
    (this.mainLight as THREE.DirectionalLight | THREE.PointLight).color.copy(currentColor);

    const currentIntensity = THREE.MathUtils.lerp(
      startConfig.intensity,
      this.targetLightConfig.intensity,
      eased
    );
    this.mainLight.intensity = currentIntensity;

    this.mainLight.position.lerpVectors(
      startConfig.position,
      this.targetLightConfig.position,
      eased
    );

    const ambientColor = new THREE.Color().lerpColors(
      startConfig.ambientColor,
      this.targetLightConfig.ambientColor,
      eased
    );
    this.ambientLight.color.copy(ambientColor);

    const ambientIntensity = THREE.MathUtils.lerp(
      startConfig.ambientIntensity,
      this.targetLightConfig.ambientIntensity,
      eased
    );
    this.ambientLight.intensity = ambientIntensity;

    const bgColor = new THREE.Color(0x0d1b2a);
    if (this.currentLightMode === 'sunset') {
      bgColor.lerp(new THREE.Color(0x1a0a00), eased * 0.3);
    } else if (this.currentLightMode === 'night') {
      bgColor.lerp(new THREE.Color(0x0a0a1a), eased * 0.5);
    }
    this.scene.background = bgColor;
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(bgColor);
    }
  }

  private getPreviousLightMode(): string {
    const modes = Object.keys(this.lightConfigs);
    const currentIndex = modes.indexOf(this.currentLightMode);
    if (currentIndex > 0) {
      return modes[currentIndex - 1];
    }
    return modes[0];
  }

  private handleClear(): void {
    this.terrainGenerator.reset();
  }

  private handleExport(): void {
    const objContent = this.terrainGenerator.exportOBJ();
    if (!objContent) return;

    const blob = new Blob([objContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `terrain_${Date.now()}.obj`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private onWindowResize(): void {
    const viewport = document.getElementById('viewport');
    if (!viewport) return;

    this.camera.aspect = viewport.clientWidth / viewport.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(viewport.clientWidth, viewport.clientHeight);

    this.uiController.resizeCanvas();
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();

    this.controls.update();
    this.updateLightTransition(delta);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.terrainGenerator.dispose();
    this.uiController.dispose();
    this.renderer.dispose();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
