import p5 from 'p5';
import { MIN_FREQ, MAX_FREQ } from './types';

interface OscillatorUnit {
  amp: (vol: number, rampTime?: number, timeFromNow?: number) => void;
  freq: (freq: number | any, rampTime?: number, timeFromNow?: number) => void;
  disconnect: () => void;
  connect: (unit?: any) => void;
  start: (timeFromNow?: number) => void;
  stop: (timeFromNow?: number) => void;
}

interface GainUnit {
  amp: (vol: number, rampTime?: number, timeFromNow?: number) => void;
  disconnect: () => void;
  connect: (unit?: any) => void;
}

declare global {
  interface Window {
    p5: any;
  }
}

export class SoundManager {
  private p5Instance: p5;
  private masterVolume: number = 0.5;
  private activeOscillators: Map<string, { osc: OscillatorUnit; gain: GainUnit }> = new Map();
  private vibratoOsc: OscillatorUnit | null = null;
  private vibratoGain: GainUnit | null = null;

  constructor(p5Instance: p5) {
    this.p5Instance = p5Instance;
  }

  private getP5Sound(): any {
    return (window as any).p5;
  }

  private getAudioContextCurrentTime(): number {
    return (this.p5Instance as any).getAudioContext().currentTime;
  }

  initAudio(): void {
    const p5sound = this.getP5Sound();
    this.vibratoOsc = new p5sound.Oscillator(0.5, 'sine');
    this.vibratoGain = new p5sound.Gain();
    if (this.vibratoGain) this.vibratoGain.amp(5);
    if (this.vibratoOsc) {
      this.vibratoOsc.disconnect();
      this.vibratoOsc.connect(this.vibratoGain);
      this.vibratoOsc.start();
    }
  }

  setVolume(value: number): void {
    this.masterVolume = Math.max(0, Math.min(1, value));
  }

  getVolume(): number {
    return this.masterVolume;
  }

  speedToFrequency(speed: number): number {
    const normalizedSpeed = Math.max(0, Math.min(100, speed)) / 100;
    return MIN_FREQ + (MAX_FREQ - MIN_FREQ) * normalizedSpeed;
  }

  playRealTimeSound(speed: number): void {
    const freq = this.speedToFrequency(speed);
    const p5sound = this.getP5Sound();
    const now = this.getAudioContextCurrentTime();

    const osc: OscillatorUnit = new p5sound.Oscillator(freq, 'sine');
    const gain: GainUnit = new p5sound.Gain();
    gain.amp(0, 0, now);
    gain.amp(this.masterVolume * 0.15, 0.02, now);

    if (this.vibratoGain) {
      osc.freq(this.vibratoGain);
    }

    osc.disconnect();
    osc.connect(gain);
    gain.connect();
    osc.start();

    const id = `realtime_${Date.now()}_${Math.random()}`;
    this.activeOscillators.set(id, { osc, gain });

    setTimeout(() => {
      const entry = this.activeOscillators.get(id);
      if (entry) {
        entry.gain.amp(0, 0.05, now);
        entry.osc.stop(now + 0.05);
        this.activeOscillators.delete(id);
      }
    }, 80);
  }

  playTrailCompleteSound(avgSpeed: number): void {
    const freq = this.speedToFrequency(avgSpeed);
    const p5sound = this.getP5Sound();
    const now = this.getAudioContextCurrentTime();

    const osc: OscillatorUnit = new p5sound.Oscillator(freq, 'sine');
    const gain: GainUnit = new p5sound.Gain();
    gain.amp(0, 0, now);
    gain.amp(this.masterVolume * 0.25, 0.05, now);
    gain.amp(0, 1.5, now + 0.05);

    if (this.vibratoGain) {
      osc.freq(this.vibratoGain);
    }

    osc.disconnect();
    osc.connect(gain);
    gain.connect();
    osc.start();
    osc.stop(now + 1.5);

    const id = `complete_${Date.now()}`;
    this.activeOscillators.set(id, { osc, gain });
    setTimeout(() => this.activeOscillators.delete(id), 1600);
  }

  playPulseSound(baseFreq: number): void {
    const p5sound = this.getP5Sound();
    const now = this.getAudioContextCurrentTime();

    const osc: OscillatorUnit = new p5sound.Oscillator(baseFreq, 'triangle');
    const gain: GainUnit = new p5sound.Gain();
    gain.amp(0, 0, now);
    gain.amp(this.masterVolume * 0.2, 0.01, now);
    gain.amp(0, 0.2, now + 0.01);

    osc.disconnect();
    osc.connect(gain);
    gain.connect();
    osc.start();
    osc.stop(now + 0.2);

    const id = `pulse_${Date.now()}_${Math.random()}`;
    this.activeOscillators.set(id, { osc, gain });
    setTimeout(() => this.activeOscillators.delete(id), 250);
  }

  playAscendingScale(): void {
    const p5sound = this.getP5Sound();
    const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];

    notes.forEach((freq, i) => {
      setTimeout(() => {
        const now = this.getAudioContextCurrentTime();
        const osc: OscillatorUnit = new p5sound.Oscillator(freq, 'sine');
        const gain: GainUnit = new p5sound.Gain();
        gain.amp(0, 0, now);
        gain.amp(this.masterVolume * 0.3, 0.01, now);
        gain.amp(0, 0.08, now + 0.02);

        osc.disconnect();
        osc.connect(gain);
        gain.connect();
        osc.start();
        osc.stop(now + 0.1);
      }, i * 100);
    });
  }

  stopAll(): void {
    const now = this.getAudioContextCurrentTime();
    this.activeOscillators.forEach(({ osc, gain }) => {
      gain.amp(0, 0.1, now);
      osc.stop(now + 0.1);
    });
    this.activeOscillators.clear();
  }
}
