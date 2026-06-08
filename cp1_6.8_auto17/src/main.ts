import * as THREE from 'three';
import { ParticleSystem } from './particleSystem';
import { Controls } from './controls';
import { UI } from './ui';

class App {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particleSystem: ParticleSystem;
  private controls: Controls;
  private ui: UI;
  
  private clock: THREE.Clock;
  private animationId: number = 0;
  
  private fpsFrames: number = 0;
  private fpsTime: number = 0;
  private currentFPS: number = 60;
  
  private starField!: THREE.Points;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();
    
    this.scene = new THREE.Scene();
    this.scene.background = this.createBackgroundGradient();
    this.scene.fog = new THREE.FogExp2(0x001530, 0.015);
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 20);
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x001020, 1);
    this.container.appendChild(this.renderer.domElement);
    
    this.createStarField();
    this.createAmbientElements();
    
    this.particleSystem = new ParticleSystem(this.scene, 5000);
    
    this.controls = new Controls(
      this.camera,
      this.renderer,
      this.renderer.domElement,
      {
        onPause: () => this.onPauseToggle(),
        onReset: () => this.onReset(),
        onForceField: (pos, strength, radius) => this.onForceField(pos, strength, radius)
      }
    );
    
    this.ui = new UI({
      onGravityChange: (value) => this.particleSystem.setParams({ gravity: value }),
      onWindChange: (value) => this.particleSystem.setParams({ windStrength: value }),
      onLifetimeChange: (value) => this.particleSystem.setParams({ lifetime: value }),
      onTrailDecayChange: (value) => this.particleSystem.setParams({ trailDecay: value }),
      onPause: () => this.onPauseToggle(),
      onReset: () => this.onReset()
    });
    
    this.ui.updateParticleCount(this.particleSystem.getParticleCount());
    
    window.addEventListener('resize', this.onWindowResize);
    
    this.animate();
  }

  private createBackgroundGradient(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#000510');
    gradient.addColorStop(0.3, '#001a3a');
    gradient.addColorStop(0.6, '#002550');
    gradient.addColorStop(1, '#003366');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createStarField(): void {
    const starCount = 1000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    
    for (let i = 0; i < starCount; i++) {
      const radius = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi) + 10;
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      
      const brightness = 0.5 + Math.random() * 0.5;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness * 0.95;
      colors[i * 3 + 2] = brightness * 1.1;
      
      sizes[i] = 0.1 + Math.random() * 0.3;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const starCanvas = document.createElement('canvas');
    starCanvas.width = 32;
    starCanvas.height = 32;
    const starCtx = starCanvas.getContext('2d')!;
    const starGradient = starCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    starGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    starGradient.addColorStop(0.3, 'rgba(200, 220, 255, 0.6)');
    starGradient.addColorStop(1, 'rgba(150, 180, 255, 0)');
    starCtx.fillStyle = starGradient;
    starCtx.fillRect(0, 0, 32, 32);
    
    const starTexture = new THREE.CanvasTexture(starCanvas);
    
    const material = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      map: starTexture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    
    this.starField = new THREE.Points(geometry, material);
    this.scene.add(this.starField);
  }

  private createAmbientElements(): void {
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundCanvas = document.createElement('canvas');
    groundCanvas.width = 512;
    groundCanvas.height = 512;
    const groundCtx = groundCanvas.getContext('2d')!;
    
    const groundGradient = groundCtx.createRadialGradient(256, 256, 0, 256, 256, 256);
    groundGradient.addColorStop(0, 'rgba(20, 60, 120, 0.3)');
    groundGradient.addColorStop(0.5, 'rgba(10, 40, 80, 0.2)');
    groundGradient.addColorStop(1, 'rgba(5, 20, 40, 0)');
    
    groundCtx.fillStyle = groundGradient;
    groundCtx.fillRect(0, 0, 512, 512);
    
    const groundTexture = new THREE.CanvasTexture(groundCanvas);
    
    const groundMaterial = new THREE.MeshBasicMaterial({
      map: groundTexture,
      transparent: true,
      opacity: 0.6,
      depthWrite: false
    });
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -5;
    this.scene.add(ground);
    
    const ambientLight = new THREE.AmbientLight(0x4488cc, 0.5);
    this.scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0x66aaff, 1, 50);
    pointLight.position.set(0, 10, 5);
    this.scene.add(pointLight);
  }

  private onPauseToggle = (): void => {
    const isPaused = this.particleSystem.togglePause();
    this.ui.setPaused(isPaused);
  };

  private onReset = (): void => {
    this.particleSystem.startResetAnimation();
  };

  private onForceField = (
    position: THREE.Vector3,
    strength: number,
    radius: number
  ): void => {
    this.particleSystem.addForceField(position, strength, radius);
  };

  private onWindowResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };

  private updateFPS(deltaTime: number): void {
    this.fpsFrames++;
    this.fpsTime += deltaTime;
    
    if (this.fpsTime >= 0.5) {
      this.currentFPS = this.fpsFrames / this.fpsTime;
      this.ui.updateFPS(this.currentFPS);
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    
    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    
    this.controls.update(deltaTime);
    
    this.particleSystem.update(deltaTime);
    
    if (this.starField) {
      this.starField.rotation.y += deltaTime * 0.01;
    }
    
    this.updateFPS(deltaTime);
    
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onWindowResize);
    
    this.controls.dispose();
    this.particleSystem.dispose();
    this.ui.dispose();
    
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

let app: App;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
});
