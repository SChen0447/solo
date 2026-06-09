export type WaveformType = 'sine' | 'square' | 'sawtooth';

export class Synth {
  audioContext: AudioContext;
  masterGain: GainNode;
  volume: number;

  constructor() {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioCtx();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.3;
    this.volume = 0.3;
    this.masterGain.connect(this.audioContext.destination);
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    this.masterGain.gain.setTargetAtTime(this.volume, this.audioContext.currentTime, 0.01);
  }

  resume(): void {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  createOscillator(
    frequency: number,
    type: OscillatorType,
    gain: number = 0.3
  ): { osc: OscillatorNode; gain: GainNode } {
    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gainNode.gain.value = 0;
    gainNode.gain.setTargetAtTime(gain, this.audioContext.currentTime, 0.02);
    osc.connect(gainNode);
    gainNode.connect(this.masterGain);
    osc.start();
    return { osc, gain: gainNode };
  }

  stopOscillator(osc: OscillatorNode, gain: GainNode): void {
    const now = this.audioContext.currentTime;
    gain.gain.setTargetAtTime(0, now, 0.05);
    setTimeout(() => {
      try {
        osc.stop();
        osc.disconnect();
        gain.disconnect();
      } catch (_e) {
        // ignore
      }
    }, 100);
  }

  playHarmony(
    frequencies: number[],
    type: OscillatorType,
    duration: number = 1.5
  ): void {
    const now = this.audioContext.currentTime;
    frequencies.forEach((freq) => {
      const osc = this.audioContext.createOscillator();
      const g = this.audioContext.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.15, now + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + duration);
    });
  }

  static gcd(a: number, b: number): number {
    a = Math.floor(Math.abs(a));
    b = Math.floor(Math.abs(b));
    while (b !== 0) {
      const t = b;
      b = a % b;
      a = t;
    }
    return a;
  }

  static lcm(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    return Math.abs(a * b) / Synth.gcd(a, b);
  }

  getLCM(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    let result = Math.floor(numbers[0]);
    for (let i = 1; i < numbers.length; i++) {
      result = Synth.lcm(result, Math.floor(numbers[i]));
      if (result > 4000) {
        result = Math.floor(numbers.reduce((a, b) => a + b, 0) / numbers.length);
        break;
      }
    }
    return Math.max(20, Math.min(4000, result));
  }
}
