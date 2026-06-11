import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SpiritSystem, Constellation, ChainLink } from './spiritSystem';

const BALL_RADIUS = 2.5;
const PARTICLE_COUNT = 500;
const LIGHT_THREAD_COUNT = 20;
const MAX_FPS = 120;
const MIN_FRAME_TIME = 1000 / MAX_FPS;
const MAX_CHAIN_LINES = 100;

export interface CrystalBallOptions {
  container: HTMLElement;
  spiritSystem: SpiritSystem;
}

export class CrystalBall {
  private container!: HTMLElement;
  private spiritSystem!: SpiritSystem;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private crystalBall!: THREE.Mesh;
  private particles!: THREE.Points;
  private lightThreads: THREE.Line[] = [];
  private chainLines: THREE.Line[] = [];
  private spiritMesh: THREE.Points | null = null;
  private backgroundParticles!: THREE.Points;
  private glowLight!: THREE.PointLight;
  private ambientLight!: THREE.AmbientLight;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private isDragging: boolean = false;
  private autoRotateSpeed: number = 0.002;
  private pulsePhase: number = 0;
  private clickPulseScale: number = 1;
  private onClickCallback: (() => void) | null = null;
  private raycaster!: THREE.Raycaster;
  private mouse!: THREE.Vector2;
  private isFastSpin: boolean = false;
  private fastSpinTimer: number = 0;
  private constellationGroup: THREE.Group | null = null;
  private borderGlow: HTMLElement | null = null;
  private dragEndTimer: number | null = null;
  private innerGlow!: THREE.Mesh;

  constructor(options: CrystalBallOptions) {
    this.container = options.container;
    this.spiritSystem = options.spiritSystem;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      100
    );
    this.camera.position.z = 6;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 10;
    this.controls.rotateSpeed = 0.8;
    this.controls.zoomSpeed = 0.6;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.spiritSystem.setOnSummonCallback((c) => this.showConstellation(c));

    this.createCrystalBall();
    this.createParticles();
    this.createLightThreads();
    this.createBackgroundParticles();
    this.setupLights();
    this.setupEventListeners();
    this.createBorderGlow();

