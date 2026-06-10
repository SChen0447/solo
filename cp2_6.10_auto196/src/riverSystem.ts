import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';

export interface RiverNode {
  id: string;
  position: THREE.Vector3;
  speed: number;
  width: number;
  depth: number;
}

export interface RiverSegment {
  id: string;
  startNode: RiverNode;
  endNode: RiverNode;
  particles: RiverParticle[];
  particleCount: number;
  baseSpeed: number;
  isTributary: boolean;
  tributaryIndex: number;
  mesh: THREE.Line;
  width: number;
  depth: number;
  highlighted: boolean;
}

export interface RiverParticle {
  id: string;
  segmentId: string;
  progress: number;
  speed: number;
  offset: THREE.Vector3;
  mesh: THREE.Points;
  originalColor: THREE.Color;
}

export interface RiverParams {
  flowSpeed: number;
  meander: number;
  tributaryCount: number;
  waterLevel: number;
}

export interface RiverSystemData {
  nodes: { id: string; x: number; y: number; z: number; speed: number; width: number; depth: number }[];
  segments: { id: string; startId: string; endId: string; particleCount: number; baseSpeed: number; isTributary: boolean; width: number; depth: number }[];
  params: RiverParams;
  exportTime: string;
}

export class RiverSystem {
  private scene: THREE.Scene;
  public nodes: RiverNode[] = [];
  public segments: RiverSegment[] = [];
  public waterMeshes: THREE.Mesh[] = [];
  private particleMaterials: THREE.PointsMaterial[] = [];
  private allParticleMeshes: THREE.Points[] = [];
  public params: RiverParams = {
    flowSpeed: 1.0,
    meander: 0.5,
    tributaryCount: 2,
    waterLevel: 0
  };

  private readonly SOURCE_COLOR = new THREE.Color(0x0077b6);
  private readonly MOUTH_COLOR = new THREE.Color(0xcaf0f8);
  private readonly TRIBUTARY_COLOR = new THREE.Color(0x48cae4);
  private readonly HIGHLIGHT_COLOR = new THREE.Color(0xf0f8ff);
  private readonly WATER_COLOR = new THREE.Color(0x90e0ef);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public generate(): void {
    this.clear();

    const nodeCount = Math.floor(Math.random() * 11) + 15;
    this.nodes = this.generateMainPath(nodeCount, this.params.meander);
    this.segments = this.createSegments(this.nodes, false, -1);
    this.createTributaries();
    this.createWaterSurfaces();
    this.createTerrainOutline();
  }

  private generateMainPath(nodeCount: number, meander: number): RiverNode[] {
    const nodes: RiverNode[] = [];
    const startX = -60;
    const endX = 60;
    const stepX = (endX - startX) / (nodeCount - 1);
    const meanderAmp = meander * 20;

    let prevZ = 0;
    for (let i = 0; i < nodeCount; i++) {
      const t = i / (nodeCount - 1);
      const x = startX + stepX * i;
      const noise = this.simplexNoise(x * 0.08, i * 0.3) * meanderAmp;
      const z = noise + (Math.random() - 0.5) * meanderAmp * 0.4;
      const y = -t * 3 + (Math.random() - 0.5) * 0.5 + this.params.waterLevel;

      const width = 2 + t * 3 + Math.random() * 1.5;
      const depth = 0.5 + t * 1.5 + Math.random() * 0.5;
      const speed = 0.5 + Math.random() * 1.0;

      nodes.push({
        id: uuidv4(),
        position: new THREE.Vector3(x, y, z),
        speed,
        width,
        depth
      });

      prevZ = z;
    }

    return nodes;
  }

  private simplexNoise(x: number, y: number): number {
    return Math.sin(x * 1.5 + y * 0.8) * 0.5 + Math.cos(x * 0.7 - y * 1.1) * 0.3 + Math.sin((x + y) * 0.4) * 0.2;
  }

