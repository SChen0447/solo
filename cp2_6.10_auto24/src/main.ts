import './styles.css';
import cloneDeep from 'lodash/cloneDeep';
import { ExperimentEngine } from './experimentEngine';
import { LabRenderer } from './labRenderer';
import { ToolManager } from './toolManager';
import {
  ToolType,
  ChemicalType,
  Container,
  AlcoholLamp,
  RecordStep,
  ExperimentRecord,
  LabState,
  DropperState,
  ActionType,
} from './types';
import { CHEMICAL_DATA } from './chemicals';

const STORAGE_KEY = 'virtual_chem_lab_records';

class ChemistryLabApp {
  private engine: ExperimentEngine;
  private renderer: LabRenderer;
  private toolManager: ToolManager;

  private canvas: HTMLCanvasElement;
  private labArea: HTMLElement;
  private toolbar: HTMLElement;
  private tempChart: HTMLCanvasElement;
  private equationEl: HTMLElement;
  private warningOverlay: HTMLElement;
  private warningMessage: HTMLElement;

  private btnRecord: HTMLButtonElement;
  private btnStop: HTMLButtonElement;
  private btnPlayback: HTMLButtonElement;
  private btnReset: HTMLButtonElement;
  private speedSelect: HTMLSelectElement;

  private dropperState: DropperState;

  private isRecording: boolean = false;
  private isPlaying: boolean = false;
  private recordStartTime: number = 0;
  private recordedSteps: RecordStep[] = [];
  private playbackStartTime: number = 0;
  private playbackStepIndex: number = 0;
  private playbackSpeed: number = 1;
  private playbackRecord: ExperimentRecord | null = null;

  private lastFrameTime: number = 0;
  private animationId: number = 0;
  private warningTimeout: number | null = null;
  private autoResetTimeout: number | null = null;

  constructor() {
    this.canvas = document.getElementById('lab-canvas') as HTMLCanvasElement;
    this.labArea = document.getElementById('lab-area') as HTMLElement;
    this.toolbar = document.getElementById('toolbar') as HTMLElement;
    this.tempChart = document.getElementById('temp-chart') as HTMLCanvasElement;
    this.equationEl = document.getElementById('reaction-equation') as HTMLElement;
    this.warningOverlay = document.getElementById('warning-overlay') as HTMLElement;
    this.warningMessage = document.getElementById('warning-message') as HTMLElement;

    this.btnRecord = document.getElementById('btn-record') as HTMLButtonElement;
    this.btnStop = document.getElementById('btn-stop') as HTMLButtonElement;
    this.btnPlayback = document.getElementById('btn-playback') as HTMLButtonElement;
    this.btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
    this.speedSelect = document.getElementById('playback-speed') as HTMLSelectElement;

    this.engine = new ExperimentEngine();
    this.renderer = new LabRenderer(this.canvas, this.tempChart);

    this.dropperState = {
      isActive: false,
      chemical: null,
      x: 0,
      y: 0,
      isCooling: false,
      coolStartTime: 0,
    };

    this.toolManager = new ToolManager(this.toolbar, this.labArea, this.canvas, {
      onToolDragStart: () => {},
      onToolDragEnd: () => {},
      onLabDrop: (tool, x, y) => this.handleLabDrop(tool, x, y),
      onChemicalSelect: (chemical) => this.handleChemicalSelect(chemical),
      onLabChemicalDrop: () => {},
      onContainerClick: (id) => this.handleContainerClick(id),
      onLampClick: (id) => this.handleLampClick(id),
      onLabCanvasClick: (x, y) => this.handleCanvasClick(x, y),
      onLabCanvasMouseMove: (x, y) => this.handleCanvasMouseMove(x, y),
      onActionSelect: (action) => this.handleActionSelect(action),
    });

    this.setupControlButtons();
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
  }

  start(): void {
    this.lastFrameTime = performance.now();
    this.gameLoop();
  }

