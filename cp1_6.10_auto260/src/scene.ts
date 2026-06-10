import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface SceneSettings {
  autoRotate: boolean;
  autoRotateSpeed: number;
  electronSpeed: number;
  crystalOpacity: number;
}

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  public container: HTMLElement;
  public settings: SceneSettings;
  public atomGroup: THREE.Group;
  public crystalGroup: THREE.Group;
  public slicePlane: THREE.Plane;
  private clock: THREE.Clock;
  private animationCallbacks: Array<(delta: number, elapsed: number) => void>;
  private initialCameraPos: THREE.Vector3;
  private initialTarget: THREE.Vector3;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;
    this.animationCallbacks = [];
    this.clock = new THREE.Clock();

    this.settings = {
      autoRotate: true,
      autoRotateSpeed: 0.005,
      electronSpeed: 1.0,
      crystalOpacity: 0.8
    };

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.initialCameraPos = new THREE.Vector3(0, 2, 6);
    this.initialTarget = new THREE.Vector3(0, 0, 0);
    this.camera.position.copy(this.initialCameraPos);
    this.camera.lookAt(this.initialTarget);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = false;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.autoRotate = this.settings.autoRotate;
    this.controls.autoRotateSpeed = 0.5;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 20;
    this.controls.target.copy(this.initialTarget);

    this.atomGroup = new THREE.Group();
    this.atomGroup.position.set(-2.5, 0, 0);
    this.scene.add(this.atomGroup);

    this.crystalGroup = new THREE.Group();
    this.crystalGroup.position.set(2.5, 0, 0);
    this.scene.add(this.crystalGroup);

    this.slicePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.setupLights();
    this.setupResizeHandler();
    this.startRenderLoop();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const dir1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dir1.position.set(5, 10, 7);
    this.scene.add(dir1);

    const dir2 = new THREE.DirectionalLight(0x8899ff, 0.4);
    dir2.position.set(-5, -3, -5);
    this.scene.add(dir2);

    const point = new THREE.PointLight(0xffaa66, 0.5, 10);
    point.position.set(0, 0, 0);
    this.scene.add(point);
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    });
  }

  private startRenderLoop(): void {
    const animate = () => {
      requestAnimationFrame(animate);
      const delta = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();

      this.controls.autoRotate = this.settings.autoRotate;

      for (const cb of this.animationCallbacks) {
        cb(delta, elapsed);
      }

      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  public onAnimate(callback: (delta: number, elapsed: number) => void): void {
    this.animationCallbacks.push(callback);
  }

  public clearAnimationCallbacks(): void {
    this.animationCallbacks = [];
  }

  public resetView(): void {
    this.camera.position.copy(this.initialCameraPos);
    this.controls.target.copy(this.initialTarget);
    this.controls.update();
  }

  public clearGroup(group: THREE.Group): void {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      } else if (child instanceof THREE.Line) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      } else if (child instanceof THREE.Group) {
        this.clearGroup(child);
      }
    }
  }

  public transitionToElement(
    buildAtom: () => void,
    buildCrystal: () => void,
    duration: number = 400
  ): void {
    const startTime = performance.now();
    const startAtomOpacity = this.getGroupOpacity(this.atomGroup);
    const startCrystalOpacity = this.getGroupOpacity(this.crystalGroup);

    const fadeOut = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / (duration / 2), 1);
      const eased = 1 - 0.5 * (1 - Math.cos(Math.PI * t));
      this.setGroupOpacity(this.atomGroup, startAtomOpacity * (1 - eased));
      this.setGroupOpacity(this.crystalGroup, startCrystalOpacity * (1 - eased));

      if (t < 1) {
        requestAnimationFrame(fadeOut);
      } else {
        this.clearGroup(this.atomGroup);
        this.clearGroup(this.crystalGroup);
        buildAtom();
        buildCrystal();
        this.setGroupOpacity(this.atomGroup, 0);
        this.setGroupOpacity(this.crystalGroup, 0);
        requestAnimationFrame(fadeIn);
      }
    };

    const fadeIn = () => {
      const elapsed = performance.now() - startTime - duration / 2;
      const t = Math.min(elapsed / (duration / 2), 1);
      const eased = 1 - 0.5 * (1 - Math.cos(Math.PI * t));
      this.setGroupOpacity(this.atomGroup, eased);
      this.setGroupOpacity(this.crystalGroup, eased);

      if (t < 1) {
        requestAnimationFrame(fadeIn);
      }
    };

    requestAnimationFrame(fadeOut);
  }

  private getGroupOpacity(group: THREE.Group): number {
    for (const child of group.children) {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = Array.isArray(child.material) ? child.material[0] : child.material;
        return (mat as THREE.Material).opacity ?? 1;
      }
      if (child instanceof THREE.Group) {
        const op = this.getGroupOpacity(child);
        if (op > 0) return op;
      }
    }
    return 1;
  }

  public setGroupOpacity(group: THREE.Group, opacity: number): void {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach(mat => {
          (mat as THREE.Material).transparent = opacity < 1;
          (mat as THREE.Material).opacity = opacity;
        });
      } else if (obj instanceof THREE.Line && obj.material) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach(mat => {
          (mat as THREE.Material).transparent = opacity < 1;
          (mat as THREE.Material).opacity = opacity;
        });
      }
    });
  }

  public exportSnapshot(width: number = 1920, height: number = 1080): void {
    const prevSize = new THREE.Vector2();
    this.renderer.getSize(prevSize);
    const prevPixelRatio = this.renderer.getPixelRatio();

    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);

    const dataUrl = this.renderer.domElement.toDataURL('image/png');

    this.renderer.setPixelRatio(prevPixelRatio);
    this.renderer.setSize(prevSize.x, prevSize.y, false);
    this.camera.aspect = prevSize.x / prevSize.y;
    this.camera.updateProjectionMatrix();

    const link = document.createElement('a');
    link.download = `element-furnace-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }
}
