import * as THREE from 'three';
import type { GeneNode } from './geneData';

export interface GeneMesh extends THREE.Mesh {
  userData: {
    gene: GeneNode;
    originalScale: number;
    isFiltered: boolean;
    targetOpacity: number;
  };
}

export interface GeneEdge extends THREE.Line {
  userData: {
    sourceId: string;
    targetId: string;
  };
}

export interface ScatterScene {
  group: THREE.Group;
  meshes: Map<string, GeneMesh>;
  edges: GeneEdge[];
  glowMeshes: Map<string, THREE.Mesh>;
}

const COLOR_LOW = new THREE.Color(0x1e90ff);
const COLOR_HIGH = new THREE.Color(0xff4500);

function lerpColor(t: number): THREE.Color {
  const clamped = Math.max(0, Math.min(1, t));
  return COLOR_LOW.clone().lerp(COLOR_HIGH, clamped);
}

function getRadius(expression: number): number {
  const t = expression / 100;
  return 0.3 + t * 0.5;
}

function createGlowMesh(radius: number, color: THREE.Color): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(radius * 1.8, 32, 32);
  const material = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geometry, material);
  (mesh as any).userData = { baseOpacity: 0.4 };
  return mesh;
}

export class GeneScatterBuilder {
  private scene: THREE.Scene;
  private scatterGroup: THREE.Group = new THREE.Group();
  private meshes: Map<string, GeneMesh> = new Map();
  private edges: GeneEdge[] = [];
  private glowMeshes: Map<string, THREE.Mesh> = new Map();
  private edgeGroup: THREE.Group = new THREE.Group();
  private nodeGroup: THREE.Group = new THREE.Group();
  private genes: GeneNode[] = [];
  private velocities: Map<string, THREE.Vector3> = new Map();
  private iterationCount: number = 0;
  private maxIterations: number = 100;
  private isSimulating: boolean = true;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.scatterGroup.add(this.edgeGroup);
    this.scatterGroup.add(this.nodeGroup);
    this.scene.add(this.scatterGroup);
  }

  public build(genes: GeneNode[]): ScatterScene {
    this.genes = genes;
    this.clear();

    for (const gene of genes) {
      this.createGeneMesh(gene);
    }

    this.createEdges(genes);
    this.initVelocities();

    return {
      group: this.scatterGroup,
      meshes: this.meshes,
      edges: this.edges,
      glowMeshes: this.glowMeshes
    };
  }

  private clear(): void {
    while (this.nodeGroup.children.length > 0) {
      const child = this.nodeGroup.children[0];
      this.nodeGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
    while (this.edgeGroup.children.length > 0) {
      const child = this.edgeGroup.children[0];
      this.edgeGroup.remove(child);
      if (child instanceof THREE.Line) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
    this.meshes.clear();
    this.edges = [];
    this.glowMeshes.clear();
    this.velocities.clear();
    this.iterationCount = 0;
    this.isSimulating = true;
  }

  private createGeneMesh(gene: GeneNode): void {
    const radius = getRadius(gene.expression);
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const color = lerpColor(gene.expression / 100);
    const material = new THREE.MeshPhongMaterial({
      color: color,
      emissive: color.clone().multiplyScalar(0.2),
      shininess: 80,
      transparent: true,
      opacity: 1.0
    });

    const mesh = new THREE.Mesh(geometry, material) as unknown as GeneMesh;
    mesh.position.set(gene.x, gene.y, gene.z);
    mesh.userData = {
      gene: gene,
      originalScale: radius,
      isFiltered: false,
      targetOpacity: 1.0
    };

    const glow = createGlowMesh(radius, color);
    glow.position.copy(mesh.position);

    this.nodeGroup.add(mesh);
    this.nodeGroup.add(glow);
    this.meshes.set(gene.id, mesh);
    this.glowMeshes.set(gene.id, glow);
  }

  private createEdges(genes: GeneNode[]): void {
    const geneMap = new Map(genes.map(g => [g.id, g]));
    const edgeKeys = new Set<string>();

    for (const gene of genes) {
      for (const relatedId of gene.relatedGenes) {
        const key = [gene.id, relatedId].sort().join('-');
        if (edgeKeys.has(key)) continue;
        edgeKeys.add(key);

        const related = geneMap.get(relatedId);
        if (!related) continue;

        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(gene.x, gene.y, gene.z),
          new THREE.Vector3(related.x, related.y, related.z)
        ]);
        const material = new THREE.LineBasicMaterial({
          color: 0x4fc3f7,
          transparent: true,
          opacity: 0.2
        });
        const line = new THREE.Line(geometry, material) as unknown as GeneEdge;
        line.userData = { sourceId: gene.id, targetId: relatedId };
        this.edgeGroup.add(line);
        this.edges.push(line);

        if (this.edges.length >= 200) break;
      }
      if (this.edges.length >= 200) break;
    }
  }

  private initVelocities(): void {
    for (const gene of this.genes) {
      this.velocities.set(gene.id, new THREE.Vector3(0, 0, 0));
    }
  }

  public update(delta: number): void {
    this.updateOpacities(delta);

    if (this.isSimulating && this.iterationCount < this.maxIterations) {
      this.simulateForces();
      this.iterationCount++;
      if (this.iterationCount >= this.maxIterations) {
        this.isSimulating = false;
      }
    }

    this.updateEdgePositions();
  }

  private simulateForces(): void {
    const damping = 0.9;
    const repulsionStrength = 8.0;
    const attractionStrength = 0.5;
    const centerStrength = 0.02;
    const maxDisplacement = 0.5;
    const visibleGenes = this.genes.filter(g => {
      const mesh = this.meshes.get(g.id);
      return mesh && !mesh.userData.isFiltered;
    });

    for (let i = 0; i < visibleGenes.length; i++) {
      for (let j = i + 1; j < visibleGenes.length; j++) {
        const a = visibleGenes[i];
        const b = visibleGenes[j];
        const meshA = this.meshes.get(a.id)!;
        const meshB = this.meshes.get(b.id)!;

        const diff = new THREE.Vector3().subVectors(meshA.position, meshB.position);
        const dist = Math.max(diff.length(), 0.1);
        const isRelated = a.relatedGenes.includes(b.id);
        const force = isRelated
          ? (dist - 3.0) * attractionStrength / dist
          : repulsionStrength / (dist * dist);

        diff.normalize().multiplyScalar(force * 0.1);
        this.velocities.get(a.id)!.add(diff);
        this.velocities.get(b.id)!.sub(diff);
      }
    }

    for (const gene of visibleGenes) {
      const mesh = this.meshes.get(gene.id)!;
      const vel = this.velocities.get(gene.id)!;

      const toCenter = new THREE.Vector3(0, 0, 0).sub(mesh.position);
      vel.add(toCenter.multiplyScalar(centerStrength));

      vel.multiplyScalar(damping);

      if (vel.length() > maxDisplacement) {
        vel.normalize().multiplyScalar(maxDisplacement);
      }

      mesh.position.add(vel);
      gene.x = mesh.position.x;
      gene.y = mesh.position.y;
      gene.z = mesh.position.z;

      const glow = this.glowMeshes.get(gene.id);
      if (glow) glow.position.copy(mesh.position);
    }
  }

  private updateEdgePositions(): void {
    for (const edge of this.edges) {
      const source = this.meshes.get(edge.userData.sourceId);
      const target = this.meshes.get(edge.userData.targetId);
      if (!source || !target) continue;

      const positions = edge.geometry.attributes.position;
      positions.setXYZ(0, source.position.x, source.position.y, source.position.z);
      positions.setXYZ(1, target.position.x, target.position.y, target.position.z);
      positions.needsUpdate = true;

      const visible = !source.userData.isFiltered && !target.userData.isFiltered;
      (edge.material as THREE.LineBasicMaterial).opacity = visible ? 0.2 : 0;
    }
  }

  private updateOpacities(delta: number): void {
    const fadeSpeed = 1.0 / 0.3;
    for (const [id, mesh] of this.meshes) {
      const material = mesh.material as THREE.MeshPhongMaterial;
      const target = mesh.userData.targetOpacity;
      const diff = target - material.opacity;
      if (Math.abs(diff) > 0.001) {
        material.opacity += Math.sign(diff) * Math.min(Math.abs(diff), fadeSpeed * delta);
        material.transparent = material.opacity < 0.99;
      }
      mesh.visible = material.opacity > 0.01;

      const glow = this.glowMeshes.get(id);
      if (glow) {
        const glowMat = glow.material as THREE.MeshBasicMaterial;
        if (material.opacity > 0.5) {
          const base = (glow as any).userData.baseOpacity || 0.4;
          glowMat.opacity = glowMat.opacity * 0.9 + base * 0.1;
        } else {
          glowMat.opacity *= 0.9;
        }
        glow.visible = glowMat.opacity > 0.01;
      }
    }
  }

  public applyThreshold(threshold: number): number {
    let visibleCount = 0;
    for (const [, mesh] of this.meshes) {
      const isFiltered = mesh.userData.gene.expression < threshold;
      mesh.userData.isFiltered = isFiltered;
      mesh.userData.targetOpacity = isFiltered ? 0 : 1.0;
      if (!isFiltered) visibleCount++;
    }
    this.restartSimulation();
    return visibleCount;
  }

  public restartSimulation(): void {
    this.iterationCount = 0;
    this.isSimulating = true;
    for (const vel of this.velocities.values()) {
      vel.set(0, 0, 0);
    }
  }

  public getMeshes(): Map<string, GeneMesh> {
    return this.meshes;
  }

  public getGeneById(id: string): GeneNode | undefined {
    return this.genes.find(g => g.id === id);
  }

  public getScatterGroup(): THREE.Group {
    return this.scatterGroup;
  }

  public highlightGene(id: string | null): void {
    for (const [gid, mesh] of this.meshes) {
      const isHighlighted = gid === id;
      const targetScale = isHighlighted ? 1.5 : 1.0;
      mesh.scale.setScalar(targetScale);

      const glow = this.glowMeshes.get(gid);
      if (glow) {
        (glow as any).userData.baseOpacity = isHighlighted ? 0.6 : 0.15;
        glow.scale.setScalar(isHighlighted ? 1.2 : 1.0);
      }
    }
  }

  public getSnapshot(width: number = 1920, height: number = 1080): string {
    const renderer = (this.scene.userData as any).renderer as THREE.WebGLRenderer | undefined;
    if (!renderer) return '';
    const originalSize = renderer.getSize(new THREE.Vector2());
    renderer.setSize(width, height, false);
    renderer.render(this.scene, (this.scene.userData as any).camera);
    const url = renderer.domElement.toDataURL('image/png');
    renderer.setSize(originalSize.x, originalSize.y, false);
    return url;
  }
}
