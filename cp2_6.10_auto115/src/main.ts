import * as THREE from 'three';
import { buildCastleRuins, SceneBuildResult } from './sceneBuilder';
import { LightingController } from './lightingController';

class CastleExplorer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private lightingController: LightingController;
  private castleScene: SceneBuildResult;

  private keys: Set<string> = new Set();
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private yaw: number = 0;
  private pitch: number = 0;

  private readonly MOVE_SPEED = 5.0;
  private readonly CAMERA_HEIGHT = 1.6;
  private readonly PITCH_MIN = -30 * (Math.PI / 180);
  private readonly PITCH_MAX = 60 * (Math.PI / 180);
  private readonly ROTATION_SPEED = 0.002;

  private particles: THREE.Mesh[] = [];
  private particleVelocities: THREE.Vector3[] = [];
  private readonly PARTICLE_COUNT = 200;

  private shakeTime: number = 0;
  private shakeIntensity: number = 0.03;
  private baseCameraPos: THREE.Vector3 = new THREE.Vector3(0, 1.6, 5);

  private clock: THREE.Clock = new THREE.Clock();
  private fpsFrames: number = 0;
  private fpsTime: number = 0;
  private fpsDisplay: HTMLElement | null = null;

  private timeSlider: HTMLInputElement | null = null;
  private intensitySlider: HTMLInputElement | null = null;
  private timeValueDisplay: HTMLElement | null = null;
  private intensityValueDisplay: HTMLElement | null = null;

  constructor() {
    const canvas = document.getElementById('app') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element #app not found');
    }

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.copy(this.baseCameraPos);
    this.camera.lookAt(0, this.CAMERA_HEIGHT, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.lightingController = new LightingController(this.scene);
    this.castleScene = buildCastleRuins();
    this.scene.add(this.castleScene.group);

    this.createParticles();
    this.setupEventListeners();
    this.setupUI();

    this.animate = this.animate.bind(this);
    this.animate();
  }

  private createParticles(): void {
    const radius = 10;
    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      const pRadius = 0.03 + Math.random() * 0.04;
      const geo = new THREE.SphereGeometry(pRadius, 6, 6);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.2,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geo, mat);

      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;
      const y = 0.3 + Math.random() * 5;

      mesh.position.set(
        Math.cos(angle) * dist,
        y,
        Math.sin(angle) * dist
      );

      const velAngle = Math.random() * Math.PI * 2;
      const velSpeed = 0.05 + Math.random() * 0.05;
      this.particleVelocities.push(new THREE.Vector3(
        Math.cos(velAngle) * velSpeed,
        (Math.random() - 0.5) * 0.02,
        Math.sin(velAngle) * velSpeed
      ));

      this.scene.add(mesh);
      this.particles.push(mesh);
    }
  }

  private updateParticles(delta: number): void {
    const complement = this.lightingController.getComplementaryAmbient();
    const opacityFactor = this.lightingController.getParticleOpacityFactor();
    const radius = 12;

    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      const p = this.particles[i];
      const v = this.particleVelocities[i];

      p.position.x += v.x * delta;
      p.position.y += v.y * delta;
      p.position.z += v.z * delta;

      const dist = Math.sqrt(p.position.x ** 2 + p.position.z ** 2);
      if (dist > radius) {
        const norm = 1 / dist;
        p.position.x *= -norm * radius * 0.9;
        p.position.z *= -norm * radius * 0.9;
      }
      if (p.position.y < 0.2) p.position.y = 5;
      if (p.position.y > 6) p.position.y = 0.3;

      if (Math.random() < 0.002) {
        const velAngle = Math.random() * Math.PI * 2;
        v.x = Math.cos(velAngle) * (0.05 + Math.random() * 0.05);
        v.z = Math.sin(velAngle) * (0.05 + Math.random() * 0.05);
        v.y = (Math.random() - 0.5) * 0.02;
      }

      const mat = p.material as THREE.MeshBasicMaterial;
      mat.color.copy(complement);
      const baseOpacity = 0.05 + opacityFactor * 0.45;
      mat.opacity = baseOpacity * (0.5 + Math.random() * 0.5);
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.yaw -= dx * this.ROTATION_SPEED;
      this.pitch -= dy * this.ROTATION_SPEED;
      this.pitch = Math.max(this.PITCH_MIN, Math.min(this.PITCH_MAX, this.pitch));
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private setupUI(): void {
    this.fpsDisplay = document.getElementById('fps-counter');
    this.timeSlider = document.getElementById('time-slider') as HTMLInputElement;
    this.intensitySlider = document.getElementById('intensity-slider') as HTMLInputElement;
    this.timeValueDisplay = document.getElementById('time-value');
    this.intensityValueDisplay = document.getElementById('intensity-value');

    if (this.timeSlider) {
      this.timeSlider.addEventListener('input', (e) => {
        const val = parseFloat((e.target as HTMLInputElement).value);
        this.lightingController.timeOfDay = val;
        if (this.timeValueDisplay) {
          this.timeValueDisplay.textContent = val.toFixed(2);
        }
      });
    }

    if (this.intensitySlider) {
      this.intensitySlider.addEventListener('input', (e) => {
        const val = parseFloat((e.target as HTMLInputElement).value);
        this.lightingController.directionalIntensity = val;
        if (this.intensityValueDisplay) {
          this.intensityValueDisplay.textContent = val.toFixed(2);
        }
      });
    }
  }

  private checkCollision(pos: THREE.Vector3): boolean {
    const testBox = new THREE.Box3(
      new THREE.Vector3(pos.x - 0.3, pos.y - this.CAMERA_HEIGHT, pos.z - 0.3),
      new THREE.Vector3(pos.x + 0.3, pos.y + 0.2, pos.z + 0.3)
    );

    for (const collider of this.castleScene.colliders) {
      if (testBox.intersectsBox(collider)) {
        return true;
      }
    }

    const distFromCenter = Math.sqrt(pos.x ** 2 + pos.z ** 2);
    if (distFromCenter > 14) return true;

    return false;
  }

  private triggerShake(): void {
    this.shakeTime = 0.08;
  }

  private updateCamera(delta: number): void {
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    const forward = new THREE.Vector3(
      -Math.sin(this.yaw),
      0,
      -Math.cos(this.yaw)
    );
    const right = new THREE.Vector3(
      Math.cos(this.yaw),
      0,
      -Math.sin(this.yaw)
    );

    let moveX = 0;
    let moveZ = 0;

    if (this.keys.has('KeyW')) {
      moveX += forward.x;
      moveZ += forward.z;
    }
    if (this.keys.has('KeyS')) {
      moveX -= forward.x;
      moveZ -= forward.z;
    }
    if (this.keys.has('KeyD')) {
      moveX += right.x;
      moveZ += right.z;
    }
    if (this.keys.has('KeyA')) {
      moveX -= right.x;
      moveZ -= right.z;
    }

    const len = Math.sqrt(moveX ** 2 + moveZ ** 2);
    if (len > 0) {
      moveX = (moveX / len) * this.MOVE_SPEED * delta;
      moveZ = (moveZ / len) * this.MOVE_SPEED * delta;

      const currentPos = this.baseCameraPos.clone();

      const testX = currentPos.clone();
      testX.x += moveX;
      if (!this.checkCollision(testX)) {
        this.baseCameraPos.x = testX.x;
      } else {
        this.triggerShake();
      }

      const testZ = currentPos.clone();
      testZ.x = this.baseCameraPos.x;
      testZ.z += moveZ;
      if (!this.checkCollision(testZ)) {
        this.baseCameraPos.z = testZ.z;
      } else {
        this.triggerShake();
      }
    }

    this.baseCameraPos.y = this.CAMERA_HEIGHT;

    if (this.shakeTime > 0) {
      this.shakeTime -= delta;
      const shakeFactor = this.shakeTime > 0 ? Math.sin(this.shakeTime * 80) * this.shakeIntensity : 0;
      this.camera.position.x = this.baseCameraPos.x + shakeFactor * (Math.random() - 0.5);
      this.camera.position.y = this.baseCameraPos.y + shakeFactor * (Math.random() - 0.5);
      this.camera.position.z = this.baseCameraPos.z + shakeFactor * (Math.random() - 0.5);
    } else {
      this.camera.position.copy(this.baseCameraPos);
    }
  }

  private updateFPS(delta: number): void {
    this.fpsFrames++;
    this.fpsTime += delta;
    if (this.fpsTime >= 0.5) {
      const fps = Math.round(this.fpsFrames / this.fpsTime);
      if (this.fpsDisplay) {
        this.fpsDisplay.textContent = fps.toString();
      }
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }
  }

  private animate(): void {
    requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.05);

    this.updateCamera(delta);
    this.updateParticles(delta);
    this.updateFPS(delta);

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new CastleExplorer();
});
