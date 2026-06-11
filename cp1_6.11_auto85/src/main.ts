import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LevelManager, TileData } from './levelManager';
import { AnimationManager } from './animation';
import { InteractionManager } from './interaction';

class GameApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;

  private levelManager: LevelManager;
  private animationManager: AnimationManager;
  private interactionManager: InteractionManager;

  private tileGroup: THREE.Group;
  private lanternLights: THREE.PointLight[] = [];
  private lanternMeshes: THREE.Mesh[] = [];

  private tileSize: number = 1;
  private tileGap: number = 0.15;

  private timer: number = 0;
  private timerRunning: boolean = false;
  private lastTime: number = 0;
  private isVictory: boolean = false;

  private levelNumEl: HTMLElement;
  private flipCountEl: HTMLElement;
  private timerEl: HTMLElement;
  private resetBtn: HTMLButtonElement;
  private victoryScreen: HTMLElement;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 8, 8);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minPolarAngle = 0.3;
    this.controls.maxPolarAngle = Math.PI / 2.2;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 15;
    this.controls.enablePan = false;

    this.levelManager = new LevelManager();
    this.animationManager = new AnimationManager(this.scene);

    this.tileGroup = new THREE.Group();
    this.scene.add(this.tileGroup);

    this.interactionManager = new InteractionManager(
      this.camera,
      this.renderer,
      this.levelManager,
      this.animationManager,
      {
        onTileClick: this.onTileClick.bind(this),
        onVictory: this.onVictory.bind(this),
      }
    );

    this.levelNumEl = document.getElementById('level-num')!;
    this.flipCountEl = document.getElementById('flip-count')!;
    this.timerEl = document.getElementById('timer')!;
    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    this.victoryScreen = document.getElementById('victory-screen')!;

    this.resetBtn.addEventListener('click', this.onResetClick.bind(this));

    this.setupLighting();
    this.createWoodTexture();
    this.loadLevel(1);
    this.setupResizeHandler();

    this.lastTime = performance.now();
    this.animate();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.6);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 30;
    mainLight.shadow.camera.left = -10;
    mainLight.shadow.camera.right = 10;
    mainLight.shadow.camera.top = 10;
    mainLight.shadow.camera.bottom = -10;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffd7a8, 0.3);
    fillLight.position.set(-5, 5, -3);
    this.scene.add(fillLight);
  }

  private createWoodTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const baseColor = '#3e2723';
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 80; i++) {
      const y = Math.random() * 512;
      const height = 1 + Math.random() * 8;
      const alpha = 0.05 + Math.random() * 0.15;
      
      const gradient = ctx.createLinearGradient(0, y, 0, y + height);
      gradient.addColorStop(0, `rgba(30, 15, 10, 0)`);
      gradient.addColorStop(0.5, `rgba(30, 15, 10, ${alpha})`);
      gradient.addColorStop(1, `rgba(30, 15, 10, 0)`);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, y, 512, height);
    }

    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = 0.5 + Math.random() * 2;
      const alpha = 0.05 + Math.random() * 0.1;
      ctx.fillStyle = `rgba(20, 10, 5, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);

    this.scene.background = texture;
  }

  private loadLevel(levelNum: number): void {
    this.clearLevel();
    this.isVictory = false;
    this.timer = 0;
    this.timerRunning = false;
    this.victoryScreen.classList.remove('show');

    const tiles = this.levelManager.loadLevel(levelNum);
    this.createTiles(tiles);
    this.createLanterns();
    this.updateUI();
    this.updateCameraPosition();
  }

  private clearLevel(): void {
    while (this.tileGroup.children.length > 0) {
      const child = this.tileGroup.children[0];
      this.tileGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }

    for (const light of this.lanternLights) {
      this.scene.remove(light);
    }
    this.lanternLights = [];

    for (const mesh of this.lanternMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose());
      } else {
        mesh.material.dispose();
      }
    }
    this.lanternMeshes = [];

    this.animationManager.unregisterAllTiles();
    this.interactionManager.unregisterAllTiles();
  }

  private createTiles(tiles: TileData[]): void {
    const gridSize = this.levelManager.getGridSize();
    const totalWidth = gridSize * this.tileSize + (gridSize - 1) * this.tileGap;
    const startX = -totalWidth / 2 + this.tileSize / 2;
    const startZ = -totalWidth / 2 + this.tileSize / 2;

    for (const tileData of tiles) {
      const x = startX + tileData.col * (this.tileSize + this.tileGap);
      const z = startZ + tileData.row * (this.tileSize + this.tileGap);

      const geometry = new THREE.BoxGeometry(this.tileSize, 0.3, this.tileSize);
      const material = new THREE.MeshStandardMaterial({
        color: tileData.isLit ? 0xffecb3 : 0x3e2723,
        roughness: 0.8,
        metalness: 0.1,
        emissive: tileData.isLit ? 0xffecb3 : 0x000000,
        emissiveIntensity: tileData.isLit ? 0.3 : 0,
      });

      const cube = new THREE.Mesh(geometry, material);
      cube.position.set(x, 0.15, z);
      cube.castShadow = true;
      cube.receiveShadow = true;
      cube.userData.tileId = tileData.id;

      const frameGeo = new THREE.BoxGeometry(this.tileSize + 0.05, 0.32, this.tileSize + 0.05);
      const frameMat = new THREE.MeshStandardMaterial({
        color: 0x2d1f1a,
        roughness: 0.9,
        metalness: 0.1,
      });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.set(x, 0.14, z);
      frame.receiveShadow = true;
      this.tileGroup.add(frame);

      this.tileGroup.add(cube);
      this.animationManager.registerTile(tileData.id, cube, material);
      this.interactionManager.registerTileMesh(tileData.id, cube);
    }

    const baseGeo = new THREE.BoxGeometry(totalWidth + 0.5, 0.2, totalWidth + 0.5);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x3e2723,
      roughness: 0.9,
      metalness: 0.1,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.05;
    base.receiveShadow = true;
    this.tileGroup.add(base);
  }

  private createLanterns(): void {
    const gridSize = this.levelManager.getGridSize();
    const totalWidth = gridSize * this.tileSize + (gridSize - 1) * this.tileGap;
    const halfWidth = totalWidth / 2;

    const corners = [
      { x: -halfWidth - 0.5, z: -halfWidth - 0.5 },
      { x: halfWidth + 0.5, z: -halfWidth - 0.5 },
      { x: -halfWidth - 0.5, z: halfWidth + 0.5 },
      { x: halfWidth + 0.5, z: halfWidth + 0.5 },
    ];

    for (const corner of corners) {
      const lanternGeo = new THREE.SphereGeometry(0.15, 16, 16);
      const lanternMat = new THREE.MeshBasicMaterial({
        color: 0xffd54f,
        transparent: true,
        opacity: 0.9,
      });
      const lantern = new THREE.Mesh(lanternGeo, lanternMat);
      lantern.position.set(corner.x, 1.5, corner.z);
      this.scene.add(lantern);
      this.lanternMeshes.push(lantern);

      const light = new THREE.PointLight(0xffd54f, 0.5, 5);
      light.position.copy(lantern.position);
      this.scene.add(light);
      this.lanternLights.push(light);

      const stringGeo = new THREE.CylinderGeometry(0.01, 0.01, 1, 8);
      const stringMat = new THREE.MeshBasicMaterial({ color: 0x2d1f1a });
      const string = new THREE.Mesh(stringGeo, stringMat);
      string.position.set(corner.x, 2, corner.z);
      this.scene.add(string);
      this.lanternMeshes.push(string);
    }
  }

  private updateCameraPosition(): void {
    const gridSize = this.levelManager.getGridSize();
    const distance = gridSize * 2 + 3;
    this.camera.position.set(0, distance * 0.9, distance);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  private onTileClick(tileId: number): void {
    if (!this.timerRunning && !this.isVictory) {
      this.timerRunning = true;
    }
    this.updateUI();
  }

  private onVictory(): void {
    this.isVictory = true;
    this.timerRunning = false;

    const tileMeshes: THREE.Mesh[] = [];
    for (const tile of this.levelManager.getTiles().values()) {
      const mesh = this.tileGroup.children.find(
        (child) => child instanceof THREE.Mesh && child.userData.tileId === tile.id
      ) as THREE.Mesh;
      if (mesh) {
        tileMeshes.push(mesh);
      }
    }
    this.animationManager.startVictoryWave(tileMeshes);

    this.interactionManager.playVictorySound();

    setTimeout(() => {
      this.victoryScreen.classList.add('show');
    }, 500);

    setTimeout(() => {
      if (this.levelManager.getCurrentLevel() < this.levelManager.getTotalLevels()) {
        this.loadLevel(this.levelManager.getCurrentLevel() + 1);
      }
    }, 4000);

    this.updateUI();
  }

  private onResetClick(): void {
    this.loadLevel(this.levelManager.getCurrentLevel());
  }

  private updateUI(): void {
    this.levelNumEl.textContent = this.levelManager.getCurrentLevel().toString();
    this.flipCountEl.textContent = this.levelManager.getFlipCount().toString();
    this.timerEl.textContent = this.timer.toFixed(1);
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    if (this.timerRunning) {
      this.timer += deltaTime / 1000;
      this.timerEl.textContent = this.timer.toFixed(1);
    }

    this.controls.update();
    this.animationManager.update(deltaTime);

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.clearLevel();
    this.renderer.dispose();
    this.controls.dispose();
    this.animationManager.dispose();
    this.interactionManager.dispose();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
