import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createGround } from './ground';
import { Dandelion } from './dandelion';
import { PhysicsSystem, LandEvent } from './seedPhysics';
import { createControlPanel, UIControls } from './ui';

interface LandParticle {
  mesh: THREE.Points;
  velocities: Float32Array;
  life: number;
}

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;

  private dandelion!: Dandelion;
  private physics!: PhysicsSystem;
  private landParticles: LandParticle[] = [];

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragPrevX: number = 0;
  private dragPrevY: number = 0;
  private lastDragTime: number = 0;

  private seedsReleased: boolean = false;
  private slowMotionActive: boolean = false;
  private slowMotionTimer: number = 0;
  private slowMotionDuration: number = 3.0;

  private clock: THREE.Clock = new THREE.Clock();
  private fpsFrames: number = 0;
  private fpsTime: number = 0;
  private fpsElement: HTMLElement;
  private shockwaveElement: HTMLElement;

  private uiControls: UIControls = {
    seedCount: 200,
    windStrength: 1.0,
    gravity: 1.0,
    onRebloom: () => this.rebloom()
  };

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.fpsElement = document.getElementById('fps')!;
    this.shockwaveElement = document.getElementById('shockwave')!;

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 2.5, 5);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 10;
    this.controls.target.set(0, 1, 0);

    this.init();
  }

  private init(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    this.scene.add(dirLight);

    const ground = createGround();
    this.scene.add(ground);

    this.dandelion = new Dandelion(500);
    this.dandelion.group.position.y = 0.01;
    this.scene.add(this.dandelion.group);

    this.physics = new PhysicsSystem(this.dandelion);
    this.physics.gravity = this.uiControls.gravity;
    this.physics.windStrength = this.uiControls.windStrength;

    this.physics.onSeedLand = (event: LandEvent) => {
      this.spawnLandParticles(event.position);
    };

    this.physics.onAllSeedsLanded = () => {
      if (!this.slowMotionActive && this.seedsReleased) {
        this.enterSlowMotion();
      }
    };

    createControlPanel(this.uiControls, this.physics);
    this.setupEventListeners();

    this.dandelion.playGrowthAnimation(0.5);
    this.animate();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onResize());

    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.dragPrevX = e.clientX;
      this.dragPrevY = e.clientY;
      this.lastDragTime = performance.now();
    });

    canvas.addEventListener('pointermove', (e) => {
      this.updateMouse(e.clientX, e.clientY);
      this.checkHover();

      if (this.isDragging && this.seedsReleased) {
        const now = performance.now();
        const dt = (now - this.lastDragTime) / 1000;
        if (dt > 0) {
          const dx = e.clientX - this.dragPrevX;
          const dy = e.clientY - this.dragPrevY;
          const speed = Math.sqrt(dx * dx + dy * dy) / dt / 500;
          this.physics.setWindFromDrag(dx, dy, speed * 2);
        }
        this.dragPrevX = e.clientX;
        this.dragPrevY = e.clientY;
        this.lastDragTime = now;
      }
    });

    canvas.addEventListener('pointerup', (e) => {
      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 5 && !this.seedsReleased) {
        this.tryClickPuffball(e.clientX, e.clientY);
      }

      this.isDragging = false;
    });

    canvas.addEventListener('pointerleave', () => {
      this.isDragging = false;
      canvas.classList.remove('crosshair');
    });
  }

  private updateMouse(clientX: number, clientY: number): void {
    this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;
  }

  private checkHover(): void {
    if (this.seedsReleased) {
      this.renderer.domElement.classList.remove('crosshair');
      return;
    }

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.dandelion.filaments,
      false
    );

    if (intersects.length > 0) {
      this.renderer.domElement.classList.add('crosshair');
    } else {
      this.renderer.domElement.classList.remove('crosshair');
    }
  }

  private tryClickPuffball(clientX: number, clientY: number): void {
    this.updateMouse(clientX, clientY);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.dandelion.filaments,
      false
    );

    if (intersects.length > 0 || this.isNearPuffball()) {
      this.releaseSeeds();
      this.playShockwave();
    }
  }

  private isNearPuffball(): boolean {
    const center = this.dandelion.getPuffballWorldPosition();
    const ray = this.raycaster.ray;
    const dirVec = center.clone().sub(ray.origin);
    const proj = dirVec.dot(ray.direction);
    if (proj < 0) return false;
    const closest = ray.origin.clone().add(ray.direction.multiplyScalar(proj));
    const dist = closest.distanceTo(center);
    return dist < this.dandelion['puffballRadius'] * 1.5;
  }

  private releaseSeeds(): void {
    const seeds = this.dandelion.initSeeds(this.uiControls.seedCount);
    this.physics.setSeeds(seeds);
    this.seedsReleased = true;
  }

  private playShockwave(): void {
    this.shockwaveElement.classList.remove('active');
    void this.shockwaveElement.offsetWidth;
    this.shockwaveElement.classList.add('active');
  }

  private enterSlowMotion(): void {
    this.slowMotionActive = true;
    this.slowMotionTimer = 0;
    this.physics.timeScale = 0.2;
  }

  private exitSlowMotion(): void {
    this.slowMotionActive = false;
    this.physics.timeScale = 1.0;
  }

  private rebloom(): void {
    this.seedsReleased = false;
    this.exitSlowMotion();
    this.dandelion.reset();
    this.physics.setSeeds([]);
    this.clearLandParticles();
    this.dandelion.playGrowthAnimation(0.5);
  }

  private spawnLandParticles(position: THREE.Vector3): void {
    const particleCount = 30;
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;
      const speed = 0.3 + Math.random() * 0.5;

      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i * 3 + 1] = Math.cos(phi) * speed + 0.2;
      velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x4CAF50,
      size: 0.02,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.landParticles.push({
      mesh: points,
      velocities,
      life: 0.5
    });
  }

  private updateLandParticles(dt: number): void {
    for (let i = this.landParticles.length - 1; i >= 0; i--) {
      const p = this.landParticles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.landParticles.splice(i, 1);
        continue;
      }

      const positions = p.mesh.geometry.attributes.position.array as Float32Array;
      const particleCount = positions.length / 3;

      for (let j = 0; j < particleCount; j++) {
        p.velocities[j * 3 + 1] -= 0.8 * dt;
        positions[j * 3] += p.velocities[j * 3] * dt;
        positions[j * 3 + 1] += p.velocities[j * 3 + 1] * dt;
        positions[j * 3 + 2] += p.velocities[j * 3 + 2] * dt;
      }

      p.mesh.geometry.attributes.position.needsUpdate = true;
      (p.mesh.material as THREE.PointsMaterial).opacity = Math.max(0, p.life * 1.8);
    }
  }

  private clearLandParticles(): void {
    for (const p of this.landParticles) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    this.landParticles = [];
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateFPS(dt: number): void {
    this.fpsFrames++;
    this.fpsTime += dt;
    if (this.fpsTime >= 0.5) {
      const fps = Math.round(this.fpsFrames / this.fpsTime);
      this.fpsElement.textContent = `FPS: ${fps}`;
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.05);

    this.updateFPS(dt);
    this.controls.update();

    if (this.seedsReleased) {
      this.physics.update(dt);
    }

    this.updateLandParticles(dt);

    if (this.slowMotionActive) {
      this.slowMotionTimer += dt;
      if (this.slowMotionTimer >= this.slowMotionDuration) {
        this.exitSlowMotion();
      }
    }

    this.renderer.render(this.scene, this.camera);
  };
}

new App();
