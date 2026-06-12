import * as THREE from 'three';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public ambientLight: THREE.AmbientLight;
  public directionalLight: THREE.DirectionalLight;
  public gridHelper: THREE.GridHelper;
  private container: HTMLElement;
  private targetAmbientIntensity: number = 1;
  private currentAmbientIntensity: number = 1;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) || document.body;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2a2a2a);
    this.scene.fog = new THREE.Fog(0x2a2a2a, 20, 80);

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(5, 4, 8);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 1);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.directionalLight.position.set(10, 15, 8);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.camera.left = -20;
    this.directionalLight.shadow.camera.right = 20;
    this.directionalLight.shadow.camera.top = 20;
    this.directionalLight.shadow.camera.bottom = -20;
    this.directionalLight.shadow.bias = -0.0005;
    this.scene.add(this.directionalLight);

    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.3);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);

    this.gridHelper = new THREE.GridHelper(40, 40, 0x3b82f6, 0x3b82f6);
    this.gridHelper.material.transparent = true;
    this.gridHelper.material.opacity = 0.3;
    this.gridHelper.visible = false;
    this.scene.add(this.gridHelper);

    const floorGeometry = new THREE.PlaneGeometry(40, 40);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a,
      roughness: 0.8,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public addModel(mesh: THREE.Object3D): void {
    this.scene.add(mesh);
  }

  public removeModel(mesh: THREE.Object3D): void {
    this.scene.remove(mesh);
    if (mesh instanceof THREE.Group) {
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
  }

  public setAmbientIntensity(value: number): void {
    this.targetAmbientIntensity = value;
  }

  public update(dt: number): void {
    if (Math.abs(this.currentAmbientIntensity - this.targetAmbientIntensity) > 0.001) {
      const diff = this.targetAmbientIntensity - this.currentAmbientIntensity;
      const step = diff * (dt / 0.3);
      if (Math.abs(step) > Math.abs(diff)) {
        this.currentAmbientIntensity = this.targetAmbientIntensity;
      } else {
        this.currentAmbientIntensity += step;
      }
      this.ambientLight.intensity = this.currentAmbientIntensity;
      this.directionalLight.intensity = 1.2 * this.currentAmbientIntensity;
    }
  }

  public showGrid(show: boolean): void {
    this.gridHelper.visible = show;
  }

  public takeScreenshot(): string {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
