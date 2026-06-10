export interface StardustParticle {
  id: number;
  x: number;
  y: number;
  radius: number;
  color: { r: number; g: number; b: number };
}

export interface Node {
  id: number;
  x: number;
  y: number;
  radius: number;
  pulsePhase: number;
  connectedParticleIds: number[];
  connectedNodeIds: number[];
}

export interface Segment {
  startParticleId: number;
  endParticleId: number;
  startNodeId: number | null;
  endNodeId: number | null;
  length: number;
  highlightUntil: number;
  highlightColor: { r: number; g: number; b: number } | null;
}

export class SpiderWeb {
  private particles: StardustParticle[] = [];
  private nodes: Node[] = [];
  private segments: Segment[] = [];
  private particleIdCounter = 0;
  private nodeIdCounter = 0;
  private particlesInCurrentStroke = 0;
  private currentStrokeParticleIds: number[] = [];
  private lastNodeInStroke: number | null = null;

  addParticle(x: number, y: number, progress: number): StardustParticle {
    const t1 = 221 / 255;
    const rStart = 221, gStart = 238, bStart = 255;
    const rEnd = 187, gEnd = 136, bEnd = 255;
    const r = Math.round(rStart + (rEnd - rStart) * progress);
    const g = Math.round(gStart + (gEnd - gStart) * progress);
    const b = Math.round(bStart + (bEnd - bStart) * progress);

    const particle: StardustParticle = {
      id: this.particleIdCounter++,
      x,
      y,
      radius: 2 + Math.random(),
      color: { r, g, b },
    };
    this.particles.push(particle);
    this.particlesInCurrentStroke++;
    this.currentStrokeParticleIds.push(particle.id);

    if (this.currentStrokeParticleIds.length >= 2) {
      const prevId = this.currentStrokeParticleIds[this.currentStrokeParticleIds.length - 2];
      const prev = this.particles.find(p => p.id === prevId)!;
      const len = Math.hypot(particle.x - prev.x, particle.y - prev.y);
      this.segments.push({
        startParticleId: prevId,
        endParticleId: particle.id,
        startNodeId: this.lastNodeInStroke,
        endNodeId: null,
        length: len,
        highlightUntil: 0,
        highlightColor: null,
      });
    }

    if (this.particlesInCurrentStroke >= 20) {
      this.insertNodeAtRandom();
      this.particlesInCurrentStroke = 0;
    }

    return particle;
  }

  private insertNodeAtRandom(): void {
    if (this.currentStrokeParticleIds.length < 3) return;

    const midIdx = Math.floor(this.currentStrokeParticleIds.length / 2);
    const particleId = this.currentStrokeParticleIds[midIdx];
    const particle = this.particles.find(p => p.id === particleId);
    if (!particle) return;

    const node: Node = {
      id: this.nodeIdCounter++,
      x: particle.x,
      y: particle.y,
      radius: 5,
      pulsePhase: Math.random() * Math.PI * 2,
      connectedParticleIds: [...this.currentStrokeParticleIds],
      connectedNodeIds: this.lastNodeInStroke !== null ? [this.lastNodeInStroke] : [],
    };

    if (this.lastNodeInStroke !== null) {
      const prevNode = this.nodes.find(n => n.id === this.lastNodeInStroke);
      if (prevNode && !prevNode.connectedNodeIds.includes(node.id)) {
        prevNode.connectedNodeIds.push(node.id);
      }
    }

    for (const seg of this.segments) {
      if (seg.startParticleId === particleId || seg.endParticleId === particleId) {
        if (seg.startNodeId === null && seg.endParticleId === particleId) {
          seg.endNodeId = node.id;
        } else if (seg.endNodeId === null && seg.startParticleId === particleId) {
          seg.startNodeId = node.id;
        }
      }
    }

    this.nodes.push(node);
    this.lastNodeInStroke = node.id;
    this.currentStrokeParticleIds = [particleId];
  }

  endStroke(): void {
    if (this.particlesInCurrentStroke >= 10 && this.currentStrokeParticleIds.length >= 3) {
      this.insertNodeAtRandom();
    }
    this.particlesInCurrentStroke = 0;
    this.currentStrokeParticleIds = [];
    this.lastNodeInStroke = null;
  }

  getParticles(): StardustParticle[] {
    return this.particles;
  }

  getNodes(): Node[] {
    return this.nodes;
  }

  getSegments(): Segment[] {
    return this.segments;
  }

  getNodeCount(): number {
    return this.nodes.length;
  }

  getTotalLength(): number {
    return this.segments.reduce((sum, s) => sum + s.length, 0);
  }

  findNodeAt(x: number, y: number, threshold: number = 12): Node | null {
    for (const node of this.nodes) {
      const dist = Math.hypot(node.x - x, node.y - y);
      if (dist <= threshold) {
        return node;
      }
    }
    return null;
  }

  getConnectedSegments(nodeId: number): Segment[] {
    return this.segments.filter(
      s => s.startNodeId === nodeId || s.endNodeId === nodeId
    );
  }

  getParticleById(id: number): StardustParticle | undefined {
    return this.particles.find(p => p.id === id);
  }

  getNodeById(id: number): Node | undefined {
    return this.nodes.find(n => n.id === id);
  }

  highlightSegment(
    segment: Segment,
    color: { r: number; g: number; b: number },
    duration: number
  ): void {
    const now = performance.now();
    segment.highlightUntil = now + duration;
    segment.highlightColor = color;
  }

  clear(): void {
    this.particles = [];
    this.nodes = [];
    this.segments = [];
    this.particleIdCounter = 0;
    this.nodeIdCounter = 0;
    this.particlesInCurrentStroke = 0;
    this.currentStrokeParticleIds = [];
    this.lastNodeInStroke = null;
  }

  getStrokeParticles(): number[] {
    return this.currentStrokeParticleIds;
  }
}
