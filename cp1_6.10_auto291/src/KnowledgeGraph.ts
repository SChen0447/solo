import * as THREE from 'three';
import { KnowledgeNode, KnowledgeEdge, THEME_COLORS, knowledgeNodes, knowledgeEdges } from './data';

const NODE_RADIUS = 0.4;
const EDGE_RADIUS_WEAK = 0.02;
const EDGE_RADIUS_MEDIUM = 0.05;
const EDGE_RADIUS_STRONG = 0.10;
const STAR_COUNT = 200;
const STAR_RADIUS = 0.02;
const GLOW_INNER_RADIUS = 0.45;
const GLOW_OUTER_RADIUS = 1.0;

const STRENGTH_RADIUS: Record<string, number> = {
  weak: EDGE_RADIUS_WEAK,
  medium: EDGE_RADIUS_MEDIUM,
  strong: EDGE_RADIUS_STRONG
};

interface NodeData {
  node: KnowledgeNode;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  mesh: THREE.Mesh;
  glowMesh: THREE.Mesh | null;
  baseScale: number;
  targetScale: number;
  baseOpacity: number;
  targetOpacity: number;
  connectedIds: Set<string>;
}

interface EdgeData {
  edge: KnowledgeEdge;
  mesh: THREE.Mesh;
  baseOpacity: number;
  targetOpacity: number;
  sourceId: string;
  targetId: string;
}

export class KnowledgeGraph {
  public scene: THREE.Scene;
  public nodesGroup: THREE.Group;
  public edgesGroup: THREE.Group;
  public starsGroup: THREE.Group;

  private nodeMap: Map<string, NodeData> = new Map();
  private edgeList: EdgeData[] = [];
  private nodes: NodeData[] = [];

  private isMobile: boolean;
  private lineThicknessMultiplier: number;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.nodesGroup = new THREE.Group();
    this.edgesGroup = new THREE.Group();
    this.starsGroup = new THREE.Group();
    this.scene.add(this.nodesGroup);
    this.scene.add(this.edgesGroup);
    this.scene.add(this.starsGroup);

    this.isMobile = window.innerWidth < 768;
    this.lineThicknessMultiplier = this.isMobile ? 1.3 : 1.0;

    window.addEventListener('resize', () => {
      this.isMobile = window.innerWidth < 768;
      this.lineThicknessMultiplier = this.isMobile ? 1.3 : 1.0;
    });

