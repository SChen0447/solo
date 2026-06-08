import * as THREE from 'three';

export interface Neuron {
  id: number;
  position: THREE.Vector3;
  somaRadius: number;
  dendrites: Dendrite[];
  synapses: string[];
  isActive: boolean;
  activationTime: number;
  flashDuration: number;
}

export interface Dendrite {
  start: THREE.Vector3;
  end: THREE.Vector3;
  length: number;
  curve: THREE.QuadraticBezierCurve3;
  radius: number;
}

export interface Synapse {
  id: string;
  fromNeuronId: number;
  toNeuronId: number;
  fromPosition: THREE.Vector3;
  toPosition: THREE.Vector3;
  distance: number;
  isActive: boolean;
  activationProgress: number;
  pulseDirection: 1 | -1;
}

export interface NetworkConfig {
  neuronCount: number;
  worldSize: number;
  connectionDistance: number;
  minConnections: number;
  maxConnections: number;
  dendriteCount: number;
  dendriteLength: number;
}

const DEFAULT_CONFIG: NetworkConfig = {
  neuronCount: 18,
  worldSize: 8,
  connectionDistance: 5,
  minConnections: 2,
  maxConnections: 5,
  dendriteCount: 4,
  dendriteLength: 1.2,
};

export class NeuronNetwork {
  private neurons: Map<number, Neuron> = new Map();
  private synapses: Map<string, Synapse> = new Map();
  private config: NetworkConfig;
  private nextNeuronId: number = 0;

  constructor(config?: Partial<NetworkConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.generateNetwork();
  }

  private generateNetwork(): void {
    this.neurons.clear();
    this.synapses.clear();
    this.nextNeuronId = 0;

    const { neuronCount, worldSize, dendriteCount, dendriteLength } = this.config;

    for (let i = 0; i < neuronCount; i++) {
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * worldSize,
        (Math.random() - 0.5) * worldSize * 0.7,
        (Math.random() - 0.5) * worldSize
      );

      const somaRadius = 0.25 + Math.random() * 0.15;

      const dendrites: Dendrite[] = [];
      for (let d = 0; d < dendriteCount; d++) {
        const angle1 = Math.random() * Math.PI * 2;
        const angle2 = Math.random() * Math.PI - Math.PI / 2;
        const length = dendriteLength * (0.6 + Math.random() * 0.8);

        const direction = new THREE.Vector3(
          Math.cos(angle1) * Math.cos(angle2),
          Math.sin(angle2),
          Math.sin(angle1) * Math.cos(angle2)
        ).normalize();

        const start = position.clone().add(
          direction.clone().multiplyScalar(somaRadius)
        );

        const midPoint = start.clone().add(
          direction.clone().multiplyScalar(length * 0.5)
        );
        midPoint.add(
          new THREE.Vector3(
            (Math.random() - 0.5) * length * 0.3,
            (Math.random() - 0.5) * length * 0.3,
            (Math.random() - 0.5) * length * 0.3
          )
        );

        const end = start.clone().add(
          direction.clone().multiplyScalar(length)
        );

        const curve = new THREE.QuadraticBezierCurve3(start, midPoint, end);

        dendrites.push({
          start,
          end,
          length,
          curve,
          radius: 0.04 + Math.random() * 0.03,
        });
      }

      const neuron: Neuron = {
        id: this.nextNeuronId++,
        position,
        somaRadius,
        dendrites,
        synapses: [],
        isActive: false,
        activationTime: 0,
        flashDuration: 300,
      };

      this.neurons.set(neuron.id, neuron);
    }

