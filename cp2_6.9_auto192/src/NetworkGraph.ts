import * as THREE from 'three';

export type NodeCategory = 'friend' | 'group' | 'tag';

export interface GraphNode {
  id: number;
  name: string;
  category: NodeCategory;
  influence: number;
}

export interface GraphEdge {
  source: number;
  target: number;
  strength: number;
}

interface NodePosition {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  targetX: number;
  targetY: number;
  targetZ: number;
}

const CATEGORY_COLORS: Record<NodeCategory, number> = {
  friend: 0xff6b6b,
  group: 0x4ecdc4,
  tag: 0x45b7d1,
};

const CATEGORY_LABELS: Record<NodeCategory, string> = {
  friend: '好友',
  group: '群组',
  tag: '标签',
};

export class NetworkGraph {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private container: HTMLElement;

  private nodes: GraphNode[] = [];
  private edges: GraphEdge[] = [];
  private nodeMeshes: Map<number, THREE.Mesh> = new Map();
  private nodePositions: Map<number, NodePosition> = new Map();
  private edgeLines: Map<string, THREE.Line> = new Map();

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  private hoveredNodeId: number | null = null;
  private selectedNodeId: number | null = null;
  private expandedConnections: Set<number> = new Set();

  private lineDensity = 0.5;
  private categoryFilter: NodeCategory | 'all' = 'all';

  private isRelayouting = false;
  private relayoutStartTime = 0;
  private relayoutDuration = 2000;

  private tooltipEl: HTMLElement;
  private tooltipNameEl: HTMLElement;
  private tooltipMetaEl: HTMLElement;

  private onNodeHoverCallback: ((node: GraphNode | null, x: number, y: number) => void) | null = null;
  private onNodeClickCallback: ((node: GraphNode | null) => void) | null = null;

  constructor(container: HTMLElement, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.container = container;
    this.scene = scene;
    this.camera = camera;

    const tooltip = document.getElementById('tooltip');
    const tooltipName = document.getElementById('tooltip-name');
    const tooltipMeta = document.getElementById('tooltip-meta');
    if (!tooltip || !tooltipName || !tooltipMeta) {
      throw new Error('Tooltip elements not found');
    }
    this.tooltipEl = tooltip;
    this.tooltipNameEl = tooltipName;
    this.tooltipMetaEl = tooltipMeta;

    this.generateData();
    this.createNodes();
    this.createEdges();
    this.initPositions();
    this.bindEvents();
  }

  private generateData(): void {
    const friendNames = [
      '张伟', '王芳', '李娜', '刘洋', '陈明', '杨丽', '赵磊', '黄燕', '周杰', '吴敏',
      '徐强', '孙丽', '朱军', '马红', '胡斌', '郭静', '林涛', '何雪', '高峰', '罗婷',
      '郑凯', '梁欣', '谢宇', '宋佳', '唐亮', '韩梅', '曹阳', '许娜', '邓辉', '萧蕾',
      '冯超', '程琳', '蔡波', '彭娟', '潘震', '田野', '董琪', '袁彬', '邱霞', '侯刚',
    ];
    const groupNames = [
      '技术交流群', '产品设计圈', '户外运动社', '读书会', '摄影爱好者',
      '美食探店团', '旅行结伴', '健身打卡群', '宠物铲屎官', '音乐分享会',
      '电影讨论组', '桌游俱乐部', '创业互助', '家长交流群', '车友会',
    ];
    const tagNames = [
      'JavaScript', 'React', 'Vue', 'TypeScript', 'Node.js', 'Python',
      '设计思维', 'UI/UX', '产品经理', '数据分析', '机器学习', '深度学习',
      '摄影', '旅行', '美食', '健身', '阅读', '音乐', '电影', '游戏',
      '篮球', '足球', '登山', '滑雪', '咖啡', '茶道', '投资', '理财', '职场', '心理学',
      '人工智能', '区块链', '云计算', '大数据', '物联网', '5G',
    ];

    let id = 0;

    friendNames.forEach((name) => {
      this.nodes.push({
        id: id++,
        name,
        category: 'friend',
        influence: Math.floor(Math.random() * 10) + 1,
      });
    });

    groupNames.forEach((name) => {
      this.nodes.push({
        id: id++,
        name,
        category: 'group',
        influence: Math.floor(Math.random() * 10) + 1,
      });
    });

    tagNames.forEach((name) => {
      this.nodes.push({
        id: id++,
        name,
        category: 'tag',
        influence: Math.floor(Math.random() * 10) + 1,
      });
    });

    for (let i = 0; i < this.nodes.length; i++) {
      const connectionCount = Math.floor(Math.random() * 5) + 2;
      const connected = new Set<number>();
      for (let j = 0; j < connectionCount; j++) {
        let target = Math.floor(Math.random() * this.nodes.length);
        let attempts = 0;
        while ((target === i || connected.has(target)) && attempts < 20) {
          target = Math.floor(Math.random() * this.nodes.length);
          attempts++;
        }
        if (target !== i && !connected.has(target)) {
          connected.add(target);
          const existingEdge = this.edges.find(
            (e) => (e.source === i && e.target === target) || (e.source === target && e.target === i),
          );
          if (!existingEdge) {
            this.edges.push({
              source: i,
              target,
              strength: Math.random() * 0.6 + 0.4,
            });
          }
        }
      }
    }
  }

