export class AudioReactor {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeOscillators: Array<{
    osc: OscillatorNode;
    gain: GainNode;
    startTime: number;
    duration: number;
  }> = [];

  private ambientOsc: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;

  private initialized = false;

  constructor() {}

  public init(): void {
    if (this.initialized) return;

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.audioContext.destination);

    this.initialized = true;
  }

  public resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public playRippleTone(duration: number = 1.5): void {
    if (!this.initialized || !this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    const c4Freq = 261.63;
    const e4Freq = 329.63;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(c4Freq, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      e4Freq,
      this.audioContext.currentTime + duration
    );

    gain.gain.setValueAtTime(0, this.audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, this.audioContext.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      this.audioContext.currentTime + duration
    );

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + duration + 0.05);

    this.activeOscillators.push({
      osc,
      gain,
      startTime: this.audioContext.currentTime,
      duration
    });
  }

  public setAmbientTone(intensity: number): void {
    if (!this.initialized || !this.audioContext || !this.masterGain) return;

    const osc = this.ensureAmbientOsc();
    if (!osc) return;

    const targetFreq = 110 + intensity * 80;
    const targetGain = intensity * 0.08;

    osc.osc.frequency.setTargetAtTime(
      targetFreq,
      this.audioContext.currentTime,
      0.1
    );
    osc.gain.gain.setTargetAtTime(
      targetGain,
      this.audioContext.currentTime,
      0.1
    );
  }

  public setTwistSound(twistAmount: number): void {
    if (!this.initialized || !this.audioContext || !this.masterGain) return;

    const osc = this.ensureAmbientOsc();
    if (!osc) return;

    const absTwist = Math.min(Math.abs(twistAmount) / (Math.PI * 2), 1);
    const targetFreq = 220 + absTwist * 200;
    const targetGain = absTwist * 0.06;

    osc.osc.type = 'triangle';
    osc.osc.frequency.setTargetAtTime(
      targetFreq,
      this.audioContext.currentTime,
      0.05
    );
    osc.gain.gain.setTargetAtTime(
      targetGain,
      this.audioContext.currentTime,
      0.05
    );
  }

  private ensureAmbientOsc(): { osc: OscillatorNode; gain: GainNode } | null {
    if (!this.audioContext || !this.masterGain) return null;

    if (!this.ambientOsc || !this.ambientGain) {
      this.ambientOsc = this.audioContext.createOscillator();
      this.ambientGain = this.audioContext.createGain();

      this.ambientOsc.type = 'sine';
      this.ambientOsc.frequency.value = 110;
      this.ambientGain.gain.value = 0;

      this.ambientOsc.connect(this.ambientGain);
      this.ambientGain.connect(this.masterGain);
      this.ambientOsc.start();
    }

    return { osc: this.ambientOsc, gain: this.ambientGain };
  }

  public update(): void {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    this.activeOscillators = this.activeOscillators.filter(
      o => now - o.startTime < o.duration + 0.1
    );
  }
}
