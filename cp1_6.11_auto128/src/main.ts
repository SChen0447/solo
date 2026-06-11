import * as THREE from 'three';
import { StarField, StarData } from './stars';
import { ConstellationManager } from './constellation';

class Planetarium {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  starField: StarField;
  constellation: ConstellationManager;

  spherical = { theta: 0, phi: Math.PI / 4 };
  targetSpherical = { theta: 0, phi: Math.PI / 4 };
  initialSpherical = { theta: 0, phi: Math.PI / 4 };
  velocity = { theta: 0, phi: 0 };
  friction = 0.95;
  zoom = 1.0;
  minZoom = 0.3;
  maxZoom = 3.0;

  isDragging = false;
  lastPointer = { x: 0, y: 0 };
  selectedStar: StarData | null = null;
  isResetting = false;
  resetStartTime = 0;
  resetFromSpherical = { theta: 0, phi: 0 };
  resetDuration = 1500;

  constructor() {
    const canvas = document.getElementById('three-canvas') as HTMLCanvasElement;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0a2e, 0.0008);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 0.01);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.starField = new StarField(this.scene);
    this.constellation = new ConstellationManager(this.scene, this.starField);

    this.updateCameraFromSpherical();
    this.bindEvents();
    this.animate();

    setTimeout(() => {
      const overlay = document.getElementById('loadingOverlay');
      if (overlay) overlay.classList.add('hidden');
    }, 800);
  }

  updateCameraFromSpherical() {
    const radius = 1;
    const x = radius * Math.sin(this.spherical.phi) * Math.cos(this.spherical.theta);
    const y = radius * Math.cos(this.spherical.phi);
    const z = radius * Math.sin(this.spherical.phi) * Math.sin(this.spherical.theta);
    this.camera.lookAt(new THREE.Vector3(x * 200, y * 200, z * 200));
    this.camera.up.set(0, 1, 0);
    this.camera.updateMatrixWorld();
  }

  bindEvents() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastPointer = { x: e.clientX, y: e.clientY };
      this.isResetting = false;
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastPointer.x;
      const dy = e.clientY - this.lastPointer.y;
      this.velocity.theta = -dx * 0.003;
      this.velocity.phi = dy * 0.003;
      this.lastPointer = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('click', (e) => {
      if (Math.abs(this.velocity.theta) > 0.01 || Math.abs(this.velocity.phi) > 0.01) return;
      const mouse = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );
      const hit = this.starField.hitTest(mouse, this.camera);
      if (hit) {
        this.selectStar(hit);
      } else {
        this.deselectStar();
      }
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom += e.deltaY * 0.001;
      this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom));
      this.camera.fov = 60 / this.zoom;
      this.camera.updateProjectionMatrix();
    }, { passive: false });

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.lastPointer = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        this.isResetting = false;
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - this.lastPointer.x;
      const dy = e.touches[0].clientY - this.lastPointer.y;
      this.velocity.theta = -dx * 0.003;
      this.velocity.phi = dy * 0.003;
      this.lastPointer = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    const markBtn = document.getElementById('markBtn');
    if (markBtn) {
      markBtn.addEventListener('click', () => {
        if (this.selectedStar) {
          this.constellation.addMark(this.selectedStar);
        }
      });
    }

    const resetBtn = document.getElementById('resetViewBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetView();
      });
    }

    const randomBtn = document.getElementById('randomConstBtn');
    if (randomBtn) {
      randomBtn.addEventListener('click', () => {
        this.constellation.randomConstellation();
      });
    }

    const toggleEl = document.getElementById('constellationToggle');
    if (toggleEl) {
      toggleEl.addEventListener('click', () => {
        this.constellation.toggleMode();
      });
    }

    const panelToggle = document.getElementById('panelToggle');
    const panel = document.getElementById('controlPanel');
    if (panelToggle && panel) {
      panelToggle.addEventListener('click', () => {
        panel.classList.toggle('expanded');
      });
    }
  }

  selectStar(star: StarData) {
    this.selectedStar = star;
    this.starField.highlightStar(star);

    const card = document.getElementById('starInfoCard');
    const nameEl = document.getElementById('starName');
    const magEl = document.getElementById('starMagnitude');
    const distEl = document.getElementById('starDistance');
    const azEl = document.getElementById('starAzimuth');

    if (card && nameEl && magEl && distEl && azEl) {
      nameEl.textContent = `恒星 #${star.id}`;
      magEl.textContent = `${star.magnitude} 等`;
      distEl.textContent = `${star.distance} 光年`;
      azEl.textContent = `${star.azimuth}° / ${star.elevation}°`;
      card.classList.add('visible');
    }
  }

  deselectStar() {
    this.selectedStar = null;
    const card = document.getElementById('starInfoCard');
    if (card) card.classList.remove('visible');
  }

  resetView() {
    this.isResetting = true;
    this.resetStartTime = performance.now();
    this.resetFromSpherical = { ...this.spherical };
    this.velocity = { theta: 0, phi: 0 };
  }

  updateResetAnimation(now: number) {
    const elapsed = now - this.resetStartTime;
    const t = Math.min(elapsed / this.resetDuration, 1);
    const ease = 1 - Math.pow(1 - t, 3);

    this.spherical.theta = this.resetFromSpherical.theta + (this.initialSpherical.theta - this.resetFromSpherical.theta) * ease;
    this.spherical.phi = this.resetFromSpherical.phi + (this.initialSpherical.phi - this.resetFromSpherical.phi) * ease;

    if (t >= 1) {
      this.isResetting = false;
    }
    this.updateCameraFromSpherical();
  }

  animate() {
    const loop = () => {
      requestAnimationFrame(loop);

      const now = performance.now();
      const time = now * 0.001;

      if (this.isResetting) {
        this.updateResetAnimation(now);
      } else if (this.isDragging) {
        this.spherical.theta += this.velocity.theta;
        this.spherical.phi += this.velocity.phi;
        this.spherical.phi = Math.max(0.087, Math.min(1.484, this.spherical.phi));
        this.velocity = { theta: 0, phi: 0 };
        this.updateCameraFromSpherical();
      } else {
        this.spherical.theta += this.velocity.theta;
        this.spherical.phi += this.velocity.phi;
        this.spherical.phi = Math.max(0.087, Math.min(1.484, this.spherical.phi));
        this.velocity.theta *= this.friction;
        this.velocity.phi *= this.friction;
        if (Math.abs(this.velocity.theta) < 0.0001) this.velocity.theta = 0;
        if (Math.abs(this.velocity.phi) < 0.0001) this.velocity.phi = 0;
        this.updateCameraFromSpherical();
      }

      this.starField.update(time);
      this.constellation.update(time);
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }
}

new Planetarium();
