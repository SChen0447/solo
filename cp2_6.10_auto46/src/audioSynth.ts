export class AudioSynth {
  private context: AudioContext | null = null;
  private initialized = false;
  private noiseBuffer: AudioBuffer | null = null;

  constructor() {}

  async init(): Promise<void> {
    if (this.initialized) return;
    this.context = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    this.noiseBuffer = this.createNoiseBuffer();
    this.initialized = true;
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  private createNoiseBuffer(): AudioBuffer {
    if (!this.context) throw new Error('AudioContext not initialized');
    const bufferSize = 2 * this.context.sampleRate;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  playKick(): void {
    if (!this.context) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.5);

    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.context.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  playSnare(): void {
    if (!this.context || !this.noiseBuffer) return;
    const now = this.context.currentTime;

    const noise = this.context.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const noiseFilter = this.context.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;

    const noiseGain = this.context.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.context.destination);

    const osc = this.context.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.1);

    const oscGain = this.context.createGain();
    oscGain.gain.setValueAtTime(0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(oscGain);
    oscGain.connect(this.context.destination);

    noise.start(now);
    noise.stop(now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playHiHat(open = false): void {
    if (!this.context || !this.noiseBuffer) return;
    const now = this.context.currentTime;
    const duration = open ? 0.3 : 0.05;

    const noise = this.context.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.context.destination);

    noise.start(now);
    noise.stop(now + duration);
  }

  playBeat(beatIndex: number, subdivisionIndex: number): void {
    if (!this.initialized) {
      this.init();
      return;
    }
    if (subdivisionIndex === 0) {
      if (beatIndex === 0) {
        this.playKick();
      } else if (beatIndex === 2) {
        this.playSnare();
      } else {
        this.playKick();
      }
    } else {
      this.playHiHat(false);
    }
  }

  playManualHit(): void {
    if (!this.initialized) {
      this.init();
      return;
    }
    this.playSnare();
  }

  destroy(): void {
    if (this.context) {
      this.context.close();
      this.context = null;
    }
    this.initialized = false;
    this.noiseBuffer = null;
  }
}
