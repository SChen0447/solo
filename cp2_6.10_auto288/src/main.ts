import * as THREE from 'three';
import { OceanScene } from './scene/OceanScene';
import { VentScene } from './scene/VentScene';
import { InfoPanel } from './ui/InfoPanel';
import { easeInOutCubic, clamp } from './utils/easing';
import { InfoData } from './types';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private oceanScene: OceanScene;
  private ventScene: VentScene;
  private infoPanel: InfoPanel;
  private clock: THREE.Clock;

  private isDragging: boolean = false;
  private prevMouse: { x: number; y: number } = { x: 0, y: 0 };
  private cameraDistance: number = 300;
  private cameraTheta: number = Math.PI / 4;
  private cameraPhi: number = Math.PI / 3;
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 20, 0);
  private minDistance: number = 30;
  private maxDistance: number = 500;

  private isRoaming: boolean = false;
  private roamTime: number = 0;
  private roamDuration: number = 20;
  private roamWaypoints: THREE.Vector3[] = [];
  private roamLookWaypoints: THREE.Vector3[] = [];

  private initialDistance: number = 300;
  private initialTheta: number = Math.PI / 4;
  private initialPhi: number = Math.PI / 3;
  private initialTarget: THREE.Vector3 = new THREE.Vector3(0, 20, 0);

  constructor() {
    const container = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000814);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000814, 1);
    container.appendChild(this.renderer.domElement);

    this.oceanScene = new OceanScene(this.scene);
    this.ventScene = new VentScene(this.scene, this.camera, this.renderer.domElement);

    const panelEl = document.getElementById('info-panel')!;
    this.infoPanel = new InfoPanel(panelEl);

    this.clock = new THREE.Clock();

    this.setupInteraction();
    this.setupButtons();
  }

  private setupInteraction(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', (e) => {
      if (this.isRoaming) return;
      this.isDragging = true;
      this.prevMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('pointerup', () => {
      this.isDragging = false;
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isDragging || this.isRoaming) return;
      const deltaX = e.clientX - this.prevMouse.x;
      const deltaY = e.clientY - this.prevMouse.y;
      this.cameraTheta -= deltaX * 0.005;
      this.cameraPhi = clamp(this.cameraPhi + deltaY * 0.005, 0.1, Math.PI / 2 - 0.05);
      this.prevMouse = { x: e.clientX, y: e.clientY };
      this.ventScene.handleRotate(deltaX, deltaY);
    });

    canvas.addEventListener('wheel', (e) => {
      if (this.isRoaming) return;
      e.preventDefault();
      const zoomSpeed = 0.0015;
      this.cameraDistance = clamp(
        this.cameraDistance * (1 + e.deltaY * zoomSpeed),
        this.minDistance,
        this.maxDistance
      );
      this.ventScene.handleZoom(this.cameraDistance);
    }, { passive: false });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.ventScene.onClick((info: InfoData) => {
      this.infoPanel.show(info);
    });
  }

  private setupButtons(): void {
    const roamBtn = document.getElementById('btn-roam') as HTMLButtonElement;
    const resetBtn = document.getElementById('btn-reset') as HTMLButtonElement;

    roamBtn.addEventListener('click', () => {
      if (this.isRoaming) return;
      this.startRoam();
      roamBtn.disabled = true;
      setTimeout(() => {
        roamBtn.disabled = false;
      }, this.roamDuration * 1000);
    });

    resetBtn.addEventListener('click', () => {
      this.isRoaming = false;
      this.resetCamera();
    });
  }

  private startRoam(): void {
    this.isRoaming = true;
    this.roamTime = 0;

    const ventPositions = this.ventScene.getVentPositions();
    this.roamWaypoints = [];
    this.roamLookWaypoints = [];

    this.roamWaypoints.push(new THREE.Vector3(0, OceanScene.OCEAN_HEIGHT + 50, 150));
    this.roamLookWaypoints.push(new THREE.Vector3(0, OceanScene.OCEAN_HEIGHT / 2, 0));

    if (ventPositions.length > 0) {
      this.roamWaypoints.push(ventPositions[0].clone().add(new THREE.Vector3(0, 50, 0)));
      this.roamLookWaypoints.push(ventPositions[0].clone());
    }

    ventPositions.forEach((pos) => {
      this.roamWaypoints.push(pos.clone().add(new THREE.Vector3(0, 25, 40)));
      this.roamLookWaypoints.push(pos.clone().add(new THREE.Vector3(0, 5, 0)));
    });

    this.roamWaypoints.push(new THREE.Vector3(0, OceanScene.OCEAN_HEIGHT * 0.6, 250));
    this.roamLookWaypoints.push(new THREE.Vector3(0, OceanScene.OCEAN_HEIGHT * 0.3, 0));
  }

  private resetCamera(): void {
    this.cameraDistance = this.initialDistance;
    this.cameraTheta = this.initialTheta;
    this.cameraPhi = this.initialPhi;
    this.cameraTarget.copy(this.initialTarget);
    this.infoPanel.hide();
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    const y = this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);

    this.camera.position.set(
      this.cameraTarget.x + x,
      this.cameraTarget.y + y,
      this.cameraTarget.z + z
    );
    this.camera.lookAt(this.cameraTarget);
  }

  private updateRoam(delta: number): void {
    if (!this.isRoaming) return;

    this.roamTime += delta;
    const totalT = this.roamTime / this.roamDuration;

    if (totalT >= 1) {
      this.isRoaming = false;
      this.resetCamera();
      return;
    }

    const segCount = this.roamWaypoints.length - 1;
    const segT = totalT * segCount;
    const segIndex = Math.min(Math.floor(segT), segCount - 1);
    const localT = easeInOutCubic(segT - segIndex);

    if (segIndex < segCount) {
      const p0 = this.roamWaypoints[segIndex];
      const p1 = this.roamWaypoints[segIndex + 1];
      const l0 = this.roamLookWaypoints[segIndex];
      const l1 = this.roamLookWaypoints[segIndex + 1];

      this.camera.position.lerpVectors(p0, p1, localT);
      const lookTarget = new THREE.Vector3().lerpVectors(l0, l1, localT);
      this.camera.lookAt(lookTarget);

      this.cameraTarget.copy(lookTarget);
      const diff = new THREE.Vector3().subVectors(this.camera.position, lookTarget);
      this.cameraDistance = diff.length();
      this.cameraTheta = Math.atan2(diff.x, diff.z);
      this.cameraPhi = Math.acos(clamp(diff.y / this.cameraDistance, -1, 1));
    }
  }

  public init(): void {
    this.oceanScene.init();
    this.ventScene.init();
    this.updateCameraPosition();
    this.animate();
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.getElapsedTime();

    if (this.isRoaming) {
      this.updateRoam(delta);
    } else {
      this.updateCameraPosition();
    }

    this.oceanScene.update(this.camera.position.y, elapsed);
    this.ventScene.update(delta);
    this.renderer.render(this.scene, this.camera);
  }
}

const app = new App();
app.init();
