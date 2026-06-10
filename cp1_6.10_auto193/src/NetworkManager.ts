import * as THREE from 'three';

export interface LatticeNode {
  id: number;
  position: THREE.Vector3;
  targetPosition?: THREE.Vector3;
  startPosition?: THREE.Vector3;
  color: THREE.Color;
  scale: number;
  selected: boolean;
  mesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  memoryText: string;
  tweenTime?: number;
  tweenDuration?: number;
}

export interface Connection {
  nodeA: LatticeNode;
  nodeB: LatticeNode;
  line: THREE.Line;
  distance: number;
}

const COLOR_PALETTE = [
  '#ff6b6b',
  '#feca57',
  '#48dbfb',
  '#ff9ff3',
  '#54a0ff',
  '#5f27cd',
];

const MEMORY_TEXTS = [
  '星辰坠落之夜',
  '潮汐低语的清晨',
  '她第一次微笑的瞬间',
  '雨中奔跑的童年',
  '极光下的誓言',
  '故乡的老槐树',
  '咖啡凉了的午后',
  '列车驶过的月台',
  '信笺泛黄的边角',
  '萤火虫的夏末',
  '书页翻动的声响',
  '雪落无声的冬夜',
  '风穿过走廊的痕迹',
  '霓虹闪烁的街角',
  '钟声敲响的黎明',
  '镜中老去的自己',
  '海浪拍打的礁石',
  '时钟停摆的刹那',
  '抽屉深处的钥匙',
  '未曾寄出的明信片',
  '黄昏燃烧的天际',
  '雨滴敲打窗棂',
  '旧巷子里的歌谣',
  '时光折叠的褶皱',
];

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function randomPointInSphere(radius: number): THREE.Vector3 {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = radius * Math.cbrt(Math.random());
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  );
}

type NodeClickCallback = (node: LatticeNode | null) => void;
type RecombineCallback = () => void;

export class NetworkManager {
  public readonly scene: THREE.Scene;
  public readonly nodes: LatticeNode[] = [];
  public readonly connections: Connection[] = [];
  public readonly connectionDistanceThreshold = 5;

  private readonly dodecahedronGeometry: THREE.DodecahedronGeometry;
  private readonly glowSphereGeometry: THREE.SphereGeometry;
  private readonly nodeMaterialCache: Map<string, THREE.MeshPhysicalMaterial> = new Map();
  private readonly glowMaterialCache: Map<string, THREE.MeshBasicMaterial> = new Map();

