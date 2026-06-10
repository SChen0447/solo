import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import gsap from 'gsap';
import { MoleculeBuilder, MOLECULES, type BuiltMolecule } from './MoleculeBuilder';
import { AnnotationManager } from './AnnotationManager';

class MoleculeViewerApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private moleculeBuilder: MoleculeBuilder;
  private annotationManager: AnnotationManager;
  private currentMolecule: BuiltMolecule | null;
  private moleculeGroup: THREE.Group;
  private elementHighlightStates: Set<string>;
  private pulseElements: Set<string>;
  private clock: THREE.Clock;
  private animationFrameId: number;
  private canvasContainer: HTMLElement;

  constructor() {
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.currentMolecule = null;
    this.moleculeGroup = new THREE.Group();
    this.elementHighlightStates = new Set();
    this.pulseElements = new Set();

    const canvasContainerEl = document.getElementById('canvas-container');
    if (!canvasContainerEl) throw new Error('Canvas container not found');
    this.canvasContainer = canvasContainerEl;

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 6);
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.canvasContainer.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.2;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 5;
    this.controls.screenSpacePanning = true;

    this.moleculeBuilder = new MoleculeBuilder();

    this.annotationManager = new AnnotationManager(
      this.camera,
      this.renderer.domElement,
      this.canvasContainer
    );
    this.annotationManager.setSelectableCheck(this.isObjectSelectable.bind(this));
    this.annotationManager.setOnObjectClick(this.handleObjectClick.bind(this));
    this.annotationManager.setSize(window.innerWidth, window.innerHeight);

    this.scene.add(this.moleculeGroup);

    this.setupLights();
    this.setupHelpers();
    this.setupUI();
    this.setupEventListeners();

    this.animationFrameId = 0;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xffffff, 0.7, 100);
    pointLight1.position.set(5, 5, 5);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xffffff, 0.5, 100);
    pointLight2.position.set(-5, -3, 3);
    this.scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0x7c3aed, 0.3, 100);
    pointLight3.position.set(0, 5, -5);
    this.scene.add(pointLight3);
  }

  private setupHelpers(): void {
    const gridHelper = new THREE.GridHelper(10, 10, 0x55555566, 0x55555566);
    gridHelper.position.y = -3;
    this.scene.add(gridHelper);

    const axesGroup = new THREE.Group();
    axesGroup.position.set(-4, -2.5, 0);

    const axisLen = 1.5;

    const xGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(axisLen, 0, 0)
    ]);
    const xMat = new THREE.LineBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.6 });
    axesGroup.add(new THREE.Line(xGeom, xMat));

    const yGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, axisLen, 0)
    ]);
    const yMat = new THREE.LineBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.6 });
    axesGroup.add(new THREE.Line(yGeom, yMat));

    const zGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, axisLen)
    ]);
    const zMat = new THREE.LineBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.6 });
    axesGroup.add(new THREE.Line(zGeom, zMat));

    const xLabel = this.createAxisLabel('X', 0xff4444);
    xLabel.position.set(axisLen + 0.1, 0, 0);
    axesGroup.add(xLabel);

    const yLabel = this.createAxisLabel('Y', 0x44ff44);
    yLabel.position.set(0, axisLen + 0.1, 0);
    axesGroup.add(yLabel);

    const zLabel = this.createAxisLabel('Z', 0x4488ff);
    zLabel.position.set(0, 0, axisLen + 0.1);
    axesGroup.add(zLabel);

    this.scene.add(axesGroup);
  }

  private createAxisLabel(text: string, color: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.3, 0.3, 0.3);
    return sprite;
  }

  private setupUI(): void {
    const selector = document.getElementById('molecule-selector') as HTMLSelectElement;
    if (selector) {
      selector.addEventListener('change', (e) => {
        const value = (e.target as HTMLSelectElement).value;
        this.loadMolecule(value);
      });
    }

    const hamburger = document.getElementById('hamburger-menu');
    const controlPanel = document.getElementById('control-panel');
    if (hamburger && controlPanel) {
      hamburger.addEventListener('click', () => {
        controlPanel.classList.toggle('open');
      });
    }

    this.loadMolecule('H2O');
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private onWindowResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.annotationManager.setSize(w, h);
  }

  private handleObjectClick(obj: THREE.Object3D | null): void {
    if (!obj) return;
    this.annotationManager.toggleAnnotation(obj);
  }

  private isObjectSelectable(obj: THREE.Object3D): boolean {
    const ud = obj.userData;
    if (ud && ud.type === 'atom') {
      return this.elementHighlightStates.has(ud.element);
    }
    if (ud && ud.type === 'bond') {
      return (
        this.elementHighlightStates.has(ud.atom1) &&
        this.elementHighlightStates.has(ud.atom2)
      );
    }
    return false;
  }

  private updateElementPanel(elements: string[]): void {
    const list = document.getElementById('element-list');
    if (!list) return;
    list.innerHTML = '';

    this.elementHighlightStates.clear();
    this.pulseElements.clear();

    elements.forEach((element) => {
      this.elementHighlightStates.add(element);

      const item = document.createElement('div');
      item.className = 'element-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `element-${element}`;
      checkbox.checked = true;
      checkbox.value = element;

      const color = this.moleculeBuilder.getCPKColor(element);
      const colorDot = document.createElement('div');
      colorDot.className = 'element-color-dot';
      colorDot.style.backgroundColor = `#${color.toString(16).padStart(6, '0')}`;

      const label = document.createElement('label');
      label.htmlFor = checkbox.id;
      label.textContent = element;

      checkbox.addEventListener('change', (e) => {
        const checked = (e.target as HTMLInputElement).checked;
        if (checked) {
          this.elementHighlightStates.add(element);
          this.pulseElements.add(element);
        } else {
          this.elementHighlightStates.delete(element);
          this.pulseElements.delete(element);
        }
        this.updateAtomVisualStates();
      });

      item.appendChild(checkbox);
      item.appendChild(colorDot);
      item.appendChild(label);
      list.appendChild(item);
    });
  }

  private updateAtomVisualStates(): void {
    if (!this.currentMolecule) return;

    this.currentMolecule.atoms.forEach((mesh) => {
      const mat = mesh.material as THREE.MeshPhongMaterial;
      const element = mesh.userData.element;
      if (this.elementHighlightStates.has(element)) {
        mat.transparent = true;
        mat.opacity = 0.9;
      } else {
        mat.transparent = true;
        mat.opacity = 0.2;
      }
    });

    this.currentMolecule.bonds.forEach((mesh) => {
      const mat = mesh.material as THREE.MeshPhongMaterial;
      const a1 = mesh.userData.atom1;
      const a2 = mesh.userData.atom2;
      if (this.elementHighlightStates.has(a1) && this.elementHighlightStates.has(a2)) {
        mat.transparent = true;
        mat.opacity = 0.9;
      } else {
        mat.transparent = true;
        mat.opacity = 0.2;
      }
    });
  }

  public loadMolecule(key: string): void {
    const data = MOLECULES[key];
    if (!data) return;

    const oldMolecule = this.currentMolecule;
    const newMolecule = this.moleculeBuilder.buildMolecule(data);

    newMolecule.group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mat = (obj as THREE.Mesh).material as THREE.MeshPhongMaterial;
        mat.transparent = true;
        mat.opacity = 0;
      }
    });

    this.moleculeGroup.add(newMolecule.group);

    const tl = gsap.timeline();

    if (oldMolecule) {
      const oldTargets: THREE.MeshPhongMaterial[] = [];
      oldMolecule.group.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          oldTargets.push((obj as THREE.Mesh).material as THREE.MeshPhongMaterial);
        }
      });

      tl.to(oldTargets, {
        opacity: 0,
        duration: 0.3,
        onComplete: () => {
          this.annotationManager.reset(null);
          this.moleculeGroup.remove(oldMolecule.group);
          this.moleculeBuilder.disposeMolecule(oldMolecule);
        }
      });
    }

    const newTargets: THREE.MeshPhongMaterial[] = [];
    newMolecule.group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        newTargets.push((obj as THREE.Mesh).material as THREE.MeshPhongMaterial);
      }
    });

    tl.to(newTargets, {
      opacity: 1,
      duration: 0.5,
      delay: oldMolecule ? 0 : 0,
      ease: 'power2.out'
    });

    this.currentMolecule = newMolecule;
    this.annotationManager.reset(newMolecule);
    this.updateElementPanel(newMolecule.uniqueElements);
    this.updateAtomVisualStates();

    const bounds = new THREE.Box3().setFromObject(newMolecule.group);
    const center = new THREE.Vector3();
    bounds.getCenter(center);
    const size = new THREE.Vector3();
    bounds.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetDist = maxDim * 2.5 + 1;

    gsap.to(this.camera.position, {
      x: 0,
      y: 0,
      z: Math.max(2, Math.min(targetDist, 6)),
      duration: 0.5,
      ease: 'power2.out'
    });

    this.controls.target.copy(center);
  }

  public start(): void {
    this.animate();
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    const elapsed = this.clock.getElapsedTime();

    if (this.currentMolecule) {
      this.currentMolecule.atoms.forEach((mesh) => {
        const mat = mesh.material as THREE.MeshPhongMaterial;
        const element = mesh.userData.element;
        if (this.elementHighlightStates.has(element)) {
          const pulse = 0.6 + 0.3 * (0.5 + 0.5 * Math.sin(elapsed * Math.PI * 2));
          mat.opacity = pulse;
          mat.emissive.setHex(this.moleculeBuilder.getCPKColor(element));
          mat.emissiveIntensity = 0.2 * (0.5 + 0.5 * Math.sin(elapsed * Math.PI * 2));
        }
      });
    }

    this.controls.update();
    this.annotationManager.update();
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onWindowResize.bind(this));

    if (this.currentMolecule) {
      this.moleculeBuilder.disposeMolecule(this.currentMolecule);
    }

    this.annotationManager.dispose();
    this.controls.dispose();
    this.renderer.dispose();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new MoleculeViewerApp();
  app.start();
});
