import SimplexNoise from 'simplex-noise';
import * as THREE from 'three';

export interface RootNode {
  id: number;
  position: THREE.Vector3;
  direction: THREE.Vector3;
  radius: number;
  depth: number;
  isBranchPoint: boolean;
  branchOrder: number;
  parentId: number | null;
  childrenIds: number[];
  soilLayer: number;
  frameCreated: number;
  saturation: number;
}

export interface SoilLayer {
  name: string;
  color: string;
  wireframeColor: string;
  wireframeOpacity: number;
  topY: number;
  bottomY: number;
  thickness: number;
  nutrientValue: number;
  growthSpeedMultiplier: number;
  branchProbabilityMultiplier: number;
}

export interface VibrationParticle {
  id: number;
  position: THREE.Vector3;
  life: number;
  maxLife: number;
}

export const SOIL_LAYERS: SoilLayer[] = [
  {
    name: '表层腐殖土',
    color: '#3d1f12',
    wireframeColor: '#4a2c1a',
    wireframeOpacity: 0.2,
    topY: 0,
    bottomY: -1,
    thickness: 1,
    nutrientValue: 0.85,
    growthSpeedMultiplier: 1.0,
    branchProbabilityMultiplier: 1.0
  },
  {
    name: '中层黏土',
    color: '#6b4423',
    wireframeColor: '#8b5a2b',
    wireframeOpacity: 0.3,
    topY: -1,
    bottomY: -2.5,
    thickness: 1.5,
    nutrientValue: 0.6,
    growthSpeedMultiplier: 0.8,
    branchProbabilityMultiplier: 0.7
  },
  {
    name: '底层砂石',
    color: '#7a7a7a',
    wireframeColor: '#b0b0b0',
    wireframeOpacity: 0.2,
    topY: -2.5,
    bottomY: -4.5,
    thickness: 2,
    nutrientValue: 0.35,
    growthSpeedMultiplier: 0.6,
    branchProbabilityMultiplier: 0.5
  }
];

export class RootSimulator {
  private nodes: Map<number, RootNode> = new Map();
  private activeTips: number[] = [];
  private nextId: number = 0;
  private frame: number = 0;
  private noise3D: SimplexNoise;
  private humidity: number = 50;
  private temperature: number = 22;
  private paused: boolean = false;
  private vibrationParticles: VibrationParticle[] = [];
  private nextParticleId: number = 0;
  private lastSoilLayerOfNode: Map<number, number> = new Map();
  private readonly MAX_NODES: number = 5000;
  private readonly MIN_SEGMENT_LENGTH: number = 0.3;
  private readonly MAX_SEGMENT_LENGTH: number = 0.7;
  private readonly BRANCH_ANGLE_MIN: number = 20;
  private readonly BRANCH_ANGLE_MAX: number = 45;
  private readonly TRUNK_RADIUS: number = 0.15;
  private readonly TIP_RADIUS: number = 0.02;
  private readonly BRANCH_START_FRAME: number = 200;
  private readonly BRANCH_INTERVAL: number = 5;
  private readonly BASE_BRANCH_PROBABILITY: number = 0.15;

  constructor() {
    this.noise3D = new SimplexNoise();
    this.initializeRoot();
  }

  private initializeRoot(): void {
    const startPos = new THREE.Vector3(0, 0.2, 0);
    const startDir = new THREE.Vector3(0, -1, 0);
    this.createNode(startPos, startDir, this.TRUNK_RADIUS, 0, false, 0, null);
  }

  private createNode(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    radius: number,
    depth: number,
    isBranchPoint: boolean,
    branchOrder: number,
    parentId: number | null
  ): number {
    const id = this.nextId++;
    const soilLayer = this.getSoilLayerAt(position.y);
    const saturation = this.calculateColorSaturation();

    const node: RootNode = {
      id,
      position: position.clone(),
      direction: direction.clone().normalize(),
      radius,
      depth,
      isBranchPoint,
      branchOrder,
      parentId,
      childrenIds: [],
      soilLayer,
      frameCreated: this.frame,
      saturation
    };

    this.nodes.set(id, node);
    this.activeTips.push(id);
    this.lastSoilLayerOfNode.set(id, soilLayer);

    if (parentId !== null) {
      const parent = this.nodes.get(parentId);
      if (parent) {
        parent.childrenIds.push(id);
      }
    }

    return id;
  }

