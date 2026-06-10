import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { MoleculeData, AtomData } from './parseMolecule';
import {
  createMoleculeModel,
  disposeMoleculeModel,
  switchRenderMode,
  type RenderMode,
  type RenderedMolecule,
  type AtomMeshUserData,
} from './renderModels';

const INITIAL_CAMERA_POSITION = new THREE.Vector3(0, 2, 4);
const INITIAL_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);
const AUTOROTATE_SPEED = (30 * Math.PI) / 180;

export interface SceneCallbacks {
  onAtomHover: (atomData: AtomData | null) => void;
}

export class SceneManager {
  private canvas: HTMLCanvasElement;
  private labelContainer: HTMLElement;

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private labelRenderer: CSS2DRenderer;
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;

  private moleculeGroup: THREE.Group | null = null;
  private renderedMolecule: RenderedMolecule | null = null;
  private moleculeData: MoleculeData | null = null;
  private atomLabels: CSS2DObject[] = [];

  private currentMode: RenderMode = 'ballstick';
  private isAutoRotating = false;
  private labelsVisible = true;

  private hoveredAtom: THREE.Mesh | null = null;
  private originalEmissive = new THREE.Color(0x000000);

  private transitionActive = false;
  private transitionStart = 0;
  private transitionDuration = 300;
  private transitionMode: RenderMode = 'ballstick';

  private cameraAnimating = false;
  private cameraAnimStart = 0;
  private cameraAnimDuration = 500;
  private cameraAnimFromPos = new THREE.Vector3();
  private cameraAnimFromTarget = new THREE.Vector3();

  private animationFrameId: number | null = null;
  private callbacks: SceneCallbacks;
  private clock: THREE.Clock;

