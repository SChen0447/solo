import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GearSystem } from './gearSystem';
import { PuzzleManager, PuzzleState } from './puzzleManager';
import { InteractionManager } from './interaction';

class ClocktowerGame {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;
  private gearSystem: GearSystem;
  private puzzleManager: PuzzleManager;
  private interactionManager: InteractionManager;
  private clock: THREE.Clock;
  private platforms: THREE.Mesh[] = [];
  private driveRods: THREE.Mesh[] = [];
  private stairs: THREE.Group[] = [];
  private victoryParticles: THREE.Points | null = null;
  private steamParticles: THREE.Points | null = null;
  private steamGeometry: THREE.BufferGeometry | null = null;
  private steamVelocities: Float32Array | null = null;
  private layerHeight = 30;
  private baseRadius = 35;
  private totalParticles = 0;
  private maxTotalParticles = 1000;
  private lastFrameTime = 0;
  private frameCount = 0;

  constructor() {
    this.container = document.getElementById('game-container')!;
    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();

    this.createLighting();
    this.createClocktower();
    this.createFog();

    this.gearSystem = new GearSystem(this.scene);
    this.puzzleManager = new PuzzleManager();
    this.interactionManager = new InteractionManager(
      this.scene,
      this.camera,
      this.renderer,
      this.gearSystem,
      this.container,
      {
        onStep: () => this.puzzleManager.incrementStep(),
        onError: () => this.puzzleManager.incrementError(),
        onGearConnected: () => this.updateRatio(),
        onGearDisconnected: () => this.updateRatio(),
        onGearRotated: () => this.updateRatio()
      }
    );

    this.puzzleManager.setStateChangeCallback((state) => this.onPuzzleStateChange(state));

    this.setupUI();
    this.loadLevel();
    this.animate();
    window.addEventListener('resize', () => this.onWindowResize());
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();

    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#3E2723');
    gradient.addColorStop(1, '#1B5E20');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    scene.background = texture;

    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    camera.position.set(80, 50, 80);
    camera.lookAt(0, 20, 0);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 40;
    controls.maxDistance = 200;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minPolarAngle = Math.PI / 6;
    controls.target.set(0, 15, 0);
    return controls;
  }

