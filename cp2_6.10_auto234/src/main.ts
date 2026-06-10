import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as _ from 'lodash';
import {
  buildAllPhases,
  getPhaseData,
  PHASE_YEARS,
  PHASE_NAMES,
  noiseTexture,
  PhaseData
} from './dataManager';
import { UILayer } from './uiLayer';
import { animatePhaseTransition, AnimatableMesh, animateHighlightPulse } from './animations';

interface PhaseMeshGroup {
  phaseId: number;
  meshes: Map<string, AnimatableMesh>;
}

interface HighlightGroup {
  edges: THREE.LineSegments[];
  animation: gsap.core.Timeline | null;
}

class CastleScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;
  private uiLayer: UILayer;
  private phases: PhaseData[];
  private phaseMeshGroups: PhaseMeshGroup[] = [];
  private currentPhaseIndex: number = 0;
  private highlightGroup: HighlightGroup | null = null;
  private slider: HTMLInputElement;
  private yearLabel: HTMLElement;
  private phaseLabel: HTMLElement;
  private eventListContainer: HTMLElement;
  private animating: boolean = false;
  private clock: THREE.Clock;
  private autoRotateSpeed: number = 0.5;

  constructor() {
    this.container = document.getElementById('scene-container')!;
    this.slider = document.getElementById('timeline-slider') as HTMLInputElement;
    this.yearLabel = document.getElementById('year-label')!;
    this.phaseLabel = document.getElementById('phase-label')!;
    this.eventListContainer = document.getElementById('event-list')!;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.setupBackground();

    this.camera = new THREE.PerspectiveCamera(
      50,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      200
    );
    this.camera.position.set(15, 10, 20);
    this.camera.lookAt(0, 2, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.setupControls();

    this.uiLayer = new UILayer(this.container, this.camera);

    this.setupLights();
    this.setupGround();

    this.phases = buildAllPhases();
    this.buildPhaseMeshes();

    this.setupSliderMarks();
    this.setupEventTimeline();
    this.setupUIEvents();

    this.switchPhase(0, false);

    window.addEventListener('resize', this.onResize.bind(this));
    document.addEventListener('click', this.onDocumentClick.bind(this));

    this.animate();
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0d1117');
    gradient.addColorStop(1, '#1a1e2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  private setupControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = this.autoRotateSpeed;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 40;
    this.controls.target.set(0, 2, 0);
    this.controls.maxPolarAngle = Math.PI / 2.1;

    this.controls.addEventListener('start', () => {
      this.controls.autoRotate = false;
    });

    this.controls.addEventListener('end', () => {
      setTimeout(() => {
        this.controls.autoRotate = true;
      }, 3000);
    });
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x6b7280, 0.7);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xfff4e0, 1.0);
    directional.position.set(10, 15, 8);
    directional.castShadow = true;
    this.scene.add(directional);

    const fill = new THREE.DirectionalLight(0x8892b0, 0.4);
    fill.position.set(-8, 6, -10);
    this.scene.add(fill);
  }

  private setupGround(): void {
    const grid = new THREE.GridHelper(40, 40, 0x3a4060, 0x3a4060);
    (grid.material as THREE.Material).opacity = 0.3;
    (grid.material as THREE.Material).transparent = true;
    this.scene.add(grid);

    const groundGeo = new THREE.CircleGeometry(22, 64);
    const groundMat = new THREE.MeshBasicMaterial({
      color: 0x1a1e2e,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    this.scene.add(ground);
  }

  private buildPhaseMeshes(): void {
    this.phaseMeshGroups = _.map(this.phases, (phase) => {
      const meshMap = new Map<string, AnimatableMesh>();

      _.forEach(phase.buildings, (building) => {
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(phase.color),
          transparent: true,
          opacity: 0.2,
          map: noiseTexture,
          roughness: 0.85,
          metalness: 0.05,
          side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(building.geometry, material);
        mesh.position.copy(building.position);
        mesh.userData.buildingId = building.id;
        mesh.userData.phaseId = phase.id;
        mesh.visible = false;
        this.scene.add(mesh);

        meshMap.set(building.id, {
          mesh,
          targetOpacity: 0.8,
          basePosition: building.position.clone()
        });
      });

      return { phaseId: phase.id, meshes: meshMap };
    });
  }

  private setupSliderMarks(): void {
    const marksContainer = document.getElementById('slider-marks')!;
    marksContainer.innerHTML = '';
    _.forEach(PHASE_YEARS, (year, index) => {
      const mark = document.createElement('div');
      mark.className = 'slider-mark';
      mark.textContent = String(year);
      mark.style.left = `${(index / (PHASE_YEARS.length - 1)) * 100}%`;
      marksContainer.appendChild(mark);
    });
  }

  private setupEventTimeline(): void {
    this.eventListContainer.innerHTML = '';
    _.forEach(this.phases, (phase) => {
      const item = document.createElement('div');
      item.className = 'event-item';
      item.dataset.phaseId = String(phase.id);
      item.innerHTML = `
        <div class="event-year">${phase.year}年</div>
        <div class="event-text">${phase.event.replace(/^\d+年\w+：/, '')}</div>
      `;
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetPhase = Number(item.dataset.phaseId);
        this.slider.value = String(targetPhase);
        this.switchPhase(targetPhase);
        setTimeout(() => {
          this.highlightPhaseBuildings(targetPhase);
        }, 1600);
      });
      this.eventListContainer.appendChild(item);
    });
    this.updateEventTimelineActive(0);
  }

  private updateEventTimelineActive(phaseId: number): void {
    const items = this.eventListContainer.querySelectorAll('.event-item');
    items.forEach((el) => {
      const elTyped = el as HTMLElement;
      if (Number(elTyped.dataset.phaseId) === phaseId) {
        elTyped.classList.add('active');
      } else {
        elTyped.classList.remove('active');
      }
    });
  }

  private setupUIEvents(): void {
    this.slider.addEventListener('input', () => {
      const newPhase = Number(this.slider.value);
      if (newPhase !== this.currentPhaseIndex && !this.animating) {
        this.switchPhase(newPhase);
      }
    });
  }

  private switchPhase(newPhaseIndex: number, animate: boolean = true): void {
    if (this.animating && animate) return;
    this.animating = animate;

    const oldPhaseGroup = this.phaseMeshGroups[this.currentPhaseIndex];
    const newPhaseGroup = this.phaseMeshGroups[newPhaseIndex];
    const newPhaseData = getPhaseData(this.phases, newPhaseIndex);

    this.yearLabel.textContent = String(PHASE_YEARS[newPhaseIndex]);
    this.phaseLabel.textContent = PHASE_NAMES[newPhaseIndex];
    this.updateEventTimelineActive(newPhaseIndex);
    this.clearHighlight();

    const fadingOut: AnimatableMesh[] = [];
    const fadingIn: AnimatableMesh[] = [];

    oldPhaseGroup.meshes.forEach((item) => {
      if (!newPhaseGroup.meshes.has(item.mesh.userData.buildingId)) {
        fadingOut.push(item);
      }
    });

    newPhaseGroup.meshes.forEach((item) => {
      item.mesh.visible = true;
      if (!oldPhaseGroup.meshes.has(item.mesh.userData.buildingId)) {
        fadingIn.push(item);
      }
    });

    this.uiLayer.updateLabelsForPhase(newPhaseData.buildings, this.scene);
    this.currentPhaseIndex = newPhaseIndex;

    if (animate && (fadingOut.length > 0 || fadingIn.length > 0)) {
      const tl = animatePhaseTransition(fadingOut, fadingIn, 1.5);
      tl.call(() => {
        fadingOut.forEach((item) => {
          if (!newPhaseGroup.meshes.has(item.mesh.userData.buildingId)) {
            item.mesh.visible = false;
          }
        });
        this.animating = false;
      });
    } else {
      fadingOut.forEach((item) => {
        if (!newPhaseGroup.meshes.has(item.mesh.userData.buildingId)) {
          item.mesh.visible = false;
          (item.mesh.material as THREE.MeshStandardMaterial).opacity = 0.2;
        }
      });
      fadingIn.forEach((item) => {
        (item.mesh.material as THREE.MeshStandardMaterial).opacity = 0.8;
        item.mesh.position.copy(item.basePosition);
      });
      this.animating = false;
    }
  }

  private highlightPhaseBuildings(phaseId: number): void {
    this.clearHighlight();

    const group = this.phaseMeshGroups[phaseId];
    const edges: THREE.LineSegments[] = [];

    group.meshes.forEach((item) => {
      const geo = item.mesh.geometry;
      const edgesGeo = new THREE.EdgesGeometry(geo, 20);
      const edgesMat = new THREE.LineBasicMaterial({
        color: 0xff9933,
        transparent: true,
        opacity: 0.9
      });
      const line = new THREE.LineSegments(edgesGeo, edgesMat);
      line.position.copy(item.mesh.position);
      this.scene.add(line);
      edges.push(line);
    });

    const anim = animateHighlightPulse(edges[0]);
    this.highlightGroup = { edges, animation: anim };
  }

  private clearHighlight(): void {
    if (this.highlightGroup) {
      this.highlightGroup.edges.forEach((edge) => {
        this.scene.remove(edge);
        (edge.geometry as THREE.BufferGeometry).dispose();
        (edge.material as THREE.Material).dispose();
      });
      if (this.highlightGroup.animation) {
        this.highlightGroup.animation.kill();
      }
      this.highlightGroup = null;
    }
  }

  private onResize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.uiLayer.resize(w, h);
  }

  private onDocumentClick(): void {
    this.uiLayer.closeActivePanel();
  }

  private getCameraDistance(): number {
    return this.camera.position.distanceTo(this.controls.target);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    this.clock.getDelta();
    this.controls.update();

    const dist = this.getCameraDistance();
    this.uiLayer.updateLabelScale(dist);

    this.renderer.render(this.scene, this.camera);
    this.uiLayer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new CastleScene();
});
