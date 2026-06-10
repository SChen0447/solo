import * as THREE from 'three';
import { loadGeneData, type GeneNode } from './geneData';
import { GeneScatterBuilder } from './GeneScatterBuilder';
import { InteractionManager } from './InteractionManager';
import './style.css';

class GeneApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private builder: GeneScatterBuilder | null = null;
  private interaction: InteractionManager | null = null;
  private clock: THREE.Clock = new THREE.Clock();
  private totalGenes: number = 50;

  private fpsCounter: number = 0;
  private fpsTime: number = 0;
  private currentFps: number = 60;

  constructor() {
    const canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e1a);

    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 15);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = false;

    (this.scene.userData as any).renderer = this.renderer;
    (this.scene.userData as any).camera = this.camera;

    this.setupLights();
    this.setupUI();
    this.init();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 15, 10);
    this.scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0x4fc3f7, 0.5, 50);
    pointLight1.position.set(-10, -5, -10);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff4500, 0.3, 50);
    pointLight2.position.set(10, 5, -10);
    this.scene.add(pointLight2);
  }

  private setupUI(): void {
    const thresholdSlider = document.getElementById('threshold-slider') as HTMLInputElement;
    const thresholdValue = document.getElementById('threshold-value') as HTMLElement;
    const resetBtn = document.getElementById('reset-view-btn') as HTMLButtonElement;
    const snapshotBtn = document.getElementById('snapshot-btn') as HTMLButtonElement;
    const detailPanel = document.getElementById('detail-panel') as HTMLElement;
    const detailClose = document.getElementById('detail-close') as HTMLButtonElement;
    const panelToggle = document.getElementById('panel-toggle') as HTMLButtonElement;
    const panelFab = document.getElementById('panel-fab') as HTMLButtonElement;
    const controlPanel = document.getElementById('control-panel') as HTMLElement;

    thresholdSlider.addEventListener('input', () => {
      const value = parseInt(thresholdSlider.value, 10);
      thresholdValue.textContent = value.toString();
      if (this.builder) {
        const visible = this.builder.applyThreshold(value);
        const geneCountEl = document.getElementById('gene-count') as HTMLElement;
        if (geneCountEl) geneCountEl.textContent = visible.toString();
      }
    });

    resetBtn.addEventListener('click', () => {
      this.interaction?.resetView();
    });

    snapshotBtn.addEventListener('click', () => {
      this.takeSnapshot();
    });

    detailClose.addEventListener('click', () => {
      detailPanel.classList.add('hidden');
    });

    let isPanelCollapsed = false;
    panelToggle.addEventListener('click', () => {
      isPanelCollapsed = !isPanelCollapsed;
      controlPanel.classList.toggle('collapsed', isPanelCollapsed);
      panelToggle.textContent = isPanelCollapsed ? '+' : '−';
    });

    panelFab.addEventListener('click', () => {
      controlPanel.classList.toggle('show-mobile');
    });

    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  private showGeneDetail(gene: GeneNode): void {
    const detailPanel = document.getElementById('detail-panel') as HTMLElement;
    document.getElementById('detail-gene-name')!.textContent = gene.name;
    document.getElementById('detail-gene-id')!.textContent = gene.id;
    document.getElementById('detail-expression')!.textContent = `${gene.expression.toFixed(2)} / 100`;
    document.getElementById('detail-coord-x')!.textContent = gene.x.toFixed(3);
    document.getElementById('detail-coord-y')!.textContent = gene.y.toFixed(3);
    document.getElementById('detail-coord-z')!.textContent = gene.z.toFixed(3);

    const relatedList = document.getElementById('detail-related-list') as HTMLElement;
    relatedList.innerHTML = '';
    if (gene.relatedGenes.length === 0) {
      relatedList.innerHTML = '<span class="no-related">无高相关基因</span>';
    } else {
      for (const relatedId of gene.relatedGenes.slice(0, 10)) {
        const relatedGene = this.builder?.getGeneById(relatedId);
        if (relatedGene) {
          const chip = document.createElement('span');
          chip.className = 'related-chip';
          chip.textContent = relatedGene.name;
          chip.title = `ID: ${relatedGene.id}, 表达: ${relatedGene.expression.toFixed(1)}`;
          relatedList.appendChild(chip);
        }
      }
      if (gene.relatedGenes.length > 10) {
        const more = document.createElement('span');
        more.className = 'more-related';
        more.textContent = `+${gene.relatedGenes.length - 10} 更多`;
        relatedList.appendChild(more);
      }
    }

    detailPanel.classList.remove('hidden');
  }

  private takeSnapshot(): void {
    if (!this.builder) return;
    const dataUrl = this.builder.getSnapshot(1920, 1080);
    if (!dataUrl) return;

    const link = document.createElement('a');
    link.download = `gene-expression-${Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private async init(): Promise<void> {
    const genes = await loadGeneData();
    this.totalGenes = genes.length;

    this.builder = new GeneScatterBuilder(this.scene);
    this.builder.build(genes);

    const labelContainer = document.getElementById('label-container') as HTMLElement;
    const canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;
    this.interaction = new InteractionManager({
      canvas,
      labelContainer,
      camera: this.camera,
      builder: this.builder
    });
    this.interaction.setOnGeneClick((gene) => this.showGeneDetail(gene));
    canvas.style.cursor = 'grab';

    const geneCountEl = document.getElementById('gene-count') as HTMLElement;
    if (geneCountEl) geneCountEl.textContent = this.totalGenes.toString();

    this.animate();
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.05);

    this.fpsCounter++;
    this.fpsTime += delta;
    if (this.fpsTime >= 0.5) {
      this.currentFps = Math.round(this.fpsCounter / this.fpsTime);
      const fpsEl = document.getElementById('fps-value') as HTMLElement;
      if (fpsEl) fpsEl.textContent = this.currentFps.toString();
      this.fpsCounter = 0;
      this.fpsTime = 0;
    }

    this.builder?.update(delta);
    this.interaction?.updateLabels();

    this.renderer.render(this.scene, this.camera);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new GeneApp();
});
