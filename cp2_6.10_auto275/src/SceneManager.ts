import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  public soilMesh: THREE.Mesh;
  public soilMaterial: THREE.MeshPhongMaterial;
  public surfaceGroup: THREE.Group;

  private container: HTMLElement;
  private defaultCameraPosition: THREE.Vector3;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.scene.fog = new THREE.FogExp2(0x2a1a0a, 0.03);

    const { clientWidth: width, clientHeight: height } = container;
    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    this.defaultCameraPosition = new THREE.Vector3(0, 6, 10);
    this.camera.position.copy(this.defaultCameraPosition);
    this.camera.lookAt(0, -1.5, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 30;
    this.controls.target.set(0, -1.5, 0);

    this._setupLights();
    this.soilMesh = this._createSoil();
    this.soilMaterial = this.soilMesh.material as THREE.MeshPhongMaterial;
    this.surfaceGroup = this._createSurfaceDecorations();
    this.scene.add(this.surfaceGroup);

    window.addEventListener('resize', this._onResize.bind(this));
  }

  private _setupLights(): void {
    const ambient = new THREE.AmbientLight(0x4a3a2a, 0.6);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xfff5e6, 0.9);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -8;
    dirLight.shadow.camera.right = 8;
    dirLight.shadow.camera.top = 8;
    dirLight.shadow.camera.bottom = -8;
    this.scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xa5d6a7, 0.4, 15);
    pointLight.position.set(0, -2, 0);
    this.scene.add(pointLight);
  }

  private _createSoil(): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(8, 5, 8, 32, 20, 32);
    const positions = geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    const topColor = new THREE.Color(0x5c4033);
    const bottomColor = new THREE.Color(0x3e2723);

    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const t = (y + 2.5) / 5;
      const color = topColor.clone().lerp(bottomColor, 1 - t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      shininess: 5
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = -2.5;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({ color: 0x2a1a0a, transparent: true, opacity: 0.3 })
    );
    edges.position.y = -2.5;
    this.scene.add(edges);

    return mesh;
  }

  private _createSurfaceDecorations(): THREE.Group {
    const group = new THREE.Group();
    const grassColors = [0x66bb6a, 0x81c784, 0xa5d6a7, 0x4caf50];

    for (let i = 0; i < 60; i++) {
      const x = (Math.random() - 0.5) * 7;
      const z = (Math.random() - 0.5) * 7;
      const height = 0.08 + Math.random() * 0.25;
      const color = grassColors[Math.floor(Math.random() * grassColors.length)];

      const bladeGeo = new THREE.ConeGeometry(0.015, height, 4);
      const bladeMat = new THREE.MeshLambertMaterial({ color });
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.set(x, height / 2, z);
      blade.rotation.z = (Math.random() - 0.5) * 0.4;
      blade.rotation.x = (Math.random() - 0.5) * 0.4;
      group.add(blade);
    }

    return group;
  }

  public setSoilOpacity(opacity: number): void {
    this.soilMaterial.opacity = Math.max(0, Math.min(1, opacity));
    this.soilMaterial.transparent = opacity < 1;
    this.soilMaterial.needsUpdate = true;
  }

  public resetCamera(): void {
    this.camera.position.copy(this.defaultCameraPosition);
    this.controls.target.set(0, -1.5, 0);
    this.controls.update();
  }

  private _onResize(): void {
    const { clientWidth: width, clientHeight: height } = this.container;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public render(): void {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    window.removeEventListener('resize', this._onResize.bind(this));
    this.renderer.dispose();
    this.controls.dispose();
  }
}
