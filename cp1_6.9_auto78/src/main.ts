import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Earth } from './earth';
import { DataPoints } from './datapoints';
import { UI } from './ui';

const FPS_CHECK_INTERVAL = 2;
const LOW_FPS_THRESHOLD = 25;
const RESTORE_FPS_THRESHOLD = 30;

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private earth: Earth;
  private dataPoints: DataPoints;
  private ui: UI;
  private clock: THREE.Clock;

  private frameCount: number = 0;
  private fpsTimer: number = 0;
  private currentFPS: number = 60;
  private qualityReduced: boolean = false;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 3, 14);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x0a0a1a);
    document.getElementById('app')!.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 20;
    this.controls.enablePan = false;
    this.controls.zoomSpeed = 0.8;
    this.controls.rotateSpeed = 0.6;

    this.setupLights();

    this.earth = new Earth();
    this.scene.add(this.earth.group);

    this.dataPoints = new DataPoints(this.earth.getRadius());
    this.scene.add(this.dataPoints.group);

    this.addStars();

    this.ui = new UI();

    this.clock = new THREE.Clock();

    window.addEventListener('resize', this.onResize.bind(this));

    this.animate();

    setTimeout(() => {
      this.ui.hideLoading();
    }, 1000);
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 3, 5);
    this.scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    backLight.position.set(-5, -2, -5);
    this.scene.add(backLight);
  }

  private addStars(): void {
    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      const radius = 80 + Math.random() * 120;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = radius * Math.cos(phi);
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.5,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8
    });

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(stars);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private checkFPS(delta: number): void {
    this.frameCount++;
    this.fpsTimer += delta;

    if (this.fpsTimer >= FPS_CHECK_INTERVAL) {
      this.currentFPS = this.frameCount / this.fpsTimer;
      this.frameCount = 0;
      this.fpsTimer = 0;

      this.ui.updateFPS(this.currentFPS);
      this.ui.updateDatapointCount(this.dataPoints.getActiveCount());

      if (!this.qualityReduced && this.currentFPS < LOW_FPS_THRESHOLD) {
        this.qualityReduced = true;
        this.dataPoints.reduceQuality();
        this.earth.setCloudsEnabled(false);
      } else if (this.qualityReduced && this.currentFPS >= RESTORE_FPS_THRESHOLD) {
        this.qualityReduced = false;
        this.dataPoints.restoreQuality();
        this.earth.setCloudsEnabled(true);
      }
    }
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.earth.update(delta);
    this.dataPoints.update(delta);
    this.controls.update();
    this.checkFPS(delta);

    this.renderer.render(this.scene, this.camera);
  }
}

new App();
