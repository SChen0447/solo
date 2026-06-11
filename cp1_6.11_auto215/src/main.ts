import * as THREE from 'three';
import { gsap } from 'gsap';
import { LightSystem, SpectrumData } from './lights';
import { CrystalManager, CrystalCluster, CrystalType } from './crystals';
import { UIController } from './ui';

class CrystalCaveApp {
  private container!: HTMLElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private clock!: THREE.Clock;
  private raycaster!: THREE.Raycaster;
  private mouse!: THREE.Vector2;
  private normalizedMouse!: THREE.Vector2;

  private lightSystem!: LightSystem;
  private crystalManager!: CrystalManager;
  private uiController!: UIController;

  private originalCameraPos!: THREE.Vector3;
  private hoveredCluster: CrystalCluster | null = null;
  private animationFrameId: number = 0;
  private isRunning: boolean = false;

  private caveWalls!: THREE.Mesh;
  private caveFloor!: THREE.Mesh;
  private caveCeiling!: THREE.Mesh;

  constructor() {
    this.init();
  }

  private init(): void {
    this.container = document.getElementById('canvas-container')!;
    if (!this.container) {
      console.error('Canvas container not found!');
      return;
    }

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(0, 0);
    this.normalizedMouse = new THREE.Vector2(0, 0);

    this.createScene();
    this.createCamera();
    this.createRenderer();
    this.createCaveEnvironment();

    this.lightSystem = new LightSystem(this.scene, this.camera, {
      onSpectrumUpdate: (spectrum: SpectrumData) => {
        this.uiController?.updateSpectrumIntensities(spectrum);
      }
    });

    this.crystalManager = new CrystalManager(this.scene, this.lightSystem);

    this.uiController = new UIController(this.crystalManager, this.lightSystem, {
      onTempChange: (kelvin: number) => {
        this.lightSystem.updateFlashlightColor(kelvin);
      },
      onCrystalSelect: (type: CrystalType) => {
      },
      onKeyFocus: (type: CrystalType) => {
        this.crystalManager.focusCamera(type, this.camera);
        this.uiController.updateMineralPanel(type);
      }
    });

    this.bindEvents();
    this.uiController.hideLoadingScreen(2300);
    this.start();
  }

