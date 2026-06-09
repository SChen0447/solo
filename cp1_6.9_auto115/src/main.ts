import * as THREE from 'three';
import { Fish, FishState, getRandomFishColor } from './fish';
import { CoralManager, Coral } from './coral';
import { ParticleManager } from './particles';

const TANK_WIDTH = 10;
const TANK_HEIGHT = 7;
const TANK_DEPTH = 6;

const AQUARIUM_BOUNDS = new THREE.Box3(
  new THREE.Vector3(-TANK_WIDTH / 2, -TANK_HEIGHT / 2, -TANK_DEPTH / 2),
  new THREE.Vector3(TANK_WIDTH / 2, TANK_HEIGHT / 2, TANK_DEPTH / 2)
);

class AquariumApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  private fishes: Fish[] = [];
  private coralManager: CoralManager;
  private particleManager: ParticleManager;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private mouseWorld: THREE.Vector3 = new THREE.Vector3();

  private container: HTMLElement;
  private fishCountEl: HTMLElement;
  private progressFillEl: HTMLElement;
  private progressTextEl: HTMLElement;
  private lastEventEl: HTMLElement;
  private achievementEl: HTMLElement;

  private hoveredObject: THREE.Object3D | null = null;
  private hoveredFish: Fish | null = null;
  private hoveredCoral: Coral | null = null;

  private readonly MAX_FISH = 30;
  private readonly MAX_CORAL = 10;
  private jellyfishSpawnTimer: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.fishCountEl = document.getElementById('fish-count')!;
    this.progressFillEl = document.getElementById('progress-fill')!;
    this.progressTextEl = document.getElementById('progress-text')!;
    this.lastEventEl = document.getElementById('last-event')!;
    this.achievementEl = document.getElementById('achievement')!;

    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.initCamera();
    this.initRenderer();
    this.initLights();
    this.createAquarium();

    this.coralManager = new CoralManager(this.scene, AQUARIUM_BOUNDS);
    this.particleManager = new ParticleManager(this.scene, AQUARIUM_BOUNDS);

    this.spawnInitialFish();
    this.coralManager.spawnInitialCorals();

    this.setupEventListeners();
    this.animate();
  }

  private initCamera(): void {
    const aspect = TANK_WIDTH / TANK_HEIGHT;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.camera.position.set(0, 0.5, 12);
    this.camera.lookAt(0, 0, 0);
  }

  private initRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(1000, 700);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);
  }

  private initLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 8, 5);
    this.scene.add(directional);

    const pointLight1 = new THREE.PointLight(0x87ceeb, 0.5, 30);
    pointLight1.position.set(-3, 3, 3);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xffaa55, 0.3, 20);
    pointLight2.position.set(3, -2, -2);
    this.scene.add(pointLight2);
  }

  private createAquarium(): void {
    const bgGeo = new THREE.PlaneGeometry(TANK_WIDTH * 1.5, TANK_HEIGHT * 1.5);
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 512;
    bgCanvas.height = 512;
    const bgCtx = bgCanvas.getContext('2d')!;
    const gradient = bgCtx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#87ceeb');
    gradient.addColorStop(1, '#001a33');
    bgCtx.fillStyle = gradient;
    bgCtx.fillRect(0, 0, 512, 512);
    const bgTex = new THREE.CanvasTexture(bgCanvas);
    const bgMat = new THREE.MeshBasicMaterial({ map: bgTex, side: THREE.DoubleSide });
    const bg = new THREE.Mesh(bgGeo, bgMat);
    bg.position.z = -TANK_DEPTH / 2 - 0.1;
    this.scene.add(bg);

    const sandCanvas = document.createElement('canvas');
    sandCanvas.width = 256;
    sandCanvas.height = 256;
    const sandCtx = sandCanvas.getContext('2d')!;
    sandCtx.fillStyle = '#d4c9a8';
    sandCtx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const shade = Math.random();
      sandCtx.fillStyle = `rgba(${200 + shade * 30}, ${190 + shade * 30}, ${150 + shade * 30}, 0.3)`;
      sandCtx.fillRect(x, y, 2, 2);
    }
    const sandTex = new THREE.CanvasTexture(sandCanvas);
    sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping;
    sandTex.repeat.set(4, 2);

    const sandGeo = new THREE.PlaneGeometry(TANK_WIDTH, TANK_DEPTH, 20, 12);
    const positions = sandGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const z = positions.getZ(i);
      positions.setZ(i, z + (Math.random() - 0.5) * 0.15);
    }
    sandGeo.computeVertexNormals();

    const sandMat = new THREE.MeshPhongMaterial({
      map: sandTex,
      color: 0xd4c9a8,
      shininess: 10
    });
    const sand = new THREE.Mesh(sandGeo, sandMat);
    sand.rotation.x = -Math.PI / 2;
    sand.position.y = -TANK_HEIGHT / 2;
    this.scene.add(sand);

    const glassMat = new THREE.MeshPhongMaterial({
      color: 0x1a2a3a,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      shininess: 100
    });

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1a2a3a,
      metalness: 0.8,
      roughness: 0.3
    });

    const frameThickness = 0.1;
    const frameGeo = new THREE.BoxGeometry(
      TANK_WIDTH + frameThickness * 2,
      TANK_HEIGHT + frameThickness * 2,
      TANK_DEPTH + frameThickness * 2
    );
    const innerGeo = new THREE.BoxGeometry(TANK_WIDTH, TANK_HEIGHT, TANK_DEPTH);

    const edges = new THREE.EdgesGeometry(frameGeo);
    const frameLines = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x1a2a3a, linewidth: 2 })
    );
    this.scene.add(frameLines);

    const glassThickness = 0.02;
    const glassGeo1 = new THREE.BoxGeometry(TANK_WIDTH, TANK_HEIGHT, glassThickness);
    const glassFront = new THREE.Mesh(glassGeo1, glassMat);
    glassFront.position.z = TANK_DEPTH / 2;
    this.scene.add(glassFront);

    const glassBack = new THREE.Mesh(glassGeo1, glassMat);
    glassBack.position.z = -TANK_DEPTH / 2;
    this.scene.add(glassBack);

    const glassGeo2 = new THREE.BoxGeometry(glassThickness, TANK_HEIGHT, TANK_DEPTH);
    const glassLeft = new THREE.Mesh(glassGeo2, glassMat);
    glassLeft.position.x = -TANK_WIDTH / 2;
    this.scene.add(glassLeft);

    const glassRight = new THREE.Mesh(glassGeo2, glassMat);
    glassRight.position.x = TANK_WIDTH / 2;
    this.scene.add(glassRight);

    const glassGeo3 = new THREE.BoxGeometry(TANK_WIDTH, glassThickness, TANK_DEPTH);
    const glassTop = new THREE.Mesh(glassGeo3, glassMat);
    glassTop.position.y = TANK_HEIGHT / 2;
    this.scene.add(glassTop);
  }

  private spawnInitialFish(): void {
    const count = 15;
    for (let i = 0; i < count; i++) {
      this.addFish();
    }
  }

  private addFish(): void {
    if (this.fishes.length >= this.MAX_FISH) return;

    const size = 0.8 + Math.random() * 1.2;
    const color = getRandomFishColor();

    const pos = new THREE.Vector3(
      (Math.random() - 0.5) * (TANK_WIDTH - 2),
      (Math.random() - 0.5) * (TANK_HEIGHT - 2),
      (Math.random() - 0.5) * (TANK_DEPTH - 2)
    );

    const fish = new Fish({
      color,
      size,
      position: pos,
      bounds: AQUARIUM_BOUNDS
    });

    this.fishes.push(fish);
    this.scene.add(fish.mesh);
  }

  private setupEventListeners(): void {
    this.renderer.domElement.addEventListener('click', (e) => this.onMouseClick(e));
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('resize', () => this.onResize());

    document.getElementById('reset-btn')!.addEventListener('click', () => this.reset());
    document.getElementById('help-btn')!.addEventListener('click', () => this.showHelp());
    document.getElementById('mobile-reset')!.addEventListener('click', () => this.reset());
    document.getElementById('mobile-help')!.addEventListener('click', () => this.showHelp());
    document.getElementById('mobile-feed')!.addEventListener('click', () => this.feedAtMouse());

    this.onResize();
  }

  private updateMouse(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this.raycaster.ray.intersectPlane(plane, this.mouseWorld);
  }

  private onMouseClick(e: MouseEvent): void {
    this.updateMouse(e);

    const clickPos = this.mouseWorld.clone();
    clickPos.z = (Math.random() - 0.5) * (TANK_DEPTH - 1);

    this.fishes.forEach((fish) => {
      const dist = fish.mesh.position.distanceTo(clickPos);
      if (dist < 3) {
        fish.setFollowTarget(clickPos);
      }
    });

    this.feedAtPosition(clickPos);
  }

  private onMouseMove(e: MouseEvent): void {
    this.updateMouse(e);

    if (this.hoveredFish) {
      this.hoveredFish.setHover(false);
      this.hoveredFish = null;
    }
    if (this.hoveredCoral) {
      this.hoveredCoral.setHover(false);
      this.hoveredCoral = null;
    }

    const allMeshes: THREE.Object3D[] = [];
    this.fishes.forEach((f) => allMeshes.push(f.mesh));
    this.coralManager.corals.forEach((c) => allMeshes.push(c.mesh));

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(allMeshes, true);

    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && obj.parent) {
        const fish = this.fishes.find((f) => f.mesh === obj);
        if (fish) {
          this.hoveredFish = fish;
          fish.setHover(true);
          break;
        }
        const coral = this.coralManager.corals.find((c) => c.mesh === obj);
        if (coral) {
          this.hoveredCoral = coral;
          coral.setHover(true);
          break;
        }
        obj = obj.parent;
      }
    }

    this.renderer.domElement.style.cursor =
      this.hoveredFish || this.hoveredCoral ? 'pointer' : 'default';
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      e.preventDefault();
      this.feedAtMouse();
    }
  }

  private feedAtMouse(): void {
    const feedPos = this.mouseWorld.clone();
    if (feedPos.length() === 0) {
      feedPos.set(0, 0, 0);
    }
    feedPos.z = (Math.random() - 0.5) * (TANK_DEPTH - 2);
    this.feedAtPosition(feedPos);
  }

  private feedAtPosition(pos: THREE.Vector3): void {
    this.particleManager.spawnFood(pos, 10);
  }

  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private reset(): void {
    this.fishes.forEach((f) => this.scene.remove(f.mesh));
    this.fishes = [];
    this.coralManager.reset();
    this.particleManager.reset();
    this.spawnInitialFish();
    this.updateUI();
  }

  private showHelp(): void {
    alert('操作提示：\n• 鼠标点击水面投放鱼食，附近的鱼会游向点击位置\n• 空格键在鼠标位置投放鱼食\n• 鱼吃到食物会促进珊瑚生长\n• 喂食足够多会触发罕见事件：水母潮汐！');
  }

  private checkCollisions(): void {
    const obstacles = this.particleManager.getJellyfishObstacles();
    for (const fish of this.fishes) {
      if (fish.state === FishState.EVADE) continue;
      for (const obs of obstacles) {
        const dist = fish.mesh.position.distanceTo(obs.getPosition());
        if (dist < obs.getRadius() + 0.8) {
          fish.setEvade(obs.getPosition());
          break;
        }
      }
    }
  }

  private triggerAchievement(): void {
    this.achievementEl.classList.remove('show');
    void this.achievementEl.offsetWidth;
    this.achievementEl.classList.add('show');
    this.particleManager.triggerJellyfishTide();
  }

  private updateUI(): void {
    this.fishCountEl.textContent = String(this.fishes.length);
    const progress = Math.floor(this.coralManager.getProgress());
    this.progressFillEl.style.width = `${progress}%`;
    this.progressTextEl.textContent = `${progress}%`;
    this.lastEventEl.textContent = this.coralManager.getLastEventFormatted();
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    const foodPositions = this.particleManager.getFoodPositions();
    for (const fish of this.fishes) {
      const eaten = fish.update(delta, foodPositions);
      if (eaten) {
        if (this.particleManager.eatFoodAt(eaten)) {
          const idx = foodPositions.findIndex((p) => p.distanceTo(eaten) < 0.3);
          if (idx >= 0) foodPositions.splice(idx, 1);

          const triggered = this.coralManager.registerFeed();
          if (triggered) {
            this.triggerAchievement();
          }

          const randomCoral = this.coralManager.corals[
            Math.floor(Math.random() * this.coralManager.corals.length)
          ];
          if (randomCoral) {
            this.particleManager.spawnBubbles(randomCoral.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), 5);
          }
        }
      }
    }

    this.checkCollisions();

    this.particleManager.update(delta, time);

    this.jellyfishSpawnTimer += delta;
    if (this.jellyfishSpawnTimer > 8 + Math.random() * 5) {
      this.particleManager.spawnJellyfishObstacle();
      this.jellyfishSpawnTimer = 0;
    }

    if (Math.random() < 0.02 && this.coralManager.corals.length > 0) {
      const c = this.coralManager.corals[Math.floor(Math.random() * this.coralManager.corals.length)];
      this.particleManager.spawnBubbles(c.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 1);
    }

    this.updateUI();
    this.renderer.render(this.scene, this.camera);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new AquariumApp();
});
