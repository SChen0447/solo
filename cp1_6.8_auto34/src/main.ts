import { NeuronNetwork } from './neuronNetwork';
import { PulseEngine } from './pulseEngine';
import { NeuronRenderer } from './renderer';
import { ControlPanel, BackgroundMode } from './controlPanel';

class NeuralNetworkApp {
  private container: HTMLElement;
  private network: NeuronNetwork;
  private pulseEngine: PulseEngine;
  private renderer: NeuronRenderer;
  private controlPanel: ControlPanel;

  private animationId: number = 0;
  private lastTime: number = 0;
  private fps: number = 0;
  private fpsFrames: number = 0;
  private fpsLastUpdate: number = 0;

  constructor() {
    const canvasContainer = document.getElementById('canvas-container');
    if (!canvasContainer) {
      throw new Error('Canvas container not found');
    }
    this.container = canvasContainer;

    this.network = new NeuronNetwork({
      neuronCount: 18,
      worldSize: 8,
      connectionDistance: 5,
      minConnections: 2,
      maxConnections: 5,
      dendriteCount: 4,
      dendriteLength: 1.2,
    });

    this.pulseEngine = new PulseEngine(this.network);

    this.renderer = new NeuronRenderer(this.container, this.network, this.pulseEngine);

    this.controlPanel = new ControlPanel();

    this.setupCallbacks();
    this.applyInitialSettings();
    this.startAnimationLoop();
  }

  private setupCallbacks(): void {
    this.renderer.setOnNeuronClick((neuronId) => {
      this.handleNeuronClick(neuronId);
    });

    this.controlPanel.setCallbacks({
      onDelayChange: (delay) => {
        this.pulseEngine.setTransmissionDelay(delay);
      },
      onSpeedChange: (speed) => {
        this.pulseEngine.setPulseSpeedMultiplier(speed);
      },
      onIntensityChange: (intensity) => {
        this.pulseEngine.setActionPotentialIntensity(intensity);
      },
      onBackgroundChange: (mode) => {
        this.handleBackgroundChange(mode);
      },
      onSingleStimulus: () => {
        this.handleSingleStimulus();
      },
      onMultiStimulus: () => {
        this.handleMultiStimulus();
      },
      onCycleStimulus: () => {
        this.handleCycleStimulus();
      },
      onReset: () => {
        this.handleReset();
      },
    });
  }

  private applyInitialSettings(): void {
    const state = this.controlPanel.getState();
    this.pulseEngine.setTransmissionDelay(state.transmissionDelay);
    this.pulseEngine.setPulseSpeedMultiplier(state.pulseSpeed);
    this.pulseEngine.setActionPotentialIntensity(state.actionPotentialIntensity);
    this.handleBackgroundChange(state.backgroundMode);
  }

  private handleNeuronClick(neuronId: number): void {
    this.pulseEngine.resetStats();
    this.pulseEngine.triggerNeuron(neuronId, undefined, 0);
  }

  private handleBackgroundChange(mode: BackgroundMode): void {
    const color = this.controlPanel.getBackgroundColor();
    this.renderer.setBackgroundColor(color);
  }

  private handleSingleStimulus(): void {
    this.pulseEngine.startStimulus('single');
  }

  private handleMultiStimulus(): void {
    this.pulseEngine.startStimulus('multi');
  }

  private handleCycleStimulus(): void {
    this.pulseEngine.startStimulus('cycle');
  }

  private handleReset(): void {
    this.pulseEngine.clearAll();
    this.network.regenerate();
    this.renderer.rebuildNetwork();
    this.controlPanel.clearActiveButtons();
  }

  private startAnimationLoop(): void {
    this.lastTime = performance.now();
    this.fpsLastUpdate = performance.now();
    this.animate();
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.updateFPS(currentTime);

    this.pulseEngine.update(deltaTime);
    this.renderer.update(deltaTime);
    this.renderer.render();
    this.updateStats();
    this.updateTimeline();
  };

  private updateFPS(currentTime: number): void {
    this.fpsFrames++;
    if (currentTime - this.fpsLastUpdate >= 500) {
      this.fps = Math.round(
        (this.fpsFrames * 1000) / (currentTime - this.fpsLastUpdate)
      );
      this.fpsFrames = 0;
      this.fpsLastUpdate = currentTime;
    }
  }

  private updateStats(): void {
    const stats = this.pulseEngine.getStats();
    this.controlPanel.updateStats(
      stats.activeNeuronCount,
      stats.totalPathLength,
      stats.averageDelay,
      this.fps
    );
  }

  private updateTimeline(): void {
    if (this.pulseEngine.isStimulusActive()) {
      const progress = this.pulseEngine.getStimulusProgress();
      const mode = this.pulseEngine.getStimulusMode();
      let label = '';
      switch (mode) {
        case 'single':
          label = '单点刺激';
          break;
        case 'multi':
          label = '多点同步刺激';
          break;
        case 'cycle':
          label = '循环刺激';
          break;
      }
      this.controlPanel.updateTimeline(progress, label);
    } else {
      this.controlPanel.updateTimeline(0);
    }
  }

  dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.renderer.dispose();
  }
}

function initApp(): void {
  try {
    const app = new NeuralNetworkApp();
    (window as any).neuralApp = app;
  } catch (error) {
    console.error('Failed to initialize neural network app:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

export {};
