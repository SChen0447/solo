import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { WindField, Building } from './windField';
import { ParticleSystem } from './particleSystem';
import { Heatmap } from './heatmap';

class WindSimulationApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private windField: WindField;
  private particleSystem: ParticleSystem;
  private heatmap: Heatmap;
  private buildings: Building[] = [];
  private buildingMeshes: THREE.Mesh[] = [];
  private highlightMeshes: Map<THREE.Mesh, THREE.LineSegments> = new Map();
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredBuilding: THREE.Mesh | null = null;
  private clock: THREE.Clock;
  private container: HTMLElement;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = new THREE.Scene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();

    this.windField = new WindField();
    this.particleSystem = new ParticleSystem(this.scene, this.windField);
    this.heatmap = new Heatmap(this.scene, this.particleSystem);

    this.setupScene();
    this.setupBuildings();
    this.setupLights();
    this.setupEventListeners();
    this.setupUI();

    this.animate();
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(100, 100, 100);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x1a1a2e, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.screenSpacePanning = false;
    controls.minDistance = 30;
    controls.maxDistance = 300;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.target.set(0, 0, 0);
    controls.update();
    return controls;
  }

  private setupScene(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F0FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;

    const groundGeometry = new THREE.PlaneGeometry(300, 300, 1, 1);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const gridHelper = new THREE.GridHelper(300, 30, 0xaaaaaa, 0xaaaaaa);
    (gridHelper.material as THREE.Material).opacity = 0.5;
    (gridHelper.material as THREE.Material).transparent = true;
    this.scene.add(gridHelper);
  }

  private setupBuildings(): void {
    const buildingConfigs = [
      { x: -40, z: -30, width: 20, depth: 15, height: 45, rotation: 0 },
      { x: -5, z: -40, width: 25, depth: 20, height: 80, rotation: Math.PI * 0.1 },
      { x: 40, z: -20, width: 18, depth: 22, height: 60, rotation: -Math.PI * 0.15 },
      { x: -35, z: 25, width: 22, depth: 18, height: 30, rotation: Math.PI * 0.05 },
      { x: 5, z: 35, width: 15, depth: 25, height: 15, rotation: -Math.PI * 0.1 },
      { x: 45, z: 30, width: 20, depth: 20, height: 55, rotation: Math.PI * 0.2 }
    ];

    const buildingMaterial = new THREE.MeshStandardMaterial({
      color: 0xc0c0c0,
      roughness: 0.7,
      metalness: 0.3
    });

    for (const config of buildingConfigs) {
      const geometry = new THREE.BoxGeometry(config.width, config.height, config.depth);
      const mesh = new THREE.Mesh(geometry, buildingMaterial);
      mesh.position.set(config.x, config.height / 2, config.z);
      mesh.rotation.y = config.rotation;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.buildingMeshes.push(mesh);

      const building: Building = {
        position: mesh.position.clone(),
        width: config.width,
        depth: config.depth,
        height: config.height,
        mesh: mesh
      };
      this.buildings.push(building);

      const edgesGeometry = new THREE.EdgesGeometry(geometry);
      const edgesMaterial = new THREE.LineBasicMaterial({
        color: 0xffd700,
        linewidth: 2,
        transparent: true,
        opacity: 0
      });
      const highlightMesh = new THREE.LineSegments(edgesGeometry, edgesMaterial);
      highlightMesh.position.copy(mesh.position);
      highlightMesh.rotation.copy(mesh.rotation);
      this.scene.add(highlightMesh);
      this.highlightMeshes.set(mesh, highlightMesh);
    }

    this.windField.setBuildings(this.buildings);
    this.particleSystem.setBuildings(this.buildings);
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -150;
    directionalLight.shadow.camera.right = 150;
    directionalLight.shadow.camera.top = 150;
    directionalLight.shadow.camera.bottom = -150;
    this.scene.add(directionalLight);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onResize());
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private updateBuildingHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.buildingMeshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      if (this.hoveredBuilding !== hitMesh) {
        if (this.hoveredBuilding) {
          const oldHighlight = this.highlightMeshes.get(this.hoveredBuilding);
          if (oldHighlight) {
            (oldHighlight.material as THREE.LineBasicMaterial).opacity = 0;
          }
        }
        this.hoveredBuilding = hitMesh;
        const highlight = this.highlightMeshes.get(hitMesh);
        if (highlight) {
          (highlight.material as THREE.LineBasicMaterial).opacity = 0.5;
        }
        this.renderer.domElement.style.cursor = 'pointer';
      }
    } else {
      if (this.hoveredBuilding) {
        const highlight = this.highlightMeshes.get(this.hoveredBuilding);
        if (highlight) {
          (highlight.material as THREE.LineBasicMaterial).opacity = 0;
        }
        this.hoveredBuilding = null;
        this.renderer.domElement.style.cursor = 'default';
      }
    }
  }

  private setupUI(): void {
    const windSpeedSlider = document.getElementById('wind-speed') as HTMLInputElement;
    const windDirectionSlider = document.getElementById('wind-direction') as HTMLInputElement;
    const particleCountSlider = document.getElementById('particle-count') as HTMLInputElement;
    const collapseBtn = document.getElementById('collapse-btn') as HTMLButtonElement;
    const controlPanel = document.getElementById('control-panel') as HTMLDivElement;

    const updateWindSpeedDisplay = (value: number) => {
      document.getElementById('wind-speed-value')!.textContent = `${value.toFixed(1)} m/s`;
    };

    const updateWindDirectionDisplay = (value: number) => {
      const arrow = document.getElementById('wind-arrow') as HTMLDivElement;
      if (arrow) {
        arrow.style.transform = `translate(-50%, 0) rotate(${value}deg)`;
      }
      const dirNames = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
      const idx = Math.round(((value % 360) + 360) % 360 / 45) % 8;
      document.getElementById('wind-direction-value')!.textContent = `${Math.round(value)}° (${dirNames[idx]})`;
    };

    const updateParticleCountDisplay = (value: number) => {
      document.getElementById('particle-count-value')!.textContent = `${value}`;
    };

    windSpeedSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      updateWindSpeedDisplay(value);
      this.windField.setParams({ speed: value }, true);
    });

    windDirectionSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      updateWindDirectionDisplay(value);
      this.windField.setParams({ direction: value }, true);
    });

    particleCountSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      updateParticleCountDisplay(value);
      this.particleSystem.setParticleCount(value);
    });

    let isCollapsed = false;
    collapseBtn.addEventListener('click', () => {
      isCollapsed = !isCollapsed;
      controlPanel.classList.toggle('collapsed', isCollapsed);
      collapseBtn.textContent = isCollapsed ? '▶' : '◀';
    });

    const dial = document.getElementById('wind-dial') as HTMLDivElement;
    if (dial) {
      let isDragging = false;
      
      const getAngleFromEvent = (e: MouseEvent) => {
        const rect = dial.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const angle = Math.atan2(e.clientX - cx, -(e.clientY - cy)) * 180 / Math.PI;
        let snapped = Math.round(angle / 15) * 15;
        snapped = ((snapped % 360) + 360) % 360;
        return snapped;
      };

      dial.addEventListener('mousedown', (e) => {
        isDragging = true;
        const angle = getAngleFromEvent(e);
        windDirectionSlider.value = angle.toString();
        updateWindDirectionDisplay(angle);
        this.windField.setParams({ direction: angle }, true);
      });

      window.addEventListener('mousemove', (e) => {
        if (isDragging) {
          const angle = getAngleFromEvent(e);
          windDirectionSlider.value = angle.toString();
          updateWindDirectionDisplay(angle);
          this.windField.setParams({ direction: angle }, true);
        }
      });

      window.addEventListener('mouseup', () => {
        isDragging = false;
      });
    }

    updateWindSpeedDisplay(parseFloat(windSpeedSlider.value));
    updateWindDirectionDisplay(parseFloat(windDirectionSlider.value));
    updateParticleCountDisplay(parseInt(particleCountSlider.value));
  }

  private updateInfoPanel(): void {
    const avgSpeed = this.particleSystem.getAverageSpeed();
    const maxSpeed = this.particleSystem.getMaxSpeed();
    const direction = this.windField.getParams().direction;
    const particleCount = this.particleSystem.getParticleCount();

    document.getElementById('info-avg-speed')!.textContent = `${avgSpeed.toFixed(2)} m/s`;
    document.getElementById('info-max-speed')!.textContent = `${maxSpeed.toFixed(2)} m/s`;
    document.getElementById('info-direction')!.textContent = `${Math.round(direction)}°`;
    document.getElementById('info-particles')!.textContent = `${particleCount}`;
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const now = performance.now();
    const delta = this.clock.getDelta() * 1000;

    this.controls.update();
    this.windField.update(now);
    this.particleSystem.update(now, delta);
    this.heatmap.update(now);
    this.updateBuildingHover();
    this.updateInfoPanel();

    this.renderer.render(this.scene, this.camera);
  }
}

new WindSimulationApp();