    this.animate = this.animate.bind(this);
  }

  private createCrystalBall(): void {
    const geometry = new THREE.SphereGeometry(BALL_RADIUS, 64, 64);
    
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xe0f0ff,
      transparent: true,
      opacity: 0.3,
      transmission: 0.9,
      roughness: 0.05,
      metalness: 0.1,
      reflectivity: 0.9,
      ior: 1.5,
      thickness: 0.5,
      envMapIntensity: 1.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      side: THREE.FrontSide
    });

    this.crystalBall = new THREE.Mesh(geometry, material);
    this.scene.add(this.crystalBall);

    const innerGlowGeometry = new THREE.SphereGeometry(BALL_RADIUS * 0.95, 32, 32);
    const innerGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xa0d8f1,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide
    });
    this.innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
    this.crystalBall.add(this.innerGlow);

    const atmosphereGeometry = new THREE.SphereGeometry(BALL_RADIUS * 1.05, 32, 32);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0xc8a2f6,
      transparent: true,
      opacity: 0.03,
      side: THREE.FrontSide
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    this.crystalBall.add(atmosphere);
  }

  private createParticles(): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    const particles = this.spiritSystem.getParticles();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particles[i];
      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;

      colors[i * 3] = p.color.r;
      colors[i * 3 + 1] = p.color.g;
      colors[i * 3 + 2] = p.color.b;

      sizes[i] = p.size;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);

    this.createChainLines();
  }

  private createLightThreads(): void {
    const threads = this.spiritSystem.getLightThreads();

    for (let i = 0; i < LIGHT_THREAD_COUNT; i++) {
      const thread = threads[i];
      const curve = new THREE.CubicBezierCurve3(
        thread.start,
        thread.control1,
        thread.control2,
        thread.end
      );

      const points = curve.getPoints(20);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      const material = new THREE.LineBasicMaterial({
        color: 0xa0d8f1,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
      });

      const line = new THREE.Line(geometry, material);
      this.lightThreads.push(line);
      this.scene.add(line);
    }
  }

  private createChainLines(): void {
    for (let i = 0; i < MAX_CHAIN_LINES; i++) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(6);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const material = new THREE.LineBasicMaterial({
        color: 0xa0d8f1,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending
      });

      const line = new THREE.Line(geometry, material);
      this.chainLines.push(line);
      this.scene.add(line);
    }
  }

  private updateChainLinks(): void {
    const links = this.spiritSystem.getChainLinks();
    const particles = this.spiritSystem.getParticles();

    for (let i = 0; i < MAX_CHAIN_LINES; i++) {
      const line = this.chainLines[i];
      const material = line.material as THREE.LineBasicMaterial;

      if (i < links.length) {
        const link = links[i];
        const pA = particles[link.particleA];
        const pB = particles[link.particleB];

        const positionAttr = line.geometry.getAttribute('position') as THREE.BufferAttribute;
        const positions = positionAttr.array as Float32Array;

        positions[0] = pA.position.x;
        positions[1] = pA.position.y;
        positions[2] = pA.position.z;
        positions[3] = pB.position.x;
        positions[4] = pB.position.y;
        positions[5] = pB.position.z;

        positionAttr.needsUpdate = true;
        material.opacity = link.opacity * 0.15;
      } else {
        material.opacity = 0;
      }
    }
  }

  private createBackgroundParticles(): void {
    const count = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const r = 15 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xc8a2f6,
      size: 0.08,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    this.backgroundParticles = new THREE.Points(geometry, material);
    this.scene.add(this.backgroundParticles);
  }

  private setupLights(): void {
    this.ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(this.ambientLight);

    this.glowLight = new THREE.PointLight(0xa0d8f1, 1, 10);
    this.glowLight.position.set(0, 0, 0);
    this.scene.add(this.glowLight);

    const rimLight = new THREE.DirectionalLight(0xc8a2f6, 0.3);
    rimLight.position.set(5, 3, 5);
    this.scene.add(rimLight);

    const backLight = new THREE.DirectionalLight(0xa0d8f1, 0.2);
    backLight.position.set(-5, -2, -5);
    this.scene.add(backLight);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));
    this.controls.addEventListener('start', this.onControlStart.bind(this));
    this.controls.addEventListener('end', this.onControlEnd.bind(this));
  }

  private onResize(): void {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  private onClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.crystalBall);

    if (intersects.length > 0) {
      this.clickPulseScale = 1.02;
      this.triggerFastSpin();

      if (this.onClickCallback) {
        this.onClickCallback();
      }
    }
  }

  private onControlStart(): void {
    this.isDragging = true;
    this.spiritSystem.setGathering(false);
    if (this.dragEndTimer !== null) {
      clearTimeout(this.dragEndTimer);
      this.dragEndTimer = null;
    }
  }

  private onControlEnd(): void {
    this.isDragging = false;
    this.dragEndTimer = window.setTimeout(() => {
      if (!this.isDragging) {
        this.spiritSystem.setGathering(true);
      }
    }, 1000);
  }

  public triggerFastSpin(): void {
    this.isFastSpin = true;
    this.fastSpinTimer = 2;
  }

  public isFastSpinning(): boolean {
    return this.isFastSpin;
  }

  private createBorderGlow(): void {
    this.borderGlow = document.createElement('div');
    this.borderGlow.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      box-shadow: inset 0 0 100px 20px rgba(255, 215, 0, 0);
      transition: box-shadow 0.3s ease;
      z-index: 100;
    `;
    document.body.appendChild(this.borderGlow);
  }

  private showConstellation(constellation: Constellation): void {
    this.createConstellationLines(constellation);
    this.createSpiritAvatar(constellation);
    this.showBorderGlow(constellation.color);

    setTimeout(() => {
      this.hideBorderGlow();
    }, 1500);
  }

  private createConstellationLines(constellation: Constellation): void {
    if (this.constellationGroup) {
      this.scene.remove(this.constellationGroup);
    }

    this.constellationGroup = new THREE.Group();

    const pointGeometry = new THREE.SphereGeometry(0.06, 8, 8);
    const pointMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(constellation.color),
      transparent: true,
      opacity: 1
    });

    for (const point of constellation.points) {
      const star = new THREE.Mesh(pointGeometry, pointMaterial.clone());
      star.position.copy(point);
      this.constellationGroup.add(star);
    }

    for (const [startIdx, endIdx] of constellation.connections) {
      const start = constellation.points[startIdx];
      const end = constellation.points[endIdx];

      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const curvePoints = curve.getPoints(10);

      const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(constellation.color),
        transparent: true,
        opacity: 0.8
      });

      const line = new THREE.Line(geometry, material);
      this.constellationGroup.add(line);
    }

    this.scene.add(this.constellationGroup);
  }

  private createSpiritAvatar(constellation: Constellation): void {
    if (this.spiritMesh) {
      this.scene.remove(this.spiritMesh);
      this.spiritMesh = null;
    }

    const particleCount = 300;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const color = new THREE.Color(constellation.color);
    const avatarRadius = BALL_RADIUS * 0.4;

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = avatarRadius * (0.7 + Math.random() * 0.3);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(phi) * 1.2;
      positions[i * 3 + 2] = r * Math.cos(phi) * 0.6;

      const brightness = 0.5 + Math.random() * 0.5;
      colors[i * 3] = color.r * brightness;
      colors[i * 3 + 1] = color.g * brightness;
      colors[i * 3 + 2] = color.b * brightness;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.spiritMesh = new THREE.Points(geometry, material);
    this.scene.add(this.spiritMesh);

    let opacity = 0;
    const fadeIn = setInterval(() => {
      opacity += 0.05;
      if (this.spiritMesh && this.spiritMesh.material instanceof THREE.PointsMaterial) {
        this.spiritMesh.material.opacity = Math.min(0.8, opacity);
      }
      if (opacity >= 0.8) {
        clearInterval(fadeIn);
      }
    }, 50);

    setTimeout(() => {
      const fadeOut = setInterval(() => {
        opacity -= 0.03;
        if (this.spiritMesh && this.spiritMesh.material instanceof THREE.PointsMaterial) {
          this.spiritMesh.material.opacity = Math.max(0, opacity);
        }
        if (opacity <= 0) {
          clearInterval(fadeOut);
          if (this.spiritMesh) {
            this.scene.remove(this.spiritMesh);
            this.spiritMesh = null;
          }
        }
      }, 50);
    }, 4500);
  }

  private showBorderGlow(color: string): void {
    if (this.borderGlow) {
      this.borderGlow.style.boxShadow = `inset 0 0 100px 20px ${color}4d`;
    }
  }

  private hideBorderGlow(): void {
    if (this.borderGlow) {
      this.borderGlow.style.boxShadow = 'inset 0 0 100px 20px rgba(255, 255, 255, 0)';
    }
  }

  public setOnClickCallback(callback: () => void): void {
    this.onClickCallback = callback;
  }

  public start(): void {
    this.lastTime = performance.now();
    this.animate();
  }

  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate);

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;

    if (deltaTime < MIN_FRAME_TIME) {
      return;
    }

    this.lastTime = currentTime;
    const dt = Math.min(deltaTime / 1000, 0.05);

    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  private update(dt: number): void {
    this.controls.update();

    this.pulsePhase += dt * (Math.PI * 2 / 4);

    if (this.crystalBall.material instanceof THREE.MeshPhysicalMaterial) {
      const pulseOpacity = 0.3 + Math.sin(this.pulsePhase) * 0.05;
      this.crystalBall.material.opacity = pulseOpacity;
    }

    if (this.clickPulseScale > 1) {
      this.clickPulseScale = Math.max(1, this.clickPulseScale - dt * 5);
      this.crystalBall.scale.setScalar(this.clickPulseScale);
    }

    if (this.isFastSpin) {
      this.fastSpinTimer -= dt;
      if (this.fastSpinTimer <= 0) {
        this.isFastSpin = false;
      }
      this.crystalBall.rotation.y += 0.03 * dt * 60;
    }

    if (!this.isDragging) {
      const rotateSpeed = this.isFastSpin ? 0.01 : this.autoRotateSpeed;
      this.crystalBall.rotation.y += rotateSpeed * dt * 60;
    }

    this.spiritSystem.update(dt);
    this.updateParticlePositions();
    this.updateLightThreads();
    this.updateChainLinks();

    this.glowLight.intensity = 1.0 + Math.sin(this.pulsePhase * 0.5) * 0.3;

    if (this.innerGlow && this.innerGlow.material instanceof THREE.MeshBasicMaterial) {
      this.innerGlow.material.opacity = 0.08 + Math.sin(this.pulsePhase) * 0.03;
    }

    this.backgroundParticles.rotation.y += 0.0002 * dt * 60;

    if (this.constellationGroup) {
      const summonState = this.spiritSystem.getSummonState();
      if (summonState.isSummoning) {
        const isFlashing = this.spiritSystem.isFlashing();
        this.constellationGroup.visible = true;
        this.constellationGroup.children.forEach(child => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
            child.material.opacity = isFlashing ? 1 : 0.3;
          }
          if (child instanceof THREE.Line && child.material instanceof THREE.LineBasicMaterial) {
            child.material.opacity = isFlashing ? 0.9 : 0.2;
          }
        });
      } else {
        this.constellationGroup.visible = false;
      }
    }
  }

  private updateParticlePositions(): void {
    const particles = this.spiritSystem.getParticles();
    const positionAttr = this.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
    const positions = positionAttr.array as Float32Array;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;
    }

    positionAttr.needsUpdate = true;
  }

  private updateLightThreads(): void {
    const threads = this.spiritSystem.getLightThreads();

    for (let i = 0; i < LIGHT_THREAD_COUNT; i++) {
      const thread = threads[i];
      const line = this.lightThreads[i];

      const curve = new THREE.CubicBezierCurve3(
        thread.start,
        thread.control1,
        thread.control2,
        thread.end
      );

      const points = curve.getPoints(20);
      const positionAttr = line.geometry.getAttribute('position') as THREE.BufferAttribute;
      const positions = positionAttr.array as Float32Array;

      for (let j = 0; j < points.length; j++) {
        positions[j * 3] = points[j].x;
        positions[j * 3 + 1] = points[j].y;
        positions[j * 3 + 2] = points[j].z;
      }

      positionAttr.needsUpdate = true;
      line.geometry.computeBoundingSphere();
    }
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public replayConstellation(constellation: Constellation): void {
    this.createConstellationLines(constellation);
    this.showBorderGlow(constellation.color);

    setTimeout(() => {
      if (this.constellationGroup) {
        this.scene.remove(this.constellationGroup);
        this.constellationGroup = null;
      }
      this.hideBorderGlow();
    }, 3000);
  }

  public dispose(): void {
    this.stop();

    if (this.dragEndTimer !== null) {
      clearTimeout(this.dragEndTimer);
    }

    if (this.borderGlow && this.borderGlow.parentNode) {
      this.borderGlow.parentNode.removeChild(this.borderGlow);
    }

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }

    window.removeEventListener('resize', this.onResize.bind(this));
  }
}
