export class AudioVisualizer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private waveformCanvas: HTMLCanvasElement;
  private waveformCtx: CanvasRenderingContext2D;
  private frequencyData: Uint8Array<ArrayBuffer>;
  private timeData: Uint8Array<ArrayBuffer>;
  private smoothedWaveform: number[];
  private lastUpdateTime: number = 0;
  private readonly UPDATE_INTERVAL: number = 200;

  constructor(waveformCanvas: HTMLCanvasElement) {
    this.waveformCanvas = waveformCanvas;
    const ctx = waveformCanvas.getContext('2d');
    if (!ctx) throw new Error('无法获取波形 Canvas 上下文');
    this.waveformCtx = ctx;
    this.frequencyData = new Uint8Array(128) as Uint8Array<ArrayBuffer>;
    this.timeData = new Uint8Array(128) as Uint8Array<ArrayBuffer>;
    this.smoothedWaveform = new Array(128).fill(128);
    this.resizeCanvas();
  }

  private ensureContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.3;

      const noiseBuffer = this.createNoiseBuffer();
      const noiseSource = this.audioContext.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const noiseGain = this.audioContext.createGain();
      noiseGain.gain.value = 0;
      noiseGain.connect(this.analyser);
      noiseSource.connect(noiseGain);
      noiseSource.start();

      (this as unknown as { _noiseGain: GainNode })._noiseGain = noiseGain;

      this.analyser.connect(this.masterGain);
      this.masterGain.connect(this.audioContext.destination);

      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
      this.timeData = new Uint8Array(this.analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
      this.smoothedWaveform = new Array(this.analyser.frequencyBinCount).fill(128);
    }
  }

  private createNoiseBuffer(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext 未初始化');
    const bufferSize = this.audioContext.sampleRate * 2;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  playKeySound(key: string): void {
    this.ensureContext();
    if (!this.audioContext || !this.analyser) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const now = this.audioContext.currentTime;
    const frequency = this.getFrequencyForKey(key);

    const osc = this.audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, now);

    const oscGain = this.audioContext.createGain();
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(0.25, now + 0.01);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(oscGain);
    oscGain.connect(this.analyser);

    osc.start(now);
    osc.stop(now + 0.45);

    const osc2 = this.audioContext.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(frequency * 2, now);

    const osc2Gain = this.audioContext.createGain();
    osc2Gain.gain.setValueAtTime(0, now);
    osc2Gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
    osc2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc2.connect(osc2Gain);
    osc2Gain.connect(this.analyser);

    osc2.start(now);
    osc2.stop(now + 0.35);
  }

  playSpaceSound(): void {
    this.ensureContext();
    if (!this.audioContext || !this.analyser) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const now = this.audioContext.currentTime;

    const noiseOsc = this.audioContext.createBufferSource();
    noiseOsc.buffer = this.createNoiseBuffer();

    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.3, now + 0.02);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.3);

    noiseOsc.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.analyser);

    noiseOsc.start(now);
    noiseOsc.stop(now + 0.3);
  }

  playDigitSound(): void {
    this.ensureContext();
    if (!this.audioContext || !this.analyser) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const now = this.audioContext.currentTime;

    const osc = this.audioContext.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);

    const oscGain = this.audioContext.createGain();
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(0.15, now + 0.01);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(oscGain);
    oscGain.connect(this.analyser);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  private getFrequencyForKey(key: string): number {
    const upper = key.toUpperCase();
    if (/^[A-Z]$/.test(upper)) {
      const index = upper.charCodeAt(0) - 65;
      const baseFreq = 220;
      const semitones = index * 0.8;
      return baseFreq * Math.pow(2, semitones / 12);
    } else if (/^[0-9]$/.test(upper)) {
      const index = parseInt(upper);
      return 300 + index * 40;
    }
    return 440;
  }

  resizeCanvas(): void {
    const rect = this.waveformCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.waveformCanvas.width = rect.width * dpr;
    this.waveformCanvas.height = rect.height * dpr;
    this.waveformCtx.scale(dpr, dpr);
  }

  draw(currentTime: number): void {
    if (!this.analyser) {
      this.drawIdle();
      return;
    }

    const rect = this.waveformCanvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const ctx = this.waveformCtx;

    if (currentTime - this.lastUpdateTime >= this.UPDATE_INTERVAL) {
      this.analyser.getByteTimeDomainData(this.timeData);
      this.analyser.getByteFrequencyData(this.frequencyData);

      for (let i = 0; i < this.smoothedWaveform.length; i++) {
        this.smoothedWaveform[i] = this.smoothedWaveform[i] * 0.85 + this.timeData[i] * 0.15;
      }
      this.lastUpdateTime = currentTime;
    }

    ctx.clearRect(0, 0, width, height);

    ctx.beginPath();
    ctx.moveTo(0, height / 2);

    const step = width / this.smoothedWaveform.length;
    let peakValue = 0;
    let peakIndex = 0;

    for (let i = 0; i < this.smoothedWaveform.length; i++) {
      const v = (this.smoothedWaveform[i] - 128) / 128;
      const y = height / 2 + v * height * 0.45;
      const x = i * step;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        const prevX = (i - 1) * step;
        const prevV = (this.smoothedWaveform[i - 1] - 128) / 128;
        const prevY = height / 2 + prevV * height * 0.45;
        const cpx = (prevX + x) / 2;
        ctx.bezierCurveTo(cpx, prevY, cpx, y, x, y);
      }

      const absV = Math.abs(v);
      if (absV > peakValue) {
        peakValue = absV;
        peakIndex = i;
      }
    }

    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, 'rgba(100, 200, 255, 0.3)');
    gradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(100, 200, 255, 0.3)');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();

    if (peakValue > 0.1) {
      const peakX = peakIndex * step;
      const peakY = height / 2 - peakValue * height * 0.45;

      ctx.beginPath();
      ctx.arc(peakX, peakY, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(peakX, peakY, 8, 0, Math.PI * 2);
      const peakGlow = ctx.createRadialGradient(peakX, peakY, 0, peakX, peakY, 8);
      peakGlow.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      peakGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = peakGlow;
      ctx.fill();
    }
  }

  private drawIdle(): void {
    const rect = this.waveformCanvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const ctx = this.waveformCtx;

    ctx.clearRect(0, 0, width, height);

    ctx.beginPath();
    const midY = height / 2;
    ctx.moveTo(0, midY);
    for (let x = 0; x <= width; x += 2) {
      const y = midY + Math.sin(x * 0.02 + performance.now() * 0.001) * 1.5;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}
