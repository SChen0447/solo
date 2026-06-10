export class EffectProcessor {
  public readonly input: AudioNode;
  public readonly output: AudioNode;

  private readonly context: AudioContext;
  private readonly lowPassFilter: BiquadFilterNode;
  private readonly convolver: ConvolverNode;
  private readonly reverbGain: GainNode;
  private readonly dryGain: GainNode;
  private readonly volumeGain: GainNode;
  private readonly merger: GainNode;

  private reverbPercent: number = 20;
  private lowPassFrequency: number = 20000;
  private lowPassQ: number = 0;
  private volumePercent: number = 100;

  constructor(context: AudioContext) {
    this.context = context;

    this.input = context.createGain();
    this.lowPassFilter = context.createBiquadFilter();
    this.convolver = context.createConvolver();
    this.reverbGain = context.createGain();
    this.dryGain = context.createGain();
    this.merger = context.createGain();
    this.volumeGain = context.createGain();
    this.output = this.volumeGain;

    this.lowPassFilter.type = 'lowpass';
    this.lowPassFilter.frequency.value = this.lowPassFrequency;
    this.lowPassFilter.Q.value = this.lowPassQ;

    this.convolver.buffer = this.generateImpulseResponse(2.0, 2.5);
    this.convolver.normalize = true;

    this.updateReverbGains();
    this.volumeGain.gain.value = this.volumePercent / 100;

    this.connectChain();
  }

  private connectChain(): void {
    this.input.connect(this.lowPassFilter);

    this.lowPassFilter.connect(this.dryGain);
    this.dryGain.connect(this.merger);

    this.lowPassFilter.connect(this.convolver);
    this.convolver.connect(this.reverbGain);
    this.reverbGain.connect(this.merger);

    this.merger.connect(this.volumeGain);
  }

  private updateReverbGains(): void {
    const wet = this.reverbPercent / 100;
    const dry = 1 - wet * 0.5;
    this.reverbGain.gain.setTargetAtTime(wet, this.context.currentTime, 0.01);
    this.dryGain.gain.setTargetAtTime(dry, this.context.currentTime, 0.01);
  }

  public generateImpulseResponse(duration: number, decay: number): AudioBuffer {
    const sampleRate = this.context.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const impulse = this.context.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }

    return impulse;
  }

  public setReverb(percent: number): void {
    this.reverbPercent = Math.max(0, Math.min(100, percent));
    this.updateReverbGains();
  }

  public setLowPass(frequency: number, q: number): void {
    this.lowPassFrequency = Math.max(20, Math.min(20000, frequency));
    this.lowPassQ = Math.max(0, Math.min(20, q));
    this.lowPassFilter.frequency.setTargetAtTime(this.lowPassFrequency, this.context.currentTime, 0.01);
    this.lowPassFilter.Q.setTargetAtTime(this.lowPassQ, this.context.currentTime, 0.01);
  }

  public setVolume(percent: number): void {
    this.volumePercent = Math.max(0, Math.min(200, percent));
    this.volumeGain.gain.setTargetAtTime(this.volumePercent / 100, this.context.currentTime, 0.01);
  }

  public getReverb(): number {
    return this.reverbPercent;
  }

  public getLowPass(): { frequency: number; q: number } {
    return { frequency: this.lowPassFrequency, q: this.lowPassQ };
  }

  public getVolume(): number {
    return this.volumePercent;
  }

  public getLowPassFrequency(): number {
    return this.lowPassFrequency;
  }

  public getReverbBoost(): number {
    return 1 + (this.reverbPercent / 100) * 0.5;
  }
}
