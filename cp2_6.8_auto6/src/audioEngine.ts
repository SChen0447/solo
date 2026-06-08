import { TrackInfo, BeatInfo, AudioAnalysisResult, RealtimeAudioData } from './types';

export const PRESET_TRACKS: TrackInfo[] = [
  { id: 'track1', name: 'Cyber Pulse (120 BPM)', bpm: 120, url: '' },
  { id: 'track2', name: 'Neon Dreams (140 BPM)', bpm: 140, url: '' },
  { id: 'track3', name: 'Synthwave Rush (160 BPM)', bpm: 160, url: '' },
];

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private startTime: number = 0;
  private isPlaying: boolean = false;
  private currentTrack: TrackInfo | null = null;
  private beatSchedule: BeatInfo[] = [];
  private duration: number = 0;
  private oscillators: OscillatorNode[] = [];
  private onBeatCallback: ((beat: BeatInfo) => void) | null = null;
  private lastBeatIndex: number = -1;
  private frequencyData: Uint8Array = new Uint8Array(256);

  constructor() {}

  async loadTrack(trackId: string): Promise<AudioAnalysisResult> {
    const track = PRESET_TRACKS.find(t => t.id === trackId);
    if (!track) {
      throw new Error(`Track not found: ${trackId}`);
    }

    this.currentTrack = track;
    this.duration = 180;

    this.beatSchedule = this.generateBeatSchedule(track.bpm, this.duration);

    return {
      beats: this.beatSchedule,
      duration: this.duration,
      bpm: track.bpm,
    };
  }

  private generateBeatSchedule(bpm: number, duration: number): BeatInfo[] {
    const beats: BeatInfo[] = [];
    const beatInterval = 60 / bpm;
    let time = beatInterval;
    let beatIndex = 0;

    while (time < duration) {
      const beatInBar = beatIndex % 4;
      let intensity = 0.6 + Math.random() * 0.2;

      if (beatInBar === 0) {
        intensity = 0.85 + Math.random() * 0.15;
      } else if (beatInBar === 2) {
        intensity = 0.75 + Math.random() * 0.15;
      }

      const phrasePosition = (beatIndex % 32) / 32;
      const phraseIntensity = 0.7 + 0.3 * Math.sin(phrasePosition * Math.PI);
      intensity *= phraseIntensity;

      intensity = Math.max(0.2, Math.min(1, intensity));

      beats.push({ time, intensity });
      time += beatInterval;
      beatIndex++;
    }

    return beats;
  }

  async play(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0.5;
      this.gainNode.connect(this.audioContext.destination);
      this.analyser.connect(this.gainNode);
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.startTime = this.audioContext.currentTime;
    this.isPlaying = true;
    this.lastBeatIndex = -1;

    this.scheduleBeats();
  }

  private scheduleBeats(): void {
    if (!this.audioContext || !this.analyser || !this.currentTrack) return;

    const ctx = this.audioContext;
    const bpm = this.currentTrack.bpm;
    const beatInterval = 60 / bpm;

    const scheduleAheadTime = 0.1;
    const lookahead = 25;

    const scheduleNote = (beatTime: number, intensity: number, beatIndex: number) => {
      const beatInBar = beatIndex % 4;

      if (beatInBar === 0 || beatInBar === 2) {
        const kickOsc = ctx.createOscillator();
        const kickGain = ctx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(150, beatTime);
        kickOsc.frequency.exponentialRampToValueAtTime(40, beatTime + 0.15);
        kickGain.gain.setValueAtTime(intensity * 0.8, beatTime);
        kickGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.3);
        kickOsc.connect(kickGain);
        kickGain.connect(this.analyser!);
        kickOsc.start(beatTime);
        kickOsc.stop(beatTime + 0.3);
        this.oscillators.push(kickOsc);
      }

      if (beatInBar === 1 || beatInBar === 3) {
        const snareOsc = ctx.createOscillator();
        const snareGain = ctx.createGain();
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
          noiseData[i] = (Math.random() * 2 - 1) * 0.5;
        }
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(intensity * 0.5, beatTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.15);
        noiseSource.connect(noiseGain);
        noiseGain.connect(this.analyser!);
        noiseSource.start(beatTime);
        noiseSource.stop(beatTime + 0.15);

        snareOsc.type = 'triangle';
        snareOsc.frequency.setValueAtTime(200, beatTime);
        snareGain.gain.setValueAtTime(intensity * 0.3, beatTime);
        snareGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.1);
        snareOsc.connect(snareGain);
        snareGain.connect(this.analyser!);
        snareOsc.start(beatTime);
        snareOsc.stop(beatTime + 0.1);
        this.oscillators.push(snareOsc);
      }

      const hihatOsc = ctx.createOscillator();
      const hihatGain = ctx.createGain();
      const hihatBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
      const hihatData = hihatBuffer.getChannelData(0);
      for (let i = 0; i < hihatData.length; i++) {
        hihatData[i] = (Math.random() * 2 - 1) * 0.3;
      }
      const hihatSource = ctx.createBufferSource();
      hihatSource.buffer = hihatBuffer;
      hihatGain.gain.setValueAtTime(intensity * 0.25, beatTime);
      hihatGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.05);
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 7000;
      hihatSource.connect(highpass);
      highpass.connect(hihatGain);
      hihatGain.connect(this.analyser!);
      hihatSource.start(beatTime);
      hihatSource.stop(beatTime + 0.05);
      this.oscillators.push(hihatOsc);

      const noteIndex = beatIndex % 8;
      const bassNotes = [55, 55, 65.41, 55, 49, 49, 58.27, 49];
      const bassFreq = bassNotes[noteIndex];
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(bassFreq, beatTime);
      bassGain.gain.setValueAtTime(intensity * 0.25, beatTime);
      bassGain.gain.exponentialRampToValueAtTime(0.001, beatTime + beatInterval * 0.9);
      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = 'lowpass';
      bassFilter.frequency.value = 500;
      bassOsc.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(this.analyser!);
      bassOsc.start(beatTime);
      bassOsc.stop(beatTime + beatInterval * 0.9);
      this.oscillators.push(bassOsc);

      const melodyNotes = [440, 494, 523, 587, 659, 587, 523, 494];
      const melodyFreq = melodyNotes[noteIndex] * 2;
      const melodyOsc = ctx.createOscillator();
      const melodyGain = ctx.createGain();
      melodyOsc.type = 'square';
      melodyOsc.frequency.setValueAtTime(melodyFreq, beatTime);
      melodyGain.gain.setValueAtTime(intensity * 0.12, beatTime);
      melodyGain.gain.exponentialRampToValueAtTime(0.001, beatTime + beatInterval * 0.7);
      const melodyFilter = ctx.createBiquadFilter();
      melodyFilter.type = 'lowpass';
      melodyFilter.frequency.value = 2000;
      melodyOsc.connect(melodyFilter);
      melodyFilter.connect(melodyGain);
      melodyGain.connect(this.analyser!);
      melodyOsc.start(beatTime);
      melodyOsc.stop(beatTime + beatInterval * 0.7);
      this.oscillators.push(melodyOsc);
    };

    let nextBeatIndex = 0;

    const scheduler = () => {
      if (!this.isPlaying || !this.audioContext) return;

      const currentTime = this.audioContext.currentTime - this.startTime;

      while (
        nextBeatIndex < this.beatSchedule.length &&
        this.beatSchedule[nextBeatIndex].time < currentTime + scheduleAheadTime
      ) {
        const beat = this.beatSchedule[nextBeatIndex];
        scheduleNote(beat.time + this.startTime, beat.intensity, nextBeatIndex);
        nextBeatIndex++;
      }

      if (nextBeatIndex < this.beatSchedule.length) {
        setTimeout(scheduler, lookahead);
      }
    };

    scheduler();
  }

  pause(): void {
    if (this.audioContext) {
      this.audioContext.suspend();
    }
    this.isPlaying = false;
  }

  resume(): void {
    if (this.audioContext) {
      this.audioContext.resume();
    }
    this.isPlaying = true;
  }

  stop(): void {
    this.oscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {}
    });
    this.oscillators = [];
    this.isPlaying = false;
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.lastBeatIndex = -1;
  }

  getRealtimeData(): RealtimeAudioData {
    const currentTime = this.audioContext
      ? this.audioContext.currentTime - this.startTime
      : 0;

    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>);
    }

    let rhythmIntensity = 0;
    const lowFreqEnd = Math.floor(this.frequencyData.length * 0.1);
    for (let i = 0; i < lowFreqEnd; i++) {
      rhythmIntensity += this.frequencyData[i];
    }
    rhythmIntensity = rhythmIntensity / lowFreqEnd / 255;
    rhythmIntensity = Math.min(1, Math.max(0, rhythmIntensity * 2));

    let beat: BeatInfo | null = null;
    for (let i = this.lastBeatIndex + 1; i < this.beatSchedule.length; i++) {
      if (this.beatSchedule[i].time <= currentTime) {
        beat = this.beatSchedule[i];
        this.lastBeatIndex = i;
      } else {
        break;
      }
    }

    if (beat && this.onBeatCallback) {
      this.onBeatCallback(beat);
    }

    return {
      currentTime,
      rhythmIntensity,
      frequencyData: this.frequencyData,
    };
  }

  getBeatSchedule(): BeatInfo[] {
    return this.beatSchedule;
  }

  getCurrentTime(): number {
    if (!this.audioContext) return 0;
    return this.audioContext.currentTime - this.startTime;
  }

  setOnBeatCallback(callback: (beat: BeatInfo) => void): void {
    this.onBeatCallback = callback;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getCurrentTrack(): TrackInfo | null {
    return this.currentTrack;
  }
}
