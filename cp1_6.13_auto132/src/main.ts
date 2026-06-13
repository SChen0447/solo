import * as THREE from 'three';
import { CrystalManager } from './CrystalManager';
import { InteractionController } from './InteractionController';
import { ControlPanel } from './ControlPanel';
import { Crystal } from './Crystal';

class CrystalGrowthEra {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  
  private crystalManager: CrystalManager;
  private interactionController: InteractionController;
  private controlPanel: ControlPanel;
  
  private clock: THREE.Clock;
  private animationFrameId: number | null = null;
  
  private gridHelper: THREE.GridHelper | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private directionalLight1: THREE.DirectionalLight | null = null;
  private directionalLight2: THREE.DirectionalLight | null = null;
  private pointLight: THREE.PointLight | null = null;
  
  private initialCrystalCount: number = 20;
  private maxCrystals: number = 100;

  constructor() {
    this.clock = new THREE.Clock();
    
    this.container = document.getElementById('canvas-container') || document.body;
    
    this.scene = new THREE.Scene();
    this.setupBackground();
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 10, 25);
    this.camera.lookAt(0, 3, 0);
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x0a0510, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    
    this.container.appendChild(this.renderer.domElement);
    
    this.setupLighting();
    this.setupGrid();
    
    this.crystalManager = new CrystalManager({
      scene: this.scene,
      maxCrystals: this.maxCrystals,
      growthSpeed: 1.0,
      fragmentForce: 1.0,
      colorCycleSpeed: 0.5
    });
    
    this.crystalManager.generateInitialCrystals(this.initialCrystalCount);
    
    this.interactionController = new InteractionController({
      camera: this.camera,
      renderer: this.renderer,
      crystalManager: this.crystalManager,
      onCrystalHover: this.handleCrystalHover.bind(this),
      onCrystalClick: this.handleCrystalClick.bind(this)
    });
    
    this.controlPanel = new ControlPanel({
      onGrowthSpeedChange: this.handleGrowthSpeedChange.bind(this),
      onFragmentForceChange: this.handleFragmentForceChange.bind(this),
      onColorCycleChange: this.handleColorCycleChange.bind(this),
      onReset: this.handleReset.bind(this),
      initialValues: {
        growthSpeed: 1.0,
        fragmentForce: 1.0,
        colorCycleSpeed: 0.5
      }
    });
    
    this.setupEventListeners();
    this.animate();
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#1a0a2e');
    gradient.addColorStop(0.5, '#120720');
    gradient.addColorStop(1, '#0a0510');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    this.scene.background = texture;
  }

  private setupLighting(): void {
    this.ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    this.scene.add(this.ambientLight);
    
    this.directionalLight1 = new THREE.DirectionalLight(0x88aaff, 0.8);
    this.directionalLight1.position.set(10, 20, 10);
    this.directionalLight1.castShadow = false;
    this.scene.add(this.directionalLight1);
    
    this.directionalLight2 = new THREE.DirectionalLight(0xffaa66, 0.3);
    this.directionalLight2.position.set(-10, 15, -10);
    this.scene.add(this.directionalLight2);
    
    this.pointLight = new THREE.PointLight(0x88ffcc, 0.5, 30);
    this.pointLight.position.set(0, 5, 0);
    this.scene.add(this.pointLight);
  }

  private setupGrid(): void {
    const gridSize = 100;
    const gridDivisions = 100;
    const gridColor = new THREE.Color(0x8855ff);
    
    this.gridHelper = new THREE.GridHelper(gridSize, gridDivisions, gridColor, gridColor);
    this.gridHelper.position.y = -0.01;
    
    const gridMaterial = this.gridHelper.material as THREE.Material;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.15;
    gridMaterial.depthWrite = false;
    
    this.scene.add(this.gridHelper);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private handleCrystalHover(crystal: Crystal | null): void {
    if (crystal && this.pointLight) {
      const position = crystal.getWorldPosition();
      this.pointLight.position.lerp(position, 0.1);
      this.pointLight.intensity = 0.8;
    } else if (this.pointLight) {
      this.pointLight.intensity = 0.5;
    }
  }

  private handleCrystalClick(crystal: Crystal): void {
    this.crystalManager.onCrystalClick(crystal);
  }

  private handleGrowthSpeedChange(value: number): void {
    this.crystalManager.setGrowthSpeed(value);
  }

  private handleFragmentForceChange(value: number): void {
    this.crystalManager.setFragmentForce(value);
  }

  private handleColorCycleChange(value: number): void {
    this.crystalManager.setColorCycleSpeed(value);
  }

  private handleReset(): void {
    this.crystalManager.reset();
    this.controlPanel.updateGrowthSpeed(1.0);
    this.controlPanel.updateFragmentForce(1.0);
    this.controlPanel.updateColorCycleSpeed(0.5);
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    
    const delta = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();
    
    this.interactionController.update(delta);
    
    this.crystalManager.update(delta, time);
    
    if (this.pointLight) {
      const pulse = 0.5 + Math.sin(time * 2) * 0.1;
      if (this.pointLight.intensity < 0.6) {
        this.pointLight.intensity = pulse;
      }
    }
    
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    window.removeEventListener('resize', this.handleResize.bind(this));
    
    this.interactionController.dispose();
    this.controlPanel.dispose();
    this.crystalManager.dispose();
    
    this.renderer.dispose();
    
    if (this.gridHelper) {
      this.gridHelper.geometry.dispose();
      (this.gridHelper.material as THREE.Material).dispose();
    }
    
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

let app: CrystalGrowthEra | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new CrystalGrowthEra();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
  }
});
