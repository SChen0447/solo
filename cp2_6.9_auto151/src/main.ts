import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { getMoleculeData, getElementInfo, MOLECULE_KEYS, type MoleculeData } from './moleculeData';
import { MoleculeRenderer, type AtomMesh } from './MoleculeRenderer';
import { PerformanceMonitor } from './PerformanceMonitor';

interface ActiveCard {
  id: number;
  element: HTMLElement;
  atomMesh: AtomMesh;
}

const AUTO_ROTATE_SPEED = 3;
const AUTO_ROTATE_RESUME_DELAY = 3000;

class MoleculeViewerApp {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private moleculeRenderer: MoleculeRenderer;
  private performanceMonitor: PerformanceMonitor;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;

  private currentMoleculeKey: string = 'water';
  private currentMoleculeData: MoleculeData | null = null;

  private autoRotateEnabled = true;
  private autoRotatePaused = false;
  private autoRotateResumeTimer: number | null = null;

  private activeCards: ActiveCard[] = [];
  private nextCardId = 1;
  private readonly MAX_CARDS = 5;

  private contextMenu: HTMLElement;
  private menuToggleItem: HTMLElement;

  private switching = false;
  private clock: THREE.Clock;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();
    this.addLights();

    this.moleculeRenderer = new MoleculeRenderer();
    this.scene.add(this.moleculeRenderer.group);

    this.performanceMonitor = new PerformanceMonitor(5000);
    this.performanceMonitor.attachUI('fps-display', 'panel-fps');

    this.contextMenu = document.getElementById('context-menu')!;
    this.menuToggleItem = document.getElementById('menu-toggle')!;

