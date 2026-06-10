import * as THREE from 'three';
import { DataFlowSystem, Beacon } from './dataFlow';

class App {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private dataFlow: DataFlowSystem;
  private clock: THREE.Clock;

  private cameraAngleX: number = 0;
  private cameraAngleY: number = -0.5;
  private cameraDistance: number = 45;
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  private isDraggingView: boolean = false;
  private isDraggingBeacon: boolean = false;
  private isDraggingSlider: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  private raycaster: THREE.Raycaster;
  private mouseNDC: THREE.Vector2;
  private selectedBeacon: Beacon | null = null;
  private draggedBeacon: Beacon | null = null;
  private activeSliderHud: HTMLElement | null = null;
  private draggingSliderKey: 'strength' | 'radius' | null = null;

  private statParticles: HTMLElement;
  private statSpeed: HTMLElement;
  private statBeacons: HTMLElement;
  private statFps: HTMLElement;
  private fpsFrames: number = 0;
  private fpsTime: number = 0;
  private currentFps: number = 0;

  constructor() {
    this.container = document.getElementById('app')!;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouseNDC = new THREE.Vector2();

    this.statParticles = document.getElementById('stat-particles')!;
    this.statSpeed = document.getElementById('stat-speed')!;
    this.statBeacons = document.getElementById('stat-beacons')!;
    this.statFps = document.getElementById('stat-fps')!;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.insertBefore(this.renderer.domElement, this.container.firstChild);

    this.dataFlow = new DataFlowSystem(this.scene);

    this.updateCamera();
    this.bindEvents();
    this.animate();
  }

  private updateCamera() {
    const x = this.cameraTarget.x + Math.cos(this.cameraAngleY) * Math.sin(this.cameraAngleX) * this.cameraDistance;
    const y = this.cameraTarget.y + Math.sin(-this.cameraAngleY) * this.cameraDistance;
    const z = this.cameraTarget.z + Math.cos(this.cameraAngleY) * Math.cos(this.cameraAngleX) * this.cameraDistance;
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  private bindEvents() {
    window.addEventListener('resize', () => this.onResize());
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraDistance = Math.max(20, Math.min(80, this.cameraDistance + e.deltaY * 0.05));
      this.updateCamera();
    }, { passive: false });

    document.addEventListener('mousedown', (e) => {
      if (this.activeSliderHud) {
        const target = e.target as HTMLElement;
        if (!this.activeSliderHud.contains(target) && target.tagName !== 'CANVAS') {
          this.closeBeaconHud();
        }
      }
    });
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private setMouseNDC(e: MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private pickBeacon(): Beacon | null {
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const meshes: THREE.Object3D[] = [];
    for (const b of this.dataFlow.beacons) meshes.push(b.mesh);
    const hits = this.raycaster.intersectObjects(meshes, true);
    if (hits.length > 0) {
      let obj: THREE.Object3D | null = hits[0].object;
      while (obj && obj.parent && !this.dataFlow.beacons.find(b => b.mesh === obj)) {
        obj = obj.parent;
      }
      if (obj) {
        return this.dataFlow.beacons.find(b => b.mesh === obj) || null;
      }
    }
    return null;
  }

  private projectToGroundPlane(e: MouseEvent): THREE.Vector3 | null {
    this.setMouseNDC(e);
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const point = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(plane, point)) {
      return point;
    }
    return null;
  }

  private onMouseDown(e: MouseEvent) {
    if (this.isDraggingSlider) return;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    if (e.button === 0) {
      this.setMouseNDC(e);
      const beacon = this.pickBeacon();
      if (beacon) {
        beacon.triggerClickPulse();
        this.selectedBeacon = beacon;
        this.isDraggingBeacon = true;
        this.draggedBeacon = beacon;
        beacon.isDragging = true;
        this.openBeaconHud(beacon, e.clientX, e.clientY);
        return;
      }
    }

    if (e.button === 0 || e.button === 2) {
      this.isDraggingView = true;
      this.closeBeaconHud();
    }
  }

