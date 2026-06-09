import * as THREE from 'three';

export interface LightConfig {
  color: number;
  intensity: number;
  position: THREE.Vector3;
  name: string;
}

export class DynamicLighting {
  public group: THREE.Group;
  public lights: {
    main: THREE.DirectionalLight;
    fill: THREE.DirectionalLight;
    back: THREE.DirectionalLight;
  };
  public controlPoints: {
    main: THREE.Mesh;
    fill: THREE.Mesh;
    back: THREE.Mesh;
  };
  public raycaster: THREE.Raycaster;
  public mouse: THREE.Vector2;
  private draggingPoint: THREE.Mesh | null = null;
  private dragPlane: THREE.Plane;
  private camera: THREE.Camera;
  private domElement: HTMLElement;

  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    this.group = new THREE.Group();
    this.camera = camera;
    this.domElement = domElement;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    this.lights = {
      main: this.createLight({
        color: 0xFFDD88,
        intensity: 1.5,
        position: new THREE.Vector3(-150, 150, 150),
        name: 'main'
      }),
      fill: this.createLight({
        color: 0x88AAFF,
        intensity: 0.8,
        position: new THREE.Vector3(150, -80, 150),
        name: 'fill'
      }),
      back: this.createLight({
        color: 0xFFFFFF,
        intensity: 0.5,
        position: new THREE.Vector3(0, 50, -200),
        name: 'back'
      })
    };

    this.controlPoints = {
      main: this.createControlPoint(0xFFDD88),
      fill: this.createControlPoint(0x88AAFF),
      back: this.createControlPoint(0xFFFFFF)
    };

    this.controlPoints.main.position.copy(this.lights.main.position);
    this.controlPoints.fill.position.copy(this.lights.fill.position);
    this.controlPoints.back.position.copy(this.lights.back.position);

    this.group.add(
      this.lights.main, this.lights.fill, this.lights.back,
      this.controlPoints.main, this.controlPoints.fill, this.controlPoints.back
    );

    this.setupInteraction();
  }

  private createLight(config: LightConfig): THREE.DirectionalLight {
    const light = new THREE.DirectionalLight(config.color, config.intensity);
    light.position.copy(config.position);
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 500;
    light.shadow.camera.left = -200;
    light.shadow.camera.right = 200;
    light.shadow.camera.top = 200;
    light.shadow.camera.bottom = -200;
    light.shadow.bias = -0.0005;
    light.name = config.name;
    return light;
  }

  private createControlPoint(color: number): THREE.Mesh {
    const geo = new THREE.SphereGeometry(10, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
    const mesh = new THREE.Mesh(geo, mat);
    return mesh;
  }

  private setupInteraction(): void {
    const dom = this.domElement;

    dom.addEventListener('pointerdown', (e: PointerEvent) => this.onPointerDown(e));
    dom.addEventListener('pointermove', (e: PointerEvent) => this.onPointerMove(e));
    dom.addEventListener('pointerup', () => this.onPointerUp());
    dom.addEventListener('pointerleave', () => this.onPointerUp());
  }

  private updateMouse(e: PointerEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onPointerDown(e: PointerEvent): void {
    this.updateMouse(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects([
      this.controlPoints.main,
      this.controlPoints.fill,
      this.controlPoints.back
    ]);

    if (intersects.length > 0) {
      this.draggingPoint = intersects[0].object as THREE.Mesh;
      const normal = new THREE.Vector3();
      this.camera.getWorldDirection(normal);
      this.dragPlane.setFromNormalAndCoplanarPoint(
        normal.negate(),
        this.draggingPoint.position
      );
      this.domElement.style.cursor = 'grabbing';
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.draggingPoint) {
      this.updateMouse(e);
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects([
        this.controlPoints.main,
        this.controlPoints.fill,
        this.controlPoints.back
      ]);
      this.domElement.style.cursor = intersects.length > 0 ? 'grab' : 'default';
      return;
    }

    this.updateMouse(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.dragPlane, intersection);

    if (intersection) {
      this.draggingPoint.position.copy(intersection);
      this.syncLightToControlPoint(this.draggingPoint);
    }
  }

  private onPointerUp(): void {
    if (this.draggingPoint) {
      this.draggingPoint = null;
      this.domElement.style.cursor = 'default';
    }
  }

  private syncLightToControlPoint(point: THREE.Mesh): void {
    if (point === this.controlPoints.main) {
      this.lights.main.position.copy(point.position);
    } else if (point === this.controlPoints.fill) {
      this.lights.fill.position.copy(point.position);
    } else if (point === this.controlPoints.back) {
      this.lights.back.position.copy(point.position);
    }
  }

  public setMainIntensity(value: number): void {
    this.lights.main.intensity = value;
  }

  public setFillIntensity(value: number): void {
    this.lights.fill.intensity = value * 0.53;
  }

  public setBackIntensity(value: number): void {
    this.lights.back.intensity = value * 0.33;
  }

  public setAllIntensities(multiplier: number): void {
    this.setMainIntensity(1.5 * multiplier);
    this.setFillIntensity(0.8 * multiplier * 1.887);
    this.setBackIntensity(0.5 * multiplier * 3.03);
  }

  public setShadowsEnabled(enabled: boolean): void {
    this.lights.main.castShadow = enabled;
    this.lights.fill.castShadow = enabled;
    this.lights.back.castShadow = enabled;
  }
}
