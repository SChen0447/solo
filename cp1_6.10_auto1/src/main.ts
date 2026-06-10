import * as THREE from 'three';
import { createTerrain, type TerrainData } from './terrain';
import { InteractionManager } from './interaction';
import { UIManager } from './ui';

class App {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock: THREE.Clock;

  private terrain!: TerrainData;
  private interaction!: InteractionManager;
  private ui!: UIManager;

  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight;
  private hemisphereLight!: THREE.HemisphereLight;
  private fogExp2!: THREE.FogExp2;

  private triangleCount: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.renderer = this.createRenderer();
    this.scene = this.createScene();
    this.camera = this.createCamera();

    this.init();
    this.animate = this.animate.bind(this);
    this.animate();
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    renderer.setClearColor(0x1a1a2e);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();

    this.fogExp2 = new THREE.FogExp2(0x1a1a2e, 0.012);
    scene.fog = this.fogExp2;

    this.ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(this.ambientLight);

    this.hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x2d2d44, 0.4);
    scene.add(this.hemisphereLight);

    this.directionalLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
    this.directionalLight.position.set(15, 25, 10);
    this.directionalLight.castShadow = false;
    scene.add(this.directionalLight);

    const fillLight = new THREE.DirectionalLight(0x6688cc, 0.3);
    fillLight.position.set(-10, 10, -15);
    scene.add(fillLight);

    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      55,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      500
    );
    return camera;
  }

  private init(): void {
    this.terrain = createTerrain();
    this.scene.add(this.terrain.mesh);
    this.scene.add(this.terrain.highlightMesh);
    this.triangleCount = this.terrain.getTriangleCount();

    this.createGroundPlane();
    this.createRegionMarkers();

    this.ui = new UIManager();

    this.interaction = new InteractionManager(
      this.camera,
      this.renderer,
      this.terrain,
      {
        onHover: (region, screenX, screenY) => {
          this.ui.showLabel(region, screenX, screenY);
        },
        onClick: (region) => {
          if (region) {
            this.ui.showRadarPanel(region);
          }
        },
        onCenterRegionChange: (region) => {
          this.ui.updateCenterRegion(region);
        },
        onAutoRotateToggle: (enabled) => {
          this.ui.updateAutoRotate(enabled);
        }
      }
    );

    this.ui.updateAutoRotate(true);

    window.addEventListener('resize', this.onResize.bind(this));
    this.onResize();
  }

  private createGroundPlane(): void {
    const groundGeometry = new THREE.PlaneGeometry(120, 120);
    groundGeometry.rotateX(-Math.PI / 2);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d2d44,
      roughness: 1,
      metalness: 0
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.y = -0.1;
    this.scene.add(ground);
  }

  private createRegionMarkers(): void {
    for (const region of this.terrain.regions) {
      const ringGeometry = new THREE.RingGeometry(
        region.radius * 0.3,
        region.radius * 0.35,
        48
      );
      ringGeometry.rotateX(-Math.PI / 2);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: region.color,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.set(region.center.x, 0.05, region.center.y);
      this.scene.add(ring);
    }
  }

  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate(): void {
    requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.interaction.update(deltaTime);
    this.ui.updateStats(deltaTime, this.triangleCount);

    const time = this.clock.getElapsedTime();
    for (let i = 0; i < this.scene.children.length; i++) {
      const child = this.scene.children[i];
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.RingGeometry) {
        child.rotation.z = time * 0.3;
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.interaction.dispose();
    this.renderer.dispose();
    this.terrain.mesh.geometry.dispose();
    (this.terrain.mesh.material as THREE.Material).dispose();
    this.terrain.highlightMesh.geometry.dispose();
    (this.terrain.highlightMesh.material as THREE.Material).dispose();
  }
}

const app = new App();

(window as unknown as { app?: App }).app = app;