  private onMouseMove(e: MouseEvent) {
    if (this.isDraggingSlider) {
      this.updateSliderDrag(e);
      return;
    }

    if (this.isDraggingBeacon && this.draggedBeacon) {
      const pt = this.projectToGroundPlane(e);
      if (pt) {
        this.draggedBeacon.position.x = Math.max(-14, Math.min(14, pt.x));
        this.draggedBeacon.position.z = Math.max(-14, Math.min(14, pt.z));
      }
      return;
    }

    if (this.isDraggingView) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.cameraAngleX -= dx * 0.005;
      this.cameraAngleY = Math.max(-1.3, Math.min(-0.1, this.cameraAngleY - dy * 0.005));
      this.updateCamera();
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }
  }

  private onMouseUp(e: MouseEvent) {
    if (this.isDraggingBeacon && this.draggedBeacon) {
      this.draggedBeacon.isDragging = false;
    }
    this.isDraggingView = false;
    this.isDraggingBeacon = false;
    this.draggedBeacon = null;
    this.isDraggingSlider = false;
    this.draggingSliderKey = null;
  }

  private openBeaconHud(beacon: Beacon, x: number, y: number) {
    this.closeBeaconHud();

    const hud = document.createElement('div');
    hud.className = 'beacon-hud';
    const left = Math.min(window.innerWidth - 260, Math.max(10, x + 20));
    const top = Math.min(window.innerHeight - 180, Math.max(10, y - 30));
    hud.style.left = left + 'px';
    hud.style.top = top + 'px';

    hud.innerHTML = `
      <div class="beacon-hud-title">◆ 数据信标控制</div>
      <div class="beacon-hud-row">
        <div class="beacon-hud-label"><span>吸引/排斥强度</span><span class="num" id="hud-strength-num">${beacon.strength.toFixed(2)}</span></div>
        <div class="slider-track" data-key="strength">
          <div class="slider-fill"></div>
          <div class="slider-thumb"></div>
        </div>
      </div>
      <div class="beacon-hud-row">
        <div class="beacon-hud-label"><span>作用半径</span><span class="num" id="hud-radius-num">${beacon.radius.toFixed(2)}</span></div>
        <div class="slider-track" data-key="radius">
          <div class="slider-fill"></div>
          <div class="slider-thumb"></div>
        </div>
      </div>
    `;

    document.body.appendChild(hud);
    this.activeSliderHud = hud;

    this.updateSliderVisual(beacon, 'strength');
    this.updateSliderVisual(beacon, 'radius');

    hud.querySelectorAll('.slider-track').forEach(track => {
      const key = (track as HTMLElement).dataset.key as 'strength' | 'radius';
      track.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        this.isDraggingSlider = true;
        this.draggingSliderKey = key;
        this.updateSliderDrag(e as MouseEvent);
      });
    });
  }

  private updateSliderVisual(beacon: Beacon, key: 'strength' | 'radius') {
    if (!this.activeSliderHud) return;
    const track = this.activeSliderHud.querySelector(`.slider-track[data-key="${key}"]`) as HTMLElement;
    if (!track) return;
    const fill = track.querySelector('.slider-fill') as HTMLElement;
    const thumb = track.querySelector('.slider-thumb') as HTMLElement;
    const numEl = this.activeSliderHud.querySelector(`#hud-${key}-num`) as HTMLElement;

    let value: number;
    let min: number, max: number;
    if (key === 'strength') {
      value = beacon.strength;
      min = -5; max = 5;
    } else {
      value = beacon.radius;
      min = 3; max = 8;
    }
    const t = (value - min) / (max - min);
    fill.style.width = (t * 100) + '%';
    thumb.style.left = (t * 100) + '%';
    numEl.textContent = value.toFixed(2);

    fill.classList.remove('attract', 'repel');
    if (key === 'strength') {
      if (value > 0.01) fill.classList.add('attract');
      else if (value < -0.01) fill.classList.add('repel');
    }
  }

  private updateSliderDrag(e: MouseEvent) {
    if (!this.activeSliderHud || !this.selectedBeacon || !this.draggingSliderKey) return;
    const key = this.draggingSliderKey;
    const track = this.activeSliderHud.querySelector(`.slider-track[data-key="${key}"]`) as HTMLElement;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    let t = (e.clientX - rect.left) / rect.width;
    t = Math.max(0, Math.min(1, t));

    let min: number, max: number;
    if (key === 'strength') {
      min = -5; max = 5;
      this.selectedBeacon.strength = min + t * (max - min);
      this.selectedBeacon.updateRadiusVisual();
    } else {
      min = 3; max = 8;
      this.selectedBeacon.radius = min + t * (max - min);
      this.selectedBeacon.updateRadiusVisual();
    }
    this.updateSliderVisual(this.selectedBeacon, key);
  }

  private closeBeaconHud() {
    if (this.activeSliderHud) {
      this.activeSliderHud.remove();
      this.activeSliderHud = null;
    }
    this.selectedBeacon = null;
  }

  private updateStats(delta: number) {
    this.fpsFrames++;
    this.fpsTime += delta;
    if (this.fpsTime >= 0.5) {
      this.currentFps = Math.round(this.fpsFrames / this.fpsTime);
      this.fpsFrames = 0;
      this.fpsTime = 0;
      this.statFps.textContent = String(this.currentFps);
    }
    this.statParticles.textContent = String(this.dataFlow.getParticleCount());
    this.statSpeed.textContent = this.dataFlow.getAverageSpeed().toFixed(3);
    this.statBeacons.textContent = String(this.dataFlow.getActiveBeaconCount());
  }

  private animate() {
    requestAnimationFrame(() => this.animate());
    const delta = Math.min(this.clock.getDelta(), 0.05);
    this.dataFlow.update(delta);
    this.updateStats(delta);
    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
