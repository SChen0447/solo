import * as THREE from 'three';
import {
  BuildingType,
  Building,
  BUILDING_CONFIG,
  VEHICLE_COLORS,
  GRID_SIZE,
  ROAD_WIDTH,
  CELL_SIZE,
  VEHICLE_SPEED,
  DECELERATION_FACTOR,
  MIN_GAP,
  TRAFFIC_LIGHT_CYCLE,
} from './types';

interface VehicleEntity {
  mesh: THREE.Mesh;
  pathIndex: number;
  segmentProgress: number;
  speed: number;
  currentPath: THREE.Vector3[];
  color: string;
}

interface TrafficLight {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  isHorizontal: boolean;
}

interface BuildingAnimation {
  mesh: THREE.Mesh;
  startTime: number;
  duration: number;
}

export class CityScene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public container: HTMLElement;

  private gridHelper!: THREE.GridHelper;
  private buildings: Map<string, THREE.Mesh> = new Map();
  private vehicles: VehicleEntity[] = [];
  private trafficLights: TrafficLight[] = [];
  private buildingAnimations: BuildingAnimation[] = [];
  private densityGrid: number[][] = [];
  private frameCount: number = 0;
  private totalFrames: number = 0;
  private directionalLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.AmbientLight;
  private ground!: THREE.Mesh;
  private heatmapOverlay: THREE.Mesh | null = null;
  private heatmapCanvas!: HTMLCanvasElement;
  private heatmapTexture: THREE.CanvasTexture | null = null;
  private raycaster!: THREE.Raycaster;
  private mouse!: THREE.Vector2;
  private roadSegments: THREE.Vector3[][] = [];
  private onClickCell: ((gridX: number, gridZ: number, screenX: number, screenY: number) => void) | null = null;

  private currentHour: number = 12;
  private showHeatmap: boolean = false;

  private animFrameId: number = 0;
  private lastTime: number = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(12, 16, 18);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.directionalLight.position.set(10, 20, 10);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.camera.left = -20;
    this.directionalLight.shadow.camera.right = 20;
    this.directionalLight.shadow.camera.top = 20;
    this.directionalLight.shadow.camera.bottom = -20;
    this.scene.add(this.directionalLight);

    this.heatmapCanvas = document.createElement('canvas');
    this.heatmapCanvas.width = GRID_SIZE * 10;
    this.heatmapCanvas.height = GRID_SIZE * 10;

    this.initGround();
    this.initRoads();
    this.initTrafficLights();
    this.initVehicles(20);
    this.initDensityGrid();

    this.setupEventListeners();
    this.startAnimationLoop();
  }

  private initGround(): void {
    const size = GRID_SIZE;
    const geometry = new THREE.PlaneGeometry(size * 2, size * 2);
    const material = new THREE.MeshStandardMaterial({
      color: 0x2c3e50,
      roughness: 0.9,
    });
    this.ground = new THREE.Mesh(geometry, material);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.ground.name = 'ground';
    this.scene.add(this.ground);

    this.gridHelper = new THREE.GridHelper(size * 2, size * 2, 0x3d566e, 0x3d566e);
    this.gridHelper.position.y = 0.01;
    this.scene.add(this.gridHelper);
  }

  private initRoads(): void {
    const half = GRID_SIZE / 2;
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.8,
    });

    const hRoad = new THREE.Mesh(
      new THREE.PlaneGeometry(GRID_SIZE * 2, ROAD_WIDTH),
      roadMat
    );
    hRoad.rotation.x = -Math.PI / 2;
    hRoad.position.y = 0.02;
    this.scene.add(hRoad);

    const vRoad = new THREE.Mesh(
      new THREE.PlaneGeometry(ROAD_WIDTH, GRID_SIZE * 2),
      roadMat
    );
    vRoad.rotation.x = -Math.PI / 2;
    vRoad.position.y = 0.02;
    this.scene.add(vRoad);

    this.buildRoadPaths();
  }

  private buildRoadPaths(): void {
    const half = GRID_SIZE / 2;
    const roadOffset = ROAD_WIDTH / 2 - 0.3;

    const topLane: THREE.Vector3[] = [];
    for (let x = -half; x <= half; x += 0.5) {
      topLane.push(new THREE.Vector3(x, 0.3, -roadOffset));
    }

    const rightLane: THREE.Vector3[] = [];
    for (let z = -half; z <= half; z += 0.5) {
      rightLane.push(new THREE.Vector3(roadOffset, 0.3, z));
    }

    const bottomLane: THREE.Vector3[] = [];
    for (let x = half; x >= -half; x -= 0.5) {
      bottomLane.push(new THREE.Vector3(x, 0.3, roadOffset));
    }

    const leftLane: THREE.Vector3[] = [];
    for (let z = half; z >= -half; z -= 0.5) {
      leftLane.push(new THREE.Vector3(-roadOffset, 0.3, z));
    }

    this.roadSegments = [topLane, rightLane, bottomLane, leftLane];
  }

  private initTrafficLights(): void {
    const offset = ROAD_WIDTH / 2 + 0.2;
    const positions = [
      { pos: new THREE.Vector3(-offset, 0.5, -offset - 0.5), isHorizontal: true },
      { pos: new THREE.Vector3(offset + 0.5, 0.5, -offset), isHorizontal: false },
      { pos: new THREE.Vector3(offset, 0.5, offset + 0.5), isHorizontal: true },
      { pos: new THREE.Vector3(-offset - 0.5, 0.5, offset), isHorizontal: false },
    ];

    positions.forEach(({ pos, isHorizontal }) => {
      const geometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
      const material = new THREE.MeshStandardMaterial({
        color: 0x27ae60,
        emissive: 0x27ae60,
        emissiveIntensity: 0.5,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(pos);
      this.scene.add(mesh);
      this.trafficLights.push({ mesh, position: pos, isHorizontal });
    });
  }

  private initVehicles(count: number): void {
    for (let i = 0; i < count; i++) {
      const color = VEHICLE_COLORS[Math.floor(Math.random() * VEHICLE_COLORS.length)];
      const geometry = new THREE.BoxGeometry(0.6, 0.4, 0.6);
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: 0.5,
        metalness: 0.3,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;

      const startSegment = i % 4;
      const path = this.getFullPath(startSegment);
      const startProgress = Math.random() * (path.length - 2);

      mesh.position.copy(path[Math.floor(startProgress)]);
      this.scene.add(mesh);

      this.vehicles.push({
        mesh,
        pathIndex: Math.floor(startProgress),
        segmentProgress: startProgress - Math.floor(startProgress),
        speed: VEHICLE_SPEED,
        currentPath: path,
        color,
      });
    }
  }

  private getFullPath(startSegment: number): THREE.Vector3[] {
    const path: THREE.Vector3[] = [];
    for (let i = 0; i < 4; i++) {
      const seg = this.roadSegments[(startSegment + i) % 4];
      if (i === 0) {
        path.push(...seg);
      } else {
        path.push(...seg.slice(1));
      }
    }
    return path;
  }

  private initDensityGrid(): void {
    this.densityGrid = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      this.densityGrid[x] = [];
      for (let z = 0; z < GRID_SIZE; z++) {
        this.densityGrid[x][z] = 0;
      }
    }
  }

  private setupEventListeners(): void {
    this.renderer.domElement.addEventListener('click', this.handleClick);
    window.addEventListener('resize', this.handleResize);
  }

  private handleClick = (event: MouseEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.ground);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      const half = GRID_SIZE / 2;
      const gridX = Math.floor(point.x + half);
      const gridZ = Math.floor(point.z + half);

      if (gridX >= 0 && gridX < GRID_SIZE && gridZ >= 0 && gridZ < GRID_SIZE) {
        const key = `${gridX},${gridZ}`;
        if (!this.buildings.has(key) && !this.isOnRoad(gridX, gridZ)) {
          this.onClickCell?.(gridX, gridZ, event.clientX, event.clientY);
        }
      }
    }
  };

  private isOnRoad(gridX: number, gridZ: number): boolean {
    const half = GRID_SIZE / 2;
    const roadCenter = Math.floor(half);
    const roadRange = [roadCenter - 1, roadCenter];
    return roadRange.includes(gridX) || roadRange.includes(gridZ);
  }

  private handleResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public setOnClickCell(callback: (gridX: number, gridZ: number, sx: number, sy: number) => void): void {
    this.onClickCell = callback;
  }

  public addBuilding(gridX: number, gridZ: number, type: BuildingType): void {
    const key = `${gridX},${gridZ}`;
    if (this.buildings.has(key)) return;

    const config = BUILDING_CONFIG[type];
    const half = GRID_SIZE / 2;

    const geometry = new THREE.BoxGeometry(
      CELL_SIZE * 0.85,
      config.height,
      CELL_SIZE * 0.85
    );
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.color),
      roughness: 0.7,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      gridX - half + 0.5,
      config.height / 2,
      gridZ - half + 0.5
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.scale.setScalar(0.5);

    this.scene.add(mesh);
    this.buildings.set(key, mesh);

    this.buildingAnimations.push({
      mesh,
      startTime: performance.now(),
      duration: 300,
    });
  }

  public addBuildings(buildings: Building[]): void {
    buildings.forEach((b) => this.addBuilding(b.gridX, b.gridZ, b.type));
  }

  public setLighting(hour: number, colorHex?: string): void {
    this.currentHour = hour;

    let intensity: number;
    if (hour >= 6 && hour <= 18) {
      const t = (hour - 6) / 12;
      intensity = Math.sin(t * Math.PI) * 0.8 + 0.2;
    } else {
      intensity = 0.2;
    }

    let lightColor: THREE.Color;
    if (colorHex) {
      lightColor = new THREE.Color(colorHex);
    } else {
      if (hour < 6 || hour > 20) {
        lightColor = new THREE.Color(0x1a1a4a);
      } else if (hour < 8 || hour > 18) {
        lightColor = new THREE.Color(0xff8c00);
      } else {
        lightColor = new THREE.Color(0xffffff);
      }
    }

    this.directionalLight.color.copy(lightColor);
    this.directionalLight.intensity = intensity;
    this.directionalLight.castShadow = intensity > 0.3;

    const angle = ((hour - 6) / 12) * Math.PI;
    const radius = 20;
    this.directionalLight.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius + 5,
      radius * 0.5
    );

    this.ambientLight.intensity = 0.2 + intensity * 0.3;
    this.ambientLight.color.copy(lightColor).lerp(new THREE.Color(0x444466), 0.5);
  }

  public setShowHeatmap(show: boolean): void {
    this.showHeatmap = show;
    if (show && !this.heatmapOverlay) {
      this.createHeatmapOverlay();
    }
    if (this.heatmapOverlay) {
      this.heatmapOverlay.visible = show;
    }
  }

  private createHeatmapOverlay(): void {
    this.heatmapTexture = new THREE.CanvasTexture(this.heatmapCanvas);
    this.heatmapTexture.needsUpdate = true;

    const geometry = new THREE.PlaneGeometry(GRID_SIZE * 2, GRID_SIZE * 2);
    const material = new THREE.MeshBasicMaterial({
      map: this.heatmapTexture,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });

    this.heatmapOverlay = new THREE.Mesh(geometry, material);
    this.heatmapOverlay.rotation.x = -Math.PI / 2;
    this.heatmapOverlay.position.y = 0.1;
    this.scene.add(this.heatmapOverlay);
  }

  private updateHeatmap(): void {
    if (!this.showHeatmap || !this.heatmapTexture) return;

    const ctx = this.heatmapCanvas.getContext('2d')!;
    const cellW = this.heatmapCanvas.width / GRID_SIZE;
    const cellH = this.heatmapCanvas.height / GRID_SIZE;
    const half = GRID_SIZE / 2;

    ctx.clearRect(0, 0, this.heatmapCanvas.width, this.heatmapCanvas.height);

    let maxDensity = 0;
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let z = 0; z < GRID_SIZE; z++) {
        const avg = this.totalFrames > 0 ? this.densityGrid[x][z] / this.totalFrames : 0;
        if (avg > maxDensity) maxDensity = avg;
      }
    }

    for (let x = 0; x < GRID_SIZE; x++) {
      for (let z = 0; z < GRID_SIZE; z++) {
        const avg = this.totalFrames > 0 ? this.densityGrid[x][z] / this.totalFrames : 0;
        const normalized = maxDensity > 0 ? Math.min(avg / maxDensity, 1) : 0;
        const alpha = normalized * 0.4;
        if (alpha > 0.02) {
          ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
          ctx.fillRect(x * cellW, z * cellH, cellW, cellH);
        }
      }
    }

    this.heatmapTexture.needsUpdate = true;
  }

  private updateVehicles(deltaTime: number): void {
    const half = GRID_SIZE / 2;

    this.vehicles.forEach((vehicle, idx) => {
      const path = vehicle.currentPath;

      if (vehicle.pathIndex >= path.length - 1) {
        vehicle.pathIndex = 0;
        vehicle.segmentProgress = 0;
      }

      const from = path[vehicle.pathIndex];
      const to = path[vehicle.pathIndex + 1] || path[0];
      const segmentLength = from.distanceTo(to);

      let shouldDecelerate = false;

      if (this.shouldStopAtLight(vehicle.mesh.position)) {
        shouldDecelerate = true;
      }

      this.vehicles.forEach((other, otherIdx) => {
        if (idx === otherIdx) return;
        const dist = vehicle.mesh.position.distanceTo(other.mesh.position);
        if (dist < MIN_GAP && dist > 0.1) {
          const forward = new THREE.Vector3().subVectors(to, from).normalize();
          const toOther = new THREE.Vector3().subVectors(other.mesh.position, vehicle.mesh.position);
          if (forward.dot(toOther) > 0) {
            shouldDecelerate = true;
          }
        }
      });

      let currentSpeed = shouldDecelerate
        ? vehicle.speed * DECELERATION_FACTOR
        : VEHICLE_SPEED;

      vehicle.speed = vehicle.speed + (currentSpeed - vehicle.speed) * 0.1;

      const moveDistance = vehicle.speed * deltaTime;
      vehicle.segmentProgress += moveDistance / Math.max(segmentLength, 0.01);

      while (vehicle.segmentProgress >= 1 && vehicle.pathIndex < path.length - 1) {
        vehicle.segmentProgress -= 1;
        vehicle.pathIndex++;

        if (this.isAtIntersection(path[vehicle.pathIndex])) {
          if (Math.random() < 0.15) {
            vehicle.currentPath = this.getTurnPath(vehicle);
            vehicle.pathIndex = 0;
            break;
          }
        }
      }

      const ci = Math.min(vehicle.pathIndex, path.length - 1);
      const ni = Math.min(vehicle.pathIndex + 1, path.length - 1);
      const cf = path[ci];
      const ct = path[ni];

      vehicle.mesh.position.lerpVectors(cf, ct, Math.min(vehicle.segmentProgress, 1));

      const dir = new THREE.Vector3().subVectors(ct, cf).normalize();
      if (dir.length() > 0.01) {
        vehicle.mesh.lookAt(vehicle.mesh.position.clone().add(dir));
      }

      const gridX = Math.floor(vehicle.mesh.position.x + half);
      const gridZ = Math.floor(vehicle.mesh.position.z + half);
      if (gridX >= 0 && gridX < GRID_SIZE && gridZ >= 0 && gridZ < GRID_SIZE) {
        this.densityGrid[gridX][gridZ]++;
      }
    });
  }

  private isAtIntersection(pos: THREE.Vector3): boolean {
    return Math.abs(pos.x) < 1.5 && Math.abs(pos.z) < 1.5;
  }

  private shouldStopAtLight(pos: THREE.Vector3): boolean {
    if (!this.isAtIntersection(pos)) return false;

    const isHorizontalGreen = this.frameCount % (TRAFFIC_LIGHT_CYCLE * 2) < TRAFFIC_LIGHT_CYCLE;
    const movingHorizontally = Math.abs(pos.x) > Math.abs(pos.z);

    return movingHorizontally ? !isHorizontalGreen : isHorizontalGreen;
  }

  private getTurnPath(vehicle: VehicleEntity): THREE.Vector3[] {
    const rand = Math.random();
    let turnDir: 'left' | 'straight' | 'right';
    if (rand < 0.4) turnDir = 'right';
    else if (rand < 0.75) turnDir = 'straight';
    else turnDir = 'left';

    if (turnDir === 'straight') {
      return vehicle.currentPath;
    }

    const currentIdx = this.roadSegments.findIndex(
      (seg) => seg.some((p) => p.distanceTo(vehicle.mesh.position) < 0.5)
    );

    if (currentIdx === -1) return vehicle.currentPath;

    let newSegmentIdx: number;
    if (turnDir === 'right') {
      newSegmentIdx = (currentIdx + 1) % 4;
    } else {
      newSegmentIdx = (currentIdx + 3) % 4;
    }

    return this.getFullPath(newSegmentIdx);
  }

  private updateTrafficLights(): void {
    const isHorizontalGreen = this.frameCount % (TRAFFIC_LIGHT_CYCLE * 2) < TRAFFIC_LIGHT_CYCLE;

    this.trafficLights.forEach((light) => {
      const mat = light.mesh.material as THREE.MeshStandardMaterial;
      const isGreen = light.isHorizontal ? isHorizontalGreen : !isHorizontalGreen;

      mat.color.setHex(isGreen ? 0x27ae60 : 0xe74c3c);
      mat.emissive.setHex(isGreen ? 0x27ae60 : 0xe74c3c);
    });
  }

  private updateBuildingAnimations(now: number): void {
    this.buildingAnimations = this.buildingAnimations.filter((anim) => {
      const elapsed = now - anim.startTime;
      const progress = Math.min(elapsed / anim.duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const scale = 0.5 + eased * 0.5;
      anim.mesh.scale.setScalar(scale);
      return progress < 1;
    });
  }

  private startAnimationLoop(): void {
    this.lastTime = performance.now();

    const animate = () => {
      this.animFrameId = requestAnimationFrame(animate);
      const now = performance.now();
      const deltaTime = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;

      this.frameCount++;
      this.totalFrames++;

      this.updateVehicles(deltaTime);
      this.updateTrafficLights();
      this.updateBuildingAnimations(now);

      if (this.frameCount % 5 === 0) {
        this.updateHeatmap();
      }

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  public dispose(): void {
    cancelAnimationFrame(this.animFrameId);
    this.renderer.domElement.removeEventListener('click', this.handleClick);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
