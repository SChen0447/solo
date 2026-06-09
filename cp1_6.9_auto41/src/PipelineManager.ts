import * as THREE from 'three';

interface NodeData {
  mesh: THREE.Mesh;
  light: THREE.PointLight;
  isLit: boolean;
  isHovered: boolean;
  pipelineIndex: number;
  nodeIndex: number;
  position: THREE.Vector3;
  targetColor: THREE.Color;
  currentColor: THREE.Color;
  pulseTimer: number;
  litProgress: number;
}

interface PipelineData {
  mesh: THREE.Mesh;
  nodes: NodeData[];
  curve: THREE.CatmullRomCurve3;
  isHighlighted: boolean;
  highlightTimer: number;
  baseColor: THREE.Color;
  targetColor: THREE.Color;
  colorProgress: number;
}

interface CableParticle {
  mesh: THREE.Mesh;
  fromNode: NodeData;
  toNode: NodeData;
  progress: number;
  speed: number;
  alive: boolean;
}

export class PipelineManager {
  private scene: THREE.Scene;
  private pipelines: PipelineData[] = [];
  private nodes: NodeData[] = [];
  private cableParticles: CableParticle[] = [];
  private audioContext: AudioContext | null = null;
  private activeOscillators: Map<NodeData, { osc: OscillatorNode; gain: GainNode }> = new Map();
  private isSystemActive: boolean = false;
  private onEnergyUpdate: (percent: number) => void;

  private readonly PIPELINE_RADIUS = 0.4;
  private readonly NODE_RADIUS = 0.15;
  private readonly PARTICLE_SIZE = 0.05;
  private readonly PARTICLE_SPEED = 5;
  private readonly COLOR_DARK = new THREE.Color(0x444444);
  private readonly COLOR_HOVER = new THREE.Color(0xff8800);
  private readonly COLOR_LIT = new THREE.Color(0x00ccff);
  private readonly COLOR_INACTIVE = new THREE.Color(0x444444);
  private readonly COLOR_ACTIVATABLE = new THREE.Color(0xaa6666);
  private readonly COLOR_GOLD = new THREE.Color(0xffd700);
  private readonly COLOR_PIPE_DARK = new THREE.Color(0x330000);
  private readonly COLOR_PIPE_BRIGHT = new THREE.Color(0xff5500);
  private readonly COLOR_PIPE_BLUE = new THREE.Color(0x00aaff);

  constructor(scene: THREE.Scene, onEnergyUpdate: (percent: number) => void) {
    this.scene = scene;
    this.onEnergyUpdate = onEnergyUpdate;
    this.createPipelines();
  }

  private createPipelines(): void {
    const curveConfigs = this.createPipelineCurves();

    for (let pIdx = 0; pIdx < curveConfigs.length; pIdx++) {
      const curve = curveConfigs[pIdx];
      const pipelineData = this.createPipeline(curve, pIdx);
      this.pipelines.push(pipelineData);
      this.createNodesOnPipeline(pipelineData, pIdx);
    }

    this.setupNodeAdjacency();
  }

