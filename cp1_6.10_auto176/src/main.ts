import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { generateNetworkData, type NodeData } from './data';
import { createNodes, updateNodes, setNodeHovered, type NodeObject } from './nodeSystem';
import { createLines, updateLines, disposeLines, type LineObject } from './lineSystem';
import { UIController } from './ui';

class NeonGridApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private clock: THREE.Clock;

  private nodes: NodeObject[] = [];
  private lines: LineObject[] = [];
  private nodesMap: Map<number, NodeData> = new Map();

  private ui: UIController;
  private globalLoad: number = 30;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredNode: NodeObject | null = null;

  private container: HTMLElement;

  constructor() {
    this.container = document.getElementById('app')!;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.ui = new UIController({
      onLoadChange: (value) => this.handleLoadChange(value),
      onReset: () => this.resetNetwork()
    });

    this.scene = new THREE.Scene();
    this.setupBackground();
    this.setupLighting();
    this.setupGround();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(12, 10, 16);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 30;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.3;
    this.controls.enablePan = false;
    this.controls.mouseButtons = {
      LEFT: null as any,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE
    };

    this.loadNetwork();
    this.setupEvents();
    this.animate();
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#1a1c3b');
    gradient.addColorStop(1, '#0a0b1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const bgTexture = new THREE.CanvasTexture(canvas);
    this.scene.background = bgTexture;

    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 800;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi) * 0.5 + 10;
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.08,
      transparent: true,
      opacity: 0.6
    });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(stars);
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x00ffaa, 1, 40);
    pointLight1.position.set(5, 8, 5);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x00aaff, 0.8, 40);
    pointLight2.position.set(-5, 6, -5);
    this.scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0xff6644, 0.5, 30);
    pointLight3.position.set(0, 4, 0);
    this.scene.add(pointLight3);
  }

  private setupGround(): void {
    const gridHelper = new THREE.GridHelper(20, 20, 0x334466, 0x223344);
    gridHelper.position.y = -1;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.5;
    this.scene.add(gridHelper);

    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshBasicMaterial({
      color: 0x0a0b1a,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.01;
    this.scene.add(ground);
  }

  private loadNetwork(): void {
    this.clearNetwork();

    const { nodes: nodeData, lines: lineData } = generateNetworkData();

    this.nodesMap.clear();
    for (const data of nodeData) {
      this.nodesMap.set(data.id, data);
    }

    this.nodes = createNodes(nodeData);
    for (const node of this.nodes) {
      this.scene.add(node.group);
    }

    this.lines = createLines(lineData, this.nodesMap);
    for (const line of this.lines) {
      this.scene.add(line.group);
    }

    this.ui.updateStats(this.nodes.length, this.lines.length);
  }

  private clearNetwork(): void {
    for (const node of this.nodes) {
      this.scene.remove(node.group);
      (node.sphere.material as THREE.Material).dispose();
      (node.halo.material as THREE.Material).dispose();
      (node.shadow.material as THREE.Material).dispose();
      (node.label.material as THREE.Material).dispose();
      (node.label.material as THREE.SpriteMaterial).map?.dispose();
    }
    this.nodes = [];

    for (const line of this.lines) {
      this.scene.remove(line.group);
    }
    disposeLines(this.lines);
    this.lines = [];
  }

  private resetNetwork(): void {
    this.loadNetwork();
    this.globalLoad = 30;
    this.ui.setLoadValue(30);
  }

  private handleLoadChange(value: number): void {
    this.globalLoad = value;
  }

  private setupEvents(): void {
    window.addEventListener('resize', () => this.onResize());
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const spheres = this.nodes.map(n => n.sphere);
    const intersects = this.raycaster.intersectObjects(spheres, false);

    if (this.hoveredNode) {
      setNodeHovered(this.hoveredNode, false);
      this.hoveredNode = null;
    }

    if (intersects.length > 0) {
      const hoveredSphere = intersects[0].object;
      const node = this.nodes.find(n => n.sphere === hoveredSphere);
      if (node) {
        this.hoveredNode = node;
        setNodeHovered(node, true);
      }
    }
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.controls.update();
    this.checkHover();
    updateNodes(this.nodes, deltaTime, this.globalLoad);
    updateLines(this.lines, deltaTime, this.globalLoad, this.nodesMap);

    this.renderer.render(this.scene, this.camera);
    this.ui.updateFPS();
  }
}

new NeonGridApp();
