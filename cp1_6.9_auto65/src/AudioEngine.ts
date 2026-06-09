export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: Set<OscillatorNode> = new Set();

  public init(): void {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
      sampleRate: 44100
    });
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.6;
    this.masterGain.connect(this.ctx.destination);
  }

  public get currentTime(): number {
    return this.ctx?.currentTime ?? 0;
  }

  public setVolume(value: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, value));
    }
  }

  public playNote(frequency: number, duration: number, startTime?: number): OscillatorNode {
    if (!this.ctx || !this.masterGain) {
      this.init();
    }
    const ctx = this.ctx!;
    const master = this.masterGain!;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = frequency;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    filter.Q.value = 1;

    const gain = ctx.createGain();
    const actualStart = startTime ?? ctx.currentTime;

    gain.gain.setValueAtTime(0, actualStart);
    gain.gain.linearRampToValueAtTime(0.8, actualStart + 0.01);
    gain.gain.linearRampToValueAtTime(0.5, actualStart + 0.05);
    gain.gain.linearRampToValueAtTime(0.001, actualStart + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    osc.start(actualStart);
    osc.stop(actualStart + duration + 0.05);

    this.activeNodes.add(osc);
    osc.onended = () => {
      this.activeNodes.delete(osc);
      osc.disconnect();
      filter.disconnect();
      gain.disconnect();
    };

    return osc;
  }

  public stopAll(): void {
    this.activeNodes.forEach((osc) => {
      try {
        osc.stop();
      } catch {
        // ignore
      }
    });
    this.activeNodes.clear();
  }
}
