import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Nebula } from './nebula';
import { ParticleSystem } from './particleSystem';
import { AudioManager } from './audioManager';

interface DragState {
  isDragging: boolean;
  nebula: Nebula | null;
  startPoint: THREE.Vector3;
  currentPoint: THREE.Vector3;
  line: THREE.Line | null;
}

class CosmosApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private nebulas: Nebula[] = [];
  private particleSystem: ParticleSystem;
  private audioManager: AudioManager;
  private clock: THREE.Clock;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private dragState: DragState;
  private isPaused: boolean = false;
  private mergeCount: number = 0;
  private initialNebulaConfigs: Array<{ position: THREE.Vector3; color: number; radius: number }>;
  private stars: THREE.Points | null = null;
  private appContainer: HTMLElement;
  private statsNebulaCount: HTMLElement | null = null;
  private statsMergeCount: HTMLElement | null = null;
  private statsParticleCount: HTMLElement | null = null;
  private volumeSlider: HTMLInputElement | null = null;
  private rateSlider: HTMLInputElement | null = null;
  private resizeHandler: () => void;
  private animationId: number = 0;

  constructor() {
    this.appContainer = document.getElementById('app') || document.body;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.audioManager = new AudioManager();
    this.dragState = {
      isDragging: false,
      nebula: null,
      startPoint: new THREE.Vector3(),
      currentPoint: new THREE.Vector3(),
      line: null
    };

    this.initialNebulaConfigs = [
      { position: new THREE.Vector3(-4, 0, 0), color: 0x8a2be2, radius: 2.5 },
      { position: new THREE.Vector3(4, 0, 0), color: 0x00bfff, radius: 2.2 },
      { position: new THREE.Vector3(0, 3, -2), color: 0xff1493, radius: 2.0 }
    ];

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 2, 12);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.appContainer.appendChild(this.renderer.domElement);

    const renderPass = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.6,
      0.4,
      0.2
    );
    bloomPass.threshold = 0.2;
    bloomPass.strength = 0.6;
    bloomPass.radius = 0.8;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderPass);
    this.composer.addPass(bloomPass);

    this.particleSystem = new ParticleSystem(this.scene);

    this.setupBackground();
    this.createInitialNebulas();
    this.setupUI();
    this.setupEventListeners();
    this.setupResizeHandler();
    this.resizeHandler = this.onWindowResize.bind(this);
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#000008');
    gradient.addColorStop(1, '#0a0a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;

    const starCount = 1500;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    const starColorStart = new THREE.Color(0xffffff);
    const starColorEnd = new THREE.Color(0xc8d8ff);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const radius = 30 + Math.random() * 70;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      const mix = Math.random();
      const c = starColorStart.clone().lerp(starColorEnd, mix);
      colors[i3] = c.r;
      colors[i3 + 1] = c.g;
      colors[i3 + 2] = c.b;
      sizes[i] = 0.01 + Math.random() * 0.04;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      depthWrite: false
    });

    this.stars = new THREE.Points(starGeo, starMat);
    this.scene.add(this.stars);

    const ambientLight = new THREE.AmbientLight(0x404050, 0.3);
    this.scene.add(ambientLight);
  }

  private createInitialNebulas(): void {
    this.clearNebulas();
    for (const config of this.initialNebulaConfigs) {
      const nebula = new Nebula(
        this.scene,
        config.position.clone(),
        config.color,
        config.radius
      );
      this.nebulas.push(nebula);
    }
    this.mergeCount = 0;
    this.updateStatsUI();
  }

  private clearNebulas(): void {
    for (const nebula of this.nebulas) {
      nebula.dispose(this.scene);
    }
    this.nebulas = [];
  }

  private setupUI(): void {
    const panel = document.createElement('div');
    panel.className = 'control-panel';
    panel.innerHTML = `
      <div class="panel-title">✦ 星云控制台</div>
      <div class="stats-row">
        <span class="stats-label">星云数量</span>
        <span class="stats-value" id="nebula-count">3</span>
      </div>
      <div class="stats-row">
        <span class="stats-label">融合次数</span>
        <span class="stats-value" id="merge-count">0</span>
      </div>
      <div class="stats-row">
        <span class="stats-label">粒子总数</span>
        <span class="stats-value" id="particle-count">0</span>
      </div>
      <div class="control-group">
        <div class="control-label">
          <span>音频音量</span>
          <span id="volume-value">5</span>
        </div>
        <input type="range" id="volume-slider" min="0" max="10" value="5">
      </div>
      <div class="control-group">
        <div class="control-label">
          <span>粒子速率</span>
          <span id="rate-value">5</span>
        </div>
        <input type="range" id="rate-slider" min="0" max="10" value="5">
      </div>
      <div class="info-hint">
        <kbd>拖拽</kbd> 星云使它们碰撞融合<br>
        <kbd>空格</kbd> 暂停/继续 &nbsp; <kbd>R</kbd> 重置
      </div>
    `;
    document.body.appendChild(panel);

    const toggle = document.createElement('div');
    toggle.className = 'panel-toggle';
    toggle.innerHTML = '✦';
    document.body.appendChild(toggle);

    this.statsNebulaCount = document.getElementById('nebula-count');
    this.statsMergeCount = document.getElementById('merge-count');
    this.statsParticleCount = document.getElementById('particle-count');
    this.volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
    this.rateSlider = document.getElementById('rate-slider') as HTMLInputElement;

    const volumeValue = document.getElementById('volume-value');
    const rateValue = document.getElementById('rate-value');

    this.volumeSlider.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value);
      this.audioManager.setVolume(val);
      if (volumeValue) volumeValue.textContent = val.toString();
    });

    this.rateSlider.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value);
      this.particleSystem.setGenerationRate(val);
      if (rateValue) rateValue.textContent = val.toString();
    });

    toggle.addEventListener('click', () => {
      panel.classList.toggle('open');
    });
  }

  private updateStatsUI(): void {
    if (this.statsNebulaCount) this.statsNebulaCount.textContent = this.nebulas.length.toString();
    if (this.statsMergeCount) this.statsMergeCount.textContent = this.mergeCount.toString();
    if (this.statsParticleCount) this.statsParticleCount.textContent = this.particleSystem.getActiveCount().toString();
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    canvas.addEventListener('pointermove', this.onPointerMove.bind(this));
    canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
    canvas.addEventListener('pointerleave', this.onPointerUp.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', this.resizeHandler);
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  private getIntersection(clientX: number, clientY: number): THREE.Intersection | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.nebulas.map(n => n.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);
    return intersects.length > 0 ? intersects[0] : null;
  }

  private getPlaneIntersection(clientX: number, clientY: number, planeZ: number): THREE.Vector3 {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -planeZ);
    const point = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, point);
    return point;
  }

  private onPointerDown(e: PointerEvent): void {
    const intersection = this.getIntersection(e.clientX, e.clientY);
    if (intersection && intersection.object.userData.nebula) {
      const nebula = intersection.object.userData.nebula as Nebula;
      this.dragState.isDragging = true;
      this.dragState.nebula = nebula;
      nebula.isDragging = true;

      const planeZ = nebula.position.z;
      this.dragState.startPoint = this.getPlaneIntersection(e.clientX, e.clientY, planeZ);
      this.dragState.currentPoint.copy(this.dragState.startPoint);

      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        this.dragState.startPoint.clone(),
        this.dragState.currentPoint.clone()
      ]);
      const lineMat = new THREE.LineBasicMaterial({
        color: nebula.color,
        transparent: true,
        opacity: 0.8,
        linewidth: 2
      });
      this.dragState.line = new THREE.Line(lineGeo, lineMat);
      this.scene.add(this.dragState.line);

      this.renderer.domElement.setPointerCapture(e.pointerId);
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.dragState.isDragging || !this.dragState.nebula) return;

    const planeZ = this.dragState.nebula.position.z;
    this.dragState.currentPoint = this.getPlaneIntersection(e.clientX, e.clientY, planeZ);

    const constrainedPoint = this.dragState.currentPoint.clone();
    const maxDist = 8;
    const distFromCenter = constrainedPoint.length();
    if (distFromCenter > maxDist) {
      constrainedPoint.multiplyScalar(maxDist / distFromCenter);
    }

    this.dragState.nebula.position = constrainedPoint;

    if (this.dragState.line) {
      const positions = new Float32Array([
        this.dragState.startPoint.x, this.dragState.startPoint.y, this.dragState.startPoint.z,
        constrainedPoint.x, constrainedPoint.y, constrainedPoint.z
      ]);
      this.dragState.line.geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(positions, 3)
      );
      this.dragState.line.geometry.attributes.position.needsUpdate = true;
    }
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.dragState.isDragging) return;

    if (this.dragState.nebula) {
      this.dragState.nebula.isDragging = false;
    }

    if (this.dragState.line) {
      this.scene.remove(this.dragState.line);
      this.dragState.line.geometry.dispose();
      (this.dragState.line.material as THREE.Material).dispose();
      this.dragState.line = null;
    }

    this.dragState.isDragging = false;
    this.dragState.nebula = null;

    try {
      this.renderer.domElement.releasePointerCapture(e.pointerId);
    } catch (_) {}
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      e.preventDefault();
      this.togglePause();
    } else if (e.code === 'KeyR') {
      this.reset();
    }
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    for (const nebula of this.nebulas) {
      nebula.setPaused(this.isPaused);
    }
    this.particleSystem.setPaused(this.isPaused);
  }

  private reset(): void {
    this.particleSystem.reset();
    this.createInitialNebulas();
    this.isPaused = false;
  }

  private checkAndPerformMerges(): void {
    if (this.nebulas.length < 2) return;

    const toRemove: Set<Nebula> = new Set();
    const toAdd: Nebula[] = [];

    for (let i = 0; i < this.nebulas.length; i++) {
      for (let j = i + 1; j < this.nebulas.length; j++) {
        const n1 = this.nebulas[i];
        const n2 = this.nebulas[j];

        if (toRemove.has(n1) || toRemove.has(n2)) continue;
        if (n1.isMerging || n2.isMerging) continue;

        if (n1.checkCollision(n2)) {
          const result = n1.computeMerge(n2);
          this.particleSystem.emitBurst(
            result.collisionPoint,
            80,
            result.newColor.getHex(),
            result.velocity
          );
          this.audioManager.playMergeSound(
            result.velocity,
            result.angle,
            result.mass
          );

          n1.applyMerge(result);
          toRemove.add(n2);
          this.mergeCount++;
          break;
        }
      }
    }

    if (toRemove.size > 0) {
      this.nebulas = this.nebulas.filter(n => !toRemove.has(n));
      for (const n of toRemove) {
        n.dispose(this.scene);
      }
    }

    this.nebulas.push(...toAdd);
  }

  public start(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      const delta = Math.min(this.clock.getDelta(), 0.05);

      for (const nebula of this.nebulas) {
        nebula.update(delta);
      }

      this.particleSystem.update(delta);
      this.checkAndPerformMerges();
      this.updateStatsUI();

      this.composer.render();
    };
    animate();
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.resizeHandler);
    for (const nebula of this.nebulas) {
      nebula.dispose(this.scene);
    }
    this.particleSystem.reset();
    this.renderer.dispose();
    this.composer.dispose();
    if (this.stars) {
      (this.stars.geometry as THREE.BufferGeometry).dispose();
      (this.stars.material as THREE.Material).dispose();
    }
  }
}

const app = new CosmosApp();
app.start();
