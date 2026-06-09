import { Song } from '../types';

const NOTE_FREQUENCIES: Record<string, number> = {
  'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13,
  'E': 329.63, 'F': 349.23, 'F#': 369.99, 'G': 392.00,
  'G#': 415.30, 'A': 440.00, 'A#': 466.16, 'B': 493.88
};

function parseKeyToBaseFreq(key: string): number {
  const cleanKey = key.replace('m', '').replace('M', '');
  let freq = NOTE_FREQUENCIES[cleanKey] || 440;
  if (key.includes('m')) {
    freq = freq * Math.pow(2, -3 / 12);
  }
  return freq;
}

function generateMelody(baseFreq: number, bpm: number, duration: number): number[][] {
  const beatDuration = 60 / bpm;
  const numNotes = Math.floor(duration / beatDuration);
  const melody: number[][] = [];
  const intervals = [0, 2, 4, 5, 7, 9, 11, 12, 7, 5, 4, 2];
  
  for (let i = 0; i < numNotes; i++) {
    const interval = intervals[i % intervals.length];
    const freq = baseFreq * Math.pow(2, interval / 12);
    const startTime = i * beatDuration;
    const noteDuration = beatDuration * 0.8;
    melody.push([freq, startTime, noteDuration]);
  }
  
  return melody;
}

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private currentSong: Song | null = null;
  private isPlaying = false;
  private startTime = 0;
  private pauseTime = 0;
  private gainNode: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private onProgressCallback: ((progress: number, currentTime: number, duration: number) => void) | null = null;
  private onSongEndCallback: (() => void) | null = null;
  private progressInterval: number | null = null;

  private ensureContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0.15;
      this.gainNode.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  setOnProgress(callback: (progress: number, currentTime: number, duration: number) => void) {
    this.onProgressCallback = callback;
  }

  setOnSongEnd(callback: () => void) {
    this.onSongEndCallback = callback;
  }

  play(song: Song, fromTime = 0) {
    this.stop();
    this.ensureContext();
    if (!this.audioContext || !this.gainNode) return;

    this.currentSong = song;
    this.isPlaying = true;
    this.startTime = this.audioContext.currentTime - fromTime;
    this.pauseTime = 0;

    const baseFreq = parseKeyToBaseFreq(song.key);
    const melody = generateMelody(baseFreq, song.bpm, song.duration);

    melody.forEach(([freq, noteStart, noteDur]) => {
      if (noteStart + noteDur > fromTime) {
        const osc = this.audioContext!.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const noteGain = this.audioContext!.createGain();
        const adjustedStart = Math.max(0, noteStart - fromTime);
        
        noteGain.gain.setValueAtTime(0, this.audioContext!.currentTime + adjustedStart);
        noteGain.gain.linearRampToValueAtTime(0.3, this.audioContext!.currentTime + adjustedStart + 0.02);
        noteGain.gain.linearRampToValueAtTime(0, this.audioContext!.currentTime + adjustedStart + noteDur);

        osc.connect(noteGain);
        noteGain.connect(this.gainNode!);
        
        osc.start(this.audioContext!.currentTime + adjustedStart);
        osc.stop(this.audioContext!.currentTime + adjustedStart + noteDur);
        
        this.oscillators.push(osc);
      }
    });

    this.startProgressTracking();
  }

  private startProgressTracking() {
    if (this.progressInterval) clearInterval(this.progressInterval);
    
    this.progressInterval = window.setInterval(() => {
      if (!this.isPlaying || !this.currentSong || !this.audioContext) return;
      
      const currentTime = this.audioContext.currentTime - this.startTime;
      const duration = this.currentSong.duration;
      const progress = Math.min(1, currentTime / duration);
      
      this.onProgressCallback?.(progress, currentTime, duration);
      
      if (progress >= 1) {
        this.pauseTime = 0;
        this.stop();
        this.onSongEndCallback?.();
      }
    }, 50);
  }

  pause() {
    if (!this.isPlaying || !this.audioContext) return;
    
    this.pauseTime = this.audioContext.currentTime - this.startTime;
    this.isPlaying = false;
    this.stopOscillators();
    
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  resume() {
    if (this.isPlaying || !this.currentSong) return;
    this.play(this.currentSong, this.pauseTime);
  }

  toggle(song: Song) {
    if (this.currentSong?.id === song.id) {
      if (this.isPlaying) {
        this.pause();
      } else {
        this.resume();
      }
    } else {
      this.play(song);
    }
  }

  seek(progress: number) {
    if (!this.currentSong) return;
    const targetTime = progress * this.currentSong.duration;
    if (this.isPlaying) {
      this.play(this.currentSong, targetTime);
    } else {
      this.pauseTime = targetTime;
      this.onProgressCallback?.(progress, targetTime, this.currentSong.duration);
    }
  }

  private stopOscillators() {
    this.oscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) { /* ignore */ }
    });
    this.oscillators = [];
  }

  stop() {
    this.stopOscillators();
    this.isPlaying = false;
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  getIsPlaying() {
    return this.isPlaying;
  }

  getCurrentSongId() {
    return this.currentSong?.id || null;
  }

  destroy() {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
