import * as THREE from 'three';
import { CameraControls } from './cameraControls';
import { CellOrganelles } from './cellOrganelles';

class CellExplorerApp {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: CameraControls;
  private organelles!: CellOrganelles;
  private clock = new THREE.Clock();

  private cellMembrane!: THREE.Mesh;
  private cytoplasmParticles!: THREE.InstancedMesh;
  private particleCount = 1000;
  private particleData: { pos: THREE.Vector3; vel: THREE.Vector3; scale: number; phase: number }[] = [];

  private membraneOpacity = 0.3;
  private membraneTargetOpacity = 0.3;
  private membraneOpacityTransition = 0;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private selectedName: string | null = null;

  private isTouring = false;

  constructor() {
    this.initLoadingScreen();
    this.initScene();
    this.initCellMembrane();
    this.initCytoplasmParticles();
    this.initLighting();
    this.initControls();
    this.initOrganelles();
    this.initUI();
    this.animate();

    setTimeout(() => {
      const loading = document.getElementById('loading-screen');
      if (loading) {
        loading.classList.add('fade-out');
        setTimeout(() => loading.remove(), 800);
      }
    }, 1500);
  }

  private initLoadingScreen() {
    const canvas = document.getElementById('particle-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number; r: number; alpha: number }[] = [];
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    for (let i = 0; i < 120; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 1.5 + 0.3;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.6 + 0.2,
      });
    }

