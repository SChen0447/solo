import * as THREE from 'three';
import { AuroraController, AuroraControls } from './aurora';
import { StarField } from './starField';

interface BurstParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  duration: number;
  color: THREE.Color;
}

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private auroraController: AuroraController;
  private starField: StarField;

  private auroraControls: AuroraControls = {
    intensity: 5,
    hue: 120
  };

  private mouseX = 0;
  private mouseY = 0;
  private targetRotationX = 0;
  private targetRotationY = 0;
  private currentRotationX = 0;
  private currentRotationY = 0;

  private burstParticles: BurstParticle[] = [];
  private burstPoints: THREE.Points;
  private burstGeometry: THREE.BufferGeometry;
  private maxBurstParticles = 600;

  private lastTime = 0;
  private frameCount = 0;
  private fpsTime = 0;
  private startTime = 0;

  private raycaster = new THREE.Raycaster();
  private mouseNDC = new THREE.Vector2();

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.startTime = performance.now() * 0.001;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000005);
    this.scene.fog = new THREE.FogExp2(0x000005, 0.015);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.set(0, 2, 15);
    this.camera.lookAt(0, 2, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000005, 1);
    this.container.appendChild(this.renderer.domElement);

    this.auroraController = new AuroraController(this.scene);
    this.starField = new StarField(this.scene);
    this.createBurstSystem();
    this.setupEventListeners();
    this.setupControls();

    this.lastTime = this.startTime;
    this.animate(this.startTime);
  }

  private createBurstSystem(): void {
    const positions = new Float32Array(this.maxBurstParticles * 3);
    const colors = new Float32Array(this.maxBurstParticles * 3);
    const sizes = new Float32Array(this.maxBurstParticles);

    this.burstGeometry = new THREE.BufferGeometry();
    this.burstGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.burstGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.burstGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.burstGeometry.setDrawRange(0, 0);

    const material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.burstPoints = new THREE.Points(this.burstGeometry, material);
    this.scene.add(this.burstPoints);
  }

  private createBurst(worldPosition: THREE.Vector3): void {
    const particleCount = 60;
    const duration = 1.2;

    for (let i = 0; i < particleCount; i++) {
      const hue = 120 + Math.random() * 160;
      const color = new THREE.Color().setHSL(hue / 360, 0.9, 0.6);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 1.5 + Math.random() * 3;

      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.abs(Math.cos(phi)) * speed * 0.8 + 1,
        Math.sin(phi) * Math.sin(theta) * speed
      );

      this.burstParticles.push({
        position: worldPosition.clone(),
        velocity,
        life: 1.0,
        duration,
        color
      });
    }
  }

  private updateBurstParticles(dt: number): void {
    const positions = this.burstGeometry.attributes.position.array as Float32Array;
    const colors = this.burstGeometry.attributes.color.array as Float32Array;
    const sizes = this.burstGeometry.attributes.size.array as Float32Array;

    let activeCount = 0;
    const gravity = -2.0;

    for (let i = this.burstParticles.length - 1; i >= 0; i--) {
      const p = this.burstParticles[i];
      p.life -= dt / p.duration;

      if (p.life <= 0 || activeCount >= this.maxBurstParticles) {
        this.burstParticles.splice(i, 1);
        continue;
      }

      p.velocity.y += gravity * dt;
      p.position.addScaledVector(p.velocity, dt);
      p.velocity.multiplyScalar(0.98);

      const i3 = activeCount * 3;
      positions[i3] = p.position.x;
      positions[i3 + 1] = p.position.y;
      positions[i3 + 2] = p.position.z;

      const alpha = p.life;
      colors[i3] = p.color.r * alpha;
      colors[i3 + 1] = p.color.g * alpha;
      colors[i3 + 2] = p.color.b * alpha;

      sizes[activeCount] = p.life * 0.25;

      activeCount++;
    }

    this.burstGeometry.setDrawRange(0, activeCount);
    this.burstGeometry.attributes.position.needsUpdate = true;
    this.burstGeometry.attributes.color.needsUpdate = true;
    this.burstGeometry.attributes.size.needsUpdate = true;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());

    document.addEventListener('mousemove', (e) => {
      this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
      this.targetRotationY = this.mouseX * 0.3;
      this.targetRotationX = this.mouseY * 0.2;
    });

    document.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY * 0.01;
      const newZ = THREE.MathUtils.clamp(
        this.camera.position.z + delta,
        5,
        30
      );
      this.camera.position.z = newZ;
    }, { passive: false });

    document.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('#control-panel')) return;

      this.mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouseNDC, this.camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const intersection = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(plane, intersection);

      if (intersection) {
        intersection.z = THREE.MathUtils.clamp(intersection.z, -5, 5);
        this.createBurst(intersection);
      }
    });
  }

  private setupControls(): void {
    const intensitySlider = document.getElementById('intensity-slider') as HTMLInputElement;
    const intensityValue = document.getElementById('intensity-value') as HTMLElement;
    const hueSlider = document.getElementById('hue-slider') as HTMLInputElement;
    const hueValue = document.getElementById('hue-value') as HTMLElement;

    const updateSliderColors = () => {
      const hue = this.auroraControls.hue;
      const colorStr = `hsl(${hue}, 90%, 60%)`;
      const glowStr = `hsla(${hue}, 90%, 60%, 0.8)`;

      const style = document.createElement('style');
      style.textContent = `
        input[type="range"]::-webkit-slider-thumb {
          background: ${colorStr} !important;
          box-shadow: 0 0 8px ${glowStr}, 0 0 16px ${glowStr} !important;
        }
        input[type="range"]::-moz-range-thumb {
          background: ${colorStr} !important;
          box-shadow: 0 0 8px ${glowStr}, 0 0 16px ${glowStr} !important;
        }
        .slider-label span:last-child {
          color: ${colorStr} !important;
        }
      `;
      const existingStyle = document.getElementById('dynamic-slider-style');
      if (existingStyle) existingStyle.remove();
      style.id = 'dynamic-slider-style';
      document.head.appendChild(style);
    };

    intensitySlider.addEventListener('input', () => {
      this.auroraControls.intensity = parseFloat(intensitySlider.value);
      intensityValue.textContent = this.auroraControls.intensity.toFixed(1);
    });

    hueSlider.addEventListener('input', () => {
      this.auroraControls.hue = parseFloat(hueSlider.value);
      hueValue.textContent = `${Math.round(this.auroraControls.hue)}°`;
      updateSliderColors();
    });

    updateSliderColors();
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private updateFPS(time: number): void {
    this.frameCount++;
    if (time - this.fpsTime >= 1.0) {
      const fps = Math.round(this.frameCount / (time - this.fpsTime));
      const fpsEl = document.getElementById('fps-counter');
      if (fpsEl) {
        fpsEl.textContent = `FPS: ${fps} | 粒子: ${this.starField.getTotalParticles() + this.burstParticles.length}`;
      }
      this.frameCount = 0;
      this.fpsTime = time;
    }
  }

  private animate = (timeMs: number): void => {
    requestAnimationFrame(this.animate);

    const time = timeMs * 0.001;
    const dt = Math.min(time - this.lastTime, 0.1);
    this.lastTime = time;

    this.currentRotationX += (this.targetRotationX - this.currentRotationX) * 0.05;
    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.05;

    const radius = this.camera.position.length();
    const baseY = 2;
    this.camera.position.x = Math.sin(this.currentRotationY) * radius;
    this.camera.position.y = baseY + Math.sin(this.currentRotationX) * radius * 0.5;
    this.camera.position.z = Math.cos(this.currentRotationY) * radius;
    this.camera.lookAt(0, baseY, 0);

    this.auroraController.update(time, this.auroraControls);
    this.starField.update(time - this.startTime, dt, this.camera);
    this.updateBurstParticles(dt);

    this.renderer.render(this.scene, this.camera);
    this.updateFPS(time);
  };
}

new App();
