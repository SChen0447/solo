export interface BeatEvent {
  time: number;
  beatIndex: number;
}

export class MusicManager {
  private audioContext: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private _bpm: number = 128;
  private _beatTimes: number[] = [];
  private _startTime: number = 0;
  private _isPlaying: boolean = false;
  private _duration: number = 30;
  private _currentBeatIndex: number = 0;
  private beatCallback: ((beat: BeatEvent) => void) | null = null;

  get bpm(): number {
    return this._bpm;
  }

  get beatInterval(): number {
    return 60 / this._bpm;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get duration(): number {
    return this._duration;
  }

  get currentTime(): number {
    if (!this.audioContext || !this._isPlaying) return 0;
    return this.audioContext.currentTime - this._startTime;
  }

  get progress(): number {
    return Math.min(1, this.currentTime / this._duration);
  }

  get beatTimes(): number[] {
    return this._beatTimes;
  }

  constructor() {}

  setBeatCallback(callback: (beat: BeatEvent) => void): void {
    this.beatCallback = callback;
  }

  async init(): Promise<void> {
    this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    this.generateBeatTimes();
    this.generateAudioBuffer();
  }

  private generateBeatTimes(): void {
    this._beatTimes = [];
    const interval = 60 / this._bpm;
    const totalBeats = Math.floor(this._duration / interval);
    for (let i = 0; i < totalBeats; i++) {
      this._beatTimes.push(i * interval);
    }
  }

  private generateAudioBuffer(): AudioBuffer | null {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const totalSamples = Math.floor(sampleRate * this._duration);
    const buffer = this.audioContext.createBuffer(2, totalSamples, sampleRate);

    const leftChannel = buffer.getChannelData(0);
    const rightChannel = buffer.getChannelData(1);

    const beatInterval = 60 / this._bpm;
    const beatSamples = Math.floor(sampleRate * beatInterval);
    const kickDuration = 0.08;
    const kickSamples = Math.floor(sampleRate * kickDuration);
    const hatDuration = 0.03;
    const hatSamples = Math.floor(sampleRate * hatDuration);

    const melody = [261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 261.63, 329.63];
    const melodySamplesPerNote = beatSamples;

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      let sample = 0;
      const beatPosition = i % beatSamples;
      const beatIndex = Math.floor(i / beatSamples);

      if (beatPosition < kickSamples) {
        const env = 1 - beatPosition / kickSamples;
        const freq = 120 * (1 - beatPosition / kickSamples * 0.6);
        sample += Math.sin(2 * Math.PI * freq * t) * env * 0.4;
      }

      if (beatPosition > beatSamples / 2 && beatPosition < beatSamples / 2 + hatSamples) {
        const localPos = beatPosition - beatSamples / 2;
        const env = 1 - localPos / hatSamples;
        sample += (Math.random() * 2 - 1) * env * 0.15;
      }

      if (beatPosition % beatSamples === 0 || beatIndex % 2 === 0) {
        const noteIndex = beatIndex % melody.length;
        const noteFreq = melody[noteIndex];
        const noteEnv = Math.exp(-(beatPosition / melodySamplesPerNote) * 3);
        const square = Math.sign(Math.sin(2 * Math.PI * noteFreq * t));
        sample += square * noteEnv * 0.12;
      }

      if (beatIndex % 4 === 2 && beatPosition < kickSamples * 0.6) {
        const env = 1 - beatPosition / (kickSamples * 0.6);
        const freq = 200 * (1 - beatPosition / (kickSamples * 0.6) * 0.4);
        sample += Math.sin(2 * Math.PI * freq * t) * env * 0.25;
      }

      sample = Math.max(-1, Math.min(1, sample));
      leftChannel[i] = sample;
      rightChannel[i] = sample;
    }

    return buffer;
  }

  async play(): Promise<void> {
    if (!this.audioContext) {
      await this.init();
    }
    if (!this.audioContext) return;

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.stop();

    const audioBuffer = this.generateAudioBuffer();
    if (!audioBuffer) return;

    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = audioBuffer;
    this.sourceNode.loop = true;

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0.5;

    this.sourceNode.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    this._startTime = this.audioContext.currentTime;
    this._currentBeatIndex = 0;
    this._isPlaying = true;

    this.sourceNode.start(0);

    this.sourceNode.onended = () => {
      this._isPlaying = false;
    };
  }

  stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch {
        // ignore
      }
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    this._isPlaying = false;
  }

  update(): void {
    if (!this._isPlaying || !this.beatCallback) return;

    const currentTime = this.currentTime;
    const tolerance = 0.016;

    while (
      this._currentBeatIndex < this._beatTimes.length &&
      this._beatTimes[this._currentBeatIndex] <= currentTime + tolerance
    ) {
      const beatTime = this._beatTimes[this._currentBeatIndex];
      if (Math.abs(currentTime - beatTime) <= tolerance + this.beatInterval * 0.5) {
        this.beatCallback({
          time: beatTime,
          beatIndex: this._currentBeatIndex
        });
      }
      this._currentBeatIndex++;

      if (this.sourceNode?.loop && this._currentBeatIndex >= this._beatTimes.length) {
        this._currentBeatIndex = 0;
        this._startTime = this.audioContext?.currentTime ?? this._startTime;
      }
    }
  }

  reset(): void {
    this._currentBeatIndex = 0;
  }
}
