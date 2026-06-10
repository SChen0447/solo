import * as THREE from 'three';
import type { FrequencyData } from './audioAnalyzer';

export interface GeometryItem {
  mesh: THREE.Mesh;
  baseScale: number;
  rotationSpeed: THREE.Vector3;
  pulseBand: 'low' | 'mid' | 'high';
  basePosition: THREE.Vector3;
  typeIndex: number;
}

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private geometries: GeometryItem[] = [];
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredMesh: THREE.Mesh | null = null;
  private originalMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]> = new Map();
  private glowMaterials: Map<THREE.Mesh, THREE.ShaderMaterial> = new Map();

  private isDragging: boolean = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };
  private cameraTheta: number = 0;
  private cameraPhi: number = Math.PI / 3;
  private cameraRadius: number = 8;
  private targetTheta: number = 0;
  private targetPhi: number = Math.PI / 3;
  private targetRadius: number = 8;
  private readonly damping: number = 0.08;

  private onGeometryClick: ((typeIndex: number) => void) | null = null;

  constructor(container: HTMLElement) {
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

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupLights();
    this.createGeometries();
    this.updateCameraPosition();
    this.bindEvents(container);
    window.addEventListener('resize', () => this.onResize(container));
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    const point1 = new THREE.PointLight(0x00ffff, 1.2, 30);
    point1.position.set(5, 5, 5);
    this.scene.add(point1);

    const point2 = new THREE.PointLight(0xff00ff, 1.0, 30);
    point2.position.set(-5, -3, 4);
    this.scene.add(point2);

    const point3 = new THREE.PointLight(0xffd700, 0.8, 30);
    point3.position.set(0, 5, -5);
    this.scene.add(point3);
  }

  private createAlbumTexture(index: number): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const palettes = [
      ['#0a0a1a', '#1a0a3a', '#00ffff', '#ff00ff'],
      ['#1a0a0a', '#2a1a0a', '#ffaa00', '#ff6600'],
      ['#0a1a1a', '#0a2a2a', '#00ffaa', '#00aaff'],
      ['#1a0a1a', '#2a0a3a', '#ff00aa', '#aa00ff'],
    ];
    const palette = palettes[index % palettes.length];

    const gradient = ctx.createLinearGradient(0, 0, 512, 512);
    gradient.addColorStop(0, palette[0]);
    gradient.addColorStop(1, palette[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = 2 + Math.random() * 60;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, palette[2 + (i % 2)] + '40');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 512, 512);
    }

    ctx.strokeStyle = palette[2] + '60';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.arc(256, 256, 40 + i * 28, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labels = ['ELEC', 'JAZZ', 'CLAS', 'BEAT'];
    ctx.fillText(labels[index % labels.length], 256, 256);

    ctx.font = '20px sans-serif';
    ctx.fillStyle = palette[2];
    ctx.fillText('ALBUM COVER', 256, 310);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createGlowMaterial(color: THREE.Color): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: color },
        intensity: { value: 1.0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float intensity;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vec3 viewDir = normalize(-vPosition);
          float rim = pow(1.0 - abs(dot(viewDir, vNormal)), 2.0);
          vec3 glow = glowColor * rim * intensity;
          gl_FragColor = vec4(glow, rim * intensity * 0.8);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });
  }

  private createGeometries(): void {
    const shapes = [
      new THREE.TorusGeometry(1, 0.35, 32, 64),
      new THREE.BoxGeometry(1.4, 1.4, 1.4),
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.SphereGeometry(1, 48, 48),
    ];

    const edgeColors = [
      new THREE.Color(0x00ffff),
      new THREE.Color(0xff00ff),
      new THREE.Color(0xffd700),
      new THREE.Color(0x00ff88),
    ];

    const positions = [
      new THREE.Vector3(-2.8, 1.5, 0),
      new THREE.Vector3(2.8, 1.5, 0),
      new THREE.Vector3(-2.2, -1.8, 0.5),
      new THREE.Vector3(2.2, -1.8, -0.5),
    ];

    const pulseBands: Array<'low' | 'mid' | 'high'> = ['low', 'mid', 'high', 'low'];
    const rotationSpeeds = [
      new THREE.Vector3(0.4, 0.6, 0.2),
      new THREE.Vector3(0.3, 0.2, 0.5),
      new THREE.Vector3(0.5, 0.3, 0.4),
      new THREE.Vector3(0.2, 0.5, 0.3),
    ];

    shapes.forEach((geometry, i) => {
      const texture = this.createAlbumTexture(i);
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        metalness: 0.3,
        roughness: 0.5,
        emissive: edgeColors[i],
        emissiveIntensity: 0.15,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(positions[i]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: edgeColors[i],
        transparent: true,
        opacity: 0.7,
      });
      const wireframe = new THREE.LineSegments(edges, lineMaterial);
      mesh.add(wireframe);

      const glowMesh = new THREE.Mesh(geometry, this.createGlowMaterial(edgeColors[i]));
      glowMesh.scale.setScalar(1.15);
      mesh.add(glowMesh);

      this.scene.add(mesh);
      this.originalMaterials.set(mesh, material);

      this.geometries.push({
        mesh,
        baseScale: 1,
        rotationSpeed: rotationSpeeds[i],
        pulseBand: pulseBands[i],
        basePosition: positions[i].clone(),
        typeIndex: i,
      });
    });
  }

  private bindEvents(container: HTMLElement): void {
    const dom = this.renderer.domElement;

    dom.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    dom.addEventListener('mousemove', (e) => {
      const rect = dom.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (this.isDragging) {
        const dx = e.clientX - this.previousMouse.x;
        const dy = e.clientY - this.previousMouse.y;
        this.targetTheta -= dx * 0.005;
        this.targetPhi = Math.max(0.15, Math.min(Math.PI - 0.15, this.targetPhi - dy * 0.005));
        this.previousMouse = { x: e.clientX, y: e.clientY };
      }
    });

    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.targetRadius = Math.max(4, Math.min(18, this.targetRadius + e.deltaY * 0.008));
    }, { passive: false });

    dom.addEventListener('click', (e) => {
      if (this.hoveredMesh && this.onGeometryClick) {
        const item = this.geometries.find(g => g.mesh === this.hoveredMesh);
        if (item) this.onGeometryClick(item.typeIndex);
      }
    });
  }

  public setOnGeometryClick(callback: (typeIndex: number) => void): void {
    this.onGeometryClick = callback;
  }

  private updateCameraPosition(): void {
    this.cameraTheta += (this.targetTheta - this.cameraTheta) * this.damping;
    this.cameraPhi += (this.targetPhi - this.cameraPhi) * this.damping;
    this.cameraRadius += (this.targetRadius - this.cameraRadius) * this.damping;

    const x = this.cameraRadius * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    const y = this.cameraRadius * Math.cos(this.cameraPhi);
    const z = this.cameraRadius * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.geometries.map(g => g.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      if (this.hoveredMesh !== hitMesh) {
        if (this.hoveredMesh) this.setMeshHighlight(this.hoveredMesh, false);
        this.hoveredMesh = hitMesh;
        this.setMeshHighlight(hitMesh, true);
        this.renderer.domElement.style.cursor = 'pointer';
      }
    } else if (this.hoveredMesh) {
      this.setMeshHighlight(this.hoveredMesh, false);
      this.hoveredMesh = null;
      this.renderer.domElement.style.cursor = 'grab';
    }
  }

  private setMeshHighlight(mesh: THREE.Mesh, highlight: boolean): void {
    const material = this.originalMaterials.get(mesh) as THREE.MeshStandardMaterial;
    if (!material) return;
    material.emissiveIntensity = highlight ? 0.6 : 0.15;

    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.ShaderMaterial) {
        child.material.uniforms.intensity.value = highlight ? 2.5 : 1.0;
      }
    });
  }

  public update(deltaTime: number, frequencyData: FrequencyData): void {
    this.updateCameraPosition();
    this.checkHover();

    const t = performance.now() * 0.001;

    this.geometries.forEach((item) => {
      const bandValue = frequencyData[item.pulseBand];
      const pulseScale = 1 + bandValue * 0.35;

      item.mesh.rotation.x += item.rotationSpeed.x * deltaTime * (1 + bandValue * 1.5);
      item.mesh.rotation.y += item.rotationSpeed.y * deltaTime * (1 + bandValue * 1.5);
      item.mesh.rotation.z += item.rotationSpeed.z * deltaTime * (1 + bandValue * 1.5);

      item.mesh.scale.setScalar(item.baseScale * pulseScale);

      const floatY = Math.sin(t * 1.2 + item.typeIndex * 1.5) * 0.25;
      const floatX = Math.cos(t * 0.8 + item.typeIndex * 2.0) * 0.15;
      item.mesh.position.set(
        item.basePosition.x + floatX,
        item.basePosition.y + floatY,
        item.basePosition.z + Math.sin(t * 0.6 + item.typeIndex) * 0.2
      );
    });

    this.renderer.render(this.scene, this.camera);
  }

  public resetAnimations(): void {
    this.geometries.forEach((item) => {
      item.mesh.rotation.set(0, 0, 0);
      item.mesh.scale.setScalar(item.baseScale);
      item.mesh.position.copy(item.basePosition);
    });
  }

  private onResize(container: HTMLElement): void {
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  public dispose(): void {
    this.geometries.forEach(item => {
      item.mesh.geometry.dispose();
      const mat = this.originalMaterials.get(item.mesh);
      if (Array.isArray(mat)) mat.forEach(m => m.dispose());
      else if (mat) mat.dispose();
    });
    this.renderer.dispose();
  }
}