  private gameLoop(): void {
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    if (this.isPlaying && this.playbackRecord) {
      this.updatePlayback(now);
    }

    if (!this.isPlaying) {
      this.engine.update(deltaTime);
    }

    if (this.dropperState.isCooling) {
      if (now - this.dropperState.coolStartTime > 300) {
        this.dropperState.isCooling = false;
      }
    }

    const state = this.engine.getState();
    this.equationEl.textContent = state.currentEquation;
    this.renderer.render(state, this.dropperState);

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private handleResize(): void {
    this.renderer.resize();
  }

  private handleLabDrop(tool: ToolType, x: number, y: number): void {
    if (this.isPlaying) return;

    if (tool === 'testTube' || tool === 'beaker') {
      this.engine.addContainer(tool, x - 25, y - 75);
      this.recordStep({
        timestamp: performance.now() - this.recordStartTime,
        action: 'addChemical',
        chemical: undefined,
      });
    } else if (tool === 'alcoholLamp') {
      this.engine.addLamp(x - 30, y - 35);
    } else if (tool === 'dropper') {
      this.dropperState.isActive = true;
    }
  }

  private handleChemicalSelect(chemical: ChemicalType): void {
    if (this.isPlaying) return;
    this.dropperState.isActive = true;
    this.dropperState.chemical = chemical;
  }

  private handleActionSelect(action: 'heat' | 'cool'): void {
    if (this.isPlaying) return;
  }

  private handleContainerClick(containerId: string): void {
    if (this.isPlaying) return;

    const state = this.engine.getState();
    const container = state.containers.find((c) => c.id === containerId);
    if (!container) return;

    const selectedAction = this.toolManager.getSelectedAction();
    if (selectedAction === 'heat') {
      this.engine.heatContainer(containerId);
      this.toolManager.clearSelectedAction();
      this.recordStep({
        timestamp: performance.now() - this.recordStartTime,
        action: 'heat',
        containerId,
      });
    } else if (selectedAction === 'cool') {
      this.engine.coolContainer(containerId);
      this.toolManager.clearSelectedAction();
      this.recordStep({
        timestamp: performance.now() - this.recordStartTime,
        action: 'cool',
        containerId,
      });
    } else {
      const nearbyLamp = this.findNearbyLamp(container);
      if (nearbyLamp) {
        if (container.isHeating) {
          this.engine.removeContainerFromLamp(containerId);
          this.recordStep({
            timestamp: performance.now() - this.recordStartTime,
            action: 'removeFromLamp',
            containerId,
            targetId: nearbyLamp.id,
          });
        } else {
          this.engine.placeContainerOnLamp(containerId, nearbyLamp.id);
          this.recordStep({
            timestamp: performance.now() - this.recordStartTime,
            action: 'placeOnLamp',
            containerId,
            targetId: nearbyLamp.id,
          });
        }
      }
    }
  }

  private handleLampClick(lampId: string): void {
    if (this.isPlaying) return;
  }

  private handleCanvasClick(x: number, y: number): void {
    if (this.isPlaying) return;

    const state = this.engine.getState();

    for (const container of state.containers) {
      if (this.isPointInContainer(x, y, container)) {
        if (this.dropperState.isActive && this.dropperState.chemical && !this.dropperState.isCooling) {
          const result = this.engine.addChemical(container.id, this.dropperState.chemical);
          this.dropperState.isCooling = true;
          this.dropperState.coolStartTime = performance.now();

          this.recordStep({
            timestamp: performance.now() - this.recordStartTime,
            action: 'addChemical',
            containerId: container.id,
            chemical: this.dropperState.chemical,
          });

          if (result.dangerous && result.warningMessage) {
            this.showWarning(result.warningMessage);
          }
        } else {
          this.handleContainerClick(container.id);
        }
        return;
      }
    }

    for (const lamp of state.lamps) {
      if (this.isPointInLamp(x, y, lamp)) {
        this.handleLampClick(lamp.id);
        return;
      }
    }
  }

  private handleCanvasMouseMove(x: number, y: number): void {
    if (this.dropperState.isActive) {
      this.dropperState.x = x;
      this.dropperState.y = y;
    }
  }

  private findNearbyLamp(container: Container): AlcoholLamp | null {
    const state = this.engine.getState();
    const containerCenterX = container.x + container.width / 2;
    const containerBottomY = container.y + container.height;

    for (const lamp of state.lamps) {
      const lampCenterX = lamp.x + lamp.width / 2;
      const lampTopY = lamp.y;
      const dx = Math.abs(containerCenterX - lampCenterX);
      const dy = Math.abs(containerBottomY - lampTopY);
      if (dx < 80 && dy < 150) {
        return lamp;
      }
    }
    return null;
  }

  private isPointInContainer(x: number, y: number, container: Container): boolean {
    return x >= container.x && x <= container.x + container.width && y >= container.y && y <= container.y + container.height;
  }

  private isPointInLamp(x: number, y: number, lamp: AlcoholLamp): boolean {
    return x >= lamp.x && x <= lamp.x + lamp.width && y >= lamp.y - 30 && y <= lamp.y + lamp.height;
  }

  private setupControlButtons(): void {
    this.btnRecord.addEventListener('click', () => this.startRecording());
    this.btnStop.addEventListener('click', () => this.stopRecording());
    this.btnPlayback.addEventListener('click', () => this.startPlayback());
    this.btnReset.addEventListener('click', () => this.resetLab());
    this.speedSelect.addEventListener('change', (e) => {
      this.playbackSpeed = parseFloat((e.target as HTMLSelectElement).value);
    });
  }

  private startRecording(): void {
    this.isRecording = true;
    this.recordStartTime = performance.now();
    this.recordedSteps = [];
    this.btnRecord.disabled = true;
    this.btnStop.disabled = false;
    this.btnPlayback.disabled = true;
  }

  private stopRecording(): void {
    if (!this.isRecording) return;

    this.isRecording = false;
    const record: ExperimentRecord = {
      id: `record_${Date.now()}`,
      startTime: this.recordStartTime,
      endTime: performance.now(),
      steps: this.recordedSteps,
      initialState: cloneDeep({
        containers: [],
        lamps: [],
      }),
    };

    this.saveRecord(record);

    this.btnRecord.disabled = false;
    this.btnStop.disabled = true;
    this.btnPlayback.disabled = false;
  }

  private recordStep(step: RecordStep): void {
    if (this.isRecording) {
      this.recordedSteps.push(cloneDeep(step));
    }
  }

  private saveRecord(record: ExperimentRecord): void {
    try {
      const records = this.loadRecords();
      records.push(record);
      if (records.length > 10) records.shift();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('Failed to save record:', e);
    }
  }

  private loadRecords(): ExperimentRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load records:', e);
      return [];
    }
  }

  private startPlayback(): void {
    const records = this.loadRecords();
    if (records.length === 0) {
      alert('暂无实验记录可回放');
      return;
    }

    this.playbackRecord = records[records.length - 1];
    this.resetLab();

    this.isPlaying = true;
    this.playbackStartTime = performance.now();
    this.playbackStepIndex = 0;
    this.playbackSpeed = parseFloat(this.speedSelect.value);

    this.btnRecord.disabled = true;
    this.btnStop.disabled = true;
    this.btnPlayback.textContent = '停止回放';
    this.btnPlayback.onclick = () => this.stopPlayback();
  }

  private stopPlayback(): void {
    this.isPlaying = false;
    this.playbackRecord = null;
    this.btnRecord.disabled = false;
    this.btnStop.disabled = false;
    this.btnPlayback.textContent = '回放实验';
    this.btnPlayback.onclick = () => this.startPlayback();
  }

  private updatePlayback(now: number): void {
    if (!this.playbackRecord) return;

    const elapsed = (now - this.playbackStartTime) * this.playbackSpeed;

    while (this.playbackStepIndex < this.playbackRecord.steps.length) {
      const step = this.playbackRecord.steps[this.playbackStepIndex];
      if (step.timestamp <= elapsed) {
        this.executePlaybackStep(step);
        this.playbackStepIndex++;
      } else {
        break;
      }
    }

    this.engine.update(16);

    if (this.playbackStepIndex >= this.playbackRecord.steps.length) {
      setTimeout(() => this.stopPlayback(), 500);
    }
  }

  private executePlaybackStep(step: RecordStep): void {
    switch (step.action) {
      case 'addChemical':
        if (step.containerId && step.chemical) {
          this.engine.addChemical(step.containerId, step.chemical);
        }
        break;
      case 'heat':
        if (step.containerId) {
          this.engine.heatContainer(step.containerId);
        }
        break;
      case 'cool':
        if (step.containerId) {
          this.engine.coolContainer(step.containerId);
        }
        break;
      case 'placeOnLamp':
        if (step.containerId && step.targetId) {
          this.engine.placeContainerOnLamp(step.containerId, step.targetId);
        }
        break;
      case 'removeFromLamp':
        if (step.containerId) {
          this.engine.removeContainerFromLamp(step.containerId);
        }
        break;
    }
  }

  private showWarning(message: string): void {
    this.warningMessage.textContent = message;
    this.warningOverlay.classList.remove('hidden');

    if (this.warningTimeout) {
      window.clearTimeout(this.warningTimeout);
    }

    this.warningTimeout = window.setTimeout(() => {
      this.warningOverlay.classList.add('hidden');
    }, 2000);

    if (this.autoResetTimeout) {
      window.clearTimeout(this.autoResetTimeout);
    }

    this.autoResetTimeout = window.setTimeout(() => {
      this.resetLab();
    }, 30000);
  }

  private resetLab(): void {
    this.engine.reset();
    this.dropperState = {
      isActive: false,
      chemical: null,
      x: 0,
      y: 0,
      isCooling: false,
      coolStartTime: 0,
    };
    this.toolManager.clearSelectedChemical();
    this.toolManager.clearSelectedAction();
  }

  destroy(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.handleResize);
    if (this.warningTimeout) window.clearTimeout(this.warningTimeout);
    if (this.autoResetTimeout) window.clearTimeout(this.autoResetTimeout);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new ChemistryLabApp();
  app.start();
});
