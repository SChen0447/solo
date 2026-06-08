import * as THREE from 'three';
import { NeuronNetwork, Neuron, Synapse } from './neuronNetwork';

export interface ActivePulse {
  id: string;
  synapseId: string;
  progress: number;
  speed: number;
  direction: 1 | -1;
  hopCount: number;
  intensity: number;
  startTime: number;
  fromNeuronId: number;
}

export interface StimulusEvent {
  neuronId: number;
  time: number;
  intensity: number;
}

export type StimulusMode = 'single' | 'multi' | 'cycle' | 'none';

export interface PulseStats {
  activeNeuronCount: number;
  totalPathLength: number;
  averageDelay: number;
  activePulseCount: number;
}

const MAX_HOPS = 3;
const BASE_PULSE_SPEED = 0.002;

export class PulseEngine {
  private network: NeuronNetwork;
  private activePulses: Map<string, ActivePulse> = new Map();
  private activeNeurons: Map<number, { activationTime: number; hopCount: number }> = new Map();
  private pulseIdCounter: number = 0;

  private transmissionDelay: number = 200;
  private pulseSpeedMultiplier: number = 1;
  private actionPotentialIntensity: number = 1;

  private stimulusMode: StimulusMode = 'none';
  private stimulusTimeline: StimulusEvent[] = [];
  private stimulusStartTime: number = 0;
  private stimulusDuration: number = 0;
  private isStimulusRunning: boolean = false;
  private currentStimulusIndex: number = 0;

  private totalPathLength: number = 0;
  private totalDelayAccumulator: number = 0;
  private totalHopCount: number = 0;

  private activeNeuronFlashDuration: number = 500;

  constructor(network: NeuronNetwork) {
    this.network = network;
  }

  setTransmissionDelay(delay: number): void {
    this.transmissionDelay = delay;
  }

  getTransmissionDelay(): number {
    return this.transmissionDelay;
  }

  setPulseSpeedMultiplier(multiplier: number): void {
    this.pulseSpeedMultiplier = multiplier;
  }

  getPulseSpeedMultiplier(): number {
    return this.pulseSpeedMultiplier;
  }

  setActionPotentialIntensity(intensity: number): void {
    this.actionPotentialIntensity = intensity;
    this.activeNeuronFlashDuration = 500 * intensity;
  }

  getActionPotentialIntensity(): number {
    return this.actionPotentialIntensity;
  }

  triggerNeuron(neuronId: number, intensity?: number, hopCount: number = 0): void {
    const neuron = this.network.getNeuron(neuronId);
    if (!neuron) return;

    const actualIntensity = intensity ?? this.actionPotentialIntensity;

    const now = performance.now();
    this.activeNeurons.set(neuronId, {
      activationTime: now,
      hopCount,
    });

    this.network.activateNeuron(neuronId, actualIntensity);

    if (hopCount < MAX_HOPS) {
      this.spreadPulse(neuronId, hopCount + 1, actualIntensity);
    }
  }

  private spreadPulse(fromNeuronId: number, hopCount: number, intensity: number): void {
    const neuron = this.network.getNeuron(fromNeuronId);
    if (!neuron) return;

    for (const synapseId of neuron.synapses) {
      const synapse = this.network.getSynapse(synapseId);
      if (!synapse) continue;

      const toNeuronId =
        synapse.fromNeuronId === fromNeuronId
          ? synapse.toNeuronId
          : synapse.fromNeuronId;

      const targetNeuron = this.network.getNeuron(toNeuronId);
      if (!targetNeuron) continue;

      if (this.activeNeurons.has(toNeuronId)) {
        const activeInfo = this.activeNeurons.get(toNeuronId)!;
        if (performance.now() - activeInfo.activationTime < this.activeNeuronFlashDuration * 0.5) {
          continue;
        }
      }

      const direction: 1 | -1 = synapse.fromNeuronId === fromNeuronId ? 1 : -1;

      const pulseId = `pulse-${this.pulseIdCounter++}`;
      const pulse: ActivePulse = {
        id: pulseId,
        synapseId,
        progress: 0,
        speed: BASE_PULSE_SPEED * this.pulseSpeedMultiplier,
        direction,
        hopCount,
        intensity,
        startTime: performance.now(),
        fromNeuronId,
      };

      this.activePulses.set(pulseId, pulse);
      this.totalPathLength += synapse.distance;
      this.totalDelayAccumulator += this.transmissionDelay;
      this.totalHopCount += 1;
    }
  }

  update(deltaTime: number): void {
    const now = performance.now();

    const completedPulses: string[] = [];
    const neuronsToTrigger: { neuronId: number; hopCount: number; intensity: number }[] = [];

    for (const pulse of this.activePulses.values()) {
      pulse.progress += pulse.speed * deltaTime * this.pulseSpeedMultiplier;

      if (pulse.progress >= 1) {
        pulse.progress = 1;
        completedPulses.push(pulse.id);

        const synapse = this.network.getSynapse(pulse.synapseId);
        if (synapse) {
          const targetNeuronId =
            pulse.direction === 1 ? synapse.toNeuronId : synapse.fromNeuronId;

          neuronsToTrigger.push({
            neuronId: targetNeuronId,
            hopCount: pulse.hopCount,
            intensity: pulse.intensity,
          });
        }
      }
    }

    for (const pulseId of completedPulses) {
      this.activePulses.delete(pulseId);
    }

    for (const trigger of neuronsToTrigger) {
      if (trigger.hopCount <= MAX_HOPS) {
        this.triggerNeuron(trigger.neuronId, trigger.intensity, trigger.hopCount);
      }
    }

    const expiredNeurons: number[] = [];
    for (const [neuronId, info] of this.activeNeurons) {
      if (now - info.activationTime > this.activeNeuronFlashDuration) {
        expiredNeurons.push(neuronId);
      }
    }
    for (const id of expiredNeurons) {
      this.activeNeurons.delete(id);
    }

    if (this.isStimulusRunning) {
      this.updateStimulus(now);
    }
  }

