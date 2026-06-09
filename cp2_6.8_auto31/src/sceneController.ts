import * as THREE from 'three';

export class SceneController {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private sphere: THREE.Mesh;
  private sphereRadius: number = 2;

  private cameraDistance: number = 6;
  private cameraTheta: number = 0;
  private cameraPhi: number = Math.PI / 3;
  private minPhi: number = 0.1;
  private maxPhi: number = Math.PI - 0.1;

  private isDragging: boolean = false;
  private prevMouseX: number = 0;
  private prevMouseY: number = 0;
  private rotationSpeed: number = 0.005;
  private zoomSpeed: number = 0.001;

  private trajectoryGroup: THREE.Group;

  private animationId: number | null = null;
  private onFrameCallback: (() => void) | null = null;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    this.trajectoryGroup = new THREE.Group();
    this.scene.add(this.trajectoryGroup);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupLighting();
    this.createSphere();
    this.updateCameraPosition();
    this.setupResizeHandler();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0x00d2ff, 0.5, 20);
    pointLight1.position.set(-3, 2, 3);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x3a7bd5, 0.5, 20);
    pointLight2.position.set(3, -2, -3);
    this.scene.add(pointLight2);
  }

  private createSphere(): void {
    const geometry = new THREE.SphereGeometry(this.sphereRadius, 64, 64);
    const material = new THREE.MeshPhongMaterial({
      color: 0x1a1a3e,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      shininess: 100,
    });
    this.sphere = new THREE.Mesh(geometry, material);
    this.scene.add(this.sphere);

    const wireframeGeometry = new THREE.SphereGeometry(this.sphereRadius * 1.001, 32, 32);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x3a7bd5,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
    this.scene.add(wireframe);
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    const y = this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    });
  }

  public startAnimationLoop(onFrame?: () => void): void {
    this.onFrameCallback = onFrame || null;
    this.animate();
  }

  public stopAnimationLoop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    if (this.onFrameCallback) {
      this.onFrameCallback();
    }

    this.renderer.render(this.scene, this.camera);
  };

  public getSphereRadius(): number {
    return this.sphereRadius;
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getTrajectoryGroup(): THREE.Group {
    return this.trajectoryGroup;
  }

  public getRendererDomElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  public screenToSphere(screenX: number, screenY: number): THREE.Vector3 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((screenX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((screenY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const sphereCenter = new THREE.Vector3(0, 0, 0);
    const direction = new THREE.Vector3();
    this.raycaster.ray.direction.normalize();

    const oc = new THREE.Vector3().subVectors(this.raycaster.ray.origin, sphereCenter);
    const a = direction.dot(direction);
    const b = 2 * oc.dot(direction);
    const c = oc.dot(oc) - this.sphereRadius * this.sphereRadius;

    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) {
      return null;
    }

    const t = (-b - Math.sqrt(discriminant)) / (2 * a);

    if (t < 0) {
      return null;
    }

    const point = new THREE.Vector3().copy(this.raycaster.ray.origin);
    point.add(direction.multiplyScalar(t));
    return point;
  }

  public startRotation(x: number, y: number): void {
    this.isDragging = true;
    this.prevMouseX = x;
    this.prevMouseY = y;
  }

  public updateRotation(x: number, y: number): void {
    if (!this.isDragging) return;

    const deltaX = x - this.prevMouseX;
    const deltaY = y - this.prevMouseY;

    this.cameraTheta -= deltaX * this.rotationSpeed;
    this.cameraPhi -= deltaY * this.rotationSpeed;

    this.cameraPhi = Math.max(this.minPhi, Math.min(this.maxPhi, this.cameraPhi));

    this.updateCameraPosition();

    this.prevMouseX = x;
    this.prevMouseY = y;
  }

  public endRotation(): void {
    this.isDragging = false;
  }

  public handleZoom(deltaY: number): void {
    this.cameraDistance += deltaY * this.zoomSpeed * this.cameraDistance;
    this.cameraDistance = Math.max(3, Math.min(15, this.cameraDistance));
    this.updateCameraPosition();
  }

  public addTrajectoryLine(object: THREE.Object3D): void {
    this.trajectoryGroup.add(object);
  }

  public removeTrajectoryLine(object: THREE.Object3D): void {
    this.trajectoryGroup.remove(object);
  }

  public clearAllTrajectories(): void {
    while (this.trajectoryGroup.children.length > 0) {
      const child = this.trajectoryGroup.children[0];
      this.trajectoryGroup.remove(child);
    }
  }

  public getCanvasRect(): DOMRect {
    return this.renderer.domElement.getBoundingClientRect();
  }

  public dispose(): void {
    this.stopAnimationLoop();
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