    this.bindEvents();
    this.loadMolecule('water');
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e1a);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(6, 4, 8);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 3;
    controls.maxDistance = 20;
    controls.autoRotate = false;
    return controls;
  }

  private addLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(5, 8, 5);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.5);
    fillLight.position.set(-5, 3, -3);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffaacc, 0.3);
    rimLight.position.set(0, -5, 5);
    this.scene.add(rimLight);
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.onWindowResize());
    this.renderer.domElement.addEventListener('pointerdown', () => this.onPointerDown());
    this.renderer.domElement.addEventListener('pointerup', () => this.onPointerUp());
    this.renderer.domElement.addEventListener('click', (e) => this.onCanvasClick(e));
    this.renderer.domElement.addEventListener('contextmenu', (e) => this.onContextMenu(e));

    document.addEventListener('click', (e) => this.onDocumentClick(e));

    document.querySelectorAll('.molecule-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = (btn as HTMLElement).dataset.molecule;
        if (key && MOLECULE_KEYS.includes(key)) {
          this.loadMolecule(key);
        }
      });
    });

    this.menuToggleItem.addEventListener('click', () => this.onToggleExplode());
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onPointerDown(): void {
    this.autoRotatePaused = true;
    if (this.autoRotateResumeTimer !== null) {
      window.clearTimeout(this.autoRotateResumeTimer);
      this.autoRotateResumeTimer = null;
    }
  }

  private onPointerUp(): void {
    this.autoRotateResumeTimer = window.setTimeout(() => {
      this.autoRotatePaused = false;
    }, AUTO_ROTATE_RESUME_DELAY);
  }

  private onCanvasClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const atomMeshes = this.moleculeRenderer.getAtomMeshes();
    const intersects = this.raycaster.intersectObjects(atomMeshes, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as AtomMesh;
      this.showAtomCard(mesh, event.clientX, event.clientY);
    }
  }

  private onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (target.closest('#context-menu')) return;
    if (target.closest('.atom-card')) return;
    if (target.closest('.molecule-btn')) return;

    this.hideContextMenu();
  }

  private onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    this.contextMenu.style.display = 'block';
    this.contextMenu.style.left = `${event.clientX}px`;
    this.contextMenu.style.top = `${event.clientY}px`;

    this.menuToggleItem.textContent = this.moleculeRenderer.getIsExploded()
      ? '还原视图'
      : '分解视图';

    this.autoRotatePaused = true;
    if (this.autoRotateResumeTimer !== null) {
      window.clearTimeout(this.autoRotateResumeTimer);
      this.autoRotateResumeTimer = null;
    }
  }

  private hideContextMenu(): void {
    this.contextMenu.style.display = 'none';
  }

  private onToggleExplode(): void {
    this.hideContextMenu();
    this.moleculeRenderer.toggleExplode();
  }

  private showAtomCard(atomMesh: AtomMesh, clientX: number, clientY: number): void {
    for (const card of this.activeCards) {
      if (card.atomMesh === atomMesh) {
        this.removeCard(card.id);
        return;
      }
    }

    if (this.activeCards.length >= this.MAX_CARDS) {
      const oldest = this.activeCards[0];
      this.removeCard(oldest.id);
    }

    const info = getElementInfo(atomMesh.userData.atomData.symbol);
    const cardId = this.nextCardId++;

    const cardEl = document.createElement('div');
    cardEl.className = 'atom-card';
    cardEl.dataset.cardId = String(cardId);
    cardEl.innerHTML = `
      <div class="element-name">${info.name} (${atomMesh.userData.atomData.symbol})</div>
      <div class="card-row">
        <span class="card-label">原子序数</span>
        <span class="card-value">${info.atomicNumber}</span>
      </div>
      <div class="card-row">
        <span class="card-label">化学键数</span>
        <span class="card-value">${atomMesh.userData.atomData.bonds}</span>
      </div>
    `;

    const container = document.getElementById('atom-cards')!;
    container.appendChild(cardEl);

    cardEl.style.left = `${clientX + 12}px`;
    cardEl.style.top = `${clientY + 12}px`;

    this.activeCards.push({
      id: cardId,
      element: cardEl,
      atomMesh
    });
  }

  private removeCard(cardId: number): void {
    const idx = this.activeCards.findIndex((c) => c.id === cardId);
    if (idx !== -1) {
      const card = this.activeCards[idx];
      card.element.remove();
      this.activeCards.splice(idx, 1);
    }
  }

  private updateAtomCards(): void {
    const rect = this.renderer.domElement.getBoundingClientRect();

    for (const card of this.activeCards) {
      const screenPos = card.atomMesh.position.clone().project(this.camera);
      const x = (screenPos.x * 0.5 + 0.5) * rect.width + rect.left;
      const y = (-screenPos.y * 0.5 + 0.5) * rect.height + rect.top;
      card.element.style.left = `${x + 12}px`;
      card.element.style.top = `${y + 12}px`;
    }
  }

  private async loadMolecule(key: string): Promise<void> {
    if (this.switching || key === this.currentMoleculeKey) {
      if (key === this.currentMoleculeKey) {
        this.updateActiveButton(key);
      }
      return;
    }

    this.switching = true;
    this.updateActiveButton(key);
    this.clearAtomCards();

    const newData = getMoleculeData(key);
    if (!newData) {
      this.switching = false;
      return;
    }

    if (this.currentMoleculeData) {
      await this.moleculeRenderer.fadeOut();
    }

    this.moleculeRenderer.clear();
    this.moleculeRenderer.build(newData);

    this.currentMoleculeKey = key;
    this.currentMoleculeData = newData;
    this.updateInfoPanel(newData);

    await this.moleculeRenderer.fadeIn();
    this.switching = false;
  }

  private updateActiveButton(key: string): void {
    document.querySelectorAll('.molecule-btn').forEach((btn) => {
      const btnKey = (btn as HTMLElement).dataset.molecule;
      btn.classList.toggle('active', btnKey === key);
    });
  }

  private updateInfoPanel(data: MoleculeData): void {
    const nameEl = document.getElementById('molecule-name');
    const formulaEl = document.getElementById('molecule-formula');
    const atomCountEl = document.getElementById('atom-count');
    const bondCountEl = document.getElementById('bond-count');

    if (nameEl) nameEl.textContent = data.name;
    if (formulaEl) formulaEl.textContent = data.displayFormula;
    if (atomCountEl) atomCountEl.textContent = String(data.atoms.length);
    if (bondCountEl) bondCountEl.textContent = String(data.bonds.length);
  }

  private clearAtomCards(): void {
    for (const card of [...this.activeCards]) {
      card.element.remove();
    }
    this.activeCards = [];
  }

  private autoRotate(delta: number): void {
    if (!this.autoRotateEnabled || this.autoRotatePaused) return;
    if (this.moleculeRenderer.getIsExploded()) return;

    const angle = ((AUTO_ROTATE_SPEED * Math.PI) / 180) * delta;
    this.moleculeRenderer.group.rotation.y += angle;
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();

    this.autoRotate(delta);
    this.controls.update();
    this.updateAtomCards();
    this.performanceMonitor.tick();

    this.renderer.render(this.scene, this.camera);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new MoleculeViewerApp();
});
