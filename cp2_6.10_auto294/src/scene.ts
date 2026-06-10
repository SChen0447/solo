import * as THREE from 'three';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private animationCallbacks: Array<(delta: number) => void> = [];
  private clock: THREE.Clock;
  private isDragging = false;
  private previousMousePosition = { x: 0, y: 0 };
  private cameraAngle = { theta: 0, phi: Math.PI / 3.5 };
  private cameraDistance = 18;
  private cameraTarget = new THREE.Vector3(0, 0.5, 0);

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) as HTMLElement;
    if (!this.container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x3e2723);
    this.scene.fog = new THREE.Fog(0x3e2723, 25, 50);

    this.clock = new THREE.Clock();

    this.camera = new THREE.PerspectiveCamera(
      45,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      100
    );
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.setupGround();
    this.setupEventListeners();
    this.startRenderLoop();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xfff0e0, 0.5);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xfff5e1, 1.2);
    mainLight.position.set(-8, 12, 6);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -15;
    mainLight.shadow.camera.right = 15;
    mainLight.shadow.camera.top = 15;
    mainLight.shadow.camera.bottom = -15;
    mainLight.shadow.bias = -0.0005;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffd4a3, 0.4);
    fillLight.position.set(6, 4, -4);
    this.scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xffb300, 0.3, 30);
    rimLight.position.set(0, 8, -8);
    this.scene.add(rimLight);
  }

  private setupGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(60, 60);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x3e2723,
      roughness: 0.9,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const woodGeometry = new THREE.BoxGeometry(16, 0.3, 12);
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0x5d4037,
      roughness: 0.8,
      metalness: 0.1,
    });
    const woodBase = new THREE.Mesh(woodGeometry, woodMaterial);
    woodBase.position.y = -1.85;
    woodBase.receiveShadow = true;
    woodBase.castShadow = true;
    this.scene.add(woodBase);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));

    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      canvas.style.cursor = 'grab';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.cameraAngle.theta -= deltaX * 0.005;
      this.cameraAngle.phi = Math.max(
        Math.PI / 6,
        Math.min(Math.PI / 2.2, this.cameraAngle.phi - deltaY * 0.005)
      );

      this.updateCameraPosition();
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    canvas.style.cursor = 'grab';

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraDistance = Math.max(
        10,
        Math.min(30, this.cameraDistance + e.deltaY * 0.02)
      );
      this.updateCameraPosition();
    }, { passive: false });
  }

  private updateCameraPosition(): void {
    const x =
      this.cameraTarget.x +
      this.cameraDistance *
        Math.sin(this.cameraAngle.phi) *
        Math.sin(this.cameraAngle.theta);
    const y = this.cameraTarget.y + this.cameraDistance * Math.cos(this.cameraAngle.phi);
    const z =
      this.cameraTarget.z +
      this.cameraDistance *
        Math.sin(this.cameraAngle.phi) *
        Math.cos(this.cameraAngle.theta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  private onWindowResize(): void {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  private startRenderLoop(): void {
    const animate = () => {
      requestAnimationFrame(animate);
      const delta = this.clock.getDelta();

      for (const callback of this.animationCallbacks) {
        callback(delta);
      }

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  public addObject(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  public removeObject(object: THREE.Object3D): void {
    this.scene.remove(object);
  }

  public onAnimationFrame(callback: (delta: number) => void): void {
    this.animationCallbacks.push(callback);
  }

  public dispose(): void {
    this.renderer.dispose();
    this.animationCallbacks = [];
  }
}