  private createNodes(): void {
    this.nodes.forEach((node) => {
      const radius = this.influenceToRadius(node.influence);
      const geometry = new THREE.SphereGeometry(radius, 32, 32);
      const material = new THREE.MeshPhongMaterial({
        color: CATEGORY_COLORS[node.category],
        emissive: CATEGORY_COLORS[node.category],
        emissiveIntensity: 0.2,
        transparent: true,
        opacity: 1.0,
        shininess: 100,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData = { nodeId: node.id, baseRadius: radius, baseEmissiveIntensity: 0.2 };
      this.nodeMeshes.set(node.id, mesh);
      this.scene.add(mesh);
    });
  }

  private createEdges(): void {
    this.edges.forEach((edge) => {
      const key = this.edgeKey(edge.source, edge.target);
      const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: edge.strength * 0.5,
        depthWrite: false,
      });
      const line = new THREE.Line(geometry, material);
      line.userData = { edge, baseOpacity: edge.strength * 0.5 };
      this.edgeLines.set(key, line);
      this.scene.add(line);
    });
  }

  private edgeKey(a: number, b: number): string {
    return a < b ? `${a}-${b}` : `${b}-${a}`;
  }

  private influenceToRadius(influence: number): number {
    const minRadius = 0.3;
    const maxRadius = 1.2;
    return minRadius + ((influence - 1) / 9) * (maxRadius - minRadius);
  }

  private initPositions(): void {
    this.nodes.forEach((node) => {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 8 + Math.random() * 4;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      this.nodePositions.set(node.id, {
        x,
        y,
        z,
        vx: 0,
        vy: 0,
        vz: 0,
        targetX: x,
        targetY: y,
        targetZ: z,
      });
    });
    this.applyPositionsImmediate();
    this.updateEdgePositions();
  }

  private applyPositionsImmediate(): void {
    this.nodePositions.forEach((pos, id) => {
      const mesh = this.nodeMeshes.get(id);
      if (mesh) {
        mesh.position.set(pos.x, pos.y, pos.z);
      }
    });
  }

  private applyPositionTargets(): void {
    this.nodePositions.forEach((pos, id) => {
      const mesh = this.nodeMeshes.get(id);
      if (mesh) {
        mesh.position.set(pos.targetX, pos.targetY, pos.targetZ);
        pos.x = pos.targetX;
        pos.y = pos.targetY;
        pos.z = pos.targetZ;
      }
    });
  }

  private updateEdgePositions(): void {
    this.edges.forEach((edge) => {
      const key = this.edgeKey(edge.source, edge.target);
      const line = this.edgeLines.get(key);
      const sourcePos = this.nodePositions.get(edge.source);
      const targetPos = this.nodePositions.get(edge.target);
      if (line && sourcePos && targetPos) {
        const positions = line.geometry.attributes.position;
        positions.setXYZ(0, sourcePos.x, sourcePos.y, sourcePos.z);
        positions.setXYZ(1, targetPos.x, targetPos.y, targetPos.z);
        positions.needsUpdate = true;
      }
    });
  }