  private createSegments(nodes: RiverNode[], isTributary: boolean, tributaryIndex: number): RiverSegment[] {
    const segments: RiverSegment[] = [];

    for (let i = 0; i < nodes.length - 1; i++) {
      const startNode = nodes[i];
      const endNode = nodes[i + 1];
      const particleCount = Math.floor(Math.random() * 301) + 200;

      const segmentId = uuidv4();
      const particles = this.createParticlesForSegment(segmentId, startNode, endNode, particleCount, isTributary, i, nodes.length - 1);

      const lineGeometry = new THREE.BufferGeometry().setFromPoints([startNode.position, endNode.position]);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: isTributary ? this.TRIBUTARY_COLOR : this.SOURCE_COLOR.clone().lerp(this.MOUTH_COLOR, i / (nodes.length - 2)),
        transparent: true,
        opacity: 0.15
      });
      const lineMesh = new THREE.Line(lineGeometry, lineMaterial);
      lineMesh.visible = false;
      lineMesh.userData.segmentId = segmentId;
      this.scene.add(lineMesh);

      const avgWidth = (startNode.width + endNode.width) / 2;
      const avgDepth = (startNode.depth + endNode.depth) / 2;

      segments.push({
        id: segmentId,
        startNode,
        endNode,
        particles,
        particleCount,
        baseSpeed: (startNode.speed + endNode.speed) / 2,
        isTributary,
        tributaryIndex,
        mesh: lineMesh,
        width: avgWidth,
        depth: avgDepth,
        highlighted: false
      });
    }

    return segments;
  }

  private createParticlesForSegment(
    segmentId: string,
    startNode: RiverNode,
    endNode: RiverNode,
    count: number,
    isTributary: boolean,
    segIndex: number,
    totalSegs: number
  ): RiverParticle[] {
    const particles: RiverParticle[] = [];

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const color = isTributary
      ? this.TRIBUTARY_COLOR.clone()
      : this.SOURCE_COLOR.clone().lerp(this.MOUTH_COLOR, segIndex / Math.max(totalSegs - 1, 1));

    for (let i = 0; i < count; i++) {
      const progress = Math.random();
      const offsetPerp = (Math.random() - 0.5) * (startNode.width + endNode.width) / 2 * 0.6;
      const offsetY = (Math.random() - 0.5) * 0.8;

      const direction = new THREE.Vector3().subVectors(endNode.position, startNode.position).normalize();
      const perp = new THREE.Vector3(-direction.z, 0, direction.x).normalize().multiplyScalar(offsetPerp);

      const basePos = new THREE.Vector3().lerpVectors(startNode.position, endNode.position, progress);
      const pos = basePos.add(perp).add(new THREE.Vector3(0, offsetY, 0));

      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 0.15 + Math.random() * 0.15;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.25,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    const points = new THREE.Points(geometry, material);
    points.userData.segmentId = segmentId;
    points.userData.isParticle = true;
    this.scene.add(points);
    this.allParticleMeshes.push(points);
    this.particleMaterials.push(material);

    for (let i = 0; i < count; i++) {
      particles.push({
        id: uuidv4(),
        segmentId,
        progress: (i / count) + Math.random() * 0.01,
        speed: 0.002 + Math.random() * 0.003,
        offset: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.5
        ),
        mesh: points,
        originalColor: color.clone()
      });
    }

    return particles;
  }

  private createTributaries(): void {
    for (let t = 0; t < this.params.tributaryCount; t++) {
      const mainSegIndex = Math.floor(Math.random() * (this.segments.length - 3)) + 2;
      const mainSegment = this.segments[mainSegIndex];
      const startPos = mainSegment.startNode.position.clone();

      const isLeft = Math.random() > 0.5;
      const direction = new THREE.Vector3().subVectors(mainSegment.endNode.position, mainSegment.startNode.position).normalize();
      const perp = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(isLeft ? 1 : -1);

      const tribNodeCount = Math.floor(Math.random() * 6) + 5;
      const tribNodes: RiverNode[] = [];

      let currentPos = startPos.clone();
      for (let i = 0; i < tribNodeCount; i++) {
        const tProg = i / (tribNodeCount - 1);
        const alongPerp = perp.clone().multiplyScalar(5 + tProg * 15);
        const alongMain = direction.clone().multiplyScalar((Math.random() - 0.3) * 8);
        const noise = new THREE.Vector3(
          Math.random() * 3,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 5
        );

        const pos = startPos.clone().add(alongPerp).add(alongMain).add(noise);
        const width = 1 + Math.random() * 1.5;
        const depth = 0.3 + Math.random() * 0.5;
        const speed = 0.4 + Math.random() * 0.8;

        tribNodes.push({
          id: uuidv4(),
          position: pos,
          speed,
          width,
          depth
        });

        currentPos = pos;
      }

      tribNodes.reverse();
      tribNodes.push({
        id: uuidv4(),
        position: mainSegment.startNode.position.clone(),
        speed: mainSegment.baseSpeed,
        width: mainSegment.width,
        depth: mainSegment.depth
      });

      const tribSegments = this.createSegments(tribNodes, true, t);
      this.segments.push(...tribSegments);
      this.nodes.push(...tribNodes);
    }
  }

  private createWaterSurfaces(): void {
    for (const segment of this.segments) {
      this.createSegmentWaterSurface(segment);
    }
  }

  private createSegmentWaterSurface(segment: RiverSegment): void {
    const width = segment.width * (1 + this.params.waterLevel + 0.5) * 1.5;
    const start = segment.startNode.position;
    const end = segment.endNode.position;

    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    direction.normalize();

    const perp = new THREE.Vector3(-direction.z, 0, direction.x).normalize();

    const shape = new THREE.Shape();
    const hw = width / 2;

    shape.moveTo(-hw, 0);
    shape.lineTo(length + hw * 0.5, 0);
    shape.quadraticCurveTo(length + hw, 0, length + hw, hw * 0.3);
    shape.lineTo(length + hw * 0.3, hw * 0.5);
    shape.lineTo(-hw * 0.3, hw * 0.5);
    shape.quadraticCurveTo(-hw, hw * 0.3, -hw, 0);

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({
      color: this.WATER_COLOR,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;

    const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    mesh.position.copy(center);
    mesh.position.y = start.y + 0.05 + this.params.waterLevel * 0.3;

    const angle = Math.atan2(direction.z, direction.x);
    mesh.rotation.z = -angle;

    mesh.userData.segmentId = segment.id;
    mesh.userData.baseOpacity = 0.3;
    mesh.userData.baseWidth = width;

    this.scene.add(mesh);
    this.waterMeshes.push(mesh);
  }

  private createTerrainOutline(): void {
    const points: THREE.Vector3[] = [];
    const allNodes = this.nodes.filter(n => !this.segments.some(s => s.isTributary && (s.startNode.id === n.id || s.endNode.id === n.id)));

    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < allNodes.length; i++) {
        const node = allNodes[i];
        let direction: THREE.Vector3;
        if (i === 0) {
          direction = new THREE.Vector3().subVectors(allNodes[i + 1].position, node.position).normalize();
        } else if (i === allNodes.length - 1) {
          direction = new THREE.Vector3().subVectors(node.position, allNodes[i - 1].position).normalize();
        } else {
          const d1 = new THREE.Vector3().subVectors(allNodes[i + 1].position, node.position);
          const d2 = new THREE.Vector3().subVectors(node.position, allNodes[i - 1].position);
          direction = d1.add(d2).normalize();
        }
        const perp = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(side * (node.width * 1.5 + 3));
        const terrainPos = node.position.clone().add(perp);
        terrainPos.y -= 1 + Math.random() * 2;
        points.push(terrainPos);
      }
    }

    if (points.length > 2) {
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0x4a4e69,
        transparent: true,
        opacity: 0.3
      });
      const line = new THREE.Line(geometry, material);
      this.scene.add(line);
    }
  }

  public update(deltaTime: number, elapsedTime: number): void {
    for (const segment of this.segments) {
      this.updateSegmentParticles(segment, deltaTime, elapsedTime);
    }
    this.updateWaterOpacity();
  }

  private updateSegmentParticles(segment: RiverSegment, deltaTime: number, elapsedTime: number): void {
    const positions = segment.particles[0]?.mesh.geometry.attributes.position as THREE.BufferAttribute;
    if (!positions) return;

    const start = segment.startNode.position;
    const end = segment.endNode.position;
    const direction = new THREE.Vector3().subVectors(end, start).normalize();
    const perp = new THREE.Vector3(-direction.z, 0, direction.x).normalize();

    const effectiveSpeed = segment.baseSpeed * this.params.flowSpeed;

    for (let i = 0; i < segment.particles.length; i++) {
      const particle = segment.particles[i];

      particle.progress += particle.speed * effectiveSpeed * deltaTime * 60;

      if (particle.progress > 1.0) {
        particle.progress -= 1.0;
      }
      if (particle.progress < 0) {
        particle.progress += 1.0;
      }

      const basePos = new THREE.Vector3().lerpVectors(start, end, particle.progress);

      const waveOffset = Math.sin(particle.progress * Math.PI * 8 + elapsedTime * 2 + i * 0.3) * 0.15;
      const noiseOffset = this.simplexNoise(particle.progress * 5 + elapsedTime, i * 0.2) * 0.2;
      const widthFactor = (segment.startNode.width + (segment.endNode.width - segment.startNode.width) * particle.progress) * 0.4;

      const perpOffset = (particle.offset.x + waveOffset + noiseOffset) * widthFactor;
      const verticalOffset = particle.offset.y + Math.sin(elapsedTime * 3 + i * 0.5) * 0.08 + this.params.waterLevel * 0.2;
      const alongOffset = particle.offset.z * 0.3;

      const finalPos = basePos
        .clone()
        .add(perp.clone().multiplyScalar(perpOffset))
        .add(direction.clone().multiplyScalar(alongOffset))
        .add(new THREE.Vector3(0, verticalOffset, 0));

      positions.array[i * 3] = finalPos.x;
      positions.array[i * 3 + 1] = finalPos.y;
      positions.array[i * 3 + 2] = finalPos.z;
    }

    positions.needsUpdate = true;
  }

  private updateWaterOpacity(): void {
    const baseOpacity = Math.max(0, this.params.waterLevel + 0.3) * 0.5;
    for (const mesh of this.waterMeshes) {
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = baseOpacity;
    }
  }

  public setHighlight(segmentId: string, highlight: boolean): void {
    const segment = this.segments.find(s => s.id === segmentId);
    if (!segment) return;

    segment.highlighted = highlight;

    for (const particle of segment.particles) {
      const colors = particle.mesh.geometry.attributes.color as THREE.BufferAttribute;
      if (!colors) continue;

      for (let i = 0; i < segment.particles.length; i++) {
        const targetColor = highlight ? this.HIGHLIGHT_COLOR : particle.originalColor;
        colors.array[i * 3] = targetColor.r;
        colors.array[i * 3 + 1] = targetColor.g;
        colors.array[i * 3 + 2] = targetColor.b;
      }
      colors.needsUpdate = true;
    }
  }

  public getSegmentById(id: string): RiverSegment | undefined {
    return this.segments.find(s => s.id === id);
  }

  public getSegmentFlowRate(segment: RiverSegment): number {
    const area = segment.width * segment.depth;
    return segment.baseSpeed * this.params.flowSpeed * area;
  }

  public getTributaryCountForSegment(segment: RiverSegment): number {
    let count = 0;
    for (const s of this.segments) {
      if (s.isTributary && (s.endNode.id === segment.startNode.id || s.endNode.id === segment.endNode.id)) {
        count++;
      }
    }
    return count;
  }

  public updateParams(params: Partial<RiverParams>): void {
    this.params = { ...this.params, ...params };
  }

  public exportData(): RiverSystemData {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

    return {
      nodes: this.nodes.map(n => ({
        id: n.id,
        x: n.position.x,
        y: n.position.y,
        z: n.position.z,
        speed: n.speed,
        width: n.width,
        depth: n.depth
      })),
      segments: this.segments.map(s => ({
        id: s.id,
        startId: s.startNode.id,
        endId: s.endNode.id,
        particleCount: s.particleCount,
        baseSpeed: s.baseSpeed,
        isTributary: s.isTributary,
        width: s.width,
        depth: s.depth
      })),
      params: { ...this.params },
      exportTime: timestamp
    };
  }

  public clear(): void {
    for (const points of this.allParticleMeshes) {
      this.scene.remove(points);
      points.geometry.dispose();
      (points.material as THREE.Material).dispose();
    }
    this.allParticleMeshes = [];
    this.particleMaterials = [];

    for (const waterMesh of this.waterMeshes) {
      this.scene.remove(waterMesh);
      waterMesh.geometry.dispose();
      (waterMesh.material as THREE.Material).dispose();
    }
    this.waterMeshes = [];

    for (const segment of this.segments) {
      this.scene.remove(segment.mesh);
      segment.mesh.geometry.dispose();
      (segment.mesh.material as THREE.Material).dispose();
    }

    const toRemove: THREE.Object3D[] = [];
    this.scene.traverse(obj => {
      if (obj instanceof THREE.Line) {
        toRemove.push(obj);
      }
    });
    for (const obj of toRemove) {
      this.scene.remove(obj);
      if (obj instanceof THREE.Line) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    }

    this.nodes = [];
    this.segments = [];
  }

  public getTotalParticleCount(): number {
    return this.segments.reduce((sum, s) => sum + s.particleCount, 0);
  }
}
