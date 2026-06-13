import type { Track, InstrumentType, TrackPoint } from '../shared/types';

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private gainNodes: Map<string, GainNode> = new Map();
  private oscillators: Map<string, OscillatorNode[]> = new Map();
  private isPlaying = false;
  private currentTrackIndex = 0;
  private tracks: Track[] = [];
  private startTime = 0;
  private animationId: number | null = null;
  private onTrackPlayCallback: ((trackId: string) => void) | null = null;
  private totalDuration = 8000;

  constructor() {}

  private ensureAudioContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  setOnTrackPlayCallback(callback: (trackId: string) => void): void {
    this.onTrackPlayCallback = callback;
  }

  playNote(frequency: number, instrument: InstrumentType, duration: number, startTime: number): void {
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const now = startTime;
    
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(0, now);

    const oscillators: OscillatorNode[] = [];

    switch (instrument) {
      case 'piano':
        oscillators.push(this.createOscillator(frequency, 'sine', gainNode, now));
        oscillators.push(this.createOscillator(frequency * 2, 'sine', gainNode, now, 0.3));
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
        break;

      case 'violin':
        oscillators.push(this.createOscillator(frequency, 'sawtooth', gainNode, now));
        oscillators.push(this.createOscillator(frequency * 1.5, 'triangle', gainNode, now, 0.2));
        gainNode.gain.linearRampToValueAtTime(0.25, now + 0.1);
        gainNode.gain.linearRampToValueAtTime(0.2, now + duration * 0.7);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
        break;

      case 'flute':
        oscillators.push(this.createOscillator(frequency, 'sine', gainNode, now));
        oscillators.push(this.createOscillator(frequency * 3, 'sine', gainNode, now, 0.1));
        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05);
        gainNode.gain.linearRampToValueAtTime(0.15, now + duration * 0.5);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
        break;

      case 'harp':
        oscillators.push(this.createOscillator(frequency, 'triangle', gainNode, now));
        oscillators.push(this.createOscillator(frequency * 2, 'sine', gainNode, now, 0.4));
        oscillators.push(this.createOscillator(frequency * 3, 'sine', gainNode, now, 0.2));
        gainNode.gain.linearRampToValueAtTime(0.35, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
        break;
    }

    oscillators.forEach((osc) => {
      osc.start(now);
      osc.stop(now + duration);
    });
  }

  private createOscillator(
    frequency: number,
    type: OscillatorType,
    gainNode: GainNode,
    startTime: number,
    volume: number = 1
  ): OscillatorNode {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    
    const osc = this.audioContext.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startTime);

    const oscGain = this.audioContext.createGain();
    oscGain.gain.setValueAtTime(volume, startTime);
    osc.connect(oscGain);
    oscGain.connect(gainNode);

    return osc;
  }

  yToFrequency(y: number): number {
    const minFreq = 220;
    const maxFreq = 880;
    const t = Math.max(0, Math.min(1, 1 - y));
    return minFreq + (maxFreq - minFreq) * t;
  }

  playTracks(tracks: Track[], totalDuration: number = 8000): void {
    this.ensureAudioContext();
    if (!this.audioContext || tracks.length === 0) return;

    this.stop();
    this.tracks = tracks;
    this.totalDuration = totalDuration;
    this.isPlaying = true;
    this.startTime = this.audioContext.currentTime;
    this.currentTrackIndex = 0;

    const trackDuration = totalDuration / tracks.length / 1000;

    tracks.forEach((track, index) => {
      if (track.points.length === 0) return;

      const trackStart = this.startTime + index * trackDuration;
      
      const noteCount = Math.min(Math.floor(track.points.length / 3), 10);
      const step = Math.floor(track.points.length / noteCount) || 1;

      for (let i = 0; i < noteCount; i++) {
        const pointIdx = i * step;
        if (pointIdx >= track.points.length) break;
        
        const point = track.points[pointIdx];
        const freq = this.yToFrequency(point.y);
        const noteStart = trackStart + (i / noteCount) * trackDuration * 0.8;
        const noteDuration = trackDuration / noteCount * 1.5;

        this.playNote(freq, track.instrument, noteDuration, noteStart);
      }
    });

    this.checkPlayback();
  }

  private checkPlayback = (): void => {
    if (!this.isPlaying || !this.audioContext) return;

    const elapsed = (this.audioContext.currentTime - this.startTime) * 1000;
    const trackDuration = this.totalDuration / this.tracks.length;
    const currentIndex = Math.min(
      Math.floor(elapsed / trackDuration),
      this.tracks.length - 1
    );

    if (currentIndex !== this.currentTrackIndex && this.tracks[currentIndex]) {
      this.currentTrackIndex = currentIndex;
      if (this.onTrackPlayCallback) {
        this.onTrackPlayCallback(this.tracks[currentIndex].id);
      }
    }

    if (elapsed >= this.totalDuration) {
      this.isPlaying = false;
      this.currentTrackIndex = 0;
      setTimeout(() => {
        if (this.isPlaying === false) {
          this.playTracks(this.tracks, this.totalDuration);
        }
      }, 500);
      return;
    }

    this.animationId = requestAnimationFrame(this.checkPlayback);
  };

  pause(): void {
    this.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  resume(): void {
    if (this.tracks.length === 0 || !this.audioContext) return;
    
    this.isPlaying = true;
    this.checkPlayback();
  }

  stop(): void {
    this.isPlaying = false;
    this.currentTrackIndex = 0;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.gainNodes.forEach((node) => {
      try { node.disconnect(); } catch (e) {}
    });
    this.oscillators.forEach((oscs) => {
      oscs.forEach((osc) => {
        try { osc.stop(); osc.disconnect(); } catch (e) {}
      });
    });
    this.gainNodes.clear();
    this.oscillators.clear();
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  destroy(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.onTrackPlayCallback = null;
  }
}