  private onNodeClick: NodeClickCallback | null = null;
  private onRecombine: RecombineCallback | null = null;
  private selectedNode: LatticeNode | null = null;
  private lastRecombineTime = 0;
  private readonly recombineInterval = 10;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private camera: THREE.PerspectiveCamera;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.dodecahedronGeometry = new THREE.DodecahedronGeometry(0.5, 0);
    this.glowSphereGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    this.generateNodes(24);
    this.computeConnections();
  }

  public setOnNodeClick(callback: NodeClickCallback): void {
    this.onNodeClick = callback;
  }

  public setOnRecombine(callback: RecombineCallback): void {
    this.onRecombine = callback;
  }

  public handlePointerDown(clientX: number, clientY: number, canvasRect: DOMRect): void {
    this.pointer.x = ((clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
    this.pointer.y = -((clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = this.nodes.map(n => n.mesh);
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length > 0) {
      const hitMesh = hits[0].object as THREE.Mesh;
      const node = this.nodes.find(n => n.mesh === hitMesh) || null;
      this.selectNode(node);
    }
  }

  public selectNode(node: LatticeNode | null): void {
    if (this.selectedNode === node) return;
    if (this.selectedNode) {
      this.applyNodeVisualState(this.selectedNode, false);
    }
    this.selectedNode = node;
    if (node) {
      this.applyNodeVisualState(node, true);
    }
    if (this.onNodeClick) {
      this.onNodeClick(node);
    }
  }

  public clearSelection(): void {
    this.selectNode(null);
  }

  private getNodeMaterial(color: THREE.Color, transparent: boolean): THREE.MeshPhysicalMaterial {
    const key = color.getHexString() + (transparent ? '_t' : '_o');
    let mat = this.nodeMaterialCache.get(key);
    if (!mat) {
      mat = new THREE.MeshPhysicalMaterial({
        color: color.clone(),
        transparent: true,
        opacity: transparent ? 0.55 : 0.75,
        roughness: 0.15,
        metalness: 0.1,
        transmission: 0.4,
        thickness: 0.5,
        clearcoat: 0.6,
        clearcoatRoughness: 0.2,
        emissive: color.clone().multiplyScalar(0.15),
      });
      this.nodeMaterialCache.set(key, mat);
    }
    return mat;
  }

  private getGlowMaterial(color: THREE.Color, selected: boolean): THREE.MeshBasicMaterial {
    const key = color.getHexString() + (selected ? '_s' : '_n');
    let mat = this.glowMaterialCache.get(key);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({
        color: selected ? 0xffffff : color.clone(),
        transparent: true,
        opacity: selected ? 1 : 0.85,
      });
      this.glowMaterialCache.set(key, mat);
    }
    return mat;
  }

  private applyNodeVisualState(node: LatticeNode, selected: boolean): void {
    node.selected = selected;
    const targetScale = selected ? node.scale * 1.5 : node.scale;
    node.mesh.scale.setScalar(targetScale);
    node.glowMesh.scale.setScalar(selected ? 0.8 / 0.15 : 1);
    (node.glowMesh.material as THREE.MeshBasicMaterial).color.set(selected ? 0xffffff : node.color);
    (node.glowMesh.material as THREE.MeshBasicMaterial).opacity = selected ? 1 : 0.85;
    (node.mesh.material as THREE.MeshPhysicalMaterial).emissive.set(
      selected ? new THREE.Color(0x88ccff) : node.color.clone().multiplyScalar(0.15)
    );
    (node.mesh.material as THREE.MeshPhysicalMaterial).emissiveIntensity = selected ? 0.6 : 1;
  }

  private generateNodes(count: number): void {
    for (let i = 0; i < count; i++) {
      const position = randomPointInSphere(8);
      const colorHex = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
      const color = new THREE.Color(colorHex);
      const scale = 0.4 + Math.random() * 0.6;

      const mesh = new THREE.Mesh(
        this.dodecahedronGeometry,
        this.getNodeMaterial(color, true)
      );
      mesh.position.copy(position);
      mesh.scale.setScalar(scale);
      mesh.userData.nodeId = i;
      this.scene.add(mesh);

      const glowMesh = new THREE.Mesh(
        this.glowSphereGeometry,
        this.getGlowMaterial(color, false)
      );
      glowMesh.position.copy(position);
      this.scene.add(glowMesh);

      this.nodes.push({
        id: i,
        position,
        color,
        scale,
        selected: false,
        mesh,
        glowMesh,
        memoryText: MEMORY_TEXTS[i % MEMORY_TEXTS.length],
      });
    }
  }

  public computeConnections(): void {
    for (const conn of this.connections) {
      this.scene.remove(conn.line);
      conn.line.geometry.dispose();
      (conn.line.material as THREE.Material).dispose();
    }
    this.connections.length = 0;

    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i];
        const b = this.nodes[j];
        const dist = a.position.distanceTo(b.position);
        if (dist <= this.connectionDistanceThreshold) {
          this.addConnection(a, b, dist);
        }
      }
    }
    if (this.onRecombine) {
      this.onRecombine();
    }
  }

  private addConnection(a: LatticeNode, b: LatticeNode, dist: number): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(6);
    positions[0] = a.position.x;
    positions[1] = a.position.y;
    positions[2] = a.position.z;
    positions[3] = b.position.x;
    positions[4] = b.position.y;
    positions[5] = b.position.z;
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const colors = new Float32Array(6);
    colors[0] = a.color.r;
    colors[1] = a.color.g;
    colors[2] = a.color.b;
    colors[3] = b.color.r;
    colors[4] = b.color.g;
    colors[5] = b.color.b;
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      linewidth: 0.04,
    });

    const line = new THREE.Line(geometry, material);
    this.scene.add(line);
    this.connections.push({ nodeA: a, nodeB: b, line, distance: dist });
  }

  public triggerRecombine(): void {
    const count = 3 + Math.floor(Math.random() * 4);
    const shuffled = [...this.nodes].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, count);

    for (const node of chosen) {
      node.startPosition = node.position.clone();
      node.targetPosition = randomPointInSphere(8);
      node.tweenTime = 0;
      node.tweenDuration = 2;
    }
  }

  public update(delta: number, elapsed: number): void {
    for (const node of this.nodes) {
      if (node.tweenTime !== undefined && node.tweenDuration !== undefined && node.targetPosition && node.startPosition) {
        node.tweenTime += delta;
        let t = node.tweenTime / node.tweenDuration;
        if (t >= 1) {
          t = 1;
          node.position.copy(node.targetPosition);
          node.targetPosition = undefined;
          node.startPosition = undefined;
          node.tweenTime = undefined;
          node.tweenDuration = undefined;
          this.computeConnections();
        } else {
          const eased = easeInOutCubic(t);
          node.position.lerpVectors(node.startPosition, node.targetPosition, eased);
        }
        node.mesh.position.copy(node.position);
        node.glowMesh.position.copy(node.position);
        this.updateConnectionGeometriesForNode(node);
      }
      node.mesh.rotation.x += delta * 0.15;
      node.mesh.rotation.y += delta * 0.2;
    }

    if (elapsed - this.lastRecombineTime >= this.recombineInterval) {
      this.lastRecombineTime = elapsed;
      this.triggerRecombine();
    }
  }

  private updateConnectionGeometriesForNode(node: LatticeNode): void {
    for (const conn of this.connections) {
      if (conn.nodeA === node || conn.nodeB === node) {
        const posAttr = conn.line.geometry.getAttribute('position') as THREE.BufferAttribute;
        posAttr.setXYZ(0, conn.nodeA.position.x, conn.nodeA.position.y, conn.nodeA.position.z);
        posAttr.setXYZ(1, conn.nodeB.position.x, conn.nodeB.position.y, conn.nodeB.position.z);
        posAttr.needsUpdate = true;
        conn.distance = conn.nodeA.position.distanceTo(conn.nodeB.position);
      }
    }
  }

  public dispose(): void {
    this.dodecahedronGeometry.dispose();
    this.glowSphereGeometry.dispose();
    for (const mat of this.nodeMaterialCache.values()) mat.dispose();
    for (const mat of this.glowMaterialCache.values()) mat.dispose();
    for (const conn of this.connections) {
      conn.line.geometry.dispose();
      (conn.line.material as THREE.Material).dispose();
    }
  }
}
