import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TerrainGenerator, TrackPoint } from './terrain';
import { RidePlayer, ProgressData, RideStats } from './ridePlayer';
import { UIController } from './uiController';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;

  private terrainGenerator: TerrainGenerator;
  private ridePlayer: RidePlayer;
  private uiController: UIController;

  private clock: THREE.Clock;
  private frameId: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 300, 900);

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      5000
    );
    this.camera.position.set(200, 180, 250);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 50;
    this.controls.maxDistance = 800;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.target.set(0, 10, 0);

    this.terrainGenerator = new TerrainGenerator(this.scene);
    this.ridePlayer = new RidePlayer(this.scene);
    this.uiController = new UIController();

    this.clock = new THREE.Clock();

    this.setupLights();
    this.setupGridHelper();
    this.bindEvents();
    this.loadDemoData();

    window.addEventListener('resize', () => this.onWindowResize());

    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x2d6a4f, 0.5);
    this.scene.add(hemiLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(150, 250, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 1000;
    directionalLight.shadow.camera.left = -300;
    directionalLight.shadow.camera.right = 300;
    directionalLight.shadow.camera.top = 300;
    directionalLight.shadow.camera.bottom = -300;
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x00d2ff, 0.3);
    fillLight.position.set(-100, 100, -100);
    this.scene.add(fillLight);
  }

  private setupGridHelper(): void {
    const gridHelper = new THREE.GridHelper(500, 50, 0x333355, 0x222244);
    gridHelper.position.y = -0.1;
    this.scene.add(gridHelper);
  }

  private bindEvents(): void {
    this.uiController.onFileUploadCallback(async (file: File) => {
      try {
        const points = await this.ridePlayer.parseFile(file);
        this.buildSceneWithTrack(points);
      } catch (error) {
        alert('文件解析失败: ' + (error as Error).message);
      }
    });

    this.uiController.onPlayCallback(() => {
      this.ridePlayer.play();
    });

    this.uiController.onPauseCallback(() => {
      this.ridePlayer.pause();
    });

    this.uiController.onResetCallback(() => {
      this.ridePlayer.reset();
    });

    this.uiController.onProgressChangeCallback((progress: number) => {
      this.ridePlayer.setProgress(progress);
    });

    this.uiController.onSpeedChangeCallback((speed: number) => {
      this.ridePlayer.setSpeedMultiplier(speed);
    });

    this.uiController.onTerrainChangeCallback((value: number) => {
      this.terrainGenerator.setAmplitude((value / 100) * 100);
    });

    this.ridePlayer.onProgress((data: ProgressData) => {
      this.uiController.updateCurrentProgress(data.progress);
    });

    this.ridePlayer.onStats((stats: RideStats) => {
      this.uiController.updateStats(stats);
      const profile = this.ridePlayer.getElevationProfile();
      this.uiController.setElevationProfile(profile);
    });
  }

  private loadDemoData(): void {
    const points = this.ridePlayer.generateDemoTrack();
    this.buildSceneWithTrack(points);
  }

  private buildSceneWithTrack(points: TrackPoint[]): void {
    this.ridePlayer.pause();
    this.uiController.setPlayingState(false);

    this.terrainGenerator.generateTerrain(points);
    const worldPositions = this.terrainGenerator.trackPointsToWorldPositions(points);
    this.ridePlayer.setWorldPositions(worldPositions);

    this.camera.position.set(200, 180, 250);
    this.controls.target.set(0, 20, 0);
    this.controls.update();

    const stats = this.ridePlayer.getStats();
    if (stats) {
      this.uiController.updateStats(stats);
    }
    const profile = this.ridePlayer.getElevationProfile();
    this.uiController.setElevationProfile(profile);

    this.ridePlayer.reset();
  }

  private onWindowResize(): void {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  private animate(): void {
    this.frameId = requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime() * 1000;

    this.ridePlayer.update(deltaTime);
    this.controls.update();
    this.uiController.animateChart(elapsedTime);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.frameId);
    this.ridePlayer.dispose();
    this.terrainGenerator.clearTerrain();
    this.renderer.dispose();
    this.controls.dispose();
  }
}

let app: App | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
    app = null;
  }
});
