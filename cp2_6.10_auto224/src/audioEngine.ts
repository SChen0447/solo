import type { AudioClip, Track, PlaybackState, PlaybackCallback, EndCallback } from './types';

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sourceNodes: Map<string, AudioBufferSourceNode> = new Map();
  private gainNodes: Map<string, GainNode> = new Map();
  private state: PlaybackState = {
    isPlaying: false,
    currentTime: 0,
    totalDuration: 0,
    playbackRate: 1,
    masterVolume: 0.8
  };
  private tracks: Track[] = [];
  private startTime: number = 0;
  private pauseTime: number = 0;
  private animationId: number | null = null;
  private playbackCallbacks: PlaybackCallback[] = [];
  private endCallbacks: EndCallback[] = [];

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AC();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = this.state.masterVolume;
    this.masterGain.connect(this.audioContext.destination);
  }

  public ensureRunning(): void {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public getState(): PlaybackState {
    return { ...this.state };
  }

  public setTracks(tracks: Track[]): void {
    this.tracks = tracks;
    this.recalculateDuration();
  }

  public recalculateDuration(): void {
    let max = 0;
    for (const track of this.tracks) {
      for (const clip of track.clips) {
        const end = clip.startTime + clip.duration;
        if (end > max) max = end;
      }
    }
    this.state.totalDuration = max;
  }

  public async decodeAudioFile(file: File): Promise<AudioBuffer> {
    this.ensureRunning();
    const arrayBuffer = await file.arrayBuffer();
    return await this.audioContext!.decodeAudioData(arrayBuffer.slice(0));
  }

  public generateWaveformData(buffer: AudioBuffer, samples: number = 1000): number[] {
    const channelData = buffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / samples);
    const result: number[] = [];
    for (let i = 0; i < samples; i++) {
      let sum = 0;
      const start = i * blockSize;
      const end = Math.min(start + blockSize, channelData.length);
      for (let j = start; j < end; j++) {
        sum += Math.abs(channelData[j]);
      }
      result.push(sum / (end - start));
    }
    const max = Math.max(...result, 0.0001);
    return result.map(v => v / max);
  }

  public onPlayback(callback: PlaybackCallback): void {
    this.playbackCallbacks.push(callback);
  }

  public onEnd(callback: EndCallback): void {
    this.endCallbacks.push(callback);
  }

  public startPlayback(): void {
    if (this.state.isPlaying || !this.audioContext || !this.masterGain) return;
    this.ensureRunning();

    const ctx = this.audioContext;
    const now = ctx.currentTime;
    this.startTime = now - this.pauseTime;
    this.state.isPlaying = true;

    const hasSolo = this.tracks.some(t => t.solo);

    for (const track of this.tracks) {
      if (track.muted) continue;
      if (hasSolo && !track.solo) continue;

      const trackGain = ctx.createGain();
      trackGain.gain.value = track.volume;
      trackGain.connect(this.masterGain);
      this.gainNodes.set(track.id, trackGain);

      for (const clip of track.clips) {
        if (!clip.buffer) continue;

        const clipStart = clip.startTime;
        const clipEnd = clip.startTime + clip.duration;
        const currentPos = this.state.currentTime;

        if (clipEnd <= currentPos) continue;

        const source = ctx.createBufferSource();
        source.buffer = clip.buffer;
        source.playbackRate.value = this.state.playbackRate;

        const clipGain = ctx.createGain();
        const offset = Math.max(0, currentPos - clipStart);
        const audioStart = now + Math.max(0, (clipStart - currentPos) / this.state.playbackRate);

        const fadeInDur = clip.fadeIn * clip.duration;
        const fadeOutDur = clip.fadeOut * clip.duration;
        const relStart = Math.max(0, currentPos - clipStart);

        clipGain.gain.setValueAtTime(0, audioStart);

        if (relStart < fadeInDur) {
          const remainingFade = fadeInDur - relStart;
          clipGain.gain.linearRampToValueAtTime(1, audioStart + remainingFade / this.state.playbackRate);
        } else {
          clipGain.gain.linearRampToValueAtTime(1, audioStart + 0.001);
        }

        const fadeOutStart = clip.duration - fadeOutDur;
        if (clipEnd - currentPos > 0) {
          const timeToFadeOut = Math.max(0, (fadeOutStart - relStart) / this.state.playbackRate);
          const fadeOutAudioTime = audioStart + timeToFadeOut;
          const totalRemaining = (clipEnd - currentPos) / this.state.playbackRate;
          const actualFadeOutTime = Math.min(totalRemaining, fadeOutDur / this.state.playbackRate);
          clipGain.gain.setValueAtTime(1, fadeOutAudioTime);
          clipGain.gain.linearRampToValueAtTime(0, fadeOutAudioTime + actualFadeOutTime);
        }

        source.connect(clipGain);
        clipGain.connect(trackGain);

        try {
          source.start(audioStart, offset);
          const stopTime = audioStart + (clip.duration - relStart) / this.state.playbackRate;
          source.stop(stopTime);
        } catch (e) {
          console.warn('source start error', e);
        }

        this.sourceNodes.set(`${track.id}-${clip.id}`, source);
      }
    }

    this.startProgressLoop();
  }

  private startProgressLoop(): void {
    const update = () => {
      if (!this.state.isPlaying) return;
      this.state.currentTime = (this.audioContext!.currentTime - this.startTime) * this.state.playbackRate;

      if (this.state.currentTime >= this.state.totalDuration && this.state.totalDuration > 0) {
        this.stopPlayback();
        this.endCallbacks.forEach(cb => cb());
        return;
      }

      this.playbackCallbacks.forEach(cb => cb(this.state.currentTime));
      this.animationId = requestAnimationFrame(update);
    };
    this.animationId = requestAnimationFrame(update);
  }

  public pausePlayback(): void {
    if (!this.state.isPlaying) return;
    this.stopAllSources();
    this.state.isPlaying = false;
    this.pauseTime = this.state.currentTime;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public stopPlayback(): void {
    this.stopAllSources();
    this.state.isPlaying = false;
    this.state.currentTime = 0;
    this.pauseTime = 0;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.playbackCallbacks.forEach(cb => cb(0));
  }

  private stopAllSources(): void {
    for (const source of this.sourceNodes.values()) {
      try { source.stop(); } catch (e) {}
      source.disconnect();
    }
    this.sourceNodes.clear();
    for (const gain of this.gainNodes.values()) {
      gain.disconnect();
    }
    this.gainNodes.clear();
  }

  public seekTo(time: number): void {
    const wasPlaying = this.state.isPlaying;
    if (wasPlaying) {
      this.stopAllSources();
      this.state.isPlaying = false;
      if (this.animationId !== null) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    }
    this.state.currentTime = Math.max(0, Math.min(time, this.state.totalDuration));
    this.pauseTime = this.state.currentTime;
    this.playbackCallbacks.forEach(cb => cb(this.state.currentTime));
    if (wasPlaying) {
      this.startPlayback();
    }
  }

  public setPlaybackRate(rate: number): void {
    const wasPlaying = this.state.isPlaying;
    this.state.playbackRate = rate;
    if (wasPlaying) {
      this.pausePlayback();
      this.startPlayback();
    }
  }

  public setMasterVolume(volume: number): void {
    this.state.masterVolume = volume;
    if (this.masterGain) {
      this.masterGain.gain.value = volume;
    }
  }

  public setTrackVolume(trackId: string, volume: number): void {
    const gain = this.gainNodes.get(trackId);
    if (gain) {
      gain.gain.value = volume;
    }
  }

  public async exportMix(onProgress?: (p: number) => void): Promise<Blob> {
    const sampleRate = 44100;
    const duration = Math.max(this.state.totalDuration, 1);
    const numChannels = 2;
    const length = Math.ceil(duration * sampleRate);

    const offlineCtx = new OfflineAudioContext(numChannels, length, sampleRate);
    const offlineMaster = offlineCtx.createGain();
    offlineMaster.gain.value = this.state.masterVolume;
    offlineMaster.connect(offlineCtx.destination);

    const hasSolo = this.tracks.some(t => t.solo);

    for (const track of this.tracks) {
      if (track.muted) continue;
      if (hasSolo && !track.solo) continue;

      const trackGain = offlineCtx.createGain();
      trackGain.gain.value = track.volume;
      trackGain.connect(offlineMaster);

      for (const clip of track.clips) {
        if (!clip.buffer) continue;

        const source = offlineCtx.createBufferSource();
        const resampled = this.resampleBuffer(clip.buffer, sampleRate, offlineCtx);
        source.buffer = resampled;

        const clipGain = offlineCtx.createGain();
        const startTime = clip.startTime;
        const fadeInDur = clip.fadeIn * clip.duration;
        const fadeOutDur = clip.fadeOut * clip.duration;

        clipGain.gain.setValueAtTime(0, startTime);
        clipGain.gain.linearRampToValueAtTime(1, startTime + fadeInDur);
        clipGain.gain.setValueAtTime(1, startTime + clip.duration - fadeOutDur);
        clipGain.gain.linearRampToValueAtTime(0, startTime + clip.duration);

        source.connect(clipGain);
        clipGain.connect(trackGain);
        source.start(startTime);
      }
    }

    if (onProgress) {
      let progress = 0;
      const interval = setInterval(() => {
        progress = Math.min(progress + 0.1, 0.9);
        onProgress(progress);
      }, 100);
      const buffer = await offlineCtx.startRendering();
      clearInterval(interval);
      onProgress(1);
      return this.bufferToWav(buffer);
    }

    const buffer = await offlineCtx.startRendering();
    return this.bufferToWav(buffer);
  }

  private resampleBuffer(buffer: AudioBuffer, targetRate: number, ctx: BaseAudioContext): AudioBuffer {
    if (buffer.sampleRate === targetRate) return buffer;
    const ratio = targetRate / buffer.sampleRate;
    const newLen = Math.ceil(buffer.length * ratio);
    const newBuffer = ctx.createBuffer(buffer.numberOfChannels, newLen, targetRate);
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const oldData = buffer.getChannelData(c);
      const newData = newBuffer.getChannelData(c);
      for (let i = 0; i < newLen; i++) {
        const pos = i / ratio;
        const idx = Math.floor(pos);
        const frac = pos - idx;
        const a = oldData[Math.min(idx, oldData.length - 1)] || 0;
        const b = oldData[Math.min(idx + 1, oldData.length - 1)] || 0;
        newData[i] = a + (b - a) * frac;
      }
    }
    return newBuffer;
  }

  private bufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const dataSize = buffer.length * blockAlign;
    const bufferSize = 44 + dataSize;
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
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
    view.setUint32(40, dataSize, true);

    const channels: Float32Array[] = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        let sample = Math.max(-1, Math.min(1, channels[ch][i]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, sample, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  public getAudioContext(): AudioContext {
    return this.audioContext!;
  }
}
