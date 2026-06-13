export type PresetType = 'bass' | 'mid' | 'treble';

export interface AudioData {
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  bassAmplitude: number;
  midAmplitude: number;
  trebleAmplitude: number;
  dominantBand: 'bass' | 'mid' | 'treble';
}

export interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  trackName: string;
}

type SourceType = 'preset' | 'file';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private sourceNode: AudioBufferSourceNode | OscillatorNode | null = null;
  private frequencyData: Uint8Array = new Uint8Array(0);
  private timeDomainData: Uint8Array = new Uint8Array(0);
  private bufferLength: number = 256;
  private currentTrackName: string = '等待播放...';
  private isPlayingFlag: boolean = false;
  private sourceType: SourceType | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private presetSchedulers: Array<() => void> = [];
  private playbackStartTime: number = 0;
  private pauseOffset: number = 0;
  private maxFileSize: number = 10 * 1024 * 1024;
  private onStateChange: ((state: AudioState) => void) | null = null;

  public init(): void {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = this.bufferLength * 2;
    this.analyser.smoothingTimeConstant = 0.8;
    this.bufferLength = this.analyser.frequencyBinCount;
    this.frequencyData = new Uint8Array(this.bufferLength);
    this.timeDomainData = new Uint8Array(this.bufferLength);
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = 0.6;
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);
  }

  public setStateCallback(callback: (state: AudioState) => void): void {
    this.onStateChange = callback;
  }

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange({
        isPlaying: this.isPlayingFlag,
        currentTime: this.getCurrentTime(),
        duration: this.getDuration(),
        trackName: this.currentTrackName
      });
    }
  }

  private getCurrentTime(): number {
    if (!this.ctx || !this.isPlayingFlag) return this.pauseOffset;
    if (this.sourceType === 'preset') {
      return (this.ctx.currentTime - this.playbackStartTime) + this.pauseOffset;
    }
    return (this.ctx.currentTime - this.playbackStartTime) + this.pauseOffset;
  }

  private getDuration(): number {
    if (this.audioBuffer) return this.audioBuffer.duration;
    if (this.sourceType === 'preset') return 60;
    return 0;
  }

  public async playPreset(type: PresetType): Promise<void> {
    this.stopCurrent();
    this.ensureContext();
    if (!this.ctx || !this.analyser) return;

    this.sourceType = 'preset';
    this.currentTrackName = this.getPresetName(type);
    this.pauseOffset = 0;
    this.playbackStartTime = this.ctx.currentTime;
    this.isPlayingFlag = true;
    this.emitState();

    const masterGain = this.ctx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(this.analyser);

    this.schedulePreset(type, masterGain);
    this.startStateLoop();
  }

  private getPresetName(type: PresetType): string {
    switch (type) {
      case 'bass': return '低音脉冲';
      case 'mid': return '中音和弦';
      case 'treble': return '高音旋律';
    }
  }

  private schedulePreset(type: PresetType, masterGain: GainNode): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    const bpm = type === 'bass' ? 90 : type === 'mid' ? 110 : 130;
    const beatDuration = 60 / bpm;

    switch (type) {
      case 'bass':
        this.scheduleBassPreset(ctx, masterGain, beatDuration);
        break;
      case 'mid':
        this.scheduleMidPreset(ctx, masterGain, beatDuration);
        break;
      case 'treble':
        this.scheduleTreblePreset(ctx, masterGain, beatDuration);
        break;
    }
  }

  private scheduleBassPreset(ctx: AudioContext, masterGain: GainNode, beatDur: number): void {
    const startTime = ctx.currentTime;
    const kickFreqs = [60, 55, 65, 58];
    const totalBeats = 64;

    for (let i = 0; i < totalBeats; i++) {
      const t = startTime + i * beatDur;
      const kick = ctx.createOscillator();
      const kickGain = ctx.createGain();
      kick.type = 'sine';
      const freq = kickFreqs[i % kickFreqs.length];
      kick.frequency.setValueAtTime(freq * 2, t);
      kick.frequency.exponentialRampToValueAtTime(freq, t + 0.05);
      kickGain.gain.setValueAtTime(0, t);
      kickGain.gain.linearRampToValueAtTime(1, t + 0.01);
      kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      kick.connect(kickGain).connect(masterGain);
      kick.start(t);
      kick.stop(t + 0.4);
      this.presetSchedulers.push(() => { try { kick.stop(); } catch { /* noop */ } });

      if (i % 2 === 0) {
        const sub = ctx.createOscillator();
        const subGain = ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(freq * 0.5, t);
        subGain.gain.setValueAtTime(0, t);
        subGain.gain.linearRampToValueAtTime(0.6, t + 0.02);
        subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        sub.connect(subGain).connect(masterGain);
        sub.start(t);
        sub.stop(t + 0.5);
      }

      if (i % 4 === 2) {
        const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let j = 0; j < data.length; j++) {
          data[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / data.length, 2);
        }
        const noise = ctx.createBufferSource();
        const noiseGain = ctx.createGain();
        noise.buffer = noiseBuf;
        noiseGain.gain.value = 0.3;
        noise.connect(noiseGain).connect(masterGain);
        noise.start(t);
      }
    }

    const loopDuration = totalBeats * beatDur;
    setTimeout(() => {
      if (this.isPlayingFlag && this.sourceType === 'preset') {
        this.scheduleBassPreset(ctx, masterGain, beatDur);
      }
    }, (loopDuration - 0.5) * 1000);
  }

  private scheduleMidPreset(ctx: AudioContext, masterGain: GainNode, beatDur: number): void {
    const startTime = ctx.currentTime;
    const chordProgressions = [
      [261.63, 329.63, 392.00],
      [220.00, 277.18, 349.23],
      [246.94, 293.66, 369.99],
      [196.00, 246.94, 311.13]
    ];
    const bars = 16;
    const chordsPerBar = 4;

    for (let bar = 0; bar < bars; bar++) {
      const chord = chordProgressions[bar % chordProgressions.length];
      for (let beat = 0; beat < chordsPerBar; beat++) {
        const t = startTime + (bar * chordsPerBar + beat) * beatDur;
        chord.forEach((freq, idx) => {
          const pad = ctx.createOscillator();
          const padGain = ctx.createGain();
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          pad.type = 'triangle';
          pad.frequency.value = freq;
          lfo.type = 'sine';
          lfo.frequency.value = 3 + idx * 0.5;
          lfoGain.gain.value = freq * 0.005;
          lfo.connect(lfoGain).connect(pad.frequency);
          padGain.gain.setValueAtTime(0, t);
          padGain.gain.linearRampToValueAtTime(0.25, t + 0.15);
          padGain.gain.setValueAtTime(0.25, t + beatDur * 0.7);
          padGain.gain.linearRampToValueAtTime(0.001, t + beatDur);
          pad.connect(padGain).connect(masterGain);
          pad.start(t);
          pad.stop(t + beatDur);
          lfo.start(t);
          lfo.stop(t + beatDur);
          this.presetSchedulers.push(() => { try { pad.stop(); lfo.stop(); } catch { /* noop */ } });
        });

        if (beat % 2 === 0) {
          const bassNote = chord[0] * 0.5;
          const bass = ctx.createOscillator();
          const bassGain = ctx.createGain();
          bass.type = 'sawtooth';
          bass.frequency.value = bassNote;
          bassGain.gain.setValueAtTime(0, t);
          bassGain.gain.linearRampToValueAtTime(0.15, t + 0.02);
          bassGain.gain.exponentialRampToValueAtTime(0.001, t + beatDur * 0.8);
          bass.connect(bassGain).connect(masterGain);
          bass.start(t);
          bass.stop(t + beatDur * 0.8);
        }
      }
    }

    const loopDuration = bars * chordsPerBar * beatDur;
    setTimeout(() => {
      if (this.isPlayingFlag && this.sourceType === 'preset') {
        this.scheduleMidPreset(ctx, masterGain, beatDur);
      }
    }, (loopDuration - 0.5) * 1000);
  }

  private scheduleTreblePreset(ctx: AudioContext, masterGain: GainNode, beatDur: number): void {
    const startTime = ctx.currentTime;
    const scales = [
      [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50],
      [440.00, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99, 880.00]
    ];
    const bars = 8;
    const notesPerBar = 8;
    const noteDur = beatDur / 2;

    for (let bar = 0; bar < bars; bar++) {
      const scale = scales[bar % scales.length];
      for (let n = 0; n < notesPerBar; n++) {
        const t = startTime + (bar * notesPerBar + n) * noteDur;
        const noteIdx = Math.floor(Math.random() * scale.length);
        const freq = scale[noteIdx];
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        oscGain.gain.setValueAtTime(0, t);
        oscGain.gain.linearRampToValueAtTime(0.3, t + 0.01);
        oscGain.gain.exponentialRampToValueAtTime(0.001, t + noteDur * 0.8);
        osc.connect(oscGain).connect(masterGain);
        osc.start(t);
        osc.stop(t + noteDur * 0.85);
        this.presetSchedulers.push(() => { try { osc.stop(); } catch { /* noop */ } });

        if (n % 4 === 0) {
          const harmon = ctx.createOscillator();
          const harmonGain = ctx.createGain();
          harmon.type = 'square';
          harmon.frequency.value = freq * 2;
          harmonGain.gain.setValueAtTime(0, t);
          harmonGain.gain.linearRampToValueAtTime(0.08, t + 0.005);
          harmonGain.gain.exponentialRampToValueAtTime(0.001, t + noteDur * 0.5);
          harmon.connect(harmonGain).connect(masterGain);
          harmon.start(t);
          harmon.stop(t + noteDur * 0.5);
        }
      }
    }

    const padStart = startTime;
    const padDur = bars * notesPerBar * noteDur;
    [523.25, 659.25, 783.99].forEach((f) => {
      const pad = ctx.createOscillator();
      const padGain = ctx.createGain();
      pad.type = 'sine';
      pad.frequency.value = f;
      padGain.gain.setValueAtTime(0, padStart);
      padGain.gain.linearRampToValueAtTime(0.08, padStart + 2);
      padGain.gain.setValueAtTime(0.08, padStart + padDur - 1);
      padGain.gain.linearRampToValueAtTime(0.001, padStart + padDur);
      pad.connect(padGain).connect(masterGain);
      pad.start(padStart);
      pad.stop(padStart + padDur + 0.1);
      this.presetSchedulers.push(() => { try { pad.stop(); } catch { /* noop */ } });
    });

    const loopDuration = bars * notesPerBar * noteDur;
    setTimeout(() => {
      if (this.isPlayingFlag && this.sourceType === 'preset') {
        this.scheduleTreblePreset(ctx, masterGain, beatDur);
      }
    }, (loopDuration - 0.5) * 1000);
  }

  public async playFile(file: File): Promise<void> {
    if (file.size > this.maxFileSize) {
      throw new Error('文件大小超过10MB限制');
    }
    if (!file.type.includes('audio') && !file.name.match(/\.(mp3|wav)$/i)) {
      throw new Error('不支持的文件格式');
    }

    this.stopCurrent();
    this.ensureContext();
    if (!this.ctx || !this.analyser) return;

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.ctx.decodeAudioData(arrayBuffer.slice(0));
    this.currentTrackName = file.name;
    this.sourceType = 'file';
    this.pauseOffset = 0;
    this.playbackStartTime = this.ctx.currentTime;
    this.isPlayingFlag = true;
    this.emitState();

    const source = this.ctx.createBufferSource();
    source.buffer = this.audioBuffer;
    source.connect(this.analyser);
    source.onended = () => {
      if (this.sourceNode === source) {
        this.isPlayingFlag = false;
        this.emitState();
      }
    };
    source.start(0);
    this.sourceNode = source;
    this.startStateLoop();
  }

  private ensureContext(): void {
    this.init();
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public stopCurrent(): void {
    this.presetSchedulers.forEach(cb => cb());
    this.presetSchedulers = [];
    this.stopStateLoop();

    if (this.sourceNode && this.sourceType === 'file') {
      try {
        (this.sourceNode as AudioBufferSourceNode).stop();
      } catch {
        // noop
      }
    }
    this.sourceNode = null;
    this.sourceType = null;
    if (this.ctx && this.isPlayingFlag) {
      this.pauseOffset = this.ctx.currentTime - this.playbackStartTime + this.pauseOffset;
    }
    this.isPlayingFlag = false;
    this.audioBuffer = null;
    this.emitState();
  }

  public seek(progress: number): void {
    if (!this.ctx || !this.audioBuffer || this.sourceType !== 'file') return;
    const newTime = Math.max(0, Math.min(1, progress)) * this.audioBuffer.duration;
    if (this.sourceNode) {
      try { (this.sourceNode as AudioBufferSourceNode).stop(); } catch { /* noop */ }
    }
    const source = this.ctx.createBufferSource();
    source.buffer = this.audioBuffer;
    source.connect(this.analyser!);
    source.onended = () => {
      if (this.sourceNode === source) {
        this.isPlayingFlag = false;
        this.emitState();
      }
    };
    source.start(0, newTime);
    this.sourceNode = source;
    this.pauseOffset = newTime;
    this.playbackStartTime = this.ctx.currentTime;
    this.isPlayingFlag = true;
    this.emitState();
  }

  private stateTimerId: number | null = null;
  private startStateLoop(): void {
    if (this.stateTimerId !== null) return;
    const tick = () => {
      this.emitState();
      this.stateTimerId = window.setTimeout(tick, 100);
    };
    tick();
  }
  private stopStateLoop(): void {
    if (this.stateTimerId !== null) {
      clearTimeout(this.stateTimerId);
      this.stateTimerId = null;
    }
  }

  public getAudioData(): AudioData | null {
    if (!this.analyser) return null;
    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.timeDomainData);

    const len = this.frequencyData.length;
    const bassEnd = Math.floor(len * 0.15);
    const midEnd = Math.floor(len * 0.5);

    let bassSum = 0, midSum = 0, trebleSum = 0;
    for (let i = 0; i < bassEnd; i++) bassSum += this.frequencyData[i];
    for (let i = bassEnd; i < midEnd; i++) midSum += this.frequencyData[i];
    for (let i = midEnd; i < len; i++) trebleSum += this.frequencyData[i];

    const bassAmp = bassSum / bassEnd / 255;
    const midAmp = midSum / (midEnd - bassEnd) / 255;
    const trebleAmp = trebleSum / (len - midEnd) / 255;

    let dominant: 'bass' | 'mid' | 'treble' = 'mid';
    if (bassAmp >= midAmp && bassAmp >= trebleAmp) dominant = 'bass';
    else if (trebleAmp >= midAmp && trebleAmp >= bassAmp) dominant = 'treble';

    return {
      frequencyData: this.frequencyData,
      timeDomainData: this.timeDomainData,
      bassAmplitude: bassAmp,
      midAmplitude: midAmp,
      trebleAmplitude: trebleAmp,
      dominantBand: dominant
    };
  }

  public getBufferLength(): number {
    return this.bufferLength;
  }

  public getBPM(type: PresetType): number {
    switch (type) {
      case 'bass': return 90;
      case 'mid': return 110;
      case 'treble': return 130;
    }
  }
}