  private createLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffd700, 0.8);
    mainLight.position.set(50, 100, 50);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 500;
    mainLight.shadow.camera.left = -100;
    mainLight.shadow.camera.right = 100;
    mainLight.shadow.camera.top = 100;
    mainLight.shadow.camera.bottom = -100;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x00ff88, 0.2);
    fillLight.position.set(-50, 50, -50);
    this.scene.add(fillLight);

    for (let i = 0; i < 4; i++) {
      const y = i * this.layerHeight + 20;
      const pointLight = new THREE.PointLight(0xffaa33, 0.5, 80);
      pointLight.position.set(0, y, 0);
      this.scene.add(pointLight);

      const edgeLight1 = new THREE.PointLight(0xff6600, 0.3, 40);
      edgeLight1.position.set(Math.cos(i) * (this.baseRadius + i * 10), y, Math.sin(i) * (this.baseRadius + i * 10));
      this.scene.add(edgeLight1);

      const edgeLight2 = new THREE.PointLight(0xff6600, 0.3, 40);
      edgeLight2.position.set(-Math.cos(i) * (this.baseRadius + i * 10), y, -Math.sin(i) * (this.baseRadius + i * 10));
      this.scene.add(edgeLight2);
    }
  }

  private createFog(): void {
    this.scene.fog = new THREE.Fog(0x1a1a2e, 100, 300);
  }

  private createClocktower(): void {
    for (let i = 0; i < 4; i++) {
      const y = i * this.layerHeight;
      const radius = this.baseRadius + i * 10;

      const platformGeometry = new THREE.CylinderGeometry(radius, radius, 5, 48);
      const platformMaterial = new THREE.MeshStandardMaterial({
        color: 0x3d2817,
        metalness: 0.6,
        roughness: 0.5
      });
      const platform = new THREE.Mesh(platformGeometry, platformMaterial);
      platform.position.y = y;
      platform.receiveShadow = true;
      platform.castShadow = true;
      this.scene.add(platform);
      this.platforms.push(platform);

      const ringGeometry = new THREE.TorusGeometry(radius, 1, 16, 64);
      const ringMaterial = new THREE.MeshStandardMaterial({
        color: 0xcd7f32,
        metalness: 0.9,
        roughness: 0.3,
        emissive: 0x332200,
        emissiveIntensity: 0.2
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.y = y + 2.5;
      ring.rotation.x = Math.PI / 2;
      this.scene.add(ring);

      const rodGeometry = new THREE.CylinderGeometry(5, 5, 20, 24);
      const rodMaterial = new THREE.MeshStandardMaterial({
        color: 0xc5a642,
        metalness: 0.95,
        roughness: 0.2,
        emissive: 0x443300,
        emissiveIntensity: 0.3
      });
      const rod = new THREE.Mesh(rodGeometry, rodMaterial);
      rod.position.y = y + 10;
      rod.castShadow = true;
      this.scene.add(rod);
      this.driveRods.push(rod);

      const stairGroup = new THREE.Group();
      const stairCount = 8;
      for (let s = 0; s < stairCount; s++) {
        const stairGeometry = new THREE.BoxGeometry(6, 2, 10);
        const stairMaterial = new THREE.MeshStandardMaterial({
          color: 0x8b6914,
          metalness: 0.7,
          roughness: 0.4
        });
        const stair = new THREE.Mesh(stairGeometry, stairMaterial);
        const angle = (s / stairCount) * Math.PI * 0.5 - Math.PI / 4;
        stair.position.set(
          Math.cos(angle) * (radius - 5),
          y + 15 + s * 3.5,
          Math.sin(angle) * (radius - 5)
        );
        stair.rotation.y = -angle;
        stair.castShadow = true;
        stairGroup.add(stair);
      }
      stairGroup.visible = false;
      stairGroup.rotation.y = Math.PI;
      this.scene.add(stairGroup);
      this.stairs.push(stairGroup);
    }

    const topGeometry = new THREE.ConeGeometry(this.baseRadius + 30, 25, 48);
    const topMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d1810,
      metalness: 0.5,
      roughness: 0.6
    });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = this.layerHeight * 4 + 10;
    top.castShadow = true;
    this.scene.add(top);

    const topRingGeometry = new THREE.TorusGeometry(this.baseRadius + 30, 1.5, 16, 64);
    const topRingMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x443300,
      emissiveIntensity: 0.2
    });
    const topRing = new THREE.Mesh(topRingGeometry, topRingMaterial);
    topRing.position.y = this.layerHeight * 4;
    topRing.rotation.x = Math.PI / 2;
    this.scene.add(topRing);
  }

  private setupUI(): void {
    document.getElementById('restart-btn-fail')?.addEventListener('click', () => this.restartGame());
    document.getElementById('restart-btn-victory')?.addEventListener('click', () => this.restartGame());
    this.updateUI(this.puzzleManager.getState());
  }

  private loadLevel(): void {
    const state = this.puzzleManager.getState();
    const config = this.puzzleManager.getCurrentLevelConfig();
    const layerY = (state.currentLevel - 1) * this.layerHeight;
    const platformRadius = this.baseRadius + (state.currentLevel - 1) * 10;

    this.gearSystem.generateLayerGears(config.gearCount, config.runeCount, platformRadius, layerY);
    this.interactionManager.setDragPlaneHeight(layerY + 10);

    this.camera.position.set(
      Math.cos(0) * (platformRadius + 50),
      layerY + 50,
      Math.sin(0) * (platformRadius + 50)
    );
    this.controls.target.set(0, layerY + 15, 0);
    this.controls.update();

    this.updateRatio();
  }

  private updateRatio(): void {
    const ratio = this.gearSystem.calculateTransmissionRatio();
    this.puzzleManager.updateCurrentRatio(ratio);
  }

  private onPuzzleStateChange(state: PuzzleState): void {
    this.updateUI(state);

    if (state.isGameOver) {
      this.showGameOver();
    } else if (state.isVictory) {
      this.showVictory();
    } else if (state.isLevelComplete) {
      this.revealStairs(state.currentLevel - 1);
      setTimeout(() => {
        if (this.puzzleManager.advanceLevel()) {
          this.stairs.forEach((s) => (s.visible = false));
          if (!state.isVictory) {
            this.loadLevel();
          }
        }
      }, 2000);
    }
  }

  private revealStairs(index: number): void {
    if (this.stairs[index]) {
      this.stairs[index].visible = true;
      let progress = 0;
      const animate = () => {
        progress += 0.02;
        if (progress >= 1) return;
        this.stairs[index].rotation.y = Math.PI * (1 - progress);
        requestAnimationFrame(animate);
      };
      animate();
    }
  }

  private updateUI(state: PuzzleState): void {
    const levelEl = document.getElementById('current-level');
    const targetEl = document.getElementById('target-ratio');
    const currentEl = document.getElementById('current-ratio');
    const stepsTextEl = document.getElementById('steps-text');
    const stepsProgressEl = document.getElementById('steps-progress') as unknown as SVGCircleElement;
    const levelProgressEl = document.getElementById('level-progress');

    if (levelEl) levelEl.textContent = `${state.currentLevel} / ${state.totalLevels}`;
    if (targetEl) targetEl.textContent = this.puzzleManager.getTargetRatioString();
    if (currentEl) currentEl.textContent = this.puzzleManager.formatRatio(state.currentRatio);
    if (stepsTextEl) stepsTextEl.textContent = `${state.stepsUsed}/${state.maxSteps}`;

    if (stepsProgressEl) {
      const radius = stepsProgressEl.r.baseVal.value;
      const circumference = 2 * Math.PI * radius;
      const progress = 1 - state.stepsUsed / state.maxSteps;
      stepsProgressEl.style.strokeDasharray = `${circumference}`;
      stepsProgressEl.style.strokeDashoffset = `${circumference * progress}`;
    }

    if (levelProgressEl) {
      levelProgressEl.style.width = `${Math.floor(state.levelProgress * 100)}%`;
    }
  }

  private showGameOver(): void {
    const screen = document.getElementById('game-over-screen');
    if (screen) screen.classList.add('active');
    this.createSteamEffect();
  }

  private createSteamEffect(): void {
    const particleCount = 300;
    if (this.totalParticles + particleCount > this.maxTotalParticles) return;
    this.totalParticles += particleCount;

    this.steamGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    this.steamVelocities = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = Math.random() * 80;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;

      this.steamVelocities[i * 3] = (Math.random() - 0.5) * 0.5;
      this.steamVelocities[i * 3 + 1] = Math.random() * 1 + 0.5;
      this.steamVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5;

      sizes[i] = Math.random() * 3 + 1;
    }

    this.steamGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.steamGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const steamMaterial = new THREE.PointsMaterial({
      color: 0x888888,
      size: 2,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.steamParticles = new THREE.Points(this.steamGeometry, steamMaterial);
    this.scene.add(this.steamParticles);
  }

  private showVictory(): void {
    const screen = document.getElementById('victory-screen');
    if (screen) screen.classList.add('active');
    this.createVictoryParticles();
  }

  private createVictoryParticles(): void {
    const particleCount = 500;
    if (this.totalParticles + particleCount > this.maxTotalParticles) return;
    this.totalParticles += particleCount;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const topY = this.layerHeight * 4 + 25;

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 10 + Math.random() * 20;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = topY + radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      const mix = Math.random();
      colors[i * 3] = 1 * mix + 0 * (1 - mix);
      colors[i * 3 + 1] = 0.84 * mix + 0.75 * (1 - mix);
      colors[i * 3 + 2] = 0 * mix + 1 * (1 - mix);

      sizes[i] = Math.random() * 1.5 + 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.victoryParticles = new THREE.Points(geometry, material);
    this.scene.add(this.victoryParticles);
  }

  private restartGame(): void {
    document.getElementById('game-over-screen')?.classList.remove('active');
    document.getElementById('victory-screen')?.classList.remove('active');

    if (this.victoryParticles) {
      this.scene.remove(this.victoryParticles);
      this.victoryParticles.geometry.dispose();
      (this.victoryParticles.material as THREE.Material).dispose();
      this.victoryParticles = null;
      this.totalParticles -= 500;
    }
    if (this.steamParticles) {
      this.scene.remove(this.steamParticles);
      this.steamParticles.geometry.dispose();
      (this.steamParticles.material as THREE.Material).dispose();
      this.steamParticles = null;
      this.steamGeometry = null;
      this.steamVelocities = null;
      this.totalParticles -= 300;
    }

    this.stairs.forEach((s) => (s.visible = false));
    this.puzzleManager.resetGame();
    this.loadLevel();
  }

  private animateSteam(deltaTime: number): void {
    if (!this.steamParticles || !this.steamGeometry || !this.steamVelocities) return;

    const positions = this.steamGeometry.attributes.position.array as Float32Array;
    const count = positions.length / 3;

    for (let i = 0; i < count; i++) {
      positions[i * 3] += this.steamVelocities[i * 3] * deltaTime * 30;
      positions[i * 3 + 1] += this.steamVelocities[i * 3 + 1] * deltaTime * 30;
      positions[i * 3 + 2] += this.steamVelocities[i * 3 + 2] * deltaTime * 30;

      if (positions[i * 3 + 1] > 150) {
        positions[i * 3] = (Math.random() - 0.5) * 100;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
      }
    }

    this.steamGeometry.attributes.position.needsUpdate = true;
  }

  private animateVictory(deltaTime: number): void {
    if (!this.victoryParticles) return;

    this.victoryParticles.rotation.y += deltaTime * 0.3;

    const positions = this.victoryParticles.geometry.attributes.position.array as Float32Array;
    const count = positions.length / 3;
    const topY = this.layerHeight * 4 + 25;
    const time = Date.now() * 0.001;

    for (let i = 0; i < count; i++) {
      const speed = 0.5 + Math.random() * 1.5;
      const baseRadius = 15 + Math.sin(i + time * 0.5) * 5;
      const theta = (i / count) * Math.PI * 8 + time * speed;

      positions[i * 3] = Math.cos(theta) * baseRadius;
      positions[i * 3 + 2] = Math.sin(theta) * baseRadius;
      positions[i * 3 + 1] = topY + Math.sin(theta * 0.5 + i) * 10;
    }

    this.victoryParticles.geometry.attributes.position.needsUpdate = true;
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    const t0 = performance.now();

    this.controls.update();
    this.gearSystem.update(deltaTime);

    if (this.victoryParticles) this.animateVictory(deltaTime);
    if (this.steamParticles) this.animateSteam(deltaTime);

    const t1 = performance.now();
    const computationTime = t1 - t0;
    if (computationTime > 5 && this.frameCount % 60 === 0) {
      console.warn(`Computation exceeded 5ms: ${computationTime.toFixed(2)}ms`);
    }

    this.renderer.render(this.scene, this.camera);
    this.frameCount++;
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new ClocktowerGame();
});