  private createPipelineCurves(): THREE.CatmullRomCurve3[] {
    const curves: THREE.CatmullRomCurve3[] = [];
    const R = 2.8;

    curves.push(new THREE.CatmullRomCurve3([
      new THREE.Vector3(-R, 0, 0),
      new THREE.Vector3(-R * 0.5, R * 0.866, 0),
      new THREE.Vector3(R * 0.5, R * 0.866, 0),
      new THREE.Vector3(R, 0, 0),
    ], false, 'catmullrom', 0.5));

    curves.push(new THREE.CatmullRomCurve3([
      new THREE.Vector3(R, 0, 0),
      new THREE.Vector3(R * 0.5, -R * 0.866, 0),
      new THREE.Vector3(-R * 0.5, -R * 0.866, 0),
      new THREE.Vector3(-R, 0, 0),
    ], false, 'catmullrom', 0.5));

    curves.push(new THREE.CatmullRomCurve3([
      new THREE.Vector3(-R, 0, 0),
      new THREE.Vector3(-R * 0.3, 0, R * 0.95),
      new THREE.Vector3(R * 0.3, 0, R * 0.95),
      new THREE.Vector3(R, 0, 0),
    ], false, 'catmullrom', 0.5));

    curves.push(new THREE.CatmullRomCurve3([
      new THREE.Vector3(R, 0, 0),
      new THREE.Vector3(R * 0.3, 0, -R * 0.95),
      new THREE.Vector3(-R * 0.3, 0, -R * 0.95),
      new THREE.Vector3(-R, 0, 0),
    ], false, 'catmullrom', 0.5));

    curves.push(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, R, 0),
      new THREE.Vector3(0, R * 0.3, R * 0.95),
      new THREE.Vector3(0, -R * 0.3, R * 0.95),
      new THREE.Vector3(0, -R, 0),
    ], false, 'catmullrom', 0.5));

    curves.push(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -R, 0),
      new THREE.Vector3(0, -R * 0.3, -R * 0.95),
      new THREE.Vector3(0, R * 0.3, -R * 0.95),
      new THREE.Vector3(0, R, 0),
    ], false, 'catmullrom', 0.5));

    return curves;
  }

  private createPipeline(curve: THREE.CatmullRomCurve3, index: number): PipelineData {
    const geometry = new THREE.TubeGeometry(curve, 80, this.PIPELINE_RADIUS, 16, false);

    const colors: number[] = [];
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const t = (i / positions.count);
      const color = new THREE.Color().lerpColors(this.COLOR_PIPE_DARK, this.COLOR_PIPE_BRIGHT, t);
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      metalness: 0.3,
      roughness: 0.7,
      emissive: new THREE.Color(0x220000),
      emissiveIntensity: 0.2
    });

    const mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);

    return {
      mesh,
      nodes: [],
      curve,
      isHighlighted: false,
      highlightTimer: 0,
      baseColor: this.COLOR_PIPE_DARK.clone(),
      targetColor: this.COLOR_PIPE_DARK.clone(),
      colorProgress: 0
    };
  }

  private createNodesOnPipeline(pipeline: PipelineData, pipelineIndex: number): void {
    const nodeCount = 5;
    for (let i = 0; i < nodeCount; i++) {
      const t = (i + 0.5) / nodeCount;
      const position = pipeline.curve.getPoint(t);
      const nodeData = this.createNode(position, pipelineIndex, i);
      pipeline.nodes.push(nodeData);
      this.nodes.push(nodeData);
    }
  }

  private createNode(position: THREE.Vector3, pipelineIndex: number, nodeIndex: number): NodeData {
    const geometry = new THREE.SphereGeometry(this.NODE_RADIUS, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: this.COLOR_INACTIVE,
      metalness: 0.3,
      roughness: 0.7,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.userData = { type: 'node', pipelineIndex, nodeIndex };
    this.scene.add(mesh);

    const light = new THREE.PointLight(0x00ccff, 0, 4);
    light.position.copy(position);
    this.scene.add(light);

    return {
      mesh,
      light,
      isLit: false,
      isHovered: false,
      pipelineIndex,
      nodeIndex,
      position: position.clone(),
      targetColor: this.COLOR_INACTIVE.clone(),
      currentColor: this.COLOR_INACTIVE.clone(),
      pulseTimer: Math.random() * 1.5,
      litProgress: 0
    };
  }

  private setupNodeAdjacency(): void {
    for (const pipeline of this.pipelines) {
      for (let i = 0; i < pipeline.nodes.length; i++) {
        const node = pipeline.nodes[i];
        const neighbors: NodeData[] = [];

        if (i > 0) neighbors.push(pipeline.nodes[i - 1]);
        if (i < pipeline.nodes.length - 1) neighbors.push(pipeline.nodes[i + 1]);

        (node as any).neighbors = neighbors;
      }
    }
  }

  public activate(): void {
    this.isSystemActive = true;
    for (const node of this.nodes) {
      if (!node.isLit) {
        node.targetColor = this.COLOR_ACTIVATABLE.clone();
      }
    }
  }

  public handleHover(raycaster: THREE.Raycaster): void {
    if (!this.isSystemActive) return;

    const nodeMeshes = this.nodes.map(n => n.mesh);
    const intersects = raycaster.intersectObjects(nodeMeshes);

    for (const node of this.nodes) {
      node.isHovered = false;
      if (!node.isLit) {
        node.targetColor = this.COLOR_ACTIVATABLE.clone();
      }
    }

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const nodeData = this.nodes.find(n => n.mesh === hitMesh);
      if (nodeData && !nodeData.isLit) {
        nodeData.isHovered = true;
        nodeData.targetColor = this.COLOR_HOVER.clone();
      }
    }
  }

  public handleClick(raycaster: THREE.Raycaster): void {
    if (!this.isSystemActive) return;

    const nodeMeshes = this.nodes.map(n => n.mesh);
    const intersects = raycaster.intersectObjects(nodeMeshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const nodeData = this.nodes.find(n => n.mesh === hitMesh);
      if (nodeData && !nodeData.isLit) {
        this.lightNode(nodeData);
      }
    }
  }

  private lightNode(node: NodeData): void {
    node.isLit = true;
    node.targetColor = this.COLOR_LIT.clone();
    node.litProgress = 0;
    node.light.intensity = 2.0;

    this.initAudio();
    this.startNodePulse(node);

    const neighbors = (node as any).neighbors as NodeData[];
    for (const neighbor of neighbors) {
      if (!neighbor.isLit) {
        this.spawnCableParticles(node, neighbor);
      }
    }

    const pipeline = this.pipelines[node.pipelineIndex];
    const allLit = pipeline.nodes.every(n => n.isLit);
    if (allLit && !pipeline.isHighlighted) {
      this.highlightPipeline(pipeline);
    } else {
      this.updatePipelineColorTowardsBlue(pipeline, node);
    }

    this.updateEnergy();
  }

  private updatePipelineColorTowardsBlue(pipeline: PipelineData, litNode: NodeData): void {
    const litCount = pipeline.nodes.filter(n => n.isLit).length;
    const ratio = litCount / pipeline.nodes.length;
    pipeline.targetColor.lerpColors(this.COLOR_PIPE_DARK, this.COLOR_PIPE_BLUE, ratio);
  }

  private highlightPipeline(pipeline: PipelineData): void {
    pipeline.isHighlighted = true;
    pipeline.highlightTimer = 2;
    pipeline.targetColor = this.COLOR_GOLD.clone();

    for (const node of pipeline.nodes) {
      this.playPulseSound(node);
    }
  }

  private spawnCableParticles(from: NodeData, to: NodeData): void {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const geometry = new THREE.SphereGeometry(this.PARTICLE_SIZE, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: 0x00ccff,
        transparent: true,
        opacity: 0.9
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(from.position);
      this.scene.add(mesh);

      this.cableParticles.push({
        mesh,
        fromNode: from,
        toNode: to,
        progress: -i * 0.05,
        speed: this.PARTICLE_SPEED,
        alive: true
      });
    }
  }

  private initAudio(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  private startNodePulse(node: NodeData): void {
    node.pulseTimer = 0;
  }

  private playPulseSound(node: NodeData): void {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.value = 230;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.3);
    gain.gain.linearRampToValueAtTime(0, now + 0.6);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start(now);
    osc.stop(now + 0.6);
  }

  private updateEnergy(): void {
    const litCount = this.nodes.filter(n => n.isLit).length;
    const percent = (litCount / this.nodes.length) * 100;
    this.onEnergyUpdate(percent);
  }

  public reset(): void {
    this.isSystemActive = true;

    for (const node of this.nodes) {
      node.isLit = false;
      node.isHovered = false;
      node.targetColor = this.COLOR_ACTIVATABLE.clone();
      node.currentColor = this.COLOR_ACTIVATABLE.clone();
      node.litProgress = 0;
      node.light.intensity = 0;
      node.pulseTimer = Math.random() * 1.5;

      const material = node.mesh.material as THREE.MeshStandardMaterial;
      material.color.copy(this.COLOR_ACTIVATABLE);
      material.emissive.setHex(0x000000);
      material.emissiveIntensity = 0;
    }

    for (const pipeline of this.pipelines) {
      pipeline.isHighlighted = false;
      pipeline.highlightTimer = 0;
      pipeline.baseColor = this.COLOR_PIPE_DARK.clone();
      pipeline.targetColor = this.COLOR_PIPE_DARK.clone();
      pipeline.colorProgress = 0;

      const material = pipeline.mesh.material as THREE.MeshStandardMaterial;
      material.emissive = new THREE.Color(0x220000);
      material.emissiveIntensity = 0.2;
      this.resetPipelineVertexColors(pipeline);
    }

    for (const particle of this.cableParticles) {
      this.scene.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      (particle.mesh.material as THREE.Material).dispose();
    }
    this.cableParticles = [];

    this.updateEnergy();
  }

  private resetPipelineVertexColors(pipeline: PipelineData): void {
    const geometry = pipeline.mesh.geometry as THREE.BufferGeometry;
    const colors = geometry.attributes.color.array as Float32Array;
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const t = (i / positions.count);
      const color = new THREE.Color().lerpColors(this.COLOR_PIPE_DARK, this.COLOR_PIPE_BRIGHT, t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geometry.attributes.color.needsUpdate = true;
  }

  public update(delta: number, elapsed: number): void {
    for (const node of this.nodes) {
      this.updateNodeColor(node, delta);
      this.updateNodePulse(node, delta);
    }

    for (const pipeline of this.pipelines) {
      this.updatePipelineColor(pipeline, delta);
    }

    this.updateCableParticles(delta);
  }

  private updateNodeColor(node: NodeData, delta: number): void {
    const transitionSpeed = node.isLit ? 1 / 0.3 : 5;
    node.currentColor.lerp(node.targetColor, Math.min(1, delta * transitionSpeed));

    const material = node.mesh.material as THREE.MeshStandardMaterial;
    material.color.copy(node.currentColor);

    if (node.isLit) {
      node.litProgress = Math.min(1, node.litProgress + delta / 0.3);
      material.emissive.copy(node.currentColor);
      material.emissiveIntensity = node.litProgress * 0.8;
      node.light.intensity = node.litProgress * 2.0;
    } else if (node.isHovered) {
      material.emissive.copy(node.currentColor);
      material.emissiveIntensity = 0.4;
    } else {
      material.emissive.setHex(0x000000);
      material.emissiveIntensity = 0;
    }
  }

  private updateNodePulse(node: NodeData, delta: number): void {
    if (!node.isLit) return;

    node.pulseTimer += delta;
    if (node.pulseTimer >= 1.5) {
      node.pulseTimer = 0;
      this.playPulseSound(node);
    }

    const pulsePhase = node.pulseTimer / 1.5;
    const pulseIntensity = this.isSystemActive ?
      1.5 + Math.sin(pulsePhase * Math.PI * 2) * 0.5 :
      2.0;
    node.light.intensity = node.litProgress * pulseIntensity;

    const material = node.mesh.material as THREE.MeshStandardMaterial;
    material.emissiveIntensity = node.litProgress * (0.6 + Math.sin(pulsePhase * Math.PI * 2) * 0.3);
  }

  private updatePipelineColor(pipeline: PipelineData, delta: number): void {
    if (pipeline.isHighlighted) {
      pipeline.highlightTimer -= delta;
      if (pipeline.highlightTimer <= 0) {
        pipeline.isHighlighted = false;
        const litCount = pipeline.nodes.filter(n => n.isLit).length;
        const ratio = litCount / pipeline.nodes.length;
        pipeline.targetColor.lerpColors(this.COLOR_PIPE_DARK, this.COLOR_PIPE_BLUE, ratio);
      }
    }

    pipeline.colorProgress = Math.min(1, pipeline.colorProgress + delta / 0.5);
    pipeline.baseColor.lerp(pipeline.targetColor, delta * 2);

    const material = pipeline.mesh.material as THREE.MeshStandardMaterial;
    if (pipeline.isHighlighted) {
      const pulse = 0.5 + Math.sin(Date.now() * 0.01) * 0.3;
      material.emissive.copy(this.COLOR_GOLD);
      material.emissiveIntensity = pulse;
      this.updatePipelineVertexColors(pipeline, this.COLOR_GOLD);
    } else {
      material.emissive.copy(pipeline.baseColor);
      material.emissiveIntensity = 0.3;
      this.updatePipelineGradientColors(pipeline);
    }
  }

  private updatePipelineVertexColors(pipeline: PipelineData, color: THREE.Color): void {
    const geometry = pipeline.mesh.geometry as THREE.BufferGeometry;
    const colors = geometry.attributes.color.array as Float32Array;
    for (let i = 0; i < colors.length; i += 3) {
      colors[i] = color.r;
      colors[i + 1] = color.g;
      colors[i + 2] = color.b;
    }
    geometry.attributes.color.needsUpdate = true;
  }

  private updatePipelineGradientColors(pipeline: PipelineData): void {
    const geometry = pipeline.mesh.geometry as THREE.BufferGeometry;
    const colors = geometry.attributes.color.array as Float32Array;
    const positions = geometry.attributes.position;

    const litCount = pipeline.nodes.filter(n => n.isLit).length;
    const blueRatio = litCount / pipeline.nodes.length;
    const startColor = this.COLOR_PIPE_DARK.clone().lerp(this.COLOR_PIPE_BLUE, blueRatio * 0.5);
    const endColor = this.COLOR_PIPE_BRIGHT.clone().lerp(this.COLOR_PIPE_BLUE, blueRatio);

    for (let i = 0; i < positions.count; i++) {
      const t = (i / positions.count);
      const color = new THREE.Color().lerpColors(startColor, endColor, t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geometry.attributes.color.needsUpdate = true;
  }

  private updateCableParticles(delta: number): void {
    const toRemove: CableParticle[] = [];

    for (const particle of this.cableParticles) {
      if (!particle.alive) continue;

      const distance = particle.fromNode.position.distanceTo(particle.toNode.position);
      const progressPerFrame = (particle.speed * delta) / distance;
      particle.progress += progressPerFrame;

      if (particle.progress >= 1) {
        particle.alive = false;
        toRemove.push(particle);
        continue;
      }

      if (particle.progress >= 0) {
        const pos = new THREE.Vector3().lerpVectors(
          particle.fromNode.position,
          particle.toNode.position,
          particle.progress
        );
        particle.mesh.position.copy(pos);

        const material = particle.mesh.material as THREE.MeshBasicMaterial;
        material.opacity = Math.min(1, particle.progress * 3) * (1 - particle.progress * 0.5);
      }
    }

    for (const particle of toRemove) {
      this.scene.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      (particle.mesh.material as THREE.Material).dispose();
      const idx = this.cableParticles.indexOf(particle);
      if (idx >= 0) this.cableParticles.splice(idx, 1);
    }
  }
}
