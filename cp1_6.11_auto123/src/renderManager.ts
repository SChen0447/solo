import * as THREE from 'three';

export interface RenderManagerOptions {
  container: HTMLElement;
  particleCount: number;
}

export class RenderManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public particleMesh: THREE.InstancedMesh;
  public magnet: THREE.Group;
  public dish: THREE.Mesh;
  public container: HTMLElement;

  private dummy: THREE.Object3D;
  private particleCount: number;

  constructor(options: RenderManagerOptions) {
    this.container = options.container;
    this.particleCount = options.particleCount;
    this.dummy = new THREE.Object3D();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.createLights();
    this.createTable();
    this.dish = this.createDish();
    this.particleMesh = this.createParticles(options.particleCount);
    this.magnet = this.createMagnet();

    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d0d14);
    scene.fog = new THREE.FogExp2(0x0d0d14, 0.02);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      45,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 6, 10);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const domeLight = new THREE.HemisphereLight(0x505080, 0x1a1a2a, 0.8);
    this.scene.add(domeLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -10;
    mainLight.shadow.camera.right = 10;
    mainLight.shadow.camera.top = 10;
    mainLight.shadow.camera.bottom = -10;
    mainLight.shadow.bias = -0.0001;
    this.scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0x6688ff, 0.4);
    rimLight.position.set(-5, 3, -5);
    this.scene.add(rimLight);

    const fillLight = new THREE.PointLight(0x00ff88, 0.3, 20);
    fillLight.position.set(-3, 2, 3);
    this.scene.add(fillLight);
  }

  private createTable(): void {
    const tableSize = 20;
    const tableGeo = new THREE.PlaneGeometry(tableSize, tableSize);

    const tableCanvas = document.createElement('canvas');
    tableCanvas.width = 512;
    tableCanvas.height = 512;
    const ctx = tableCanvas.getContext('2d')!;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 80; i++) {
      const y = Math.random() * 512;
      const alpha = 0.02 + Math.random() * 0.05;
      ctx.strokeStyle = `rgba(60, 40, 20, ${alpha})`;
      ctx.lineWidth = 0.5 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < 512; x += 20) {
        ctx.lineTo(x, y + (Math.random() - 0.5) * 8);
      }
      ctx.stroke();
    }

    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const alpha = Math.random() * 0.08;
      ctx.fillStyle = `rgba(80, 60, 40, ${alpha})`;
      ctx.fillRect(x, y, 1, 1);
    }

    const tableTexture = new THREE.CanvasTexture(tableCanvas);
    tableTexture.wrapS = THREE.RepeatWrapping;
    tableTexture.wrapT = THREE.RepeatWrapping;
    tableTexture.repeat.set(4, 4);
    tableTexture.colorSpace = THREE.SRGBColorSpace;

    const tableMat = new THREE.MeshStandardMaterial({
      map: tableTexture,
      color: 0x1a1a1a,
      roughness: 0.85,
      metalness: 0.1
    });

    const table = new THREE.Mesh(tableGeo, tableMat);
    table.rotation.x = -Math.PI / 2;
    table.position.y = -0.11;
    table.receiveShadow = true;
    this.scene.add(table);
  }

  private createDish(): THREE.Mesh {
    const dishGroup = new THREE.Group();

    const dishRadius = 4;
    const dishHeight = 0.2;
    const wallThickness = 0.1;

    const dishGeo = new THREE.CylinderGeometry(
      dishRadius,
      dishRadius - 0.2,
      dishHeight,
      64,
      1,
      false
    );

    const dishCanvas = document.createElement('canvas');
    dishCanvas.width = 256;
    dishCanvas.height = 256;
    const dctx = dishCanvas.getContext('2d')!;
    dctx.fillStyle = 'rgba(255,255,255,0.02)';
    dctx.fillRect(0, 0, 256, 256);
    dctx.strokeStyle = 'rgba(200,230,255,0.15)';
    dctx.lineWidth = 0.5;
    const gridSize = 16;
    for (let i = 0; i <= 256; i += gridSize) {
      dctx.beginPath();
      dctx.moveTo(i, 0);
      dctx.lineTo(i, 256);
      dctx.stroke();
      dctx.beginPath();
      dctx.moveTo(0, i);
      dctx.lineTo(256, i);
      dctx.stroke();
    }
    const gridTexture = new THREE.CanvasTexture(dishCanvas);
    gridTexture.wrapS = THREE.RepeatWrapping;
    gridTexture.wrapT = THREE.RepeatWrapping;
    gridTexture.repeat.set(3, 3);

    const dishMat = new THREE.MeshPhysicalMaterial({
      color: 0xccf0ff,
      transparent: true,
      opacity: 0.25,
      roughness: 0.05,
      metalness: 0.0,
      transmission: 0.85,
      ior: 1.3,
      thickness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.0,
      map: gridTexture
    });

    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.position.y = 0;
    dish.receiveShadow = true;
    dish.castShadow = true;
    this.scene.add(dish);

    const wallGeo = new THREE.TorusGeometry(dishRadius - wallThickness / 2, wallThickness, 16, 64);
    const wallMat = new THREE.MeshPhysicalMaterial({
      color: 0xaaddff,
      transparent: true,
      opacity: 0.35,
      roughness: 0.05,
      metalness: 0.0,
      transmission: 0.7,
      ior: 1.3,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05
    });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.rotation.x = Math.PI / 2;
    wall.position.y = dishHeight / 2;
    this.scene.add(wall);

    const bottomGeo = new THREE.CircleGeometry(dishRadius - 0.1, 64);
    const bottomMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0f,
      roughness: 0.3,
      metalness: 0.2
    });
    const bottom = new THREE.Mesh(bottomGeo, bottomMat);
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.y = -dishHeight / 2 + 0.001;
    bottom.receiveShadow = true;
    this.scene.add(bottom);

    return dish;
  }

  private createParticles(count: number): THREE.InstancedMesh {
    const particleGeo = new THREE.SphereGeometry(1, 16, 12);
    const particleMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 0.3,
      metalness: 0.9,
      envMapIntensity: 1.5
    });

    const instancedMesh = new THREE.InstancedMesh(particleGeo, particleMat, count);
    instancedMesh.castShadow = true;
    instancedMesh.receiveShadow = true;
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const baseScale = 0.08;
    for (let i = 0; i < count; i++) {
      this.dummy.position.set(0, -10, 0);
      this.dummy.scale.setScalar(baseScale);
      this.dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, this.dummy.matrix);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;

    this.scene.add(instancedMesh);
    return instancedMesh;
  }

  private createMagnet(): THREE.Group {
    const group = new THREE.Group();

    const radius = 0.3;
    const height = 0.6;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 0, 64);
    gradient.addColorStop(0, '#ff3366');
    gradient.addColorStop(0.5, '#ff66aa');
    gradient.addColorStop(0.5, '#6688ff');
    gradient.addColorStop(1, '#3366ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 64);

    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 64;
      const alpha = Math.random() * 0.3;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(x, y, 1, 1);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const bodyGeo = new THREE.CylinderGeometry(radius, radius, height, 32);
    const bodyMat = new THREE.MeshStandardMaterial({
      map: texture,
      metalness: 0.8,
      roughness: 0.25
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const capGeo = new THREE.CylinderGeometry(radius * 1.02, radius * 1.02, 0.05, 32);
    const capMatN = new THREE.MeshStandardMaterial({
      color: 0xff3366,
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0xff3366,
      emissiveIntensity: 0.2
    });
    const capN = new THREE.Mesh(capGeo, capMatN);
    capN.position.y = height / 2 + 0.02;
    capN.castShadow = true;
    group.add(capN);

    const capMatS = new THREE.MeshStandardMaterial({
      color: 0x3366ff,
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0x3366ff,
      emissiveIntensity: 0.2
    });
    const capS = new THREE.Mesh(capGeo, capMatS);
    capS.position.y = -height / 2 - 0.02;
    capS.castShadow = true;
    group.add(capS);

    const glowNMat = new THREE.MeshBasicMaterial({
      color: 0xff3366,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide
    });
    const glowN = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.8, 16, 16), glowNMat);
    glowN.position.y = height / 2 + radius;
    glowN.scale.set(1, 0.5, 1);
    group.add(glowN);

    const glowSMat = new THREE.MeshBasicMaterial({
      color: 0x3366ff,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide
    });
    const glowS = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.8, 16, 16), glowSMat);
    glowS.position.y = -height / 2 - radius;
    glowS.scale.set(1, 0.5, 1);
    group.add(glowS);

    group.position.set(3, 1.5, 3);
    this.scene.add(group);

    return group;
  }

  public setParticlePositions(
    positions: Float32Array,
    scales?: Float32Array
  ): void {
    const count = Math.min(this.particleCount, positions.length / 3);
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      this.dummy.position.set(
        positions[ix],
        positions[ix + 1],
        positions[ix + 2]
      );
      const s = scales ? scales[i] : 1.0;
      this.dummy.scale.setScalar(s);
      this.dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
  }

  public setMagnetPosition(x: number, y: number, z: number): void {
    this.magnet.position.set(x, y, z);
  }

  public setMagnetPolarity(isSwapped: boolean): void {
    this.magnet.rotation.z = isSwapped ? Math.PI : 0;
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public screenToWorld(
    clientX: number,
    clientY: number,
    planeY: number = 1.5
  ): THREE.Vector3 {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
    const intersect = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersect);

    return intersect;
  }

  public handleResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public dispose(): void {
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
    this.particleMesh.geometry.dispose();
    (this.particleMesh.material as THREE.Material).dispose();
  }
}
