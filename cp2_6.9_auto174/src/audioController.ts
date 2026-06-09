export interface AudioData {
  lowFreq: number;
  midFreq: number;
  highFreq: number;
  totalEnergy: number;
  waveform: Float32Array;
}

type AudioSourceType = 'none' | 'file' | 'mic';

export class AudioController {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private frequencyData: Uint8Array = new Uint8Array();
  private timeData: Uint8Array = new Uint8Array();
  private sourceType: AudioSourceType = 'none';
  private _isPlaying: boolean = false;

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get currentSourceType(): AudioSourceType {
    return this.sourceType;
  }

  private initContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeData = new Uint8Array(this.analyser.fftSize);
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  async loadAudioFile(file: File): Promise<void> {
    this.stop();
    this.initContext();

    this.audioElement = new Audio();
    this.audioElement.src = URL.createObjectURL(file);
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.loop = true;

    this.mediaSource = this.audioContext!.createMediaElementSource(this.audioElement);
    this.mediaSource.connect(this.analyser!);
    this.analyser!.connect(this.audioContext!.destination);

    await this.audioElement.play();
    this._isPlaying = true;
    this.sourceType = 'file';
  }

  async enableMicrophone(): Promise<void> {
    this.stop();
    this.initContext();

    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.micSource = this.audioContext!.createMediaStreamSource(this.mediaStream);
    this.micSource.connect(this.analyser!);
    this._isPlaying = true;
    this.sourceType = 'mic';
  }

  stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      if (this.audioElement.src) {
        URL.revokeObjectURL(this.audioElement.src);
      }
      this.audioElement = null;
    }
    if (this.mediaSource) {
      this.mediaSource.disconnect();
      this.mediaSource = null;
    }
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    this._isPlaying = false;
    this.sourceType = 'none';
  }

  getAudioData(): AudioData {
    if (!this.analyser) {
      return {
        lowFreq: 0,
        midFreq: 0,
        highFreq: 0,
        totalEnergy: 0,
        waveform: new Float32Array(0),
      };
    }

    this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>);
    this.analyser.getByteTimeDomainData(this.timeData as Uint8Array<ArrayBuffer>);

    const sampleRate = this.audioContext!.sampleRate;
    const nyquist = sampleRate / 2;
    const binCount = this.frequencyData.length;
    const hzPerBin = nyquist / binCount;

    const lowEnd = Math.floor(250 / hzPerBin);
    const midEnd = Math.floor(4000 / hzPerBin);

    let lowSum = 0;
    let lowCount = 0;
    let midSum = 0;
    let midCount = 0;
    let highSum = 0;
    let highCount = 0;
    let totalSum = 0;

    for (let i = 0; i < binCount; i++) {
      const value = this.frequencyData[i] / 255;
      totalSum += value;
      if (i <= lowEnd) {
        lowSum += value;
        lowCount++;
      } else if (i <= midEnd) {
        midSum += value;
        midCount++;
      } else {
        highSum += value;
        highCount++;
      }
    }

    const waveform = new Float32Array(this.timeData.length);
    for (let i = 0; i < this.timeData.length; i++) {
      waveform[i] = (this.timeData[i] - 128) / 128;
    }

    return {
      lowFreq: lowCount > 0 ? lowSum / lowCount : 0,
      midFreq: midCount > 0 ? midSum / midCount : 0,
      highFreq: highCount > 0 ? highSum / highCount : 0,
      totalEnergy: binCount > 0 ? totalSum / binCount : 0,
      waveform,
    };
  }

  dispose(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
  }
}
