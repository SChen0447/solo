export interface AudioData {
  amplitude: number;
  frequency: number;
}

export type AudioCallback = (data: AudioData) => void;

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private freqArray: Uint8Array | null = null;
  private callback: AudioCallback | null = null;
  private rafId: number = 0;
  private sampleRate: number = 44100;
  private running = false;

  async start(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext();
      this.sampleRate = this.audioContext.sampleRate;
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      source.connect(this.analyser);
      this.dataArray = new Uint8Array(this.analyser.fftSize);
      this.freqArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.running = true;
      this.loop();
      return true;
    } catch (e) {
      console.warn('Microphone access denied:', e);
      return false;
    }
  }

  onAudio(cb: AudioCallback): void {
    this.callback = cb;
  }

  private loop(): void {
    if (!this.running || !this.analyser || !this.dataArray || !this.freqArray) return;
    this.analyser.getByteTimeDomainData(this.dataArray);
    this.analyser.getByteFrequencyData(this.freqArray);
    const amplitude = this.computeRMS();
    const frequency = this.computeAvgFrequency();
    if (this.callback) {
      this.callback({ amplitude, frequency });
    }
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private computeRMS(): number {
    if (!this.dataArray) return 0;
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const v = (this.dataArray[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / this.dataArray.length);
    return Math.min(1, rms * 3.5);
  }

  private computeAvgFrequency(): number {
    if (!this.freqArray || !this.analyser) return 0;
    const binCount = this.analyser.frequencyBinCount;
    let weightedSum = 0;
    let totalWeight = 0;
    for (let i = 0; i < binCount; i++) {
      const magnitude = this.freqArray[i];
      weightedSum += i * magnitude;
      totalWeight += magnitude;
    }
    if (totalWeight === 0) return 0;
    const avgBin = weightedSum / totalWeight;
    const freqPerBin = this.sampleRate / (this.analyser.fftSize);
    return avgBin * freqPerBin;
  }

  stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
