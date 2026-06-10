import type { Sample, TrackState } from '../types';
import samplesData from '../data/samples.json';

const SAMPLE_RATE = 44100;

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private trackGains: Map<number, { gain: GainNode; mute: GainNode }> = new Map();
  private activeSources: AudioBufferSourceNode[] = [];
  private bufferCache: Map<string, AudioBuffer> = new Map();
  private samples: Sample[] = samplesData as Sample[];
  private playbackStartTime: number = 0;
  private playbackStartContextTime: number = 0;
  private isPlaying: boolean = false;

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 1;
      this.masterGain.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  private getSampleById(id: string): Sample | undefined {
    return this.samples.find(s => s.id === id);
  }

  private generateDrumBuffer(ctx: AudioContext, sampleId: string, duration: number): AudioBuffer {
    const length = Math.floor(duration * SAMPLE_RATE);
    const buffer = ctx.createBuffer(2, length, SAMPLE_RATE);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);

      if (sampleId.includes('drum-1')) {
        const freq = 60 + Math.random() * 20;
        for (let i = 0; i < length; i++) {
          const t = i / SAMPLE_RATE;
          const envelope = Math.exp(-t * 15);
          data[i] = Math.sin(2 * Math.PI * freq * t * (1 - t * 2)) * envelope * 0.8;
        }
      } else if (sampleId.includes('drum-2')) {
        for (let i = 0; i < length; i++) {
          const t = i / SAMPLE_RATE;
          const envelope = Math.exp(-t * 25);
          const noise = (Math.random() * 2 - 1) * 0.6;
          const tone = Math.sin(2 * Math.PI * 200 * t) * 0.4;
          data[i] = (noise + tone) * envelope;
        }
      } else if (sampleId.includes('drum-3')) {
        for (let i = 0; i < length; i++) {
          const t = i / SAMPLE_RATE;
          const envelope = Math.exp(-t * 80);
          data[i] = (Math.random() * 2 - 1) * envelope * 0.4;
        }
      } else if (sampleId.includes('drum-4')) {
        for (let i = 0; i < length; i++) {
          const t = i / SAMPLE_RATE;
          const envelope = Math.exp(-t * 8);
          data[i] = (Math.random() * 2 - 1) * envelope * 0.35;
        }
      } else if (sampleId.includes('drum-5')) {
        const freq = 250;
        for (let i = 0; i < length; i++) {
          const t = i / SAMPLE_RATE;
          const envelope = Math.exp(-t * 20);
          data[i] = Math.sin(2 * Math.PI * freq * t * (1 - t * 1.5)) * envelope * 0.7;
        }
      } else if (sampleId.includes('drum-6')) {
        const freq = 120;
        for (let i = 0; i < length; i++) {
          const t = i / SAMPLE_RATE;
          const envelope = Math.exp(-t * 15);
          data[i] = Math.sin(2 * Math.PI * freq * t * (1 - t * 1)) * envelope * 0.75;
        }
      } else if (sampleId.includes('drum-7')) {
        for (let i = 0; i < length; i++) {
          const t = i / SAMPLE_RATE;
          const envelope = Math.exp(-t * 3);
          data[i] = (Math.random() * 2 - 1) * envelope * 0.3;
        }
      } else {
        for (let i = 0; i < length; i++) {
          const t = i / SAMPLE_RATE;
          const envelope = Math.exp(-t * 30);
          data[i] = (Math.random() * 2 - 1) * envelope * 0.6;
        }
      }
    }
    return buffer;
  }

  private generateBassBuffer(ctx: AudioContext, sampleId: string, duration: number): AudioBuffer {
    const length = Math.floor(duration * SAMPLE_RATE);
    const buffer = ctx.createBuffer(2, length, SAMPLE_RATE);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      const baseFreq = 55 + Math.random() * 20;

      if (sampleId.includes('bass-1')) {
        for (let i = 0; i < length; i++) {
          const t = i / SAMPLE_RATE;
          const envelope = Math.min(t * 10, 1) * Math.exp(-(t - 0.05) * 1.5);
          const sample = Math.sin(2 * Math.PI * baseFreq * t) * 0.6 +
                         Math.sin(2 * Math.PI * baseFreq * 2 * t) * 0.2;
          data[i] = sample * envelope;
        }
      } else if (sampleId.includes('bass-2')) {
        for (let i = 0; i < length; i++) {
          const t = i / SAMPLE_RATE;
          const envelope = Math.min(t * 50, 1) * Math.exp(-t * 6);
          data[i] = Math.sin(2 * Math.PI * baseFreq * 1.5 * t) * envelope * 0.7;
        }
      } else if (sampleId.includes('bass-3')) {
        for (let i = 0; i < length; i++) {
          const t = i / SAMPLE_RATE;
          const envelope = Math.min(t * 5, 1) * Math.exp(-Math.max(0, t - duration + 0.2) * 8);
          const sample = Math.sin(2 * Math.PI * baseFreq * 0.75 * t) * 0.5 +
                         Math.sin(2 * Math.PI * baseFreq * 1.5 * t) * 0.3;
          data[i] = sample * envelope;
        }
      } else if (sampleId.includes('bass-4')) {
        for (let i = 0; i < length; i++) {
          const t = i / SAMPLE_RATE;
          const envelope = Math.min(t * 20, 1) * Math.exp(-t * 2.5);
          const phase = 2 * Math.PI * baseFreq * t;
          const saw = 2 * (phase / (2 * Math.PI) - Math.floor(phase / (2 * Math.PI) + 0.5));
          data[i] = saw * envelope * 0.4;
        }
      } else if (sampleId.includes('bass-5')) {
        for (let i = 0; i < length; i++) {
          const t = i / SAMPLE_RATE;
          const envelope = Math.min(t * 30, 1) * Math.exp(-t * 3);
          const phase = 2 * Math.PI * baseFreq * 1.2 * t;
          const square = Math.sign(Math.sin(phase));
          data[i] = square * envelope * 0.35;
        }
      } else {
        for (let i = 0; i < length; i++) {
          const t = i / SAMPLE_RATE;
          const envelope = Math.min(t * 15, 1) * Math.exp(-t * 2);
          const freq = baseFreq * (1 + t * 0.3);
          data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.6;
        }
      }
    }
    return buffer;
  }

  private generateMelodyBuffer(ctx: AudioContext, sampleId: string, duration: number): AudioBuffer {
    const length = Math.floor(duration * SAMPLE_RATE);
    const buffer = ctx.createBuffer(2, length, SAMPLE_RATE);
    const freqs = [261.63, 329.63, 392.00, 523.25];

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);

      if (sampleId.includes('melody-1')) {
        const freq = freqs[Math.floor(Math.random() * freqs.length)];
        for (let i = 0; i < length; i++) {
          const t = i / SAMPLE_RATE;
          const envelope = Math.min(t * 100, 1) * Math.exp(-t * 2);
          let sample = 0;
          for (let h = 1; h <= 5; h++) {
            sample += Math.sin(2 * Math.PI * freq * h * t) / h;
          }
          data[i] = sample * envelope * 0.35;
        }
      } else if (sampleId.includes('melody-2')) {
        const freq = freqs[Math.floor(Math.random() * freqs.length)];
        for (let i = 0; i < length; i++) {
          const t = i / SAMPLE_RATE;
          const envelope = Math.min(t * 5, 1) * Math.exp(-Math.max(0, t - duration + 0.3) * 2);
          const detune = Math.sin(2 * Math.PI * 3 * t) * 3;
          const sample = Math.sin(2 * Math.PI * (freq + detune) * t) * 0.4 +
                         Math.sin(2 * Math.PI * (freq * 1.01 + detune) * t) * 0.3;
          data[i] = sample * envelope;
        }
      } else if (sampleId.includes('melody-3')) {
        const baseFreq = 220;
        for (let i = 0; i < length; i++) {
          const t = i / SAMPLE_RATE;
          const envelope = Math.min(t * 2, 1) * Math.exp(-Math.max(0, t - duration + 0.5) * 0.5);
          let sample = 0;
          for (let h = 1; h <= 3; h++) {
            sample += Math.sin(2 * Math.PI * baseFreq * h * t) * 0.3;
          }
          data[i] = sample * envelope * 0.5;
        }
      } else if (sampleId.includes('melody-4')) {
        const freq = 1046.5;
        for (let i = 0; i < length; i++) {
          const t = i / SAMPLE_RATE;
          const envelope = Math.exp(-t * 4);
          data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.4;
        }
      } else if (sampleId.includes('melody-5')) {
        const freq = freqs[Math.floor(Math.random() * freqs.length)];
        for (let i = 0; i < length; i++) {
          const t = i / SAMPLE_RATE;
          const envelope = Math.min(t * 500, 1) * Math.exp(-t * 4);
          data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.5;
        }
      } else {
        const freq = 587.33;
        for (let i = 0; i < length; i++) {
          const t = i / SAMPLE_RATE;
          const envelope = Math.min(t * 20, 1) * Math.exp(-Math.max(0, t - duration + 0.3) * 3);
          const vibrato = Math.sin(2 * Math.PI * 5 * t) * 5;
          data[i] = Math.sin(2 * Math.PI * (freq + vibrato) * t) * envelope * 0.45;
        }
      }
    }
    return buffer;
  }

  private generateBuffer(sampleId: string): AudioBuffer {
    const ctx = this.ensureContext();
    const sample = this.getSampleById(sampleId);
    if (!sample) {
      return ctx.createBuffer(2, SAMPLE_RATE, SAMPLE_RATE);
    }

    if (sample.category === 'drum') {
      return this.generateDrumBuffer(ctx, sampleId, sample.duration);
    } else if (sample.category === 'bass') {
      return this.generateBassBuffer(ctx, sampleId, sample.duration);
    } else {
      return this.generateMelodyBuffer(ctx, sampleId, sample.duration);
    }
  }

  getBuffer(sampleId: string): AudioBuffer {
    if (!this.bufferCache.has(sampleId)) {
      this.bufferCache.set(sampleId, this.generateBuffer(sampleId));
    }
    return this.bufferCache.get(sampleId)!;
  }

  generateWaveform(sampleId: string, points: number = 100): number[] {
    const buffer = this.getBuffer(sampleId);
    const data = buffer.getChannelData(0);
    const blockSize = Math.floor(data.length / points);
    const waveform: number[] = [];

    for (let i = 0; i < points; i++) {
      let sum = 0;
      const start = i * blockSize;
      const end = Math.min(start + blockSize, data.length);
      for (let j = start; j < end; j++) {
        sum += Math.abs(data[j]);
      }
      waveform.push(sum / (end - start));
    }

    const max = Math.max(...waveform, 0.001);
    return waveform.map(v => v / max);
  }

  playPreview(sampleId: string): void {
    const ctx = this.ensureContext();
    const buffer = this.getBuffer(sampleId);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.7;
    source.connect(gain);
    gain.connect(this.masterGain!);
    source.start(0);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
  }

  private ensureTrackGain(trackId: number): { gain: GainNode; mute: GainNode } {
    if (!this.trackGains.has(trackId)) {
      const ctx = this.ensureContext();
      const gain = ctx.createGain();
      const mute = ctx.createGain();
      gain.gain.value = 0.8;
      mute.gain.value = 1;
      gain.connect(mute);
      mute.connect(this.masterGain!);
      this.trackGains.set(trackId, { gain, mute });
    }
    return this.trackGains.get(trackId)!;
  }

  setTrackVolume(trackId: number, volume: number): void {
    const { gain } = this.ensureTrackGain(trackId);
    gain.gain.value = volume / 100;
  }

  setTrackMute(trackId: number, muted: boolean): void {
    const { mute } = this.ensureTrackGain(trackId);
    mute.gain.value = muted ? 0 : 1;
  }

  startPlayback(tracks: TrackState[], _bpm: number, startTime: number): void {
    const ctx = this.ensureContext();
    this.stopPlayback();

    this.playbackStartTime = startTime;
    this.playbackStartContextTime = ctx.currentTime;
    this.isPlaying = true;

    tracks.forEach(track => {
      const { gain, mute } = this.ensureTrackGain(track.id);
      gain.gain.value = track.volume / 100;
      mute.gain.value = track.muted ? 0 : 1;

      track.clips.forEach(clip => {
        if (clip.startTime + clip.duration > startTime) {
          const buffer = this.getBuffer(clip.sampleId);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(gain);

          const offset = Math.max(0, startTime - clip.startTime);
          const when = Math.max(0, clip.startTime - startTime);
          const duration = Math.max(0, clip.duration - offset);

          if (duration > 0) {
            source.start(ctx.currentTime + when, offset, duration);
            this.activeSources.push(source);
          }
        }
      });
    });
  }

  pausePlayback(): number {
    const ctx = this.ensureContext();
    const elapsed = ctx.currentTime - this.playbackStartContextTime;
    const currentTime = this.playbackStartTime + elapsed;

    this.activeSources.forEach(source => {
      try { source.stop(); } catch {}
      source.disconnect();
    });
    this.activeSources = [];
    this.isPlaying = false;

    return currentTime;
  }

  stopPlayback(): void {
    this.activeSources.forEach(source => {
      try { source.stop(); } catch {}
      source.disconnect();
    });
    this.activeSources = [];
    this.isPlaying = false;
  }

  getCurrentPlaybackTime(): number {
    if (!this.isPlaying || !this.audioContext) return 0;
    const elapsed = this.audioContext.currentTime - this.playbackStartContextTime;
    return this.playbackStartTime + elapsed;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  async exportWAV(tracks: TrackState[], _bpm: number): Promise<Blob> {
    const maxEnd = tracks.reduce((max, track) => {
      const trackEnd = track.clips.reduce((m, c) => Math.max(m, c.startTime + c.duration), 0);
      return Math.max(max, trackEnd);
    }, 0);

    const duration = Math.max(maxEnd, 1);
    const offlineCtx = new OfflineAudioContext(2, Math.floor(duration * SAMPLE_RATE), SAMPLE_RATE);
    const master = offlineCtx.createGain();
    master.gain.value = 1;
    master.connect(offlineCtx.destination);

    tracks.forEach(track => {
      if (track.muted) return;

      const trackGain = offlineCtx.createGain();
      trackGain.gain.value = track.volume / 100;
      trackGain.connect(master);

      track.clips.forEach(clip => {
        const buffer = this.getBuffer(clip.sampleId);
        const source = offlineCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(trackGain);
        source.start(clip.startTime);
      });
    });

    const renderedBuffer = await offlineCtx.startRendering();
    return this.bufferToWAV(renderedBuffer);
  }

  private bufferToWAV(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const dataLength = buffer.length * blockAlign;
    const bufferLength = 44 + dataLength;

    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, bufferLength - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    const channels: Float32Array[] = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }
}

export const audioEngine = new AudioEngine();