    this.createStars();
    this.buildGraph();
  }

  private createStars(): void {
    const geometry = new THREE.SphereGeometry(STAR_RADIUS, 6, 6);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });

    for (let i = 0; i < STAR_COUNT; i++) {
      const star = new THREE.Mesh(geometry, material.clone());
      const radius = 8 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      star.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );
      (star.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.random() * 0.7;
      (star.userData as { twinkleSpeed: number; twinkleOffset: number }) = {
        twinkleSpeed: 0.5 + Math.random() * 1.5,
        twinkleOffset: Math.random() * Math.PI * 2
      };
      this.starsGroup.add(star);
    }
  }

  private buildGraph(): void {
    const connectionMap = new Map<string, Set<string>>();
    for (const node of knowledgeNodes) {
      connectionMap.set(node.id, new Set());
    }
    for (const edge of knowledgeEdges) {
      connectionMap.get(edge.source)?.add(edge.target);
      connectionMap.get(edge.target)?.add(edge.source);
    }

    for (const node of knowledgeNodes) {
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6
      );
      const mesh = this.createNodeMesh(node);
      mesh.position.copy(position);
      this.nodesGroup.add(mesh);

      const nodeData: NodeData = {
        node,
        position,
        velocity: new THREE.Vector3(),
        mesh,
        glowMesh: null,
        baseScale: 1.0,
        targetScale: 1.0,
        baseOpacity: 1.0,
        targetOpacity: 1.0,
        connectedIds: connectionMap.get(node.id) || new Set()
      };
      this.nodeMap.set(node.id, nodeData);
      this.nodes.push(nodeData);
    }

    for (const edge of knowledgeEdges) {
      const sourceData = this.nodeMap.get(edge.source);
      const targetData = this.nodeMap.get(edge.target);
      if (!sourceData || !targetData) continue;

      const mesh = this.createEdgeMesh(edge, sourceData.node, targetData.node);
      this.edgesGroup.add(mesh);

      this.edgeList.push({
        edge,
        mesh,
        baseOpacity: 0.3,
        targetOpacity: 0.3,
        sourceId: edge.source,
        targetId: edge.target
      });
    }

    this.runForceLayout();
  }

  private createNodeMesh(nodeData: KnowledgeNode): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(NODE_RADIUS, 32, 32);
    const color = new THREE.Color(THEME_COLORS[nodeData.theme]);
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 1.0,
      roughness: 0.3,
      metalness: 0.2
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { id: nodeData.id, type: 'node' };
    return mesh;
  }

  private createEdgeMesh(
    edge: KnowledgeEdge,
    sourceData: KnowledgeNode,
    targetData: KnowledgeNode
  ): THREE.Mesh {
    const radius = STRENGTH_RADIUS[edge.strength] * this.lineThicknessMultiplier;
    const sourceColor = new THREE.Color(THEME_COLORS[sourceData.theme]);
    const targetColor = new THREE.Color(THEME_COLORS[targetData.theme]);

    const geometry = new THREE.CylinderGeometry(radius, radius, 1, 16, 1);
    const material = this.createGradientMaterial(sourceColor, targetColor);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { type: 'edge' };
    return mesh;
  }

  private createGradientMaterial(color1: THREE.Color, color2: THREE.Color): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        color1: { value: color1 },
        color2: { value: color2 },
        opacity: { value: 0.3 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        uniform float opacity;
        varying vec2 vUv;
        void main() {
          vec3 color = mix(color1, color2, vUv.y);
          gl_FragColor = vec4(color, opacity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
  }

  private updateEdgeMesh(edgeData: EdgeData): void {
    const source = this.nodeMap.get(edgeData.sourceId);
    const target = this.nodeMap.get(edgeData.targetId);
    if (!source || !target) return;

    const start = source.mesh.position;
    const end = target.mesh.position;
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

    edgeData.mesh.position.copy(midpoint);
    edgeData.mesh.scale.y = length;
    direction.normalize();

    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
    edgeData.mesh.quaternion.copy(quaternion);
  }

  private runForceLayout(): void {
    const iterations = 150;
    const repulsionStrength = 0.8;
    const attractionStrength = 0.02;
    const damping = 0.85;
    const centerStrength = 0.01;

    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < this.nodes.length; i++) {
        for (let j = i + 1; j < this.nodes.length; j++) {
          const a = this.nodes[i];
          const b = this.nodes[j];
          const diff = new THREE.Vector3().subVectors(a.position, b.position);
          let dist = diff.length();
          if (dist < 0.1) dist = 0.1;
          const force = repulsionStrength / (dist * dist);
          diff.normalize().multiplyScalar(force);
          a.velocity.add(diff);
          b.velocity.sub(diff);
        }
      }

      for (const edgeData of this.edgeList) {
        const source = this.nodeMap.get(edgeData.sourceId);
        const target = this.nodeMap.get(edgeData.targetId);
        if (!source || !target) continue;

        const diff = new THREE.Vector3().subVectors(target.position, source.position);
        const dist = diff.length();
        const strengthMultiplier = edgeData.edge.strength === 'strong' ? 1.5 :
          edgeData.edge.strength === 'medium' ? 1.0 : 0.6;
        const force = (dist - 3.0) * attractionStrength * strengthMultiplier;
        diff.normalize().multiplyScalar(force);
        source.velocity.add(diff);
        target.velocity.sub(diff);
      }

      for (const nodeData of this.nodes) {
        const toCenter = new THREE.Vector3().copy(nodeData.position).negate();
        toCenter.multiplyScalar(centerStrength);
        nodeData.velocity.add(toCenter);

        nodeData.velocity.multiplyScalar(damping);
        nodeData.position.add(nodeData.velocity);
      }
    }

    for (const nodeData of this.nodes) {
      nodeData.mesh.position.copy(nodeData.position);
    }
    for (const edgeData of this.edgeList) {
      this.updateEdgeMesh(edgeData);
    }
  }

  public update(time: number): void {
    for (const nodeData of this.nodes) {
      const pulse = 0.6 + 0.4 * Math.sin(time * Math.PI + nodeData.node.id.charCodeAt(0));
      const material = nodeData.mesh.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = pulse;

      const currentScale = nodeData.mesh.scale.x;
      const newScale = currentScale + (nodeData.targetScale - currentScale) * 0.1;
      nodeData.mesh.scale.setScalar(newScale);

      material.opacity = material.opacity + (nodeData.targetOpacity - material.opacity) * 0.1;

      if (nodeData.glowMesh) {
        const glowScale = newScale * (GLOW_OUTER_RADIUS / NODE_RADIUS);
        nodeData.glowMesh.scale.setScalar(glowScale);
        const glowMat = nodeData.glowMesh.material as THREE.MeshBasicMaterial;
        glowMat.opacity = glowMat.opacity + ((nodeData.targetScale > 1.2 ? 0.35 : 0) - glowMat.opacity) * 0.1;
      }
    }

    for (const edgeData of this.edgeList) {
      this.updateEdgeMesh(edgeData);
      const material = edgeData.mesh.material as THREE.ShaderMaterial;
      material.uniforms.opacity.value = material.uniforms.opacity.value +
        (edgeData.targetOpacity - material.uniforms.opacity.value) * 0.1;
    }

    const stars = this.starsGroup.children as THREE.Mesh[];
    for (const star of stars) {
      const userData = star.userData as { twinkleSpeed: number; twinkleOffset: number };
      const mat = star.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(time * userData.twinkleSpeed * Math.PI * 2 + userData.twinkleOffset));
    }
  }

  public getNodeMeshById(id: string): THREE.Mesh | null {
    return this.nodeMap.get(id)?.mesh || null;
  }

  public getNodeDataById(id: string): KnowledgeNode | null {
    return this.nodeMap.get(id)?.node || null;
  }

  public getConnectedNodeIds(id: string): string[] {
    return Array.from(this.nodeMap.get(id)?.connectedIds || []);
  }

  public getNodeIds(): string[] {
    return Array.from(this.nodeMap.keys());
  }

  public getAllNodeMeshes(): THREE.Mesh[] {
    return this.nodes.map(n => n.mesh);
  }

  public setHoverState(nodeId: string | null): void {
    for (const [id, nodeData] of this.nodeMap) {
      if (nodeId && id === nodeId) {
        nodeData.targetScale = 1.5;
        if (!nodeData.glowMesh) {
          nodeData.glowMesh = this.createGlowMesh(nodeData.node);
          nodeData.glowMesh.position.copy(nodeData.mesh.position);
          this.nodesGroup.add(nodeData.glowMesh);
        }
      } else {
        if (nodeData.targetScale !== 1.8) {
          nodeData.targetScale = 1.0;
        }
      }
    }
  }

  private createGlowMesh(nodeData: KnowledgeNode): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(GLOW_OUTER_RADIUS, 32, 32);
    const color = new THREE.Color(THEME_COLORS[nodeData.theme]);
    const material = new THREE.MeshBasicMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { type: 'glow' };
    return mesh;
  }

  public setSelectedState(selectedId: string | null): void {
    if (!selectedId) {
      for (const nodeData of this.nodes) {
        nodeData.targetOpacity = 1.0;
        nodeData.targetScale = 1.0;
      }
      for (const edgeData of this.edgeList) {
        edgeData.targetOpacity = 0.3;
      }
      return;
    }

    const selectedNode = this.nodeMap.get(selectedId);
    if (!selectedNode) return;

    const connectedIds = selectedNode.connectedIds;

    for (const [id, nodeData] of this.nodeMap) {
      if (id === selectedId || connectedIds.has(id)) {
        nodeData.targetOpacity = 1.0;
        nodeData.targetScale = 1.8;
      } else {
        nodeData.targetOpacity = 0.15;
        nodeData.targetScale = 1.0;
      }
    }

    for (const edgeData of this.edgeList) {
      if (edgeData.sourceId === selectedId || edgeData.targetId === selectedId) {
        edgeData.targetOpacity = 0.8;
      } else {
        edgeData.targetOpacity = 0.05;
      }
    }
  }

  public clearSelection(): void {
    this.setSelectedState(null);
    for (const nodeData of this.nodes) {
      if (nodeData.glowMesh) {
        this.nodesGroup.remove(nodeData.glowMesh);
        nodeData.glowMesh.geometry.dispose();
        (nodeData.glowMesh.material as THREE.Material).dispose();
        nodeData.glowMesh = null;
      }
    }
  }
}
