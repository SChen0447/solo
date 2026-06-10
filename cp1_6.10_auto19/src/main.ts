import * as THREE from 'three';
import { DrawingManager } from './drawing';
import { extrudeCurveTo3D, ExtrudedModel } from './extrude';
import { SceneInteraction } from './interaction';

interface AppState {
  pendingStrokes: THREE.Vector2[][];
  models: ExtrudedModel[];
  isClearing: boolean;
}

class SketchTo3DApp {
  private container: HTMLElement;
  private threeCanvas: HTMLCanvasElement;
  private drawingCanvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private sceneGroup: THREE.Group;
  private drawingManager: DrawingManager;
  private interaction: SceneInteraction;
  private state: AppState;
  private countEl: HTMLElement;
  private countNumEl: HTMLElement;
  private countVisible = false;

  private clock: THREE.Clock;
  private animationId: number | null = null;

  constructor() {
    this.container = document.getElementById('app')!;
    this.state = {
      pendingStrokes: [],
      models: [],
      isClearing: false
    };
    this.clock = new THREE.Clock();

    this.threeCanvas = document.createElement('canvas');
    this.threeCanvas.style.position = 'absolute';
    this.threeCanvas.style.inset = '0';
    this.threeCanvas.style.width = '100%';
    this.threeCanvas.style.height = '100%';
    this.threeCanvas.style.zIndex = '1';

    this.drawingCanvas = document.createElement('canvas');
    this.drawingCanvas.style.position = 'absolute';
    this.drawingCanvas.style.inset = '0';
    this.drawingCanvas.style.width = '100%';
    this.drawingCanvas.style.height = '100%';
    this.drawingCanvas.style.zIndex = '2';
    this.drawingCanvas.style.touchAction = 'none';

    this.container.appendChild(this.threeCanvas);
    this.container.appendChild(this.drawingCanvas);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    this.sceneGroup = new THREE.Group();
    this.scene.add(this.sceneGroup);

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 1.5, 9);
    this.camera.lookAt(0, 0.5, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.threeCanvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.setupLights();

    this.drawingManager = new DrawingManager(this.drawingCanvas, {
      onStrokeComplete: (points) => {
        this.state.pendingStrokes.push(points);
      }
    });

    this.interaction = new SceneInteraction(
      this.camera,
      this.sceneGroup,
      this.threeCanvas
    );

    this.countEl = document.getElementById('count')!;
    this.countNumEl = document.getElementById('count-num')!;

    this.bindUI();
    this.bindKeyboard();

    window.addEventListener('resize', this.onResize);
    this.onResize();

    this.animate();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xfff8f0, 0xe8e8e8, 0.4);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff0e0, 1.0);
    keyLight.position.set(5, 8, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left = -15;
    keyLight.shadow.camera.right = 15;
    keyLight.shadow.camera.top = 15;
    keyLight.shadow.camera.bottom = -15;
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = 50;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe0f0ff, 0.35);
    fillLight.position.set(-6, 4, -4);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffe0c0, 0.25);
    rimLight.position.set(0, 3, -8);
    this.scene.add(rimLight);
  }

  private bindUI(): void {
    const btnExtrude = document.getElementById('btn-extrude')!;
    const btnClear = document.getElementById('btn-clear')!;
    const btnUndo = document.getElementById('btn-undo')!;

    btnExtrude.addEventListener('click', () => this.extrudePending());
    btnClear.addEventListener('click', () => this.clearAll());
    btnUndo.addEventListener('click', () => this.undoLast());
  }

  private bindKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this.undoLast();
      }
    });
  }

  private onResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private extrudePending(): void {
    if (this.state.pendingStrokes.length === 0) return;

    for (const stroke of this.state.pendingStrokes) {
      try {
        const model = extrudeCurveTo3D(
          stroke,
          this.camera,
          window.innerWidth,
          window.innerHeight
        );
        this.sceneGroup.add(model.group);
        this.state.models.push(model);
        this.interaction.registerModel(model);

        this.animateSpawn(model);
      } catch (err) {
        console.warn('挤出失败:', err);
      }
    }
    this.state.pendingStrokes = [];
    this.drawingManager.clearAllStrokes();
    this.updateCountDisplay();
  }

  private animateSpawn(model: ExtrudedModel): void {
    const startScale = 0.01;
    const targetScale = 1;
    const duration = 350;
    const startTime = performance.now();
    model.group.scale.setScalar(startScale);

    const anim = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const scale = startScale + (targetScale - startScale) * eased;
      model.group.scale.setScalar(scale);
      if (t < 1) requestAnimationFrame(anim);
    };
    anim();
  }

  private undoLast(): void {
    if (this.state.isClearing) return;

    if (this.state.pendingStrokes.length > 0) {
      this.state.pendingStrokes.pop();
      this.drawingManager.undoLastStroke();
      return;
    }

    if (this.state.models.length > 0) {
      const model = this.state.models.pop()!;
      this.interaction.unregisterModel(model);
      this.animateDespawn(model, () => {
        this.sceneGroup.remove(model.group);
        model.dispose();
      });
      this.updateCountDisplay();
    }
  }

  private animateDespawn(model: ExtrudedModel, onDone: () => void): void {
    const startScale = model.group.scale.x;
    const duration = 250;
    const startTime = performance.now();

    const anim = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = t * t;
      const scale = startScale * (1 - eased);
      model.group.scale.setScalar(Math.max(0.001, scale));
      if (t < 1) {
        requestAnimationFrame(anim);
      } else {
        onDone();
      }
    };
    anim();
  }

  private clearAll(): void {
    if (this.state.isClearing) return;
    if (this.state.models.length === 0 && this.state.pendingStrokes.length === 0) return;

    this.state.isClearing = true;
    this.drawingManager.clearAllStrokes();
    this.state.pendingStrokes = [];

    const modelsToClear = [...this.state.models];
    this.state.models = [];
    this.interaction.clearModels();

    this.interaction.explodeModels(
      this.scene,
      modelsToClear,
      () => {
        this.state.isClearing = false;
        this.updateCountDisplay();
      }
    );
  }

  private updateCountDisplay(): void {
    const count = this.state.models.length;
    this.countNumEl.textContent = String(count);

    if (count > 0 && !this.countVisible) {
      this.countVisible = true;
      this.countEl.classList.add('visible');
    } else if (count === 0 && this.countVisible) {
      this.countVisible = false;
      this.countEl.classList.remove('visible');
    }
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    const delta = Math.min(0.05, this.clock.getDelta());

    this.interaction.update(delta);
    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.onResize);
    for (const model of this.state.models) {
      this.sceneGroup.remove(model.group);
      model.dispose();
    }
    this.renderer.dispose();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new SketchTo3DApp();
});
