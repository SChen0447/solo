import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DetectorNetwork, Detector } from './detectorNetwork';
import { ParticleSystem, ParticleHitEvent } from './particleSystem';
import { CRTPanel } from './crtPanel';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private detectorNetwork: DetectorNetwork;
  private particleSystem: ParticleSystem;
  private crtPanel: CRTPanel;
  private earth!: THREE.Mesh;
  private atmosphere!: THREE.Mesh;
  private clock: THREE.Clock;
  private container: HTMLElement;
  private popup: HTMLElement;
  private popupTitle: HTMLElement;
  private popupHits: HTMLElement;
  private popupAvgEnergy: HTMLElement;
  private popupLastEnergy: HTMLElement;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private selectedDetector: Detector | null = null;
  private isPopupVisible: boolean = false;
  private popupAnimation: number = 0;
  private popupTargetX: number = 0;
  private popupTargetY: number = 0;
  private popupCurrentX: number = 0;
  private popupCurrentY: number = 0;
  private popupStartX: number = 0;
  private popupStartY: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.popup = document.getElementById('detector-popup')!;
    this.popupTitle = document.getElementById('popup-title')!;
    this.popupHits = document.getElementById('popup-hits')!;
    this.popupAvgEnergy = document.getElementById('popup-avg-energy')!;
    this.popupLastEnergy = document.getElementById('popup-last-energy')!;

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = new THREE.Scene();
    
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 2;
    bgCanvas.height = 512;
    const bgCtx = bgCanvas.getContext('2d')!;
    const bgGradient = bgCtx.createLinearGradient(0, 0, 0, 512);
    bgGradient.addColorStop(0, '#000520');
    bgGradient.addColorStop(0.5, '#000818');
    bgGradient.addColorStop(1, '#000008');
    bgCtx.fillStyle = bgGradient;
    bgCtx.fillRect(0, 0, 2, 512);
    const bgTexture = new THREE.CanvasTexture(bgCanvas);
    this.scene.background = bgTexture;

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 25, 70);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 25;
    this.controls.maxDistance = 150;
    this.controls.enablePan = false;
    this.controls.autoRotate = false;

    const earthRadius = 30;

    this.createEarth(earthRadius);
    this.createStars();
    this.setupLighting();

    this.detectorNetwork = new DetectorNetwork(this.scene, earthRadius);
    this.particleSystem = new ParticleSystem(this.scene, earthRadius);
    this.particleSystem.setDetectors(this.detectorNetwork.getDetectors());

    this.crtPanel = new CRTPanel('crt-panel');

    this.setupEventListeners();
  }

  private createEarth(radius: number): void {
    const earthGeometry = new THREE.SphereGeometry(radius, 64, 64);
    
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#1a3a5c');
    gradient.addColorStop(0.3, '#2a5a7c');
    gradient.addColorStop(0.5, '#1e4a6e');
    gradient.addColorStop(0.7, '#2a5a7c');
    gradient.addColorStop(1, '#1a3a5c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 256);
    
    ctx.fillStyle = '#2a7a4a';
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 256;
      const w = 30 + Math.random() * 80;
      const h = 15 + Math.random() * 40;
      ctx.beginPath();
      ctx.ellipse(x, y, w, h, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.fillStyle = '#3a8a5a';
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 256;
      const w = 20 + Math.random() * 50;
      const h = 10 + Math.random() * 25;
      ctx.beginPath();
      ctx.ellipse(x, y, w, h, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const earthTexture = new THREE.CanvasTexture(canvas);

    const earthMaterial = new THREE.MeshStandardMaterial({
      map: earthTexture,
      color: 0x88aacc,
      emissive: 0x112244,
      emissiveIntensity: 0.2,
      metalness: 0.1,
      roughness: 0.8,
    });

    this.earth = new THREE.Mesh(earthGeometry, earthMaterial);
    this.scene.add(this.earth);

    const atmosphereGeometry = new THREE.SphereGeometry(radius * 1.12, 64, 64);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });

    this.atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    this.scene.add(this.atmosphere);

    const glowGeometry = new THREE.SphereGeometry(radius * 1.25, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
          gl_FragColor = vec4(0.2, 0.5, 1.0, 1.0) * intensity * 0.5;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });

    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.scene.add(glow);
  }

  private createStars(): void {
    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 400 + Math.random() * 100;
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.8,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });
    
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(stars);
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x334466, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 40, 60);
    this.scene.add(directionalLight);

    const rimLight = new THREE.DirectionalLight(0x4488ff, 0.5);
    rimLight.position.set(-30, 20, -50);
    this.scene.add(rimLight);

    const pointLight = new THREE.PointLight(0x66aaff, 0.3, 100);
    pointLight.position.set(0, 30, 40);
    this.scene.add(pointLight);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onResize());
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
    document.addEventListener('click', (e) => this.onDocumentClick(e));
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.crtPanel.resize();
  }

  private onClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const detectorMeshes: THREE.Mesh[] = [];
    for (const detector of this.detectorNetwork.getDetectors()) {
      detectorMeshes.push(detector.baseMesh);
      detectorMeshes.push(detector.sensorMesh);
      detectorMeshes.push(detector.flashBall);
    }

    const intersects = this.raycaster.intersectObjects(detectorMeshes);

    if (intersects.length > 0) {
      const clickedObject = intersects[0].object;
      
      for (const detector of this.detectorNetwork.getDetectors()) {
        if (
          clickedObject === detector.baseMesh ||
          clickedObject === detector.sensorMesh ||
          clickedObject === detector.flashBall
        ) {
          this.showPopup(detector, event.clientX, event.clientY);
          break;
        }
      }
    }
  }

  private onDocumentClick(event: MouseEvent): void {
    if (this.isPopupVisible) {
      const target = event.target as HTMLElement;
      if (!this.popup.contains(target) && target !== this.renderer.domElement) {
        this.hidePopup();
      }
    }
  }

  private showPopup(detector: Detector, clickX: number, clickY: number): void {
    this.selectedDetector = detector;
    this.isPopupVisible = true;
    this.popupAnimation = 0;
    
    this.popupStartX = clickX - 160;
    this.popupStartY = clickY - 110;
    
    const screenCenterX = window.innerWidth / 2 - 160;
    const screenCenterY = window.innerHeight / 2 - 110;
    this.popupTargetX = screenCenterX;
    this.popupTargetY = screenCenterY;
    
    this.popupCurrentX = this.popupStartX;
    this.popupCurrentY = this.popupStartY;
    
    this.updatePopupContent();
    
    this.popup.style.display = 'block';
    this.popup.style.opacity = '0';
    this.popup.style.transform = 'scale(0.8)';
  }

  private hidePopup(): void {
    this.isPopupVisible = false;
    this.popup.style.display = 'none';
    this.selectedDetector = null;
  }

  private updatePopupContent(): void {
    if (!this.selectedDetector) return;
    
    const data = this.selectedDetector.data;
    this.popupTitle.textContent = `探测器 #${data.id}`;
    this.popupHits.textContent = data.hitCount.toString();
    this.popupAvgEnergy.textContent = this.selectedDetector.getAverageEnergy().toFixed(2);
    this.popupLastEnergy.textContent = data.lastEnergy.toFixed(2);
  }

  private updatePopupAnimation(deltaTime: number): void {
    if (!this.isPopupVisible) return;
    
    if (this.popupAnimation < 1) {
      this.popupAnimation += deltaTime * 3;
      if (this.popupAnimation > 1) this.popupAnimation = 1;
      
      const t = this.popupAnimation;
      const easeOut = 1 - Math.pow(1 - t, 3);
      
      this.popupCurrentX = this.popupStartX + (this.popupTargetX - this.popupStartX) * easeOut;
      this.popupCurrentY = this.popupStartY + (this.popupTargetY - this.popupStartY) * easeOut;
      
      const scale = 0.8 + 0.2 * easeOut;
      const opacity = t;
      
      this.popup.style.left = this.popupCurrentX + 'px';
      this.popup.style.top = this.popupCurrentY + 'px';
      this.popup.style.transform = `scale(${scale})`;
      this.popup.style.opacity = opacity.toString();
    }
    
    if (this.selectedDetector) {
      this.updatePopupContent();
    }
  }

  public animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    const currentTime = this.clock.getElapsedTime();

    this.controls.update();

    const hitEvents = this.particleSystem.update(deltaTime, Date.now());
    
    for (const hit of hitEvents) {
      this.crtPanel.addHit(hit.energy, hit.time, hit.detectorId);
    }

    this.detectorNetwork.update(deltaTime);
    this.crtPanel.update(deltaTime);
    this.crtPanel.render();

    this.earth.rotation.y += deltaTime * 0.03;

    this.updatePopupAnimation(deltaTime);

    this.renderer.render(this.scene, this.camera);
  }

  public start(): void {
    this.clock.start();
    this.animate();
  }
}

const app = new App();
app.start();
