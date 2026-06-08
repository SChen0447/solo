export interface FrequencyBands {
  low: number;
  mid: number;
  high: number;
}

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private stream: MediaStream | null = null;
  private isInitialized: boolean = false;
  private smoothedBands: FrequencyBands = { low: 0, mid: 0, high: 0 };
  private smoothingFactor: number = 0.85;

  async init(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength) as Uint8Array<ArrayBuffer>;

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize audio analyzer:', error);
      return false;
    }
  }

  getFrequencyBands(): FrequencyBands {
    if (!this.isInitialized || !this.analyser || !this.dataArray || !this.audioContext) {
      return this.smoothedBands;
    }

    this.analyser.getByteFrequencyData(this.dataArray);

    const sampleRate = this.audioContext.sampleRate;
    const nyquist = sampleRate / 2;
    const binWidth = nyquist / this.dataArray.length;

    const lowFreqEnd = 200;
    const midFreqEnd = 2000;

    const lowBinEnd = Math.floor(lowFreqEnd / binWidth);
    const midBinEnd = Math.floor(midFreqEnd / binWidth);
    const highBinEnd = this.dataArray.length - 1;

    let lowSum = 0;
    let lowCount = 0;
    for (let i = 0; i < lowBinEnd && i < this.dataArray.length; i++) {
      lowSum += this.dataArray[i];
      lowCount++;
    }

    let midSum = 0;
    let midCount = 0;
    for (let i = lowBinEnd; i < midBinEnd && i < this.dataArray.length; i++) {
      midSum += this.dataArray[i];
      midCount++;
    }

    let highSum = 0;
    let highCount = 0;
    for (let i = midBinEnd; i < highBinEnd; i++) {
      highSum += this.dataArray[i];
      highCount++;
    }

    const rawLow = lowCount > 0 ? lowSum / lowCount / 255 : 0;
    const rawMid = midCount > 0 ? midSum / midCount / 255 : 0;
    const rawHigh = highCount > 0 ? highSum / highCount / 255 : 0;

    this.smoothedBands.low = this.easeOut(this.smoothedBands.low, rawLow, this.smoothingFactor);
    this.smoothedBands.mid = this.easeOut(this.smoothedBands.mid, rawMid, this.smoothingFactor);
    this.smoothedBands.high = this.easeOut(this.smoothedBands.high, rawHigh, this.smoothingFactor);

    return this.smoothedBands;
  }

  private easeOut(current: number, target: number, factor: number): number {
    return current * factor + target * (1 - factor);
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  destroy(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.microphone = null;
    this.dataArray = null;
    this.isInitialized = false;
  }
}