    const drawFrame = () => {
      if (!document.getElementById('particle-canvas')) return;
      ctx.fillStyle = 'rgba(26, 10, 46, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha *= 0.998;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(160, 120, 255, ${p.alpha})`;
        ctx.fill();
      });

      requestAnimationFrame(drawFrame);
    };
    drawFrame();
  }

  private initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0520, 0.002);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.camera.position.set(0, 80, 180);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    const container = document.getElementById('canvas-container');
    if (container) container.appendChild(this.renderer.domElement);

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private initCellMembrane() {
    const membraneGeo = new THREE.SphereGeometry(80, 64, 64);
    const membraneMat = new THREE.MeshPhysicalMaterial({
      color: 0x6644aa,
      transparent: true,
      opacity: this.membraneOpacity,
      roughness: 0.1,
      metalness: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
      emissive: 0x3322aa,
      emissiveIntensity: 0.08,
      transmission: 0.6,
      thickness: 2,
    });
    this.cellMembrane = new THREE.Mesh(membraneGeo, membraneMat);
    this.scene.add(this.cellMembrane);
  }

  private initCytoplasmParticles() {
    const sphereGeo = new THREE.SphereGeometry(1, 8, 8);
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      roughness: 0.5,
      metalness: 0.0,
      emissive: 0x4433aa,
      emissiveIntensity: 0.15,
    });

    this.cytoplasmParticles = new THREE.InstancedMesh(sphereGeo, mat, 2000);
    this.cytoplasmParticles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.cytoplasmParticles.count = this.particleCount;

    this.particleData = [];
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < 2000; i++) {
      const r = Math.random() * 70;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const pos = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02
      );

      const scale = Math.random() * 0.8 + 0.3;
      const phase = Math.random() * Math.PI * 2;

      this.particleData.push({ pos, vel, scale, phase });

      dummy.position.copy(pos);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      this.cytoplasmParticles.setMatrixAt(i, dummy.matrix);

      const t = Math.random();
      color.setHSL(0.65 + t * 0.1, 0.4, 0.5 + t * 0.2);
      this.cytoplasmParticles.setColorAt(i, color);
    }

    this.cytoplasmParticles.instanceMatrix.needsUpdate = true;
    if (this.cytoplasmParticles.instanceColor) {
      this.cytoplasmParticles.instanceColor.needsUpdate = true;
    }

    this.scene.add(this.cytoplasmParticles);
  }

  private initLighting() {
    const ambientLight = new THREE.AmbientLight(0x332255, 0.6);
    this.scene.add(ambientLight);

    const topLight = new THREE.DirectionalLight(0x8888ff, 0.8);
    topLight.position.set(0, 200, 0);
    topLight.castShadow = true;
    topLight.shadow.mapSize.width = 1024;
    topLight.shadow.mapSize.height = 1024;
    this.scene.add(topLight);

    const fillLight = new THREE.DirectionalLight(0x4444aa, 0.3);
    fillLight.position.set(-100, -50, 100);
    this.scene.add(fillLight);

    const pointLight1 = new THREE.PointLight(0xff6644, 0.5, 200);
    pointLight1.position.set(30, 10, -20);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x44aaff, 0.4, 200);
    pointLight2.position.set(-30, -10, 30);
    this.scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0x66ff44, 0.3, 150);
    pointLight3.position.set(25, 5, 15);
    this.scene.add(pointLight3);
  }

  private initControls() {
    this.controls = new CameraControls(this.camera, this.renderer.domElement);
  }

  private initOrganelles() {
    this.organelles = new CellOrganelles(this.scene);
  }

  private initUI() {
    const membraneSlider = document.getElementById('membrane-opacity') as HTMLInputElement;
    const membraneVal = document.getElementById('membrane-opacity-val');
    membraneSlider?.addEventListener('input', () => {
      const v = parseFloat(membraneSlider.value);
      membraneVal!.textContent = v.toFixed(2);
      this.membraneTargetOpacity = v;
      this.membraneOpacityTransition = 0;
    });

    const pulseSlider = document.getElementById('pulse-intensity') as HTMLInputElement;
    const pulseVal = document.getElementById('pulse-intensity-val');
    pulseSlider?.addEventListener('input', () => {
      const v = parseFloat(pulseSlider.value);
      pulseVal!.textContent = v.toFixed(2);
      this.organelles.setPulseIntensity(v);
    });

    const particleSlider = document.getElementById('particle-density') as HTMLInputElement;
    const particleVal = document.getElementById('particle-density-val');
    particleSlider?.addEventListener('input', () => {
      const v = parseInt(particleSlider.value);
      particleVal!.textContent = v.toString();
      this.particleCount = v;
      this.cytoplasmParticles.count = v;
    });

    const rotateSlider = document.getElementById('auto-rotate') as HTMLInputElement;
    const rotateVal = document.getElementById('auto-rotate-val');
    rotateSlider?.addEventListener('input', () => {
      const v = parseFloat(rotateSlider.value);
      rotateVal!.textContent = v.toFixed(3);
      this.controls.autoRotateSpeed = v;
    });

    const panelToggle = document.getElementById('panel-toggle');
    const controlPanel = document.getElementById('control-panel');
    panelToggle?.addEventListener('click', () => {
      controlPanel?.classList.toggle('expanded');
      controlPanel?.classList.toggle('collapsed');
      panelToggle.classList.toggle('expanded');
      panelToggle.classList.toggle('collapsed');
      panelToggle.textContent = controlPanel?.classList.contains('expanded') ? '◀' : '▶';
    });

    this.renderer.domElement.addEventListener('click', this.onCanvasClick.bind(this));

    document.getElementById('btn-reset')?.addEventListener('click', () => {
      this.controls.resetView();
    });

    document.getElementById('btn-screenshot')?.addEventListener('click', () => {
      this.takeScreenshot();
    });

    document.getElementById('btn-tour')?.addEventListener('click', (e) => {
      const btn = e.target as HTMLElement;
      if (this.isTouring) {
        this.controls.stopAutoTour();
        this.isTouring = false;
        btn.classList.remove('active');
        btn.textContent = '自动漫游';
      } else {
        this.controls.startAutoTour(() => {
          this.isTouring = false;
          btn.classList.remove('active');
          btn.textContent = '自动漫游';
        });
        this.isTouring = true;
        btn.classList.add('active');
        btn.textContent = '停止漫游';
      }
    });
  }

  private onCanvasClick(e: MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes = this.organelles.getMeshesForRaycast();
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const name = hit.userData.organelleName as string;
      if (name) {
        this.selectedName = name;
        this.organelles.selectOrganelle(name);
        this.showInfoPanel(name);
      }
    } else {
      this.selectedName = null;
      this.organelles.deselectAll();
      this.hideInfoPanel();
    }
  }

  private showInfoPanel(name: string) {
    const info = this.organelles.getOrganelleInfo(name);
    if (!info) return;

    const panel = document.getElementById('info-panel');
    const nameEl = document.getElementById('info-name');
    const descEl = document.getElementById('info-desc');
    const statusEl = document.getElementById('info-status');

    if (!panel || !nameEl || !descEl || !statusEl) return;

    nameEl.textContent = info.name;
    nameEl.style.color = `#${info.color.getHexString()}`;
    descEl.textContent = info.desc;

    statusEl.innerHTML = '';
    info.statuses.forEach((s) => {
      const item = document.createElement('div');
      item.className = 'status-item';
      item.innerHTML = `<span>${s.label}</span><span class="status-value" style="color:#${info.color.getHexString()}">${s.value}</span>`;
      statusEl.appendChild(item);
    });

    panel.classList.add('visible');

    this.updateInfoPanelPeriodically(name);
  }

  private infoPanelInterval: number | null = null;

  private updateInfoPanelPeriodically(name: string) {
    if (this.infoPanelInterval) clearInterval(this.infoPanelInterval);
    this.infoPanelInterval = window.setInterval(() => {
      if (this.selectedName !== name) {
        clearInterval(this.infoPanelInterval!);
        return;
      }
      const info = this.organelles.getOrganelleInfo(name);
      if (!info) return;
      const statusEl = document.getElementById('info-status');
      if (!statusEl) return;
      statusEl.innerHTML = '';
      info.statuses.forEach((s) => {
        const item = document.createElement('div');
        item.className = 'status-item';
        item.innerHTML = `<span>${s.label}</span><span class="status-value" style="color:#${info.color.getHexString()}">${s.value}</span>`;
        statusEl.appendChild(item);
      });
    }, 1000);
  }

  private hideInfoPanel() {
    const panel = document.getElementById('info-panel');
    panel?.classList.remove('visible');
    if (this.infoPanelInterval) {
      clearInterval(this.infoPanelInterval);
      this.infoPanelInterval = null;
    }
  }

  private takeScreenshot() {
    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    const now = new Date();
    const ts = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
    link.download = `cell_explorer_${ts}.png`;
    link.href = dataUrl;
    link.click();
  }

  private updateCytoplasmParticles(time: number) {
    const dummy = new THREE.Object3D();
    const maxDist = 75;

    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particleData[i];
      p.pos.add(p.vel);

      const dist = p.pos.length();
      if (dist > maxDist) {
        const dir = p.pos.clone().normalize();
        p.vel.negate();
        p.pos.copy(dir.multiplyScalar(maxDist * 0.98));
      }

      p.pos.add(p.vel.clone().multiplyScalar(Math.sin(time + p.phase) * 0.1));

      dummy.position.copy(p.pos);
      const rotAngle = time * 0.1 + p.phase;
      dummy.rotation.set(rotAngle * 0.3, rotAngle * 0.5, 0);
      dummy.scale.setScalar(p.scale * (1 + Math.sin(time * 2 + p.phase) * 0.1));
      dummy.updateMatrix();
      this.cytoplasmParticles.setMatrixAt(i, dummy.matrix);
    }

    this.cytoplasmParticles.count = this.particleCount;
    this.cytoplasmParticles.instanceMatrix.needsUpdate = true;
  }

  private updateMembraneOpacity(delta: number) {
    if (Math.abs(this.membraneOpacity - this.membraneTargetOpacity) > 0.001) {
      this.membraneOpacityTransition += delta;
      const t = Math.min(this.membraneOpacityTransition / 0.5, 1);
      const ease = t * t * (3 - 2 * t);
      this.membraneOpacity = this.membraneOpacity + (this.membraneTargetOpacity - this.membraneOpacity) * ease;
      (this.cellMembrane.material as THREE.MeshPhysicalMaterial).opacity = this.membraneOpacity;
    } else {
      this.membraneOpacity = this.membraneTargetOpacity;
      (this.cellMembrane.material as THREE.MeshPhysicalMaterial).opacity = this.membraneOpacity;
    }
  }

  private animate() {
    requestAnimationFrame(this.animate.bind(this));

    const delta = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.getElapsedTime();

    this.controls.update(delta);
    this.organelles.update(time);
    this.updateCytoplasmParticles(time);
    this.updateMembraneOpacity(delta);

    this.renderer.render(this.scene, this.camera);
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

new CellExplorerApp();