  private getSoilLayerAt(y: number): number {
    for (let i = 0; i < SOIL_LAYERS.length; i++) {
      if (y <= SOIL_LAYERS[i].topY && y > SOIL_LAYERS[i].bottomY) {
        return i;
      }
    }
    return SOIL_LAYERS.length - 1;
  }

  private calculateColorSaturation(): number {
    const baseSat = 0.5;
    const humidityBonus = (this.humidity - 20) / 60 * 0.5;
    return Math.min(1, baseSat + humidityBonus);
  }

  public getHumiditySpeedMultiplier(): number {
    const steps = Math.floor((this.humidity - 20) / 10);
    return Math.min(1.2, 1 + steps * 0.05);
  }

  public getTemperatureSpeedMultiplier(): number {
    const optimalTemp = 22;
    const diff = Math.abs(this.temperature - optimalTemp);
    return Math.max(0.4, 1 - diff * 0.02);
  }

  public getBranchProbabilityMultiplier(): number {
    const steps = Math.floor((this.humidity - 20) / 10);
    return 1 + steps * 0.03;
  }

  private getTemperatureDirectionBias(): THREE.Vector3 {
    if (this.temperature < 18) {
      return new THREE.Vector3(0, 0.15, 0);
    } else if (this.temperature > 28) {
      return new THREE.Vector3(0, -0.15, 0);
    }
    return new THREE.Vector3(0, 0, 0);
  }

  private randomAngle(minDeg: number, maxDeg: number): number {
    return THREE.MathUtils.degToRad(minDeg + Math.random() * (maxDeg - minDeg));
  }

  private getNoiseDirection(node: RootNode): THREE.Vector3 {
    const scale = 2;
    const nx = this.noise3D.noise3D(node.position.x * scale, node.position.y * scale, node.position.z * scale);
    const nz = this.noise3D.noise3D(node.position.x * scale + 100, node.position.y * scale + 100, node.position.z * scale + 100);
    return new THREE.Vector3(nx * 0.3, 0, nz * 0.3);
  }

