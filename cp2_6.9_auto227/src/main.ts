import * as THREE from 'three';
import { GUI } from 'dat.gui';
import {
  generateLayers,
  updateLayerOpacity,
  regenerateLayersWithNoise,
  getLayerAtY,
  type LayerResult,
  type LayerInfo,
} from './rockLayers';
import {
  generateVeins,
  updateParticles,
  disposeVeins,
  type VeinData,
} from './oreVeins';
import { InteractionManager } from './interaction';

const SCENE_BOUNDS = {
  width: 500,
  depth: 500,
  totalHeight: 300,
};

interface GUIParams {
  opacity: number;
  noiseAmplitude: number;
  veinDensity: number;
  autoRotateSpeed: number;
}

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private gui: GUI;
  private interaction: InteractionManager;

  private layerResult: LayerResult | null = null;
  private veins: VeinData[] = [];
  private rockGroup: THREE.Group;
  private veinGroup: THREE.Group;

  private params: GUIParams = {
    opacity: 0.7,
    noiseAmplitude: 5,
    veinDensity: 1.0,
    autoRotateSpeed: 0.005,
  };

  private clock: THREE.Clock;
  private autoRotateEnabled = true;
  private autoRotateTimer: number | null = null;
  private popupTimer: number | null = null;

  private infoPopup: HTMLElement;
  private popupDot: HTMLElement;
  private popupType: HTMLElement;
  private popupLayer: HTMLElement;
  private popupDepth: HTMLElement;
  private popupReserve: HTMLElement;
  private popupLength: HTMLElement;

  constructor() {
    this.container = document.getElementById('three-container') as HTMLElement;
    this.infoPopup = document.getElementById('info-popup') as HTMLElement;
    this.popupDot = this.infoPopup.querySelector('.popup-dot') as HTMLElement;
    this.popupType = this.infoPopup.querySelector('.popup-type') as HTMLElement;
    this.popupLayer = document.getElementById('popup-layer') as HTMLElement;
    this.popupDepth = document.getElementById('popup-depth') as HTMLElement;
    this.popupReserve = document.getElementById('popup-reserve') as HTMLElement;
    this.popupLength = document.getElementById('popup-length') as HTMLElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d0d1a);
    this.scene.fog = new THREE.Fog(0x0d0d1a, 800, 2000);

    this.clock = new THREE.Clock();

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      5000
    );
    this.camera.position.set(600, 400, 600);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.container as HTMLCanvasElement,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.rockGroup = new THREE.Group();
    this.veinGroup = new THREE.Group();
    this.scene.add(this.rockGroup);
    this.scene.add(this.veinGroup);

    this.setupLights();
    this.generateAll();

    this.interaction = new InteractionManager({
      domElement: this.renderer.domElement,
      camera: this.camera,
      veinMeshes: this.veins.map(v => v.mesh),
      callbacks: {
        onVeinHover: this.handleVeinHover.bind(this),
        onVeinClick: this.handleVeinClick.bind(this),
        onUserInteraction: this.handleUserInteraction.bind(this),
      },
    });

    this.gui = this.createGUI();
    this.styleGUI();

    window.addEventListener('resize', this.handleResize.bind(this));

    this.animate();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(400, 600, 300);
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x8899ff, 0.25);
    fillLight.position.set(-300, 200, -400);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffcc88, 0.2);
    rimLight.position.set(0, -200, 500);
    this.scene.add(rimLight);
  }

  private clearGroup(group: THREE.Group): void {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material?.dispose();
        }
      } else if (child instanceof THREE.LineSegments) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
    }
  }

  private generateAll(): void {
    this.clearGroup(this.rockGroup);
    disposeVeins(this.veins);
    this.clearGroup(this.veinGroup);
    this.veins = [];

    this.layerResult = generateLayers({
      width: SCENE_BOUNDS.width,
      depth: SCENE_BOUNDS.depth,
      totalHeight: SCENE_BOUNDS.totalHeight,
      noiseAmplitude: this.params.noiseAmplitude,
      opacity: this.params.opacity,
    });

    this.layerResult.meshes.forEach(m => this.rockGroup.add(m));
    this.layerResult.edges.forEach(e => this.rockGroup.add(e));

    const veinResult = generateVeins({
      bounds: SCENE_BOUNDS,
      density: this.params.veinDensity,
      layerInfo: this.layerResult.layerInfo,
    });

    this.veins = veinResult.veins;
    this.veins.forEach(v => {
      this.veinGroup.add(v.mesh);
      this.veinGroup.add(v.particles);
    });

    if (this.interaction) {
      this.interaction.updateVeinMeshes(this.veins.map(v => v.mesh));
    }
  }

  private regenerateVeins(): void {
    disposeVeins(this.veins);
    this.clearGroup(this.veinGroup);
    this.veins = [];

    if (!this.layerResult) return;

    const veinResult = generateVeins({
      bounds: SCENE_BOUNDS,
      density: this.params.veinDensity,
      layerInfo: this.layerResult.layerInfo,
    });

    this.veins = veinResult.veins;
    this.veins.forEach(v => {
      this.veinGroup.add(v.mesh);
      this.veinGroup.add(v.particles);
    });

    this.interaction.updateVeinMeshes(this.veins.map(v => v.mesh));
  }

  private createGUI(): GUI {
    const guiContainer = document.getElementById('gui-container') as HTMLElement;
    const gui = new GUI({ autoPlace: false, width: 280 });
    guiContainer.appendChild(gui.domElement);

    gui.add(this.params, 'opacity', 0.2, 1.0, 0.01)
      .name('岩层透明度')
      .onChange((val: number) => {
        if (this.layerResult) {
          updateLayerOpacity(this.layerResult.meshes, val);
        }
      });

    gui.add(this.params, 'noiseAmplitude', 0, 15, 0.5)
      .name('断层起伏强度')
      .onChange((val: number) => {
        if (this.layerResult) {
          regenerateLayersWithNoise(
            this.layerResult.meshes,
            this.layerResult.edges,
            this.layerResult.layerInfo,
            val
          );
        }
      });

    gui.add(this.params, 'veinDensity', 0.5, 2.0, 0.1)
      .name('矿脉密度系数')
      .onFinishChange(() => {
        this.regenerateVeins();
      });

    gui.add(this.params, 'autoRotateSpeed', 0, 0.02, 0.001)
      .name('自动旋转速度')
      .onChange((val: number) => {
        this.autoRotateEnabled = val > 0;
      });

    return gui;
  }

  private styleGUI(): void {
    const dom = this.gui.domElement;
    dom.style.background = 'rgba(0, 0, 0, 0.7)';
    dom.style.borderRadius = '8px';
    dom.style.padding = '4px';
    dom.style.backdropFilter = 'blur(8px)';
    dom.style.webkitBackdropFilter = 'blur(8px)';
    dom.style.border = '1px solid rgba(255,255,255,0.08)';
    dom.style.color = '#ffffff';
  }

  private handleVeinHover(vein: VeinData | null, screenX: number, screenY: number): void {
    if (!vein) return;
  }

  private handleVeinClick(vein: VeinData, screenX: number, screenY: number): void {
    this.showPopup(vein, screenX, screenY);
  }

  private handleUserInteraction(): void {
    this.autoRotateEnabled = false;

    if (this.autoRotateTimer !== null) {
      window.clearTimeout(this.autoRotateTimer);
    }

    this.autoRotateTimer = window.setTimeout(() => {
      this.autoRotateEnabled = this.params.autoRotateSpeed > 0;
    }, 3000);
  }

  private showPopup(vein: VeinData, screenX: number, screenY: number): void {
    if (this.popupTimer !== null) {
      window.clearTimeout(this.popupTimer);
    }

    const layerInfo = this.layerResult?.layerInfo ?? [];
    const surfaceY = layerInfo[0]?.yStart ?? 150;
    const midPoint = vein.curve.getPointAt(0.5);
    const layer = getLayerAtY(layerInfo, midPoint.y);
    const depthFromSurface = Math.max(0, surfaceY - midPoint.y);

    this.popupDot.style.color = vein.color;
    this.popupDot.style.backgroundColor = vein.color;
    this.popupType.textContent = vein.name;
    this.popupLayer.textContent = layer ? layer.name : '未知岩层';
    this.popupDepth.textContent = `${depthFromSurface.toFixed(1)} 单位`;
    this.popupReserve.textContent = `${vein.estimatedReserve.toFixed(1)}%`;
    this.popupLength.textContent = `${vein.length.toFixed(1)} 单位`;

    const popupWidth = 240;
    const popupHeight = 160;
    let left = screenX + 16;
    let top = screenY + 16;

    if (left + popupWidth > window.innerWidth - 10) {
      left = screenX - popupWidth - 16;
    }
    if (top + popupHeight > window.innerHeight - 10) {
      top = screenY - popupHeight - 16;
    }
    left = Math.max(10, left);
    top = Math.max(10, top);

    this.infoPopup.style.left = `${left}px`;
    this.infoPopup.style.top = `${top}px`;
    this.infoPopup.classList.add('visible');

    this.popupTimer = window.setTimeout(() => {
      this.infoPopup.classList.remove('visible');
      this.popupTimer = null;
    }, 2000);
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    if (this.autoRotateEnabled && this.params.autoRotateSpeed > 0) {
      const angle = this.params.autoRotateSpeed * delta * 60;
      this.rockGroup.rotation.y += angle;
      this.veinGroup.rotation.y += angle;
    }

    updateParticles(this.veins, delta, 1);

    this.interaction.update();
    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
