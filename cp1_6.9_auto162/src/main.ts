import * as THREE from 'three';
import { WaveManager, COLOR_THEMES } from './WaveManager';
import { ParticleSystem } from './ParticleSystem';
import { UIManager } from './UIManager';

class StarField {
  private scene: THREE.Scene;
  private stars: THREE.Points;
  private starCount = 500;
  private twinkleOffsets: Float32Array;
  private velocities: Float32Array;
  private currentThemeIndex = 0;
  private targetThemeIndex = 0;
  private themeTransitionProgress = 1.0;
  private readonly themeTransitionDuration = 1.5;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.starCount * 3);
    const sizes = new Float32Array(this.starCount);
    this.twinkleOffsets = new Float32Array(this.starCount);
    this.velocities = new Float32Array(this.starCount * 2);
    
    for (let i = 0; i < this.starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
      
      sizes[i] = 1 + Math.random() * 2;
      this.twinkleOffsets[i] = Math.random() * Math.PI * 2;
      
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.02 * (0.5 + Math.random() * 0.5);
      this.velocities[i * 2] = Math.cos(angle) * speed;
      this.velocities[i * 2 + 1] = Math.sin(angle) * speed;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aTwinkle', new THREE.BufferAttribute(this.twinkleOffsets, 1));
    
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBrightness: { value: 0.8 },
        uTwinkleSpeed: { value: 1.0 },
        uPixelRatio: { value: window.devicePixelRatio }
      },
      vertexShader: `
        attribute float aSize;
        attribute float aTwinkle;
        uniform float uTime;
        uniform float uBrightness;
        uniform float uTwinkleSpeed;
        uniform float uPixelRatio;
        
        varying float vAlpha;
        
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float twinkle = sin(uTime * uTwinkleSpeed + aTwinkle) * 0.3 + 0.7;
          vAlpha = twinkle * uBrightness;
          
          gl_PointSize = aSize * uPixelRatio * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          
          if (dist > 0.5) {
            discard;
          }
          
          float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
          gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  public setTheme(index: number): void {
    if (index >= 0 && index < COLOR_THEMES.length && index !== this.targetThemeIndex) {
      this.targetThemeIndex = index;
      this.themeTransitionProgress = 0;
    }
  }

  public update(deltaTime: number, time: number): void {
    if (this.themeTransitionProgress < 1.0) {
      this.themeTransitionProgress = Math.min(
        1.0,
        this.themeTransitionProgress + deltaTime / this.themeTransitionDuration
      );
      if (this.themeTransitionProgress >= 1.0) {
        this.currentThemeIndex = this.targetThemeIndex;
      }
    }
    
    const currentTheme = COLOR_THEMES[this.currentThemeIndex];
    const targetTheme = COLOR_THEMES[this.targetThemeIndex];
    const t = this.themeTransitionProgress;
    
    const brightness = THREE.MathUtils.lerp(
      currentTheme.starBrightness,
      targetTheme.starBrightness,
      t
    );
    const twinkleSpeed = THREE.MathUtils.lerp(
      currentTheme.starTwinkleSpeed,
      targetTheme.starTwinkleSpeed,
      t
    );
    
    const material = this.stars.material as THREE.ShaderMaterial;
    material.uniforms.uTime.value = time;
    material.uniforms.uBrightness.value = brightness;
    material.uniforms.uTwinkleSpeed.value = twinkleSpeed;
    
    const positions = this.stars.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < this.starCount; i++) {
      positions[i * 3] += this.velocities[i * 2] * deltaTime;
      positions[i * 3 + 2] += this.velocities[i * 2 + 1] * deltaTime;
      
      if (positions[i * 3] > 50) positions[i * 3] -= 100;
      if (positions[i * 3] < -50) positions[i * 3] += 100;
      if (positions[i * 3 + 2] > 50) positions[i * 3 + 2] -= 100;
      if (positions[i * 3 + 2] < -50) positions[i * 3 + 2] += 100;
    }
    this.stars.geometry.attributes.position.needsUpdate = true;
  }

  public setPixelRatio(ratio: number): void {
    const material = this.stars.material as THREE.ShaderMaterial;
    material.uniforms.uPixelRatio.value = ratio;
  }

  public dispose(): void {
    this.scene.remove(this.stars);
    this.stars.geometry.dispose();
    (this.stars.material as THREE.Material).dispose();
  }
}

class App {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  
  private waveManager: WaveManager;
  private particleSystem: ParticleSystem;
  private uiManager: UIManager;
  private starField: StarField;
  
  private clock = new THREE.Clock();
  private animationId: number = 0;
  
  private cameraAngle = 0;
  private cameraHeight = 8;
  private cameraDistance = 15;
  private isDragging = false;
  private dragStartMouse = new THREE.Vector2();
  private dragStartCamera: { angle: number; height: number; distance: number } = { angle: 0, height: 0, distance: 0 };

  constructor() {
    this.container = document.getElementById('app') as HTMLElement;
    if (!this.container) {
      throw new Error('Container element #app not found');
    }
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x080520, 0);
    this.container.appendChild(this.renderer.domElement);
    
    this.scene = new THREE.Scene();
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.updateCameraPosition();
    
    this.waveManager = new WaveManager(this.scene);
    this.particleSystem = new ParticleSystem(this.scene, window.devicePixelRatio);
    this.starField = new StarField(this.scene);
    
    this.uiManager = new UIManager(this.container, this.camera, {
      onParamsChange: (params) => this.waveManager.setParams(params),
      onThemeChange: (index) => {
        this.waveManager.setTheme(index);
        this.particleSystem.setTheme(index);
        this.starField.setTheme(index);
        this.uiManager.setActiveTheme(index);
      },
      onDragStart: () => {
        this.isDragging = true;
        this.dragStartCamera = {
          angle: this.cameraAngle,
          height: this.cameraHeight,
          distance: this.cameraDistance
        };
      },
      onDragEnd: () => {
        this.isDragging = false;
      },
      onDrag: (deltaX, deltaY) => {
        const params = this.waveManager.getParams();
        const newFreq = THREE.MathUtils.clamp(params.frequency + deltaX * 0.005, 0.5, 5.0);
        const newAmp = THREE.MathUtils.clamp(params.amplitude - deltaY * 0.005, 0.2, 2.0);
        this.waveManager.setParams({ frequency: newFreq, amplitude: newAmp });
        this.uiManager.updateSliders(this.waveManager.getParams());
      },
      onWheel: (deltaY) => {
        const params = this.waveManager.getParams();
        const newWave = THREE.MathUtils.clamp(params.wavelength - deltaY * 0.002, 1.0, 4.0);
        this.waveManager.setParams({ wavelength: newWave });
        this.uiManager.updateSliders(this.waveManager.getParams());
      },
      onClick: (worldPos) => {
        this.waveManager.createShockwave(worldPos);
      }
    });
    
    window.addEventListener('resize', this.onResize.bind(this));
    
    this.animate();
  }

  private updateCameraPosition(): void {
    this.camera.position.x = Math.sin(this.cameraAngle) * this.cameraDistance;
    this.camera.position.y = this.cameraHeight;
    this.camera.position.z = Math.cos(this.cameraAngle) * this.cameraDistance;
    this.camera.lookAt(0, 0, 0);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.particleSystem.setPixelRatio(window.devicePixelRatio);
    this.starField.setPixelRatio(window.devicePixelRatio);
    this.waveManager.resize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    
    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();
    
    if (!this.isDragging) {
      this.cameraAngle += deltaTime * 0.05;
      this.updateCameraPosition();
    }
    
    this.waveManager.update(deltaTime);
    this.particleSystem.update(deltaTime);
    this.starField.update(deltaTime, elapsedTime);
    
    const peaks = this.waveManager.getPeakPositions();
    if (peaks.length > 0) {
      const layerColors = this.waveManager.getLayerColors();
      this.particleSystem.spawnParticles(peaks, layerColors);
    }
    
    const shockwaves = this.waveManager.getActiveShockwaves();
    if (shockwaves.length > 0) {
      this.particleSystem.applyShockwaves(shockwaves);
    }
    
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize.bind(this));
    
    this.waveManager.dispose();
    this.particleSystem.dispose();
    this.uiManager.dispose();
    this.starField.dispose();
    
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
