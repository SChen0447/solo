export interface AudioData {
  volume: number;
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  dominantFrequency: number;
  isHighFrequency: boolean;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private isRecording: boolean = false;
  private frequencyData: Uint8Array;
  private timeDomainData: Uint8Array;
  private highFrequencyThreshold: number = 2000;
  private sampleRate: number = 44100;

  constructor(fftSize: number = 256) {
    const bufferLength = fftSize / 2;
    this.frequencyData = new Uint8Array(new ArrayBuffer(bufferLength));
    this.timeDomainData = new Uint8Array(new ArrayBuffer(bufferLength));
  }

  async start(): Promise<boolean> {
    if (this.isRecording) return true;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.sampleRate = this.audioContext.sampleRate;

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.frequencyData.length * 2;
      this.analyser.smoothingTimeConstant = 0.8;

      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);

      this.isRecording = true;
      return true;
    } catch (error) {
      console.error('Failed to start audio capture:', error);
      return false;
    }
  }

  stop(): void {
    if (!this.isRecording) return;

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.isRecording = false;
  }

  getAudioData(): AudioData {
    if (!this.isRecording || !this.analyser) {
      return {
        volume: 0,
        frequencyData: this.frequencyData,
        timeDomainData: this.timeDomainData,
        dominantFrequency: 0,
        isHighFrequency: false,
      };
    }

    this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>);
    this.analyser.getByteTimeDomainData(this.timeDomainData as Uint8Array<ArrayBuffer>);

    const volume = this.calculateVolume();
    const dominantFrequency = this.calculateDominantFrequency();
    const isHighFrequency = dominantFrequency > this.highFrequencyThreshold;

    return {
      volume,
      frequencyData: this.frequencyData,
      timeDomainData: this.timeDomainData,
      dominantFrequency,
      isHighFrequency,
    };
  }

  private calculateVolume(): number {
    let sum = 0;
    for (let i = 0; i < this.timeDomainData.length; i++) {
      const value = (this.timeDomainData[i] - 128) / 128;
      sum += value * value;
    }
    return Math.sqrt(sum / this.timeDomainData.length);
  }

  private calculateDominantFrequency(): number {
    let maxValue = 0;
    let maxIndex = 0;

    for (let i = 0; i < this.frequencyData.length; i++) {
      if (this.frequencyData[i] > maxValue) {
        maxValue = this.frequencyData[i];
        maxIndex = i;
      }
    }

    if (maxValue < 10) return 0;

    const nyquist = this.sampleRate / 2;
    const binSize = nyquist / this.frequencyData.length;

    let peakIndex = maxIndex;
    if (maxIndex > 0 && maxIndex < this.frequencyData.length - 1) {
      const yL = this.frequencyData[maxIndex - 1];
      const yM = this.frequencyData[maxIndex];
      const yR = this.frequencyData[maxIndex + 1];
      const d = (yR - yL) / (2 * (2 * yM - yL - yR));
      peakIndex = maxIndex + d;
    }

    return peakIndex * binSize;
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  getFrequencyBinCount(): number {
    return this.frequencyData.length;
  }

  setHighFrequencyThreshold(threshold: number): void {
    this.highFrequencyThreshold = threshold;
  }

  getHighFrequencyThreshold(): number {
    return this.highFrequencyThreshold;
  }
}
