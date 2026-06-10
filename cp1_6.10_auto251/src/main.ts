import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Toolbar } from './toolbar';
import { SceneManager } from './sceneManager';
import { InteractionManager } from './interaction';
import { BlockMesh, ShapeType } from './shapes';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;

  private toolbar: Toolbar;
  private sceneManager: SceneManager;
  private interactionManager: InteractionManager;

  private isDraggingFromToolbar: boolean = false;

  constructor() {
    const canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(10, 10, 12);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 40;
    this.controls.maxPolarAngle = Math.PI / 2.2;
    this.controls.target.set(0, 0, 0);

    this.sceneManager = new SceneManager({
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer
    });

    this.toolbar = new Toolbar();

    this.interactionManager = new InteractionManager(
      this.scene,
      this.camera,
      this.renderer,
      this.sceneManager.getGroundPlane(),
      this.toolbar.getIsMobile()
    );

    this.bindEvents();
    this.setupToolbarDrag();
    this.animate = this.animate.bind(this);
    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);

    this.animate();
  }

  private bindEvents(): void {
    this.toolbar.on({
      onShapeChange: () => {
        this.interactionManager.setCurrentTool(
          this.toolbar.getSelectedShape(),
          this.toolbar.getSelectedColor()
        );
      },
      onColorChange: () => {
        this.interactionManager.setCurrentTool(
          this.toolbar.getSelectedShape(),
          this.toolbar.getSelectedColor()
        );
      },
      onRotationChange: (axis, radians) => {
        this.sceneManager.rotateSelected(axis, radians);
        this.updateInfoPanel();
      },
      onScaleChange: (scale) => {
        this.sceneManager.scaleSelected(scale);
        this.updateInfoPanel();
      },
      onModeToggle: (isNight) => {
        this.sceneManager.toggleNightMode(isNight);
      },
      onDeleteSelected: () => {
        const block = this.sceneManager.getSelectedBlock();
        if (block) {
          this.sceneManager.removeBlock(block);
          this.toolbar.showTransformControls(false);
          this.toolbar.hideInfoPanel();
          this.toolbar.showMobilePanel(false);
        }
      },
      onClearScene: () => {
        this.sceneManager.clearAllBlocks();
        this.toolbar.showTransformControls(false);
        this.toolbar.hideInfoPanel();
        this.toolbar.showMobilePanel(false);
      },
      onBlockSelect: (shape, color) => {
        this.interactionManager.setCurrentTool(shape, color);
        this.interactionManager.activatePlacementMode();
      }
    });

    this.interactionManager.on({
      onBlockPlace: (block: BlockMesh) => {
        this.sceneManager.addBlock(block);
        this.interactionManager.setBlocks(this.sceneManager.getBlocks());
      },
      onBlockSelect: (block: BlockMesh | null) => {
        this.sceneManager.selectBlock(block);
        this.interactionManager.setBlocks(this.sceneManager.getBlocks());
        if (block) {
          this.toolbar.showTransformControls(true);
          this.toolbar.setRotationValues(block.rotation.x, block.rotation.y, block.rotation.z);
          this.toolbar.setScaleValue(block.scale.x);
          if (this.toolbar.getIsMobile()) {
            this.toolbar.showMobilePanel(true);
          }
          this.updateInfoPanel();
        } else {
          this.toolbar.showTransformControls(false);
          this.toolbar.hideInfoPanel();
          this.toolbar.showMobilePanel(false);
        }
      },
      onDragStart: () => {
        this.controls.enabled = false;
      },
      onDragEnd: () => {
        this.controls.enabled = true;
      }
    });

    this.interactionManager.setBlocks(this.sceneManager.getBlocks());
    this.interactionManager.setCurrentTool(
      this.toolbar.getSelectedShape(),
      this.toolbar.getSelectedColor()
    );
  }

  private setupToolbarDrag(): void {
    const shapeButtons = document.querySelectorAll('[data-shape]');
    const colorButtons = document.querySelectorAll('[data-color]');

    const startDrag = (shape: ShapeType, color: string, e: PointerEvent) => {
      if (this.toolbar.getIsMobile()) return;
      e.preventDefault();
      this.isDraggingFromToolbar = true;
      this.interactionManager.startDragFromToolbar(shape, color);
    };

    shapeButtons.forEach(btn => {
      btn.addEventListener('pointerdown', (e) => {
        if (this.toolbar.getIsMobile()) return;
        const shape = (btn as HTMLElement).dataset.shape as ShapeType;
        if (!shape) return;
        const color = this.toolbar.getSelectedColor();
        startDrag(shape, color, e as PointerEvent);
      });
    });

    colorButtons.forEach(btn => {
      btn.addEventListener('pointerdown', (e) => {
        if (this.toolbar.getIsMobile()) return;
        const color = (btn as HTMLElement).dataset.color;
        if (!color) return;
        const shape = this.toolbar.getSelectedShape();
        startDrag(shape, color, e as PointerEvent);
      });
    });
  }

  private updateInfoPanel(): void {
    const block = this.sceneManager.getSelectedBlock();
    if (!block) return;
    this.toolbar.updateInfoPanel(
      { x: block.position.x, y: block.position.y, z: block.position.z },
      { x: block.rotation.x, y: block.rotation.y, z: block.rotation.z },
      block.scale.x
    );
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.interactionManager.setMobile(this.toolbar.getIsMobile());
  }

  private animate(): void {
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.sceneManager.update();
    this.interactionManager.update();

    const selected = this.sceneManager.getSelectedBlock();
    if (selected) {
      this.updateInfoPanel();
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
