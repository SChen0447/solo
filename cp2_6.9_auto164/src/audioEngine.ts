export type DiscId = 'kick' | 'snare' | 'hihat' | 'bass' | 'synth' | 'lead';

export interface PlayResult {
  source: AudioBufferSourceNode;
  analyser: AnalyserNode;
  duration: number;
}

export interface DiscConfig {
  id: DiscId;
  name: string;
  color: string;
  icon: string;
}

export const DISC_CONFIGS: DiscConfig[] = [
  { id: 'kick', name: '底鼓', color: '#E91E63', icon: '🥁' },
  { id: 'snare', name: '军鼓', color: '#9C27B0', icon: '🥁' },
  { id: 'hihat', name: '镲', color: '#3F51B5', icon: '🎵' },
  { id: 'bass', name: '贝斯', color: '#4CAF50', icon: '🎸' },
  { id: 'synth', name: '合成器', color: '#FF9800', icon: '🎹' },
  { id: 'lead', name: '主音', color: '#F44336', icon: '🎤' }
];

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  async init(): Promise<void> {
    if (this.ctx) return;

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx({ latencyHint: 'interactive' });

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.7;
    this.masterGain.connect(this.ctx.destination);
  }

  getContext(): AudioContext {
    if (!this.ctx) {
      throw new Error('AudioEngine not initialized. Call init() first.');
    }
    return this.ctx;
  }

  private createAnalyser(): AnalyserNode {
    const ctx = this.getContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.6;
    return analyser;
  }

  playKick(startAt?: number): PlayResult {
    const ctx = this.getContext();
    const now = startAt ?? ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.05);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    const analyser = this.createAnalyser();

    osc.connect(gain);
    gain.connect(analyser);
    analyser.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.3);

    return { source: osc, analyser, duration: 0.3 };
  }

  playSnare(startAt?: number): PlayResult {
    const ctx = this.getContext();
    const now = startAt ?? ctx.currentTime;

    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.7, now + 0.005);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(0.5, now + 0.005);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    const analyser = this.createAnalyser();
    const merger = ctx.createGain();
    merger.gain.value = 1;

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(merger);

    osc.connect(oscGain);
    oscGain.connect(merger);

    merger.connect(analyser);
    analyser.connect(this.masterGain!);

    noise.start(now);
    noise.stop(now + 0.2);
    osc.start(now);
    osc.stop(now + 0.15);

    return { source: noise, analyser, duration: 0.2 };
  }

  playHihat(startAt?: number): PlayResult {
    const ctx = this.getContext();
    const now = startAt ?? ctx.currentTime;

    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const highPass = ctx.createBiquadFilter();
    highPass.type = 'highpass';
    highPass.frequency.value = 8000;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    const analyser = this.createAnalyser();

    noise.connect(highPass);
    highPass.connect(gain);
    gain.connect(analyser);
    analyser.connect(this.masterGain!);

    noise.start(now);
    noise.stop(now + 0.5);

    return { source: noise, analyser, duration: 0.5 };
  }

  playBass(startAt?: number): PlayResult {
    const ctx = this.getContext();
    const now = startAt ?? ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 80;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.4);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.01);
    gain.gain.setValueAtTime(0.5, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    const analyser = this.createAnalyser();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(analyser);
    analyser.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.4);

    return { source: osc, analyser, duration: 0.4 };
  }

  playSynth(startAt?: number): PlayResult {
    const ctx = this.getContext();
    const now = startAt ?? ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 440;

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 5;

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 20;

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
    gain.gain.setValueAtTime(0.3, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    const analyser = this.createAnalyser();

    osc.connect(gain);
    gain.connect(analyser);
    analyser.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.5);
    lfo.start(now);
    lfo.stop(now + 0.5);

    return { source: osc, analyser, duration: 0.5 };
  }

  playLead(startAt?: number): PlayResult {
    const ctx = this.getContext();
    const now = startAt ?? ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 660;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.01);
    gain.gain.setValueAtTime(0.35, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    const delay = ctx.createDelay();
    delay.delayTime.value = 0.25;

    const feedback = ctx.createGain();
    feedback.gain.value = 0.35;

    const delayGain = ctx.createGain();
    delayGain.gain.value = 0.4;

    const analyser = this.createAnalyser();
    const dryWet = ctx.createGain();
    dryWet.gain.value = 1;

    osc.connect(gain);
    gain.connect(dryWet);
    gain.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(dryWet);
    dryWet.connect(analyser);
    analyser.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.8);

    return { source: osc, analyser, duration: 0.8 };
  }

  play(discId: DiscId, startAt?: number): PlayResult {
    switch (discId) {
      case 'kick': return this.playKick(startAt);
      case 'snare': return this.playSnare(startAt);
      case 'hihat': return this.playHihat(startAt);
      case 'bass': return this.playBass(startAt);
      case 'synth': return this.playSynth(startAt);
      case 'lead': return this.playLead(startAt);
    }
  }

  getCurrentTime(): number {
    return this.getContext().currentTime;
  }

  getPerformanceOffset(): number {
    const ctx = this.getContext();
    return performance.now() - ctx.currentTime * 1000;
  }
}
