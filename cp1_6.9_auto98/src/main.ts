import * as THREE from 'three';
import { EffectsManager } from './Effects';
import { PaperManager } from './PaperManager';
import { Phoenix } from './Phoenix';

class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  private effects: EffectsManager;
  private paperManager: PaperManager;
  private phoenix: Phoenix;

  private readonly PROGRESS_CIRCUMFERENCE = 2 * Math.PI * 33;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2a2a3a);
    this.scene.fog = new THREE.Fog(0x2a2a3a, 20, 50);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 12, 14);
    this.camera.lookAt(0, 0, 0);

    const container = document.getElementById('canvas-container');
    if (!container) throw new Error('Canvas container not found');

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    this.setupLights();
    this.createTable();
    this.createFabricBackground();

    this.effects = new EffectsManager(this.scene, this.camera);
    this.paperManager = new PaperManager(this.scene, this.camera, this.renderer, this.effects);
    this.phoenix = new Phoenix(this.scene);

    this.setupEventListeners();
    this.setupUIEvents();

    this.updateProgress(0, 10);

    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.9);
    mainLight.position.set(8, 15, 10);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -15;
    mainLight.shadow.camera.right = 15;
    mainLight.shadow.camera.top = 15;
    mainLight.shadow.camera.bottom = -15;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x8888aa, 0.4);
    fillLight.position.set(-10, 8, -8);
    this.scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xffeedd, 0.6, 30);
    rimLight.position.set(0, 8, -10);
    this.scene.add(rimLight);
  }

  private createWoodTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(256, 256, 50, 256, 256, 256);
    gradient.addColorStop(0, '#d4b896');
    gradient.addColorStop(0.7, '#c4a882');
    gradient.addColorStop(1, '#a88862');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = 'rgba(139, 90, 43, 0.15)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      const r = 20 + i * 17;
      ctx.arc(256, 256, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = `rgba(${100 + Math.random() * 50}, ${70 + Math.random() * 40}, ${40 + Math.random() * 30}, 0.1)`;
      ctx.beginPath();
      ctx.arc(
        Math.random() * 512,
        Math.random() * 512,
        Math.random() * 3 + 1,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  private createTable(): void {
    const tableRadius = 10;
    const tableHeight = 0.5;

    const woodTexture = this.createWoodTexture();

    const tableGeometry = new THREE.CylinderGeometry(tableRadius, tableRadius * 0.95, tableHeight, 64);
    const tableMaterial = new THREE.MeshStandardMaterial({
      map: woodTexture,
      metalness: 0.05,
      roughness: 0.8
    });

    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.y = -tableHeight / 2 + 0.01;
    table.receiveShadow = true;
    table.castShadow = true;
    this.scene.add(table);

    const rimGeometry = new THREE.TorusGeometry(tableRadius, 0.08, 16, 100);
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b6914,
      metalness: 0.3,
      roughness: 0.6
    });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.02;
    this.scene.add(rim);
  }

  private createFabricBackground(): void {
    const bgGeometry = new THREE.PlaneGeometry(100, 100, 50, 50);
    const positions = bgGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const z = (Math.random() - 0.5) * 0.3;
      positions.setZ(i, z);
    }
    bgGeometry.computeVertexNormals();

    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 512;
    bgCanvas.height = 512;
    const bgCtx = bgCanvas.getContext('2d')!;

    bgCtx.fillStyle = '#2a2a3a';
    bgCtx.fillRect(0, 0, 512, 512);

    bgCtx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    bgCtx.lineWidth = 1;
    for (let i = 0; i < 512; i += 8) {
      bgCtx.beginPath();
      bgCtx.moveTo(i, 0);
      bgCtx.lineTo(i + Math.sin(i * 0.1) * 2, 512);
      bgCtx.stroke();

      bgCtx.beginPath();
      bgCtx.moveTo(0, i);
      bgCtx.lineTo(512, i + Math.cos(i * 0.1) * 2);
      bgCtx.stroke();
    }

    const bgTexture = new THREE.CanvasTexture(bgCanvas);
    bgTexture.wrapS = THREE.RepeatWrapping;
    bgTexture.wrapT = THREE.RepeatWrapping;
    bgTexture.repeat.set(4, 4);

    const bgMaterial = new THREE.MeshStandardMaterial({
      map: bgTexture,
      side: THREE.DoubleSide,
      metalness: 0.0,
      roughness: 1.0
    });

    const bgFloor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), bgMaterial);
    bgFloor.rotation.x = -Math.PI / 2;
    bgFloor.position.y = -1;
    bgFloor.receiveShadow = true;
    this.scene.add(bgFloor);

    const bgBack = new THREE.Mesh(new THREE.PlaneGeometry(80, 50), bgMaterial);
    bgBack.position.set(0, 15, -25);
    this.scene.add(bgBack);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));
  }

  private setupUIEvents(): void {
    const tutorialBtn = document.getElementById('tutorial-btn');
    const tutorialOverlay = document.getElementById('tutorial-overlay');
    const tutorialClose = document.getElementById('tutorial-close');

    const resetBtn = document.getElementById('reset-btn');
    const resetOverlay = document.getElementById('reset-overlay');
    const resetConfirm = document.getElementById('reset-confirm');
    const resetCancel = document.getElementById('reset-cancel');

    if (tutorialBtn && tutorialOverlay && tutorialClose) {
      tutorialBtn.addEventListener('click', () => {
        tutorialOverlay.classList.add('active');
      });
      tutorialClose.addEventListener('click', () => {
        tutorialOverlay.classList.remove('active');
      });
      tutorialOverlay.addEventListener('click', (e) => {
        if (e.target === tutorialOverlay) {
          tutorialOverlay.classList.remove('active');
        }
      });
    }

    if (resetBtn && resetOverlay && resetConfirm && resetCancel) {
      resetBtn.addEventListener('click', () => {
        resetOverlay.classList.add('active');
      });

      resetCancel.addEventListener('click', () => {
        resetOverlay.classList.remove('active');
      });

      resetConfirm.addEventListener('click', () => {
        this.resetGame();
        resetOverlay.classList.remove('active');
      });

      resetOverlay.addEventListener('click', (e) => {
        if (e.target === resetOverlay) {
          resetOverlay.classList.remove('active');
        }
      });
    }

    this.paperManager.onProgressChange = (count, total) => {
      this.updateProgress(count, total);
    };

    this.paperManager.onAllComplete = () => {
      this.onAllPapersJoined();
    };
  }

  private updateProgress(count: number, total: number): void {
    const progressText = document.getElementById('progress-text');
    const progressFg = document.getElementById('progress-circle-fg');

    if (progressText) {
      progressText.textContent = `${count}/${total}`;
    }

    if (progressFg) {
      const offset = this.PROGRESS_CIRCUMFERENCE * (1 - count / total);
      progressFg.style.strokeDashoffset = offset.toString();
    }
  }

  private onAllPapersJoined(): void {
    const paperMeshes = this.paperManager.getPaperMeshes();

    this.paperManager.papers.forEach(p => {
      p.mesh.visible = false;
    });

    this.phoenix.buildFromPapers(paperMeshes);
    this.phoenix.startRise();
    this.effects.emitGoldRain();
  }

  private resetGame(): void {
    this.paperManager.reset();
    this.phoenix.hide();

    this.paperManager.papers.forEach(p => {
      p.mesh.visible = true;
    });
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseMove(event: MouseEvent): void {
    this.paperManager.handleMouseMove(event);
  }

  private onClick(event: MouseEvent): void {
    this.paperManager.handleClick(event);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const deltaTime = this.clock.getDelta();

    this.paperManager.update(deltaTime);
    this.effects.update(deltaTime);
    this.phoenix.update(deltaTime);

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
