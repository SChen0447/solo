export class AudioManager {
  private ctx: AudioContext | null = null;

  init(): void {
    this.ensureContext();
  }

  private ensureContext(): void {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playNote(frequency: number, duration: number = 0.3, type: OscillatorType = 'sine'): void {
    this.ensureContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(frequency * 2, this.ctx.currentTime);
    filter.Q.setValueAtTime(2, this.ctx.currentTime);

    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  playFluteScale(baseFreq: number = 523.25): void {
    this.ensureContext();
    const ratios = [1, 1.125, 1.25, 1.333, 1.5, 1.667, 1.875, 2];
    ratios.forEach((ratio, i) => {
      setTimeout(() => {
        this.playNote(baseFreq * ratio, 0.4, 'triangle');
      }, i * 120);
    });
  }

  playExplosion(): void {
    this.ensureContext();
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.4);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
  }

  playSuccess(): void {
    this.playNote(880, 0.15, 'sine');
    setTimeout(() => this.playNote(1108.73, 0.2, 'sine'), 100);
    setTimeout(() => this.playNote(1318.51, 0.3, 'sine'), 200);
  }

  playFail(): void {
    this.playNote(200, 0.2, 'sawtooth');
    setTimeout(() => this.playNote(150, 0.25, 'sawtooth'), 100);
  }
}
