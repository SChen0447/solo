import * as THREE from 'three';

export interface StarConfig {
  radius: number;
  color: number;
  position: THREE.Vector3;
}

export class SceneManager {
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly renderer: THREE.WebGLRenderer;

  private stars: THREE.Mesh[] = [];
  private particleSystems: THREE.Points[] = [];
  private diskMeshes: THREE.Mesh[] = [];
  private ambientLight: THREE.AmbientLight | null = null;
  private pointLights: THREE.PointLight[] = [];

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 8);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.shadowMap.enabled = false;
    container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.setupResizeHandler(container);
  }

  private setupLights(): void {
    this.ambientLight = new THREE.AmbientLight(0x222233, 0.5);
    this.scene.add(this.ambientLight);

    const starLight1 = new THREE.PointLight(0xffaa00, 2.0, 20);
    starLight1.position.set(0, 0, 0);
    this.scene.add(starLight1);
    this.pointLights.push(starLight1);

    const starLight2 = new THREE.PointLight(0xffffff, 1.5, 20);
    starLight2.position.set(4, 0, 0);
    this.scene.add(starLight2);
    this.pointLights.push(starLight2);
  }

  private setupResizeHandler(container: HTMLElement): void {
    window.addEventListener('resize', () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    });
  }

  public addStar(config: StarConfig): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(config.radius, 48, 48);
    const material = new THREE.MeshBasicMaterial({
      color: config.color
    });
    const star = new THREE.Mesh(geometry, material);
    star.position.copy(config.position);
    this.scene.add(star);
    this.stars.push(star);
    return star;
  }

  public addDiskLine(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);
    this.diskMeshes.push(mesh);
    return mesh;
  }

  public addParticleStream(geometry: THREE.BufferGeometry, material: THREE.PointsMaterial): THREE.Points {
    const points = new THREE.Points(geometry, material);
    this.scene.add(points);
    this.particleSystems.push(points);
    return points;
  }

  public addObject(obj: THREE.Object3D): void {
    this.scene.add(obj);
  }

  public removeObject(obj: THREE.Object3D): void {
    this.scene.remove(obj);
  }

  public updateLightPosition(index: number, position: THREE.Vector3): void {
    if (this.pointLights[index]) {
      this.pointLights[index].position.copy(position);
    }
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.stars.forEach(star => {
      star.geometry.dispose();
      (star.material as THREE.Material).dispose();
    });
    this.particleSystems.forEach(ps => {
      ps.geometry.dispose();
      (ps.material as THREE.Material).dispose();
    });
    this.diskMeshes.forEach(mesh => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    this.renderer.dispose();
  }
}
