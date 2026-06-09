export interface AudioData {
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  volumePeak: number;
  bandLevels: number[];
}

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private frequencyData: Uint8Array | null = null;
  private timeDomainData: Uint8Array | null = null;
  private isRecording = false;
  private onDataCallback: ((data: AudioData) => void) | null = null;
  private animationFrameId: number | null = null;

  private readonly FFT_SIZE = 1024;
  private readonly SAMPLE_RATE = 44100;
  private readonly BAND_COUNT = 8;
  private readonly BAND_FREQUENCIES = [0, 200, 400, 800, 1200, 2000, 4000, 8000, 20000];

  async start(): Promise<void> {
    if (this.isRecording) return;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.SAMPLE_RATE,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.SAMPLE_RATE
      });

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.FFT_SIZE;
      this.analyser.smoothingTimeConstant = 0.8;

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.sourceNode.connect(this.analyser);

      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeDomainData = new Uint8Array(this.analyser.fftSize);

      this.isRecording = true;
      this.startDataLoop();
    } catch (error) {
      console.error('Failed to start audio engine:', error);
      throw error;
    }
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.frequencyData = null;
    this.timeDomainData = null;
    this.isRecording = false;
  }

  onData(callback: (data: AudioData) => void): void {
    this.onDataCallback = callback;
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  private startDataLoop(): void {
    const loop = () => {
      if (!this.isRecording || !this.analyser || !this.frequencyData || !this.timeDomainData) {
        return;
      }

      this.analyser.getByteFrequencyData(this.frequencyData);
      this.analyser.getByteTimeDomainData(this.timeDomainData);

      const bandLevels = this.calculateBandLevels();
      const volumePeak = this.calculateVolumePeak();

      if (this.onDataCallback) {
        this.onDataCallback({
          frequencyData: this.frequencyData.slice(),
          timeDomainData: this.timeDomainData.slice(),
          volumePeak,
          bandLevels
        });
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    loop();
  }

  private calculateBandLevels(): number[] {
    if (!this.analyser || !this.frequencyData || !this.audioContext) {
      return new Array(this.BAND_COUNT).fill(0);
    }

    const bandLevels: number[] = [];
    const binCount = this.frequencyData.length;
    const nyquist = this.audioContext.sampleRate / 2;

    for (let band = 0; band < this.BAND_COUNT; band++) {
      const lowFreq = this.BAND_FREQUENCIES[band];
      const highFreq = this.BAND_FREQUENCIES[band + 1];

      const lowBin = Math.floor((lowFreq / nyquist) * binCount);
      const highBin = Math.min(
        Math.ceil((highFreq / nyquist) * binCount),
        binCount - 1
      );

      let sum = 0;
      let count = 0;

      for (let i = lowBin; i <= highBin; i++) {
        sum += this.frequencyData[i];
        count++;
      }

      const avg = count > 0 ? sum / count : 0;
      bandLevels.push(avg / 255);
    }

    return bandLevels;
  }

  private calculateVolumePeak(): number {
    if (!this.timeDomainData) return 0;

    let peak = 0;
    const data = this.timeDomainData;

    for (let i = 0; i < data.length; i++) {
      const value = (data[i] - 128) / 128;
      const absValue = Math.abs(value);
      if (absValue > peak) {
        peak = absValue;
      }
    }

    return Math.min(peak, 1);
  }
}

export const audioEngine = new AudioEngine();
