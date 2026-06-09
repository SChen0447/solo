import * as THREE from 'three';
import { audioManager, RuneColor, COLOR_MAP } from './audioManager';
import {
  StoneData,
  generateStones,
  generateTrees,
  createGround,
  createPulseRing
} from './stoneGenerator';

const RUNE_COLORS: RuneColor[] = ['red', 'green', 'blue', 'yellow', 'purple'];

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  baseColor: THREE.Color;
}

interface Firefly {
  mesh: THREE.Mesh;
  light: THREE.PointLight;
  basePosition: THREE.Vector3;
  phase: number;
  isShowingHint: boolean;
  hintTime: number;
}

class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;

  private stones: StoneData[] = [];
  private trees: THREE.Group[] = [];
  private ground: THREE.Mesh;

  private targetSequence: RuneColor[] = [];
  private playerSequence: RuneColor[] = [];
  private isSequenceLocked: boolean = false;
  private sequenceLockTime: number = 0;

  private particles: Particle[] = [];
  private maxParticles: number = 800;

  private firefly: Firefly | null = null;
  private hintDisplay: { group: THREE.Group; startTime: number } | null = null;

  private cameraShake: { active: boolean; startTime: number; frequency: number; amplitude: number } = {
    active: false,
    startTime: 0,
    frequency: 8,
    amplitude: 0.02
  };
  private cameraBasePosition: THREE.Vector3;

  private clock: THREE.Clock;
  private lastFrameTime: number = 0;

  constructor() {
    this.container = document.getElementById('game-container')!;
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

    this.scene = new THREE.Scene();

    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 2;
    bgCanvas.height = 512;
    const bgCtx = bgCanvas.getContext('2d')!;
    const bgGradient = bgCtx.createLinearGradient(0, 0, 0, 512);
    bgGradient.addColorStop(0, '#05081a');
    bgGradient.addColorStop(1, '#0a1a0a');
    bgCtx.fillStyle = bgGradient;
    bgCtx.fillRect(0, 0, 2, 512);
    const bgTexture = new THREE.CanvasTexture(bgCanvas);
    this.scene.background = bgTexture;
    this.scene.fog = new THREE.FogExp2(0x05081a, 0.06);

    this.camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 100);
    this.cameraBasePosition = new THREE.Vector3(0, 5.5, 9);
    this.camera.position.copy(this.cameraBasePosition);
    this.camera.lookAt(0, 1, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.clock = new THREE.Clock();

    this.setupLights();
    this.createEnvironment();
    this.generateTargetSequence();
    this.createFirefly();
    this.setupEventListeners();
    this.updateSize();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404550, 0.55);
    this.scene.add(ambientLight);

    const moonLight = new THREE.DirectionalLight(0x8899bb, 0.7);
    moonLight.position.set(5, 10, 5);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.set(1024, 1024);
    moonLight.shadow.camera.near = 0.5;
    moonLight.shadow.camera.far = 50;
    moonLight.shadow.camera.left = -10;
    moonLight.shadow.camera.right = 10;
    moonLight.shadow.camera.top = 10;
    moonLight.shadow.camera.bottom = -10;
    moonLight.shadow.bias = -0.0005;
    this.scene.add(moonLight);

    const fillLight = new THREE.DirectionalLight(0x1a3a1a, 0.25);
    fillLight.position.set(-5, 3, -5);
    this.scene.add(fillLight);
  }

  private createEnvironment(): void {
    this.ground = createGround();
    this.scene.add(this.ground);

    this.trees = generateTrees(15);
    this.trees.forEach((tree) => this.scene.add(tree));

    this.stones = generateStones(10);
    this.stones.forEach((stone) => this.scene.add(stone.group));
  }

  private generateTargetSequence(): void {
    this.targetSequence = [];
    const available = [...RUNE_COLORS];
    for (let i = 0; i < 5; i++) {
      const idx = Math.floor(Math.random() * available.length);
      this.targetSequence.push(available[idx]);
      available.splice(idx, 1);
    }
    this.playerSequence = [];
    console.log('目标序列:', this.targetSequence);
  }

  private createFirefly(): void {
    const fireflyGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const fireflyMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffaa,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(fireflyGeometry, fireflyMaterial);

    const light = new THREE.PointLight(0xffff88, 0.8, 4, 2);
    mesh.add(light);

    const basePosition = new THREE.Vector3(0, 1.8, 0);
    mesh.position.copy(basePosition);

    this.scene.add(mesh);

    this.firefly = {
      mesh,
      light,
      basePosition,
      phase: Math.random() * Math.PI * 2,
      isShowingHint: false,
      hintTime: 0
    };
  }

  private showSequenceHint(): void {
    if (!this.firefly || this.hintDisplay) return;

    this.firefly.isShowingHint = true;
    this.firefly.hintTime = this.clock.getElapsedTime();

    const group = new THREE.Group();
    const spacing = 0.5;
    const totalWidth = (this.targetSequence.length - 1) * spacing;

    this.targetSequence.forEach((color, i) => {
      const orbGeometry = new THREE.SphereGeometry(0.18, 16, 16);
      const orbMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(COLOR_MAP[color]),
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending
      });
      const orb = new THREE.Mesh(orbGeometry, orbMaterial);
      orb.position.x = i * spacing - totalWidth / 2;
      orb.position.y = 0;

      const orbLight = new THREE.PointLight(new THREE.Color(COLOR_MAP[color]), 0.6, 1.5, 2);
      orb.add(orbLight);

      const numGeometry = new THREE.RingGeometry(0.22, 0.26, 32);
      const numMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      const ring = new THREE.Mesh(numGeometry, numMaterial);
      orb.add(ring);

      group.add(orb);
    });

    group.position.set(0, 2.8, 0);
    this.scene.add(group);

    this.hintDisplay = {
      group,
      startTime: this.clock.getElapsedTime()
    };
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('click', (e) => this.onMouseClick(e));
    window.addEventListener('resize', () => this.updateSize());
  }

  private updateSize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = 16 / 9;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
  }

  private onMouseClick(event: MouseEvent): void {
    if (!audioManager.isInitialized()) {
      audioManager.init().then(() => audioManager.resume());
      return;
    }
    audioManager.resume();

    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this.firefly) {
      const fireflyIntersects = this.raycaster.intersectObject(this.firefly.mesh, true);
      if (fireflyIntersects.length > 0) {
        this.showSequenceHint();
        return;
      }
    }

    if (this.isSequenceLocked) return;

    const runeMeshes = this.stones.map((s) => s.runeMesh);
    const intersects = this.raycaster.intersectObjects(runeMeshes, false);

    if (intersects.length > 0) {
      const clickedRune = intersects[0].object as THREE.Mesh;
      const stone = this.stones.find((s) => s.runeMesh === clickedRune);
      if (stone) {
        this.handleRuneClick(stone);
      }
    }
  }

  private handleRuneClick(stone: StoneData): void {
    const expectedColor = this.targetSequence[this.playerSequence.length];

    if (stone.color === expectedColor) {
      this.triggerCorrectRune(stone);
    } else {
      this.triggerWrongRune(stone);
    }
  }

  private triggerCorrectRune(stone: StoneData): void {
    this.playerSequence.push(stone.color);

    stone.isHighlighted = true;
    stone.highlightTime = this.clock.getElapsedTime();

    const ring = createPulseRing(stone);
    stone.pulseRings.push({
      mesh: ring,
      startTime: this.clock.getElapsedTime(),
      duration: 0.3,
      startRadius: 0.2,
      endRadius: 0.8
    });

    audioManager.playNote(stone.color, this.playerSequence.length - 1);

    if (this.playerSequence.length === this.targetSequence.length) {
      this.triggerResonance();
    }
  }

  private triggerWrongRune(stone: StoneData): void {
    stone.isError = true;
    stone.errorTime = this.clock.getElapsedTime();

    this.cameraShake.active = true;
    this.cameraShake.startTime = this.clock.getElapsedTime();

    this.isSequenceLocked = true;
    this.sequenceLockTime = this.clock.getElapsedTime();

    setTimeout(() => {
      this.playerSequence = [];
      this.isSequenceLocked = false;
    }, 1500);
  }

  private triggerResonance(): void {
    const triggeredStones: StoneData[] = [];
    for (let i = 0; i < this.playerSequence.length; i++) {
      const color = this.playerSequence[i];
      const stone = this.stones.find(
        (s) => s.color === color && !triggeredStones.includes(s)
      );
      if (stone) {
        triggeredStones.push(stone);

        stone.isHighlighted = true;
        stone.highlightTime = this.clock.getElapsedTime();

        this.spawnResonanceParticles(stone);
      }
    }

    audioManager.playChord(this.playerSequence);

    this.isSequenceLocked = true;
    this.sequenceLockTime = this.clock.getElapsedTime();

    setTimeout(() => {
      this.generateTargetSequence();
      this.isSequenceLocked = false;
    }, 2000);
  }

  private spawnResonanceParticles(stone: StoneData): void {
    const particleCount = 80;
    const stoneColor = new THREE.Color(COLOR_MAP[stone.color]);
    const spawnPos = stone.group.position.clone();
    spawnPos.y += stone.stoneMesh.geometry.parameters.height;

    for (let i = 0; i < particleCount && this.particles.length < this.maxParticles; i++) {
      const size = 0.02 + Math.random() * 0.04;
      const geometry = new THREE.SphereGeometry(size, 4, 4);
      const material = new THREE.MeshBasicMaterial({
        color: stoneColor.clone(),
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(spawnPos);
      mesh.position.x += (Math.random() - 0.5) * 0.3;
      mesh.position.z += (Math.random() - 0.5) * 0.3;

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        0.5 + Math.random() * 0.8,
        (Math.random() - 0.5) * 0.4
      );

      const colorVariation = stoneColor.clone();
      colorVariation.offsetHSL((Math.random() - 0.5) * 0.1, 0, (Math.random() - 0.5) * 0.1);
      (material as THREE.MeshBasicMaterial).color = colorVariation;

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity,
        life: 0,
        maxLife: 1.5,
        baseColor: colorVariation
      });
    }
  }

  private updateStones(deltaTime: number, elapsedTime: number): void {
    this.stones.forEach((stone) => {
      stone.runeMesh.rotation.z += stone.runeRotationSpeed * deltaTime;

      const pulse = 0.8 + 0.2 * Math.sin(elapsedTime * 1.5 * Math.PI * 2 + stone.pulsePhase);
      const baseIntensity = stone.baseIntensity * pulse;

      let highlightIntensity = 0;
      if (stone.isHighlighted) {
        const t = elapsedTime - stone.highlightTime;
        if (t < 1.0) {
          highlightIntensity = (1 - t) * 1.5;
        } else {
          stone.isHighlighted = false;
        }
      }

      stone.runeLight.intensity = baseIntensity + highlightIntensity;
      (stone.runeMesh.material as THREE.MeshBasicMaterial).opacity = Math.min(
        0.9 + highlightIntensity * 0.1,
        1.0
      );

      if (stone.isError) {
        const t = elapsedTime - stone.errorTime;
        if (t < 0.2) {
          (stone.stoneMesh.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0xff0000);
          (stone.stoneMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6;
        } else {
          (stone.stoneMesh.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x1a1a2a);
          (stone.stoneMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.2;
          stone.isError = false;
        }
      }

      for (let i = stone.pulseRings.length - 1; i >= 0; i--) {
        const ring = stone.pulseRings[i];
        const t = (elapsedTime - ring.startTime) / ring.duration;
        if (t >= 1) {
          stone.group.remove(ring.mesh);
          (ring.mesh.geometry as THREE.BufferGeometry).dispose();
          (ring.mesh.material as THREE.Material).dispose();
          stone.pulseRings.splice(i, 1);
        } else {
          const scale = ring.startRadius + (ring.endRadius - ring.startRadius) * t;
          ring.mesh.scale.setScalar(scale / 0.2);
          (ring.mesh.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - t);
        }
      }
    });
  }

  private updateFirefly(deltaTime: number, elapsedTime: number): void {
    if (!this.firefly) return;

    const f = this.firefly;
    f.phase += deltaTime * 0.8;

    const floatX = Math.sin(f.phase) * 0.3;
    const floatY = Math.sin(f.phase * 1.3) * 0.15 + 1.8;
    const floatZ = Math.cos(f.phase * 0.7) * 0.3;

    f.mesh.position.set(
      f.basePosition.x + floatX,
      f.basePosition.y + floatY,
      f.basePosition.z + floatZ
    );

    const glowPulse = 0.7 + 0.3 * Math.sin(elapsedTime * 3 + f.phase);
    f.light.intensity = glowPulse * 0.8;
    (f.mesh.material as THREE.MeshBasicMaterial).opacity = glowPulse * 0.95;

    if (this.hintDisplay) {
      const t = elapsedTime - this.hintDisplay.startTime;
      if (t >= 3.0) {
        this.scene.remove(this.hintDisplay.group);
        this.hintDisplay.group.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
              if (Array.isArray(obj.material)) {
                obj.material.forEach((m) => m.dispose());
              } else {
                obj.material.dispose();
              }
            }
          }
        });
        this.hintDisplay = null;
        f.isShowingHint = false;
      } else {
        let alpha = 1;
        if (t < 0.3) alpha = t / 0.3;
        else if (t > 2.7) alpha = (3.0 - t) / 0.3;

        this.hintDisplay.group.children.forEach((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const mat = child.material as THREE.MeshBasicMaterial;
            if (mat.opacity !== undefined) {
              mat.opacity = 0.95 * alpha;
            }
          }
        });

        this.hintDisplay.group.position.y = 2.8 + Math.sin(elapsedTime * 2) * 0.05;
      }
    }
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += deltaTime;

      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }

      p.velocity.y -= 0.15 * deltaTime;
      p.mesh.position.addScaledVector(p.velocity, deltaTime);

      const lifeRatio = p.life / p.maxLife;
      const opacity = (1 - lifeRatio) * 0.9;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = opacity;

      const fadeColor = p.baseColor.clone();
      fadeColor.lerp(new THREE.Color(0x000000), lifeRatio * 0.5);
      (p.mesh.material as THREE.MeshBasicMaterial).color = fadeColor;
    }
  }

  private updateCamera(deltaTime: number, elapsedTime: number): void {
    if (this.cameraShake.active) {
      const t = elapsedTime - this.cameraShake.startTime;
      const shakeDuration = 0.4;
      if (t >= shakeDuration) {
        this.cameraShake.active = false;
        this.camera.position.copy(this.cameraBasePosition);
      } else {
        const decay = 1 - t / shakeDuration;
        const offsetX = Math.sin(t * this.cameraShake.frequency * Math.PI * 2) * this.cameraShake.amplitude * decay;
        const offsetY = Math.cos(t * this.cameraShake.frequency * Math.PI * 2 * 1.3) * this.cameraShake.amplitude * decay * 0.5;
        const offsetZ = Math.sin(t * this.cameraShake.frequency * Math.PI * 2 * 0.7) * this.cameraShake.amplitude * decay * 0.5;
        this.camera.position.set(
          this.cameraBasePosition.x + offsetX,
          this.cameraBasePosition.y + offsetY,
          this.cameraBasePosition.z + offsetZ
        );
      }
    } else {
      this.camera.position.copy(this.cameraBasePosition);
    }
    this.camera.lookAt(0, 1, 0);
  }

  public animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaTime = Math.min(this.clock.getDelta(), 0.05);
    const elapsedTime = this.clock.getElapsedTime();

    this.updateStones(deltaTime, elapsedTime);
    this.updateFirefly(deltaTime, elapsedTime);
    this.updateParticles(deltaTime);
    this.updateCamera(deltaTime, elapsedTime);

    this.renderer.render(this.scene, this.camera);
    this.lastFrameTime = elapsedTime;
  }

  public start(): void {
    this.animate();
  }
}

const game = new Game();
game.start();
