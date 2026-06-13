import * as THREE from 'three';
import { DataManager } from './DataManager.js';
import { CubeGrid } from './CubeGrid.js';

export class LatticeApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  
  private dataManager: DataManager;
  private cubeGrid: CubeGrid;
  
  private stars: THREE.Sprite[] = [];
  
  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private cameraAngleY: number = 0;
  private cameraAngleX: number = 0;
  private cameraDistance: number = 12;
  
  private readonly minDistance: number = 4;
  private readonly maxDistance: number = 20;
  private readonly minPolarAngle: number = Math.PI / 6;
  private readonly maxPolarAngle: number = Math.PI * 5 / 6;
  
  private raycaster: THREE.Raycaster;
  private mouseNdc: THREE.Vector2;
  
  private mousePosElement: HTMLElement;
  private nearestDistElement: HTMLElement;
  
  private clock: THREE.Clock;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;
    
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);
    
    this.raycaster = new THREE.Raycaster();
    this.mouseNdc = new THREE.Vector2();
    
    this.dataManager = new DataManager();
    this.cubeGrid = new CubeGrid(this.scene, this.dataManager);
    
    this.mousePosElement = document.getElementById('mouse-pos')!;
    this.nearestDistElement = document.getElementById('nearest-dist')!;
    
    this.clock = new THREE.Clock();
    
    this.init();
  }
  
  private init(): void {
    this.setupLights();
    this.setupStars();
    this.setupCamera();
    this.setupEventListeners();
    this.animate();
  }
  
  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0xffffff, 0.8, 50);
    pointLight.position.set(10, 15, 10);
    pointLight.castShadow = true;
    pointLight.shadow.mapSize.width = 1024;
    pointLight.shadow.mapSize.height = 1024;
    this.scene.add(pointLight);
  }
  
  private setupStars(): void {
    const starCount = 40;
    
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d')!;
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    
    const starTexture = new THREE.CanvasTexture(canvas);
    
    for (let i = 0; i < starCount; i++) {
      const radius = 15 + Math.random() * 15;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      const size = (0.05 + Math.random() * 0.1) * (radius / 20);
      const baseOpacity = 0.3 + Math.random() * 0.3;
      const phase = Math.random() * Math.PI * 2;
      const period = 2 + Math.random() * 2;
      
      const material = new THREE.SpriteMaterial({
        map: starTexture,
        transparent: true,
        opacity: baseOpacity,
        color: 0xffffff,
        depthWrite: false
      });
      
      const sprite = new THREE.Sprite(material);
      sprite.position.set(x, y, z);
      sprite.scale.set(size, size, 1);
      
      (sprite as any).userData = {
        baseOpacity,
        phase,
        period
      };
      
      this.stars.push(sprite);
      this.scene.add(sprite);
    }
  }
  
  private setupCamera(): void {
    this.camera.position.set(0, 4, 12);
    this.camera.lookAt(0, 0, 0);
    
    const spherical = new THREE.Spherical();
    spherical.setFromVector3(this.camera.position);
    this.cameraAngleY = spherical.theta;
    this.cameraAngleX = spherical.phi;
    this.cameraDistance = spherical.radius;
  }
  
  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    const canvas = this.renderer.domElement;
    
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    
    canvas.addEventListener('click', this.onClick.bind(this));
  }
  
  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  private onMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
    this.cubeGrid.setIsDragging(true);
  }
  
  private onMouseMove(event: MouseEvent): void {
    this.mouseNdc.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouseNdc.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    const virtualX = this.mouseNdc.x * 6;
    const virtualY = this.mouseNdc.y * 6;
    this.dataManager.updateMousePosition(virtualX, virtualY, 0);
    
    if (this.isDragging) {
      const deltaX = event.clientX - this.previousMousePosition.x;
      const deltaY = event.clientY - this.previousMousePosition.y;
      
      this.cameraAngleY -= deltaX * 0.01;
      this.cameraAngleX -= deltaY * 0.01;
      
      this.cameraAngleX = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.cameraAngleX));
      
      this.previousMousePosition = {
        x: event.clientX,
        y: event.clientY
      };
      
      this.updateCameraPosition();
    }
  }
  
  private onMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.cubeGrid.setIsDragging(false);
    }
  }
  
  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    
    const zoomSpeed = 0.001;
    this.cameraDistance += event.deltaY * zoomSpeed * this.cameraDistance;
    
    this.cameraDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.cameraDistance));
    
    this.updateCameraPosition();
  }
  
  private onClick(event: MouseEvent): void {
    this.mouseNdc.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouseNdc.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    const virtualX = this.mouseNdc.x * 6;
    const virtualY = this.mouseNdc.y * 6;
    
    this.cubeGrid.triggerPulse(virtualX, virtualY, 0);
  }
  
  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraAngleX) * Math.sin(this.cameraAngleY);
    const y = this.cameraDistance * Math.cos(this.cameraAngleX);
    const z = this.cameraDistance * Math.sin(this.cameraAngleX) * Math.cos(this.cameraAngleY);
    
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }
  
  private updateInfoPanel(): void {
    const mousePos = this.dataManager.getMousePosition();
    const nearestDist = this.dataManager.getNearestDistance();
    
    this.mousePosElement.textContent = 
      `X: ${mousePos.x.toFixed(2)} Y: ${mousePos.y.toFixed(2)} Z: ${mousePos.z.toFixed(2)}`;
    this.nearestDistElement.textContent = nearestDist.toFixed(2);
  }
  
  private updateStars(time: number): void {
    for (const star of this.stars) {
      const userData = (star as any).userData;
      const { baseOpacity, phase, period } = userData;
      const opacity = baseOpacity + Math.sin((time / period) * Math.PI * 2 + phase) * 0.15;
      (star.material as THREE.SpriteMaterial).opacity = Math.max(0.1, Math.min(0.8, opacity));
    }
  }
  
  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    
    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();
    
    this.cubeGrid.update(delta, elapsedTime);
    this.updateStars(elapsedTime);
    this.updateInfoPanel();
    
    this.renderer.render(this.scene, this.camera);
  }
}

new LatticeApp('canvas-container');
