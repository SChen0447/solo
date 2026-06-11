import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ParticleSystem } from './particles';
import { ControlPanel, type ControlParams } from './controls';

class DeepSeaExplorer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private particleSystem!: ParticleSystem;
  private controlPanel!: ControlPanel;
  private appContainer: HTMLElement;
  private clock: THREE.Clock;
  private fog!: THREE.FogExp2;
  private ventGlow!: THREE.Mesh;
  private seabedGroup!: THREE.Group;

  constructor() {
    this.appContainer = document.getElementById('app')!;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.clock = new THREE.Clock();

    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initControls();
    this.initBackground();
    this.initSeabed();
    this.initVent();
    this.initParticleSystem();
    this.initControlPanel();
    this.initAmbientLights();

    window.addEventListener('resize', this.onResize.bind(this));
    this.animate();
  }

  private initRenderer(): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x020810, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.appContainer.appendChild(this.renderer.domElement);
  }

  private initScene(): void {
    this.fog = new THREE.FogExp2(0x020810, 0.025);
    this.scene.fog = this.fog;
  }

  private initCamera(): void {
    this.camera.position.set(0, 2, 14);
    this.camera.lookAt(0, -5, 0);
  }

  private initControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 40;
    this.controls.maxPolarAngle = Math.PI * 0.85;
    this.controls.minPolarAngle = Math.PI * 0.08;
    this.controls.target.set(0, -6, 0);
    this.controls.enablePan = false;
    this.controls.zoomSpeed = 0.8;
    this.controls.rotateSpeed = 0.6;
  }

  private initBackground(): void {
    const topColor = new THREE.Color(0x0a1a2a);
    const bottomColor = new THREE.Color(0x020810);

    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, `#${topColor.getHexString()}`);
    gradient.addColorStop(1, `#${bottomColor.getHexString()}`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const bgGeo = new THREE.SphereGeometry(200, 32, 32);
    const bgMat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      depthWrite: false
    });
    const bgSphere = new THREE.Mesh(bgGeo, bgMat);
    this.scene.add(bgSphere);
  }

  private initSeabed(): void {
    this.seabedGroup = new THREE.Group();
    this.scene.add(this.seabedGroup);

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    const width = canvas.width;
    const height = canvas.height;
    const topColor = '#1a2a1a';
    const bottomColor = '#0a1a0a';
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, topColor);
    grad.addColorStop(1, bottomColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 40; i++) {
      const y = Math.random() * height;
      const lineWidth = 1 + Math.random() * 3;
      const alpha = 0.08 + Math.random() * 0.22;
      ctx.strokeStyle = `rgba(30, 50, 30, ${alpha})`;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      const startX = Math.random() * width;
      ctx.moveTo(startX, y);
      let currentX = startX;
      const segments = 8 + Math.floor(Math.random() * 10);
      for (let s = 0; s < segments; s++) {
        currentX += width / segments * (0.8 + Math.random() * 0.4);
        const yOffset = (Math.random() - 0.5) * 60;
        ctx.lineTo(currentX, y + yOffset);
      }
      ctx.stroke();
    }

    for (let i = 0; i < 150; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const r = 1 + Math.random() * 6;
      const alpha = 0.05 + Math.random() * 0.15;
      ctx.fillStyle = `rgba(40, 70, 40, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3);

    const bedSize = 60;
    const bedGeo = new THREE.PlaneGeometry(bedSize, bedSize, 128, 128);
    const positions = bedGeo.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const distFromCenter = Math.sqrt(x * x + y * y);

      let displacement = 0;
      displacement += Math.sin(x * 0.35) * 0.25;
      displacement += Math.cos(y * 0.4) * 0.2;
      displacement += Math.sin(x * 0.8 + y * 0.6) * 0.1;
      displacement += (Math.random() - 0.5) * 0.08;

      const ventDip = Math.max(0, 1 - distFromCenter / 5);
      displacement -= ventDip * 0.6;

      positions.setZ(i, displacement);
    }
    bedGeo.computeVertexNormals();

    const bedMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.95,
      metalness: 0.02,
      side: THREE.DoubleSide
    });

    const seabed = new THREE.Mesh(bedGeo, bedMat);
    seabed.rotation.x = -Math.PI / 2;
    seabed.position.y = -8;
    this.seabedGroup.add(seabed);
  }

  private initVent(): void {
    const crackGeo = new THREE.CircleGeometry(0.45, 32);
    const crackMat = new THREE.MeshBasicMaterial({
      color: 0x3a3a3a,
      side: THREE.DoubleSide
    });
    const crack = new THREE.Mesh(crackGeo, crackMat);
    crack.rotation.x = -Math.PI / 2;
    crack.position.set(0, -7.94, 0);
    this.scene.add(crack);

    const innerGeo = new THREE.CircleGeometry(0.3, 24);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x1a1510,
      side: THREE.DoubleSide
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.rotation.x = -Math.PI / 2;
    inner.position.set(0, -7.93, 0);
    this.scene.add(inner);

    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 256;
    glowCanvas.height = 256;
    const gctx = glowCanvas.getContext('2d')!;
    const centerX = glowCanvas.width / 2;
    const centerY = glowCanvas.height / 2;
    const glowGrad = gctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, 128);
    glowGrad.addColorStop(0, 'rgba(255, 160, 60, 0.75)');
    glowGrad.addColorStop(0.3, 'rgba(255, 120, 40, 0.35)');
    glowGrad.addColorStop(0.6, 'rgba(200, 80, 20, 0.12)');
    glowGrad.addColorStop(1, 'rgba(100, 40, 10, 0)');
    gctx.fillStyle = glowGrad;
    gctx.fillRect(0, 0, glowCanvas.width, glowCanvas.height);
    const glowTex = new THREE.CanvasTexture(glowCanvas);

    const glowGeo = new THREE.PlaneGeometry(3.5, 3.5);
    const glowMat = new THREE.MeshBasicMaterial({
      map: glowTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.ventGlow = new THREE.Mesh(glowGeo, glowMat);
    this.ventGlow.rotation.x = -Math.PI / 2;
    this.ventGlow.position.set(0, -7.9, 0);
    this.scene.add(this.ventGlow);

    const upGlowGeo = new THREE.PlaneGeometry(2.5, 6);
    const upGlowCanvas = document.createElement('canvas');
    upGlowCanvas.width = 128;
    upGlowCanvas.height = 256;
    const upCtx = upGlowCanvas.getContext('2d')!;
    const upGrad = upCtx.createLinearGradient(0, 256, 0, 0);
    upGrad.addColorStop(0, 'rgba(255, 140, 50, 0.35)');
    upGrad.addColorStop(0.4, 'rgba(255, 100, 30, 0.1)');
    upGrad.addColorStop(1, 'rgba(150, 60, 20, 0)');
    upCtx.fillStyle = upGrad;
    upCtx.fillRect(0, 0, 128, 256);
    const upGlowTex = new THREE.CanvasTexture(upGlowCanvas);

    const upGlowMat = new THREE.MeshBasicMaterial({
      map: upGlowTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < 4; i++) {
      const upGlow = new THREE.Mesh(upGlowGeo, upGlowMat);
      upGlow.rotation.y = (i * Math.PI) / 4;
      upGlow.position.set(0, -5.5, 0);
      this.scene.add(upGlow);
    }
  }

  private initAmbientLights(): void {
    const ambient = new THREE.AmbientLight(0x1a2a3a, 0.35);
    this.scene.add(ambient);

    const ventLight = new THREE.PointLight(0xff7030, 1.8, 15, 1.8);
    ventLight.position.set(0, -7, 0);
    this.scene.add(ventLight);

    const rimLight = new THREE.DirectionalLight(0x3a5a7a, 0.25);
    rimLight.position.set(-5, 10, 5);
    this.scene.add(rimLight);
  }

  private initParticleSystem(): void {
    this.particleSystem = new ParticleSystem();
    this.scene.add(this.particleSystem.group);
  }

  private initControlPanel(): void {
    this.controlPanel = new ControlPanel(this.appContainer);
    this.controlPanel.onChange((params: ControlParams) => {
      this.onControlChange(params);
    });
    this.particleSystem.setParams(this.controlPanel.getParams());
  }

  private onControlChange(params: ControlParams): void {
    this.particleSystem.setParams(params);

    const opacityT = params.opacity / 100;
    this.fog.density = 0.045 - opacityT * 0.035;

    const tempT = (params.temperature - 200) / 200;
    if (this.ventGlow && this.ventGlow.material instanceof THREE.MeshBasicMaterial) {
      this.ventGlow.material.opacity = 0.6 + tempT * 0.5;
      const scale = 0.8 + tempT * 0.6;
      this.ventGlow.scale.set(scale, scale, scale);
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();

    this.controls.update();
    this.particleSystem.update(delta);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onResize.bind(this));
    this.particleSystem.dispose();
    this.renderer.dispose();
  }
}

let explorer: DeepSeaExplorer | null = null;

document.addEventListener('DOMContentLoaded', () => {
  explorer = new DeepSeaExplorer();
});

window.addEventListener('beforeunload', () => {
  if (explorer) {
    explorer.dispose();
  }
});
