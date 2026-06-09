import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Earth } from './Earth';
import { AuroraSystem, FilterLevel } from './AuroraSystem';

class AuroraApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private earth: Earth;
  private auroraSystem: AuroraSystem;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private clock: THREE.Clock;

  private isPlaying: boolean = true;
  private currentHour: number = 0;
  private autoPlaySpeed: number = 0.5;

  private canvasContainer: HTMLElement;
  private timeSlider: HTMLInputElement;
  private timeDisplay: HTMLElement;
  private playPauseBtn: HTMLButtonElement;
  private filterSelect: HTMLSelectElement;
  private coordTooltip: HTMLElement;
  private auroraInfoCard: HTMLElement;
  private infoLevel: HTMLElement;
  private infoCoords: HTMLElement;
  private infoPrediction: HTMLElement;
  private mobileFilterBtn: HTMLButtonElement;
  private mobileTimeBtn: HTMLButtonElement;
  private filterContainer: HTMLElement;
  private timeControls: HTMLElement;

  private isDragging: boolean = false;
  private hoveredCoords: { latitude: number; longitude: number } | null = null;

  constructor() {
    this.canvasContainer = document.getElementById('canvas-container')!;
    this.timeSlider = document.getElementById('time-slider') as HTMLInputElement;
    this.timeDisplay = document.getElementById('time-display')!;
    this.playPauseBtn = document.getElementById('play-pause-btn') as HTMLButtonElement;
    this.filterSelect = document.getElementById('filter-select') as HTMLSelectElement;
    this.coordTooltip = document.getElementById('coord-tooltip')!;
    this.auroraInfoCard = document.getElementById('aurora-info-card')!;
    this.infoLevel = document.getElementById('info-level')!;
    this.infoCoords = document.getElementById('info-coords')!;
    this.infoPrediction = document.getElementById('info-prediction')!;
    this.mobileFilterBtn = document.getElementById('mobile-filter-btn') as HTMLButtonElement;
    this.mobileTimeBtn = document.getElementById('mobile-time-btn') as HTMLButtonElement;
    this.filterContainer = document.getElementById('filter-container')!;
    this.timeControls = document.getElementById('time-controls')!;

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = this.initScene();
    this.camera = this.initCamera();
    this.renderer = this.initRenderer();
    this.controls = this.initControls();
    this.earth = new Earth();
    this.auroraSystem = new AuroraSystem();

    this.scene.add(this.earth.group);
    this.scene.add(this.auroraSystem.group);

    this.setupEventListeners();
    this.updateTimeDisplay();
    this.animate();
  }

  private initScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);

    const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x4488ff, 0.5, 10);
    pointLight.position.set(-3, 2, -3);
    scene.add(pointLight);

    this.createStars(scene);

    return scene;
  }

  private createStars(scene: THREE.Scene): void {
    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 3000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const brightness = 0.5 + Math.random() * 0.5;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness * (0.8 + Math.random() * 0.2);
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starsMaterial = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8
    });

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
  }

  private initCamera(): THREE.PerspectiveCamera {
    const aspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    camera.position.set(0, 0, 3);
    return camera;
  }

  private initRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x0a0a1a, 1);
    this.canvasContainer.appendChild(renderer.domElement);
    return renderer;
  }

  private initControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.8;
    controls.minDistance = 1.2;
    controls.maxDistance = 10;
    controls.enablePan = false;
    return controls;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));

    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.renderer.domElement.addEventListener('mouseleave', this.onMouseLeave.bind(this));
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));

    this.timeSlider.addEventListener('input', this.onTimeSliderInput.bind(this));
    this.playPauseBtn.addEventListener('click', this.togglePlayPause.bind(this));
    this.filterSelect.addEventListener('change', this.onFilterChange.bind(this));

    this.mobileFilterBtn.addEventListener('click', () => {
      this.filterContainer.classList.toggle('mobile-expanded');
      this.timeControls.classList.remove('mobile-expanded');
    });

    this.mobileTimeBtn.addEventListener('click', () => {
      this.timeControls.classList.toggle('mobile-expanded');
      this.filterContainer.classList.remove('mobile-expanded');
    });

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!this.filterContainer.contains(target) && !this.mobileFilterBtn.contains(target)) {
        this.filterContainer.classList.remove('mobile-expanded');
      }
      if (!this.timeControls.contains(target) && !this.mobileTimeBtn.contains(target)) {
        this.timeControls.classList.remove('mobile-expanded');
      }
      if (!this.auroraInfoCard.contains(target) && !this.renderer.domElement.contains(target)) {
        this.hideAuroraInfoCard();
      }
    });
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseDown(): void {
    this.isDragging = true;
  }

  private onMouseUp(): void {
    setTimeout(() => {
      this.isDragging = false;
    }, 100);
  }

  private onMouseLeave(): void {
    this.isDragging = false;
    this.coordTooltip.style.display = 'none';
    this.hoveredCoords = null;
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.earth.mesh);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      const coords = Earth.vector3ToLatLong(point);
      this.hoveredCoords = coords;
      this.showCoordTooltip(event.clientX, event.clientY, coords);
    } else {
      this.coordTooltip.style.display = 'none';
      this.hoveredCoords = null;
    }
  }

  private showCoordTooltip(x: number, y: number, coords: { latitude: number; longitude: number }): void {
    const latDir = coords.latitude >= 0 ? 'N' : 'S';
    const lonDir = coords.longitude >= 0 ? 'E' : 'W';
    this.coordTooltip.innerHTML = `
      纬度: ${Math.abs(coords.latitude).toFixed(2)}°${latDir}<br>
      经度: ${Math.abs(coords.longitude).toFixed(2)}°${lonDir}
    `;
    this.coordTooltip.style.display = 'block';
    
    const tooltipRect = this.coordTooltip.getBoundingClientRect();
    let left = x + 15;
    let top = y + 15;
    
    if (left + tooltipRect.width > window.innerWidth) {
      left = x - tooltipRect.width - 15;
    }
    if (top + tooltipRect.height > window.innerHeight) {
      top = y - tooltipRect.height - 15;
    }
    
    this.coordTooltip.style.left = `${left}px`;
    this.coordTooltip.style.top = `${top}px`;
  }

  private onClick(): void {
    if (this.isDragging || !this.hoveredCoords) return;

    const info = this.auroraSystem.getAuroraInfoAtPosition(
      this.hoveredCoords.latitude,
      this.hoveredCoords.longitude
    );

    if (info) {
      this.showAuroraInfoCard(info, this.hoveredCoords);
    } else {
      this.hideAuroraInfoCard();
    }
  }

  private showAuroraInfoCard(
    info: { level: number; prediction: string },
    coords: { latitude: number; longitude: number }
  ): void {
    this.infoLevel.textContent = `${info.level}级`;
    this.infoLevel.className = 'level-badge';
    
    if (info.level <= 2) {
      this.infoLevel.classList.add('level-1-2');
    } else if (info.level <= 4) {
      this.infoLevel.classList.add('level-3-4');
    } else {
      this.infoLevel.classList.add('level-5');
    }

    const latDir = coords.latitude >= 0 ? 'N' : 'S';
    const lonDir = coords.longitude >= 0 ? 'E' : 'W';
    this.infoCoords.textContent = `${Math.abs(coords.latitude).toFixed(2)}°${latDir}, ${Math.abs(coords.longitude).toFixed(2)}°${lonDir}`;
    this.infoPrediction.textContent = info.prediction;

    this.auroraInfoCard.style.display = 'block';
    
    const cardRect = this.auroraInfoCard.getBoundingClientRect();
    let left = window.innerWidth / 2 - cardRect.width / 2;
    let top = window.innerHeight / 2 - cardRect.height / 2;
    
    this.auroraInfoCard.style.left = `${left}px`;
    this.auroraInfoCard.style.top = `${top}px`;
  }

  private hideAuroraInfoCard(): void {
    this.auroraInfoCard.style.display = 'none';
  }

  private onTimeSliderInput(): void {
    this.currentHour = parseFloat(this.timeSlider.value);
    this.auroraSystem.setHourOfDay(this.currentHour);
    this.updateTimeDisplay();
  }

  private togglePlayPause(): void {
    this.isPlaying = !this.isPlaying;
    this.playPauseBtn.textContent = this.isPlaying ? '⏸' : '▶';
  }

  private onFilterChange(): void {
    const value = this.filterSelect.value as FilterLevel;
    this.auroraSystem.setFilterLevel(value);
  }

  private updateTimeDisplay(): void {
    const hours = Math.floor(this.currentHour);
    const minutes = Math.floor((this.currentHour % 1) * 60);
    this.timeDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const deltaTime = this.clock.getDelta();

    if (this.isPlaying) {
      this.currentHour += this.autoPlaySpeed * deltaTime;
      if (this.currentHour >= 24) {
        this.currentHour = 0;
      }
      this.timeSlider.value = this.currentHour.toString();
      this.auroraSystem.setHourOfDay(this.currentHour);
      this.updateTimeDisplay();
    }

    this.earth.update(deltaTime);
    this.auroraSystem.update(deltaTime);
    this.controls.update();

    this.renderer.render(this.scene, this.camera);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new AuroraApp();
});
