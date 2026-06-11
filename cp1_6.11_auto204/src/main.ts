import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Ecosystem } from './ecosystem';
import { VentGUI } from './gui';
import gsap from 'gsap';

class HydrothermalVentApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private ecosystem: Ecosystem;
  private gui: VentGUI;
  private clock: THREE.Clock;
  private ventGroup: THREE.Group;
  private particles!: THREE.Points;
  private particleData: {
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
    size: number;
  }[] = [];

  private readonly PARTICLE_COUNT = 500;
  private readonly VENT_HEIGHT = 2;
  private readonly VENT_RADIUS = 0.3;
  private readonly MAX_PARTICLE_HEIGHT = 4;
  private readonly initialCameraPosition = new THREE.Vector3(0, 2, 5);
  private readonly initialTarget = new THREE.Vector3(0, 1, 0);

  private temperature: number = 50;
  private acidity: number = 30;
  private density: number = 60;

  constructor() {
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.setupBackground();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.copy(this.initialCameraPosition);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    const appContainer = document.getElementById('app');
    if (appContainer) {
      appContainer.appendChild(this.renderer.domElement);
    } else {
      document.body.appendChild(this.renderer.domElement);
    }

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.copy(this.initialTarget);
    this.controls.minDistance = 2;
    this.controls.maxDistance = 15;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.3;

    this.ventGroup = new THREE.Group();
    this.scene.add(this.ventGroup);

    this.setupLights();
    this.createVent();
    this.createSeafloor();
    this.createParticles();

    this.ecosystem = new Ecosystem(this.scene, new THREE.Vector3(0, 0, 0));

    this.gui = new VentGUI();
    this.gui.setRenderer(this.renderer);
    this.setupGUIEvents();

    window.addEventListener('resize', this.onResize.bind(this));

    this.animate();
  }

  private setupBackground(): void {
    this.scene.background = new THREE.Color(0x000022);
    this.scene.fog = new THREE.FogExp2(0x000011, 0.08);
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x111133, 0.3);
    this.scene.add(ambientLight);

    const topLight = new THREE.DirectionalLight(0x4466ff, 0.4);
    topLight.position.set(0, 10, 0);
    this.scene.add(topLight);

    const ventLight = new THREE.PointLight(0xff6600, 0.8, 5, 2);
    ventLight.position.set(0, 1.5, 0);
    this.scene.add(ventLight);

    const rimLight = new THREE.DirectionalLight(0x0066ff, 0.2);
    rimLight.position.set(-5, 2, -5);
    this.scene.add(rimLight);
  }

  private createVent(): void {
    const chimneyGeometry = new THREE.CylinderGeometry(
      this.VENT_RADIUS * 0.7,
      this.VENT_RADIUS,
      this.VENT_HEIGHT,
      16,
      4,
      true
    );

    const positions = chimneyGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);

      const noise = (Math.sin(x * 10 + y * 3) + Math.cos(z * 8 + y * 2)) * 0.03;
      const normal = new THREE.Vector3(x, 0, z).normalize();
      positions.setX(i, x + normal.x * noise);
      positions.setZ(i, z + normal.z * noise);
    }
    chimneyGeometry.computeVertexNormals();

    const chimneyMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a,
      roughness: 0.95,
      metalness: 0.1,
      emissive: 0x221100,
      emissiveIntensity: 0.15,
      side: THREE.DoubleSide
    });

    const chimney = new THREE.Mesh(chimneyGeometry, chimneyMaterial);
    chimney.position.y = this.VENT_HEIGHT / 2;
    this.ventGroup.add(chimney);

    const topGeometry = new THREE.CircleGeometry(this.VENT_RADIUS * 0.7, 16);
    const topMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      emissive: 0xff4400,
      emissiveIntensity: 0.5,
      side: THREE.DoubleSide
    });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.rotation.x = -Math.PI / 2;
    top.position.y = this.VENT_HEIGHT;
    this.ventGroup.add(top);

    const baseGeometry = new THREE.CylinderGeometry(
      this.VENT_RADIUS * 2.5,
      this.VENT_RADIUS * 3,
      0.5,
      20
    );
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      roughness: 0.9,
      metalness: 0.05
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.25;
    this.ventGroup.add(base);
  }

  private createSeafloor(): void {
    const floorGeometry = new THREE.PlaneGeometry(30, 30, 50, 50);

    const positions = floorGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);

      const distFromCenter = Math.sqrt(x * x + y * y);
      const heightNoise =
        Math.sin(x * 0.5) * Math.cos(y * 0.5) * 0.3 +
        Math.sin(x * 2) * Math.cos(y * 1.5) * 0.1;
      const ventRise = Math.max(0, 1 - distFromCenter / 5) * 0.5;

      positions.setZ(i, z + heightNoise + ventRise);
    }
    floorGeometry.computeVertexNormals();

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a3a,
      roughness: 0.95,
      metalness: 0.02
    });

    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.1;
    this.scene.add(floor);
  }

  private createParticles(): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.PARTICLE_COUNT * 3);
    const colors = new Float32Array(this.PARTICLE_COUNT * 3);
    const sizes = new Float32Array(this.PARTICLE_COUNT);

    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * this.VENT_RADIUS * 0.5;

      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = this.VENT_HEIGHT + Math.random() * 0.5;
      positions[i3 + 2] = Math.sin(angle) * radius;

      colors[i3] = 1.0;
      colors[i3 + 1] = 0.4;
      colors[i3 + 2] = 0.0;

      sizes[i] = 0.05 + Math.random() * 0.05;

      this.particleData.push({
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          1 + Math.random() * 2,
          (Math.random() - 0.5) * 0.02
        ),
        life: Math.random(),
        maxLife: 2 + Math.random() * 1.5,
        size: 0.05 + Math.random() * 0.05
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 200, 150, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 100, 50, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      map: texture,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  private setupGUIEvents(): void {
    this.gui.onParamChange((params) => {
      if (params.temperature !== undefined) {
        this.temperature = params.temperature;
      }
      if (params.acidity !== undefined) {
        this.acidity = params.acidity;
      }
      if (params.density !== undefined) {
        this.density = params.density;
      }

      this.ecosystem.setParams({
        temperature: this.temperature,
        acidity: this.acidity,
        density: this.density
      });
    });

    this.gui.onResetView(() => {
      this.resetCamera();
    });
  }

  private resetCamera(): void {
    gsap.to(this.camera.position, {
      x: this.initialCameraPosition.x,
      y: this.initialCameraPosition.y,
      z: this.initialCameraPosition.z,
      duration: 0.8,
      ease: 'power2.out',
      onUpdate: () => {
        this.controls.update();
      }
    });

    gsap.to(this.controls.target, {
      x: this.initialTarget.x,
      y: this.initialTarget.y,
      z: this.initialTarget.z,
      duration: 0.8,
      ease: 'power2.out'
    });
  }

  private updateParticles(deltaTime: number): void {
    if (deltaTime > 0.1) return;

    const positions = this.particles.geometry.attributes.position.array as Float32Array;
    const colors = this.particles.geometry.attributes.color.array as Float32Array;
    const sizes = this.particles.geometry.attributes.size.array as Float32Array;

    const tempFactor = this.temperature / 100;
    const baseSpeed = 1 + tempFactor * 2;

    const centerColor = new THREE.Color(0xff6600);
    const edgeColor = new THREE.Color(0x88ccff);
    const coldColor = new THREE.Color(0x003366);

    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const data = this.particleData[i];

      data.life -= deltaTime / data.maxLife;

      if (data.life <= 0 || positions[i3 + 1] > this.MAX_PARTICLE_HEIGHT) {
        if (positions[i3 + 1] > this.MAX_PARTICLE_HEIGHT && data.life > 0) {
          const dissolvePos = new THREE.Vector3(
            positions[i3],
            positions[i3 + 1],
            positions[i3 + 2]
          );
          this.ecosystem.spawnDissolveParticles(dissolvePos);
        }

        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * this.VENT_RADIUS * 0.5;
        positions[i3] = Math.cos(angle) * radius;
        positions[i3 + 1] = this.VENT_HEIGHT;
        positions[i3 + 2] = Math.sin(angle) * radius;

        data.life = 1;
        data.velocity.set(
          (Math.random() - 0.5) * 0.02,
          baseSpeed + Math.random() * baseSpeed,
          (Math.random() - 0.5) * 0.02
        );
        data.size = 0.05 + Math.random() * 0.05;
      }

      positions[i3] += data.velocity.x * deltaTime * 60 + (Math.random() - 0.5) * 0.02;
      positions[i3 + 1] += data.velocity.y * deltaTime * 60;
      positions[i3 + 2] += data.velocity.z * deltaTime * 60 + (Math.random() - 0.5) * 0.02;

      const heightProgress = Math.min(1, (positions[i3 + 1] - this.VENT_HEIGHT) / (this.MAX_PARTICLE_HEIGHT - this.VENT_HEIGHT));
      const distFromCenter = Math.sqrt(positions[i3] * positions[i3] + positions[i3 + 2] * positions[i3 + 2]);
      const distFactor = Math.min(1, distFromCenter / this.VENT_RADIUS);

      const tempColor = centerColor.clone().lerp(edgeColor, distFactor);
      const finalColor = tempColor.clone().lerp(coldColor, heightProgress * (1 - tempFactor * 0.5));

      colors[i3] = finalColor.r;
      colors[i3 + 1] = finalColor.g;
      colors[i3 + 2] = finalColor.b;

      sizes[i] = data.size * (1 - heightProgress * 0.5);
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.geometry.attributes.color.needsUpdate = true;
    this.particles.geometry.attributes.size.needsUpdate = true;
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const deltaTime = this.clock.getDelta();

    if (deltaTime <= 0.1) {
      this.updateParticles(deltaTime);
      this.ecosystem.update(deltaTime);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

const app = new HydrothermalVentApp();
