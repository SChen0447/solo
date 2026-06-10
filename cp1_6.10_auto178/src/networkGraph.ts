import * as THREE from 'three';

const COLOR_PALETTE = [
  '#e74c3c',
  '#3498db',
  '#2ecc71',
  '#f1c40f',
  '#9b59b6',
  '#e67e22'
];

const FUNCTION_NAMES = [
  'initApp', 'fetchData', 'parseJSON', 'renderUI', 'handleClick',
  'validateInput', 'sendRequest', 'processResponse', 'updateState', 'getConfig',
  'logEvent', 'calcHash', 'encryptData', 'decryptData', 'formatDate',
  'sortArray', 'filterList', 'mapTransform', 'reduceSum', 'findItem',
  'debounceFn', 'throttleReq', 'cacheGet', 'cacheSet', 'routePath',
  'authToken', 'permCheck', 'dbQuery', 'dbInsert', 'dbUpdate',
  'serialize', 'deserialize', 'compress', 'decompress', 'streamRead', 'streamWrite'
];

export interface CallChainNode {
  id: string;
  name: string;
  level: number;
  children?: CallChainNode[];
}

export interface NodeData {
  id: string;
  name: string;
  color: string;
  baseRadius: number;
  position: { x: number; y: number; z: number };
  callCount: number;
  avgDuration: number;
  callChain: CallChainNode[];
}

export interface GraphConfig {
  nodeScale: number;
  lineOpacity: number;
  rotationSpeed: number;
}

interface NodeInternalData {
  data: NodeData;
  baseRadius: number;
  hovered: boolean;
  pulsePhase: number;
}