  getActivePulses(): ActivePulse[] {
    return Array.from(this.activePulses.values());
  }

  getPulsePosition(pulse: ActivePulse): THREE.Vector3 | null {
    const synapse = this.network.getSynapse(pulse.synapseId);
    if (!synapse) return null;

    const progress = pulse.direction === 1 ? pulse.progress : 1 - pulse.progress;
    return new THREE.Vector3().lerpVectors(
      synapse.fromPosition,
      synapse.toPosition,
      progress
    );
  }

  getActiveNeurons(): Map<number, { activationTime: number; hopCount: number }> {
    return this.activeNeurons;
  }

  isNeuronActive(neuronId: number): boolean {
    const info = this.activeNeurons.get(neuronId);
    if (!info) return false;
    return performance.now() - info.activationTime < this.activeNeuronFlashDuration;
  }

  getNeuronActivationProgress(neuronId: number): number {
    const info = this.activeNeurons.get(neuronId);
    if (!info) return 0;
    const elapsed = performance.now() - info.activationTime;
    return Math.max(0, 1 - elapsed / this.activeNeuronFlashDuration);
  }

  getStats(): PulseStats {
    const activePulseCount = this.activePulses.size;
    const activeNeuronCount = this.activeNeurons.size;

    const averageDelay =
      this.totalHopCount > 0 ? this.totalDelayAccumulator / this.totalHopCount : 0;

    return {
      activeNeuronCount,
      totalPathLength: this.totalPathLength,
      averageDelay,
      activePulseCount,
    };
  }

  resetStats(): void {
    this.totalPathLength = 0;
    this.totalDelayAccumulator = 0;
    this.totalHopCount = 0;
  }

  startStimulus(mode: StimulusMode): void {
    this.stopStimulus();
    this.stimulusMode = mode;
    this.stimulusStartTime = performance.now();
    this.isStimulusRunning = true;
    this.currentStimulusIndex = 0;
    this.resetStats();

    this.stimulusTimeline = this.generateStimulusTimeline(mode);

    if (this.stimulusTimeline.length > 0) {
      const lastEvent = this.stimulusTimeline[this.stimulusTimeline.length - 1];
      this.stimulusDuration = lastEvent.time + 1000;
    }
  }

  private generateStimulusTimeline(mode: StimulusMode): StimulusEvent[] {
    const events: StimulusEvent[] = [];
    const neurons = this.network.getNeurons();

    switch (mode) {
      case 'single': {
        const neuron = this.network.getRandomNeuron();
        if (neuron) {
          events.push({
            neuronId: neuron.id,
            time: 0,
            intensity: this.actionPotentialIntensity,
          });
        }
        break;
      }
      case 'multi': {
        const shuffled = [...neurons].sort(() => Math.random() - 0.5);
        const count = Math.min(5, shuffled.length);
        for (let i = 0; i < count; i++) {
          events.push({
            neuronId: shuffled[i].id,
            time: 0,
            intensity: this.actionPotentialIntensity,
          });
        }
        break;
      }
      case 'cycle': {
        const shuffled = [...neurons].sort(() => Math.random() - 0.5);
        const count = Math.min(8, shuffled.length);
        for (let i = 0; i < count; i++) {
          events.push({
            neuronId: shuffled[i].id,
            time: i * 400,
            intensity: this.actionPotentialIntensity,
          });
        }
        break;
      }
    }

    return events;
  }

  private updateStimulus(now: number): void {
    const elapsed = now - this.stimulusStartTime;

    while (
      this.currentStimulusIndex < this.stimulusTimeline.length &&
      this.stimulusTimeline[this.currentStimulusIndex].time <= elapsed
    ) {
      const event = this.stimulusTimeline[this.currentStimulusIndex];
      this.triggerNeuron(event.neuronId, event.intensity, 0);
      this.currentStimulusIndex++;
    }

    if (elapsed > this.stimulusDuration) {
      this.isStimulusRunning = false;
      this.stimulusMode = 'none';
    }
  }

  stopStimulus(): void {
    this.isStimulusRunning = false;
    this.stimulusMode = 'none';
    this.stimulusTimeline = [];
    this.currentStimulusIndex = 0;
  }

  getStimulusProgress(): number {
    if (!this.isStimulusRunning || this.stimulusDuration === 0) {
      return 0;
    }
    const elapsed = performance.now() - this.stimulusStartTime;
    return Math.min(1, elapsed / this.stimulusDuration);
  }

  isStimulusActive(): boolean {
    return this.isStimulusRunning;
  }

  getStimulusMode(): StimulusMode {
    return this.stimulusMode;
  }

  clearAll(): void {
    this.activePulses.clear();
    this.activeNeurons.clear();
    this.stopStimulus();
    this.resetStats();
  }
}