  private bindEvents(): void {
    this.container.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.container.addEventListener('click', this.onClick.bind(this));
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = Array.from(this.nodeMeshes.values()).filter((m) => m.visible);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const nodeId = intersects[0].object.userData.nodeId as number;
      if (nodeId !== this.hoveredNodeId) {
        this.setHoveredNode(nodeId);
      }
      if (this.onNodeHoverCallback) {
        const node = this.nodes.find((n) => n.id === nodeId) || null;
        this.onNodeHoverCallback(node, event.clientX, event.clientY);
      }
    } else {
      if (this.hoveredNodeId !== null) {
        this.setHoveredNode(null);
      }
      if (this.onNodeHoverCallback) {
        this.onNodeHoverCallback(null, event.clientX, event.clientY);
      }
    }
  }

  private onClick(event: MouseEvent): void {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = Array.from(this.nodeMeshes.values()).filter((m) => m.visible);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const nodeId = intersects[0].object.userData.nodeId as number;
      this.setSelectedNode(nodeId);
      if (this.onNodeClickCallback) {
        const node = this.nodes.find((n) => n.id === nodeId) || null;
        this.onNodeClickCallback(node);
      }
    } else {
      if (this.selectedNodeId !== null) {
        this.setSelectedNode(null);
      }
    }
  }

  private setHoveredNode(nodeId: number | null): void {
    if (this.hoveredNodeId !== null && this.hoveredNodeId !== this.selectedNodeId) {
      const mesh = this.nodeMeshes.get(this.hoveredNodeId);
      if (mesh) {
        const baseRadius = mesh.userData.baseRadius as number;
        mesh.scale.set(1, 1, 1);
        (mesh.material as THREE.MeshPhongMaterial).emissiveIntensity = mesh.userData.baseEmissiveIntensity;
        (mesh.geometry as THREE.SphereGeometry).dispose();
        mesh.geometry = new THREE.SphereGeometry(baseRadius, 32, 32);
      }
      this.hideTooltip();
    }

    this.hoveredNodeId = nodeId;

    if (nodeId !== null && nodeId !== this.selectedNodeId) {
      const mesh = this.nodeMeshes.get(nodeId);
      const node = this.nodes.find((n) => n.id === nodeId);
      if (mesh && node) {
        const baseRadius = mesh.userData.baseRadius as number;
        mesh.scale.set(1.3, 1.3, 1.3);
        (mesh.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.5;
        (mesh.geometry as THREE.SphereGeometry).dispose();
        mesh.geometry = new THREE.SphereGeometry(baseRadius, 32, 32);
        this.showTooltip(node);
      }
    } else if (nodeId !== null && nodeId === this.selectedNodeId) {
      const node = this.nodes.find((n) => n.id === nodeId);
      if (node) {
        this.showTooltip(node);
      }
    }
  }

  private setSelectedNode(nodeId: number | null): void {
    if (this.selectedNodeId !== null) {
      const prevMesh = this.nodeMeshes.get(this.selectedNodeId);
      if (prevMesh) {
        const baseRadius = prevMesh.userData.baseRadius as number;
        (prevMesh.material as THREE.MeshPhongMaterial).emissiveIntensity = prevMesh.userData.baseEmissiveIntensity;
        prevMesh.scale.set(1, 1, 1);
        (prevMesh.geometry as THREE.SphereGeometry).dispose();
        prevMesh.geometry = new THREE.SphereGeometry(baseRadius, 32, 32);
      }
    }

    this.selectedNodeId = nodeId;
    this.expandedConnections.clear();

    if (nodeId !== null) {
      const mesh = this.nodeMeshes.get(nodeId);
      if (mesh) {
        (mesh.material as THREE.MeshPhongMaterial).emissiveIntensity = 1.0;
        const baseRadius = mesh.userData.baseRadius as number;
        mesh.scale.set(1.4, 1.4, 1.4);
        (mesh.geometry as THREE.SphereGeometry).dispose();
        mesh.geometry = new THREE.SphereGeometry(baseRadius, 32, 32);
      }

      const connectedEdges = this.edges.filter((e) => e.source === nodeId || e.target === nodeId);
      connectedEdges.sort((a, b) => b.strength - a.strength);
      const maxConnections = Math.min(20, connectedEdges.length);
      for (let i = 0; i < maxConnections; i++) {
        const edge = connectedEdges[i];
        const otherId = edge.source === nodeId ? edge.target : edge.source;
        this.expandedConnections.add(otherId);
      }
    }

    this.updateVisibility();
  }

  private showTooltip(node: GraphNode): void {
    this.tooltipNameEl.textContent = node.name;
    this.tooltipMetaEl.textContent = `${CATEGORY_LABELS[node.category]} · 影响力 ${node.influence}`;
    this.tooltipEl.classList.add('visible');
  }

  private hideTooltip(): void {
    this.tooltipEl.classList.remove('visible');
  }

  updateTooltipPosition(x: number, y: number): void {
    const rect = this.tooltipEl.getBoundingClientRect();
    let left = x + 15;
    let top = y + 15;
    if (left + rect.width > window.innerWidth) {
      left = x - rect.width - 15;
    }
    if (top + rect.height > window.innerHeight) {
      top = y - rect.height - 15;
    }
    this.tooltipEl.style.left = `${left}px`;
    this.tooltipEl.style.top = `${top}px`;
  }

  public relayout(): void {
    this.isRelayouting = true;
    this.relayoutStartTime = performance.now();

    this.nodes.forEach((node) => {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 8 + Math.random() * 4;
      const pos = this.nodePositions.get(node.id);
      if (pos) {
        pos.targetX = r * Math.sin(phi) * Math.cos(theta);
        pos.targetY = r * Math.sin(phi) * Math.sin(theta);
        pos.targetZ = r * Math.cos(phi);
      }
    });

    setTimeout(() => {
      this.isRelayouting = false;
      this.applyPositionTargets();
      this.updateEdgePositions();
    }, this.relayoutDuration);
  }

  public setLineDensity(density: number): void {
    this.lineDensity = density;
    this.edgeLines.forEach((line) => {
      const edge = line.userData.edge as GraphEdge;
      const material = line.material as THREE.LineBasicMaterial;
      const shouldShow = edge.strength >= 1 - density;
      const targetOpacity = shouldShow ? edge.strength * density * 0.8 : 0;
      const startOpacity = material.opacity;
      const startTime = performance.now();
      const duration = 300;

      const animateOpacity = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        material.opacity = startOpacity + (targetOpacity - startOpacity) * progress;
        line.visible = material.opacity > 0.01;
        if (progress < 1) {
          requestAnimationFrame(animateOpacity);
        }
      };
      animateOpacity();
    });
  }

  public filterNodes(category: NodeCategory | 'all'): void {
    this.categoryFilter = category;
    this.updateVisibility();
  }

  private updateVisibility(): void {
    this.nodeMeshes.forEach((mesh, id) => {
      const node = this.nodes.find((n) => n.id === id);
      if (!node) return;

      const matchesCategory = this.categoryFilter === 'all' || node.category === this.categoryFilter;
      const isSelected = id === this.selectedNodeId;
      const isExpandedConnection = this.expandedConnections.has(id);
      const hasSelection = this.selectedNodeId !== null;

      const shouldBeVisible = matchesCategory && (!hasSelection || isSelected || isExpandedConnection);
      const material = mesh.material as THREE.MeshPhongMaterial;

      const targetOpacity = shouldBeVisible ? 1.0 : 0.05;
      const startOpacity = material.opacity;
      const startTime = performance.now();
      const duration = 500;

      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        material.opacity = startOpacity + (targetOpacity - startOpacity) * progress;
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      animate();
    });

    this.edgeLines.forEach((line) => {
      const edge = line.userData.edge as GraphEdge;
      const sourceMesh = this.nodeMeshes.get(edge.source);
      const targetMesh = this.nodeMeshes.get(edge.target);
      if (!sourceMesh || !targetMesh) return;

      const sourceVisible = (sourceMesh.material as THREE.MeshPhongMaterial).opacity > 0.5;
      const targetVisible = (targetMesh.material as THREE.MeshPhongMaterial).opacity > 0.5;
      const strengthOk = edge.strength >= 1 - this.lineDensity;
      const material = line.material as THREE.LineBasicMaterial;

      const shouldShow = sourceVisible && targetVisible && strengthOk;
      const targetOpacity = shouldShow ? edge.strength * this.lineDensity * 0.8 : 0;
      const startOpacity = material.opacity;
      const startTime = performance.now();
      const duration = 300;

      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        material.opacity = startOpacity + (targetOpacity - startOpacity) * progress;
        line.visible = material.opacity > 0.01;
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      animate();
    });
  }

  onNodeHover(callback: (node: GraphNode | null, x: number, y: number) => void): void {
    this.onNodeHoverCallback = callback;
  }

  onNodeClick(callback: (node: GraphNode | null) => void): void {
    this.onNodeClickCallback = callback;
  }

  update(deltaTime: number): void {
    if (this.isRelayouting) {
      const elapsed = performance.now() - this.relayoutStartTime;
      const progress = Math.min(elapsed / this.relayoutDuration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      this.nodePositions.forEach((pos) => {
        pos.x = pos.x + (pos.targetX - pos.x) * easeProgress * deltaTime * 3;
        pos.y = pos.y + (pos.targetY - pos.y) * easeProgress * deltaTime * 3;
        pos.z = pos.z + (pos.targetZ - pos.z) * easeProgress * deltaTime * 3;
      });
      this.applyPositionsImmediate();
      this.updateEdgePositions();
      return;
    }

    const repulsionStrength = 2.5;
    const attractionStrength = 0.008;
    const centerStrength = 0.005;
    const damping = 0.85;
    const maxVelocity = 0.5;

    const positionArray = Array.from(this.nodePositions.entries());

    for (let i = 0; i < positionArray.length; i++) {
      const [idA, posA] = positionArray[i];
      for (let j = i + 1; j < positionArray.length; j++) {
        const [idB, posB] = positionArray[j];
        if (idA === idB) continue;

        const dx = posA.x - posB.x;
        const dy = posA.y - posB.y;
        const dz = posA.z - posB.z;
        let distSq = dx * dx + dy * dy + dz * dz;
        if (distSq < 0.01) distSq = 0.01;
        const dist = Math.sqrt(distSq);
        const force = repulsionStrength / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fz = (dz / dist) * force;

        posA.vx += fx;
        posA.vy += fy;
        posA.vz += fz;
        posB.vx -= fx;
        posB.vy -= fy;
        posB.vz -= fz;
      }
    }

    this.edges.forEach((edge) => {
      const sourcePos = this.nodePositions.get(edge.source);
      const targetPos = this.nodePositions.get(edge.target);
      if (!sourcePos || !targetPos) return;

      const dx = targetPos.x - sourcePos.x;
      const dy = targetPos.y - sourcePos.y;
      const dz = targetPos.z - sourcePos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const idealDist = 3;
      const force = (dist - idealDist) * attractionStrength * edge.strength;

      if (dist > 0) {
        sourcePos.vx += (dx / dist) * force;
        sourcePos.vy += (dy / dist) * force;
        sourcePos.vz += (dz / dist) * force;
        targetPos.vx -= (dx / dist) * force;
        targetPos.vy -= (dy / dist) * force;
        targetPos.vz -= (dz / dist) * force;
      }
    });

    this.nodePositions.forEach((pos) => {
      pos.vx -= pos.x * centerStrength;
      pos.vy -= pos.y * centerStrength;
      pos.vz -= pos.z * centerStrength;

      pos.vx *= damping;
      pos.vy *= damping;
      pos.vz *= damping;

      const speed = Math.sqrt(pos.vx * pos.vx + pos.vy * pos.vy + pos.vz * pos.vz);
      if (speed > maxVelocity) {
        pos.vx = (pos.vx / speed) * maxVelocity;
        pos.vy = (pos.vy / speed) * maxVelocity;
        pos.vz = (pos.vz / speed) * maxVelocity;
      }

      pos.x += pos.vx;
      pos.y += pos.vy;
      pos.z += pos.vz;
    });

    this.applyPositionsImmediate();
    this.updateEdgePositions();
  }

  dispose(): void {
    this.container.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.container.removeEventListener('click', this.onClick.bind(this));

    this.nodeMeshes.forEach((mesh) => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });

    this.edgeLines.forEach((line) => {
      this.scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    });
  }
}
