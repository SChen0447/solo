import type { AnimalType } from './shapeRecognizer';

export interface AudioPlaybackHandle {
  stop: () => void;
}

export class AudioSynth {
  private audioContext: AudioContext | null = null;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    if (typeof window !== 'undefined' && !this.audioContext) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();
    }
  }

  public play(
    animal: AnimalType,
    frequency: number,
    volume: number,
    tempo: number
  ): AudioPlaybackHandle {
    this.initAudioContext();
    if (!this.audioContext) {
      return { stop: () => {} };
    }

    if (this.audioContext.state === 'suspended') {
      void this.audioContext.resume();
    }

    const freq = this.mapFrequency(frequency, animal);
    const vol = this.mapVolume(volume);
    const speed = this.mapTempo(tempo);

    switch (animal) {
      case 'cat':
        return this.playCat(freq, vol, speed);
      case 'dog':
        return this.playDog(freq, vol, speed);
      case 'bird':
        return this.playBird(freq, vol, speed);
      case 'fish':
        return this.playFish(freq, vol, speed);
    }
  }

  private mapFrequency(sliderValue: number, animal: AnimalType): number {
    const t = sliderValue / 100;
    switch (animal) {
      case 'cat':
        return 400 + t * 400;
      case 'dog':
        return 100 + t * 200;
      case 'bird':
        return 1500 + t * 2000;
      case 'fish':
        return 200 + t * 400;
    }
  }

  private mapVolume(sliderValue: number): number {
    return 0.05 + (sliderValue / 100) * 0.4;
  }

  private mapTempo(sliderValue: number): number {
    return 0.5 + (sliderValue / 100) * 1.5;
  }

  private playCat(freq: number, vol: number, speed: number): AudioPlaybackHandle {
    if (!this.audioContext) return { stop: () => {} };
    const ctx = this.audioContext;
    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];

    const duration = 0.3 / speed;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + duration);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.02);
    gain.gain.linearRampToValueAtTime(vol * 0.5, now + duration * 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq * 3;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
    oscillators.push(osc);
    gains.push(gain);

    return {
      stop: () => {
        for (const o of oscillators) {
          try { o.stop(); } catch (_e) { /* ignore */ }
        }
      }
    };
  }

  private playDog(freq: number, vol: number, speed: number): AudioPlaybackHandle {
    if (!this.audioContext) return { stop: () => {} };
    const ctx = this.audioContext;
    const oscillators: OscillatorNode[] = [];

    const barkDuration = 0.15 / speed;
    const barkInterval = 0.3 / speed;
    const numBarks = 2;
    const now = ctx.currentTime;

    for (let i = 0; i < numBarks; i++) {
      const t = now + i * barkInterval;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + barkDuration);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + barkDuration);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = freq * 4;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + barkDuration);
      oscillators.push(osc);
    }

    return {
      stop: () => {
        for (const o of oscillators) {
          try { o.stop(); } catch (_e) { /* ignore */ }
        }
      }
    };
  }

  private playBird(freq: number, vol: number, speed: number): AudioPlaybackHandle {
    if (!this.audioContext) return { stop: () => {} };
    const ctx = this.audioContext;
    const oscillators: OscillatorNode[] = [];

    const chirpDuration = 0.08 / speed;
    const chirpInterval = 0.12 / speed;
    const numChirps = 6;
    const now = ctx.currentTime;

    for (let i = 0; i < numChirps; i++) {
      const t = now + i * chirpInterval;
      const freqMod = freq * (0.8 + Math.random() * 0.4);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqMod, t);
      osc.frequency.exponentialRampToValueAtTime(freqMod * 1.5, t + chirpDuration);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol * 0.6, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + chirpDuration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + chirpDuration);
      oscillators.push(osc);
    }

    return {
      stop: () => {
        for (const o of oscillators) {
          try { o.stop(); } catch (_e) { /* ignore */ }
        }
      }
    };
  }

  private playFish(freq: number, vol: number, speed: number): AudioPlaybackHandle {
    if (!this.audioContext) return { stop: () => {} };
    const ctx = this.audioContext;

    const duration = 1.5 / speed;
    const now = ctx.currentTime;

    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      const noise = (Math.random() * 2 - 1) * 0.3;
      const wave = Math.sin(2 * Math.PI * freq * t) * 0.1;
      const gurgle = Math.sin(2 * Math.PI * (freq * 0.5) * t) * 0.2 * Math.sin(2 * Math.PI * 2 * t);
      data[i] = noise + wave + gurgle;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq * 3;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.1);
    gain.gain.linearRampToValueAtTime(vol * 0.7, now + duration * 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start(now);
    source.stop(now + duration);

    return {
      stop: () => {
        try { source.stop(); } catch (_e) { /* ignore */ }
      }
    };
  }
}
