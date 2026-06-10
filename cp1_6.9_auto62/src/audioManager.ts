export type RuneColor = 'red' | 'green' | 'blue' | 'yellow' | 'purple';

export const COLOR_MAP: Record<RuneColor, string> = {
  red: '#ff3366',
  green: '#33ff66',
  blue: '#3366ff',
  yellow: '#ffcc33',
  purple: '#cc33ff'
};

export const COLOR_NOTES: Record<RuneColor, number> = {
  red: 261.63,
  green: 293.66,
  blue: 329.63,
  yellow: 349.23,
  purple: 392.00
};

class AudioManager {
  private audioContext: AudioContext | null = null;
  private reverbBuffer: AudioBuffer | null = null;
  private delayNode: DelayNode | null = null;
  private feedbackGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private masterGain: GainNode | null = null;
  private activeVoices: Map<RuneColor, GainNode[]> = new Map();
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.7;
    this.masterGain.connect(this.audioContext.destination);

    this.delayNode = this.audioContext.createDelay(2.0);
    this.delayNode.delayTime.value = 0.2;

    this.feedbackGain = this.audioContext.createGain();
    this.feedbackGain.gain.value = 0.15;

    this.reverbBuffer = this.generateReverbImpulseResponse();
    this.reverbNode = this.audioContext.createConvolver();
    this.reverbNode.buffer = this.reverbBuffer;

    this.delayNode.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delayNode);
    this.delayNode.connect(this.masterGain);
    this.reverbNode.connect(this.masterGain);

    this.initialized = true;
  }

  private generateReverbImpulseResponse(): AudioBuffer {
    const sampleRate = this.audioContext!.sampleRate;
    const length = sampleRate * 2.0;
    const impulse = this.audioContext!.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const decay = Math.pow(1 - i / length, 2.5);
        channelData[i] = (Math.random() * 2 - 1) * decay * 0.5;
      }
    }

    return impulse;
  }

  async playNote(color: RuneColor, resonanceLevel: number = 0): Promise<void> {
    if (!this.initialized || !this.audioContext) return;

    const ctx = this.audioContext;
    const frequency = COLOR_NOTES[color];
    const now = ctx.currentTime;
    const duration = 1.5;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'sine';
    osc1.frequency.value = frequency;

    osc2.type = 'triangle';
    osc2.frequency.value = frequency * 2;

    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    filter.Q.value = 0.5;

    const baseVolume = 0.35;
    const resonanceBoost = Math.min(resonanceLevel * 0.08, 0.4);
    const peakVolume = baseVolume + resonanceBoost;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(peakVolume, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(peakVolume * 0.6, now + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const dryGain = ctx.createGain();
    const reverbSend = ctx.createGain();
    const delaySend = ctx.createGain();

    dryGain.gain.value = 0.6;
    reverbSend.gain.value = 0.3 + resonanceBoost * 0.2;
    delaySend.gain.value = 0.25;

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(filter);

    filter.connect(dryGain);
    filter.connect(reverbSend);
    filter.connect(delaySend);

    dryGain.connect(this.masterGain!);
    reverbSend.connect(this.reverbNode!);
    delaySend.connect(this.delayNode!);

    if (!this.activeVoices.has(color)) {
      this.activeVoices.set(color, []);
    }
    this.activeVoices.get(color)!.push(gainNode);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);

    setTimeout(() => {
      const voices = this.activeVoices.get(color);
      if (voices) {
        const idx = voices.indexOf(gainNode);
        if (idx > -1) voices.splice(idx, 1);
      }
    }, duration * 1000 + 100);
  }

  async playChord(colors: RuneColor[]): Promise<void> {
    if (!this.initialized || !this.audioContext) return;

    const promises = colors.map((color, i) =>
      new Promise<void>((resolve) => {
        setTimeout(() => {
          this.playNote(color, colors.length - 1).then(resolve);
        }, i * 60);
      })
    );

    await Promise.all(promises);
  }

  resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const audioManager = new AudioManager();
