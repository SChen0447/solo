export type AudioSourceType = 'sweep' | 'mic';

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private frequencyData: Uint8Array | null = null;
  private sweepOscillator: OscillatorNode | null = null;
  private sweepGain: GainNode | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private currentSource: AudioSourceType = 'sweep';
  private sweepStartTime: number = 0;
  private sweepDuration: number = 3;
  private sweepStartFreq: number = 100;
  private sweepEndFreq: number = 4000;

  private readonly FREQ_BANDS: number = 32;

  constructor() {}

  public async init(): Promise<void> {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.FREQ_BANDS * 2;
    this.analyser.smoothingTimeConstant = 0.8;
    
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1.0;
    
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);
  }

  public async setSource(source: AudioSourceType): Promise<void> {
    if (!this.audioContext) {
      await this.init();
    }
    
    if (!this.audioContext || !this.analyser) return;

    this.stopCurrentSource();

    this.currentSource = source;

    if (source === 'sweep') {
      this.startSweepTone();
    } else if (source === 'mic') {
      await this.startMicrophone();
    }
  }

  private stopCurrentSource(): void {
    if (this.sweepOscillator) {
      try {
        this.sweepOscillator.stop();
      } catch (e) {}
      this.sweepOscillator.disconnect();
      this.sweepOscillator = null;
    }
    if (this.sweepGain) {
      this.sweepGain.disconnect();
      this.sweepGain = null;
    }
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }
  }

  private startSweepTone(): void {
    if (!this.audioContext || !this.analyser) return;

    const now = this.audioContext.currentTime;
    this.sweepStartTime = now;

    this.sweepGain = this.audioContext.createGain();
    this.sweepGain.gain.value = 0.3;

    this.sweepOscillator = this.audioContext.createOscillator();
    this.sweepOscillator.type = 'sine';
    this.sweepOscillator.frequency.setValueAtTime(this.sweepStartFreq, now);
    this.sweepOscillator.frequency.linearRampToValueAtTime(this.sweepEndFreq, now + this.sweepDuration);

    this.sweepOscillator.connect(this.sweepGain);
    this.sweepGain.connect(this.analyser);

    this.sweepOscillator.start(now);
    this.sweepOscillator.stop(now + this.sweepDuration);

    this.sweepOscillator.onended = () => {
      if (this.currentSource === 'sweep' && this.audioContext) {
        this.restartSweep();
      }
    };
  }

  private restartSweep(): void {
    if (!this.audioContext || !this.analyser || this.currentSource !== 'sweep') return;

    const now = this.audioContext.currentTime;
    this.sweepStartTime = now;

    if (this.sweepOscillator) {
      try {
        this.sweepOscillator.stop();
      } catch (e) {}
      this.sweepOscillator.disconnect();
    }

    this.sweepOscillator = this.audioContext.createOscillator();
    this.sweepOscillator.type = 'sine';
    this.sweepOscillator.frequency.setValueAtTime(this.sweepStartFreq, now);
    this.sweepOscillator.frequency.linearRampToValueAtTime(this.sweepEndFreq, now + this.sweepDuration);

    if (this.sweepGain) {
      this.sweepOscillator.connect(this.sweepGain);
    }

    this.sweepOscillator.start(now);
    this.sweepOscillator.stop(now + this.sweepDuration);

    this.sweepOscillator.onended = () => {
      if (this.currentSource === 'sweep' && this.audioContext) {
        this.restartSweep();
      }
    };
  }

  private async startMicrophone(): Promise<void> {
    if (!this.audioContext || !this.analyser) return;

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.micSource = this.audioContext.createMediaStreamSource(this.micStream);
      this.micSource.connect(this.analyser);
    } catch (error) {
      console.error('无法获取麦克风权限:', error);
      throw error;
    }
  }

  public getFrequencyData(): number[] {
    if (!this.analyser || !this.frequencyData) {
      return new Array(this.FREQ_BANDS).fill(0);
    }

    this.analyser.getByteFrequencyData(this.frequencyData);
    
    const normalizedData: number[] = [];
    for (let i = 0; i < this.FREQ_BANDS; i++) {
      normalizedData.push(this.frequencyData[i] / 255);
    }
    
    return normalizedData;
  }

  public getVolume(): number {
    const freqData = this.getFrequencyData();
    const sum = freqData.reduce((a, b) => a + b, 0);
    return sum / freqData.length;
  }

  public getCurrentSource(): AudioSourceType {
    return this.currentSource;
  }

  public getBandCount(): number {
    return this.FREQ_BANDS;
  }

  public resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public destroy(): void {
    this.stopCurrentSource();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.gainNode = null;
    this.frequencyData = null;
  }
}