  constructor(
    canvas: HTMLCanvasElement,
    labelContainer: HTMLElement,
    callbacks: SceneCallbacks
  ) {
    this.canvas = canvas;
    this.labelContainer = labelContainer;
    this.callbacks = callbacks;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d1117);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.copy(INITIAL_CAMERA_POSITION);
    this.camera.lookAt(INITIAL_CAMERA_TARGET);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    const labelDom = this.labelRenderer.domElement;
    labelDom.style.position = 'absolute';
    labelDom.style.top = '0';
    labelDom.style.left = '0';
    labelDom.style.pointerEvents = 'none';
    this.labelContainer.appendChild(labelDom);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 5;
    this.controls.target.copy(INITIAL_CAMERA_TARGET);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.setupLights();
    this.setupEventListeners();
    this.startAnimationLoop();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(5, 5, 5);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight2.position.set(-5, 3, -5);
    this.scene.add(dirLight2);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.handleResize);
    this.canvas.addEventListener('pointermove', this.handlePointerMove);
    this.canvas.addEventListener('pointerleave', this.handlePointerLeave);
  }

  private handleResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.labelRenderer.setSize(width, height);
  };

  private handlePointerMove = (event: PointerEvent): void => {
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.checkHover();
  };

  private handlePointerLeave = (): void => {
    this.setHoveredAtom(null);
  };

  private checkHover(): void {
    if (!this.renderedMolecule) {
      this.setHoveredAtom(null);
      return;
    }

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.renderedMolecule.atomMeshes);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      this.setHoveredAtom(mesh);
    } else {
      this.setHoveredAtom(null);
    }
  }

  private setHoveredAtom(mesh: THREE.Mesh | null): void {
    if (this.hoveredAtom === mesh) return;

    if (this.hoveredAtom) {
      const mat = this.hoveredAtom.material as THREE.MeshPhongMaterial;
      mat.emissive.copy(this.originalEmissive);
    }

    this.hoveredAtom = mesh;

    if (mesh) {
      const mat = mesh.material as THREE.MeshPhongMaterial;
      this.originalEmissive.copy(mat.emissive);
      const emissiveColor = mat.color.clone().multiplyScalar(1.5);
      mat.emissive.copy(emissiveColor);

      const userData = mesh.userData as AtomMeshUserData;
      this.callbacks.onAtomHover(userData.atomData);
    } else {
      this.callbacks.onAtomHover(null);
    }
  }

  private startAnimationLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      this.update();
      this.render();
    };
    animate();
  }

  private update(): void {
    const delta = this.clock.getDelta();

    if (this.isAutoRotating && this.moleculeGroup && !this.controls.enableRotate === false) {
      this.moleculeGroup.rotation.y += AUTOROTATE_SPEED * delta;
    }

    if (this.transitionActive && this.renderedMolecule && this.moleculeData) {
      const elapsed = performance.now() - this.transitionStart;
      const progress = Math.min(elapsed / this.transitionDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      if (progress >= 1) {
        this.rebuildModel(this.transitionMode);
        this.transitionActive = false;
        this.currentMode = this.transitionMode;
      } else {
        switchRenderMode(this.renderedMolecule, this.moleculeData, this.transitionMode, eased);
      }
    }

    if (this.cameraAnimating) {
      const elapsed = performance.now() - this.cameraAnimStart;
      const progress = Math.min(elapsed / this.cameraAnimDuration, 1);
      const t = progress;

      this.camera.position.lerpVectors(
        this.cameraAnimFromPos,
        INITIAL_CAMERA_POSITION,
        t
      );
      this.controls.target.lerpVectors(
        this.cameraAnimFromTarget,
        INITIAL_CAMERA_TARGET,
        t
      );

      if (progress >= 1) {
        this.cameraAnimating = false;
      }
    }

    this.controls.update();
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }

  private rebuildModel(mode: RenderMode): void {
    if (!this.moleculeData) return;

    this.clearCurrentMolecule();
    this.renderedMolecule = createMoleculeModel(this.moleculeData, mode);
    this.moleculeGroup = this.renderedMolecule.group;
    this.scene.add(this.moleculeGroup);
    this.createAtomLabels(this.moleculeData);
    this.updateLabelsVisibility();
  }

  private createAtomLabels(moleculeData: MoleculeData): void {
    this.clearLabels();
    if (!this.renderedMolecule) return;

    moleculeData.atoms.forEach((atomData, index) => {
      const div = document.createElement('div');
      div.className = 'atom-label';
      div.textContent = atomData.symbol;
      div.style.marginTop = '-20px';

      const label = new CSS2DObject(div);
      const mesh = this.renderedMolecule!.atomMeshes[index];
      mesh.add(label);
      this.atomLabels.push(label);
    });
  }

  private clearLabels(): void {
    this.atomLabels.forEach((label) => {
      label.removeFromParent();
      if (label.element instanceof HTMLElement && label.element.parentElement) {
        label.element.parentElement.removeChild(label.element);
      }
    });
    this.atomLabels = [];
  }

  private clearCurrentMolecule(): void {
    this.clearLabels();
    if (this.renderedMolecule) {
      this.scene.remove(this.renderedMolecule.group);
      disposeMoleculeModel(this.renderedMolecule);
      this.renderedMolecule = null;
      this.moleculeGroup = null;
    }
  }

  public loadMolecule(moleculeData: MoleculeData): void {
    this.moleculeData = moleculeData;
    this.rebuildModel(this.currentMode);
  }

  public setRenderMode(mode: RenderMode): void {
    if (mode === this.currentMode || this.transitionActive || !this.moleculeData) return;

    this.transitionActive = true;
    this.transitionStart = performance.now();
    this.transitionMode = mode;
  }

  public setAutoRotate(enabled: boolean): void {
    this.isAutoRotating = enabled;
  }

  public setLabelsVisible(visible: boolean): void {
    this.labelsVisible = visible;
    this.updateLabelsVisibility();
  }

  private updateLabelsVisibility(): void {
    this.atomLabels.forEach((label) => {
      if (label.element instanceof HTMLElement) {
        if (this.labelsVisible) {
          label.element.classList.remove('hidden');
        } else {
          label.element.classList.add('hidden');
        }
      }
    });
  }

  public resetCamera(): void {
    if (this.cameraAnimating) return;

    this.cameraAnimating = true;
    this.cameraAnimStart = performance.now();
    this.cameraAnimFromPos.copy(this.camera.position);
    this.cameraAnimFromTarget.copy(this.controls.target);
  }

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.handleResize);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerleave', this.handlePointerLeave);

    this.clearCurrentMolecule();
    this.controls.dispose();
    this.renderer.dispose();
  }
}