    this.generateConnections();
  }

  private generateConnections(): void {
    const { connectionDistance, minConnections, maxConnections } = this.config;
    const neuronArray = Array.from(this.neurons.values());

    for (const neuron of neuronArray) {
      const nearbyNeurons = neuronArray
        .filter((n) => n.id !== neuron.id)
        .map((n) => ({
          neuron: n,
          distance: neuron.position.distanceTo(n.position),
        }))
        .filter((n) => n.distance < connectionDistance)
        .sort((a, b) => a.distance - b.distance);

      const targetConnections = Math.min(
        Math.floor(Math.random() * (maxConnections - minConnections + 1)) + minConnections,
        nearbyNeurons.length
      );

      for (let i = 0; i < targetConnections; i++) {
        const targetNeuron = nearbyNeurons[i].neuron;
        this.createSynapse(neuron.id, targetNeuron.id);
      }
    }

    this.ensureConnectivity();
  }

  private ensureConnectivity(): void {
    const neuronArray = Array.from(this.neurons.values());
    const visited = new Set<number>();

    const dfs = (id: number) => {
      if (visited.has(id)) return;
      visited.add(id);
      const neuron = this.neurons.get(id);
      if (!neuron) return;
      for (const synapseId of neuron.synapses) {
        const synapse = this.synapses.get(synapseId);
        if (synapse) {
          dfs(synapse.toNeuronId);
        }
      }
    };

    if (neuronArray.length > 0) {
      dfs(neuronArray[0].id);
    }

    const unvisited = neuronArray.filter((n) => !visited.has(n.id));
    for (const neuron of unvisited) {
      let nearest: Neuron | null = null;
      let minDist = Infinity;
      for (const visitedNeuron of visited) {
        const v = this.neurons.get(visitedNeuron);
        if (v) {
          const dist = neuron.position.distanceTo(v.position);
          if (dist < minDist) {
            minDist = dist;
            nearest = v;
          }
        }
      }
      if (nearest) {
        this.createSynapse(neuron.id, nearest.id);
        visited.add(neuron.id);
      }
    }
  }

  private createSynapse(fromId: number, toId: number): void {
    const synapseId = this.getSynapseId(fromId, toId);
    const reverseId = this.getSynapseId(toId, fromId);

    if (this.synapses.has(synapseId) || this.synapses.has(reverseId)) {
      return;
    }

    const fromNeuron = this.neurons.get(fromId);
    const toNeuron = this.neurons.get(toId);

    if (!fromNeuron || !toNeuron) return;

    const fromDendrite = fromNeuron.dendrites[
      Math.floor(Math.random() * fromNeuron.dendrites.length)
    ];
    const toDendrite = toNeuron.dendrites[
      Math.floor(Math.random() * toNeuron.dendrites.length)
    ];

    const fromPos = fromDendrite
      ? fromDendrite.curve.getPoint(0.7 + Math.random() * 0.3)
      : fromNeuron.position.clone();
    const toPos = toDendrite
      ? toDendrite.curve.getPoint(0.7 + Math.random() * 0.3)
      : toNeuron.position.clone();

    const distance = fromPos.distanceTo(toPos);

    const pulseDirection = Math.random() > 0.5 ? 1 : -1;

    const synapse: Synapse = {
      id: synapseId,
      fromNeuronId: fromId,
      toNeuronId: toId,
      fromPosition: fromPos,
      toPosition: toPos,
      distance,
      isActive: false,
      activationProgress: 0,
      pulseDirection,
    };

    this.synapses.set(synapseId, synapse);
    fromNeuron.synapses.push(synapseId);
    toNeuron.synapses.push(synapseId);
  }

  private getSynapseId(fromId: number, toId: number): string {
    return `${fromId}-${toId}`;
  }

  getNeuron(id: number): Neuron | undefined {
    return this.neurons.get(id);
  }

  getNeurons(): Neuron[] {
    return Array.from(this.neurons.values());
  }

  getSynapse(id: string): Synapse | undefined {
    return this.synapses.get(id);
  }

  getSynapses(): Synapse[] {
    return Array.from(this.synapses.values());
  }

  getNeighborNeurons(neuronId: number): Neuron[] {
    const neuron = this.neurons.get(neuronId);
    if (!neuron) return [];

    const neighbors = new Set<Neuron>();
    for (const synapseId of neuron.synapses) {
      const synapse = this.synapses.get(synapseId);
      if (synapse) {
        const neighborId =
          synapse.fromNeuronId === neuronId
            ? synapse.toNeuronId
            : synapse.fromNeuronId;
        const neighbor = this.neurons.get(neighborId);
        if (neighbor) neighbors.add(neighbor);
      }
    }
    return Array.from(neighbors);
  }

  activateNeuron(neuronId: number, intensity: number = 1): boolean {
    const neuron = this.neurons.get(neuronId);
    if (!neuron) return false;

    neuron.isActive = true;
    neuron.activationTime = performance.now();
    neuron.flashDuration = 300 * intensity;
    return true;
  }

  updateNeurons(currentTime: number): void {
    for (const neuron of this.neurons.values()) {
      if (neuron.isActive) {
        const elapsed = currentTime - neuron.activationTime;
        if (elapsed > neuron.flashDuration) {
          neuron.isActive = false;
        }
      }
    }
  }

  getNeuronCount(): number {
    return this.neurons.size;
  }

  getSynapseCount(): number {
    return this.synapses.size;
  }

  regenerate(): void {
    this.generateNetwork();
  }

  getRandomNeuron(): Neuron | undefined {
    const neurons = Array.from(this.neurons.values());
    if (neurons.length === 0) return undefined;
    return neurons[Math.floor(Math.random() * neurons.length)];
  }
}
