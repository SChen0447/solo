export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseGain: GainNode | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private isNoisePlaying: boolean = false;
  private currentToneOsc: OscillatorNode | null = null;
  private currentToneGain: GainNode | null = null;
  private isInitialized: boolean = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.audioContext.destination);

    this.noiseGain = this.audioContext.createGain();
    this.noiseGain.gain.value = 0;
    this.noiseFilter = this.audioContext.createBiquadFilter();
    this.noiseFilter.type = 'lowpass';
    this.noiseFilter.frequency.value = 800;
    this.noiseGain.connect(this.noiseFilter);
    this.noiseFilter.connect(this.masterGain);

    this.isInitialized = true;
  }

  resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  playDrip(intensity: number = 0.3): void {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.1);

    gain.gain.setValueAtTime(0, this.audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(intensity * 0.6, this.audioContext.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.3);

    const noiseOsc = this.audioContext.createOscillator();
    const noiseGain2 = this.audioContext.createGain();
    noiseOsc.type = 'triangle';
    noiseOsc.frequency.value = 200 + Math.random() * 100;
    noiseGain2.gain.setValueAtTime(intensity * 0.2, this.audioContext.currentTime);
    noiseGain2.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.08);
    noiseOsc.connect(noiseGain2);
    noiseGain2.connect(this.masterGain);
    noiseOsc.start();
    noiseOsc.stop(this.audioContext.currentTime + 0.08);
  }

  startFlow(intensity: number = 0.5): void {
    if (!this.audioContext || !this.masterGain || !this.noiseGain || !this.noiseFilter) return;

    this.resume();

    if (!this.isNoisePlaying) {
      this.noiseSource = this.createNoiseSource();
      this.noiseSource.loop = true;
      this.noiseSource.connect(this.noiseGain);
      this.noiseSource.start();
      this.isNoisePlaying = true;
    }

    const targetVolume = intensity * 0.4;
    this.noiseGain.gain.cancelScheduledValues(this.audioContext.currentTime);
    this.noiseGain.gain.setValueAtTime(this.noiseGain.gain.value, this.audioContext.currentTime);
    this.noiseGain.gain.linearRampToValueAtTime(targetVolume, this.audioContext.currentTime + 0.05);

    this.noiseFilter.frequency.cancelScheduledValues(this.audioContext.currentTime);
    this.noiseFilter.frequency.setValueAtTime(this.noiseFilter.frequency.value, this.audioContext.currentTime);
    this.noiseFilter.frequency.linearRampToValueAtTime(600 + intensity * 400, this.audioContext.currentTime + 0.05);

    if (!this.currentToneOsc) {
      this.currentToneOsc = this.audioContext.createOscillator();
      this.currentToneGain = this.audioContext.createGain();
      this.currentToneOsc.type = 'sine';
      this.currentToneOsc.frequency.value = 200;
      this.currentToneGain.gain.value = 0;
      this.currentToneOsc.connect(this.currentToneGain);
      this.currentToneGain.connect(this.masterGain);
      this.currentToneOsc.start();
    }

    if (this.currentToneGain) {
      this.currentToneGain.gain.cancelScheduledValues(this.audioContext.currentTime);
      this.currentToneGain.gain.setValueAtTime(this.currentToneGain.gain.value, this.audioContext.currentTime);
      this.currentToneGain.gain.linearRampToValueAtTime(intensity * 0.15, this.audioContext.currentTime + 0.05);
    }
  }

  stopFlow(): void {
    if (!this.audioContext || !this.noiseGain || !this.currentToneGain) return;

    this.noiseGain.gain.cancelScheduledValues(this.audioContext.currentTime);
    this.noiseGain.gain.setValueAtTime(this.noiseGain.gain.value, this.audioContext.currentTime);
    this.noiseGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.2);

    if (this.currentToneGain) {
      this.currentToneGain.gain.cancelScheduledValues(this.audioContext.currentTime);
      this.currentToneGain.gain.setValueAtTime(this.currentToneGain.gain.value, this.audioContext.currentTime);
      this.currentToneGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.2);
    }

    setTimeout(() => {
      if (this.noiseSource && this.isNoisePlaying) {
        this.noiseSource.stop();
        this.noiseSource.disconnect();
        this.noiseSource = null;
        this.isNoisePlaying = false;
      }
      if (this.currentToneOsc) {
        this.currentToneOsc.stop();
        this.currentToneOsc.disconnect();
        this.currentToneOsc = null;
      }
      if (this.currentToneGain) {
        this.currentToneGain.disconnect();
        this.currentToneGain = null;
      }
    }, 250);
  }

  playCompletionChime(): void {
    if (!this.audioContext || !this.masterGain) return;

    const now = this.audioContext.currentTime;
    const durations = [0.15, 0.15];
    const freqs = [800, 1200];

    for (let i = 0; i < 2; i++) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.value = freqs[i];

      const startTime = now + i * 0.12;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.4, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + durations[i]);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + durations[i]);
    }

    const osc2 = this.audioContext.createOscillator();
    const gain2 = this.audioContext.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = 1000;
    const startTime2 = now + 0.24;
    gain2.gain.setValueAtTime(0, startTime2);
    gain2.gain.linearRampToValueAtTime(0.3, startTime2 + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.001, startTime2 + 0.4);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(startTime2);
    osc2.stop(startTime2 + 0.4);
  }

  private createNoiseSource(): AudioBufferSourceNode {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    const bufferSize = 2 * this.audioContext.sampleRate;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = noiseBuffer;
    return source;
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain && this.audioContext) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.audioContext.currentTime);
    }
  }

  destroy(): void {
    if (this.noiseSource) {
      try { this.noiseSource.stop(); } catch { /* no-op */ }
      this.noiseSource.disconnect();
      this.noiseSource = null;
    }
    if (this.currentToneOsc) {
      try { this.currentToneOsc.stop(); } catch { /* no-op */ }
      this.currentToneOsc.disconnect();
      this.currentToneOsc = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.isInitialized = false;
    this.isNoisePlaying = false;
  }
}
