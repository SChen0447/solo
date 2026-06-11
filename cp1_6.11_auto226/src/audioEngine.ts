import { PITCH_FREQUENCIES } from './types';

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private volume: number = 0.7;
  private reverbTime: number = 1.5;
  private activePitchSet: Set<string> = new Set();

  private ensureContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.audioContext.destination);

      this.dryGain = this.audioContext.createGain();
      this.dryGain.gain.value = 0.7;
      this.dryGain.connect(this.masterGain);

      this.reverbGain = this.audioContext.createGain();
      this.reverbGain.gain.value = 0.3;
      this.reverbGain.connect(this.masterGain);

      this.reverbNode = this.audioContext.createConvolver();
      this.updateReverbImpulse();
      this.reverbNode.connect(this.reverbGain);
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  private updateReverbImpulse() {
    if (!this.audioContext || !this.reverbNode) return;
    const sampleRate = this.audioContext.sampleRate;
    const duration = this.reverbTime;
    const length = sampleRate * duration;
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
      }
    }
    this.reverbNode.buffer = impulse;
  }

  setVolume(vol: number) {
    this.volume = vol;
    if (this.masterGain) {
      this.masterGain.gain.value = vol;
    }
  }

  setReverbTime(time: number) {
    this.reverbTime = time;
    this.updateReverbImpulse();
    if (this.reverbGain && this.dryGain) {
      const reverbAmount = Math.min(0.5, (time - 0.5) / 5);
      this.reverbGain.gain.value = 0.2 + reverbAmount;
      this.dryGain.gain.value = 0.8 - reverbAmount * 0.5;
    }
  }

  getReverbJitter(): number {
    const normalized = (this.reverbTime - 0.5) / 2.5;
    return normalized * 8;
  }

  playPitch(pitchName: string): boolean {
    if (this.activePitchSet.has(pitchName)) return false;
    this.activePitchSet.add(pitchName);
    this.ensureContext();
    if (!this.audioContext || !this.dryGain || !this.reverbNode) return false;

    const ctx = this.audioContext;
    const freq = PITCH_FREQUENCIES[pitchName] || 440;
    const now = ctx.currentTime;

    const attack = 0.1, decay = 0.3, sustain = 1.2, release = 0.5;
    const totalDur = attack + decay + sustain + release;

    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = freq;

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = freq * 2;

    const osc3 = ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = freq * 1.5;

    const gain1 = ctx.createGain();
    gain1.gain.value = 0;
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.25, now + attack);
    gain1.gain.linearRampToValueAtTime(0.15, now + attack + decay);
    gain1.gain.setValueAtTime(0.15, now + attack + decay + sustain);
    gain1.gain.linearRampToValueAtTime(0, now + totalDur);

    const gain2 = ctx.createGain();
    gain2.gain.value = 0;
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.12, now + attack);
    gain2.gain.linearRampToValueAtTime(0.08, now + attack + decay);
    gain2.gain.setValueAtTime(0.08, now + attack + decay + sustain);
    gain2.gain.linearRampToValueAtTime(0, now + totalDur);

    const gain3 = ctx.createGain();
    gain3.gain.value = 0;
    gain3.gain.setValueAtTime(0, now);
    gain3.gain.linearRampToValueAtTime(0.08, now + attack * 1.5);
    gain3.gain.linearRampToValueAtTime(0.05, now + attack + decay);
    gain3.gain.setValueAtTime(0.05, now + attack + decay + sustain);
    gain3.gain.linearRampToValueAtTime(0, now + totalDur);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2500;
    filter.Q.value = 1.2;

    osc1.connect(gain1);
    osc2.connect(gain2);
    osc3.connect(gain3);
    gain1.connect(filter);
    gain2.connect(filter);
    gain3.connect(filter);

    filter.connect(this.dryGain);
    filter.connect(this.reverbNode);

    osc1.start(now);
    osc2.start(now);
    osc3.start(now);
    osc1.stop(now + totalDur + 0.1);
    osc2.stop(now + totalDur + 0.1);
    osc3.stop(now + totalDur + 0.1);

    setTimeout(() => {
      this.activePitchSet.delete(pitchName);
    }, totalDur * 1000);

    return true;
  }

  resetPitches() {
    this.activePitchSet.clear();
  }
}

export const audioEngine = new AudioEngine();