  private createScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d1b2a);
    this.scene.fog = new THREE.FogExp2(0x0d1b2a, 0.035);
  }

  private createCamera(): void {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 200);
    this.originalCameraPos = new THREE.Vector3(0, 1.5, 11);
    this.camera.position.copy(this.originalCameraPos);
    this.camera.lookAt(0, 0, 0);
  }

  private createRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);
  }

  private createCaveEnvironment(): void {
    const caveWidth = 35;
    const caveHeight = 18;
    const caveDepth = 25;

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x1b263b,
      roughness: 0.92,
      metalness: 0.05,
      side: THREE.BackSide
    });

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x152238,
      roughness: 0.95,
      metalness: 0.02
    });

    const ceilingMaterial = new THREE.MeshStandardMaterial({
      color: 0x162438,
      roughness: 0.9,
      metalness: 0.03,
      side: THREE.BackSide
    });

    const backWallGeo = new THREE.PlaneGeometry(caveWidth, caveHeight, 20, 12);
    this.displaceVertices(backWallGeo, 0.35);
    this.caveWalls = new THREE.Mesh(backWallGeo, wallMaterial);
    this.caveWalls.position.z = -caveDepth / 2;
    this.caveWalls.receiveShadow = true;
    this.scene.add(this.caveWalls);

    const leftWallGeo = new THREE.PlaneGeometry(caveDepth, caveHeight, 15, 10);
    this.displaceVertices(leftWallGeo, 0.3);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMaterial.clone());
    leftWall.position.x = -caveWidth / 2;
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    const rightWallGeo = new THREE.PlaneGeometry(caveDepth, caveHeight, 15, 10);
    this.displaceVertices(rightWallGeo, 0.3);
    const rightWall = new THREE.Mesh(rightWallGeo, wallMaterial.clone());
    rightWall.position.x = caveWidth / 2;
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);

    const floorGeo = new THREE.PlaneGeometry(caveWidth, caveDepth, 25, 18);
    this.displaceVertices(floorGeo, 0.25);
    this.caveFloor = new THREE.Mesh(floorGeo, floorMaterial);
    this.caveFloor.rotation.x = -Math.PI / 2;
    this.caveFloor.position.y = -5;
    this.caveFloor.receiveShadow = true;
    this.scene.add(this.caveFloor);

    const ceilingGeo = new THREE.PlaneGeometry(caveWidth, caveDepth, 25, 18);
    this.displaceVertices(ceilingGeo, 0.4);
    this.caveCeiling = new THREE.Mesh(ceilingGeo, ceilingMaterial);
    this.caveCeiling.rotation.x = Math.PI / 2;
    this.caveCeiling.position.y = 8;
    this.scene.add(this.caveCeiling);

    this.createWallNiches();
    this.createFloatingParticles();
  }

  private displaceVertices(geometry: THREE.BufferGeometry, amount: number): void {
    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
      posAttr.setX(i, x + (Math.random() - 0.5) * amount);
      posAttr.setY(i, y + (Math.random() - 0.5) * amount);
      posAttr.setZ(i, z + (Math.random() - 0.5) * amount);
    }
    geometry.computeVertexNormals();
  }

  private createWallNiches(): void {
    const nichePositions = [
      { x: -7, y: -1, z: -11.5 },
      { x: 0, y: -1.5, z: -12 },
      { x: 7, y: -0.8, z: -11.5 }
    ];

    nichePositions.forEach((pos, idx) => {
      const nicheSize = idx === 1 ? 5.5 : 4.8;
      const nicheGeo = new THREE.SphereGeometry(nicheSize, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2.2);
      const nicheMat = new THREE.MeshStandardMaterial({
        color: 0x132033,
        roughness: 0.85,
        metalness: 0.08,
        side: THREE.BackSide
      });
      const niche = new THREE.Mesh(nicheGeo, nicheMat);
      niche.position.set(pos.x, pos.y - 0.5, pos.z);
      niche.scale.set(1, 0.75, 0.5);
      niche.receiveShadow = true;
      this.scene.add(niche);

      const rimGeo = new THREE.TorusGeometry(nicheSize * 0.9, 0.08, 8, 32, Math.PI);
      const rimMat = new THREE.MeshStandardMaterial({
        color: 0x2e3b4e,
        roughness: 0.7,
        metalness: 0.15
      });
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.position.set(pos.x, pos.y - 0.2, pos.z - nicheSize * 0.48);
      rim.rotation.x = Math.PI;
      this.scene.add(rim);
    });
  }

  private createFloatingParticles(): void {
    const particleCount = 400;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const palette = [
      new THREE.Color(0x5dade2),
      new THREE.Color(0xaf7ac5),
      new THREE.Color(0xf4d03f),
      new THREE.Color(0xaed6f1),
      new THREE.Color(0xc39bd3)
    ];

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 30;
      positions[i3 + 1] = (Math.random() - 0.3) * 14;
      positions[i3 + 2] = (Math.random() - 0.5) * 22 - 2;

      const color = palette[Math.floor(Math.random() * palette.length)];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = Math.random() * 0.06 + 0.02;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        uniform float time;
        void main() {
          vColor = color;
          vec3 pos = position;
          pos.y += sin(time * 0.3 + position.x * 2.0) * 0.15;
          pos.x += cos(time * 0.2 + position.z * 1.5) * 0.1;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * 300.0 / -mvPosition.z;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, dist) * 0.5;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    particles.name = 'floatingParticles';
    this.scene.add(particles);
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('click', this.onClick.bind(this));
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = event.clientX;
    this.mouse.y = event.clientY;

    this.normalizedMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.normalizedMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.lightSystem.updateFlashlightPosition(
      this.normalizedMouse.x * 0.8,
      this.normalizedMouse.y * 0.6
    );

    this.checkHover();
  }

  private onClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).closest('#mineral-panel') ||
        (event.target as HTMLElement).closest('#spectrum-bar') ||
        (event.target as HTMLElement).closest('#hint-panel') ||
        (event.target as HTMLElement).closest('#loading-screen')) {
      return;
    }

    this.raycaster.setFromCamera(this.normalizedMouse, this.camera);
    const allMeshes = this.crystalManager.getAllMeshes();
    const intersects = this.raycaster.intersectObjects(allMeshes, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const cluster = this.crystalManager.getClusterByMesh(hitMesh);
      if (cluster) {
        cluster.startRotation();
        this.uiController.updateMineralPanel(cluster.type);
        if (this.crystalManager.getCurrentFocused() !== cluster.type) {
          this.crystalManager.focusCamera(cluster.type, this.camera);
        }
      }
    }
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.normalizedMouse, this.camera);
    const allMeshes = this.crystalManager.getAllMeshes();
    const intersects = this.raycaster.intersectObjects(allMeshes, false);

    let newHovered: CrystalCluster | null = null;
    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      newHovered = this.crystalManager.getClusterByMesh(hitMesh) || null;
    }

    if (newHovered !== this.hoveredCluster) {
      if (this.hoveredCluster) {
        this.hoveredCluster.onHover(false);
      }
      if (newHovered) {
        newHovered.onHover(true);
        this.uiController.handleCrystalHover(newHovered);
        this.lightSystem.setSpectrumIntensity(0.75);
      } else {
        this.lightSystem.setSpectrumIntensity(0.15);
      }
      this.hoveredCluster = newHovered;
      document.body.style.cursor = newHovered ? 'pointer' : 'default';
    }
  }

  private updateFloatingParticles(time: number): void {
    const particles = this.scene.getObjectByName('floatingParticles') as THREE.Points;
    if (particles && particles.material instanceof THREE.ShaderMaterial) {
      particles.material.uniforms.time.value = time;
    }
  }

  private animate = (): void => {
    if (!this.isRunning) return;
    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    const camOffset = this.normalizedMouse.clone().multiplyScalar(0.35);
    const baseTarget = this.crystalManager.getCurrentFocused()
      ? this.crystalManager.getCluster(this.crystalManager.getCurrentFocused() as CrystalType)?.group.position || new THREE.Vector3()
      : new THREE.Vector3(0, 0, 0);

    const lookTarget = new THREE.Vector3(
      baseTarget.x + camOffset.x * 0.8,
      baseTarget.y + camOffset.y * 0.6,
      baseTarget.z
    );
    this.camera.lookAt(lookTarget);

    this.lightSystem.update(delta);
    this.crystalManager.update(delta, elapsedTime, this.camera);
    this.updateFloatingParticles(elapsedTime);

    this.renderer.render(this.scene, this.camera);
  };

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.animate();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  public dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize.bind(this));
    window.removeEventListener('mousemove', this.onMouseMove.bind(this));
    window.removeEventListener('click', this.onClick.bind(this));

    this.lightSystem.dispose();
    this.crystalManager.dispose();
    this.uiController.dispose();

    this.scene.traverse((obj: any) => {
      if (obj.geometry) obj.geometry.dispose?.();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m: THREE.Material) => m.dispose());
        } else {
          obj.material.dispose?.();
        }
      }
    });

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

let app: CrystalCaveApp | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    app = new CrystalCaveApp();
  });

  window.addEventListener('beforeunload', () => {
    app?.dispose();
    app = null;
  });
}

export default CrystalCaveApp;
