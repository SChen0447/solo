import * as THREE from 'three';
import { RootNode, SoilLayer, SOIL_LAYERS, VibrationParticle } from './rootSimulator';

export interface RendererState {
  showBranchMarkers: boolean;
  soilOpacity: number;
  fogDensity: number;
}

export interface SoilClickInfo {
  layer: SoilLayer;
  worldPosition: THREE.Vector3;
}

export class RootRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private rootGroup: THREE.Group;
  private soilGroup: THREE.Group;
  private particleGroup: THREE.Group;
  private markerGroup: THREE.Group;
  private glowGroup: THREE.Group;
  private soilMeshes: Map<number, THREE.Mesh> = new Map();
  private soilPlanes: Map<number, THREE.LineSegments> = new Map();
  private tubeCache: Map<string, THREE.Mesh> = new Map();
  private lastNodeCount: number = 0;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private fog: THREE.Fog;
  private hoverHalo: THREE.Mesh | null = null;

  private readonly ROOT_START_COLOR = new THREE.Color('#4a2c1a');
  private readonly ROOT_END_COLOR = new THREE.Color('#8b5a2b');
  private readonly SOIL_SIZE = 10;

  constructor(container: HTMLElement) {
    this.container = container;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = new THREE.Scene();
    this.scene.background = this.createGradientTexture();

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(5, 3, 5);
    this.camera.lookAt(0, -1.5, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.container.appendChild(this.renderer.domElement);

    this.fog = new THREE.Fog(0x0a1628, 0.5, 10);
    this.scene.fog = this.fog;

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    this.directionalLight.position.set(-5, 5, 3);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.camera.left = -10;
    this.directionalLight.shadow.camera.right = 10;
    this.directionalLight.shadow.camera.top = 10;
    this.directionalLight.shadow.camera.bottom = -10;
    this.scene.add(this.directionalLight);

    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    this.soilGroup = new THREE.Group();
    this.scene.add(this.soilGroup);

    this.particleGroup = new THREE.Group();
    this.scene.add(this.particleGroup);

    this.markerGroup = new THREE.Group();
    this.scene.add(this.markerGroup);

    this.glowGroup = new THREE.Group();
    this.scene.add(this.glowGroup);

    this.createSoilLayers();
    this.createHoverHalo();

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private createGradientTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#0a1628');
    gradient.addColorStop(1, '#1a0e0a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createSoilLayers(): void {
    const halfSize = this.SOIL_SIZE / 2;

    SOIL_LAYERS.forEach((layer, index) => {
      const height = layer.topY - layer.bottomY;
      const geo = new THREE.BoxGeometry(this.SOIL_SIZE, height, this.SOIL_SIZE);
      const mat = new THREE.MeshPhongMaterial({
        color: layer.color,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        shininess: 5,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, (layer.topY + layer.bottomY) / 2, 0);
      mesh.userData = { soilLayer: layer, type: 'soil' };
      mesh.receiveShadow = true;
      this.soilGroup.add(mesh);
      this.soilMeshes.set(index, mesh);

      const planeGeo = new THREE.PlaneGeometry(this.SOIL_SIZE, this.SOIL_SIZE, 20, 20);
      const wireframeMat = new THREE.MeshBasicMaterial({
        color: layer.wireframeColor,
        wireframe: true,
        transparent: true,
        opacity: layer.wireframeOpacity
      });
      const wireframeMesh = new THREE.LineSegments(new THREE.WireframeGeometry(planeGeo), wireframeMat as any);
      wireframeMesh.rotation.x = -Math.PI / 2;
      wireframeMesh.position.set(0, layer.topY, 0);
      this.soilGroup.add(wireframeMesh);
      this.soilPlanes.set(index, wireframeMesh);
    });
  }

  private createHoverHalo(): void {
    const geo = new THREE.RingGeometry(0.01, 0.1, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.hoverHalo = new THREE.Mesh(geo, mat);
    this.hoverHalo.visible = false;
    this.scene.add(this.hoverHalo);
  }

  public updateHoverHalo(position: THREE.Vector3 | null): void {
    if (!this.hoverHalo) return;
    if (position) {
      this.hoverHalo.position.copy(position);
      this.hoverHalo.lookAt(this.camera.position);
      this.hoverHalo.visible = true;
      const mat = this.hoverHalo.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.5;
      const scale = 0.3;
      this.hoverHalo.scale.set(scale, scale, scale);
    } else {
      this.hoverHalo.visible = false;
    }
  }

  public updateRoots(nodes: RootNode[]): void {
    if (nodes.length === this.lastNodeCount && this.tubeCache.size > 0) {
      return;
    }

    this.lastNodeCount = nodes.length;
    this.clearRootMeshes();

    const nodeMap = new Map<number, RootNode>();
    nodes.forEach(n => nodeMap.set(n.id, n));

    const processedSegments = new Set<string>();

    for (const node of nodes) {
      if (node.parentId === null) continue;
      const parent = nodeMap.get(node.parentId);
      if (!parent) continue;

      const segmentKey = `${node.parentId}_${node.id}`;
      if (processedSegments.has(segmentKey)) continue;
      processedSegments.add(segmentKey);

      this.createRootTube(parent, node);
    }

    this.createRootGlow(nodes);
  }

  private clearRootMeshes(): void {
    while (this.rootGroup.children.length > 0) {
      const child = this.rootGroup.children[0];
      this.rootGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
    this.tubeCache.clear();

    while (this.glowGroup.children.length > 0) {
      const child = this.glowGroup.children[0];
      this.glowGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }
  }

  private createRootTube(startNode: RootNode, endNode: RootNode): void {
    const curvePoints: THREE.Vector3[] = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const lerpedPos = startNode.position.clone().lerp(endNode.position, t);
      curvePoints.push(lerpedPos);
    }

    let curve: THREE.CatmullRomCurve3;
    if (curvePoints.length >= 2) {
      curve = new THREE.CatmullRomCurve3(curvePoints);
    } else {
      const dir = endNode.position.clone().sub(startNode.position).normalize().multiplyScalar(0.01);
      curve = new THREE.CatmullRomCurve3([startNode.position, startNode.position.clone().add(dir)]);
    }

    const avgRadius = (startNode.radius + endNode.radius) / 2;
    const tubeGeo = new THREE.TubeGeometry(curve, 8, avgRadius, 8, false);

    const depthFactor = Math.min(1, (startNode.depth + endNode.depth) / 2 / 200);
    const baseColor = this.ROOT_START_COLOR.clone().lerp(this.ROOT_END_COLOR, depthFactor);
    const saturation = (startNode.saturation + endNode.saturation) / 2;

    const hsl = { h: 0, s: 0, l: 0 };
    baseColor.getHSL(hsl);
    hsl.s = Math.min(1, hsl.s * (0.5 + saturation * 0.8));
    const finalColor = new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);

    const mat = new THREE.MeshStandardMaterial({
      color: finalColor,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(tubeGeo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { type: 'root', nodes: [startNode, endNode] };
    this.rootGroup.add(mesh);
  }

  private createRootGlow(nodes: RootNode[]): void {
    const tipNodes = nodes.filter(n => n.childrenIds.length === 0).slice(0, 30);

    for (const node of tipNodes) {
      const geo = new THREE.SphereGeometry(0.25, 16, 16);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
        side: THREE.BackSide
      });
      const glow = new THREE.Mesh(geo, mat);
      glow.position.copy(node.position);
      this.glowGroup.add(glow);
    }
  }

  public updateParticles(particles: VibrationParticle[]): void {
    while (this.particleGroup.children.length > 0) {
      const child = this.particleGroup.children[0];
      this.particleGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }

    for (const p of particles) {
      const geo = new THREE.SphereGeometry(0.03 * p.life, 6, 6);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: p.life * 0.6
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(p.position);
      this.particleGroup.add(mesh);
    }
  }

  public updateBranchMarkers(nodes: RootNode[], show: boolean): void {
    while (this.markerGroup.children.length > 0) {
      const child = this.markerGroup.children[0];
      this.markerGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }

    if (!show) return;

    for (const node of nodes) {
      if (!node.isBranchPoint) continue;

      const geo = new THREE.RingGeometry(0.08, 0.1, 32);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x66ff66,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.position.copy(node.position);
      ring.lookAt(this.camera.position);
      ring.userData = { type: 'branchMarker', nodeId: node.id, node };
      this.markerGroup.add(ring);
    }
  }

  public setSoilOpacity(opacity: number): void {
    this.soilMeshes.forEach(mesh => {
      (mesh.material as THREE.MeshPhongMaterial).opacity = opacity * 0.4;
    });
  }

  public setFogDensity(far: number): void {
    this.fog.far = far;
  }

  public pickSoilLayer(clientX: number, clientY: number): SoilClickInfo | null {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const soilObjects = Array.from(this.soilMeshes.values());
    const intersects = this.raycaster.intersectObjects(soilObjects);

    if (intersects.length > 0) {
      const hit = intersects[0];
      if (hit.object.userData && hit.object.userData.soilLayer) {
        return {
          layer: hit.object.userData.soilLayer,
          worldPosition: hit.point
        };
      }
    }
    return null;
  }

  public pickBranchMarker(clientX: number, clientY: number): { nodeId: number; position: THREE.Vector3 } | null {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.markerGroup.children);

    if (intersects.length > 0) {
      const hit = intersects[0];
      if (hit.object.userData && hit.object.userData.type === 'branchMarker') {
        return {
          nodeId: hit.object.userData.nodeId,
          position: hit.point
        };
      }
    }
    return null;
  }

  public pickHoverObject(clientX: number, clientY: number): THREE.Vector3 | null {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const allObjects = [
      ...this.rootGroup.children,
      ...this.soilGroup.children,
      ...this.markerGroup.children
    ];

    const intersects = this.raycaster.intersectObjects(allObjects, true);
    if (intersects.length > 0) {
      return intersects[0].point;
    }
    return null;
  }

  public render(): void {
    this.markerGroup.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        child.lookAt(this.camera.position);
      }
    });

    this.renderer.render(this.scene, this.camera);
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  public getSoilLayers(): SoilLayer[] {
    return SOIL_LAYERS;
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onResize.bind(this));
    this.renderer.dispose();
  }
}
