import * as THREE from 'three';
import SimplexNoise from 'simplex-noise';
import { Book } from './book';
import { SpiritManager } from './spirit';

export class World {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public books: Book[] = [];
  public spiritManager: SpiritManager;
  public clock: THREE.Clock;
  public raycaster: THREE.Raycaster;
  public mouse: THREE.Vector2;
  public counterElement: HTMLElement | null;

  private container: HTMLElement;
  private ambientParticles!: THREE.Points;
  private starfield!: THREE.Mesh;
  private platform!: THREE.Mesh;
  private pedestal!: THREE.Mesh;
  private noise2D: (x: number, y: number) => number = () => 0;
  private cameraTargetPos: THREE.Vector3;
  private cameraTargetLook: THREE.Vector3;
  private isCameraTweening: boolean = false;
  private cameraTweenProgress: number = 0;
  private cameraStartPos: THREE.Vector3;
  private cameraStartLook: THREE.Vector3;
  private lastFrameTime: number = 0;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) || document.body;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-10, -10);
    const simplex = new SimplexNoise();
    this.noise2D = (x: number, y: number) => simplex.noise2D(x, y);
    this.cameraStartPos = new THREE.Vector3();
    this.cameraStartLook = new THREE.Vector3();
    this.cameraTargetPos = new THREE.Vector3();
    this.cameraTargetLook = new THREE.Vector3();

    this.counterElement = document.getElementById('counter');

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 18);
    this.camera.lookAt(0, 1, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.spiritManager = new SpiritManager(this);

    this.setupBackground();
    this.setupLights();
    this.createPlatform();
    this.createAmbientParticles();
    this.createBooks();
    this.setupEventListeners();
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(0.5, '#050520');
    gradient.addColorStop(1, '#000510');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 300; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = Math.random() * 1.5 + 0.5;
      const alpha = Math.random() * 0.8 + 0.2;
      ctx.fillStyle = `rgba(255, 240, 200, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    this.scene.background = texture;

    const starGeo = new THREE.SphereGeometry(80, 32, 32);
    const starMat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.9
    });
    this.starfield = new THREE.Mesh(starGeo, starMat);
    this.scene.add(this.starfield);
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -15;
    dirLight.shadow.camera.right = 15;
    dirLight.shadow.camera.top = 15;
    dirLight.shadow.camera.bottom = -15;
    this.scene.add(dirLight);

    const pointLight1 = new THREE.PointLight(0xffffcc, 0.6, 30);
    pointLight1.position.set(0, 5, 0);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x6688ff, 0.3, 25);
    pointLight2.position.set(-8, 3, -8);
    this.scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0xff8844, 0.25, 25);
    pointLight3.position.set(8, 3, 8);
    this.scene.add(pointLight3);
  }

  private createPlatform(): void {
    const noiseScale = 15;
    const platformGeo = new THREE.CylinderGeometry(8, 8.5, 0.6, 64, 4);
    const positions = platformGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      if (y > 0) {
        const x = positions.getX(i);
        const z = positions.getZ(i);
        const noise = this.noise2D(x / noiseScale, z / noiseScale) * 0.08;
        positions.setY(i, y + noise);
      }
    }
    platformGeo.computeVertexNormals();

    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: false
    });
    this.platform = new THREE.Mesh(platformGeo, platformMat);
    this.platform.position.y = -0.3;
    this.platform.receiveShadow = true;
    this.scene.add(this.platform);

    const edgeGeo = new THREE.TorusGeometry(8.2, 0.12, 12, 64);
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0x554433,
      roughness: 0.7,
      metalness: 0.3,
      emissive: 0x221100,
      emissiveIntensity: 0.3
    });
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.rotation.x = Math.PI / 2;
    edge.position.y = 0.01;
    this.scene.add(edge);

    const pedestalGeo = new THREE.CylinderGeometry(0.8, 1.2, 0.4, 32);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x4a4a5a,
      roughness: 0.8,
      metalness: 0.2,
      emissive: 0x222244,
      emissiveIntensity: 0.15
    });
    this.pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    this.pedestal.position.y = 0.2;
    this.pedestal.castShadow = true;
    this.pedestal.receiveShadow = true;
    this.scene.add(this.pedestal);

    const runeRingGeo = new THREE.TorusGeometry(1.5, 0.03, 8, 48);
    const runeRingMat = new THREE.MeshBasicMaterial({
      color: 0x8866ff,
      transparent: true,
      opacity: 0.4
    });
    const runeRing = new THREE.Mesh(runeRingGeo, runeRingMat);
    runeRing.rotation.x = Math.PI / 2;
    runeRing.position.y = 0.42;
    this.scene.add(runeRing);
  }

  private createAmbientParticles(): void {
    const count = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 5 + Math.random() * 8;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.random() * 6 - 1;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.003,
        (Math.random() - 0.5) * 0.004,
        (Math.random() - 0.5) * 0.003
      ));
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(new Float32Array(count * 3), 3));

    const material = new THREE.PointsMaterial({
      color: 0xffeeaa,
      size: 0.08,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.ambientParticles = new THREE.Points(geometry, material);
    (this.ambientParticles as any).velocities = velocities;
    this.scene.add(this.ambientParticles);
  }

  private createBooks(): void {
    const bookCount = 20;
    const radius = 11;

    for (let i = 0; i < bookCount; i++) {
      const angle = (i / bookCount) * Math.PI * 2;
      const height = 1 + Math.random() * 1;
      const book = new Book(this, i, angle, radius, height);
      this.books.push(book);
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('click', (e) => this.onClick(e));
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.books.map(b => b.getClickableObject()),
      true
    );

    this.books.forEach(book => {
      const isHovered = intersects.length > 0 &&
        intersects[0].object === book.getClickableObject();
      book.setHovered(isHovered);
    });
  }

  private onClick(event: MouseEvent): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.books.map(b => b.getClickableObject()),
      true
    );

    if (intersects.length > 0) {
      const clickedObject = intersects[0].object;
      const book = this.books.find(b => b.getClickableObject() === clickedObject);
      if (book) {
        book.handleClick();
      }
    }
  }

  public tweenCameraTo(targetPos: THREE.Vector3, targetLook: THREE.Vector3, duration: number = 0.8): void {
    if (this.isCameraTweening) return;

    this.cameraStartPos.copy(this.camera.position);
    this.cameraStartLook.set(0, 1, 0);
    this.cameraTargetPos.copy(targetPos);
    this.cameraTargetLook.copy(targetLook);
    this.cameraTweenProgress = 0;
    this.isCameraTweening = true;
  }

  public resetCamera(): void {
    this.tweenCameraTo(new THREE.Vector3(0, 5, 18), new THREE.Vector3(0, 1, 0));
  }

  public updateCounter(): void {
    if (this.counterElement) {
      this.counterElement.textContent = `精灵苏醒: ${this.spiritManager.getSpiritCount()}/20`;
    }
  }

  public animate(): void {
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    if (this.isCameraTweening) {
      this.cameraTweenProgress += delta / 0.8;
      if (this.cameraTweenProgress >= 1) {
        this.cameraTweenProgress = 1;
        this.isCameraTweening = false;
      }
      const t = this.easeInOutCubic(this.cameraTweenProgress);
      this.camera.position.lerpVectors(this.cameraStartPos, this.cameraTargetPos, t);
      const lookAt = new THREE.Vector3().lerpVectors(this.cameraStartLook, this.cameraTargetLook, t);
      this.camera.lookAt(lookAt);
    }

    this.starfield.rotation.y = elapsed * 0.02;

    const ambientPositions = this.ambientParticles.geometry.attributes.position;
    const velocities = (this.ambientParticles as any).velocities as THREE.Vector3[];
    for (let i = 0; i < velocities.length; i++) {
      ambientPositions.setX(i, ambientPositions.getX(i) + velocities[i].x);
      ambientPositions.setY(i, ambientPositions.getY(i) + velocities[i].y + Math.sin(elapsed * 0.5 + i) * 0.001);
      ambientPositions.setZ(i, ambientPositions.getZ(i) + velocities[i].z);

      const dist = Math.sqrt(
        ambientPositions.getX(i) ** 2 +
        ambientPositions.getZ(i) ** 2
      );
      if (dist > 16 || dist < 3) {
        velocities[i].multiplyScalar(-1);
      }
      if (ambientPositions.getY(i) > 6 || ambientPositions.getY(i) < -2) {
        velocities[i].y *= -1;
      }
    }
    ambientPositions.needsUpdate = true;

    this.books.forEach(book => book.update(elapsed, delta));
    this.spiritManager.update(elapsed, delta);

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.animate());
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public start(): void {
    this.animate();
  }
}
