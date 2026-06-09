import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { GUI } from 'dat.gui';
import { TimeKeeper } from './timeKeeper.js';
import { Planet, PLANET_DATA, PlanetData } from './planet.js';
import './style.css';

interface CameraTransition {
  active: boolean;
  startTime: number;
  duration: number;
  startPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  startTarget: THREE.Vector3;
  endTarget: THREE.Vector3;
}

class SolarSystemApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private labelRenderer: CSS2DRenderer;
  private controls: OrbitControls;
  private timeKeeper: TimeKeeper;
  private gui: GUI;

  private sun!: THREE.Mesh;
  private sunGlow!: THREE.Points;
  private starfield!: THREE.Points;
  private planets: Planet[] = [];

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private selectedPlanet: Planet | null = null;
  private infoPanel!: HTMLDivElement;

  private cameraTransition: CameraTransition = {
    active: false,
    startTime: 0,
    duration: 500,
    startPosition: new THREE.Vector3(),
    targetPosition: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endTarget: new THREE.Vector3()
  };

  private lastRaycastTime: number = 0;
  private focusTarget: string = 'Free';

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 40, 80);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0';
    this.labelRenderer.domElement.style.left = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 200;
    this.controls.target.set(0, 0, 0);

    this.timeKeeper = TimeKeeper.getInstance();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.gui = new GUI({ name: '太阳系控制台' });
    this.gui.domElement.classList.add('solar-gui');

    this.init();
  }

  private init(): void {
    this.setupDOM();
    this.setupLights();
    this.createSun();
    this.createStarfield();
    this.createPlanets();
    this.setupGUI();
    this.setupEvents();
    this.animate();
  }

  private setupDOM(): void {
    const appContainer = document.getElementById('app');
    if (!appContainer) return;
    appContainer.appendChild(this.renderer.domElement);
    appContainer.appendChild(this.labelRenderer.domElement);

    this.infoPanel = document.createElement('div');
    this.infoPanel.id = 'info-panel';
    this.infoPanel.className = 'info-panel';
    this.infoPanel.style.display = 'none';
    document.getElementById('ui-overlay')?.appendChild(this.infoPanel);
  }

  private setupLights(): void {
    const sunLight = new THREE.PointLight(0xffffff, 3, 500, 1.5);
    sunLight.position.set(0, 0, 0);
    this.scene.add(sunLight);

    const ambient = new THREE.AmbientLight(0x404050, 0.3);
    this.scene.add(ambient);
  }

  private createSun(): void {
    const sunGeometry = new THREE.SphereGeometry(5, 64, 64);
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xfdb813,
      transparent: false
    });
    this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
    this.sun.name = 'Sun';
    (this.sun as any).planetData = {
      name: 'Sun',
      nameCN: '太阳',
      radius: 5,
      orbitPeriod: 0,
      rotationPeriod: 609.12,
      distanceAU: 0,
      tempRange: [5500, 5500]
    } as PlanetData;
    this.scene.add(this.sun);

    const glowCount = 300;
    const glowPositions = new Float32Array(glowCount * 3);
    const glowColors = new Float32Array(glowCount * 3);
    const glowSizes = new Float32Array(glowCount);

    const color1 = new THREE.Color(0xffe082);
    const color2 = new THREE.Color(0xff7043);

    for (let i = 0; i < glowCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 7 + Math.random() * 2;
      const yOffset = (Math.random() - 0.5) * 0.8;

      glowPositions[i * 3] = Math.cos(angle) * radius;
      glowPositions[i * 3 + 1] = yOffset;
      glowPositions[i * 3 + 2] = Math.sin(angle) * radius;

      const colorMix = Math.random();
      const mixed = color1.clone().lerp(color2, colorMix);
      glowColors[i * 3] = mixed.r;
      glowColors[i * 3 + 1] = mixed.g;
      glowColors[i * 3 + 2] = mixed.b;

      glowSizes[i] = 0.5 + Math.random() * 1.0;
    }

    const glowGeometry = new THREE.BufferGeometry();
    glowGeometry.setAttribute('position', new THREE.BufferAttribute(glowPositions, 3));
    glowGeometry.setAttribute('color', new THREE.BufferAttribute(glowColors, 3));
    glowGeometry.setAttribute('size', new THREE.BufferAttribute(glowSizes, 1));

    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float time;
        void main() {
          vColor = color;
          vec3 pos = position;
          float angle = time * 0.3 + position.x * 0.1;
          float s = sin(angle);
          float c = cos(angle);
          pos.xz = mat2(c, -s, s, c) * pos.xz;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          vAlpha = 0.6 + 0.4 * sin(time * 2.0 + position.x * 0.5);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float alpha = (1.0 - dist * 2.0) * vAlpha;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.sunGlow = new THREE.Points(glowGeometry, glowMaterial);
    this.scene.add(this.sunGlow);
  }

  private createStarfield(): void {
    const starCount = 10000;
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const radius = 300 + Math.random() * 200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      sizes[i] = 0.1 + Math.random() * 0.4;
    }

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const starMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float size;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float alpha = 1.0 - dist * 2.0;
          gl_FragColor = vec4(1.0, 1.0, 1.0, alpha * 0.9);
        }
      `,
      transparent: true,
      depthWrite: false
    });

    this.starfield = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.starfield);
  }

  private createPlanets(): void {
    for (const data of PLANET_DATA) {
      const planet = new Planet(data);
      this.planets.push(planet);
      this.scene.add(planet.group);
      this.scene.add(planet.orbitLine);

      const labelDiv = document.createElement('div');
      labelDiv.className = 'planet-label';
      labelDiv.textContent = data.nameCN;
      const label = new CSS2DObject(labelDiv);
      label.position.set(0, data.radius + 0.8, 0);
      planet.group.add(label);
    }
  }

  private setupGUI(): void {
    const params = {
      '时间倍率': 1,
      '暂停/恢复': () => {
        this.timeKeeper.togglePause();
      },
      '焦点': 'Free'
    };

    const focusOptions: Record<string, string> = { '自由视角': 'Free' };
    focusOptions['太阳'] = 'Sun';
    for (const p of PLANET_DATA) {
      focusOptions[p.nameCN] = p.name;
    }

    const speedController = this.gui
      .add(params, '时间倍率', 0.1, 100, 0.1)
      .name('时间倍率')
      .setValue(1)
      .onChange((v: number) => {
        this.timeKeeper.setSpeed(v);
      });

    Object.defineProperty(speedController, '__logScale', { value: true });

    this.gui
      .add(params, '暂停/恢复')
      .name('暂停 / 恢复');

    this.gui
      .add(params, '焦点', focusOptions)
      .name('焦点跟随')
      .onChange((value: string) => {
        this.focusTarget = value;
        this.startCameraTransition(value);
      });
  }

  private startCameraTransition(targetName: string): void {
    if (targetName === 'Free') {
      this.cameraTransition.active = false;
      this.controls.enabled = true;
      this.controls.target.set(0, 0, 0);
      return;
    }

    let targetPlanet: Planet | null = null;
    let targetPos = new THREE.Vector3(0, 0, 0);
    let targetRadius = 5;

    if (targetName === 'Sun') {
      targetRadius = 5;
    } else {
      targetPlanet = this.planets.find((p) => p.data.name === targetName) || null;
      if (targetPlanet) {
        targetPos = targetPlanet.getWorldPosition();
        targetRadius = targetPlanet.data.radius;
      }
    }

    const offsetDir = this.camera.position.clone().sub(this.controls.target).normalize();
    const distance = Math.max(targetRadius * 6, 10);

    this.cameraTransition.startPosition.copy(this.camera.position);
    this.cameraTransition.targetPosition.copy(targetPos).add(offsetDir.multiplyScalar(distance));
    this.cameraTransition.startTarget.copy(this.controls.target);
    this.cameraTransition.endTarget.copy(targetPos);
    this.cameraTransition.startTime = performance.now();
    this.cameraTransition.duration = 500;
    this.cameraTransition.active = true;
    this.controls.enabled = false;
  }

  private updateCameraTransition(): void {
    if (!this.cameraTransition.active) return;

    const now = performance.now();
    let t = (now - this.cameraTransition.startTime) / this.cameraTransition.duration;

    if (t >= 1) {
      t = 1;
      this.cameraTransition.active = false;
      this.controls.enabled = this.focusTarget === 'Free';
    }

    const eased = 1 - Math.pow(1 - t, 3);

    this.camera.position.lerpVectors(
      this.cameraTransition.startPosition,
      this.cameraTransition.targetPosition,
      eased
    );
    this.controls.target.lerpVectors(
      this.cameraTransition.startTarget,
      this.cameraTransition.endTarget,
      eased
    );

    if (this.focusTarget !== 'Free' && this.focusTarget !== 'Sun') {
      const planet = this.planets.find((p) => p.data.name === this.focusTarget);
      if (planet) {
        const currentTarget = this.controls.target.clone();
        const planetPos = planet.getWorldPosition();
        const offset = this.camera.position.clone().sub(currentTarget);
        this.cameraTransition.endTarget.copy(planetPos);
        this.cameraTransition.targetPosition.copy(planetPos).add(offset);
      }
    }
  }

  private setupEvents(): void {
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('click', (e) => this.onClick(e));
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  private onClick(_event: MouseEvent): void {
    const now = performance.now();
    if (now - this.lastRaycastTime < 50) return;
    this.lastRaycastTime = now;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes: THREE.Object3D[] = [this.sun];
    for (const p of this.planets) meshes.push(p.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const data = (hit as any).planetData as PlanetData | undefined;
      if (data) {
        this.selectedPlanet = data.name === 'Sun'
          ? null
          : this.planets.find((p) => p.data.name === data.name) || null;
        this.showInfoPanel(data);
      }
    }
  }

  private performRaycast(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes: THREE.Object3D[] = [this.sun];
    for (const p of this.planets) meshes.push(p.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const data = (hit as any).planetData as PlanetData | undefined;
      if (data) {
        if (!this.selectedPlanet) {
          this.showInfoPanel(data);
        }
        document.body.style.cursor = 'pointer';
        return;
      }
    }
    if (!this.selectedPlanet) {
      this.hideInfoPanel();
    }
    document.body.style.cursor = 'default';
  }

  private showInfoPanel(data: PlanetData): void {
    if (!this.infoPanel) return;
    this.infoPanel.style.display = 'block';
    this.infoPanel.innerHTML = `
      <div class="info-title">${data.nameCN}</div>
      <div class="info-row"><span class="info-label">英文名称</span><span class="info-value">${data.name}</span></div>
      ${data.orbitPeriod > 0 ? `<div class="info-row"><span class="info-label">公转周期</span><span class="info-value">${data.orbitPeriod.toLocaleString()} 地球日</span></div>` : ''}
      <div class="info-row"><span class="info-label">自转周期</span><span class="info-value">${data.rotationPeriod.toLocaleString()} 小时</span></div>
      ${data.distanceAU > 0 ? `<div class="info-row"><span class="info-label">太阳距离</span><span class="info-value">${data.distanceAU} AU</span></div>` : ''}
      <div class="info-row"><span class="info-label">表面温度</span><span class="info-value">${data.tempRange[0]}°C ~ ${data.tempRange[1]}°C</span></div>
    `;
  }

  private hideInfoPanel(): void {
    if (this.infoPanel) {
      this.infoPanel.style.display = 'none';
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const virtualTime = this.timeKeeper.update();
    const currentSpeed = this.timeKeeper.getCurrentDisplaySpeed();

    for (const planet of this.planets) {
      planet.update(virtualTime);
      planet.updateOrbitColor(currentSpeed);
    }

    this.sun.rotation.y = virtualTime * 0.000001;

    const glowMat = this.sunGlow.material as THREE.ShaderMaterial;
    glowMat.uniforms.time.value = virtualTime * 0.001;

    this.updateCameraTransition();
    this.controls.update();

    const now = performance.now();
    if (now - this.lastRaycastTime > 100) {
      this.lastRaycastTime = now;
      this.performRaycast();
    }

    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new SolarSystemApp();
});
