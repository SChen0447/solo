import * as THREE from 'three';
import { Prism } from './prism';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private prism: Prism;
  private container: HTMLElement;
  private clock: THREE.Clock;

  private stars!: THREE.Points;
  private starTwinkle: number[] = [];
  private baseGrid!: THREE.PolarGridHelper;
  private baseRing!: THREE.Mesh;

  private cameraDistance = 10;
  private cameraTheta = 0;
  private cameraPhi = Math.PI / 4;
  private targetDistance = 10;
  private targetTheta = 0;
  private targetPhi = Math.PI / 4;
  private readonly MIN_DISTANCE = 5;
  private readonly MAX_DISTANCE = 20;
  private readonly MIN_PHI = Math.PI / 6;
  private readonly MAX_PHI = (5 * Math.PI) / 6;
  private readonly DAMPING = 0.9;

  private isRotating = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private draggingVertex = false;

  constructor() {
    this.container = document.getElementById('app')!;
    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.stars = this.createStars();
    this.createBase();
    this.createLights();

    this.prism = new Prism(this.scene, this.camera);

    this.bindEvents();
    this.onResize();
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, '#141428');
    gradient.addColorStop(1, '#080816');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    scene.background = texture;
    scene.fog = new THREE.FogExp2(0x080816, 0.02);

    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    const y = this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createStars(): THREE.Points {
    const starCount = 200;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const radius = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      const brightness = 0.6 + Math.random() * 0.4;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness;

      sizes[i] = 1 + Math.random() * 2;

      this.starTwinkle.push(0.8 + Math.random() * 1.2);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
    return stars;
  }

  private createBase(): void {
    const gridRadius = 4;
    const gridDivisions = 16;

    const gridHelper = new THREE.PolarGridHelper(gridRadius, gridDivisions, 4, 64, 0x3355aa, 0x3355aa);
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.2;
    (gridHelper.material as THREE.Material).blending = THREE.AdditiveBlending;
    gridHelper.position.y = BOTTOM_VERTEX_Y - 0.5;
    this.scene.add(gridHelper);
    this.baseGrid = gridHelper;

    const ringGeom = new THREE.RingGeometry(gridRadius - 0.02, gridRadius + 0.02, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x5577cc,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    this.baseRing = new THREE.Mesh(ringGeom, ringMat);
    this.baseRing.rotation.x = -Math.PI / 2;
    this.baseRing.position.y = BOTTOM_VERTEX_Y - 0.5;
    this.scene.add(this.baseRing);
  }

  private createLights(): void {
    const ambient = new THREE.AmbientLight(0x444466, 0.6);
    this.scene.add(ambient);

    const pointLight1 = new THREE.PointLight(0x6688ff, 1, 50);
    pointLight1.position.set(10, 10, 10);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff6688, 0.5, 50);
    pointLight2.position.set(-10, 5, -10);
    this.scene.add(pointLight2);
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    const y = this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);

    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.draggingVertex = this.prism.handlePointerDown(e, rect);
      if (!this.draggingVertex) {
        this.isRotating = true;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
      }
      canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      if (this.draggingVertex) {
        this.prism.handlePointerMove(e, rect);
      } else if (this.isRotating) {
        const dx = e.clientX - this.lastPointerX;
        const dy = e.clientY - this.lastPointerY;

        this.targetTheta -= dx * 0.005;
        this.targetPhi += dy * 0.005;

        this.targetPhi = Math.max(this.MIN_PHI, Math.min(this.MAX_PHI, this.targetPhi));

        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
      }
    });

    canvas.addEventListener('pointerup', (e) => {
      if (this.draggingVertex) {
        this.prism.handlePointerUp();
        this.draggingVertex = false;
      }
      this.isRotating = false;
      try { canvas.releasePointerCapture(e.pointerId); } catch {}
    });

    canvas.addEventListener('pointercancel', () => {
      if (this.draggingVertex) {
        this.prism.handlePointerUp();
        this.draggingVertex = false;
      }
      this.isRotating = false;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.targetDistance += e.deltaY * 0.01;
      this.targetDistance = Math.max(this.MIN_DISTANCE, Math.min(this.MAX_DISTANCE, this.targetDistance));
    }, { passive: false });
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.getElapsedTime();

    const easeOut = 1 - this.DAMPING;
    this.cameraDistance += (this.targetDistance - this.cameraDistance) * easeOut;
    this.cameraTheta += (this.targetTheta - this.cameraTheta) * easeOut;
    this.cameraPhi += (this.targetPhi - this.cameraPhi) * easeOut;

    this.updateCameraPosition();

    if (this.baseGrid) {
      this.baseGrid.rotation.y += 0.002;
    }
    if (this.baseRing) {
      this.baseRing.rotation.z += 0.003;
      (this.baseRing.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(time * 2) * 0.1;
    }

    const sizeAttr = this.stars.geometry.attributes.size as THREE.BufferAttribute;
    const colorAttr = this.stars.geometry.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < this.starTwinkle.length; i++) {
      const twinkle = 0.5 + Math.sin(time * this.starTwinkle[i]) * 0.5;
      sizeAttr.array[i] = (1 + (i % 3)) * (0.7 + twinkle * 0.3);
      const br = 0.6 + twinkle * 0.4;
      colorAttr.array[i * 3] = br;
      colorAttr.array[i * 3 + 1] = br;
      colorAttr.array[i * 3 + 2] = br;
    }
    sizeAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;

    this.prism.update(delta, time);

    this.renderer.render(this.scene, this.camera);
  };
}

const BOTTOM_VERTEX_Y = -2.5;

new App();
