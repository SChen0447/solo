export interface AudioAnalysisResult {
  pitch: number;
  volume: number;
  timestamp: number;
}

export type AudioAnalysisCallback = (result: AudioAnalysisResult) => void;

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyserNode: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private animationFrameId: number | null = null;
  private frequencyData: Float32Array | null = null;
  private timeData: Float32Array | null = null;
  private callback: AudioAnalysisCallback | null = null;
  private lastAnalysisTime: number = 0;
  private readonly analysisInterval: number = 50;

  constructor() {}

  async start(callback: AudioAnalysisCallback): Promise<void> {
    this.callback = callback;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 4096;
      this.analyserNode.smoothingTimeConstant = 0.1;

      this.sourceNode.connect(this.analyserNode);

      const bufferLength = this.analyserNode.fftSize;
      this.frequencyData = new Float32Array(bufferLength);
      this.timeData = new Float32Array(bufferLength);

      this.analyze();
    } catch (error) {
      console.error('无法获取麦克风访问权限:', error);
      throw error;
    }
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.frequencyData = null;
    this.timeData = null;
    this.callback = null;
  }

  private analyze = (): void => {
    const now = performance.now();
    if (now - this.lastAnalysisTime >= this.analysisInterval) {
      this.lastAnalysisTime = now;

      if (this.analyserNode && this.frequencyData && this.timeData && this.callback) {
        this.analyserNode.getFloatFrequencyData(this.frequencyData as Float32Array<ArrayBuffer>);
        this.analyserNode.getFloatTimeDomainData(this.timeData as Float32Array<ArrayBuffer>);

        const volume = this.calculateVolume(this.timeData);
        const pitch = volume > 0.01 ? this.calculatePitchACF(this.timeData, this.audioContext?.sampleRate ?? 44100) : 0;

        this.callback({
          pitch,
          volume,
          timestamp: now,
        });
      }
    }

    this.animationFrameId = requestAnimationFrame(this.analyze);
  };

  private calculateVolume(timeData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
      sum += timeData[i] * timeData[i];
    }
    const rms = Math.sqrt(sum / timeData.length);
    return Math.min(1, Math.max(0, rms * 3));
  }

  private calculatePitchACF(timeData: Float32Array, sampleRate: number): number {
    const SIZE = timeData.length;
    let rms = 0;
    
    for (let i = 0; i < SIZE; i++) {
      rms += timeData[i] * timeData[i];
    }
    rms = Math.sqrt(rms / SIZE);
    
    if (rms < 0.01) return 0;

    let r1 = 0;
    let r2 = SIZE - 1;
    const threshold = 0.2;

    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(timeData[i]) < threshold) {
        r1 = i;
        break;
      }
    }

    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(timeData[SIZE - i]) < threshold) {
        r2 = SIZE - i;
        break;
      }
    }

    const truncated = timeData.slice(r1, r2);
    const c = new Float32Array(truncated.length);
    
    for (let i = 0; i < truncated.length; i++) {
      c[i] = 0;
      for (let j = 0; j < truncated.length - i; j++) {
        c[i] = c[i] + truncated[j] * truncated[j + i];
      }
    }

    let d = 0;
    while (c[d] > c[d + 1]) {
      d++;
    }

    let maxval = -1;
    let maxpos = -1;
    
    for (let i = d; i < truncated.length; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }

    let T0 = maxpos;

    if (T0 <= 0 || T0 >= truncated.length) {
      return 0;
    }

    const x1 = c[T0 - 1];
    const x2 = c[T0];
    const x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    
    if (a !== 0) {
      T0 = T0 - b / (2 * a);
    }

    const pitch = sampleRate / T0;
    
    if (pitch < 60 || pitch > 1000) {
      return 0;
    }

    return pitch;
  }
}
