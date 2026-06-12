import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface PalaceObject extends THREE.Group {
  userData: {
    id: string;
    type: string;
    baseScale: THREE.Vector3;
    targetPosition: THREE.Vector3;
    targetRotation: number;
    targetScale: number;
    springVelocity: THREE.Vector3;
    tagId?: string;
  };
}

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  public ground: THREE.Mesh;
  public objects: Map<string, PalaceObject> = new Map();

  private container: HTMLElement;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private groundPlane: THREE.Plane;
  private clock: THREE.Clock;
  private animationFrameId: number | null = null;
  private onFrameCallback?: () => void;

  private readonly PALACE_SIZE = { width: 20, depth: 20, height: 10 };
  private readonly DAMPING = 0.15;
  private readonly SPRING = 0.3;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 30, 60);

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 8, 15);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = this.DAMPING;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 35;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    this.ground = this.createGround();
    this.createWalls();
    this.createCeiling();
    this.createLights();

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private createGround(): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createLinearGradient(0, 0, 512, 512);
    gradient.addColorStop(0, '#d0d0d0');
    gradient.addColorStop(0.3, '#e8e8e8');
    gradient.addColorStop(0.5, '#c8c8c8');
    gradient.addColorStop(0.7, '#e0e0e0');
    gradient.addColorStop(1, '#d0d0d0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 50; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = Math.random() * 30 + 10;
      ctx.fillStyle = `rgba(180, 180, 180, ${Math.random() * 0.3})`;
      ctx.beginPath();
      ctx.ellipse(x, y, size, size * 0.5, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);

    const geometry = new THREE.PlaneGeometry(this.PALACE_SIZE.width, this.PALACE_SIZE.depth);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.8,
      metalness: 0.1
    });

    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'ground';
    this.scene.add(ground);

    const gridHelper = new THREE.GridHelper(
      this.PALACE_SIZE.width,
      20,
      0x4FC3F7,
      0x4FC3F7
    );
    gridHelper.position.y = 0.01;
    (gridHelper.material as THREE.Material).opacity = 0.1;
    (gridHelper.material as THREE.Material).transparent = true;
    this.scene.add(gridHelper);

    return ground;
  }

  private createWalls(): void {
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xF5F0E1,
      roughness: 0.9,
      metalness: 0.05
    });

    const { width, depth, height } = this.PALACE_SIZE;

    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      wallMaterial
    );
    backWall.position.set(0, height / 2, -depth / 2);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    const frontWall = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      wallMaterial
    );
    frontWall.position.set(0, height / 2, depth / 2);
    frontWall.rotation.y = Math.PI;
    frontWall.receiveShadow = true;
    this.scene.add(frontWall);

    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(depth, height),
      wallMaterial
    );
    leftWall.position.set(-width / 2, height / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(depth, height),
      wallMaterial
    );
    rightWall.position.set(width / 2, height / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);
  }

  private createCeiling(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, '#FFF8E7');
    gradient.addColorStop(0.5, '#F5F0E1');
    gradient.addColorStop(1, '#E8E0D0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);

    const ceilingGeometry = new THREE.PlaneGeometry(
      this.PALACE_SIZE.width,
      this.PALACE_SIZE.depth
    );
    const ceilingMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      emissive: 0xFFF8E7,
      emissiveIntensity: 0.15,
      side: THREE.DoubleSide
    });

    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.position.y = this.PALACE_SIZE.height;
    ceiling.rotation.x = Math.PI / 2;
    this.scene.add(ceiling);
  }

  private createLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(5, 12, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -15;
    mainLight.shadow.camera.right = 15;
    mainLight.shadow.camera.top = 15;
    mainLight.shadow.camera.bottom = -15;
    mainLight.shadow.bias = -0.0001;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xE8F4FF, 0.3);
    fillLight.position.set(-8, 6, -5);
    this.scene.add(fillLight);

    const ceilingLight = new THREE.PointLight(0xFFF8E7, 0.6, 30);
    ceilingLight.position.set(0, this.PALACE_SIZE.height - 1, 0);
    this.scene.add(ceilingLight);

    const rimLight = new THREE.PointLight(0xE8F4FF, 0.3, 20);
    rimLight.position.set(-8, 8, 8);
    this.scene.add(rimLight);
  }

  public addObject(object: PalaceObject): void {
    this.objects.set(object.userData.id, object);
    this.scene.add(object);
  }

  public removeObject(id: string): void {
    const object = this.objects.get(id);
    if (object) {
      this.scene.remove(object);
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      this.objects.delete(id);
    }
  }

  public getObjectById(id: string): PalaceObject | undefined {
    return this.objects.get(id);
  }

  public getAllObjects(): PalaceObject[] {
    return Array.from(this.objects.values());
  }

  public clearAllObjects(): void {
    Array.from(this.objects.keys()).forEach(id => this.removeObject(id));
  }

  public getGroundIntersection(clientX: number, clientY: number): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.groundPlane, intersection);
    return intersection;
  }

  public getObjectIntersection(clientX: number, clientY: number): PalaceObject | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      Array.from(this.objects.values()),
      true
    );

    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && !obj.userData.id) {
        obj = obj.parent;
      }
      return obj as PalaceObject || null;
    }
    return null;
  }

  public createSelectionBox(object: PalaceObject): THREE.LineSegments {
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      linewidth: 1
    });

    const line = new THREE.LineSegments(edges, material);
    line.position.copy(center);
    line.userData.isSelectionBox = true;
    return line;
  }

  public createProjectionOutline(size: THREE.Vector3, color: number = 0x4FC3F7): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(size.x, size.z);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const outline = new THREE.Mesh(geometry, material);
    outline.rotation.x = -Math.PI / 2;
    outline.position.y = 0.02;
    outline.userData.isProjection = true;
    return outline;
  }

  public updateObjectPhysics(object: PalaceObject, deltaTime: number): void {
    const { targetPosition, targetRotation, targetScale, springVelocity, baseScale } = object.userData;
    const dt = Math.min(deltaTime, 0.1);

    const damping = Math.pow(this.DAMPING, dt * 60);
    const springForce = this.SPRING * dt * 60;

    springVelocity.x = springVelocity.x * damping + (targetPosition.x - object.position.x) * springForce;
    springVelocity.y = springVelocity.y * damping + (targetPosition.y - object.position.y) * springForce;
    springVelocity.z = springVelocity.z * damping + (targetPosition.z - object.position.z) * springForce;

    object.position.add(springVelocity.clone().multiplyScalar(dt * 60));

    const currentRot = object.rotation.y;
    let rotDiff = targetRotation - currentRot;
    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
    object.rotation.y += rotDiff * springForce * 0.1;

    const currentScale = object.scale.x;
    const scaleDiff = targetScale - currentScale;
    const newScale = currentScale + scaleDiff * springForce * 0.1;
    object.scale.set(
      baseScale.x * newScale,
      baseScale.y * newScale,
      baseScale.z * newScale
    );
  }

  public startAnimation(callback?: () => void):