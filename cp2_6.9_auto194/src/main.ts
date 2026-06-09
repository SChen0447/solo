import { Sequencer } from './sequencer.js';
import { synth } from './synth.js';

const GRID_COLS = 8;
const GRID_ROWS = 8;
const LOOKAHEAD = 25;
const SCHEDULE_AHEAD = 0.1;

class App {
  private sequencer: Sequencer;
  private isPlaying = false;
  private nextNoteTime = 0;
  private currentStep = 0;
  private timerId: number | null = null;
  private rafId: number | null = null;
  private startContextTime = 0;
  private bpm = 120;

  constructor() {
    this.sequencer = new Sequencer();
    this.bindEvents();
  }

  private bindEvents(): void {
    this.sequencer.on('togglePlay', () => this.togglePlay());
    this.sequencer.on('bpmChange', (bpm) => {
      if (typeof bpm === 'number') this.bpm = bpm;
    });
    this.sequencer.on('reset', () => this.reset());
    window.addEventListener('resize', () => this.sequencer.resize());
  }

  private togglePlay(): void {
    this.isPlaying = !this.isPlaying;
    this.sequencer.setPlaying(this.isPlaying);
    if (this.isPlaying) {
      this.startPlayback();
    } else {
      this.stopPlayback();
    }
  }

  private startPlayback(): void {
    synth.ensureContext();
    this.currentStep = 0;
    this.nextNoteTime = synth.currentTime + 0.05;
    this.startContextTime = synth.currentTime;
    this.scheduler();
    this.startVisualClock();
  }

  private stopPlayback(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.sequencer.setStep(0, 0);
  }

  private reset(): void {
    this.stopPlayback();
    this.isPlaying = false;
    this.currentStep = 0;
  }

  private scheduler(): void {
    const secondsPerBeat = 60.0 / this.bpm;
    while (this.nextNoteTime < synth.currentTime + SCHEDULE_AHEAD) {
      this.scheduleStep(this.currentStep, this.nextNoteTime);
      this.nextNoteTime += secondsPerBeat;
      this.currentStep = (this.currentStep + 1) % GRID_COLS;
    }
    this.timerId = window.setTimeout(() => this.scheduler(), LOOKAHEAD);
  }

  private scheduleStep(step: number, time: number): void {
    for (let row = 0; row < GRID_ROWS; row++) {
      if (this.sequencer.isRowMuted(row)) continue;
      const key = `${row}-${step}`;
      const note = this.sequencer.state.notes.get(key);
      if (note) {
        synth.playNote(note.instrument, note.pitch, note.volume, note.duration, time, this.bpm);
      }
    }
  }

  private startVisualClock(): void {
    const updateVisual = (): void => {
      if (!this.isPlaying) return;
      const secondsPerBeat = 60.0 / this.bpm;
      const elapsed = synth.currentTime - this.startContextTime;
      const totalBeats = (this.currentStep === 0 ? GRID_COLS : this.currentStep);
      const cycleDuration = totalBeats * secondsPerBeat;
      let cycleElapsed = elapsed % cycleDuration;
      if (cycleElapsed < 0) cycleElapsed += cycleDuration;
      const step = Math.floor(cycleElapsed / secondsPerBeat);
      const progress = (cycleElapsed % secondsPerBeat) / secondsPerBeat;
      this.sequencer.setStep(step % GRID_COLS, progress);
      this.rafId = requestAnimationFrame(updateVisual);
    };
    updateVisual();
  }
}

function noteKey(row: number, col: number): string {
  return `${row}-${col}`;
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
