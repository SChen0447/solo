import AudioWorker from './audioWorker.ts?worker';

export interface BeatStatus {
  currentBeatIndex: number;
  timeToNextBeat: number;
  isNearBeat: boolean;
}

export interface SongInfo {
  id: string;
  name: string;
  duration: number;
  difficulty: number;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private worker: Worker | null = null;
  private startTime: number = 0;
  private isPlaying: boolean = false;
  private beatTimestamps: number[] = [];
  private energyData: number[] = [];
  private songDuration: number = 0;
  private bpm: number = 120;
  private currentSong: SongInfo | null = null;
  private songs: SongInfo[] = [];
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private onReadyCallback: (() => void) | null = null;

  constructor() {
    this.worker = new AudioWorker();
    this.worker.onmessage = this.handleWorkerMessage.bind(this);
    this.worker.postMessage({ type: 'getSongs' });
  }

  private handleWorkerMessage(e: MessageEvent): void {
    const { type, songs, songId, timestamps, energy, duration, bpm } = e.data;

    if (type === 'songs') {
      this.songs = songs;
    } else if (type === 'result') {
      this.beatTimestamps = timestamps;
      this.energyData = energy;
      this.songDuration = duration;
      this.bpm = bpm;
      this.currentSong = this.songs.find(s => s.id === songId) || null;
      if (this.onReadyCallback) {
        this.onReadyCallback();
      }
    }
  }

  getSongs(): SongInfo[] {
    return this.songs;
  }

  getCurrentSong(): SongInfo | null {
    return this.currentSong;
  }

  async loadMusic(songId: string): Promise<void> {
    return new Promise((resolve) => {
      this.onReadyCallback = resolve;
      this.worker?.postMessage({ type: 'analyze', songId });
    });
  }

  private initAudioContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  play(): void {
    this.initAudioContext();
    this.isPlaying = true;
    this.startTime = performance.now();
    this.startBeatSound();
  }

  private startBeatSound(): void {
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = 0;
    this.gainNode.connect(ctx.destination);

    this.oscillator = ctx.createOscillator();
    this.oscillator.type = 'sine';
    this.oscillator.frequency.value = this.bpm * 2;
    this.oscillator.connect(this.gainNode);
    this.oscillator.start();

    this.scheduleBeats();
  }

  private scheduleBeats(): void {
    if (!this.audioContext || !this.gainNode) return;

    const ctx = this.audioContext;
    const beatInterval = 60 / this.bpm;

    const scheduleNext = () => {
      if (!this.isPlaying || !this.gainNode || !this.audioContext) return;

      const now = ctx.currentTime;
      const nextTime = now + beatInterval * 0.1;

      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.setValueAtTime(0, now);
      this.gainNode.gain.linearRampToValueAtTime(0.08, nextTime);
      this.gainNode.gain.exponentialRampToValueAtTime(0.001, nextTime + beatInterval * 0.3);

      setTimeout(scheduleNext, beatInterval * 1000 * 0.5);
    };

    scheduleNext();
  }

  pause(): void {
    this.isPlaying = false;
    if (this.oscillator) {
      try { this.oscillator.stop(); } catch (e) { /* ignore */ }
      this.oscillator.disconnect();
      this.oscillator = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
  }

  getCurrentTime(): number {
    if (!this.isPlaying) return 0;
    return (performance.now() - this.startTime) / 1000;
  }

  getDuration(): number {
    return this.songDuration;
  }

  getBeatStatus(): BeatStatus {
    const currentTime = this.getCurrentTime();
    let beatIndex = 0;

    for (let i = 0; i < this.beatTimestamps.length; i++) {
      if (this.beatTimestamps[i] <= currentTime) {
        beatIndex = i;
      } else {
        break;
      }
    }

    const nextBeatIndex = Math.min(beatIndex + 1, this.beatTimestamps.length - 1);
    const nextBeatTime = this.beatTimestamps[nextBeatIndex];
    const timeToNextBeat = nextBeatTime - currentTime;
    const prevBeatTime = this.beatTimestamps[beatIndex];
    const timeFromPrevBeat = currentTime - prevBeatTime;

    const isNearBeat = timeToNextBeat < 0.2 || timeFromPrevBeat < 0.2;

    return {
      currentBeatIndex: beatIndex,
      timeToNextBeat,
      isNearBeat
    };
  }

  getBeatTimestamps(): number[] {
    return this.beatTimestamps;
  }

  getEnergyAt(beatIndex: number): number {
    if (beatIndex < 0 || beatIndex >= this.energyData.length) {
      return 0.5;
    }
    return this.energyData[beatIndex];
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  destroy(): void {
    this.pause();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