export class NetworkGraph {
  nodes: Map<string, THREE.Mesh> = new Map();
  nodeGroup: THREE.Group;
  connections: THREE.LineSegments | null = null;
  private nodeDataMap: Map<string, NodeInternalData> = new Map();
  private connectionData: Array<{ source: string; target: string; color: string }> = [];
  private lineMaterials: THREE.LineBasicMaterial[] = [];
  private scene: THREE.Scene;
  config: GraphConfig = {
    nodeScale: 1,
    lineOpacity: 0.4,
    rotationSpeed: 45
  };
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private isMobile = window.innerWidth < 768;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.nodeGroup = new THREE.Group();
    this.scene.add(this.nodeGroup);
    this.generateNodes();
    this.generateConnections();
  }

  private generateNodes(): void {
    const nodeCount = 36;
    const spread = 8;

    for (let i = 0; i < nodeCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = spread * (0.5 + Math.random() * 0.5);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      const z = r * Math.cos(phi);

      const color = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
      const baseRadius = 0.3 + Math.random() * 0.3;

      const id = `node-${i}`;
      const name = FUNCTION_NAMES[i % FUNCTION_NAMES.length] + '_' + i;

      const nodeData: NodeData = {
        id,
        name,
        color,
        baseRadius,
        position: { x, y, z },
        callCount: Math.floor(Math.random() * 1000) + 100,
        avgDuration: parseFloat((Math.random() * 50 + 5).toFixed(2)),
        callChain: this.generateCallChain(name, 0)
      };

      const geometry = new THREE.SphereGeometry(baseRadius, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.3,
        metalness: 0.3,
        roughness: 0.4
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.userData.nodeId = id;
      this.nodeGroup.add(mesh);
      this.nodes.set(id, mesh);

      this.nodeDataMap.set(id, {
        data: nodeData,
        baseRadius,
        hovered: false,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }
  }

  private generateCallChain(parentName: string, level: number): CallChainNode[] {
    if (level >= 3) return [];
    
    const count = Math.floor(Math.random() * 3) + 1;
    const result: CallChainNode[] = [];
    
    for (let i = 0; i < count; i++) {
      const id = `chain-${level}-${parentName}-${i}`;
      result.push({
        id,
        name: `${parentName}_sub${i + 1}`,
        level: level + 1,
        children: this.generateCallChain(`${parentName}_sub${i + 1}`, level + 1)
      });
    }
    
    return result;
  }

  private generateConnections(): void {
    const nodeIds = Array.from(this.nodes.keys());
    const positions: Array<[number, number, number]> = [];
    
    nodeIds.forEach(id => {
      const mesh = this.nodes.get(id)!;
      positions.push([mesh.position.x, mesh.position.y, mesh.position.z]);
    });

    const vertices: number[] = [];
    const colors: number[] = [];
    
    for (let i = 0; i < nodeIds.length; i++) {
      const distances: { idx: number; dist: number }[] = [];
      
      for (let j = 0; j < nodeIds.length; j++) {
        if (i === j) continue;
        const dx = positions[i][0] - positions[j][0];
        const dy = positions[i][1] - positions[j][1];
        const dz = positions[i][2] - positions[j][2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        distances.push({ idx: j, dist });
      }
      
      distances.sort((a, b) => a.dist - b.dist);
      
      const connectCount = 2 + Math.floor(Math.random() * 2);
      for (let k = 0; k < connectCount && k < distances.length; k++) {
        const j = distances[k].idx;
        if (j <= i) continue;

        const sourceData = this.nodeDataMap.get(nodeIds[i])!;
        const sourceColor = new THREE.Color(sourceData.data.color);

        vertices.push(
          positions[i][0], positions[i][1], positions[i][2],
          positions[j][0], positions[j][1], positions[j][2]
        );
        colors.push(
          sourceColor.r, sourceColor.g, sourceColor.b,
          sourceColor.r, sourceColor.g, sourceColor.b
        );

        this.connectionData.push({
          source: nodeIds[i],
          target: nodeIds[j],
          color: sourceData.data.color
        });
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: this.config.lineOpacity
    });
    this.lineMaterials.push(material);

    this.connections = new THREE.LineSegments(geometry, material);
    this.nodeGroup.add(this.connections);
  }

  update(time: number): void {
    if (this.config.rotationSpeed > 0) {
      const angularSpeed = (2 * Math.PI) / (this.config.rotationSpeed * 1000);
      this.nodeGroup.rotation.y = time * angularSpeed;
    }

    if (!this.isMobile) {
      const pulsePeriod = 3000;
      const pulseAmplitude = 0.1;

      this.nodes.forEach((mesh, id) => {
        const internal = this.nodeDataMap.get(id);
        if (!internal) return;

        const pulseT = (time + internal.pulsePhase * 1000) % pulsePeriod;
        const pulseFactor = 1 + Math.sin((pulseT / pulsePeriod) * Math.PI * 2) * pulseAmplitude;

        const hoverScale = internal.hovered ? 1.3 : 1;
        const scale = internal.baseRadius * this.config.nodeScale * pulseFactor * hoverScale;
        
        mesh.scale.setScalar(scale / internal.baseRadius);

        const material = mesh.material as THREE.MeshStandardMaterial;
        if (internal.hovered) {
          material.emissiveIntensity = 0.8;
        } else {
          const pulseGlow = 0.3 + Math.sin((pulseT / pulsePeriod) * Math.PI * 2) * 0.1;
          material.emissiveIntensity = pulseGlow;
        }
      });
    }
  }

  getNodeInfo(nodeId: string): NodeData | null {
    const internal = this.nodeDataMap.get(nodeId);
    return internal ? internal.data : null;
  }

  handleNodeHover(nodeId: string | null): void {
    this.nodeDataMap.forEach((internal, id) => {
      internal.hovered = (id === nodeId);
      const mesh = this.nodes.get(id);
      if (!mesh) return;

      const material = mesh.material as THREE.MeshStandardMaterial;
      if (internal.hovered) {
        material.emissive.setHex(0xffffff);
        material.emissiveIntensity = 0.8;
      } else {
        material.emissive.set(internal.data.color);
      }
    });
  }

  handleNodeClick(nodeId: string): NodeData | null {
    return this.getNodeInfo(nodeId);
  }

  setNodeScale(scale: number): void {
    this.config.nodeScale = scale;
  }

  setLineOpacity(opacity: number): void {
    this.config.lineOpacity = opacity;
    this.lineMaterials.forEach(mat => {
      mat.opacity = opacity;
    });
  }

  setRotationSpeed(speed: number): void {
    this.config.rotationSpeed = speed;
  }

  getNodePosition(nodeId: string): THREE.Vector3 | null {
    const mesh = this.nodes.get(nodeId);
    if (!mesh) return null;
    const worldPos = new THREE.Vector3();
    mesh.getWorldPosition(worldPos);
    return worldPos;
  }

  getIntersectedNode(clientX: number, clientY: number, camera: THREE.Camera): string | null {
    const rect = this.nodeGroup.parent?.children[0] as THREE.WebGLRenderer | undefined;
    const canvas = camera.userData.canvas || document.querySelector('canvas');
    if (!canvas) return null;
    
    const canvasRect = (canvas as HTMLCanvasElement).getBoundingClientRect();
    this.mouse.x = ((clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
    this.mouse.y = -((clientY - canvasRect.top) / canvasRect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, camera);
    const meshes = Array.from(this.nodes.values());
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      return intersects[0].object.userData.nodeId as string;
    }
    return null;
  }

  setMobileMode(isMobile: boolean): void {
    this.isMobile = isMobile;
  }
}