  private addVibrationParticles(position: THREE.Vector3): void {
    for (let i = 0; i < 5; i++) {
      this.vibrationParticles.push({
        id: this.nextParticleId++,
        position: position.clone().add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3
          )
        ),
        life: 1,
        maxLife: 30
      });
    }
  }

  public update(humidity: number, temperature: number): void {
    if (this.paused) {
      this.updateParticles();
      return;
    }

    this.humidity = humidity;
    this.temperature = temperature;
    this.frame++;

    const tipsSnapshot = [...this.activeTips];
    const humiditySpeed = this.getHumiditySpeedMultiplier();
    const tempSpeed = this.getTemperatureSpeedMultiplier();
    const tempBias = this.getTemperatureDirectionBias();

    let nodesUpdated = 0;
    const maxUpdatesPerFrame = 80;

    for (const tipId of tipsSnapshot) {
      if (nodesUpdated >= maxUpdatesPerFrame) break;
      if (this.nodes.size >= this.MAX_NODES) break;

      const tipNode = this.nodes.get(tipId);
      if (!tipNode) continue;

      const soilLayer = SOIL_LAYERS[tipNode.soilLayer];
      const soilSpeed = soilLayer.growthSpeedMultiplier;
      const totalSpeed = humiditySpeed * tempSpeed * soilSpeed;

      const segmentLength = THREE.MathUtils.lerp(
        this.MIN_SEGMENT_LENGTH,
        this.MAX_SEGMENT_LENGTH,
        Math.random()
      ) * totalSpeed;

      const noiseDir = this.getNoiseDirection(tipNode);
      let newDirection = tipNode.direction.clone()
        .add(noiseDir)
        .add(tempBias)
        .normalize();

      const newPosition = tipNode.position.clone().add(
        newDirection.clone().multiplyScalar(segmentLength)
      );

      const newSoilLayer = this.getSoilLayerAt(newPosition.y);
      if (newSoilLayer !== this.lastSoilLayerOfNode.get(tipId)) {
        this.addVibrationParticles(newPosition);
      }

      const depthFactor = Math.min(1, tipNode.depth / 200);
      const newRadius = THREE.MathUtils.lerp(this.TRUNK_RADIUS, this.TIP_RADIUS, depthFactor);

      this.createNode(
        newPosition,
        newDirection,
        newRadius,
        tipNode.depth + 1,
        false,
        tipNode.branchOrder,
        tipId
      );

      this.lastSoilLayerOfNode.set(tipId, newSoilLayer);
      nodesUpdated++;

      const activeTipIndex = this.activeTips.indexOf(tipId);
      if (activeTipIndex !== -1) {
        this.activeTips.splice(activeTipIndex, 1);
      }

      if (
        this.frame > this.BRANCH_START_FRAME &&
        this.frame % this.BRANCH_INTERVAL === 0 &&
        tipNode.branchOrder < 3
      ) {
        const soilBranchMult = soilLayer.branchProbabilityMultiplier;
        const humidityBranchMult = this.getBranchProbabilityMultiplier();
        const branchProb = this.BASE_BRANCH_PROBABILITY * soilBranchMult * humidityBranchMult;

        if (Math.random() < branchProb) {
          const branchCount = Math.random() < 0.3 ? 2 : 1;
          for (let b = 0; b < branchCount; b++) {
            const branchAngle = this.randomAngle(this.BRANCH_ANGLE_MIN, this.BRANCH_ANGLE_MAX);
            const perpAxis = new THREE.Vector3(
              Math.random() - 0.5,
              Math.random() - 0.5,
              Math.random() - 0.5
            ).normalize();

            const branchDirection = newDirection.clone()
              .applyAxisAngle(perpAxis, branchAngle * (b === 0 ? 1 : -1))
              .normalize();

            const branchRadius = newRadius * 0.7;
            this.createNode(
              newPosition.clone(),
              branchDirection,
              branchRadius,
              tipNode.depth + 1,
              true,
              tipNode.branchOrder + 1,
              tipId
            );
            nodesUpdated++;
          }
        }
      }
    }

    this.updateParticles();
  }

  private updateParticles(): void {
    this.vibrationParticles = this.vibrationParticles.filter(p => {
      p.life -= 1 / p.maxLife;
      return p.life > 0;
    });
  }

  public getNodes(): RootNode[] {
    return Array.from(this.nodes.values());
  }

  public getNode(id: number): RootNode | undefined {
    return this.nodes.get(id);
  }

  public getVibrationParticles(): VibrationParticle[] {
    return this.vibrationParticles;
  }

  public getBranchingNodes(): RootNode[] {
    return this.getNodes().filter(n => n.isBranchPoint);
  }

  public getBranchStats(nodeId: number): { branchCount: number; totalLength: number; maxDepth: number } {
    const startNode = this.nodes.get(nodeId);
    if (!startNode) return { branchCount: 0, totalLength: 0, maxDepth: 0 };

    const visited = new Set<number>();
    const queue: number[] = [...startNode.childrenIds];
    let branchCount = 0;
    let totalLength = 0;
    let maxDepth = 0;
    let minY = startNode.position.y;

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const node = this.nodes.get(currentId);
      if (!node) continue;

      if (node.isBranchPoint) branchCount++;
      if (node.parentId !== null) {
        const parent = this.nodes.get(node.parentId);
        if (parent) {
          totalLength += node.position.distanceTo(parent.position);
        }
      }
      if (node.position.y < minY) {
        minY = node.position.y;
        maxDepth = startNode.position.y - minY;
      }

      queue.push(...node.childrenIds);
    }

    return { branchCount, totalLength, maxDepth };
  }

  public togglePause(): boolean {
    this.paused = !this.paused;
    return this.paused;
  }

  public isPaused(): boolean {
    return this.paused;
  }

  public reset(): void {
    this.nodes.clear();
    this.activeTips = [];
    this.nextId = 0;
    this.frame = 0;
    this.vibrationParticles = [];
    this.lastSoilLayerOfNode.clear();
    this.paused = false;
    this.initializeRoot();
  }

  public getFrame(): number {
    return this.frame;
  }

  public getRootCenter(): THREE.Vector3 {
    const nodes = this.getNodes();
    if (nodes.length === 0) return new THREE.Vector3(0, -1, 0);
    let sum = new THREE.Vector3();
    for (const n of nodes) sum.add(n.position);
    return sum.divideScalar(nodes.length);
  }

  public getClosestRootPoint(target: THREE.Vector3): THREE.Vector3 {
    const nodes = this.getNodes();
    if (nodes.length === 0) return new THREE.Vector3(0, -1, 0);
    let closest = nodes[0].position;
    let minDist = Infinity;
    for (const n of nodes) {
      const d = n.position.distanceTo(target);
      if (d < minDist) {
        minDist = d;
        closest = n.position;
      }
    }
    return closest;
  }
}
